#!/usr/bin/env bash
# Script para Importar Automáticamente los Dashboards de SigNoz (FinTech Wallet)

SIGNOZ_URL="${1:-http://localhost:3301}"
API_KEY="${2:-9rfBH23dydV7Ym8yomvY68zoxf6VWiLZIT1BO/8J3j8=}"
DASHBOARDS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k8s/dashboards"

echo -e "\033[0;36m==========================================================\033[0m"
echo -e "\033[0;36m SigNoz Dashboards Importer - FinTech Wallet System\033[0m"
echo -e "\033[0;36m SigNoz API Endpoint: ${SIGNOZ_URL}\033[0m"
echo -e "\033[0;36m==========================================================\033[0m"

if [ ! -d "$DASHBOARDS_DIR" ]; then
    echo -e "\033[0;31m[ERROR] No se encontró el directorio ${DASHBOARDS_DIR}\033[0m"
    exit 1
fi

for file in "$DASHBOARDS_DIR"/*.json; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo -e "\n\033[0;33m[+] Procesando dashboard: ${filename}...\033[0m"
        
        response=$(curl -s -w "\n%{http_code}" -X POST "${SIGNOZ_URL}/api/v1/dashboards" \
            -H "Content-Type: application/json" \
            -H "SIGNOZ-API-KEY: ${API_KEY}" \
            -d @"$file")
        
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
            echo -e "    \033[0;32m[OK] Dashboard '${filename}' importado exitosamente.\033[0m"
        else
            echo -e "    \033[0;37m[!] Código HTTP ${http_code} al enviar ${filename}. Archivo listo en k8s/dashboards/${filename}\033[0m"
        fi
    fi
done

echo -e "\n\033[0;36m==========================================================\033[0m"
echo -e "\033[0;36m Importación finalizada. Accede a SigNoz en: ${SIGNOZ_URL}\033[0m"
echo -e "\033[0;36m==========================================================\033[0m"
