#!/usr/bin/env bash
# ==============================================================================
# Fintech Wallet - Script Automatizado de Backup para PostgreSQL (Bash)
# Realiza copias de seguridad de las 2 instancias de PostgreSQL (Core y Support):
# - Core: authdb, userdb, transactiondb
# - Support: notificationdb, workerdb
# Comprime en .sql.gz, calcula sumas de verificación SHA-256 y aplica rotación de 7 días.
# ==============================================================================

set -eo pipefail

TARGET="${1:-docker}"
BACKUP_BASE_DIR="${2:-./backups}"
DB_PASSWORD="${DB_PASSWORD:-12345}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TARGET_DIR="${BACKUP_BASE_DIR}/${TIMESTAMP}"

mkdir -p "${TARGET_DIR}"

echo "================================================="
echo "  Fintech Wallet - Backup Automatizado (${TARGET})"
echo "  Timestamp: ${TIMESTAMP}"
echo "  Directorio de Destino: ${TARGET_DIR}"
echo "================================================="

CORE_DBS=("authdb" "userdb" "transactiondb")
SUPPORT_DBS=("notificationdb" "workerdb")

if [ "${TARGET}" == "docker" ]; then
    # 1. Backup postgres-core
    for DB in "${CORE_DBS[@]}"; do
        echo "[Core] Respaldando ${DB}..."
        OUT_FILE="${TARGET_DIR}/core_${DB}_${TIMESTAMP}.sql.gz"
        docker exec -e PGPASSWORD="${DB_PASSWORD}" fintech-postgres-core \
            pg_dump -U postgres -d "${DB}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${OUT_FILE}"
        echo "  -> ${OUT_FILE} ($(du -h "${OUT_FILE}" | cut -f1))"
    done

    # 2. Backup postgres-support
    for DB in "${SUPPORT_DBS[@]}"; do
        echo "[Support] Respaldando ${DB}..."
        OUT_FILE="${TARGET_DIR}/support_${DB}_${TIMESTAMP}.sql.gz"
        docker exec -e PGPASSWORD="${DB_PASSWORD}" fintech-postgres-support \
            pg_dump -U postgres -d "${DB}" --clean --if-exists --no-owner --no-privileges | gzip -9 > "${OUT_FILE}"
        echo "  -> ${OUT_FILE} ($(du -h "${OUT_FILE}" | cut -f1))"
    done

elif [ "$TARGET" = "k8s" ]; then
    K8S_JOB_NAME="postgres-backup-manual-$(echo ${TIMESTAMP} | tr '_' '-')"
    echo -e "${YELLOW}Ejecutando Job de Backup en Kubernetes (${K8S_JOB_NAME} en namespace: fintech)...${NC}"
    kubectl create job --from=cronjob/postgres-backup-cronjob "${K8S_JOB_NAME}" -n fintech
    echo -e "${YELLOW}Esperando finalización del Job...${NC}"
    kubectl wait --for=condition=complete "job/${K8S_JOB_NAME}" -n fintech --timeout=120s
    echo -e "${GREEN}Backup K8s completado exitosamente.${NC}"
fi

# 3. Generar Checksums SHA256
cd "${TARGET_DIR}"
if ls *.sql.gz 1> /dev/null 2>&1; then
    sha256sum *.sql.gz > checksums.sha256
    echo "Checksums SHA256 generados:"
    cat checksums.sha256
fi

# 4. Rotación de backups (7 días)
echo "Aplicando política de retención (7 días)..."
find "${BACKUP_BASE_DIR}" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo "================================================="
echo "  Backup completado con éxito en: ${TARGET_DIR}"
echo "================================================="
