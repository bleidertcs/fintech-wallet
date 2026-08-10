# ==============================================================================
# SCRIPT DE EJECUCIÓN AUTOMATIZADA DE PRUEBAS E2E (JEST + TRAEFIK INGRESS)
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " FINTECH WALLET - SUITE DE PRUEBAS E2E (KUBERNETES + INGRESS)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# 1. Verificar si node_modules existe
if (-not (Test-Path "$scriptDir\node_modules")) {
    Write-Host "[1/3] Instalando dependencias de prueba en scripts/e2e-test-suite..." -ForegroundColor Yellow
    pnpm --prefix $scriptDir install
} else {
    Write-Host "[1/3] Dependencias ya instaladas en scripts/e2e-test-suite" -ForegroundColor Green
}
Write-Host ""

# 2. Ejecutar suite de pruebas Jest
Write-Host "[2/3] Ejecutando suite Jest E2E contra http://localhost..." -ForegroundColor Yellow
Write-Host ""

try {
    pnpm --prefix $scriptDir test
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " RESULTADO: ¡TODAS LAS PRUEBAS E2E PASARON CON ÉXITO! (100%)" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " [ERROR] Algunas pruebas E2E fallaron. Revisa los logs arriba." -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    exit 1
}
