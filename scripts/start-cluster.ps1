param(
    [string]$ClusterName = "fintech"
)

$podmanCmd = if (Get-Command podman -ErrorAction SilentlyContinue) { "podman" } elseif (Get-Command podman.exe -ErrorAction SilentlyContinue) { "podman.exe" } else { "podman" }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Reconectando y Levantando Clúster Kind ($ClusterName)..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Verificar Podman
$podmanOk = $false
for ($i = 1; $i -le 3; $i++) {
    $check = & $podmanCmd info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $podmanOk = $true
        break
    } else {
        Write-Host "Podman no responde. Intentando reactivar (intento $i/3)..." -ForegroundColor Yellow
        & $podmanCmd machine start 2>&1 | Out-Null
        Start-Sleep -Seconds 3
    }
}

if (-not $podmanOk) {
    Write-Host "Error: No se pudo conectar con Podman. Asegúrate de que Podman Desktop o Podman Machine esté activo." -ForegroundColor Red
    exit 1
}

$containerName = "$ClusterName-control-plane"
$nodeStatus = & $podmanCmd inspect $containerName --format "{{.State.Status}}" 2>$null

if (-not $nodeStatus) {
    Write-Host "El contenedor '$containerName' no existe. Ejecuta .\deploy-k8s.ps1 para crearlo." -ForegroundColor Yellow
    exit 1
}

# 2. Si el contenedor del nodo está apagado, iniciarlo
if ($nodeStatus -ne "running") {
    Write-Host "Iniciando nodo del clúster ($containerName)..." -ForegroundColor Cyan
    & $podmanCmd start $containerName 2>&1 | Out-Null
    Start-Sleep -Seconds 3
}

$nodeInspect = & $podmanCmd inspect $containerName 2>$null | ConvertFrom-Json

# 3. Obtener IP interna del contenedor
$controlPlaneIp = ""
if ($nodeInspect[0].NetworkSettings.Networks) {
    foreach ($net in $nodeInspect[0].NetworkSettings.Networks.PSObject.Properties) {
        if ($net.Value.IPAddress) {
            $controlPlaneIp = $net.Value.IPAddress
            break
        }
    }
}
if (-not $controlPlaneIp) {
    $controlPlaneIp = $nodeInspect[0].NetworkSettings.IPAddress
}
if (-not $controlPlaneIp) {
    $controlPlaneIp = "10.89.0.2"
}

# 4. Obtener puerto publicado del API Server
$portInfo = & $podmanCmd port $containerName "6443/tcp" 2>$null
if ($portInfo -match ":(\d+)") {
    $hostPort = [int]$matches[1]
} else {
    $hostPort = 6443
}

# 5. Aplicar regla de enrutamiento nftables en WSL2
try {
    wsl -d podman-machine-default -u root nft add rule inet netavark PREROUTING tcp dport $hostPort dnat ip to "$controlPlaneIp:6443" 2>$null
} catch {}

# 6. Obtener la IP actual de WSL2
$wslIpOutput = wsl -d podman-machine-default -u root ip -4 addr show eth0 2>$null
$wslIp = ""
$wslText = ($wslIpOutput | Out-String)
if ($wslText -match "inet\s+(\d+\.\d+\.\d+\.\d+)") {
    $wslIp = $matches[1]
}

if (-not $wslIp) {
    Write-Host "Error: No se pudo detectar la IP de WSL2." -ForegroundColor Red
    exit 1
}

# 7. Actualizar contexto de kubectl
$env:KIND_EXPERIMENTAL_PROVIDER = "podman"
& kind export kubeconfig --name $ClusterName 2>$null | Out-Null
& kubectl config set-cluster "kind-$ClusterName" --server="https://${wslIp}:${hostPort}" --insecure-skip-tls-verify=true 2>$null | Out-Null
& kubectl config use-context "kind-$ClusterName" 2>$null | Out-Null

Write-Host "Conexión establecida con éxito con el clúster Kind." -ForegroundColor Green
Write-Host "IP de WSL2       : $wslIp" -ForegroundColor Cyan
Write-Host "Puerto Kubernetes: $hostPort" -ForegroundColor Cyan
Write-Host ""

Write-Host "Estado actual de los Pods en namespace 'fintech':" -ForegroundColor Yellow
kubectl get pods -n fintech
