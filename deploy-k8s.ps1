# ==============================================================================
# Script de Despliegue Automatizado para FinTech Wallet con Podman y Kubernetes
# ==============================================================================
param(
    [switch]$Recreate,
    [switch]$NonInteractive,
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

# 2. Verificar conectividad con Kubernetes
Log-Msg "`n[2/5] Verificando conexión con el clúster de Kubernetes..." Yellow
$currentCtx = (kubectl config current-context 2>&1).Trim()
if ($LASTEXITCODE -ne 0 -or -not $currentCtx) {
    Log-Msg "ERROR CRÍTICO: No se pudo obtener el contexto activo de kubectl. Asegúrate de que un clúster Kubernetes esté iniciado." Red
    try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
    exit 1
}

$k8sCheck = kubectl cluster-info 2>&1
if ($LASTEXITCODE -ne 0) {
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
    Start-Sleep -Seconds 3
}

# 3. Construir imágenes de microservicios y frontend con Podman
Log-Msg "`n[3/5] Construyendo imágenes de contenedor con Podman..." Cyan

$services = @(
    @{ Name = "frontend"; Path = "./frontend"; Image = "fintech/frontend:1.0.0"; File = "./frontend/Containerfile" },
    @{ Name = "auth-service"; Path = "./backend-nestjs/auth-service"; Image = "fintech/auth-service:1.0.0"; File = "./backend-nestjs/auth-service/Containerfile" },
    @{ Name = "user-service"; Path = "./backend-nestjs/user-service"; Image = "fintech/user-service:1.0.0"; File = "./backend-nestjs/user-service/Containerfile" },
    @{ Name = "transaction-service"; Path = "./backend-nestjs/transaction-service"; Image = "fintech/transaction-service:1.0.0"; File = "./backend-nestjs/transaction-service/Containerfile" },
    @{ Name = "notification-service"; Path = "./backend-nestjs/notification-service"; Image = "fintech/notification-service:1.0.0"; File = "./backend-nestjs/notification-service/Containerfile" },
    @{ Name = "worker-service"; Path = "./backend-nestjs/worker-service"; Image = "fintech/worker-service:1.0.0"; File = "./backend-nestjs/worker-service/Containerfile" }
)

foreach ($s in $services) {
    Log-Msg "  -> [Podman Build] $($s.Name) ($($s.Image))..." Yellow
    & $podmanCmd build -f $s.File -t $s.Image $s.Path
    if ($LASTEXITCODE -ne 0) {
        Log-Msg "ERROR: Falló la construcción de la imagen $($s.Name)" Red
        try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
        exit 1
    }
}
Log-Msg "Todas las imágenes fueron construidas exitosamente con Podman." Green

# 4. Cargar imágenes en el clúster de Kubernetes según el tipo
Log-Msg "`n[4/5] Cargando imágenes en el clúster Kubernetes ($clusterType)..." Cyan

foreach ($s in $services) {
    if ($clusterType -eq "kind") {
        Log-Msg "  -> Cargando $($s.Image) en Kind cluster '$ClusterName'..." Yellow
        $env:KIND_EXPERIMENTAL_PROVIDER = "podman"
        if ($ClusterName) {
            kind load docker-image $s.Image --name $ClusterName
        } else {
            kind load docker-image $s.Image
        }
        if ($LASTEXITCODE -ne 0) {
            Log-Msg "Aviso: Falló 'kind load docker-image'. Intentando cargar mediante archivo tar..." Yellow
            $tempTar = "$env:TEMP\$($s.Name).tar"
            & $podmanCmd save -o $tempTar $s.Image
            if ($ClusterName) {
                kind load image-archive $tempTar --name $ClusterName
            } else {
                kind load image-archive $tempTar
            }
            Remove-Item -Force $tempTar -ErrorAction SilentlyContinue
        }
    } elseif ($clusterType -eq "minikube") {
        Log-Msg "  -> Cargando $($s.Image) en Minikube..." Yellow
        minikube image load $s.Image
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

Log-Msg "`n======================================================================" Green
Log-Msg "¡Despliegue completado! Estado actual de los Pods en namespace 'fintech':" Green
Log-Msg "======================================================================" Green
Start-Sleep -Seconds 3
kubectl get pods -n fintech

Log-Msg "`nLogs del despliegue guardados en: $logFile" Cyan
try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
