# ==============================================================================
# Script de Despliegue Automatizado para FinTech Wallet con Podman y Kubernetes
# ==============================================================================
param(
    [switch]$Recreate,
    [switch]$NonInteractive,
    [switch]$Push,
    [string]$HubUser = "bleiderc",
    [string]$ClusterName = ""
)

$logFile = "deploy-k8s.log"
try { Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue } catch {}

function Log-Msg {
    param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

Log-Msg "======================================================================" Cyan
Log-Msg "Iniciando despliegue de FinTech Wallet con Podman y Kubernetes..." Cyan
Log-Msg "Registro de logs guardándose en: $logFile" Cyan
Log-Msg "======================================================================" Cyan

# 1. Verificar disponibilidad de Podman CLI
Log-Msg "`n[1/5] Verificando motor de contenedores Podman..." Yellow
$podmanCmd = if (Get-Command podman -ErrorAction SilentlyContinue) { "podman" } elseif (Get-Command podman.exe -ErrorAction SilentlyContinue) { "podman.exe" } else { "podman" }

$podmanOk = $false
for ($i = 1; $i -le 3; $i++) {
    $check = & $podmanCmd info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $podmanOk = $true
        $version = (& $podmanCmd --version 2>&1).Trim()
        Log-Msg "Conexión con Podman exitosa ($version)." Green
        break
    } else {
        Log-Msg "Intento $i/3: Podman no responde. Reintentando en 3 segundos..." Red
        Start-Sleep -Seconds 3
    }
}

if (-not $podmanOk) {
    Log-Msg "ERROR CRÍTICO: No se pudo conectar con Podman. Por favor verifica que Podman / Podman Desktop / Podman Machine esté en ejecución." Red
    try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
    exit 1
}

# Función para asegurar el puente de red en Windows con Podman Machine (WSL2)
function Setup-KindPodmanBridge {
    param([string]$TargetCluster = "fintech")
    
    Log-Msg "Configurando puente de red para Kind sobre Podman (WSL2)..." Cyan
    $env:KIND_EXPERIMENTAL_PROVIDER = "podman"
    
    # 1. Verificar si el contenedor del nodo de Kind está corriendo
    $containerName = "$TargetCluster-control-plane"
    $nodeInspect = & $podmanCmd inspect $containerName 2>$null | ConvertFrom-Json
    if (-not $nodeInspect) {
        return $false
    }
    
    # Obtener IP interna del contenedor y puerto publicado del apiserver
    $controlPlaneIp = ""
    if ($nodeInspect[0].NetworkSettings.Networks) {
        foreach ($net in $nodeInspect[0].NetworkSettings.Networks.PSObject.Properties) {
            if ($net.Value.IPAddress) {
                $controlPlaneIp = $net.Value.IPAddress
                break
            }
        }
    }
    if (-not $controlPlaneIp) {
        $controlPlaneIp = $nodeInspect[0].NetworkSettings.IPAddress
    }
    if (-not $controlPlaneIp) {
        $controlPlaneIp = "10.89.0.2"
    }

    $portInfo = & $podmanCmd port $containerName "6443/tcp" 2>$null
    if ($portInfo -match ":(\d+)") {
        $hostPort = [int]$matches[1]
    } else {
        $hostPort = 6443
    }

    # 2. Agregar regla nftables en el kernel de WSL2 para permitir tráfico hacia el apiserver
    try {
        wsl -d podman-machine-default -u root nft add rule inet netavark PREROUTING tcp dport $hostPort dnat ip to "$controlPlaneIp:6443" 2>$null
    } catch {}

    # 3. Obtener IP de la máquina WSL2 (vEthernet WSL)
    $wslIpOutput = wsl -d podman-machine-default -u root ip -4 addr show eth0 2>$null
    $wslIp = ""
    $wslText = ($wslIpOutput | Out-String)
    if ($wslText -match "inet\s+(\d+\.\d+\.\d+\.\d+)") {
        $wslIp = $matches[1]
    }

    if ($wslIp -and $hostPort) {
        # 4. Configurar endpoint directo de WSL en kubeconfig (comunicación directa a nivel de red sin depender de procesos proxy)
        & kubectl config set-cluster "kind-$TargetCluster" --server="https://${wslIp}:${hostPort}" --insecure-skip-tls-verify=true 2>$null | Out-Null
    }
    return $true
}

# 2. Verificar conectividad con Kubernetes
Log-Msg "`n[2/5] Verificando conexión con el clúster de Kubernetes..." Yellow
$currentCtx = ""
try {
    $currentCtx = ([string](kubectl config current-context 2>$null)).Trim()
} catch {}

$targetCluster = if ($ClusterName) { $ClusterName } else { "fintech" }
$env:KIND_EXPERIMENTAL_PROVIDER = "podman"

# Si el contexto actual es Kind o existe el contenedor del nodo, activar puente previo a la verificación
if ($currentCtx -match "^kind-" -or (& $podmanCmd ps -a --filter "name=$targetCluster-control-plane" --format "{{.Names}}" 2>$null)) {
    Setup-KindPodmanBridge -TargetCluster $targetCluster | Out-Null
}

$k8sOk = $false
if ($currentCtx) {
    $k8sCheck = kubectl cluster-info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $k8sOk = $true
    }
}

if (-not $k8sOk) {
    Log-Msg "Contexto no encontrado o clúster no responde. Diagnosticando..." Yellow
    
    $nodeExists = (& $podmanCmd ps -a --filter "name=$targetCluster-control-plane" --format "{{.Names}}" 2>$null)
    if ($nodeExists) {
        Log-Msg "Nodo Kind '$targetCluster' detectado. Exportando kubeconfig..." Cyan
        & kind export kubeconfig --name $targetCluster 2>&1 | Out-Null
    } else {
        Log-Msg "Clúster Kind '$targetCluster' no encontrado. Creando clúster automáticamente con Podman..." Cyan
        & kind create cluster --name $targetCluster --config k8s/kind-config.yaml
        if ($LASTEXITCODE -ne 0) {
            Log-Msg "ERROR CRÍTICO: Falló la creación del clúster Kind '$targetCluster'." Red
            try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
            exit 1
        }
    }
    
    # Configurar bridge en caso de Windows + WSL2 Podman
    Setup-KindPodmanBridge -TargetCluster $targetCluster | Out-Null
    Start-Sleep -Seconds 2
    
    $k8sCheck = kubectl cluster-info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $k8sOk = $true
        try { $currentCtx = ([string](kubectl config current-context 2>$null)).Trim() } catch {}
    }
}

if (-not $k8sOk) {
    Log-Msg "ERROR CRÍTICO: No se pudo contactar al clúster de Kubernetes en el contexto '$currentCtx'." Red
    try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
    exit 1
}

Log-Msg "Conexión con Kubernetes exitosa (Contexto activo: '$currentCtx')." Green

# Detectar tipo de clúster
$clusterType = "generic"
if ($currentCtx -match "^kind-") {
    $clusterType = "kind"
    if (-not $ClusterName) { $ClusterName = $currentCtx -replace "^kind-", "" }
} elseif ($currentCtx -match "minikube") {
    $clusterType = "minikube"
} elseif ($currentCtx -match "k3s|rancher-desktop|podman") {
    $clusterType = "k3s"
}
Log-Msg "Tipo de clúster detectado: $clusterType $(if($ClusterName){"($ClusterName)"})" Cyan

# Asegurar CRDs e Ingress Controller de Traefik en el clúster
Log-Msg "Verificando Custom Resource Definitions (CRDs) e Ingress Controller de Traefik..." Cyan
$crdCheck = kubectl get crd middlewares.traefik.io 2>&1
if ($LASTEXITCODE -ne 0) {
    Log-Msg "Instalando CRDs de Traefik v3..." Yellow
    kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.1/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml 2>&1 | Out-Null
}

if ($clusterType -eq "kind") {
    $traefikCheck = kubectl get deployment traefik -n kube-system 2>&1
    if ($LASTEXITCODE -ne 0) {
        if (Get-Command helm -ErrorAction SilentlyContinue) {
            Log-Msg "Instalando Ingress Controller Traefik en Kind (kube-system) vía Helm..." Cyan
            & helm repo add traefik https://traefik.github.io/charts 2>$null | Out-Null
            & helm repo update traefik 2>$null | Out-Null
            & helm upgrade --install traefik traefik/traefik --namespace kube-system --skip-crds --set "ports.web.port=80" --set "ports.websecure.port=443" --set "ports.web.hostPort=80" --set "ports.websecure.hostPort=443" --set "ingressClass.enabled=true" --set "ingressClass.isDefaultClass=true" 2>&1 | Out-Null
        }
    }
}

# Preguntar al usuario si desea recrear los despliegues si es interactivo
if (-not $Recreate -and -not $NonInteractive -and $Host.Name -notmatch "ServerRemoteHost") {
    $response = Read-Host "`n¿Deseas recrear completamente los Pods y Deployments desde cero? (S/N) [N]"
    if ($response -match "^(s|sí|si|y|yes)$") {
        $Recreate = $true
        Log-Msg "Opción seleccionada: Recreación completa activada." Yellow
    }
}

if ($Recreate) {
    Log-Msg "`nEliminando namespace 'fintech' para recreación limpia..." Yellow
    kubectl delete namespace fintech --ignore-not-found 2>&1 | Out-Null
    while (kubectl get namespace fintech 2>$null) {
        Log-Msg "  Esperando a que finalice la eliminación del namespace 'fintech'..." Yellow
        Start-Sleep -Seconds 2
    }
}

# 3. Construir imágenes de microservicios y frontend con Podman
Log-Msg "`n[3/5] Construyendo imágenes de contenedor con Podman..." Cyan

$services = @(
    @{ Name = "frontend"; Path = "./frontend"; Image = "$HubUser/fintech-wallet:frontend-1.0.0"; File = "./frontend/Containerfile" },
    @{ Name = "auth-service"; Path = "./backend-nestjs/auth-service"; Image = "$HubUser/fintech-wallet:auth-service-1.0.0"; File = "./backend-nestjs/auth-service/Containerfile" },
    @{ Name = "user-service"; Path = "./backend-nestjs/user-service"; Image = "$HubUser/fintech-wallet:user-service-1.0.0"; File = "./backend-nestjs/user-service/Containerfile" },
    @{ Name = "transaction-service"; Path = "./backend-nestjs/transaction-service"; Image = "$HubUser/fintech-wallet:transaction-service-1.0.0"; File = "./backend-nestjs/transaction-service/Containerfile" },
    @{ Name = "notification-service"; Path = "./backend-nestjs/notification-service"; Image = "$HubUser/fintech-wallet:notification-service-1.0.0"; File = "./backend-nestjs/notification-service/Containerfile" },
    @{ Name = "worker-service"; Path = "./backend-nestjs/worker-service"; Image = "$HubUser/fintech-wallet:worker-service-1.0.0"; File = "./backend-nestjs/worker-service/Containerfile" }
)

foreach ($s in $services) {
    Log-Msg "  -> [Podman Build] $($s.Name) ($($s.Image))..." Yellow
    & $podmanCmd build -f $s.File -t $s.Image -t "docker.io/$($s.Image)" -t "localhost/$($s.Image)" $s.Path
    if ($LASTEXITCODE -ne 0) {
        Log-Msg "ERROR CRÍTICO: Falló la construcción de $($s.Name)" Red
        exit 1
    }
    if ($Push) {
        Log-Msg "  -> [Docker Hub Push] Subiendo $($s.Image) a Docker Hub..." Cyan
        & $podmanCmd push $s.Image
    }
}
Log-Msg "Todas las imágenes fueron construidas exitosamente con Podman." Green

# Limpieza preventiva de capas intermedias de Podman para evitar saturación de disco
Log-Msg "`nLimpiando capas intermedias de compilación en Podman..." Cyan
& $podmanCmd image prune -f 2>&1 | Out-Null

# 4. Cargar imágenes en el clúster de Kubernetes según el tipo
Log-Msg "`n[4/5] Cargando imágenes en el clúster Kubernetes ($clusterType)..." Cyan

foreach ($s in $services) {
    if ($clusterType -eq "kind") {
        Log-Msg "  -> Cargando $($s.Image) en Kind cluster '$ClusterName'..." Yellow
        $env:KIND_EXPERIMENTAL_PROVIDER = "podman"
        $kindArgs = @("load", "docker-image")
        if ($ClusterName) { $kindArgs += @($s.Image, "--name", $ClusterName) } else { $kindArgs += $s.Image }
        
        & kind @kindArgs 2>$null
        if ($LASTEXITCODE -ne 0) {
            $kindArgsDocker = @("load", "docker-image")
            if ($ClusterName) { $kindArgsDocker += @("docker.io/$($s.Image)", "--name", $ClusterName) } else { $kindArgsDocker += "docker.io/$($s.Image)" }
            & kind @kindArgsDocker 2>$null
        }
        if ($LASTEXITCODE -ne 0) {
            Log-Msg "Aviso: Falló 'kind load docker-image'. Cargando mediante archivo tar optimizado..." Yellow
            $tempTar = "$env:TEMP\$($s.Name).tar"
            & $podmanCmd save --format docker-archive -o $tempTar "docker.io/$($s.Image)"
            $loaded = $false
            if ($ClusterName) {
                & kind load image-archive $tempTar --name $ClusterName 2>$null
                if ($LASTEXITCODE -eq 0) { $loaded = $true }
            } else {
                & kind load image-archive $tempTar 2>$null
                if ($LASTEXITCODE -eq 0) { $loaded = $true }
            }
            if (-not $loaded) {
                Log-Msg "Importando imagen directamente en containerd del nodo Kind..." Yellow
                $nodeName = if ($ClusterName) { "$ClusterName-control-plane" } else { "fintech-control-plane" }
                & $podmanCmd cp $tempTar "${nodeName}:/tmp/$($s.Name).tar" 2>$null
                & $podmanCmd exec $nodeName ctr --namespace=k8s.io images import "/tmp/$($s.Name).tar" 2>$null
                & $podmanCmd exec $nodeName rm -f "/tmp/$($s.Name).tar" 2>$null
            }
            Remove-Item -Force $tempTar -ErrorAction SilentlyContinue
        }
    } elseif ($clusterType -eq "minikube") {
        Log-Msg "  -> Cargando $($s.Image) en Minikube..." Yellow
        minikube image load $s.Image
    } elseif ($clusterType -eq "k3s") {
        Log-Msg "  -> Cargando $($s.Image) en K3s (containerd WSL)..." Yellow
        $tempTar = "$env:TEMP\$($s.Name).tar"
        & $podmanCmd save --format docker-archive -o $tempTar "docker.io/$($s.Image)"
        $wslPath = "/mnt/" + $tempTar[0].ToString().ToLower() + ($tempTar.Substring(2) -replace '\\', '/')
        wsl -u root -d Ubuntu bash -c "k3s ctr images import '$wslPath' 2>/dev/null; k3s ctr images tag '$($s.Image)' 'docker.io/$($s.Image)' 2>/dev/null"
        Remove-Item -Force $tempTar -ErrorAction SilentlyContinue
    } else {
        Log-Msg "  -> Imagen $($s.Image) disponible en almacenamiento local de Podman." Green
    }
}

# 5. Aplicar Manifiestos de Kubernetes
Log-Msg "`n[5/5] Aplicando manifiestos de Kubernetes en namespace 'fintech'..." Cyan
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl delete job signoz-migrator -n fintech --ignore-not-found 2>&1 | Out-Null
kubectl apply -f k8s/04-observability.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-networkpolicy.yaml
kubectl apply -f k8s/07-backup-cronjob.yaml
kubectl apply -f k8s/09-hpa.yaml
kubectl apply -f k8s/10-pdb.yaml
kubectl delete job signoz-dashboards-importer -n fintech --ignore-not-found 2>&1 | Out-Null
kubectl apply -f k8s/12-signoz-dashboards-importer.yaml

# Limpieza preventiva de Pods finalizados o desalojados
kubectl delete pods --field-selector=status.phase=Failed -n fintech --ignore-not-found 2>&1 | Out-Null
kubectl delete pods --field-selector=status.phase=Succeeded -n fintech --ignore-not-found 2>&1 | Out-Null

Log-Msg "`n======================================================================" Green
Log-Msg "¡Despliegue completado! Estado actual de los Pods en namespace 'fintech':" Green
Log-Msg "======================================================================" Green
Start-Sleep -Seconds 3
kubectl get pods -n fintech

Log-Msg "`nLogs del despliegue guardados en: $logFile" Cyan
try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
