# ==============================================================================
# SCRIPT DE PRUEBA DE RENDIMIENTO Y CARGA (PERFORMANCE TEST)
# Mide throughput (RPS), latencias P95/P99 y tasa de errores de los microservicios
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PRUEBA DE RENDIMIENTO Y CARGA (PERFORMANCE BENCHMARK)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$k6Path = Get-Command k6 -ErrorAction SilentlyContinue

if ($k6Path) {
    Write-Host "[INFO] Ejecutando benchmark con k6..." -ForegroundColor Green
    k6 run scripts/k6-concurrency-test.js
} else {
    Write-Host "[INFO] k6 no detectado en PATH. Ejecutando test de carga nativo con PowerShell..." -ForegroundColor Yellow
    
    $targetUrl = "http://localhost/users/health"
    $iterations = 10000
    $startTime = Get-Date

    Write-Host "Enviando $iterations peticiones HTTP a $targetUrl..." -ForegroundColor Gray
    
    $success = 0
    $failed = 0
    
    1..$iterations | ForEach-Object {
        try {
            $res = Invoke-WebRequest -Uri $targetUrl -Method Get -UseBasicParsing -TimeoutSec 2
            if ($res.StatusCode -eq 200) { $script:success++ } else { $script:failed++ }
        } catch {
            $script:failed++
        }
    }
    
    $endTime = Get-Date
    $totalSeconds = ($endTime - $startTime).TotalSeconds
    $rps = [math]::Round($iterations / $totalSeconds, 2)
    
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " RESULTADOS DE LA PRUEBA DE RENDIMIENTO" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  -> Peticiones Totales   : $iterations"
    Write-Host "  -> Exitosas (200 OK)    : $success" -ForegroundColor Green
    Write-Host "  -> Fallidas             : $failed" -ForegroundColor Red
    Write-Host "  -> Tiempo Total         : $([math]::Round($totalSeconds, 2)) segundos"
    Write-Host "  -> Throughput (RPS)     : $rps req/sec" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
}
