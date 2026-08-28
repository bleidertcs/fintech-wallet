#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Automatizado para FinTech Wallet con Podman y Kubernetes
# ==============================================================================
set -euo pipefail

LOG_FILE="deploy-k8s.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

RECREATE=false
NON_INTERACTIVE=false
CLUSTER_NAME=""
PUSH_IMAGES=false
HUB_USER="${DOCKER_HUB_USER:-bleiderc}"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --recreate|-r)
            RECREATE=true
            shift
            ;;
        --non-interactive|-y)
            NON_INTERACTIVE=true
            shift
            ;;
        --push|-p)
            PUSH_IMAGES=true
            shift
            ;;
        --hub-user|-u)
            HUB_USER="$2"
            shift 2
            ;;
        --cluster-name|-c)
            CLUSTER_NAME="$2"
            shift 2
            ;;
        *)
            echo "Opción desconocida: $1"
            exit 1
            ;;
    esac
done

log() {
    local color="${2:-37}"
    echo -e "\033[${color}m[$(date +'%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

log "======================================================================" "36"
log "Iniciando despliegue de FinTech Wallet con Podman y Kubernetes..." "36"
log "Registro de logs guardándose en: ${LOG_FILE}" "36"
log "======================================================================" "36"

# 1. Verificar Podman CLI
log "\n[1/5] Verificando motor de contenedores Podman..." "33"
if ! command -v podman &>/dev/null; then
    log "ERROR CRÍTICO: podman CLI no está instalado o no se encuentra en el PATH." "31"
    exit 1
fi

if ! podman info &>/dev/null; then
    log "ERROR CRÍTICO: Podman no responde. Asegúrate de que el servicio/máquina de Podman esté activo." "31"
    exit 1
fi
log "Conexión con Podman exitosa ($(podman --version))." "32"

# 2. Verificar Kubernetes
log "\n[2/5] Verificando conexión con el clúster de Kubernetes..." "33"
if ! command -v kubectl &>/dev/null; then
    log "ERROR CRÍTICO: kubectl no está instalado o no se encuentra en el PATH." "31"
    exit 1
fi

CURRENT_CTX=$(kubectl config current-context 2>/dev/null || true)
if [[ -z "${CURRENT_CTX}" ]]; then
    log "ERROR CRÍTICO: No se detectó un contexto activo de Kubernetes." "31"
    exit 1
fi

if ! kubectl cluster-info &>/dev/null; then
    log "ERROR CRÍTICO: No se pudo contactar al clúster Kubernetes en el contexto '${CURRENT_CTX}'." "31"
    exit 1
fi
log "Conexión con Kubernetes exitosa (Contexto: '${CURRENT_CTX}')." "32"

CLUSTER_TYPE="generic"
if [[ "${CURRENT_CTX}" =~ ^kind- ]]; then
    CLUSTER_TYPE="kind"
    if [[ -z "${CLUSTER_NAME}" ]]; then
        CLUSTER_NAME="${CURRENT_CTX#kind-}"
    fi
elif [[ "${CURRENT_CTX}" =~ minikube ]]; then
    CLUSTER_TYPE="minikube"
elif [[ "${CURRENT_CTX}" =~ k3s|rancher-desktop|podman ]]; then
    CLUSTER_TYPE="k3s"
fi
log "Tipo de clúster detectado: ${CLUSTER_TYPE} ${CLUSTER_NAME:+(Cluster: ${CLUSTER_NAME})}" "36"

if [[ "${RECREATE}" == false && "${NON_INTERACTIVE}" == false && -t 0 ]]; then
    read -rp "¿Deseas recrear completamente los Pods y Deployments desde cero? (s/N): " resp
    if [[ "${resp}" =~ ^[sSyY]$ ]]; then
        RECREATE=true
    fi
fi

if [[ "${RECREATE}" == true ]]; then
    log "\nEliminando namespace 'fintech' para recreación limpia..." "33"
    kubectl delete namespace fintech --ignore-not-found || true
    while kubectl get namespace fintech &>/dev/null; do
        sleep 2
    done
    sleep 2
fi

# 3. Construir imágenes con Podman
log "\n[3/5] Construyendo imágenes de contenedor con Podman..." "36"

declare -A SERVICES=(
    ["frontend"]="${HUB_USER}/fintech-wallet:frontend-1.0.0|./frontend|./frontend/Containerfile"
    ["auth-service"]="${HUB_USER}/fintech-wallet:auth-service-1.0.0|./backend-nestjs/auth-service|./backend-nestjs/auth-service/Containerfile"
    ["user-service"]="${HUB_USER}/fintech-wallet:user-service-1.0.0|./backend-nestjs/user-service|./backend-nestjs/user-service/Containerfile"
    ["transaction-service"]="${HUB_USER}/fintech-wallet:transaction-service-1.0.0|./backend-nestjs/transaction-service|./backend-nestjs/transaction-service/Containerfile"
    ["notification-service"]="${HUB_USER}/fintech-wallet:notification-service-1.0.0|./backend-nestjs/notification-service|./backend-nestjs/notification-service/Containerfile"
    ["worker-service"]="${HUB_USER}/fintech-wallet:worker-service-1.0.0|./backend-nestjs/worker-service|./backend-nestjs/worker-service/Containerfile"
)

for svc in frontend auth-service user-service transaction-service notification-service worker-service; do
    IFS="|" read -r img path cfile <<< "${SERVICES[$svc]}"
    log "  -> [Podman Build] ${svc} (${img})..." "33"
    podman build -f "${cfile}" -t "${img}" -t "docker.io/${img}" -t "localhost/${img}" "${path}"
    
    if [[ "${PUSH_IMAGES}" == true ]]; then
        log "  -> [Docker Hub Push] Subiendo ${img} a Docker Hub..." "36"
        podman push "${img}"
    fi
done
log "Todas las imágenes fueron construidas exitosamente con Podman." "32"

# Limpieza de imágenes intermedias huérfanas en Podman para preservar almacenamiento efímero
log "\nLimpiando capas intermedias de compilación en Podman..." "33"
podman image prune -f || true

# 4. Cargar imágenes en el clúster
log "\n[4/5] Cargando / Verificando imágenes en el clúster Kubernetes (${CLUSTER_TYPE})..." "36"

for svc in frontend auth-service user-service transaction-service notification-service worker-service; do
    IFS="|" read -r img path cfile <<< "${SERVICES[$svc]}"
    if [[ "${CLUSTER_TYPE}" == "kind" ]]; then
        log "  -> Cargando ${img} en Kind cluster '${CLUSTER_NAME}'..." "33"
        export KIND_EXPERIMENTAL_PROVIDER=podman
        kind_args=()
        if [[ -n "${CLUSTER_NAME}" ]]; then
            kind_args+=(--name "${CLUSTER_NAME}")
        fi
        
        # Intentar cargar directamente con las diferentes variantes de nombres de Podman
        if ! kind load docker-image "${img}" "${kind_args[@]}" 2>/dev/null && \
           ! kind load docker-image "docker.io/${img}" "${kind_args[@]}" 2>/dev/null && \
           ! kind load docker-image "localhost/${img}" "${kind_args[@]}" 2>/dev/null; then
            log "  -> Intentando carga alternativa vía archivo tar temporal..." "33"
            temp_tar="/tmp/${svc}.tar"
            rm -f "${temp_tar}"
            podman save --format docker-archive -o "${temp_tar}" "${img}"
            kind load image-archive "${temp_tar}" "${kind_args[@]}"
            rm -f "${temp_tar}"
        fi
    elif [[ "${CLUSTER_TYPE}" == "minikube" ]]; then
        log "  -> Cargando ${img} en Minikube..." "33"
        minikube image load "${img}"
    elif [[ "${CLUSTER_TYPE}" == "k3s" ]] || command -v k3s &>/dev/null; then
        log "  -> Cargando ${img} en K3s (containerd)..." "33"
        temp_tar="/tmp/${svc}.tar"
        rm -f "${temp_tar}"
        if podman save --format docker-archive -o "${temp_tar}" "docker.io/${img}" 2>/dev/null || \
           podman save --format docker-archive -o "${temp_tar}" "${img}" 2>/dev/null || \
           podman save --format docker-archive -o "${temp_tar}" "localhost/${img}"; then
            if sudo -n true 2>/dev/null; then
                sudo k3s ctr images import "${temp_tar}"
            elif [[ -w "/run/k3s/containerd/containerd.sock" ]]; then
                k3s ctr images import "${temp_tar}"
            else
                sudo k3s ctr images import "${temp_tar}"
            fi
            rm -f "${temp_tar}"
        fi
    else
        log "  -> Imagen ${img} lista para el clúster." "32"
    fi
done

# 5. Aplicar Manifiestos de Kubernetes
log "\n[5/5] Aplicando manifiestos de Kubernetes en namespace 'fintech'..." "36"
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl delete job signoz-migrator -n fintech --ignore-not-found 2>/dev/null || true
kubectl apply -f k8s/04-observability.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-networkpolicy.yaml
kubectl apply -f k8s/07-backup-cronjob.yaml
kubectl apply -f k8s/09-hpa.yaml
kubectl apply -f k8s/10-pdb.yaml
kubectl delete job signoz-dashboards-importer -n fintech --ignore-not-found 2>/dev/null || true
kubectl apply -f k8s/12-signoz-dashboards-importer.yaml

# Limpieza preventiva de Pods finalizados o desalojados
kubectl delete pods --field-selector=status.phase=Failed -n fintech --ignore-not-found 2>/dev/null || true
kubectl delete pods --field-selector=status.phase=Succeeded -n fintech --ignore-not-found 2>/dev/null || true

log "\n======================================================================" "32"
log "¡Despliegue completado! Estado actual de los Pods en namespace 'fintech':" "32"
log "======================================================================" "32"
sleep 3
kubectl get pods -n fintech

log "\nLogs del despliegue guardados en: ${LOG_FILE}" "36"

