<#
.SYNOPSIS
    Fintech Wallet - Script Automatizado de Backup para PostgreSQL (PowerShell)
.DESCRIPTION
    Realiza copias de seguridad de las 2 instancias de PostgreSQL (Core y Support):
    - Core: authdb, userdb, transactiondb
    - Support: notificationdb, workerdb
    Comprime en .sql.gz, calcula sumas de verificación SHA-256 y aplica rotación de 7 días.
.PARAMETER Target
    Entorno objetivo: "podman" o "k8s". Por defecto: "podman".
.PARAMETER BackupDir
    Directorio de almacenamiento de backups. Por defecto: "./backups".
#>

param(
    [ValidateSet("podman", "k8s", "docker")]
    [string]$Target = "podman",
    [string]$BackupDir = "./backups",
    [string]$DbPassword = $env:DB_PASSWORD
)

if (-not $DbPassword) {
    $DbPassword = "12345"
}

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TargetDir = Join-Path $BackupDir $Timestamp

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Fintech Wallet - Backup Automatizado ($Target)" -ForegroundColor Cyan
Write-Host "  Timestamp: $Timestamp" -ForegroundColor Cyan
Write-Host "  Directorio de Destino: $TargetDir" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$CoreDbs = @("authdb", "userdb", "transactiondb")
$SupportDbs = @("notificationdb", "workerdb")

$cliCmd = if (Get-Command podman -ErrorAction SilentlyContinue) { "podman" } elseif (Get-Command podman.exe -ErrorAction SilentlyContinue) { "podman.exe" } else { "docker" }

if ($Target -eq "podman" -or $Target -eq "docker") {
    # 1. Backup de postgres-core
    foreach ($db in $CoreDbs) {
        Write-Host "[Core] Respaldando $db..." -ForegroundColor Yellow
        $outFile = Join-Path $TargetDir "core_${db}_${Timestamp}.sql"
        $gzFile = "$outFile.gz"
        
        & $cliCmd exec -e PGPASSWORD=$DbPassword fintech-postgres-core pg_dump -U postgres -d $db --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $outFile -Encoding utf8
        
        # Comprimir con .NET GZip
        $fileBytes = [System.IO.File]::ReadAllBytes($outFile)
        $outputFileStream = [System.IO.File]::Create($gzFile)
        $gzipStream = New-Object System.IO.Compression.GZipStream($outputFileStream, [System.IO.Compression.CompressionLevel]::Optimal)
        $gzipStream.Write($fileBytes, 0, $fileBytes.Length)
        $gzipStream.Dispose()
        $outputFileStream.Dispose()
        Remove-Item $outFile -Force

        $fileSize = (Get-Item $gzFile).Length / 1KB
        Write-Host "  -> $gzFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    }

    # 2. Backup de postgres-support
    foreach ($db in $SupportDbs) {
        Write-Host "[Support] Respaldando $db..." -ForegroundColor Yellow
        $outFile = Join-Path $TargetDir "support_${db}_${Timestamp}.sql"
        $gzFile = "$outFile.gz"
        
        & $cliCmd exec -e PGPASSWORD=$DbPassword fintech-postgres-support pg_dump -U postgres -d $db --clean --if-exists --no-owner --no-privileges | Out-File -FilePath $outFile -Encoding utf8
        
        $fileBytes = [System.IO.File]::ReadAllBytes($outFile)
        $outputFileStream = [System.IO.File]::Create($gzFile)
        $gzipStream = New-Object System.IO.Compression.GZipStream($outputFileStream, [System.IO.Compression.CompressionLevel]::Optimal)
        $gzipStream.Write($fileBytes, 0, $fileBytes.Length)
        $gzipStream.Dispose()
        $outputFileStream.Dispose()
        Remove-Item $outFile -Force

        $fileSize = (Get-Item $gzFile).Length / 1KB
        Write-Host "  -> $gzFile ($([math]::Round($fileSize, 2)) KB)" -ForegroundColor Green
    }
}
elseif ($Target -eq "k8s") {
    $k8sJobName = "postgres-backup-manual-" + $Timestamp.Replace('_', '-').ToLower()
    Write-Host "Ejecutando Job de Backup en Kubernetes ($k8sJobName en namespace: fintech)..." -ForegroundColor Yellow
    kubectl create job --from=cronjob/postgres-backup-cronjob $k8sJobName -n fintech
    Write-Host "Esperando finalización del Job..." -ForegroundColor Yellow
    kubectl wait --for=condition=complete "job/$k8sJobName" -n fintech --timeout=120s
    Write-Host "Backup K8s completado exitosamente." -ForegroundColor Green
}

# 3. Generar Checksums SHA256
$ChecksumFile = Join-Path $TargetDir "checksums.sha256"
if (Test-Path $TargetDir) {
    Get-ChildItem -Path $TargetDir -Filter "*.gz" | ForEach-Object {
        $hash = Get-FileHash -Path $_.FullName -Algorithm SHA256
        "$($hash.Hash)  $($_.Name)" | Out-File -FilePath $ChecksumFile -Append -Encoding utf8
    }
}

# 4. Rotación de backups (7 días)
$cutoff = (Get-Date).AddDays(-7)
Get-ChildItem -Path $BackupDir -Directory | Where-Object { $_.CreationTime -lt $cutoff } | ForEach-Object {
    Write-Host "Rotando backup antiguo: $($_.Name)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Recurse -Force
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Backup completado con éxito en: $TargetDir" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
