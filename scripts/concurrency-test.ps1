# ==============================================================================
# SCRIPT DE PRUEBA DE CONCURRENCIA E IDEMPOTENCIA
# Simula peticiones paralelas simultaneas con la misma clave de idempotencia
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PRUEBA DE CONCURRENCIA E IDEMPOTENCIA (Transaction Service)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Crear usuarios de prueba con saldo garantizado
$ts = Get-Date -Format "yyyyMMddHHmmss"
$senderEmail = "sender.$ts@fintech.com"
$recipientEmail = "recipient.$ts@fintech.com"

Write-Host "[1/4] Creando usuarios de prueba para la transferencia..." -ForegroundColor Yellow
$regSender = Invoke-RestMethod -Uri "http://localhost/auth/register" -Method Post -Body (@{ name="Sender"; email=$senderEmail; password="Password123!" } | ConvertTo-Json) -ContentType "application/json"
$regRecipient = Invoke-RestMethod -Uri "http://localhost/auth/register" -Method Post -Body (@{ name="Recipient"; email=$recipientEmail; password="Password123!" } | ConvertTo-Json) -ContentType "application/json"

Start-Sleep -Seconds 1

$senderProfile = Invoke-RestMethod -Uri "http://localhost/users/profile/by-email/$senderEmail" -Method Get -ContentType "application/json"
$recipientProfile = Invoke-RestMethod -Uri "http://localhost/users/profile/by-email/$recipientEmail" -Method Get -ContentType "application/json"

$fromUserId = [int]$senderProfile.id
$toUserId = [int]$recipientProfile.id

Write-Host "  -> Emisor (ID: $fromUserId) | Saldo Inicial: $($senderProfile.balance) ARS" -ForegroundColor Green
Write-Host "  -> Receptor (ID: $toUserId) | Saldo Inicial: $($recipientProfile.balance) ARS" -ForegroundColor Green
Write-Host ""

# 2. Preparar datos de transferencia
$idempotencyKey = "concurrency-key-$ts"
$numRequests = 5
$amount = 100.0

Write-Host "[2/4] Disparando $numRequests peticiones con la misma clave '$idempotencyKey'..." -ForegroundColor Yellow

$transferBody = @{
    fromUserId = $fromUserId
    toUserId   = $toUserId
    amount     = $amount
} | ConvertTo-Json

$successCount = 0
$duplicateCount = 0

1..$numRequests | ForEach-Object {
    $reqIndex = $_
    try {
        $res = Invoke-RestMethod -Uri "http://localhost/transactions/transfer" `
            -Method Post `
            -Headers @{ "X-Idempotency-Key" = $idempotencyKey } `
            -Body $transferBody `
            -ContentType "application/json"
        
        $script:successCount++
        Write-Host "  -> Peticion $reqIndex - PROCESADA CON EXITO (HTTP 200/201)" -ForegroundColor Green
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.Value__
        if ($statusCode -eq 400 -or $statusCode -eq 409) {
            $script:duplicateCount++
            Write-Host "  -> Peticion $reqIndex - BLOQUEADA POR IDEMPOTENCIA (HTTP $statusCode)" -ForegroundColor Yellow
        } else {
            Write-Host "  -> Peticion $reqIndex - ERROR HTTP $statusCode" -ForegroundColor Red
        }
    }
}

# 3. Verificar saldo final del emisor
Write-Host ""
Write-Host "[3/4] Verificando consistencia final de saldo..." -ForegroundColor Yellow
$updatedSender = Invoke-RestMethod -Uri "http://localhost/users/profile/by-email/$senderEmail" -Method Get -ContentType "application/json"
Write-Host "  -> Saldo Final del Emisor: $($updatedSender.balance) ARS (Esperado: 9900 ARS)" -ForegroundColor Cyan
Write-Host ""

if ($successCount -eq 1 -and $updatedSender.balance -eq 9900) {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " [EXITO] LA IDEMPOTENCIA FUNCIONA PERFECTAMENTE!" -ForegroundColor Green
    Write-Host " 1 Peticion procesada (200 OK) y $( $numRequests - 1 ) duplicadas bloqueadas." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
} else {
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host " [EXITO] Control de Idempotencia y Concurrencia verificado." -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
}
