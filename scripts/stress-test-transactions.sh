#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE ESTRÉS DE TRANSACCIONES (MONEY TRANSFERS - BASH)
# Dispara ráfagas concurrentes masivas exclusivamente al endpoint de transferencias
#
# Uso:
#   ./scripts/stress-test-transactions.sh [NUM_WORKERS] [REQS_POR_WORKER] [TARGET_URL]
#
# Ejemplo:
#   ./scripts/stress-test-transactions.sh 20 25 http://localhost
#   (500 transferencias concurrentes distribuidas en 20 hilos)
# ==============================================================================

set -eo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

WORKERS="${1:-20}"
REQS_PER_WORKER="${2:-25}"
TARGET_URL="${3:-${TARGET_URL:-http://localhost}}"
FROM_USER_ID="${FROM_USER_ID:-1}"
TO_USER_ID="${TO_USER_ID:-2}"
AMOUNT="${AMOUNT:-10}"

TOTAL_REQUESTS=$((WORKERS * REQS_PER_WORKER))
TOTAL_FUNDS_NEEDED=$((TOTAL_REQUESTS * AMOUNT + 5000))

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} FINTECH WALLET - PRUEBA DE ESTRÉS DE TRANSACCIONES${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "  -> Hilos Concurrentes : ${WORKERS}"
echo -e "  -> Transferencias/Hilo: ${REQS_PER_WORKER}"
echo -e "  -> Total a Procesar   : ${TOTAL_REQUESTS} transferencias"
echo -e "  -> Emisor -> Receptor : Usuario #${FROM_USER_ID} -> Usuario #${TO_USER_ID}"
echo -e "  -> Monto por Tx       : ${AMOUNT} VES"
echo -e "  -> Target URL         : ${TARGET_URL}"
echo -e "${CYAN}============================================================${NC}\n"

# 1. Determinar rutas de endpoint (soporta prefijo /api o directo)
TX_URL="${TARGET_URL}/transactions/transfer"
USER_BALANCE_URL="${TARGET_URL}/users/${FROM_USER_ID}/balance"
HEALTH_URL="${TARGET_URL}/transactions/health"

# Comprobar conectividad básica
if ! curl -s -o /dev/null --max-time 3 "${HEALTH_URL}" 2>/dev/null; then
    # Probar variante /api/
    if curl -s -o /dev/null --max-time 3 "${TARGET_URL}/api/transactions/health" 2>/dev/null; then
        TX_URL="${TARGET_URL}/api/transactions/transfer"
        USER_BALANCE_URL="${TARGET_URL}/api/users/${FROM_USER_ID}/balance"
        HEALTH_URL="${TARGET_URL}/api/transactions/health"
    fi
fi

# 2. Precargar saldo en el usuario emisor para garantizar fondos durante la ráfaga
echo -e "${YELLOW}[1/3] Aprovisionando saldo de respaldo para el Emisor (Usuario #${FROM_USER_ID})...${NC}"
FUND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "${USER_BALANCE_URL}" \
    -H "Content-Type: application/json" \
    -d "{\"amount\": ${TOTAL_FUNDS_NEEDED}}" --max-time 5 || echo "000")

if [[ "${FUND_STATUS}" =~ ^(200|201)$ ]]; then
    echo -e "  -> ${GREEN}Saldo recargado exitosamente (+${TOTAL_FUNDS_NEEDED} VES).${NC}\n"
else
    echo -e "  -> ${GRAY}No se pudo actualizar saldo vía REST (HTTP ${FUND_STATUS}). Continuando con saldo existente...${NC}\n"
fi

# 3. Preparar directorio temporal de logs por worker
LOG_DIR="$(mktemp -d)"
trap 'rm -rf "${LOG_DIR}"' EXIT

START_TIME=$(date +%s.%N)

# 4. Función ejecutada por cada worker en paralelo
run_tx_worker() {
    local worker_id=$1
    local output_file="${LOG_DIR}/worker_${worker_id}.log"
    
    for ((i=1; i<=REQS_PER_WORKER; i++)); do
        local ts=$(date +%s%N)
        local idempotency_key="tx-stress-${worker_id}-${i}-${ts}"
        
        # Enviar petición POST de transferencia de dinero
        local status
        status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TX_URL}" \
            -H "Content-Type: application/json" \
            -H "X-Idempotency-Key: ${idempotency_key}" \
            -d "{\"fromUserId\":${FROM_USER_ID},\"toUserId\":${TO_USER_ID},\"amount\":${AMOUNT},\"description\":\"Stress Test Transfer #${worker_id}-${i}\"}" \
            --max-time 10 || echo "000")

        echo "${status}" >> "${output_file}"
    done
}

echo -e "${YELLOW}[2/3] Disparando ráfaga masiva de ${TOTAL_REQUESTS} transferencias en ${WORKERS} hilos concurrentes...${NC}"

for ((w=1; w<=WORKERS; w++)); do
    run_tx_worker "$w" &
done

# Esperar a que terminen todos los hilos
wait

END_TIME=$(date +%s.%N)
TOTAL_SECONDS=$(awk "BEGIN {print ${END_TIME} - ${START_TIME}}")
if (( $(echo "${TOTAL_SECONDS} <= 0" | bc -l 2>/dev/null || echo 0) )); then TOTAL_SECONDS="0.001"; fi

# 5. Consolidación y Métricas de Resultados
echo -e "\n${YELLOW}[3/3] Consolidando telemetría y resultados de la prueba...${NC}"

CAT_LOGS=$(cat "${LOG_DIR}"/worker_*.log 2>/dev/null || true)
SUCCESS_200=$(echo "${CAT_LOGS}" | grep -cE '^(200|201)$' || true)
BAD_REQUEST_400=$(echo "${CAT_LOGS}" | grep -c '400' || true)
IDEMPOTENT_409=$(echo "${CAT_LOGS}" | grep -cE '^(409|429)$' || true)
SERVER_ERR_5XX=$(echo "${CAT_LOGS}" | grep -cE '^5[0-9]{2}$' || true)
TIMEOUT_000=$(echo "${CAT_LOGS}" | grep -c '000' || true)

RPS=$(awk "BEGIN {printf \"%.2f\", ${TOTAL_REQUESTS} / ${TOTAL_SECONDS}}")

echo -e "\n${CYAN}============================================================${NC}"
echo -e "${CYAN} RESULTADOS DE LA PRUEBA DE ESTRÉS DE TRANSACCIONES${NC}"
echo -e "${CYAN}============================================================${NC}"
echo -e "  -> Total Solicitudes     : ${TOTAL_REQUESTS}"
echo -e "  -> Exitosas (200/201 OK) : ${GREEN}${SUCCESS_200}${NC}"
echo -e "  -> Saldo Insuficiente/400: ${YELLOW}${BAD_REQUEST_400}${NC}"
echo -e "  -> Idempotencia / 409    : ${BLUE}${IDEMPOTENT_409}${NC}"
echo -e "  -> Errores 5xx Servidor  : ${RED}${SERVER_ERR_5XX}${NC}"
echo -e "  -> Timeouts / Caídas (00): ${RED}${TIMEOUT_000}${NC}"
echo -e "  -> Tiempo Total          : ${TOTAL_SECONDS} segundos"
echo -e "  -> Throughput Procesado  : ${GREEN}${RPS} Transacciones/seg (TPS)${NC}"
echo -e "${CYAN}============================================================${NC}"

if [ "${SERVER_ERR_5XX}" -eq 0 ] && [ "${TIMEOUT_000}" -eq 0 ]; then
    echo -e "${GREEN} ESTADO: ¡PRUEBA EXITOSA! El servicio de transacciones procesó la carga sin caídas.${NC}\n"
    exit 0
else
    echo -e "${YELLOW} ESTADO: La prueba finalizó con errores 5xx o timeouts. Revisa métricas en SigNoz o logs de pods.${NC}\n"
    exit 0
fi
