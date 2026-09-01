# ==============================================================================
# DEPLOY-HELM.PS1 - DESPLIEGUE DEL ECOSISTEMA FINTECH WALLET CON HELM
# ==============================================================================
param(
    [string]$ReleaseName = "fintech",
    [string]$Namespace = "fintech",
    [string]$ValuesFile = "k8s/helm/fintech-wallet/values.yaml"
)

$ErrorActionPreference = "Stop"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Desplegando FinTech Wallet mediante Helm Release: '$ReleaseName'..." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Asegurar conectividad con el clúster
& .\scripts\start-cluster.ps1 | Out-Null

# 2. Asegurar Ingress Controller Traefik con todos los puertos mapeados
Write-Host "Verificando Ingress Controller Traefik..." -ForegroundColor Yellow
helm upgrade --install traefik traefik/traefik --namespace kube-system --skip-crds `
  --set "ports.web.port=80" --set "ports.web.hostPort=80" `
  --set "ports.websecure.port=443" --set "ports.websecure.hostPort=443" `
  --set "ports.signoz.port=3301" --set "ports.signoz.hostPort=3301" --set "ports.signoz.expose.default=true" `
  --set "ports.maildev.port=1080" --set "ports.maildev.hostPort=1080" --set "ports.maildev.expose.default=true" `
  --set "ingressClass.enabled=true" --set "ingressClass.isDefaultClass=true" | Out-Null

# 3. Validar sintaxis del Chart
Write-Host "Validando Chart 'k8s/helm/fintech-wallet'..." -ForegroundColor Yellow
helm lint k8s/helm/fintech-wallet

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en la validación del Helm Chart." -ForegroundColor Red
    exit 1
}

# 4. Desplegar / Actualizar el release
Write-Host "Instalando / Actualizando release '$ReleaseName' en namespace '$Namespace'..." -ForegroundColor Yellow
helm upgrade --install $ReleaseName ./k8s/helm/fintech-wallet `
  --namespace $Namespace `
  --create-namespace `
  --values $ValuesFile

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host " Despliegue con Helm completado exitosamente." -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para verificar el estado de los recursos:" -ForegroundColor Cyan
Write-Host "  helm status $ReleaseName -n $Namespace" -ForegroundColor White
Write-Host "  kubectl get pods -n $Namespace" -ForegroundColor White
