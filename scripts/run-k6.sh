#!/usr/bin/env bash
# ==============================================================================
# SCRIPT EJECUTOR DE BENCHMARK K6 (BASH)
# Ejecuta k6 localmente o mediante contenedor sin necesidad de instalación manual
# ==============================================================================

TARGET_URL="${1:-http://localhost}"
export TARGET_URL="${TARGET_URL}"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} BENCHMARK DE CONCURRENCIA CON K6 (FinTech Wallet)${NC}"
echo -e "${CYAN} Destino: ${TARGET_URL}${NC}"
echo -e "${CYAN}============================================================${NC}\n"

if command -v k6 &>/dev/null; then
    echo -e "${GREEN}[INFO] Ejecutando benchmark con binario k6 local...${NC}"
    k6 run scripts/k6-concurrency-test.js
elif command -v podman &>/dev/null; then
    echo -e "${YELLOW}[INFO] Binario k6 local no detectado. Ejecutando k6 en contenedor con Podman...${NC}"
    podman run --rm -i --network host -v "$(pwd)/scripts:/scripts:z" -e TARGET_URL="${TARGET_URL}" docker.io/grafana/k6:latest run /scripts/k6-concurrency-test.js
elif command -v docker &>/dev/null; then
    echo -e "${YELLOW}[INFO] Binario k6 local no detectado. Ejecutando k6 en contenedor con Docker...${NC}"
    docker run --rm -i --network host -v "$(pwd)/scripts:/scripts:z" -e TARGET_URL="${TARGET_URL}" docker.io/grafana/k6:latest run /scripts/k6-concurrency-test.js
else
    echo -e "${RED}[ERROR] Ni k6, podman ni docker están instalados o disponibles en el PATH.${NC}"
    exit 1
fi
