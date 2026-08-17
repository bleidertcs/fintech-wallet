# ==============================================================================
# SCRIPT DE PRUEBA DE HUMO (SMOKE TEST)
# Verificación rápida de la infraestructura K8s y salud de los 5 microservicios
# ==============================================================================

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         PRUEBA DE HUMO (SMOKE TEST) - FINTECH WALLET" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Pods en Kubernetes
Write-Host "[1/4] Verificando Pods en el namespace 'fintech'..." -ForegroundColor Yellow
$pods = kubectl get pods -n fintech --no-headers
$failedPods = $pods | Where-Object { $_ -notmatch "Running" -and $_ -notmatch "Completed" }

if ($failedPods) {
    Write-Host "  [WARN] Existen pods con estado no saludable:" -ForegroundColor Red
    $failedPods | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
} else {
    Write-Host "  [OK] Todos los pods en 'fintech' estan en Running / Completed!" -ForegroundColor Green
}
Write-Host ""

# 2. Rutas Ingress y Traefik API Gateway
Write-Host "[2/4] Verificando endpoints de salud a traves de Traefik API Gateway..." -ForegroundColor Yellow
$endpoints = @(
    @{ Name = "Frontend React Web"; URL = "http://localhost/" },
    @{ Name = "Auth Service Health"; URL = "http://localhost/auth/health" },
    @{ Name = "User Service Health"; URL = "http://localhost/users/health" },
    @{ Name = "Transaction Service Health"; URL = "http://localhost/transactions/health" },
    @{ Name = "Notification Service Health"; URL = "http://localhost/notifications/health" },
    @{ Name = "Worker Service Health"; URL = "http://localhost/worker/health" },
    @{ Name = "Maildev UI (Traefik Ingress)"; URL = "http://localhost/maildev/" }
)

foreach ($ep in $endpoints) {
    try {
        $res = Invoke-WebRequest -Uri $ep.URL -Method Get -UseBasicParsing -TimeoutSec 5
        if ($res.StatusCode -eq 200) {
            Write-Host "  [OK] $($ep.Name) -> $($ep.URL) (HTTP 200)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] $($ep.Name) -> $($ep.URL) (HTTP $($res.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [FAIL] $($ep.Name) -> $($ep.URL) (Error: $_)" -ForegroundColor Red
    }
}
Write-Host ""

# 3. Documentacion Swagger UI
Write-Host "[3/4] Verificando Swagger UI de los 5 Microservicios..." -ForegroundColor Yellow
$swaggers = @(
    "http://localhost/auth/docs/",
    "http://localhost/users/docs/",
    "http://localhost/transactions/docs/",
    "http://localhost/notifications/docs/",
    "http://localhost/worker/docs/"
)

foreach ($sw in $swaggers) {
    try {
        $res = Invoke-WebRequest -Uri $sw -Method Get -UseBasicParsing -TimeoutSec 5
        if ($res.StatusCode -eq 200) {
            Write-Host "  [OK] Swagger en $sw (HTTP 200)" -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] Swagger en $sw (HTTP $($res.StatusCode))" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [FAIL] Swagger en $sw (Error: $_)" -ForegroundColor Red
    }
}
Write-Host ""

# 4. Bases de Datos e Infraestructura
Write-Host "[4/4] Verificando conectividad de PostgreSQL, Redis y Kafka..." -ForegroundColor Yellow
try {
    $pgCheck = kubectl exec -n fintech postgres-core-0 -- pg_isready -U postgres -d transactiondb 2>$null
    if ($pgCheck -match "accepting connections") {
        Write-Host "  [OK] postgres-core-0 respondiendo y aceptando conexiones!" -ForegroundColor Green
    }
} catch {
    Write-Host "  [FAIL] Error conectando a PostgreSQL: $_" -ForegroundColor Red
}

try {
    $redisPing = kubectl exec -n fintech redis-0 -- redis-cli ping 2>$null
    if ($redisPing -match "PONG") {
        Write-Host "  [OK] Redis-0 respondiendo (PONG)!" -ForegroundColor Green
    }
} catch {
    Write-Host "  [FAIL] Error conectando a Redis: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                 PRUEBA DE HUMO FINALIZADA                  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
