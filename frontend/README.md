# Frontend (React + Vite + TailwindCSS)

Aplicación Web Single-Page Application (SPA) para **FinTech Wallet**, construida con **React 19**, **Vite**, **TailwindCSS**, **React Router v7** y **OpenTelemetry Web SDK** para rastreo distribuido de peticiones HTTP en SigNoz APM.

---

## 📁 Estructura del Proyecto

```text
frontend/
├── src/
│   ├── main.jsx                          # Punto de entrada de React con Telemetría
│   ├── App.jsx                           # Enrutamiento principal y Layout
│   ├── telemetry.js                      # Configuración de OpenTelemetry Web SDK (/otlp/v1/traces)
│   ├── index.css                         # Estilos TailwindCSS globales
│   ├── components/                       # Componentes reutilizables (Navbar, Cards, Modals)
│   ├── context/                          # Estado global (AuthContext, ThemeContext)
│   ├── pages/                            # Páginas del Frontend (Dashboard, Transfer, History, etc.)
│   └── services/                         # Clientes API Axios (auth, users, transactions, notifications)
│       └── api.js                        # Configuración Axios con Interceptores JWT
├── public/                               # Recursos estáticos
├── nginx.conf                            # Configuración de Nginx para SPA (try_files index.html)
├── Dockerfile                            # Multi-stage Dockerfile (node:22-alpine + nginx:alpine)
├── .dockerignore                         # Exclusiones de contexto Docker
├── vite.config.js                        # Configuración del empaquetador Vite
├── package.json                          # Scripts y dependencias React/Vite
└── README.md                             # Documentación oficial del Frontend
```

---

## ⚙️ Integración con Microservicios NestJS & Traefik Ingress

El cliente API en `src/services/api.js` utiliza rutas relativas (`baseURL: import.meta.env.VITE_API_URL || '/api'`), permitiendo que el Ingress Controller **Traefik** en Kubernetes enrute de forma transparente:

- `/` → **Frontend (Nginx :80)**
- `/auth` → **Auth Service (NestJS :3001)**
- `/users` → **User Service (NestJS :8082 / gRPC :9090)**
- `/transactions` → **Transaction Service (NestJS :8083)**
- `/notifications` → **Notification Service (NestJS :8084)**

---

## 🧪 Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo local (http://localhost:5173)
npm run dev

# Compilar para producción (genera frontend/dist)
npm run build

# Vista previa de la build local
npm run preview
```

---

## 📦 Construcción y Despliegue en Kubernetes con Podman

```powershell
# 1. Construir la imagen con Podman
podman build -f frontend/Containerfile -t fintech/frontend:1.0.0 ./frontend

# 2. Cargar en el clúster si aplica (ej. en Kind)
# export KIND_EXPERIMENTAL_PROVIDER=podman; kind load docker-image fintech/frontend:1.0.0 --name fintech-wallet

# 3. Desplegar en Kubernetes
kubectl apply -f k8s/03-frontend.yaml
kubectl apply -f k8s/05-ingress.yaml

# 4. Reiniciar el deployment para aplicar la nueva versión
kubectl rollout restart deployment/frontend -n fintech
```
