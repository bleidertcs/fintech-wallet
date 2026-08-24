#!/usr/bin/env bash
# ==============================================================================
# IMPORT-SIGNOZ-DASHBOARDS.SH - IMPORTADOR DE DASHBOARDS EN SIGNOZ
# ==============================================================================
# Uso:
#   ./import-signoz-dashboards.sh [SIGNOZ_URL] [API_KEY]
#
# Ejemplos:
#   ./import-signoz-dashboards.sh http://localhost:30301
#   ./import-signoz-dashboards.sh http://10.20.0.6:30301 "9rfBH23dydV7Ym8yomvY68zoxf6VWiLZIT1BO/8J3j8="
# ==============================================================================

SIGNOZ_URL="${1:-http://localhost:30301}"
API_KEY="${2:-9rfBH23dydV7Ym8yomvY68zoxf6VWiLZIT1BO/8J3j8=}"

# Normalizar URL eliminando barra final
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

# Verificar conectividad con SigNoz
echo -e "\n\033[0;33m[*] Verificando conexión con SigNoz...\033[0m"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${SIGNOZ_URL}/api/v1/healthz" || true)

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "    \033[0;32m[OK] SigNoz responde correctamente en ${SIGNOZ_URL}\033[0m"
else
    echo -e "    \033[0;33m[!] Advertencia: Health check devolvió status HTTP ${HTTP_STATUS} (o timeout). Intentando importar de todos modos...\033[0m"
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
        
        HEADER_ARGS=(-H "Content-Type: application/json")
        if [ -n "$API_KEY" ]; then
            HEADER_ARGS+=(-H "SIGNOZ-API-KEY: ${API_KEY}")
        fi

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
