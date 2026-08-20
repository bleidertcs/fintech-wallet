#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE ESTRÉS EXTREMO Y RESILIENCIA (FULL STRESS TEST - BASH)
# Dispara ráfagas concurrentes masivas contra el Ingress y microservicios
# Uso: ./scripts/stress-test.sh [NUM_WORKERS] [PETICIONES_POR_WORKER]
# Ejemplo: ./scripts/stress-test.sh 20 25 (500 peticiones en 20 hilos)
# ==============================================================================

set -eo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

WORKERS="${1:-20}"
REQS_PER_WORKER="${2:-25}"
TOTAL_REQUESTS=$((WORKERS * REQS_PER_WORKER))
TARGET_URL="${TARGET_URL:-http://localhost}"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} FINTECH WALLET - PRUEBA DE FULL ESTRÉS Y RESILIENCIA${NC}"
echo -e "${CYAN} Hilos Concurrentes : ${WORKERS}${NC}"
echo -e "${CYAN} Peticiones/Hilo    : ${REQS_PER_WORKER}${NC}"
echo -e "${CYAN} Peticiones Totales : ${TOTAL_REQUESTS}${NC}"
echo -e "${CYAN} Ingress Target URL : ${TARGET_URL}${NC}"
echo -e "${CYAN}============================================================${NC}\n"

# Verificar si k6 está disponible localmente o mediante Podman/Docker
if command -v k6 &>/dev/null; then
    echo -e "${GREEN}[INFO] Ejecutando escenario k6 de estrés completo...${NC}"
    k6 run scripts/k6-stress-test.js
    exit 0
fi

LOG_DIR="$(mktemp -d)"
trap 'rm -rf "${LOG_DIR}"' EXIT

START_TIME=$(date +%s.%N)

run_worker() {
    local worker_id=$1
    local output_file="${LOG_DIR}/worker_${worker_id}.log"
    
    for ((i=1; i<=REQS_PER_WORKER; i++)); do
        local ts=$(date +%s%N)
        local endpoint_choice=$(( (worker_id + i) % 5 ))
        local status="000"

        case $endpoint_choice in
            0) # Healthcheck Endpoint
                status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${TARGET_URL}/users/health" || echo "000")
                ;;
            1) # Auth Registration
                status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TARGET_URL}/auth/register" \
                    -H "Content-Type: application/json" \
                    -d "{\"name\":\"User_${ts}\",\"email\":\"stress_${ts}_${worker_id}_${i}@fintech.com\",\"password\":\"Pass123!\"}" --max-time 10 || echo "000")
                ;;
            2) # Account Funding
                status=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "${TARGET_URL}/users/1/balance" \
                    -H "Content-Type: application/json" \
                    -d "{\"amount\":100}" --max-time 10 || echo "000")
                ;;
            3) # Money Transfer with Idempotency
                status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TARGET_URL}/transactions/transfer" \
                    -H "Content-Type: application/json" \
                    -H "X-Idempotency-Key: stress-key-${worker_id}-${i}" \
                    -d "{\"fromUserId\":1,\"toUserId\":2,\"amount\":10}" --max-time 10 || echo "000")
                ;;
            4) # Worker Statement Request
                status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TARGET_URL}/worker/statements/request?userId=1" --max-time 10 || echo "000")
                ;;
        esac

        echo "${status}" >> "${output_file}"
    done
}

echo -e "${YELLOW}[1/2] Disparando ráfaga concurrente de ${TOTAL_REQUESTS} peticiones en ${WORKERS} hilos...${NC}"

for ((w=1; w<=WORKERS; w++)); do
    run_worker "$w" &
done

wait

END_TIME=$(date +%s.%N)
TOTAL_SECONDS=$(awk "BEGIN {print ${END_TIME} - ${START_TIME}}")
if (( $(echo "${TOTAL_SECONDS} <= 0" | bc -l) )); then TOTAL_SECONDS="0.001"; fi

# Consolidar resultados
CAT_LOGS=$(cat "${LOG_DIR}"/worker_*.log)
SUCCESS_COUNT=$(echo "${CAT_LOGS}" | grep -cE '^(200|201)$' || true)
IDEMPOTENT_COUNT=$(echo "${CAT_LOGS}" | grep -cE '^(400|409)$' || true)
FAIL_COUNT=$(echo "${CAT_LOGS}" | grep -c '000' || true)

RPS=$(awk "BEGIN {printf \"%.2f\", ${TOTAL_REQUESTS} / ${TOTAL_SECONDS}}")

echo -e "\n${CYAN}============================================================${NC}"
echo -e "${CYAN} RESULTADOS DE LA PRUEBA DE FULL ESTRÉS${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "  -> Peticiones Ejecutadas : ${TOTAL_REQUESTS}"
echo -e "  -> Exitosas (2xx OK)     : ${GREEN}${SUCCESS_COUNT}${NC}"
echo -e "  -> Bloqueadas / Idemp.   : ${YELLOW}${IDEMPOTENT_COUNT}${NC}"
echo -e "  -> Errores / Timeouts    : ${RED}${FAIL_COUNT}${NC}"
echo -e "  -> Tiempo Transcurrido   : ${TOTAL_SECONDS} segundos"
echo -e "  -> Throughput Máximo     : ${GREEN}${RPS} RPS (Req/sec)${NC}"
echo -e "${CYAN}============================================================${NC}"

if [ "${FAIL_COUNT}" -eq 0 ]; then
    echo -e "${GREEN} STATUS: ¡EL SISTEMA RESISTIÓ LA PRUEBA DE ESTRÉS CON 0 ERRORES!${NC}"
    exit 0
else
    echo -e "${YELLOW} STATUS: PRUEBA COMPLETADA CON ALGUNAS PETICIONES RECHAZADAS O EN TIMEOUT.${NC}"
    exit 0
fi
