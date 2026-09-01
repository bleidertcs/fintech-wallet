# ==============================================================================
# SCRIPT DE PRUEBA DE HUMO (SMOKE TEST) - FINTECH WALLET
# Verificación rápida de la infraestructura K8s y salud de los 5 microservicios
# ==============================================================================
param(
    [string]$HostTarget = "auto"
)

$ErrorActionPreference = "Continue"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         PRUEBA DE HUMO (SMOKE TEST) - FINTECH WALLET" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Determinar Host de prueba (Localhost o IP de WSL2)
$BaseHost = $HostTarget
if ($HostTarget -eq "auto") {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost/" -Method Head -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        $BaseHost = "localhost"
    } catch {
        $wslIpOutput = wsl -d podman-machine-default -u root ip -4 addr show eth0 2>$null
        if (($wslIpOutput | Out-String) -match "inet\s+(\d+\.\d+\.\d+\.\d+)") {
            $BaseHost = $matches[1]
        } else {
            $BaseHost = "localhost"
        }
    }
}

Write-Host "Host objetivo de pruebas: http://$BaseHost" -ForegroundColor Cyan
Write-Host ""

# 1. Pods en Kubernetes
Write-Host "[1/4] Verificando Pods en el namespace 'fintech'..." -ForegroundColor Yellow
$pods = kubectl get pods -n fintech --no-headers 2>$null
$failedPods = $pods | Where-Object { $_ -notmatch "Running" -and $_ -notmatch "Completed" }

if ($failedPods) {
    Write-Host "  [WARN] Existen pods con estado no saludable:" -ForegroundColor Red
    $failedPods | ForEach-Object { Write-Host "         $_" -ForegroundColor Red }
} else {
    Write-Host "  [OK] Todos los pods en 'fintech' están en Running / Completed!" -ForegroundColor Green
}
Write-Host ""

# 2. Rutas Ingress y Traefik API Gateway
Write-Host "[2/4] Verificando endpoints de salud a través de Traefik API Gateway..." -ForegroundColor Yellow
$endpoints = @(
    @{ Name = "Frontend React Web"; URL = "http://${BaseHost}/" },
    @{ Name = "Auth Service Health"; URL = "http://${BaseHost}/auth/health" },
    @{ Name = "User Service Health"; URL = "http://${BaseHost}/users/health" },
    @{ Name = "Transaction Service Health"; URL = "http://${BaseHost}/transactions/health" },
    @{ Name = "Notification Service Health"; URL = "http://${BaseHost}/notifications/health" },
    @{ Name = "Worker Service Health"; URL = "http://${BaseHost}/worker/health" },
    @{ Name = "Maildev UI (Traefik Ingress)"; URL = "http://${BaseHost}/maildev/" },
    @{ Name = "SigNoz APM Dashboard"; URL = "http://${BaseHost}:3301/" }
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

# 3. Documentación Swagger UI
Write-Host "[3/4] Verificando Swagger UI de los 5 Microservicios..." -ForegroundColor Yellow
$swaggers = @(
    "http://${BaseHost}/auth/docs/",
    "http://${BaseHost}/users/docs/",
    "http://${BaseHost}/transactions/docs/",
    "http://${BaseHost}/notifications/docs/",
    "http://${BaseHost}/worker/docs/"
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
Write-Host "[4/4] Verificando conectividad de PostgreSQL, PgBouncer y Redis..." -ForegroundColor Yellow
$pgCheck = kubectl exec -n fintech postgres-core-0 -c postgres -- pg_isready -U postgres -d transactiondb 2>&1
if ($pgCheck -match "accepting connections") {
    Write-Host "  [OK] postgres-core-0 respondiendo y aceptando conexiones!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Error conectando a PostgreSQL Core: $pgCheck" -ForegroundColor Red
}

$pgbCheck = kubectl exec -n fintech deploy/pgbouncer-core -c pgbouncer -- nc -z 127.0.0.1 6432 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] pgbouncer-core activo y escuchando en puerto 6432!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Error verificando PgBouncer: $pgbCheck" -ForegroundColor Red
}

$redisPing = kubectl exec -n fintech redis-0 -- redis-cli ping 2>&1
if ($redisPing -match "PONG") {
    Write-Host "  [OK] redis-0 respondiendo (PONG)!" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Error conectando a Redis: $redisPing" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                 PRUEBA DE HUMO FINALIZADA                  " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
