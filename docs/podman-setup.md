# 🦭 Guía Completa de Configuración de Podman y Kubernetes

Esta guía detalla el aprovisionamiento, optimización y resolución de problemas para el uso de **Podman**, **Podman Desktop**, **Podman Machine**, **Rootless Containers** y los clústeres de **Kubernetes soportados (Kind y K3s)** en el ecosistema **FinTech Wallet**.

---

## 📑 Tabla de Contenidos

1. [¿Por qué Podman en FinTech Wallet?](#-por-qué-podman-en-fintech-wallet)
2. [Instalación y Configuración Base de Podman](#-instalación-y-configuración-base-de-podman)
   - [Windows (Podman Desktop & WSL2)](#windows-podman-desktop--wsl2)
   - [Linux (Ubuntu / Debian / Fedora)](#linux-ubuntu--debian--fedora)
   - [macOS](#macos)
3. [Configuración de Podman Machine (Windows / macOS)](#-configuración-de-podman-machine-windows--macos)
4. [Modo Rootless y Permisos de Volúmenes (SELinux / :Z)](#-modo-rootless-y-permisos-de-volúmenes-selinux--z)
5. [Uso de `compose.yaml` con Podman](#-uso-de-composeyaml-con-podman)
6. [Alternativas de Clústeres Kubernetes Paso a Paso](#-alternativas-de-clústeres-kubernetes-paso-a-paso)
   - [Alternativa A: Kind con Proveedor Podman (Desarrollo Local en Windows/Linux/macOS)](#alternativa-a-kind-con-proveedor-podman-desarrollo-local)
   - [Alternativa B: K3s con Podman Rootless (Servidores Linux / VMs / Bare Metal)](#alternativa-b-k3s-con-podman-rootless-servidores-linux--vms)
   - [Alternativa C: Podman Desktop con Kind Embebido (Entorno Gráfico)](#alternativa-c-podman-desktop-con-kind-embebido-entorno-gráfico)
7. [Construcción de Imágenes con `Containerfile`](#-construcción-de-imágenes-con-containerfile)
8. [Despliegue Automatizado con `deploy-k8s.ps1` / `deploy-k8s.sh`](#-despliegue-automatizado-con-deploy-k8sps1--deploy-k8ssh)
9. [Diagnóstico y Resolución de Problemas Frecuentes](#-diagnóstico-y-resolución-de-problemas-frecuentes)

---

## 🎯 ¿Por qué Podman en FinTech Wallet?

* 🛡️ **Seguridad Rootless**: Permite ejecutar contenedores sin privilegios de `root` ni demonios con privilegios elevados (`dockerd`), aislando el entorno de desarrollo y producción.
* 📦 **Estándares OCI y Containerfile**: Compatibilidad nativa con imágenes OCI, `Containerfile` y especificaciones de `compose.yaml`.
* ☸️ **Afinidad con Kubernetes**: Filosofía de Pods nativos (`podman pod`, `podman kube play`) e interoperabilidad nativa con Kind y K3s.
* ⚡ **Arquitectura Fork-Exec**: Sin demonio central que represente un único punto de fallo (*single point of failure*).

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

## ☸️ Alternativas de Clústeres Kubernetes Paso a Paso

FinTech Wallet está optimizado para funcionar con dos alternativas principales de Kubernetes utilizando Podman:

### 🧭 Criterio de Selección: ¿Kind o K3s?

| Criterio | 📦 **Kind** (Kubernetes in Docker/Podman) | 🚀 **K3s** (Lightweight Kubernetes) |
| :--- | :--- | :--- |
| **Uso principal** | **Desarrollo local** en tu PC/Laptop. | **Servidores Linux**, VMs dedicadas o producción ligera. |
| **¿Cómo corre?** | Cada nodo es un **contenedor OCI** dentro de Podman/Docker. | Corre como un **servicio nativo del sistema** (`systemd`). |
| **Ingress Controller** | No incluye Ingress por defecto (se instalan CRDs de Traefik). | Incluye **Traefik Ingress Controller** de fábrica. |
| **Almacenamiento** | `standard` (Kind host-path). | `local-path` nativo preconfigurado. |
| **Sistemas Recomendados** | **Windows (WSL2 / Podman Desktop) y macOS**. | **Servidores Ubuntu / Debian / RHEL / CentOS**. |

> [!TIP]
> **Regla práctica**:
> - Si estás en tu **computadora personal con Windows** para programar y depurar: usa **Kind**.
> - Si estás en un **servidor remoto o máquina virtual Linux** (como un host de infraestructura): usa **K3s**.

---

### Alternativa A: Kind con Proveedor Podman (Desarrollo Local)

**Kind** ejecuta cada nodo de Kubernetes como un contenedor OCI dentro de Podman.

#### Paso 1: Instalación de Kind y Kubectl

* **En Windows**:
  ```powershell
  winget install Kubernetes.kind
  winget install Kubernetes.kubectl
  ```
  *(O vía Chocolatey: `choco install kind kubernetes-cli`).*

* **En Linux (Ubuntu / Debian / Fedora / RHEL)**:
  ```bash
  # Descargar binario oficial de Kind
  curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.27.0/kind-linux-amd64
  chmod +x ./kind
  sudo mv ./kind /usr/local/bin/kind

  # Instalar kubectl
  sudo apt update && sudo apt install -y kubectl
  ```

* **En macOS**:
  ```bash
  brew install kind kubectl
  ```

#### Paso 2: Configurar el Proveedor Podman
Es obligatorio indicarle a Kind que utilice el motor de Podman:
* **PowerShell (Windows)**:
  ```powershell
  $env:KIND_EXPERIMENTAL_PROVIDER="podman"
  ```
* **Bash (Linux / macOS / WSL2)**:
  ```bash
  export KIND_EXPERIMENTAL_PROVIDER=podman
  ```

#### Paso 3: Crear el Clúster Kind con Mapeo de Puertos
Para acceder al Frontend (NodePort 30000), SigNoz APM (NodePort 30301) y Traefik Ingress (80/443), crea un archivo `kind-config.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
      - containerPort: 30000
        hostPort: 30000
        protocol: TCP
      - containerPort: 30301
        hostPort: 30301
        protocol: TCP
```

Crea el clúster con:
```bash
kind create cluster --name fintech --config kind-config.yaml
```

#### Paso 4: Instalar los CRDs de Traefik (si no están presentes)
```bash
kubectl apply -f https://raw.githubusercontent.com/traefik/traefik/v3.1/docs/content/reference/dynamic-configuration/kubernetes-crd-definition-v1.yml
```

#### Paso 5: Compilar y Cargar las Imágenes en Kind
Construye las imágenes con Podman y cárgalas en el clúster:
```bash
# 1. Compilar microservicio
podman build -f backend-nestjs/auth-service/Containerfile -t fintech/auth-service:1.0.0 ./backend-nestjs/auth-service

# 2. Cargar en Kind mediante archivo tar (método más confiable con Podman):
podman save --format docker-archive -o /tmp/auth-service.tar docker.io/fintech/auth-service:1.0.0
kind load image-archive /tmp/auth-service.tar --name fintech
rm -f /tmp/auth-service.tar
```

*(El script `deploy-k8s.ps1` o `deploy-k8s.sh` ejecuta todos estos pasos de compilación y carga automáticamente).*

#### Paso 6: Aplicar los Manifiestos
```bash
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/01-infrastructure.yaml
kubectl apply -f k8s/02-microservices.yaml
kubectl apply -f k8s/03-frontend.yaml
kubectl delete job signoz-migrator -n fintech --ignore-not-found
kubectl apply -f k8s/04-observability.yaml
kubectl apply -f k8s/05-ingress.yaml
kubectl apply -f k8s/06-networkpolicy.yaml
kubectl apply -f k8s/07-backup-cronjob.yaml
kubectl apply -f k8s/09-hpa.yaml
kubectl apply -f k8s/10-pdb.yaml
```

---

### Alternativa B: K3s con Podman Rootless (Servidores Linux / VMs)

**K3s** es una distribución de Kubernetes certificada, ligera y altamente optimizada que incluye **Traefik Ingress Controller** y el proveedor de almacenamiento **Local Path Provisioner** de fábrica.

#### Paso 1: Instalación de K3s

* **En Linux (Servidor / VM / Bare Metal)** — *Recomendado*:
  ```bash
  curl -sfL https://get.k3s.io | sh -
  ```

* **En Windows (vía WSL2 Ubuntu)**:
  ```bash
  wsl -d Ubuntu
  curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
  ```

#### Paso 2: Configurar Acceso a Kubectl para tu Usuario
Para administrar el clúster sin necesidad de ser `root`:
```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown -R $USER:$USER ~/.kube
chmod 600 ~/.kube/config
export KUBECONFIG=~/.kube/config
echo "export KUBECONFIG=~/.kube/config" >> ~/.bashrc
```

#### Paso 3: Configurar Permisos de `sudo` para Carga Automática en Containerd
En Linux con Podman Rootless:
* Podman compila las imágenes en el espacio de usuario (`~/.local/share/containers/storage`).
* K3s ejecuta los Pods utilizando **containerd** (`/var/lib/rancher/k3s/agent/containerd/`).

Para permitir que el script importe las imágenes compiladas a containerd sin solicitar contraseña interactiva en cada imagen:
```bash
echo "$USER ALL=(ALL) NOPASSWD:ALL" | sudo tee /etc/sudoers.d/$USER
```

#### Paso 4: Compilación, Exportación e Importación de Imágenes
Las imágenes se compilan con Podman, se exportan en formato estándar `docker-archive` tar y se importan al containerd de K3s:

```bash
# 1. Compilar imagen
podman build -f backend-nestjs/auth-service/Containerfile -t fintech/auth-service:1.0.0 ./backend-nestjs/auth-service

# 2. Exportar en formato docker-archive
podman save --format docker-archive -o /tmp/auth-service.tar docker.io/fintech/auth-service:1.0.0

# 3. Importar a containerd de K3s
sudo k3s ctr images import /tmp/auth-service.tar
rm -f /tmp/auth-service.tar

# 4. Limpiar capas intermedias de compilación para liberar espacio en disco
podman image prune -f
```

#### Paso 5: Despliegue Automatizado
Para ejecutar todo el flujo (compilación, poda, importación y aplicación de manifiestos) en un solo comando:
```bash
./deploy-k8s.sh --recreate --non-interactive
```

---

### Alternativa C: Podman Desktop con Kind Embebido (Entorno Gráfico)

Si prefieres administrar tu entorno mediante una interfaz gráfica en Windows o macOS:

1. Abre **Podman Desktop**.
2. Ve a **Settings (Configuración)** -> **Resources (Recursos)** y asegúrate de que la Podman Machine tenga al menos **8 GB de RAM** y **4 CPUs**.
3. Ve a **Extensions (Extensiones)** e instala la extensión oficial de **Kind**.
4. Haz clic en **Create Cluster** dentro de la sección Kind para inicializar el clúster.
5. Abre una terminal y ejecuta el script automatizado:
   ```powershell
   .\deploy-k8s.ps1
   ```

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
