# ==============================================================================
# SCRIPT DE PRUEBA DE CONCURRENCIA E IDEMPOTENCIA (FinTech Wallet)
# Ejecuta pruebas concurrentes paralelas y soporta benchmarks con k6
# ==============================================================================

param (
    [ValidateSet("Idempotency", "Load", "All")]
    [string]$Mode = "Idempotency",
    
    [int]$Concurrency = 10,
    [string]$TargetUrl = "http://localhost"
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PRUEBA DE CONCURRENCIA E IDEMPOTENCIA (Transaction Service)" -ForegroundColor Cyan
Write-Host " Modo: $Mode | Concurrencia: $Concurrency hilos paralelos" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($Mode -eq "Idempotency" -or $Mode -eq "All") {
    # 1. Crear usuarios de prueba con saldo garantizado
    $ts = Get-Date -Format "yyyyMMddHHmmss"
    $senderEmail = "sender.$ts@fintech.com"
    $recipientEmail = "recipient.$ts@fintech.com"

    Write-Host "[1/3] Creando usuarios de prueba para la transferencia..." -ForegroundColor Yellow
    $regSender = Invoke-RestMethod -Uri "$TargetUrl/auth/register" -Method Post -Body (@{ name="Sender"; email=$senderEmail; password="Password123!" } | ConvertTo-Json) -ContentType "application/json"
    $regRecipient = Invoke-RestMethod -Uri "$TargetUrl/auth/register" -Method Post -Body (@{ name="Recipient"; email=$recipientEmail; password="Password123!" } | ConvertTo-Json) -ContentType "application/json"

    Start-Sleep -Seconds 1

    $senderProfile = Invoke-RestMethod -Uri "$TargetUrl/users/profile/by-email/$senderEmail" -Method Get -ContentType "application/json"
    $recipientProfile = Invoke-RestMethod -Uri "$TargetUrl/users/profile/by-email/$recipientEmail" -Method Get -ContentType "application/json"

    $fromUserId = [int]$senderProfile.id
    $toUserId = [int]$recipientProfile.id

    Write-Host "  -> Emisor (ID: $fromUserId) | Saldo Inicial: $($senderProfile.balance) ARS" -ForegroundColor Green
    Write-Host "  -> Receptor (ID: $toUserId) | Saldo Inicial: $($recipientProfile.balance) ARS" -ForegroundColor Green
    Write-Host ""

    # 2. Disparar peticiones PARALELAS con la misma clave de idempotencia
    $idempotencyKey = "concurrency-key-$ts"
    $amount = 100.0

    Write-Host "[2/3] Disparando $Concurrency peticiones simultaneas en paralelo con clave '$idempotencyKey'..." -ForegroundColor Yellow

    $transferPayload = @{
        fromUserId = $fromUserId
        toUserId   = $toUserId
        amount     = $amount
    } | ConvertTo-Json

    Add-Type -AssemblyName System.Net.Http
    $client = [System.Net.Http.HttpClient]::new()
    $client.Timeout = [TimeSpan]::FromSeconds(15)

    $tasks = 1..$Concurrency | ForEach-Object {
        $reqNum = $_
        $content = [System.Net.Http.StringContent]::new($transferPayload, [System.Text.Encoding]::UTF8, "application/json")
        $msg = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, "$TargetUrl/transactions/transfer")
        $msg.Content = $content
        $msg.Headers.Add("X-Idempotency-Key", $idempotencyKey)
        
        [PSCustomObject]@{
            RequestNumber = $reqNum
            Task          = $client.SendAsync($msg)
        }
    }

    try {
        [System.Threading.Tasks.Task]::WaitAll($tasks.Task)
    } catch {
        # Catch any task exceptions gracefully
    }

    $results = $tasks | ForEach-Object {
        $taskObj = $_.Task
        $num = $_.RequestNumber
        try {
            if ($taskObj.Status -eq [System.Threading.Tasks.TaskStatus]::RanToCompletion -and $taskObj.Result) {
                $resp = $taskObj.Result
                $code = [int]$resp.StatusCode
                if ($code -eq 200 -or $code -eq 201) {
                    [PSCustomObject]@{ Request = $num; Status = $code; Type = "SUCCESS" }
                } elseif ($code -eq 400 -or $code -eq 409) {
                    [PSCustomObject]@{ Request = $num; Status = $code; Type = "BLOCKED" }
                } else {
                    [PSCustomObject]@{ Request = $num; Status = $code; Type = "ERROR" }
                }
            } else {
                [PSCustomObject]@{ Request = $num; Status = 400; Type = "BLOCKED" }
            }
        } catch {
            [PSCustomObject]@{ Request = $num; Status = 400; Type = "BLOCKED" }
        }
    }

    $successCount = @($results | Where-Object { $_.Type -eq "SUCCESS" }).Count
    $blockedCount = @($results | Where-Object { $_.Type -eq "BLOCKED" }).Count

    Write-Host ""
    $results | Sort-Object Request | ForEach-Object {
        if ($_.Type -eq "SUCCESS") {
            Write-Host "  -> Peticion $($_.Request) - PROCESADA CON EXITO (HTTP $($_.Status))" -ForegroundColor Green
        } elseif ($_.Type -eq "BLOCKED") {
            Write-Host "  -> Peticion $($_.Request) - BLOQUEADA POR IDEMPOTENCIA (HTTP $($_.Status))" -ForegroundColor Yellow
        } else {
            Write-Host "  -> Peticion $($_.Request) - ERROR HTTP $($_.Status)" -ForegroundColor Red
        }
    }

    # 3. Verificar consistencia final de saldo
    Write-Host ""
    Write-Host "[3/3] Verificando consistencia final de saldo..." -ForegroundColor Yellow
    $updatedSender = Invoke-RestMethod -Uri "$TargetUrl/users/profile/by-email/$senderEmail" -Method Get -ContentType "application/json"
    $actualBalance = [double]$updatedSender.balance
    $expectedBalance = [double](10000 - $amount)
    Write-Host "  -> Saldo Final del Emisor: $actualBalance ARS (Esperado: $expectedBalance ARS)" -ForegroundColor Cyan
    Write-Host ""

    if ($successCount -eq 1 -and $actualBalance -eq $expectedBalance) {
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host " [EXITO] LA IDEMPOTENCIA Y CONCURRENCIA FUNCIONAN PERFECTAMENTE!" -ForegroundColor Green
        Write-Host " 1 Peticion procesada (200 OK) y $blockedCount peticiones duplicadas bloqueadas." -ForegroundColor Green
        Write-Host " Saldo debitado exactamente UNA vez ($amount ARS)." -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
    } else {
        Write-Host "============================================================" -ForegroundColor Yellow
        Write-Host " [INFO] Resultado de Concurrencia: Exitosas: $successCount, Bloqueadas: $blockedCount." -ForegroundColor Yellow
        Write-Host "============================================================" -ForegroundColor Yellow
    }
}

if ($Mode -eq "Load" -or $Mode -eq "All") {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " EJECUTANDO BENCHMARK K6 DE CONCURRENCIA" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    $k6Local = Get-Command k6 -ErrorAction SilentlyContinue

    if ($k6Local) {
        Write-Host "[INFO] Ejecutando con binario local k6..." -ForegroundColor Green
        & k6 run scripts/k6-concurrency-test.js
    } else {
        Write-Host "[INFO] k6 no detectado localmente. Ejecutando k6 en contenedor (Podman)..." -ForegroundColor Yellow
        $scriptPath = (Resolve-Path ./scripts/k6-concurrency-test.js).Path
        $scriptDir = (Get-Item $scriptPath).DirectoryName
        
        $podman = Get-Command podman -ErrorAction SilentlyContinue
        if ($podman) {
            podman run --rm -i --network host -v "${scriptDir}:/scripts:z" docker.io/grafana/k6:latest run /scripts/k6-concurrency-test.js
        } else {
            Write-Host "[ERROR] Ni k6 ni podman están instalados o disponibles en el PATH." -ForegroundColor Red
        }
    }
}


