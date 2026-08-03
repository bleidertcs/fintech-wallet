#!/usr/bin/env bash
set -e

LOG_FILE="deploy-rancher.log"
exec > >(tee -a "${LOG_FILE}") 2>&1

RECREATE=false
NON_INTERACTIVE=false

# Procesar flags de línea de comandos
for arg in "$@"; do
  case $arg in
    -r|--recreate)
      RECREATE=true
      shift
      ;;
    -y|--non-interactive)
      NON_INTERACTIVE=true
      shift
      ;;
  esac
done

timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

echo "======================================================================"
echo "[$(timestamp)] Iniciando despliegue de FinTech Wallet en Rancher Desktop (containerd)..."
echo "[$(timestamp)] Los logs están siendo guardados en: ${LOG_FILE}"
echo "======================================================================"

# 1. Verificar conectividad con nerdctl / containerd
echo -e "\n[$(timestamp)] Verificando conexión con Rancher Desktop (containerd via nerdctl)..."
NERDCTL_OK=false
for i in {1..3}; do
  if nerdctl info >/dev/null 2>&1; then
    NERDCTL_OK=true
    echo "[$(timestamp)] Conexión a containerd mediante nerdctl exitosa."
    break
  else
    echo "[$(timestamp)] Intento ${i}/3: nerdctl no responde. Reintentando en 4 segundos..."
    sleep 4
  fi
done

if [ "$NERDCTL_OK" = false ]; then
  echo "[$(timestamp)] ERROR CRÍTICO: No se pudo conectar con containerd (nerdctl). Verifica que Rancher Desktop esté ejecutándose con containerd."
  exit 1
fi

# 2. Verificar conectividad con Kubernetes (k3s) y contexto rancher-desktop
echo -e "\n[$(timestamp)] Verificando conexión con Kubernetes..."
CURRENT_CTX=$(kubectl config current-context 2>/dev/null || true)
if [ "$CURRENT_CTX" != "rancher-desktop" ]; then
  if kubectl config get-contexts -o name 2>/dev/null | grep -q "^rancher-desktop$"; then
    echo "[$(timestamp)] Cambiando contexto de kubectl a 'rancher-desktop'..."
    kubectl config use-context rancher-desktop >/dev/null 2>&1 || true
  fi
fi

if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "[$(timestamp)] ERROR CRÍTICO: No se pudo contactar al clúster de Kubernetes."
  exit 1
fi
echo "[$(timestamp)] Conexión con Kubernetes (contexto: $(kubectl config current-context)) exitosa."

# Preguntar al usuario si desea recrear en modo interactivo
if [ "$RECREATE" = false ] && [ "$NON_INTERACTIVE" = false ] && [ -t 0 ]; then
  read -p "[$(timestamp)] ¿Deseas recrear completamente la aplicación en Kubernetes desde cero? (s/n) [n]: " RESPONSE
  case "$RESPONSE" in
    [sS]|[sS][iI]|[yY]|[yY][eE][sS])
      RECREATE=true
      ;;
  esac
fi

if [ "$RECREATE" = true ]; then
  echo -e "\n[$(timestamp)] Eliminando namespace 'fintech' para recreación completa..."
  kubectl delete namespace fintech --ignore-not-found || true
  sleep 3
fi

# 3. Construir imágenes en el namespace k8s.io de containerd
echo -e "\n[$(timestamp)] [1/3] Construyendo imágenes de contenedor con nerdctl (namespace k8s.io)..."
nerdctl --namespace k8s.io build -t fintech/frontend:latest ./frontend
nerdctl --namespace k8s.io build -t fintech/api-gateway:latest ./backend/api-gateway
nerdctl --namespace k8s.io build -t fintech/auth-service:latest ./backend/auth-service
nerdctl --namespace k8s.io build -t fintech/user-service:latest ./backend/user-service
nerdctl --namespace k8s.io build -t fintech/transaction-service:latest ./backend/transaction-service
nerdctl --namespace k8s.io build -t fintech/notification-service:latest ./backend/notification-service
nerdctl --namespace k8s.io build -t fintech/worker-service:latest ./backend/worker-service
echo "[$(timestamp)] Imágenes construidas e importadas a containerd (k8s.io) exitosamente."

# 4. Verificar e instalar NGINX Ingress Controller
echo -e "\n[$(timestamp)] [2/3] Instalando NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
kubectl delete validatingwebhookconfiguration ingress-nginx-admission --ignore-not-found >/dev/null 2>&1 || true

# 5. Aplicar Manifiestos de Kubernetes
echo -e "\n[$(timestamp)] [3/3] Aplicando manifiestos de Kubernetes..."
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl apply -f k8s/04-observability.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-networkpolicy.yaml

echo -e "\n======================================================================"
echo "[$(timestamp)] ¡Despliegue completado! Estado actual de los Pods en namespace 'fintech':"
echo "======================================================================"
sleep 3
kubectl get pods -n fintech

echo -e "\n[$(timestamp)] Logs del despliegue guardados en: ${LOG_FILE}"
