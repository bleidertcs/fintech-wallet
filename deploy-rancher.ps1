# ==============================================================================
# Script de Despliegue Automatizado para FinTech Wallet en Rancher Desktop (containerd)
# ==============================================================================
param(
    [switch]$Recreate,
    [switch]$NonInteractive
)

$logFile = "deploy-rancher.log"
try { Start-Transcript -Path $logFile -Append -ErrorAction SilentlyContinue } catch {}

function Log-Msg {
    param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

Log-Msg "======================================================================" Cyan
Log-Msg "Iniciando despliegue de FinTech Wallet en Rancher Desktop (containerd)..." Cyan
Log-Msg "Registro de logs guardándose en: $logFile" Cyan
Log-Msg "======================================================================" Cyan

# 1. Verificar disponibilidad de nerdctl CLI
Log-Msg "`nVerificando conexión con Rancher Desktop (containerd via nerdctl)..." Yellow
$nerdctlCmd = if (Get-Command nerdctl -ErrorAction SilentlyContinue) { "nerdctl" } elseif (Get-Command nerdctl.exe -ErrorAction SilentlyContinue) { "nerdctl.exe" } else { "nerdctl" }

$nerdctlOk = $false
for ($i = 1; $i -le 3; $i++) {
    $check = & $nerdctlCmd info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $nerdctlOk = $true
        Log-Msg "Conexión a containerd mediante nerdctl exitosa." Green
        break
    } else {
        Log-Msg "Intento $i/3: nerdctl / Rancher Desktop containerd no responde. Reintentando en 4 segundos..." Red
        Start-Sleep -Seconds 4
    }
}

if (-not $nerdctlOk) {
    Log-Msg "ERROR CRÍTICO: No se pudo conectar con containerd (nerdctl). Por favor verifica que Rancher Desktop esté en ejecución con el motor containerd activado." Red
    try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
    exit 1
}

# 2. Verificar conectividad con Kubernetes (k3s) y context rancher-desktop
Log-Msg "`nVerificando conexión con el clúster de Kubernetes..." Yellow
$currentCtx = (kubectl config current-context 2>&1).Trim()
if ($currentCtx -ne "rancher-desktop") {
    $allContexts = kubectl config get-contexts -o name 2>&1
    if ($allContexts -contains "rancher-desktop") {
        Log-Msg "Cambiando contexto de kubectl a 'rancher-desktop'..." Yellow
        kubectl config use-context rancher-desktop | Out-Null
    }
}

$k8sCheck = kubectl cluster-info 2>&1
if ($LASTEXITCODE -ne 0) {
    Log-Msg "ERROR CRÍTICO: No se pudo contactar al clúster de Kubernetes. Asegúrate de que Kubernetes esté habilitado en Rancher Desktop." Red
    try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
    exit 1
}
Log-Msg "Conexión con Kubernetes (contexto: $(kubectl config current-context)) exitosa." Green

# Preguntar al usuario si desea recrear los despliegues si es interactivo
if (-not $Recreate -and -not $NonInteractive -and $Host.Name -notmatch "ServerRemoteHost") {
    $response = Read-Host "`n¿Deseas recrear completamente los Pods y Deployments desde cero? (S/N) [N]"
    if ($response -match "^(s|sí|si|y|yes)$") {
        $Recreate = $true
        Log-Msg "Opción seleccionada: Recreación completa activada." Yellow
    }
}

if ($Recreate) {
    Log-Msg "`nEliminando deployments y servicios del namespace 'fintech' para recreación..." Yellow
    kubectl delete namespace fintech --ignore-not-found 2>&1 | Out-Null
    Start-Sleep -Seconds 3
}

# 3. Construir imágenes en el namespace k8s.io de containerd (NestJS Microservices)
Log-Msg "`n[1/3] Construyendo imágenes de contenedor con nerdctl (namespace k8s.io)..." Cyan

$services = @(
    @{ Name = "frontend"; Path = "./frontend"; Image = "fintech/frontend:latest" },
    @{ Name = "auth-service"; Path = "./backend-nestjs/auth-service"; Image = "fintech/auth-service:nestjs" },
    @{ Name = "user-service"; Path = "./backend-nestjs/user-service"; Image = "fintech/user-service:nestjs" },
    @{ Name = "transaction-service"; Path = "./backend-nestjs/transaction-service"; Image = "fintech/transaction-service:nestjs" },
    @{ Name = "notification-service"; Path = "./backend-nestjs/notification-service"; Image = "fintech/notification-service:nestjs" },
    @{ Name = "worker-service"; Path = "./backend-nestjs/worker-service"; Image = "fintech/worker-service:nestjs" }
)

foreach ($s in $services) {
    Log-Msg "  -> Construyendo $($s.Name) ($($s.Image))..." Yellow
    & $nerdctlCmd --namespace k8s.io build -t $s.Image $s.Path
    if ($LASTEXITCODE -ne 0) {
        Log-Msg "Error construyendo la imagen $($s.Name)" Red
        try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
        exit 1
    }
}
Log-Msg "Imágenes construidas e importadas a containerd (k8s.io) exitosamente." Green

# 4. Verificación de Ingress Controller (Traefik Nativo k3s)
Log-Msg "`n[2/3] Verificando Ingress Controller Traefik nativo en Rancher Desktop..." Cyan
$traefikPod = kubectl get pods -n kube-system -l app.kubernetes.io/name=traefik --no-headers 2>&1
if ($traefikPod -match "Running") {
    Log-Msg "Traefik Ingress Controller está activo y funcionando." Green
} else {
    Log-Msg "Aviso: Traefik Ingress en kube-system está inicializando..." Yellow
}

# 5. Aplicar Manifiestos de Kubernetes
Log-Msg "`n[3/3] Aplicando manifiestos de Kubernetes en namespace 'fintech'..." Cyan
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl apply -f k8s/04-observability.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-networkpolicy.yaml

Log-Msg "`n======================================================================" Green
Log-Msg "¡Despliegue completado! Estado actual de los Pods en namespace 'fintech':" Green
Log-Msg "======================================================================" Green
Start-Sleep -Seconds 3
kubectl get pods -n fintech

Log-Msg "`nLogs del despliegue guardados en: $logFile" Cyan
try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
