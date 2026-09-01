#!/usr/bin/env bash
# ==============================================================================
# DEPLOY-HELM.SH - DESPLIEGUE DEL ECOSISTEMA FINTECH WALLET CON HELM (BASH)
# ==============================================================================
set -euo pipefail

RELEASE_NAME="${1:-fintech}"
NAMESPACE="${2:-fintech}"
VALUES_FILE="${3:-k8s/helm/fintech-wallet/values.yaml}"

echo -e "\033[0;36m======================================================================\033[0m"
echo -e "\033[0;36m Desplegando FinTech Wallet mediante Helm Release: '${RELEASE_NAME}'...\033[0m"
echo -e "\033[0;36m======================================================================\033[0m"

# 1. Verificar Ingress Controller Traefik
echo -e "\033[0;33mVerificando Ingress Controller Traefik...\033[0m"
helm upgrade --install traefik traefik/traefik --namespace kube-system --skip-crds \
  --set "ports.web.port=80" --set "ports.web.hostPort=80" \
  --set "ports.websecure.port=443" --set "ports.websecure.hostPort=443" \
  --set "ports.signoz.port=3301" --set "ports.signoz.hostPort=3301" --set "ports.signoz.expose.default=true" \
  --set "ports.maildev.port=1080" --set "ports.maildev.hostPort=1080" --set "ports.maildev.expose.default=true" \
  --set "ingressClass.enabled=true" --set "ingressClass.isDefaultClass=true" > /dev/null

# 2. Validar Chart
echo -e "\033[0;33mValidando Chart 'k8s/helm/fintech-wallet'...\033[0m"
helm lint k8s/helm/fintech-wallet

# 3. Desplegar Release
echo -e "\033[0;33mInstalando / Actualizando release '${RELEASE_NAME}' en namespace '${NAMESPACE}'...\033[0m"
helm upgrade --install "${RELEASE_NAME}" ./k8s/helm/fintech-wallet \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  --values "${VALUES_FILE}"

echo -e "\033[0;32m======================================================================\033[0m"
echo -e "\033[0;32m Despliegue con Helm completado exitosamente.\033[0m"
echo -e "\033[0;32m======================================================================\033[0m"
