# ==============================================================================
# SCRIPT EJECUTOR DE BENCHMARK K6 (FinTech Wallet)
# Ejecuta k6 localmente o mediante contenedor sin necesidad de instalación manual
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
    Write-Host "[INFO] Binario k6 local no detectado. Ejecutando k6 en contenedor con nerdctl..." -ForegroundColor Yellow
    $scriptDir = (Resolve-Path ./scripts).Path
    
    $nerdctl = Get-Command nerdctl -ErrorAction SilentlyContinue
    if ($nerdctl) {
        nerdctl run --rm -i --network host -v "${scriptDir}:/scripts" -e TARGET_URL="$TargetUrl" grafana/k6:latest run /scripts/k6-concurrency-test.js
    } else {
        docker run --rm -i --network host -v "${scriptDir}:/scripts" -e TARGET_URL="$TargetUrl" grafana/k6:latest run /scripts/k6-concurrency-test.js
    }
}
