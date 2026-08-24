#!/usr/bin/env bash
# ==============================================================================
# IMPORT-SIGNOZ-DASHBOARDS.SH - IMPORTADOR DE DASHBOARDS EN SIGNOZ
# ==============================================================================
# Métodos de autenticación soportados:
#   1. Por API Key generada en SigNoz UI (Settings -> API Keys):
#      ./import-signoz-dashboards.sh http://localhost:30301 "tu-api-key"
#
#   2. Por Credenciales de Login (Email y Password del administrador de SigNoz):
#      ./import-signoz-dashboards.sh http://localhost:30301 "" "admin@fintech.com" "password123"
#
#   3. Por defecto (intentará con la API Key configurada o sesión anónima):
#      ./import-signoz-dashboards.sh http://localhost:30301
# ==============================================================================

SIGNOZ_URL="${1:-http://localhost:30301}"
API_KEY="${2:-}"
USER_EMAIL="${3:-}"
USER_PASS="${4:-}"

SIGNOZ_URL="${SIGNOZ_URL%/}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "${SCRIPT_DIR}/k8s/dashboards" ]; then
    DASHBOARDS_DIR="${SCRIPT_DIR}/k8s/dashboards"
elif [ -d "${SCRIPT_DIR}/observability/dashboards" ]; then
    DASHBOARDS_DIR="${SCRIPT_DIR}/observability/dashboards"
else
    echo -e "\033[0;31m[ERROR] No se encontró el directorio de dashboards (k8s/dashboards o observability/dashboards)\033[0m"
    exit 1
fi

echo -e "\033[0;36m==========================================================\033[0m"
echo -e "\033[0;36m  SigNoz Dashboards Importer - FinTech Wallet System\033[0m"
echo -e "\033[0;36m  Endpoint: ${SIGNOZ_URL}/api/v1/dashboards\033[0m"
echo -e "\033[0;36m  Directorio: ${DASHBOARDS_DIR}\033[0m"
echo -e "\033[0;36m==========================================================\033[0m"

# Si se proporcionó email y password, autenticarse para obtener el token JWT
AUTH_TOKEN=""
if [ -n "$USER_EMAIL" ] && [ -n "$USER_PASS" ]; then
    echo -e "\n\033[0;33m[*] Autenticando con usuario ${USER_EMAIL} en SigNoz...\033[0m"
    LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' "$USER_EMAIL" "$USER_PASS")
    LOGIN_RESP=$(curl -s -X POST "${SIGNOZ_URL}/api/v1/login" \
        -H "Content-Type: application/json" \
        -d "$LOGIN_PAYLOAD" || true)
    
    # Extraer accessJwt de la respuesta JSON
    AUTH_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"accessJwt":"[^"]*' | cut -d'"' -f4)
    if [ -z "$AUTH_TOKEN" ]; then
        AUTH_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"jwt":"[^"]*' | cut -d'"' -f4)
    fi

    if [ -n "$AUTH_TOKEN" ]; then
        echo -e "    \033[0;32m[OK] Autenticación exitosa. Token JWT obtenido.\033[0m"
    else
        echo -e "    \033[0;31m[!] Error al autenticar en SigNoz: ${LOGIN_RESP}\033[0m"
    fi
fi

# Configurar headers de autenticación
HEADER_ARGS=(-H "Content-Type: application/json")
if [ -n "$AUTH_TOKEN" ]; then
    HEADER_ARGS+=(-H "Authorization: Bearer ${AUTH_TOKEN}")
elif [ -n "$API_KEY" ]; then
    HEADER_ARGS+=(-H "SIGNOZ-API-KEY: ${API_KEY}")
fi

SUCCESS_COUNT=0
TOTAL_COUNT=0

FILES=("$DASHBOARDS_DIR"/0[1-6]-signoz-*.json)
if [ ! -e "${FILES[0]}" ]; then
    FILES=("$DASHBOARDS_DIR"/*.json)
fi

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        TOTAL_COUNT=$((TOTAL_COUNT + 1))
        echo -e "\n\033[0;33m[+] Procesando dashboard: ${filename}...\033[0m"

        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SIGNOZ_URL}/api/v1/dashboards" \
            "${HEADER_ARGS[@]}" \
            -d @"$file")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
        BODY=$(echo "$RESPONSE" | sed '$d')
        
        if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
            echo -e "    \033[0;32m[OK] Dashboard '${filename}' importado exitosamente (HTTP ${HTTP_CODE}).\033[0m"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            echo -e "    \033[0;31m[!] Código HTTP ${HTTP_CODE} al enviar ${filename}.\033[0m"
            echo -e "    \033[0;37m    Respuesta: ${BODY}\033[0m"
        fi
    fi
done

echo -e "\n\033[0;36m==========================================================\033[0m"
echo -e "\033[0;32m [OK] Importación finalizada: ${SUCCESS_COUNT}/${TOTAL_COUNT} dashboards importados.\033[0m"
echo -e "\033[0;36m Accede a la UI de SigNoz en: ${SIGNOZ_URL}\033[0m"
echo -e "\033[0;36m==========================================================\033[0m"
