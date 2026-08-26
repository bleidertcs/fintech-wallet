# ==============================================================================
# SCRIPT DE PRUEBA DE ESTRÉS DE TRANSACCIONES (POWERSHELL)
# Dispara transferencias de dinero masivas concurrentes al endpoint de transacciones
#
# Uso:
#   .\scripts\stress-test-transactions.ps1 -Workers 20 -ReqsPerWorker 25 -TargetUrl "http://localhost"
# ==============================================================================

param (
    [int]$Workers = 20,
    [int]$ReqsPerWorker = 25,
    [string]$TargetUrl = "http://localhost",
    [int]$FromUserId = 1,
    [int]$ToUserId = 2,
    [double]$Amount = 10.0
)

$TotalRequests = $Workers * $ReqsPerWorker
$TotalFundsNeeded = ($TotalRequests * $Amount) + 5000

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FINTECH WALLET - PRUEBA DE ESTRÉS DE TRANSACCIONES (PS)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  -> Hilos Concurrentes : $Workers" -ForegroundColor Cyan
Write-Host "  -> Transferencias/Hilo: $ReqsPerWorker" -ForegroundColor Cyan
Write-Host "  -> Total a Procesar   : $TotalRequests transferencias" -ForegroundColor Cyan
Write-Host "  -> Emisor -> Receptor : Usuario #$FromUserId -> Usuario #$ToUserId" -ForegroundColor Cyan
Write-Host "  -> Monto por Tx       : $Amount VES" -ForegroundColor Cyan
Write-Host "  -> Target URL         : $TargetUrl" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Precargar saldo en el emisor
Write-Host "[1/3] Aprovisionando saldo de respaldo para el Emisor (Usuario #$FromUserId)..." -ForegroundColor Yellow
try {
    $fundBody = @{ amount = $TotalFundsNeeded } | ConvertTo-Json
    $fundResponse = Invoke-RestMethod -Uri "$TargetUrl/users/$FromUserId/balance" -Method Put -Body $fundBody -ContentType "application/json" -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "  -> Saldo recargado exitosamente (+$TotalFundsNeeded VES)." -ForegroundColor Green
} catch {
    Write-Host "  -> No se pudo recargar saldo vía /users/$FromUserId/balance. Continuando con saldo existente..." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "[2/3] Disparando ráfaga masiva de $TotalRequests transferencias en $Workers hilos paralelos..." -ForegroundColor Yellow

$sw = [System.Diagnostics.Stopwatch]::StartNew()

$scriptBlock = {
    param($WorkerId, $Reqs, $BaseUrl, $SenderId, $ReceiverId, $TxAmount)
    
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(10)
    $results = [System.Collections.Generic.List[int]]::new()

    for ($i = 1; $i -le $Reqs; $i++) {
        $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $idempotencyKey = "tx-ps-stress-$WorkerId-$i-$ts"

        try {
            $url = "$BaseUrl/transactions/transfer"
            $body = @{
                fromUserId = $SenderId
                toUserId = $ReceiverId
                amount = $TxAmount
                description = "PS Stress Test Tx #$WorkerId-$i"
            } | ConvertTo-Json

            $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $url)
            $request.Headers.Add("X-Idempotency-Key", $idempotencyKey)
            $request.Content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, "application/json")

            $response = $client.SendAsync($request).GetAwaiter().GetResult()
            $statusCode = [int]$response.StatusCode
            $results.Add($statusCode)
            $response.Dispose()
            $request.Dispose()
        } catch {
            $results.Add(0)
        }
    }
    $client.Dispose()
    return $results
}

# Ejecutar tareas paralelas en PowerShell
$jobs = @()
for ($w = 1; $w -le $Workers; $w++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $w, $ReqsPerWorker, $TargetUrl, $FromUserId, $ToUserId, $Amount
}

$allResults = @()
foreach ($job in $jobs) {
    $res = Receive-Job -Job $job -Wait
    if ($res) { $allResults += $res }
    Remove-Job -Job $job
}

$sw.Stop()
$elapsedSec = [math]::Max($sw.Elapsed.TotalSeconds, 0.001)

# Consolidar Métricas
$successCount = ($allResults | Where-Object { $_ -ge 200 -and $_ -lt 300 }).Count
$badReqCount = ($allResults | Where-Object { $_ -eq 400 }).Count
$idempCount = ($allResults | Where-Object { $_ -eq 409 -or $_ -eq 429 }).Count
$serverErrCount = ($allResults | Where-Object { $_ -ge 500 }).Count
$timeoutCount = ($allResults | Where-Object { $_ -eq 0 }).Count

$rps = [math]::Round($TotalRequests / $elapsedSec, 2)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " RESULTADOS DE LA PRUEBA DE ESTRÉS DE TRANSACCIONES" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  -> Total Solicitudes     : $TotalRequests"
Write-Host "  -> Exitosas (200/201 OK) : $successCount" -ForegroundColor Green
Write-Host "  -> Saldo Insuficiente/400: $badReqCount" -ForegroundColor Yellow
Write-Host "  -> Idempotencia / 409    : $idempCount" -ForegroundColor Blue
Write-Host "  -> Errores 5xx Servidor  : $serverErrCount" -ForegroundColor Red
Write-Host "  -> Timeouts / Caídas (0) : $timeoutCount" -ForegroundColor Red
Write-Host "  -> Tiempo Total          : $([math]::Round($elapsedSec, 2)) segundos"
Write-Host "  -> Throughput Procesado  : $rps Transacciones/seg (TPS)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
