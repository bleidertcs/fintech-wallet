param(
    [int]$LocalPort = 59908,
    [string]$RemoteHost = "192.168.86.91",
    [int]$RemotePort = 59908
)

$source = @"
#pragma warning disable 4014
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

public class KindPortForwarder {
    private TcpListener _listener;
    private bool _running;

    public void Start(int localPort, string remoteHost, int remotePort) {
        _listener = new TcpListener(IPAddress.Loopback, localPort);
        _listener.Start();
        _running = true;
        Task.Run(async () => {
            while (_running) {
                try {
                    var client = await _listener.AcceptTcpClientAsync();
                    Task.Run(async () => {
                        using (client)
                        using (var target = new TcpClient()) {
                            try {
                                await target.ConnectAsync(remoteHost, remotePort);
                                using (var clientStream = client.GetStream())
                                using (var targetStream = target.GetStream()) {
                                    var t1 = clientStream.CopyToAsync(targetStream);
                                    var t2 = targetStream.CopyToAsync(clientStream);
                                    await Task.WhenAny(t1, t2);
                                }
                            } catch {}
                        }
                    });
                } catch {
                    if (!_running) break;
                }
            }
        });
    }

    public void Stop() {
        _running = false;
        try { _listener.Stop(); } catch {}
    }
}
"@

try {
    Add-Type -TypeDefinition $source -ErrorAction SilentlyContinue
} catch {}

$forwarder = New-Object KindPortForwarder
$forwarder.Start($LocalPort, $RemoteHost, $RemotePort)

while ($true) {
    Start-Sleep -Seconds 3600
}
