# Guía de Operaciones Day-2, Backups y Disaster Recovery

Este documento detalla las actividades operativas de ciclo de vida (Day-2 Operations) en **FinTech Wallet**: despliegues continuos, escalado de cargas, gestión de logs centralizados, reinicio de servicios, y los procedimientos detallados de respaldo (Backup) y recuperación ante desastres (Disaster Recovery).

---

## 📑 Contenido

1. [Operaciones de Despliegue y Rollout](#1-operaciones-de-despliegue-y-rollout)
2. [Escalado Horizontal y Ajuste de Cargas](#2-escalado-horizontal-y-ajuste-de-cargas)
3. [Monitoreo de Salud y Gestión de Logs](#3-monitoreo-de-salud-y-gestión-de-logs)
4. [Estrategia de Copias de Seguridad (Backups)](#4-estrategia-de-copias-de-seguridad-backups)
   - [CronJob Automatizado de Kubernetes (`postgres-backup-cronjob`)](#cronjob-automatizado-de-kubernetes-postgres-backup-cronjob)
   - [Respaldo Manual con Scripts (`backup-databases.ps1` / `.sh`)](#respaldo-manual-con-scripts-backup-databasesps1--sh)
5. [Procedimiento de Recuperación de Desastres (Disaster Recovery)](#5-procedimiento-de-recuperación-de-desastres-disaster-recovery)
   - [Restauración Mediante Kubernetes Job (`08-restore-job-template.yaml`)](#restauración-mediante-kubernetes-job-08-restore-job-templateyaml)
   - [Restauración Mediante Script CLI (`restore-database.ps1` / `.sh`)](#restauración-mediante-script-cli-restore-databaseps1--sh)

---

## 1. Operaciones de Despliegue y Rollout

### Actualización Continua de Imágenes
Cuando se actualiza el código de un microservicio sin alterar la infraestructura:

```powershell
# 1. Recompilar la imagen del servicio específico con Podman
podman build -f backend-nestjs/transaction-service/Containerfile -t fintech/transaction-service:1.0.0 ./backend-nestjs/transaction-service

# 2. Cargar en el clúster (si aplica, ej. en Kind)
# kind load docker-image fintech/transaction-service:1.0.0 --name fintech-wallet

# 3. Reiniciar el Deployment para tomar la nueva imagen
kubectl rollout restart deployment/transaction-service -n fintech

# 4. Monitorear el progreso del Rollout sin pérdida de tráfico
kubectl rollout status deployment/transaction-service -n fintech
```

### Reversión de Despliegue (Rollback Inmediato)
Si la nueva versión presenta anomalías:

```bash
# Revertir al estado anterior del Deployment
kubectl rollout undo deployment/transaction-service -n fintech
```

---

## 2. Escalado Horizontal y Ajuste de Cargas

Los microservicios son completamente sin estado (stateless), lo que permite escalar réplicas dinámicamente según la demanda:

```bash
# Escalar el servicio de transacciones a 3 réplicas
kubectl scale deployment/transaction-service -n fintech --replicas=3

# Escalar el servicio de autenticación a 2 réplicas
kubectl scale deployment/auth-service -n fintech --replicas=2

# Comprobar la distribución de réplicas en los nodos
kubectl get pods -n fintech -l app=transaction-service -o wide
```

---

## 3. Monitoreo de Salud y Gestión de Logs

### Inspección Rápida del Clúster

```bash
# Listar todos los pods y detectar reinicios anómalos (Restarts > 0)
kubectl get pods -n fintech

# Listar eventos recientes del clúster ordenados por fecha
kubectl get events -n fintech --sort-by='.metadata.creationTimestamp'
```

### Seguimiento de Logs en Streaming

```bash
# Seguir logs de todos los pods de transaction-service simultáneamente
kubectl logs -n fintech -l app=transaction-service -f --tail=100

# Seguir logs de PgBouncer Core
kubectl logs -n fintech -l app=pgbouncer-core -f --tail=50
```

---

## 4. Estrategia de Copias de Seguridad (Backups)

### CronJob Automatizado de Kubernetes (`postgres-backup-cronjob`)

Definido en `k8s/07-backup-cronjob.yaml`:

* **Programación**: `0 2 * * *` (Diario a las 02:00 AM UTC).
* **Bases Respaldadas**:
  - `postgres-core`: `authdb`, `userdb`, `transactiondb`.
  - `postgres-support`: `notificationdb`, `workerdb`.
* **Formato y Compresión**: Exportación SQL mediante `pg_dump --clean --if-exists` comprimida en `.sql.gz` con nivel máximo (`gzip -9`).
* **Verificación de Integridad**: Generación automática de archivo de sumas de verificación `checksums.sha256`.
* **Política de Retención**: Limpieza automática de directorios de backup con más de **7 días** de antigüedad (`find /backups -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +`).
* **Almacenamiento**: Persistido en el PVC dedicado `postgres-backups-pvc` (10 GiB).

### Respaldo Manual con Scripts (`backup-databases.ps1` / `.sh`)

Para generar una instantánea bajo demanda previa a un mantenimiento mayor:

```powershell
# En Windows (PowerShell)
.\scripts\backup-databases.ps1 -Target k8s

# En Linux / macOS (Bash)
./scripts/backup-databases.sh -Target k8s
```

Los respaldos se almacenan localmente en la carpeta `./backups/<TIMESTAMP>/`.

---

## 5. Procedimiento de Recuperación de Desastres (Disaster Recovery)

### Restauración Mediante Kubernetes Job (`08-restore-job-template.yaml`)

Este procedimiento se ejecuta íntegramente dentro del clúster de Kubernetes leyendo directamente del volumen persistente de respaldos:

1. **Editar la plantilla `k8s/08-restore-job-template.yaml`** (opcional):
   - `TARGET_TIMESTAMP`: Déjalo vacío para restaurar el backup más reciente, o indica un directorio específico (ej. `20260817_120000`).
   - `TARGET_DB`: Indica `ALL` para restaurar todo el clúster o el nombre de una base puntual (`transactiondb`, `userdb`, etc.).
2. **Ejecutar el Job de Restauración**:
   ```bash
   # Eliminar ejecuciones previas del job
   kubectl delete job postgres-restore-job -n fintech --ignore-not-found

   # Aplicar el Job de restauración
   kubectl apply -f k8s/08-restore-job-template.yaml

   # Seguir la ejecución de la restauración en tiempo real
   kubectl logs -n fintech -l app=postgres-restore -f
   ```
3. **Validación**: El Job verifica los checksums SHA256 de los archivos comprimidos antes de ejecutar la inyección en PostgreSQL.

### Restauración Mediante Script CLI (`restore-database.ps1` / `.sh`)

Si se dispone de un archivo de backup en la estación de trabajo:

```powershell
# Restaurar una base de datos específica en el clúster
.\scripts\restore-database.ps1 -Target k8s -DatabaseName transactiondb -BackupFile ./backups/20260817_120000/core_transactiondb_20260817_120000.sql.gz
```

Para diagnosticar y resolver incidencias o errores en tiempo de ejecución, consulta la [Guía de Troubleshooting](troubleshooting.md).
