# GUÍA DE CONFIGURACIÓN DEL PROYECTO — ARQUITECTURA MONOREPO  
Turborepo · pnpm Workspaces · PostgreSQL + Prisma

---

## 1. DESCRIPCIÓN GENERAL

Este documento describe la configuración, estructura y flujos de trabajo del repositorio monorepo del proyecto.  

Está destinado a todos los miembros del equipo de desarrollo y debe consultarse antes de realizar cualquier tipo de contribución al código base.

---

## 2. ARQUITECTURA DEL SISTEMA

El proyecto adopta una arquitectura monorepo gestionada mediante Turborepo y pnpm Workspaces, lo que permite compartir configuraciones y dependencias entre las distintas aplicaciones de forma eficiente.

| Capa              | Tecnología                                           | Ubicación        |
|------------------|------------------------------------------------------|------------------|
| Frontend         | React 19, Vite, Tailwind CSS 4, TypeScript          | apps/frontend    |
| Backend / API    | Next.js 16 (App Router), Prisma ORM                 | apps/backend     |
| Base de Datos    | PostgreSQL (via Supabase)                           | —                |
| Gestión Monorepo | Turborepo + pnpm Workspaces                         | raíz del proyecto|


---

## 3. REQUISITOS PREVIOS

Antes de clonar o ejecutar el proyecto, asegúrese de contar con los siguientes elementos instalados y configurados en su entorno de desarrollo:

- pnpm versión 10.33.0 o superior  
- Node.js compatible con las versiones de las dependencias del proyecto  
- Una instancia de PostgreSQL activa y accesible (se recomienda Supabase)  

---

## 4. CONFIGURACIÓN INICIAL

### 4.1 Instalación de Dependencias

Ejecute el siguiente comando desde la raíz del monorepo para instalar todas las dependencias de los workspaces:

```bash
pnpm install
```
#### 4.1.1 Poner las dependencias 
El formato ejemplo esta debajo de estos pasos

### 4.2 Generación del Cliente de Prisma

Este paso es obligatorio para que la API pueda interactuar con la base de datos(previamente se debe crear los .env y poner las credenciales). Debe ejecutarse inmediatamente después de la instalación de dependencias:

```bash
pnpm --filter backend exec prisma generate
```

### 4.3 Configuración de Variables de Entorno

Cada aplicación requiere su propio archivo `.env`. Tome como referencia el archivo `.env.example` ubicado en la raíz del proyecto.

#### BACKEND — `apps/backend/.env`

| Variable                  | Descripción / Valor de Referencia                         |
|---------------------------|----------------------------------------------------------|
| PORT                      | 3001                                                     |
| DATABASE_URL              | postgresql://... (conexión pooled, pgbouncer=true)       |
| DIRECT_URL                | postgresql://... (conexión directa para migraciones)     |
| SUPABASE_URL              | URL pública del proyecto en Supabase                     |
| SUPABASE_PUBLISHABLE_KEY  | Clave pública de Supabase                                |
| SUPABASE_SECRET_KEY       | Clave secreta de Supabase (confidencial)                 |
| WEB_URL                   | http://localhost:4000/ (CORS hacia el frontend)          |
|PUSHER_APP_ID              |ID de la aplicación en el panel de Pusher Channels        |
|PUSHER_KEY                 |Clave pública de Pusher para la conexión de WebSockets    |
|PUSHER_SECRET              |Clave secreta de Pusher (estrictamente confidencial)      |
|PUSHER_CLUSTER             |Región del clúster asignado en Pusher (ej. us2, sa1)      |

#### FRONTEND — `apps/frontend/.env`

| Variable           | Descripción / Valor de Referencia                         |
|--------------------|-----------------------------------------------------------|
| VITE_API_URL       | http://localhost:3001/                                    |
| VITE_PORT          | 4000                                                      |
|VITE_PUSHER_KEY     |Clave pública de Pusher (debe coincidir con la del backend)|
|VITE_PUSHER_CLUSTER |Región del clúster de Pusher                               |

---

## 5. EJECUCIÓN DEL PROYECTO

Los siguientes comandos deben ejecutarse desde la raíz del monorepo:

| Comando              | Descripción                                   | Puerto |
|---------------------|-----------------------------------------------|--------|
| pnpm dev            | Levanta todas las aplicaciones                | —      |
| pnpm dev:frontend   | Levanta únicamente el Frontend                | 4000   |
| pnpm dev:backend    | Levanta únicamente el Backend / API           | 3001   |

---

## 6. CALIDAD DE CÓDIGO

Es obligatorio ejecutar los siguientes comandos antes de realizar cualquier push:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

| Comando         | Propósito                                                                 |
|-----------------|---------------------------------------------------------------------------|
| pnpm lint       | Aplica reglas de estilo y detecta errores comunes                         |
| pnpm typecheck  | Valida la integridad de los tipos de TypeScript                          |
| pnpm build      | Compila el monorepo completo (con cache de Turborepo)                    |

---

## 7. ESTRATEGIA DE RAMAS (GIT FLOW)

### 7.1 Rama main — Producción

Contiene el código estable y listo para despliegue.

**Restricción:**  
Está estrictamente prohibido trabajar directamente sobre esta rama.  
Solo recibe cambios mediante Pull Requests desde `develop`.

---

### 7.2 Rama develop — Integración

Rama principal donde se integran nuevas funcionalidades y se validan compatibilidades entre Frontend y Backend.

**Requisito obligatorio antes de integrar cambios:**

```bash
pnpm lint
pnpm typecheck
```

---

## 8. ESTRUCTURA DE CARPETAS

## 8. ESTRUCTURA DE CARPETAS

```text
Sabor-y-Gestion/
├── .github/
│   └── workflows/               # Pipelines de CI/CD (GitHub Actions)
├── apps/                        # Directorio de aplicaciones (Workspaces)
│   │
│   ├── backend/                 # API & Servidor (Next.js + Prisma)
│   │   ├── app/                 # App Router de Next.js
│   │   │   ├── api/             # Endpoints de la API
│   │   │   │   ├── admin/       # Gestión de mesas, usuarios y zonas
│   │   │   │   ├── busqueda/    # Endpoint de búsqueda global
│   │   │   │   ├── categorias/  # CRUD y servicios de categorías
│   │   │   │   ├── clientes/    # Búsqueda por CI y su historial
│   │   │   │   ├── cocina/      # Monitor, armado y detalle de pedidos
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── health/      # Healthcheck de Base de Datos
│   │   │   │   ├── login/       # Autenticación
│   │   │   │   ├── menu/        # Obtención de la carta
│   │   │   │   ├── mesas/       # Obtención y estados individuales
│   │   │   │   ├── pedidos/     # Activos, estado, historial y detalles por mesa
│   │   │   │   ├── productos/   # CRUD y servicios de productos
│   │   │   │   ├── register/    # Registro de usuarios
│   │   │   │   ├── reset-password/
│   │   │   │   ├── verify-code/ # Verificación de códigos de seguridad
│   │   │   │   └── zonas/       # Gestión de zonas del restaurante
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx       # Layout base de Next
│   │   │   └── page.tsx         # Página de inicio del backend
│   │   ├── lib/                 # Instancias globales (prisma.ts, pusher.ts)
│   │   ├── prisma/              # Capa de datos (schema.prisma)
│   │   ├── public/              # Archivos estáticos del servidor (SVGs)
│   │   ├── AGENTS.md            # Reglas y contexto para IAs (ej. Cursor)
│   │   ├── CLAUDE.md            # Instrucciones de desarrollo
│   │   ├── fix-presentaciones.ts# Script de corrección de datos
│   │   ├── next.config.ts       # Configuración del framework
│   │   ├── package.json         # Dependencias del backend
│   │   ├── prisma.config.ts     # Configuración de Prisma
│   │   └── tsconfig.json        # Configuración de TypeScript
│   │
│   └── frontend/                # Interfaz de Usuario (React + Vite + Tailwind)
│       ├── public/              # Recursos públicos (favicon.svg, icons.svg)
│       ├── src/                 # Código fuente
│       │   ├── assets/          # Imágenes estáticas (hero.png, react.svg)
│       │   ├── components/      
│       │   │   └── client/      # Componentes aislados (ClientLayout, Card)
│       │   ├── modules/         # Lógica de negocio dividida por dominio/rol
│       │   │   ├── admin/       # Vistas de menú y reservaciones
│       │   │   ├── auth/        # (api, types, formularios y vistas)
│       │   │   ├── cajero/      # Vista central de caja
│       │   │   ├── cliente/     # Vistas públicas: menú, detalle, pedidos activos
│       │   │   ├── cocina/      # (api, monitor de preparación en tiempo real)
│       │   │   ├── menu/        # (components, types, api, gestión de carta)
│       │   │   ├── mesero/      # Vistas para toma de pedidos y flujo de atención
│       │   │   ├── tables/      # (components, types, gestión visual de mesas)
│       │   │   └── users/       # (api, types, mappers, administración de personal)
│       │   ├── shared/          # Recursos transversales y reutilizables
│       │   │   ├── api/         # Clientes Axios (client-flow, orders)
│       │   │   ├── components/  # UI genérica (AuthLayout, BaseButton, Modals, Inputs)
│       │   │   ├── constants/   # Definiciones inmutables (roles.ts, routes.ts)
│       │   │   ├── mappers/     # Funciones de transformación de datos (DTOs)
│       │   │   ├── mocks/       # Datos simulados para desarrollo sin backend
│       │   │   ├── types/       # Interfaces y tipos TypeScript globales
│       │   │   └── utils/       # Helpers globales (eventos, pusher, redirecciones)
│       │   ├── styles/          # Estilos Tailwind y clases personalizadas (globals.css)
│       │   ├── App.tsx          # Router principal de React
│       │   ├── index.css
│       │   └── main.tsx         # Entry point de la aplicación React
│       ├── index.html           # Archivo HTML raíz
│       ├── package.json         # Dependencias del frontend
│       ├── tailwind.config.js   # Configuración visual de Tailwind CSS
│       ├── tsconfig.json        # Configuración principal de TypeScript
│       └── vite.config.ts       # Configuración del bundler Vite
│
├── .env.example                 # Plantilla base de variables de entorno
├── .gitignore                   # Archivos ignorados en control de versiones
├── package.json                 # Scripts de control globales (dev, build, lint)
├── pnpm-lock.yaml               # Bloqueo estricto de dependencias
├── pnpm-workspace.yaml          # Configuración de las aplicaciones del monorepo
├── README.md                    # Documentación principal del repositorio
└── turbo.json                   # Configuración del pipeline de tareas de Turborepo
```

---

## 9. CONSIDERACIONES DE SEGURIDAD

- Nunca commitear archivos `.env`  
- `SUPABASE_SECRET_KEY` es estrictamente confidencial  
- Utilizar `.env.example` como plantilla base  

---
---

---

## 10. INTEGRACIÓN Y DESPLIEGUE CONTINUO (CI/CD)

El proyecto utiliza **GitHub Actions** para automatizar la validación y el despliegue. El flujo está diseñado para garantizar la estabilidad de las ramas principales.

### 10.1 Restricciones de Acceso y Commits
- **Ramas Protegidas:** Las ramas `main` y `develop` están bloqueadas para commits directos.
- **Flujo de Trabajo:** Está estrictamente prohibido intentar realizar un `git commit` o `git push` directamente a estas ramas. 
- **Integración:** Toda mejora o corrección debe realizarse en ramas de funcionalidad (*feature branches*) y enviarse mediante un **Pull Request** hacia `develop` o `main`.

### 10.2 Disparadores del Pipeline (Triggers)
El pipeline de CI/CD se activa automáticamente en:
- **Push**: Al subir cambios a las ramas de trabajo que tengan un Pull Request abierto.
- **Pull Requests**: Al abrir o actualizar una solicitud hacia `main` o `develop`.

### 10.3 Jobs del Pipeline

| Job | Descripción | Requisito |
| :--- | :--- | :--- |
| **Validate** | Instala dependencias con pnpm, genera el cliente de Prisma y ejecuta `lint`, `typecheck` y `build`. | Ninguno |
| **Deploy** | Ejecuta el despliegue automático a producción. | Solo se activa en un merge/push a `main` tras validar con éxito. |

### 10.4 Configuración de Secretos
Es obligatorio configurar los secretos en GitHub (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`) para que el entorno de CI pueda generar el cliente de Prisma y validar el build correctamente.
