#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE EJECUCIÓN AUTOMATIZADA DE PRUEBAS E2E (JEST + TRAEFIK INGRESS - BASH)
# ==============================================================================

set -eo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} FINTECH WALLET - SUITE DE PRUEBAS E2E (KUBERNETES + INGRESS)${NC}"
echo -e "${CYAN}============================================================${NC}\n"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# 1. Verificar si node_modules existe
if [ ! -d "${SCRIPT_DIR}/node_modules" ]; then
    echo -e "${YELLOW}[1/3] Instalando dependencias de prueba en scripts/e2e-test-suite...${NC}"
    if command -v pnpm &>/dev/null; then
        pnpm install
    else
        npm install
    fi
else
    echo -e "${GREEN}[1/3] Dependencias ya instaladas en scripts/e2e-test-suite${NC}"
fi
echo ""

# 2. Ejecutar suite de pruebas Jest
echo -e "${YELLOW}[2/3] Ejecutando suite Jest E2E contra http://localhost...${NC}\n"

JEST_CMD="${SCRIPT_DIR}/node_modules/.bin/jest"
if [ ! -f "${JEST_CMD}" ]; then
    JEST_CMD="npx jest"
fi

if "${JEST_CMD}" --runInBand; then
    echo ""
    echo -e "${CYAN}============================================================${NC}"
    echo -e "${GREEN} RESULTADO: ¡TODAS LAS PRUEBAS E2E PASARON CON ÉXITO! (100%)${NC}"
    echo -e "${CYAN}============================================================${NC}"
else
    echo ""
    echo -e "${RED}============================================================${NC}"
    echo -e "${RED} [ERROR] Algunas pruebas E2E fallaron. Revisa los logs arriba.${NC}"
    echo -e "${RED}============================================================${NC}"
    exit 1
fi
