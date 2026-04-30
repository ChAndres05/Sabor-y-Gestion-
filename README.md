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

#### FRONTEND — `apps/frontend/.env`

| Variable        | Descripción / Valor de Referencia |
|-----------------|----------------------------------|
| VITE_API_URL    | http://localhost:3001/           |
| VITE_PORT       | 4000                             |

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

```
## 1. RAIZ DEL PROYECTO (Workspace)
Sabor-y-Gestion/
├── .github/workflows/           # Pipelines de CI/CD (GitHub Actions)
├── apps/                        # Directorio de aplicaciones
├── .env.example                 # Plantilla de variables de entorno
├── .gitignore                   # Archivos ignorados por Git
├── package.json                 # Scripts globales y dependencias de raíz
├── pnpm-lock.yaml               # Bloqueo de versiones de pnpm
├── pnpm-workspace.yaml          # Configuración de espacios de trabajo
├── README.md                    # Documentación general
└── turbo.json                   # Configuración de Turborepo

## 2. BACKEND (API & Servidor)
Ubicación: apps/backend/
Tecnología: Next.js + Prisma

Sabor-y-Gestion/apps/backend/
├── app/api/                     # Endpoints (App Router)
│   ├── admin/                   # Rutas administrativas
│   │   ├── mesas/               # CRUD de mesas
│   │   ├── usuarios/            # Gestión de staff
│   │   └── zonas/               # Gestión de áreas
│   ├── auth/                    # Lógica de autenticación
│   │   ├── login/               # Inicio de sesión
│   │   ├── register/            # Registro
│   │   ├── forgot-password/     # Recuperación
│   │   ├── reset-password/      # Cambio de clave
│   │   └── verify-code/         # Verificación
│   ├── busqueda/                # Búsqueda global
│   ├── categorias/              # CRUD de categorías del menú
│   ├── health/db/               # Verificación de BD
│   └── zonas/                   # Detalle de zonas
├── lib/                         # Librerías (prisma.ts)
├── prisma/                      # Capa de datos
│   └── schema.prisma            # Modelo de BD
├── public/                      # Archivos estáticos
├── next.config.ts               # Configuración Next
├── package.json                 # Dependencias backend
└── tsconfig.json                # Configuración TS

## 3. FRONTEND (Interfaz de Usuario)
Ubicación: apps/frontend/
Tecnología: React + Vite + Tailwind

Sabor-y-Gestion/apps/frontend/
├── public/                      # Assets estáticos
├── src/
│   ├── assets/                  # Imágenes y recursos
│   ├── modules/                 # Lógica por dominio y rol
│   │   ├── admin/               # Panel admin
│   │   ├── auth/                # Login, Register, Forgot Password
│   │   ├── cajero/              # Interfaz de caja
│   │   ├── cliente/             # Vista cliente/pedido
│   │   ├── cocina/              # Vista preparación
│   │   ├── menu/                # Gestión de carta
│   │   ├── mesero/              # Toma de pedidos
│   │   ├── profile/             # Perfil
│   │   ├── tables/              # Salón y mesas
│   │   └── users/               # Gestión staff
│   ├── shared/                  # Core reutilizable
│   │   ├── components/          # Botones, Modales, Inputs base
│   │   ├── constants/           # Roles y Rutas
│   │   ├── mocks/               # Datos simulados
│   │   └── utils/               # Helpers y redirecciones
│   ├── store/                   # Estado global
│   ├── styles/                  # Estilos (globals.css)
│   ├── App.tsx                  # Router
│   └── main.tsx                 # Entrada React
├── index.html                   # Entry point HTML
├── package.json                 # Dependencias frontend
├── tailwind.config.js           # Estilos Tailwind
└── vite.config.ts               # Configuración Vite
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
