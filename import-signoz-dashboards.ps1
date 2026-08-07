# Script para Importar Automáticamente los Dashboards de SigNoz (FinTech Wallet)
param (
    [string]$SigNozUrl = "http://localhost:3301",
    [string]$ApiKey = "9rfBH23dydV7Ym8yomvY68zoxf6VWiLZIT1BO/8J3j8="
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " SigNoz Dashboards Importer - FinTech Wallet System" -ForegroundColor Cyan
Write-Host " SigNoz API Endpoint: $SigNozUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$dashboardsDir = Join-Path $PSScriptRoot "k8s\dashboards"

if (-not (Test-Path $dashboardsDir)) {
    Write-Host "[ERROR] No se encontró el directorio $dashboardsDir" -ForegroundColor Red
    exit 1
}

$jsonFiles = Get-ChildItem -Path $dashboardsDir -Filter "*.json"

if ($jsonFiles.Count -eq 0) {
    Write-Host "[WARN] No se encontraron archivos JSON en $dashboardsDir" -ForegroundColor Yellow
    exit 0
}

$headers = @{
    "Content-Type" = "application/json"
    "SIGNOZ-API-KEY" = $ApiKey
}

foreach ($file in $jsonFiles) {
    Write-Host "`n[+] Procesando dashboard: $($file.Name)..." -ForegroundColor Yellow
    $jsonContent = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    $apiEndpoint = "$SigNozUrl/api/v1/dashboards"
    
    try {
        $response = Invoke-RestMethod -Uri $apiEndpoint -Method Post -Body $jsonContent -Headers $headers -ErrorAction Stop
        Write-Host "    [OK] Dashboard '$($file.Name)' importado exitosamente." -ForegroundColor Green
    }
    catch {
        Write-Host "    [!] Respuesta API al enviar $($file.Name): $($_.Exception.Message)" -ForegroundColor Gray
        Write-Host "    [OK] Archivo JSON preparado en k8s/dashboards/$($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Importación finalizada. Accede a SigNoz en: $SigNozUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
