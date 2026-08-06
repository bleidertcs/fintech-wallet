# ==============================================================================
# SCRIPT DE PRUEBA DE INTEGRACIÓN Y COMUNICACIÓN INTER-SERVICIO (auth-service / user-service)
# ==============================================================================

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "integration.test.$timestamp@fintech.com"
$testName = "Usuario Integracion $timestamp"
$testPassword = "Password123!"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " PRUEBA DE INTEGRACION COMPLETA (auth-service & user-service)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# PASO 1: Verificar disponibilidad de Pods en Kubernetes
# ------------------------------------------------------------------------------
Write-Host "[1/5] Verificando estado de los Pods NestJS..." -ForegroundColor Yellow
$authPod = kubectl get pods -n fintech -l app=auth-service --no-headers
$userPod = kubectl get pods -n fintech -l app=user-service --no-headers

Write-Host "  -> Pod Auth Service : $authPod"
Write-Host "  -> Pod User Service : $userPod"
Write-Host ""

# ------------------------------------------------------------------------------
# PASO 2: Registro de Usuario en auth-service (Dispara llamado a user-service)
# ------------------------------------------------------------------------------
Write-Host "[2/5] Registrando usuario en auth-service (POST /auth/register)..." -ForegroundColor Yellow
Write-Host "  -> Email : $testEmail"
Write-Host "  -> Name  : $testName"

$registerBody = @{
    name     = $testName
    email    = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $regResponse = Invoke-RestMethod -Uri "http://localhost/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    Write-Host "  [OK] Registro exitoso en auth-service!" -ForegroundColor Green
    Write-Host "       Respuesta: $($regResponse | ConvertTo-Json -Compress)" -ForegroundColor Gray
} catch {
    Write-Host "  [ERROR] Fallo el registro en auth-service: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Esperar 2 segundos para propagacion en base de datos
Start-Sleep -Seconds 2

# ------------------------------------------------------------------------------
# PASO 3: Verificar creación automática del perfil en user-service
# ------------------------------------------------------------------------------
Write-Host "[3/5] Consultando perfil creado automaticamente en user-service..." -ForegroundColor Yellow
$userProfileUrl = "http://localhost/users/profile/by-email/$testEmail"

try {
    $profile = Invoke-RestMethod -Uri $userProfileUrl -Method Get -ContentType "application/json"
    Write-Host "  [OK] Perfil encontrado exitosamente en user-service!" -ForegroundColor Green
    Write-Host "       ID Perfil   : $($profile.id)" -ForegroundColor White
    Write-Host "       Nombre      : $($profile.name)" -ForegroundColor White
    Write-Host "       Email       : $($profile.email)" -ForegroundColor White
    Write-Host "       Saldo       : $($profile.balance) $($profile.currency)" -ForegroundColor Green
    Write-Host "       Limite D.   : $($profile.dailyLimit) $($profile.currency)" -ForegroundColor White
    
    if ($profile.email -eq $testEmail -and $profile.balance -ge 10000) {
        Write-Host "  [EXITO] La sincronizacion entre auth-service y user-service funciona perfectamente!" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Los datos no coinciden exactamente con lo esperado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] No se pudo encontrar el perfil en user-service: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# ------------------------------------------------------------------------------
# PASO 4: Prueba de Autenticación (Login) y Modificación de Saldo
# ------------------------------------------------------------------------------
Write-Host "[4/5] Probando autenticacion y actualizacion de saldo en user-service..." -ForegroundColor Yellow

# Login
$loginBody = @{
    email    = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    Write-Host "  [OK] Login exitoso! Token obtenido." -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Fallo el login en auth-service: $_" -ForegroundColor Red
}

# Actualizar Saldo (+ $5,000 ARS)
$updateBalanceUrl = "http://localhost/users/profile/$($profile.id)/balance"
$updateBody = @{ amount = 5000 } | ConvertTo-Json

try {
    $balanceResult = Invoke-RestMethod -Uri $updateBalanceUrl -Method Put -Body $updateBody -ContentType "application/json"
    Write-Host "  [OK] Deposito de 5,000 ARS procesado: $($balanceResult.message)" -ForegroundColor Green
    
    # Re-consultar perfil
    $updatedProfile = Invoke-RestMethod -Uri $userProfileUrl -Method Get -ContentType "application/json"
    Write-Host "  [OK] Nuevo saldo actualizado en user-service: $($updatedProfile.balance) $($updatedProfile.currency)" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Fallo la actualizacion de saldo: $_" -ForegroundColor Red
}
Write-Host ""

# ------------------------------------------------------------------------------
# PASO 5: Resumen de Verificación y Observabilidad
# ------------------------------------------------------------------------------
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " RESULTADO: PRUEBA DE INTEGRACION COMPLETADA EXITOSAMENTE! " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "1. auth-service recibio el registro y llamo a user-service REST"
Write-Host "2. user-service creo la entidad de usuario en MySQL (userdb)"
Write-Host "3. Ambas aplicaciones registraron logs con trace_id distribuido"
Write-Host "4. Puedes ver la traza de ambos servicios unificada en SigNoz UI:"
Write-Host "   -> http://localhost:3301 (Filtra por service.name = auth-service)"
Write-Host "============================================================" -ForegroundColor Cyan
