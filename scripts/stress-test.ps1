# ==============================================================================
# SCRIPT DE PRUEBA DE FULL ESTRÉS Y RESILIENCIA (POWERSHELL)
# Dispara peticiones HTTP concurrentes multihilo contra el Ingress de Kubernetes
# Uso: .\scripts\stress-test.ps1 -Workers 20 -ReqsPerWorker 50
# ==============================================================================

param (
    [int]$Workers = 20,
    [int]$ReqsPerWorker = 50,
    [string]$TargetUrl = "http://localhost"
)

$TotalRequests = $Workers * $ReqsPerWorker

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FINTECH WALLET - PRUEBA DE FULL ESTRÉS (POWERSHELL)" -ForegroundColor Cyan
Write-Host " Hilos Concurrentes : $Workers" -ForegroundColor Cyan
Write-Host " Peticiones/Hilo    : $ReqsPerWorker" -ForegroundColor Cyan
Write-Host " Peticiones Totales : $TotalRequests" -ForegroundColor Cyan
Write-Host " Target URL         : $TargetUrl" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$sw = [System.Diagnostics.Stopwatch]::StartNew()

$scriptBlock = {
    param($WorkerId, $Reqs, $BaseUrl)
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(5)
    $statuses = [System.Collections.Generic.List[int]]::new()

    for ($i = 1; $i -le $Reqs; $i++) {
        $ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
        $choice = ($WorkerId + $i) % 5

        try {
            $url = ""
            $content = $null
            $method = "GET"
            $headers = @{}

            switch ($choice) {
                0 { $url = "$BaseUrl/users/health" }
                1 { 
                    $url = "$BaseUrl/auth/register" 
                    $method = "POST"
                    $body = @{ name = "User_$ts"; email = "stress_${ts}_${WorkerId}_$i@fintech.com"; password = "Pass123!" } | ConvertTo-Json
                    $content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, "application/json")
                }
                2 {
                    $url = "$BaseUrl/users/1/balance"
                    $method = "PUT"
                    $body = @{ amount = 100 } | ConvertTo-Json
                    $content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, "application/json")
                }
                3 {
                    $url = "$BaseUrl/transactions/transfer"
                    $method = "POST"
                    $body = @{ fromUserId = 1; toUserId = 2; amount = 10 } | ConvertTo-Json
                    $content = [System.Net.Http.StringContent]::new($body, [System.Text.Encoding]::UTF8, "application/json")
                    $headers["X-Idempotency-Key"] = "stress-ps-key-$WorkerId-$i"
                }
                4 {
                    $url = "$BaseUrl/worker/statements/request?userId=1"
                    $method = "POST"
                }
            }

            $req = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::$method, $url)
            if ($content) { $req.Content = $content }
            foreach ($h in $headers.Keys) { $req.Headers.Add($h, $headers[$h]) }

            $res = $client.SendAsync($req).GetAwaiter().GetResult()
            $statuses.Add([int]$res.StatusCode)
        } catch {
            $statuses.Add(0)
        }
    }
    return $statuses
}

Write-Host "[1/2] Ejecutando $Workers trabajos en paralelo..." -ForegroundColor Yellow

$jobs = @()
for ($w = 1; $w -le $Workers; $w++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $w, $ReqsPerWorker, $TargetUrl
}

$results = $jobs | Wait-Job | Receive-Job
$jobs | Remove-Job

$sw.Stop()
$elapsedSec = [Math]::Max(0.001, $sw.Elapsed.TotalSeconds)

$success = ($results | Where-Object { $_ -ge 200 -and $_ -lt 300 }).Count
$idempotent = ($results | Where-Object { $_ -eq 400 -or $_ -eq 409 }).Count
$failed = ($results | Where-Object { $_ -eq 0 -or $_ -ge 500 }).Count
$rps = [Math]::Round($TotalRequests / $elapsedSec, 2)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " RESULTADOS DE LA PRUEBA DE FULL ESTRÉS (POWERSHELL)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  -> Peticiones Ejecutadas : $TotalRequests"
Write-Host "  -> Exitosas (2xx OK)     : $success" -ForegroundColor Green
Write-Host "  -> Bloqueadas / Idemp.   : $idempotent" -ForegroundColor Yellow
Write-Host "  -> Errores / Timeouts    : $failed" -ForegroundColor Red
Write-Host "  -> Tiempo Transcurrido   : $([Math]::Round($elapsedSec, 2)) segundos"
Write-Host "  -> Throughput Máximo     : $rps RPS (Req/sec)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
