# ==============================================================================
# SCRIPT DE COMPILACION Y PUBLICACION EN DOCKER HUB (POWERSHELL)
# Compila los 6 microservicios/frontend y los sube a Docker Hub: bleiderc/fintech-wallet:<servicio>-1.0.0
# Guarda registro completo en vivo en: push-images.log
#
# Uso:
#   .\scripts\push-images.ps1 -HubUser "bleiderc"
# ==============================================================================

param(
    [string]$HubUser = "bleiderc",
    [string]$LogFile = "push-images.log"
)

$repoName = "$HubUser/fintech-wallet"

# Iniciar transcripcion de logs en archivo y consola simultaneamente
try {
    Start-Transcript -Path $LogFile -Append -ErrorAction SilentlyContinue
} catch {}

function Log-Step {
    param([string]$Message, [ConsoleColor]$Color = [ConsoleColor]::White)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$ts] $Message" -ForegroundColor $Color
}

Log-Step "============================================================" Cyan
Log-Step " FINTECH WALLET - BUILD & PUSH A DOCKER HUB (POWERSHELL)" Cyan
Log-Step " Usuario Docker Hub : $HubUser" Cyan
Log-Step " Repositorio Destino: $($repoName):<tag>" Cyan
Log-Step " Archivo de Registro: $LogFile" Cyan
Log-Step "============================================================" Cyan
$podmanCmd = if (Get-Command podman -ErrorAction SilentlyContinue) { "podman" } elseif (Get-Command podman.exe -ErrorAction SilentlyContinue) { "podman.exe" } elseif (Get-Command docker -ErrorAction SilentlyContinue) { "docker" } else { "podman" }

# Verificar conexion con el demonio/maquina de Podman
Log-Step "Verificando disponibilidad del motor de contenedores ($podmanCmd)..." Yellow
$check = & $podmanCmd info 2>&1
if ($LASTEXITCODE -ne 0) {
    Log-Step "Aviso: Podman Machine desconectado. Intentando reactivar 'podman machine start'..." Yellow
    & $podmanCmd machine start 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    $check = & $podmanCmd info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Log-Step "ERROR CRITICO: No se pudo conectar a Podman. Por favor ejecuta 'podman machine stop' y 'podman machine start' en tu terminal." Red
        try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
        exit 1
    }
}
Log-Step "Conexion con el motor de contenedores exitosa." Green
Write-Host ""

$services = @(
    @{ Name = "frontend"; Path = "./frontend"; Image = "$($repoName):frontend-1.0.0"; File = "./frontend/Containerfile" },
    @{ Name = "auth-service"; Path = "./backend-nestjs/auth-service"; Image = "$($repoName):auth-service-1.0.0"; File = "./backend-nestjs/auth-service/Containerfile" },
    @{ Name = "user-service"; Path = "./backend-nestjs/user-service"; Image = "$($repoName):user-service-1.0.0"; File = "./backend-nestjs/user-service/Containerfile" },
    @{ Name = "transaction-service"; Path = "./backend-nestjs/transaction-service"; Image = "$($repoName):transaction-service-1.0.0"; File = "./backend-nestjs/transaction-service/Containerfile" },
    @{ Name = "notification-service"; Path = "./backend-nestjs/notification-service"; Image = "$($repoName):notification-service-1.0.0"; File = "./backend-nestjs/notification-service/Containerfile" },
    @{ Name = "worker-service"; Path = "./backend-nestjs/worker-service"; Image = "$($repoName):worker-service-1.0.0"; File = "./backend-nestjs/worker-service/Containerfile" }
)

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$totalCount = $services.Count
$currentIdx = 0

foreach ($s in $services) {
    $currentIdx++
    Log-Step "------------------------------------------------------------" Yellow
    Log-Step "[$currentIdx/$totalCount] [BUILD] Compilando $($s.Name) -> $($s.Image)..." Yellow
    Log-Step "------------------------------------------------------------" Yellow
    
    & $podmanCmd build -f $s.File -t $s.Image -t "docker.io/$($s.Image)" $s.Path
    if ($LASTEXITCODE -ne 0) {
        Log-Step "ERROR CRITICO: Fallo la construccion de $($s.Name)" Red
        try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
        exit 1
    }

    Write-Host ""
    Log-Step "[$currentIdx/$totalCount] [PUSH] Subiendo imagen a Docker Hub: $($s.Image)..." Cyan
    & $podmanCmd push $s.Image
    if ($LASTEXITCODE -ne 0) {
        Log-Step "ERROR CRITICO: Fallo la subida de $($s.Image) a Docker Hub" Red
        try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
        exit 1
    }
    Log-Step "[OK] $($s.Image) publicado exitosamente en Docker Hub." Green
    Write-Host ""
}

# Limpieza preventiva de capas intermedias
Log-Step "Limpiando capas intermedias de compilacion en Podman..." Yellow
& $podmanCmd image prune -f 2>&1 | Out-Null

$sw.Stop()
$elapsedSeconds = [math]::Round($sw.Elapsed.TotalSeconds, 2)

Log-Step "============================================================" Green
Log-Step " ¡TODAS LAS IMAGENES FUERON PUBLICADAS EXITOSAMENTE!" Green
Log-Step " Tiempo total transcurrido: $elapsedSeconds segundos" Green
Log-Step " Registro guardado en     : $LogFile" Green
Log-Step " Repositorio en Docker Hub: https://hub.docker.com/r/$HubUser/fintech-wallet/tags" Green
Log-Step "============================================================" Green

try { Stop-Transcript -ErrorAction SilentlyContinue } catch {}
