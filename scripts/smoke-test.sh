#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE HUMO (SMOKE TEST) - BASH
# Verificación rápida de la infraestructura K8s y salud de los 5 microservicios
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}         PRUEBA DE HUMO (SMOKE TEST) - FINTECH WALLET       ${NC}"
echo -e "${CYAN}============================================================${NC}\n"

# 1. Pods en Kubernetes
echo -e "${YELLOW}[1/4] Verificando Pods en el namespace 'fintech'...${NC}"
FAILED_PODS=$(kubectl get pods -n fintech --no-headers 2>/dev/null | grep -vE "Running|Completed" || true)

if [ -n "${FAILED_PODS}" ]; then
    echo -e "  ${RED}[WARN] Existen pods con estado no saludable:${NC}"
    echo "${FAILED_PODS}" | while read -r line; do
        echo -e "         ${RED}${line}${NC}"
    done
else
    echo -e "  ${GREEN}[OK] Todos los pods en 'fintech' estan en Running / Completed!${NC}"
fi
echo ""

# 2. Rutas Ingress y Traefik API Gateway
echo -e "${YELLOW}[2/4] Verificando endpoints de salud a traves de Traefik API Gateway...${NC}"

declare -A ENDPOINTS=(
    ["Frontend React Web"]="http://localhost/"
    ["Auth Service Health"]="http://localhost/auth/health"
    ["User Service Health"]="http://localhost/users/health"
    ["Transaction Service Health"]="http://localhost/transactions/health"
    ["Notification Service Health"]="http://localhost/notifications/health"
    ["Worker Service Health"]="http://localhost/worker/health"
    ["Maildev UI (Traefik Ingress)"]="http://localhost/maildev/"
)

NAMES=(
    "Frontend React Web"
    "Auth Service Health"
    "User Service Health"
    "Transaction Service Health"
    "Notification Service Health"
    "Worker Service Health"
    "Maildev UI (Traefik Ingress)"
)

for NAME in "${NAMES[@]}"; do
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
    "http://localhost/auth/docs/"
    "http://localhost/users/docs/"
    "http://localhost/transactions/docs/"
    "http://localhost/notifications/docs/"
    "http://localhost/worker/docs/"
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
echo -e "${YELLOW}[4/4] Verificando conectividad de PostgreSQL y Redis...${NC}"
PG_CHECK=$(kubectl exec -n fintech postgres-core-0 -- pg_isready -U postgres -d transactiondb 2>/dev/null || echo "failed")
if echo "${PG_CHECK}" | grep -q "accepting connections"; then
    echo -e "  ${GREEN}[OK] postgres-core-0 respondiendo y aceptando conexiones!${NC}"
else
    echo -e "  ${RED}[FAIL] Error conectando a PostgreSQL: ${PG_CHECK}${NC}"
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
