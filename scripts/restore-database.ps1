<#
.SYNOPSIS
    Fintech Wallet - Script de Restauración y Disaster Recovery (DR) para PostgreSQL
.DESCRIPTION
    Restaura bases de datos específicas o todas a partir de un respaldo comprimido (.sql.gz).
.PARAMETER BackupPath
    Ruta a la carpeta del backup específico (ej. "./backups/20260814_100000"). Si no se especifica, toma el más reciente.
.PARAMETER TargetDb
    Base de datos objetivo: "ALL", "authdb", "userdb", "transactiondb", "notificationdb", "workerdb". Por defecto: "ALL".
.PARAMETER Target
    Entorno objetivo: "podman", "docker" o "k8s". Por defecto: "podman".
#>

param(
    [string]$BackupPath = "",
    [ValidateSet("ALL", "authdb", "userdb", "transactiondb", "notificationdb", "workerdb")]
    [string]$TargetDb = "ALL",
    [ValidateSet("podman", "docker", "k8s")]
    [string]$Target = "podman",
    [string]$DbPassword = $env:DB_PASSWORD
)

if (-not $DbPassword) {
    $DbPassword = "12345"
}

$ErrorActionPreference = "Stop"

# Localizar el directorio de backup
if (-not $BackupPath) {
    $latest = Get-ChildItem -Path "./backups" -Directory | Sort-Object CreationTime -Descending | Select-Object -First 1
    if (-not $latest) {
        Write-Error "No se encontraron directorios de backup en ./backups"
        exit 1
    }
    $BackupPath = $latest.FullName
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Fintech Wallet - Disaster Recovery (DR)" -ForegroundColor Cyan
Write-Host "  Directorio de Origen: $BackupPath" -ForegroundColor Cyan
Write-Host "  Base de Datos Destino: $TargetDb" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Verificar integridad SHA256 si existe checksums.sha256
$ChecksumFile = Join-Path $BackupPath "checksums.sha256"
if (Test-Path $ChecksumFile) {
    Write-Host "Verificando integridad SHA256 de los respaldos..." -ForegroundColor Yellow
    Get-Content $ChecksumFile | ForEach-Object {
        $parts = $_ -split "\s+"
        if ($parts.Length -ge 2) {
            $expectedHash = $parts[0]
            $fileName = $parts[1]
            $fullFilePath = Join-Path $BackupPath $fileName
            if (Test-Path $fullFilePath) {
                $actualHash = (Get-FileHash -Path $fullFilePath -Algorithm SHA256).Hash
                if ($actualHash.ToLower() -eq $expectedHash.ToLower()) {
                    Write-Host "  [OK] $fileName" -ForegroundColor Green
                } else {
                    Write-Error "  [FALLO] Hash mismatch en $fileName"
                }
            }
        }
    }
}

$cliCmd = if (Get-Command podman -ErrorAction SilentlyContinue) { "podman" } elseif (Get-Command podman.exe -ErrorAction SilentlyContinue) { "podman.exe" } else { "docker" }

function Restore-CoreDatabase($dbName) {
    $file = Get-ChildItem -Path $BackupPath -Filter "core_${dbName}_*.sql.gz" | Select-Object -First 1
    if ($file) {
        Write-Host "[Core] Restaurando $dbName desde $($file.Name)..." -ForegroundColor Yellow
        $tempSql = Join-Path $BackupPath "temp_${dbName}.sql"
        
        # Descomprimir
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        $gzStream = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionMode]::Decompress)
        $outStream = [System.IO.File]::Create($tempSql)
        $gzStream.CopyTo($outStream)
        $outStream.Dispose()
        $gzStream.Dispose()
        $fileStream.Dispose()

        Get-Content $tempSql -Raw | & $cliCmd exec -i -e PGPASSWORD=$DbPassword fintech-postgres-core psql -U postgres -d $dbName
        Remove-Item $tempSql -Force
        Write-Host "  -> $dbName restaurado exitosamente." -ForegroundColor Green
    } else {
        Write-Host "  Advertencia: No se encontró archivo de backup para $dbName" -ForegroundColor Red
    }
}

function Restore-SupportDatabase($dbName) {
    $file = Get-ChildItem -Path $BackupPath -Filter "support_${dbName}_*.sql.gz" | Select-Object -First 1
    if ($file) {
        Write-Host "[Support] Restaurando $dbName desde $($file.Name)..." -ForegroundColor Yellow
        $tempSql = Join-Path $BackupPath "temp_${dbName}.sql"
        
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        $gzStream = New-Object System.IO.Compression.GZipStream($fileStream, [System.IO.Compression.CompressionMode]::Decompress)
        $outStream = [System.IO.File]::Create($tempSql)
        $gzStream.CopyTo($outStream)
        $outStream.Dispose()
        $gzStream.Dispose()
        $fileStream.Dispose()

        Get-Content $tempSql -Raw | & $cliCmd exec -i -e PGPASSWORD=$DbPassword fintech-postgres-support psql -U postgres -d $dbName
        Remove-Item $tempSql -Force
        Write-Host "  -> $dbName restaurado exitosamente." -ForegroundColor Green
    } else {
        Write-Host "  Advertencia: No se encontró archivo de backup para $dbName" -ForegroundColor Red
    }
}

if ($Target -eq "podman" -or $Target -eq "docker") {
    if ($TargetDb -eq "ALL" -or $TargetDb -eq "authdb") { Restore-CoreDatabase "authdb" }
    if ($TargetDb -eq "ALL" -or $TargetDb -eq "userdb") { Restore-CoreDatabase "userdb" }
    if ($TargetDb -eq "ALL" -or $TargetDb -eq "transactiondb") { Restore-CoreDatabase "transactiondb" }
    if ($TargetDb -eq "ALL" -or $TargetDb -eq "notificationdb") { Restore-SupportDatabase "notificationdb" }
    if ($TargetDb -eq "ALL" -or $TargetDb -eq "workerdb") { Restore-SupportDatabase "workerdb" }
}
elseif ($Target -eq "k8s") {
    Write-Host "Para restaurar en Kubernetes, utiliza el Job k8s/08-restore-job-template.yaml" -ForegroundColor Yellow
    kubectl apply -f k8s/08-restore-job-template.yaml
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Proceso de Restauración Finalizado con Éxito." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
