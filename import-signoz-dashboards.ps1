# ==============================================================================
# IMPORT-SIGNOZ-DASHBOARDS.PS1 - IMPORTADOR DE DASHBOARDS EN SIGNOZ (POWERSHELL)
# ==============================================================================
# Métodos de autenticación soportados:
#   1. Por API Key de SigNoz:
#      .\import-signoz-dashboards.ps1 -SigNozUrl "http://10.20.0.6:30301" -ApiKey "tu-api-key"
#
#   2. Por Credenciales de Login:
#      .\import-signoz-dashboards.ps1 -SigNozUrl "http://10.20.0.6:30301" -Email "admin@fintech.com" -Password "password123"
# ==============================================================================

param (
    [string]$SigNozUrl = "http://localhost:30301",
    [string]$ApiKey = "",
    [string]$Email = "",
    [string]$Password = ""
)

$SigNozUrl = $SigNozUrl.TrimEnd('/')

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  SigNoz Dashboards Importer - FinTech Wallet System" -ForegroundColor Cyan
Write-Host "  SigNoz Endpoint: $SigNozUrl/api/v1/dashboards" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$dashboardsDir = Join-Path $PSScriptRoot "k8s\dashboards"
if (-not (Test-Path $dashboardsDir)) {
    $dashboardsDir = Join-Path $PSScriptRoot "observability\dashboards"
}

if (-not (Test-Path $dashboardsDir)) {
    Write-Host "[ERROR] No se encontró el directorio de dashboards (k8s\dashboards o observability\dashboards)" -ForegroundColor Red
    exit 1
}

$jsonFiles = Get-ChildItem -Path $dashboardsDir -Filter "0[1-6]-signoz-*.json"
if ($jsonFiles.Count -eq 0) {
    $jsonFiles = Get-ChildItem -Path $dashboardsDir -Filter "*.json"
}

if ($jsonFiles.Count -eq 0) {
    Write-Host "[WARN] No se encontraron archivos JSON en $dashboardsDir" -ForegroundColor Yellow
    exit 0
}

$headers = @{
    "Content-Type" = "application/json"
}

# Autenticación por Login si se proporcionó Email y Password
if (-not [string]::IsNullOrEmpty($Email) -and -not [string]::IsNullOrEmpty($Password)) {
    Write-Host "`n[*] Autenticando con usuario $Email en SigNoz..." -ForegroundColor Yellow
    try {
        $loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
        $loginResp = Invoke-RestMethod -Uri "$SigNozUrl/api/v1/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
        
        $token = $loginResp.accessJwt
        if (-not $token) { $token = $loginResp.jwt }
        
        if ($token) {
            $headers["Authorization"] = "Bearer $token"
            Write-Host "    [OK] Autenticación exitosa. Token JWT obtenido." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "    [!] Error al autenticar: $($_.Exception.Message)" -ForegroundColor Red
    }
}
elseif (-not [string]::IsNullOrEmpty($ApiKey)) {
    $headers["SIGNOZ-API-KEY"] = $ApiKey
}

# Comprobar conectividad
Write-Host "`n[*] Verificando conexión con SigNoz en $SigNozUrl..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-RestMethod -Uri "$SigNozUrl/api/v1/healthz" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "    [OK] SigNoz responde correctamente." -ForegroundColor Green
}
catch {
    Write-Host "    [!] Advertencia: Health check no respondió en $SigNozUrl. Intentando importar de todos modos..." -ForegroundColor Gray
}

$successCount = 0
$totalCount = $jsonFiles.Count

foreach ($file in $jsonFiles) {
    Write-Host "`n[+] Procesando dashboard: $($file.Name)..." -ForegroundColor Yellow
    $jsonContent = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    
    $apiEndpoint = "$SigNozUrl/api/v1/dashboards"
    
    try {
        $response = Invoke-RestMethod -Uri $apiEndpoint -Method Post -Body $jsonContent -Headers $headers -ErrorAction Stop
        Write-Host "    [OK] Dashboard '$($file.Name)' importado exitosamente." -ForegroundColor Green
        $successCount++
    }
    catch {
        Write-Host "    [!] Error al enviar $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "        Detalle API: $responseBody" -ForegroundColor Gray
        }
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Importación finalizada: $successCount / $totalCount dashboards importados." -ForegroundColor Green
Write-Host " Accede a SigNoz en: $SigNozUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
