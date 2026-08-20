#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE RENDIMIENTO Y CARGA (PERFORMANCE TEST - BASH)
# Mide throughput (RPS), latencias P95/P99 y tasa de errores de los microservicios
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} PRUEBA DE RENDIMIENTO Y CARGA (PERFORMANCE BENCHMARK)${NC}"
echo -e "${CYAN}============================================================${NC}\n"

if command -v k6 &>/dev/null; then
    echo -e "${GREEN}[INFO] Ejecutando benchmark con k6...${NC}"
    k6 run scripts/k6-concurrency-test.js
else
    echo -e "${YELLOW}[INFO] k6 no detectado en PATH. Ejecutando test de carga nativo con Bash...${NC}"
    
    TARGET_URL="http://localhost/users/health"
    ITERATIONS=1000
    START_TIME=$(date +%s.%N)

    echo -e "${GRAY}Enviando ${ITERATIONS} peticiones HTTP a ${TARGET_URL}...${NC}"
    
    SUCCESS=0
    FAILED=0
    
    for ((i=1; i<=ITERATIONS; i++)); do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "${TARGET_URL}" || echo "000")
        if [ "${STATUS}" -eq 200 ]; then
            ((SUCCESS++))
        else
            ((FAILED++))
        fi
    done
    
    END_TIME=$(date +%s.%N)
    TOTAL_SECONDS=$(awk "BEGIN {print ${END_TIME} - ${START_TIME}}")
    RPS=$(awk "BEGIN {printf \"%.2f\", ${ITERATIONS} / ${TOTAL_SECONDS}}")
    
    echo -e "\n${CYAN}============================================================${NC}"
    echo -e "${CYAN} RESULTADOS DE LA PRUEBA DE RENDIMIENTO${NC}"
    echo -e "${CYAN}============================================================${NC}"
    echo -e "  -> Peticiones Totales   : ${ITERATIONS}"
    echo -e "  -> Exitosas (200 OK)    : ${GREEN}${SUCCESS}${NC}"
    echo -e "  -> Fallidas             : ${RED}${FAILED}${NC}"
    echo -e "  -> Tiempo Total         : ${TOTAL_SECONDS} segundos"
    echo -e "  -> Throughput (RPS)     : ${GREEN}${RPS} req/sec${NC}"
    echo -e "${CYAN}============================================================${NC}"
fi
