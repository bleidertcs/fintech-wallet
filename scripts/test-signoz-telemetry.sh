#!/usr/bin/env bash
# ==============================================================================
# Script Bash de prueba automatizada de telemetria para SigNoz
# ==============================================================================

CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}  VERIFICACION DE TELEMETRIA Y OBSERVABILIDAD SIGNOZ (NestJS)  ${NC}"
echo -e "${CYAN}============================================================${NC}"

# 1. Estado de Pods
echo -e "${YELLOW}1. Estado de Pods auth-service:${NC}"
kubectl get pods -n fintech -l app=auth-service

# 2. Generar tráfico
echo -e "\n${YELLOW}2. Generando trafico sintetico...${NC}"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEST_EMAIL="signoz.test.${TIMESTAMP}@fintech.com"

echo -e "${GRAY}Enviando POST /auth/register con email: ${TEST_EMAIL}${NC}"

RESPONSE=$(curl -s -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"Password123!\"
  }" || true)

echo -e "${GREEN}Peticion POST procesada: ${RESPONSE}${NC}\n"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}PASOS DE VERIFICACION EN SIGNOZ UI (:30301):${NC}"
echo -e "${WHITE}1. Abre tu navegador en http://localhost:30301${NC}"
echo -e "${WHITE}2. TRAZAS: En SigNoz Traces, filtra por service.name = auth-service${NC}"
echo -e "${WHITE}3. LOGS: Abre el detalle de la traza para ver logs inyectados con trace_id${NC}"
echo -e "${WHITE}4. METRICAS: En Services > auth-service consulta Latencia P99, RPS y errores${NC}"
echo -e "${CYAN}============================================================${NC}"
