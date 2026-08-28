#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE COMPILACIÓN Y PUBLICACIÓN EN DOCKER HUB (FINTECH WALLET)
# Compila los 6 microservicios/frontend y los sube a Docker Hub: bleiderc/fintech-wallet:<servicio>-1.0.0
#
# Uso:
#   ./scripts/push-images.sh [DOCKER_HUB_USER]
# Ejemplo:
#   ./scripts/push-images.sh bleiderc
# ==============================================================================

set -euo pipefail

LOG_FILE="push-images.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

HUB_USER="${1:-${DOCKER_HUB_USER:-bleiderc}}"
REPO_NAME="${HUB_USER}/fintech-wallet"

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN} FINTECH WALLET - BUILD & PUSH A DOCKER HUB${NC}"
echo -e "${CYAN} Usuario Docker Hub : ${HUB_USER}${NC}"
echo -e "${CYAN} Repositorio Destino: ${REPO_NAME}:<tag>${NC}"
echo -e "${CYAN}============================================================${NC}\n"

# Determinar herramienta de contenedores
if command -v podman &>/dev/null; then
    CONTAINER_ENGINE="podman"
elif command -v docker &>/dev/null; then
    CONTAINER_ENGINE="docker"
else
    echo -e "${RED}ERROR CRÍTICO: No se encontró Podman ni Docker en el sistema.${NC}"
    exit 1
fi
echo -e "${GREEN}[INFO] Motor de contenedores detectado: ${CONTAINER_ENGINE}${NC}\n"

SERVICES=(
    "frontend|./frontend|./frontend/Containerfile"
    "auth-service|./backend-nestjs/auth-service|./backend-nestjs/auth-service/Containerfile"
    "user-service|./backend-nestjs/user-service|./backend-nestjs/user-service/Containerfile"
    "transaction-service|./backend-nestjs/transaction-service|./backend-nestjs/transaction-service/Containerfile"
    "notification-service|./backend-nestjs/notification-service|./backend-nestjs/notification-service/Containerfile"
    "worker-service|./backend-nestjs/worker-service|./backend-nestjs/worker-service/Containerfile"
)

START_TIME=$(date +%s)

for item in "${SERVICES[@]}"; do
    IFS="|" read -r name path cfile <<< "${item}"
    tag="${REPO_NAME}:${name}-1.0.0"
    
    echo -e "${YELLOW}------------------------------------------------------------${NC}"
    echo -e "${YELLOW}==> [1/2] Compilando imagen: ${tag}...${NC}"
    echo -e "${YELLOW}------------------------------------------------------------${NC}"
    ${CONTAINER_ENGINE} build -f "${cfile}" -t "${tag}" -t "docker.io/${tag}" "${path}"
    
    echo -e "\n${CYAN}==> [2/2] Subiendo imagen a Docker Hub: ${tag}...${NC}"
    ${CONTAINER_ENGINE} push "${tag}"
    echo -e "${GREEN}✓ ${tag} publicado exitosamente.${NC}\n"
done

# Limpieza preventiva de capas intermedias
${CONTAINER_ENGINE} image prune -f || true

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} ¡TODAS LAS IMÁGENES FUERON PUBLICADAS EXITOSAMENTE!${NC}"
echo -e "${GREEN} Tiempo total: ${DURATION} segundos${NC}"
echo -e "${GREEN} Repositorio: https://hub.docker.com/r/${HUB_USER}/fintech-wallet/tags${NC}"
echo -e "${GREEN}============================================================${NC}"
