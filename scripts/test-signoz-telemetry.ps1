# PowerShell Script de prueba automatizada de telemetria para SigNoz
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  VERIFICACION DE TELEMETRIA Y OBSERVABILIDAD SIGNOZ (NestJS)  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Estado de Pods
Write-Host "1. Estado de Pods auth-service:" -ForegroundColor Yellow
kubectl get pods -n fintech -l app=auth-service

# 2. Generar trafico
Write-Host "2. Generando trafico sintetico..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "signoz.test." + $timestamp + "@fintech.com"

$body = @{
    email = $testEmail
    password = "Password123!"
} | ConvertTo-Json

Write-Host "Enviando POST /auth/register con email: $testEmail" -ForegroundColor Gray

try {
    $res = Invoke-RestMethod -Uri "http://localhost/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Peticion POST exitosa!" -ForegroundColor Green
} catch {
    Write-Host "Notificacion HTTP: $_" -ForegroundColor Yellow
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "PASOS DE VERIFICACION EN SIGNOZ UI (:3301):" -ForegroundColor Cyan
Write-Host "1. Abre tu navegador en http://localhost:3301" -ForegroundColor White
Write-Host "2. TRAZAS: En SigNoz Traces, filtra por service.name = auth-service" -ForegroundColor White
Write-Host "3. LOGS: Abre el detalle de la traza para ver logs inyectados con trace_id" -ForegroundColor White
Write-Host "4. METRICAS: En Services > auth-service consulta Latencia P99, RPS y errores" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
