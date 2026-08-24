# ==============================================================================
# IMPORT-SIGNOZ-DASHBOARDS.PS1 - IMPORTADOR DE DASHBOARDS EN SIGNOZ (REAL METRICS)
# ==============================================================================

param (
    [string]$SigNozUrl = "http://10.20.0.6:30301",
    [string]$ApiKey = "u/qUnbL4dpx5rOobkLjAUidg9NWRddEpVZsIOUCCc9g="
)

$SigNozUrl = $SigNozUrl.TrimEnd('/')

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SigNoz Dashboards Importer (Real Metrics & v2 API)" -ForegroundColor Cyan
Write-Host "  SigNoz Endpoint: $SigNozUrl/api/v2/dashboards" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "scripts\build_and_upload_all_dashboards.py"
if (Test-Path $scriptPath) {
    python $scriptPath
} else {
    Write-Host "[ERROR] Script scripts\build_and_upload_all_dashboards.py no encontrado." -ForegroundColor Red
}
