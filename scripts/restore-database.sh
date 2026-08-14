#!/usr/bin/env bash
# ==============================================================================
# Fintech Wallet - Script de Restauración y Disaster Recovery (DR) para PostgreSQL (Bash)
# Restaura bases de datos específicas o todas a partir de un respaldo comprimido (.sql.gz).
# ==============================================================================

set -eo pipefail

BACKUP_PATH="${1:-}"
TARGET_DB="${2:-ALL}"
TARGET="${3:-docker}"
DB_PASSWORD="${DB_PASSWORD:-12345}"

if [ -z "${BACKUP_PATH}" ]; then
    LATEST_DIR=$(ls -td ./backups/20* 2>/dev/null | head -n 1)
    if [ -z "${LATEST_DIR}" ]; then
        echo "ERROR: No se encontraron directorios de backup en ./backups"
        exit 1
    fi
    BACKUP_PATH="${LATEST_DIR}"
fi

echo "================================================="
echo "  Fintech Wallet - Disaster Recovery (DR)"
echo "  Directorio de Origen: ${BACKUP_PATH}"
echo "  Base de Datos Destino: ${TARGET_DB}"
echo "================================================="

# Verificar Checksums SHA256 si existe el archivo
if [ -f "${BACKUP_PATH}/checksums.sha256" ]; then
    echo "Verificando integridad SHA256..."
    (cd "${BACKUP_PATH}" && sha256sum -c checksums.sha256)
fi

restore_core_db() {
    local DB=$1
    local FILE=$(ls "${BACKUP_PATH}"/core_${DB}_*.sql.gz 2>/dev/null | head -n 1)
    if [ -f "${FILE}" ]; then
        echo "[Core] Restaurando ${DB} desde ${FILE}..."
        gunzip -c "${FILE}" | docker exec -i -e PGPASSWORD="${DB_PASSWORD}" fintech-postgres-core psql -U postgres -d "${DB}"
        echo "  -> ${DB} restaurado con éxito."
    else
        echo "  Advertencia: No se encontró archivo de backup para ${DB}"
    fi
}

restore_support_db() {
    local DB=$1
    local FILE=$(ls "${BACKUP_PATH}"/support_${DB}_*.sql.gz 2>/dev/null | head -n 1)
    if [ -f "${FILE}" ]; then
        echo "[Support] Restaurando ${DB} desde ${FILE}..."
        gunzip -c "${FILE}" | docker exec -i -e PGPASSWORD="${DB_PASSWORD}" fintech-postgres-support psql -U postgres -d "${DB}"
        echo "  -> ${DB} restaurado con éxito."
    else
        echo "  Advertencia: No se encontró archivo de backup para ${DB}"
    fi
}

if [ "${TARGET}" == "docker" ]; then
    if [ "${TARGET_DB}" == "ALL" ] || [ "${TARGET_DB}" == "authdb" ]; then restore_core_db "authdb"; fi
    if [ "${TARGET_DB}" == "ALL" ] || [ "${TARGET_DB}" == "userdb" ]; then restore_core_db "userdb"; fi
    if [ "${TARGET_DB}" == "ALL" ] || [ "${TARGET_DB}" == "transactiondb" ]; then restore_core_db "transactiondb"; fi
    if [ "${TARGET_DB}" == "ALL" ] || [ "${TARGET_DB}" == "notificationdb" ]; then restore_support_db "notificationdb"; fi
    if [ "${TARGET_DB}" == "ALL" ] || [ "${TARGET_DB}" == "workerdb" ]; then restore_support_db "workerdb"; fi
elif [ "${TARGET}" == "k8s" ]; then
    echo "Aplicando Job de Restauración en Kubernetes..."
    kubectl apply -f k8s/08-restore-job-template.yaml
fi

echo "================================================="
echo "  Proceso de Restauración Finalizado."
echo "================================================="
