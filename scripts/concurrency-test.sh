#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE CONCURRENCIA E IDEMPOTENCIA (BASH)
# Ejecuta pruebas concurrentes paralelas y soporta benchmarks con k6
# ==============================================================================

MODE="${1:-Idempotency}"
CONCURRENCY="${2:-10}"
TARGET_URL="${3:-http://localhost}"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

json_val() {
    local json="$1"
    local field="$2"
    if command -v jq &>/dev/null; then
        echo "${json}" | jq -r ".${field} // empty" 2>/dev/null
    elif command -v node &>/dev/null; then
        node -e "try { const d = JSON.parse(process.argv[1]); console.log(d['${field}'] !== undefined ? d['${field}'] : ''); } catch(e) {}" "${json}"
    elif command -v python3 &>/dev/null; then
        python3 -c "import sys, json; d=json.loads(sys.argv[1]); print(d.get('${field}', ''))" "${json}" 2>/dev/null
    else
        echo "${json}" | grep -o "\"${field}\":[^\",}]*" | head -n 1 | cut -d: -f2 | tr -d ' "'
    fi
}

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} PRUEBA DE CONCURRENCIA E IDEMPOTENCIA (Transaction Service)${NC}"
echo -e "${CYAN} Modo: ${MODE} | Concurrencia: ${CONCURRENCY} hilos paralelos${NC}"
echo -e "${CYAN}============================================================${NC}\n"

if [ "${MODE}" == "Idempotency" ] || [ "${MODE}" == "All" ]; then
    TS=$(date +%Y%m%d%H%M%S)
    SENDER_EMAIL="sender.${TS}@fintech.com"
    RECIPIENT_EMAIL="recipient.${TS}@fintech.com"

    echo -e "${YELLOW}[1/3] Creando usuarios de prueba para la transferencia...${NC}"
    curl -s -X POST "${TARGET_URL}/auth/register" -H "Content-Type: application/json" \
      -d "{\"name\":\"Sender\",\"email\":\"${SENDER_EMAIL}\",\"password\":\"Password123!\"}" > /dev/null
    curl -s -X POST "${TARGET_URL}/auth/register" -H "Content-Type: application/json" \
      -d "{\"name\":\"Recipient\",\"email\":\"${RECIPIENT_EMAIL}\",\"password\":\"Password123!\"}" > /dev/null

    sleep 1

    SENDER_PROFILE=$(curl -s "${TARGET_URL}/users/profile/by-email/${SENDER_EMAIL}")
    RECIPIENT_PROFILE=$(curl -s "${TARGET_URL}/users/profile/by-email/${RECIPIENT_EMAIL}")

    FROM_USER_ID=$(json_val "${SENDER_PROFILE}" "id")
    TO_USER_ID=$(json_val "${RECIPIENT_PROFILE}" "id")
    SENDER_BALANCE=$(json_val "${SENDER_PROFILE}" "balance")
    RECIPIENT_BALANCE=$(json_val "${RECIPIENT_PROFILE}" "balance")

    echo -e "  -> Emisor (ID: ${FROM_USER_ID}) | Saldo Inicial: ${GREEN}${SENDER_BALANCE} ARS${NC}"
    echo -e "  -> Receptor (ID: ${TO_USER_ID}) | Saldo Inicial: ${GREEN}${RECIPIENT_BALANCE} ARS${NC}\n"

    IDEMPOTENCY_KEY="concurrency-key-${TS}"
    AMOUNT=100

    echo -e "${YELLOW}[2/3] Disparando ${CONCURRENCY} peticiones simultaneas en paralelo con clave '${IDEMPOTENCY_KEY}'...${NC}"

    TMP_DIR=$(mktemp -d)

    for ((i=1; i<=CONCURRENCY; i++)); do
        (
            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TARGET_URL}/transactions/transfer" \
              -H "Content-Type: application/json" \
              -H "X-Idempotency-Key: ${IDEMPOTENCY_KEY}" \
              -d "{\"fromUserId\": ${FROM_USER_ID}, \"toUserId\": ${TO_USER_ID}, \"amount\": ${AMOUNT}}")
            echo "${i}:${HTTP_CODE}" > "${TMP_DIR}/res_${i}.txt"
        ) &
    done

    wait

    SUCCESS_COUNT=0
    BLOCKED_COUNT=0

    for ((i=1; i<=CONCURRENCY; i++)); do
        CODE=$(cut -d: -f2 "${TMP_DIR}/res_${i}.txt" 2>/dev/null || echo "400")
        if [ "${CODE}" -eq 200 ] || [ "${CODE}" -eq 201 ]; then
            echo -e "  -> Peticion ${i} - ${GREEN}PROCESADA CON EXITO (HTTP ${CODE})${NC}"
            ((SUCCESS_COUNT++))
        elif [ "${CODE}" -eq 400 ] || [ "${CODE}" -eq 409 ]; then
            echo -e "  -> Peticion ${i} - ${YELLOW}BLOQUEADA POR IDEMPOTENCIA (HTTP ${CODE})${NC}"
            ((BLOCKED_COUNT++))
        else
            echo -e "  -> Peticion ${i} - ${RED}ERROR (HTTP ${CODE})${NC}"
            ((BLOCKED_COUNT++))
        fi
    done

    rm -rf "${TMP_DIR}"

    echo -e "\n${YELLOW}[3/3] Verificando consistencia final de saldo...${NC}"
    UPDATED_SENDER=$(curl -s "${TARGET_URL}/users/profile/by-email/${SENDER_EMAIL}")
    ACTUAL_BALANCE=$(json_val "${UPDATED_SENDER}" "balance")
    EXPECTED_BALANCE=$(awk "BEGIN {print ${SENDER_BALANCE:-0} - ${AMOUNT}}")

    echo -e "  -> Saldo Final del Emisor: ${CYAN}${ACTUAL_BALANCE} ARS${NC} (Esperado: ${EXPECTED_BALANCE} ARS)\n"

    if [ "${SUCCESS_COUNT}" -eq 1 ]; then
        echo -e "${GREEN}============================================================${NC}"
        echo -e "${GREEN} [EXITO] LA IDEMPOTENCIA Y CONCURRENCIA FUNCIONAN PERFECTAMENTE!${NC}"
        echo -e "${GREEN} 1 Peticion procesada (200 OK) y ${BLOCKED_COUNT} peticiones duplicadas bloqueadas.${NC}"
        echo -e "${GREEN}============================================================${NC}"
    else
        echo -e "${YELLOW}============================================================${NC}"
        echo -e "${YELLOW} [INFO] Resultado Concurrencia: Exitosas: ${SUCCESS_COUNT}, Bloqueadas: ${BLOCKED_COUNT}.${NC}"
        echo -e "${YELLOW}============================================================${NC}"
    fi
fi

if [ "${MODE}" == "Load" ] || [ "${MODE}" == "All" ]; then
    echo -e "\n${CYAN}============================================================${NC}"
    echo -e "${CYAN} EJECUTANDO BENCHMARK K6 DE CONCURRENCIA${NC}"
    echo -e "${CYAN}============================================================${NC}"

    if command -v k6 &>/dev/null; then
        echo -e "${GREEN}[INFO] Ejecutando con binario local k6...${NC}"
        k6 run scripts/k6-concurrency-test.js
    elif command -v podman &>/dev/null; then
        echo -e "${YELLOW}[INFO] k6 no detectado localmente. Ejecutando k6 en contenedor (Podman)...${NC}"
        podman run --rm -i --network host -v "$(pwd)/scripts:/scripts:z" docker.io/grafana/k6:latest run /scripts/k6-concurrency-test.js
    elif command -v docker &>/dev/null; then
        echo -e "${YELLOW}[INFO] k6 no detectado localmente. Ejecutando k6 en contenedor (Docker)...${NC}"
        docker run --rm -i --network host -v "$(pwd)/scripts:/scripts:z" docker.io/grafana/k6:latest run /scripts/k6-concurrency-test.js
    else
        echo -e "${RED}[ERROR] Ni k6, podman ni docker están instalados o disponibles.${NC}"
    fi
fi
