#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE HUMO (SMOKE TEST) - FINTECH WALLET (BASH)
# ==============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BASE_HOST="${1:-auto}"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}         PRUEBA DE HUMO (SMOKE TEST) - FINTECH WALLET       ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo ""

if [ "${BASE_HOST}" = "auto" ]; then
    if curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost/" > /dev/null 2>&1; then
        BASE_HOST="localhost"
    else
        WSL_IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "localhost")
        BASE_HOST="${WSL_IP}"
    fi
fi

echo -e "${CYAN}Host objetivo de pruebas: http://${BASE_HOST}${NC}\n"

# 1. Pods en Kubernetes
echo -e "${YELLOW}[1/4] Verificando Pods en el namespace 'fintech'...${NC}"
FAILED_PODS=$(kubectl get pods -n fintech --no-headers 2>/dev/null | grep -v "Running" | grep -v "Completed" || true)

if [ -n "${FAILED_PODS}" ]; then
    echo -e "  ${RED}[WARN] Existen pods con estado no saludable:${NC}"
    echo "${FAILED_PODS}" | while read -r line; do
        echo -e "         ${RED}${line}${NC}"
    done
else
    echo -e "  ${GREEN}[OK] Todos los pods en 'fintech' están en Running / Completed!${NC}"
fi
echo ""

# 2. Rutas Ingress y Traefik API Gateway
echo -e "${YELLOW}[2/4] Verificando endpoints de salud a través de Traefik API Gateway...${NC}"

declare -A ENDPOINTS=(
    ["Frontend React Web"]="http://${BASE_HOST}/"
    ["Auth Service Health"]="http://${BASE_HOST}/auth/health"
    ["User Service Health"]="http://${BASE_HOST}/users/health"
    ["Transaction Service Health"]="http://${BASE_HOST}/transactions/health"
    ["Notification Service Health"]="http://${BASE_HOST}/notifications/health"
    ["Worker Service Health"]="http://${BASE_HOST}/worker/health"
    ["Maildev UI (Traefik Ingress)"]="http://${BASE_HOST}/maildev/"
    ["SigNoz APM Dashboard"]="http://${BASE_HOST}:3301/"
)

for NAME in "Frontend React Web" "Auth Service Health" "User Service Health" "Transaction Service Health" "Notification Service Health" "Worker Service Health" "Maildev UI (Traefik Ingress)" "SigNoz APM Dashboard"; do
    URL="${ENDPOINTS[$NAME]}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${URL}" || echo "000")
    if [ "${STATUS}" -eq 200 ]; then
        echo -e "  ${GREEN}[OK] ${NAME} -> ${URL} (HTTP 200)${NC}"
    else
        echo -e "  ${RED}[FAIL] ${NAME} -> ${URL} (HTTP ${STATUS})${NC}"
    fi
done
echo ""

# 3. Documentación Swagger UI
echo -e "${YELLOW}[3/4] Verificando Swagger UI de los 5 Microservicios...${NC}"
SWAGGERS=(
    "http://${BASE_HOST}/auth/docs/"
    "http://${BASE_HOST}/users/docs/"
    "http://${BASE_HOST}/transactions/docs/"
    "http://${BASE_HOST}/notifications/docs/"
    "http://${BASE_HOST}/worker/docs/"
)

for SW in "${SWAGGERS[@]}"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${SW}" || echo "000")
    if [ "${STATUS}" -eq 200 ]; then
        echo -e "  ${GREEN}[OK] Swagger en ${SW} (HTTP 200)${NC}"
    else
        echo -e "  ${RED}[FAIL] Swagger en ${SW} (HTTP ${STATUS})${NC}"
    fi
done
echo ""

# 4. Bases de Datos e Infraestructura
echo -e "${YELLOW}[4/4] Verificando conectividad de PostgreSQL, PgBouncer y Redis...${NC}"
PG_CHECK=$(kubectl exec -n fintech postgres-core-0 -c postgres -- pg_isready -U postgres -d transactiondb 2>/dev/null || echo "failed")
if echo "${PG_CHECK}" | grep -q "accepting connections"; then
    echo -e "  ${GREEN}[OK] postgres-core-0 respondiendo y aceptando conexiones!${NC}"
else
    echo -e "  ${RED}[FAIL] Error conectando a PostgreSQL: ${PG_CHECK}${NC}"
fi

if kubectl exec -n fintech deploy/pgbouncer-core -c pgbouncer -- nc -z 127.0.0.1 6432 2>/dev/null; then
    echo -e "  ${GREEN}[OK] pgbouncer-core activo y escuchando en puerto 6432!${NC}"
else
    echo -e "  ${RED}[FAIL] Error verificando PgBouncer${NC}"
fi

REDIS_PING=$(kubectl exec -n fintech redis-0 -- redis-cli ping 2>/dev/null || echo "failed")
if echo "${REDIS_PING}" | grep -q "PONG"; then
    echo -e "  ${GREEN}[OK] redis-0 respondiendo (PONG)!${NC}"
else
    echo -e "  ${RED}[FAIL] Error conectando a Redis: ${REDIS_PING}${NC}"
fi

echo ""
echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}                 PRUEBA DE HUMO FINALIZADA                  ${NC}"
echo -e "${CYAN}============================================================${NC}"
