# ==============================================================================
# SCRIPT EJECUTOR DE BENCHMARK K6 (FinTech Wallet)
# Ejecuta k6 localmente o mediante contenedor Podman sin necesidad de instalación manual
# ==============================================================================

param (
    [string]$TargetUrl = "http://localhost"
)

$env:TARGET_URL = $TargetUrl

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " BENCHMARK DE CONCURRENCIA CON K6 (FinTech Wallet)" -ForegroundColor Cyan
Write-Host " Destino: $TargetUrl" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$k6Local = Get-Command k6 -ErrorAction SilentlyContinue

if ($k6Local) {
    Write-Host "[INFO] Ejecutando benchmark con binario k6 local..." -ForegroundColor Green
    & k6 run scripts/k6-concurrency-test.js
} else {
    Write-Host "[INFO] Binario k6 local no detectado. Ejecutando k6 en contenedor con Podman..." -ForegroundColor Yellow
    $scriptDir = (Resolve-Path ./scripts).Path
    
    $podman = Get-Command podman -ErrorAction SilentlyContinue
    if ($podman) {
        podman run --rm -i --network host -v "${scriptDir}:/scripts:z" -e TARGET_URL="$TargetUrl" docker.io/grafana/k6:latest run /scripts/k6-concurrency-test.js
    } else {
        Write-Host "[ERROR] Ni k6 ni podman están instalados o disponibles en el PATH." -ForegroundColor Red
        exit 1
    }
}
