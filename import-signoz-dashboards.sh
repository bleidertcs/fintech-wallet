#!/usr/bin/env bash
# ==============================================================================
# IMPORT-SIGNOZ-DASHBOARDS.SH - IMPORTADOR DE DASHBOARDS EN SIGNOZ (V2 API / REAL METRICS)
# ==============================================================================

SIGNOZ_URL="${1:-http://localhost:30301}"
API_KEY="${2:-u/qUnbL4dpx5rOobkLjAUidg9NWRddEpVZsIOUCCc9g=}"

SIGNOZ_URL="${SIGNOZ_URL%/}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARDS_DIR="${SCRIPT_DIR}/k8s/dashboards"

echo -e "\033[0;36m==========================================================\033[0m"
echo -e "\033[0;36m  SigNoz Dashboards Importer (v2 API) - FinTech Wallet\033[0m"
echo -e "\033[0;36m  Endpoint: ${SIGNOZ_URL}/api/v2/dashboards\033[0m"
echo -e "\033[0;36m==========================================================\033[0m"

if [ -f "${SCRIPT_DIR}/scripts/build_and_upload_all_dashboards.py" ]; then
    python3 "${SCRIPT_DIR}/scripts/build_and_upload_all_dashboards.py"
    exit 0
fi

SUCCESS_COUNT=0
TOTAL_COUNT=0

FILES=("$DASHBOARDS_DIR"/*-signoz-*.v6.json)
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        TOTAL_COUNT=$((TOTAL_COUNT + 1))
        echo -e "\n\033[0;33m[+] Enviando dashboard v6: ${filename}...\033[0m"

        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${SIGNOZ_URL}/api/v2/dashboards" \
            -H "Content-Type: application/json" \
            -H "SIGNOZ-API-KEY: ${API_KEY}" \
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
echo -e "\033[0;32m [OK] Importación finalizada: ${SUCCESS_COUNT}/${TOTAL_COUNT} dashboards procesados.\033[0m"
echo -e "\033[0;36m Accede a la UI de SigNoz en: ${SIGNOZ_URL}\033[0m"
echo -e "\033[0;36m==========================================================\033[0m"
