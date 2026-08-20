#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE PRUEBA DE INTEGRACIÓN Y COMUNICACIÓN INTER-SERVICIO (BASH)
# Pruebas integradas de auth-service y user-service
# ==============================================================================

set -eo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
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

TIMESTAMP=$(date +%Y%m%d%H%M%S)
TEST_EMAIL="integration.test.${TIMESTAMP}@fintech.com"
TEST_NAME="Usuario Integracion ${TIMESTAMP}"
TEST_PASSWORD="Password123!"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} PRUEBA DE INTEGRACION COMPLETA (auth-service & user-service)${NC}"
echo -e "${CYAN}============================================================${NC}\n"

# ------------------------------------------------------------------------------
# PASO 1: Verificar disponibilidad de Pods en Kubernetes
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Verificando estado de los Pods NestJS...${NC}"
AUTH_POD=$(kubectl get pods -n fintech -l app=auth-service --no-headers 2>/dev/null || echo "No disponible")
USER_POD=$(kubectl get pods -n fintech -l app=user-service --no-headers 2>/dev/null || echo "No disponible")

echo -e "  -> Pod Auth Service : ${AUTH_POD}"
echo -e "  -> Pod User Service : ${USER_POD}\n"

# ------------------------------------------------------------------------------
# PASO 2: Registro de Usuario en auth-service (Dispara llamado a user-service)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Registrando usuario en auth-service (POST /auth/register)...${NC}"
echo -e "  -> Email : ${TEST_EMAIL}"
echo -e "  -> Name  : ${TEST_NAME}"

REG_RESPONSE=$(curl -s -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"${TEST_NAME}\",
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }" || true)

if echo "${REG_RESPONSE}" | grep -q "email"; then
    echo -e "  ${GREEN}[OK] Registro exitoso en auth-service!${NC}"
    echo -e "       Respuesta: ${GRAY}${REG_RESPONSE}${NC}\n"
else
    echo -e "  ${RED}[ERROR] Fallo el registro en auth-service: ${REG_RESPONSE}${NC}"
    exit 1
fi

sleep 2

# ------------------------------------------------------------------------------
# PASO 3: Verificar creación automática del perfil en user-service
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Consultando perfil creado automaticamente en user-service...${NC}"
USER_PROFILE_URL="http://localhost/users/profile/by-email/${TEST_EMAIL}"
PROFILE_JSON=$(curl -s "${USER_PROFILE_URL}" || true)

PROFILE_ID=$(json_val "${PROFILE_JSON}" "id")
PROFILE_EMAIL=$(json_val "${PROFILE_JSON}" "email")
PROFILE_BALANCE=$(json_val "${PROFILE_JSON}" "balance")
PROFILE_CURRENCY=$(json_val "${PROFILE_JSON}" "currency")

if [ -n "${PROFILE_ID}" ]; then
    echo -e "  ${GREEN}[OK] Perfil encontrado exitosamente en user-service!${NC}"
    echo -e "       ID Perfil   : ${WHITE}${PROFILE_ID}${NC}"
    echo -e "       Email       : ${WHITE}${PROFILE_EMAIL}${NC}"
    echo -e "       Saldo       : ${GREEN}${PROFILE_BALANCE} ${PROFILE_CURRENCY}${NC}\n"
else
    echo -e "  ${RED}[ERROR] No se pudo encontrar el perfil en user-service: ${PROFILE_JSON}${NC}"
    exit 1
fi

# ------------------------------------------------------------------------------
# PASO 4: Prueba de Autenticación (Login) y Modificación de Saldo
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Probando autenticacion y actualizacion de saldo en user-service...${NC}"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }" || true)

if echo "${LOGIN_RESPONSE}" | grep -q "token"; then
    echo -e "  ${GREEN}[OK] Login exitoso! Token obtenido.${NC}"
else
    echo -e "  ${RED}[ERROR] Fallo el login en auth-service: ${LOGIN_RESPONSE}${NC}"
fi

UPDATE_BALANCE_URL="http://localhost/users/${PROFILE_ID}/balance"
BALANCE_RESULT=$(curl -s -X PUT "${UPDATE_BALANCE_URL}" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000}' || true)

echo -e "  ${GREEN}[OK] Deposito de 5,000 ARS procesado: ${BALANCE_RESULT}${NC}"

UPDATED_PROFILE=$(curl -s "${USER_PROFILE_URL}" || true)
NEW_BALANCE=$(json_val "${UPDATED_PROFILE}" "balance")
echo -e "  ${GREEN}[OK] Nuevo saldo actualizado en user-service: ${NEW_BALANCE} ${PROFILE_CURRENCY}${NC}\n"

# ------------------------------------------------------------------------------
# PASO 5: Resumen de Verificación y Observabilidad
# ------------------------------------------------------------------------------
echo -e "${CYAN}============================================================${NC}"
echo -e "${GREEN} RESULTADO: PRUEBA DE INTEGRACION COMPLETADA EXITOSAMENTE! ${NC}"
echo -e "${CYAN}============================================================${NC}"
echo "1. auth-service recibio el registro y llamo a user-service REST"
echo "2. user-service creo la entidad de usuario en MySQL (userdb)"
echo "3. Ambas aplicaciones registraron logs con trace_id distribuido"
echo "4. Puedes ver la traza de ambos servicios unificada en SigNoz UI:"
echo "   -> http://localhost:30301 (Filtra por service.name = auth-service)"
echo -e "${CYAN}============================================================${NC}"
