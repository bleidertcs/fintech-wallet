# Configuración de containerd, nerdctl y BuildKit en Linux (Ubuntu)

Este documento detalla la instalación, configuración y resolución de errores comunes al compilar imágenes de contenedor con **nerdctl** y **containerd** en entornos **Linux / Ubuntu** (como WSL2, servidores dedicados o nodos K3s).

---

## 📑 Contenido

1. [Diagnóstico del Error Común: `rootless containerd not running`](#1-diagnóstico-del-error-común-rootless-containerd-not-running)
2. [Método A: Modo Sistema / Root con K3s (Recomendado y más rápido)](#2-método-a-modo-sistema--root-con-k3s-recomendado)
3. [Método B: Modo Rootless (Sin `sudo`)](#3-método-b-modo-rootless-sin-sudo)
4. [Configuración del Demonio BuildKit (`buildkitd`)](#4-configuración-del-demonio-buildkit-buildkitd)
5. [Automatización con Variables de Entorno y Alias](#5-automatización-con-variables-de-entorno-y-alias)
6. [Verificación de Compilación](#6-verificación-de-compilación)

---

## 1. Diagnóstico del Error Común: `rootless containerd not running`

### El Error:
```text
nerdctl --namespace k8s.io build -t fintech/frontend:latest ./frontend
FATA[0000] rootless containerd not running? (hint: use `containerd-rootless-setuptool.sh install` to start rootless containerd): stat /run/user/1000/containerd-rootless: no such file or directory
```

### ¿Por qué ocurre?
Por defecto, cuando ejecutas `nerdctl` como usuario estándar (no-root) en Linux sin privilegios de administrador, intenta conectarse al socket de containerd en modo *rootless* ubicado en `/run/user/1000/containerd-rootless/containerd.sock`. 

Sin embargo, en la mayoría de las instalaciones de Kubernetes (K3s, MicroK8s o containerd del sistema), containerd se ejecuta como un **servicio del sistema con privilegios root** en `/run/k3s/containerd/containerd.sock` o `/run/containerd/containerd.sock`.

---

## 2. Método A: Modo Sistema / Root con K3s (Recomendado)

Si tu clúster es K3s o Rancher Desktop en Linux, el daemon de containerd ya se encuentra activo a nivel de sistema.

### Paso 1: Ejecutar con `sudo` y especificar el socket de K3s

Si utilizas **K3s**, el socket de containerd se ubica en `/run/k3s/containerd/containerd.sock`:

```bash
# Compilar especificando el socket y namespace de K8s
sudo nerdctl --address /run/k3s/containerd/containerd.sock --namespace k8s.io build -t fintech/frontend:latest ./frontend
```

Si utilizas **containerd estándar del sistema**:
```bash
sudo nerdctl --namespace k8s.io build -t fintech/frontend:latest ./frontend
```

---

## 3. Método B: Modo Rootless (Sin `sudo`)

Si prefieres operar completamente en modo *rootless* sin requerir privilegios `sudo`:

### Paso 1: Instalar paquetes prerrequisitos en Ubuntu

```bash
sudo apt-get update
sudo apt-get install -y uidmap dbus-user-session slirp4netns fuse-overlayfs
```

### Paso 2: Instalar containerd Rootless

```bash
containerd-rootless-setuptool.sh install
```

### Paso 3: Iniciar e instalar BuildKit en modo Rootless

`nerdctl build` requiere que el daemon de BuildKit esté en ejecución:

```bash
containerd-rootless-setuptool.sh install-buildkit
```

### Paso 4: Exportar variables de sesión en tu terminal

Agrega a tu `~/.bashrc` o `~/.zshrc`:

```bash
export XDG_RUNTIME_DIR=/run/user/$(id -u)
export CONTAINERD_ADDRESS=/run/user/$(id -u)/containerd-rootless/containerd.sock
export CONTAINERD_NAMESPACE=k8s.io
```

Aplica los cambios:
```bash
source ~/.bashrc
```

---

## 4. Configuración del Demonio BuildKit (`buildkitd`)

La instrucción `nerdctl build` requiere comunicarse con el servicio **BuildKit**. Si al compilar obtienes un error como `buildkitd not running`, inícialo según tu entorno:

### Opción 1: BuildKit como Contenedor en segundo plano (Universal)

```bash
# Iniciar contenedor buildkitd con permisos de compilación
sudo nerdctl --address /run/k3s/containerd/containerd.sock run -d \
  --name buildkitd \
  --restart always \
  --privileged \
  moby/buildkit:latest
```

### Opción 2: BuildKit como Servicio de Systemd en Ubuntu

```bash
# 1. Instalar el binario de buildkit si no está presente
sudo apt-get install -y buildkit

# 2. Habilitar e iniciar el servicio
sudo systemctl enable --now buildkit
```

---

## 5. Automatización con Variables de Entorno y Alias

Para no tener que escribir los flags `--address` y `--namespace` en cada comando, configura un alias permanente en tu archivo `~/.bashrc`:

```bash
# Abrir ~/.bashrc
nano ~/.bashrc
```

Agrega al final del archivo:

```bash
# FinTech Wallet - containerd & nerdctl configuration
export CONTAINERD_NAMESPACE=k8s.io

# Si usas K3s:
export CONTAINERD_ADDRESS=/run/k3s/containerd/containerd.sock
alias knerdctl='sudo nerdctl --address /run/k3s/containerd/containerd.sock --namespace k8s.io'

# Si usas containerd estándar:
alias knerdctl='sudo nerdctl --namespace k8s.io'
```

Recarga la configuración de la terminal:
```bash
source ~/.bashrc
```

---

## 6. Verificación de Compilación

Una vez configurado, puedes compilar todas las imágenes del ecosistema de forma limpia:

```bash
# 1. Frontend Web
knerdctl build -t fintech/frontend:latest ./frontend

# 2. Auth Service
knerdctl build -t fintech/auth-service:nestjs ./backend-nestjs/auth-service

# 3. User Service
knerdctl build -t fintech/user-service:nestjs ./backend-nestjs/user-service

# 4. Transaction Service
knerdctl build -t fintech/transaction-service:nestjs ./backend-nestjs/transaction-service

# 5. Notification Service
knerdctl build -t fintech/notification-service:nestjs ./backend-nestjs/notification-service

# 6. Worker Service
knerdctl build -t fintech/worker-service:nestjs ./backend-nestjs/worker-service
```

### Validar que las imágenes están en el clúster:
```bash
knerdctl images
```

Para continuar con el despliegue de los manifiestos, consulta la [Guía de Inicio Rápido](getting-started.md) o la [Guía de Kubernetes](kubernetes.md).
