# 🦭 Guía Completa de Configuración de Podman y Kubernetes

Esta guía detalla el aprovisionamiento, optimización y resolución de problemas para el uso de **Podman**, **Podman Desktop**, **Podman Machine**, **Rootless Containers** y clústeres locales de **Kubernetes (Kind, Minikube, K3s)** en el ecosistema **FinTech Wallet**.

---

## 📑 Tabla de Contenidos

1. [¿Por qué Podman en FinTech Wallet?](#-por-qué-podman-en-fintech-wallet)
2. [Instalación y Configuración Base](#-instalación-y-configuración-base)
   - [Windows (Podman Desktop & WSL2)](#windows-podman-desktop--wsl2)
   - [Linux (Ubuntu / Debian / Fedora)](#linux-ubuntu--debian--fedora)
3. [Configuración de Podman Machine (Windows / macOS)](#-configuración-de-podman-machine-windows--macos)
4. [Modo Rootless y Permisos de Volúmenes (SELinux / :Z)](#-modo-rootless-y-permisos-de-volúmenes-selinux--z)
5. [Uso de `compose.yaml` con Podman](#-uso-de-composeyaml-con-podman)
6. [Integración con Clústeres Kubernetes Locales](#-integración-con-clústeres-kubernetes-locales)
   - [Kind con Proveedor Podman](#kind-con-proveedor-podman)
   - [Minikube con Driver Podman](#minikube-con-driver-podman)
   - [Podman Desktop con Kubernetes Embebido](#podman-desktop-con-kubernetes-embebido)
7. [Construcción de Imágenes con `Containerfile`](#-construcción-de-imágenes-con-containerfile)
8. [Despliegue Automatizado con `deploy-k8s.ps1` / `deploy-k8s.sh`](#-despliegue-automatizado-con-deploy-k8sps1--deploy-k8ssh)
9. [Diagnóstico y Resolución de Problemas Frecuentes](#-diagnóstico-y-resolución-de-problemas-frecuentes)

---

## 🎯 ¿Por qué Podman en FinTech Wallet?

* 🛡️ **Seguridad Rootless**: Permite ejecutar contenedores sin privilegios de `root` ni demonios con privilegios elevados (`dockerd`), aislando el entorno de desarrollo y producción.
* 📦 **Estándares OCI y Containerfile**: Compatibilidad nativa con imágenes OCI, `Containerfile` y especificaciones de `compose.yaml`.
* ☸️ **Afinidad con Kubernetes**: Filosofía de Pods nativos (`podman pod`, `podman kube play`) e interoperabilidad con Kind y Minikube.
* ⚡ **Arquitectura Fork-Exec**: Sin demonio central que represente un único punto de fallo (single point of failure).

---

## 💻 Instalación y Configuración Base

### Windows (Podman Desktop & WSL2)

1. Descarga e instala **Podman Desktop** desde el sitio oficial o vía `winget`:
   ```powershell
   winget install RedHat.Podman-Desktop
   winget install RedHat.Podman
   ```
2. Asegúrate de tener **WSL2** instalado y configurado como versión predeterminada:
   ```powershell
   wsl --status
   wsl --set-default-version 2
   ```
3. Inicializa la máquina de Podman:
   ```powershell
   podman machine init --cpus 4 --memory 8192 --disk-size 50
   podman machine start
   ```
4. Verifica la conectividad:
   ```powershell
   podman info
   podman version
   ```

### Linux (Ubuntu / Debian / Fedora)

#### Ubuntu 22.04 / 24.04 LTS:
```bash
sudo apt update
sudo apt install -y podman podman-compose
```

#### Fedora / RHEL:
```bash
sudo dnf install -y podman podman-compose
```

Habilitar el socket de usuario para herramientas compatibles con la API de Docker:
```bash
systemctl --user enable --now podman.socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR:-/run/user/$UID}/podman/podman.sock"
```

---

## ⚙️ Configuración de Podman Machine (Windows / macOS)

Para garantizar recursos suficientes para los 5 microservicios NestJS, PostgreSQL dual, PgBouncer, Kafka, Redis, ClickHouse y SigNoz APM:

```powershell
# Detener máquina existente si requiere redimensionamiento
podman machine stop

# Crear una máquina con recursos recomendados
podman machine init --cpus 4 --memory 8192 --disk-size 60 fintech-machine

# Iniciar la máquina
podman machine start fintech-machine

# Establecer como predeterminada
podman system connection default fintech-machine
```

---

## 🔒 Modo Rootless y Permisos de Volúmenes (SELinux / :Z)

En entornos Linux con SELinux o en modo Rootless, los volúmenes montados desde el host requieren etiquetas de contexto adecuadas:

* `:z` (minúscula): Comparte el volumen entre múltiples contenedores.
* `:Z` (mayúscula): Asigna el volumen de forma privada y exclusiva al contenedor.

En `compose.yaml`, todos los bind mounts locales están configurados con sufijos de seguridad:
```yaml
volumes:
  - ./infra/postgres/init-core.sql:/docker-entrypoint-initdb.d/init-core.sql:ro,z
  - ./backups:/backups:z
```

### Configuración de subuid y subgid en Linux:
Verifica que tu usuario tenga rangos asignados en `/etc/subuid` y `/etc/subgid`:
```bash
grep $USER /etc/subuid
grep $USER /etc/subgid
# Salida esperada: usuario:100000:65536
```
Si no existen, agrégalos con:
```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
```

---

## 🚀 Uso de `compose.yaml` con Podman

FinTech Wallet incluye una definición estandarizada en `compose.yaml` para levantar todo el stack de infraestructura y servicios:

```bash
# Iniciar todos los servicios en segundo plano
podman compose up -d

# Ver el estado de los contenedores
podman compose ps

# Ver logs de un servicio específico
podman compose logs -f transaction-service

# Detener todos los servicios
podman compose down
```

---

## ☸️ Integración con Clústeres Kubernetes Locales

### Kind con Proveedor Podman

Para usar **Kind** directamente sobre Podman en Windows (WSL2) o Linux:

1. Establece la variable de entorno:
   ```powershell
   # PowerShell
   $env:KIND_EXPERIMENTAL_PROVIDER = "podman"
   ```
   ```bash
   # Bash
   export KIND_EXPERIMENTAL_PROVIDER=podman
   ```
2. Crea el clúster Kind:
   ```bash
   kind create cluster --name fintech-wallet --config infra/k8s/kind-config.yaml
   ```
3. Carga imágenes construidas localmente en el clúster:
   ```bash
   kind load docker-image fintech/auth-service:1.0.0 --name fintech-wallet
   ```

### Minikube con Driver Podman

```bash
minikube start --driver=podman --cpus=4 --memory=8192
minikube image load fintech/auth-service:1.0.0
```

### Podman Desktop con Kubernetes Embebido

Podman Desktop incluye soporte nativo para inicializar clústeres locales de Kind desde su interfaz gráfica (Settings -> Extensions -> Kind).

---

## 🛠️ Construcción de Imágenes con `Containerfile`

Cada microservicio y la SPA frontend poseen su propio `Containerfile` multi-stage optimizado:

```powershell
# Compilar frontend
podman build -f frontend/Containerfile -t fintech/frontend:1.0.0 ./frontend

# Compilar microservicios de backend
podman build -f backend-nestjs/auth-service/Containerfile -t fintech/auth-service:1.0.0 ./backend-nestjs/auth-service
podman build -f backend-nestjs/user-service/Containerfile -t fintech/user-service:1.0.0 ./backend-nestjs/user-service
podman build -f backend-nestjs/transaction-service/Containerfile -t fintech/transaction-service:1.0.0 ./backend-nestjs/transaction-service
podman build -f backend-nestjs/notification-service/Containerfile -t fintech/notification-service:1.0.0 ./backend-nestjs/notification-service
podman build -f backend-nestjs/worker-service/Containerfile -t fintech/worker-service:1.0.0 ./backend-nestjs/worker-service
```

---

## ⚡ Despliegue Automatizado con `deploy-k8s.ps1` / `deploy-k8s.sh`

El repositorio cuenta con scripts de despliegue que automatizan la compilación, carga de imágenes y aplicación de manifiestos:

### En Windows (PowerShell):
```powershell
# Despliegue interactivo estándar
.\deploy-k8s.ps1

# Despliegue no interactivo recreando todos los pods
.\deploy-k8s.ps1 -Recreate -NonInteractive
```

### En Linux / macOS / WSL2 (Bash):
```bash
# Dar permisos de ejecución
chmod +x deploy-k8s.sh

# Ejecutar despliegue
./deploy-k8s.sh --recreate --non-interactive
```

---

## 🩺 Diagnóstico y Resolución de Problemas Frecuentes

### 1. `Error: cannot connect to the Podman socket`
* **Causa**: La máquina de Podman no está iniciada en Windows/macOS o el socket systemd está apagado en Linux.
* **Solución**:
  ```powershell
  podman machine start
  ```
  O en Linux:
  ```bash
  systemctl --user start podman.socket
  ```

### 2. `Permission denied` al montar volúmenes locales en Linux
* **Causa**: Restricción de contexto SELinux o permisos de usuario UID.
* **Solución**: Asegúrate de que el montaje en `compose.yaml` use `:z` o `:Z`, o ejecuta `podman unshare chown -R 1000:1000 <directorio>`.

### 3. `kind load docker-image` falla con Podman
* **Causa**: Falta la variable `KIND_EXPERIMENTAL_PROVIDER=podman`.
* **Solución**:
  ```powershell
  $env:KIND_EXPERIMENTAL_PROVIDER="podman"
  ```
  Los scripts `deploy-k8s.ps1` y `deploy-k8s.sh` configuran esto automáticamente y cuentan con fallback mediante `podman save` e `image-archive`.

### 4. Puertos privilegiados (<1024) en modo Rootless en Linux
* **Causa**: Por defecto, Linux restringe el enlace a puertos menores a 1024 para usuarios sin privilegios.
* **Solución**:
  ```bash
  sudo sysctl net.ipv4.ip_unprivileged_port_start=80
  ```
