param(
    [string]$ClusterName = "fintech"
)

$podmanCmd = if (Get-Command podman -ErrorAction SilentlyContinue) { "podman" } elseif (Get-Command podman.exe -ErrorAction SilentlyContinue) { "podman.exe" } else { "podman" }
$containerName = "$ClusterName-control-plane"

$nodeInspect = & $podmanCmd inspect $containerName 2>$null | ConvertFrom-Json
if (-not $nodeInspect) {
    Write-Host "Error: No se encontro el contenedor '$containerName'." -ForegroundColor Red
    exit 1
}

# 1. Obtener IP interna del contenedor
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

# 2. Obtener puerto publicado del API server
$portInfo = & $podmanCmd port $containerName "6443/tcp" 2>$null
if ($portInfo -match ":(\d+)") {
    $hostPort = [int]$matches[1]
} else {
    $hostPort = 6443
}

# 3. Regla nftables en WSL2
try {
    wsl -d podman-machine-default -u root nft add rule inet netavark PREROUTING tcp dport $hostPort dnat ip to "$controlPlaneIp:6443" 2>$null
} catch {}

# 4. Obtener IP de WSL2 (eth0)
$wslIpOutput = wsl -d podman-machine-default -u root ip -4 addr show eth0 2>$null
$wslIp = ""
$wslText = ($wslIpOutput | Out-String)
if ($wslText -match "inet\s+(\d+\.\d+\.\d+\.\d+)") {
    $wslIp = $matches[1]
}

if (-not $wslIp) {
    Write-Host "Error: No se pudo determinar la IP de WSL2 para podman-machine-default." -ForegroundColor Red
    exit 1
}

# 5. Iniciar proxy TCP en segundo plano si no esta escuchando
$testConn = $false
try {
    $tcpTest = New-Object System.Net.Sockets.TcpClient
    $iar = $tcpTest.BeginConnect('127.0.0.1', $hostPort, $null, $null)
    $success = $iar.AsyncWaitHandle.WaitOne(1000)
    if ($success) {
        $tcpTest.EndConnect($iar)
        $testConn = $true
    }
    $tcpTest.Close()
} catch {}

if (-not $testConn) {
    Write-Host "Iniciando forwarder TCP: 127.0.0.1:$hostPort -> ${wslIp}:$hostPort..." -ForegroundColor Cyan
    $forwarderScript = Join-Path $PSScriptRoot "kind-port-forwarder.ps1"
    Start-Process powershell.exe -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$forwarderScript`"", "-LocalPort", $hostPort, "-RemoteHost", $wslIp, "-RemotePort", $hostPort -WindowStyle Hidden
    
    for ($retry = 1; $retry -le 5; $retry++) {
        Start-Sleep -Seconds 1
        try {
            $tcpTest = New-Object System.Net.Sockets.TcpClient
            $iar = $tcpTest.BeginConnect('127.0.0.1', $hostPort, $null, $null)
            $success = $iar.AsyncWaitHandle.WaitOne(1000)
            if ($success) {
                $tcpTest.EndConnect($iar)
                $testConn = $true
                $tcpTest.Close()
                break
            }
            $tcpTest.Close()
        } catch {}
    }
}

if ($testConn) {
    Write-Host "Puente de red activo para Kind ($ClusterName). Verificando clúster..." -ForegroundColor Green
    kubectl cluster-info
} else {
    Write-Host "Advertencia: El forwarder no respondio a tiempo en 127.0.0.1:$hostPort." -ForegroundColor Yellow
}
