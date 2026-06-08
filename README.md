# 🍽️ Sabor y Gestión — GUÍA DE CONFIGURACIÓN DEL PROYECTO

[![Turborepo](https://img.shields.io/badge/Turborepo-2.9.1-FF007F?style=for-the-badge&logo=turborepo&logoColor=white)](https://turbo.build/)
[![pnpm Workspaces](https://img.shields.io/badge/pnpm-10.33.0-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.2.1-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-7.8.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4.2.2-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

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
#### 4.1.1 Gestión de Dependencias
Para agregar una nueva dependencia en algún workspace específico, se recomienda utilizar el filtro `--filter` de pnpm. Por ejemplo:

```bash
# Agregar una dependencia de producción al frontend
pnpm --filter frontend add zustand

# Agregar una dependencia de desarrollo al backend
pnpm --filter backend add -D @types/bcryptjs
```
Esto asegura que las dependencias se instalen y registren correctamente en el workspace adecuado, manteniendo la consistencia del monorepo.

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
│   │   │   │   ├── cajero/      # Gestión de caja (apertura, asignación, cierre, movimientos)
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
│   │   │   │   ├── reservas/    # Gestión de reservaciones y disponibilidad
│   │   │   │   ├── reset-password/
│   │   │   │   ├── verify-code/ # Verificación de códigos de seguridad
│   │   │   │   └── zonas/       # Gestión de zonas del restaurante
│   │   │   ├── favicon.ico
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx       # Layout base de Next
│   │   │   └── page.tsx         # Página de inicio del backend
│   │   ├── lib/                 # Instancias y helpers (prisma.ts, pusher.ts, validation.ts)
│   │   ├── prisma/              # Capa de datos (schema.prisma)
│   │   ├── public/              # Archivos estáticos del servidor (SVGs)
│   │   ├── AGENTS.md            # Reglas y contexto para IAs (ej. Cursor)
│   │   ├── CLAUDE.md            # Instrucciones de desarrollo
│   │   ├── eslint.config.mjs    # Configuración de ESLint para Backend
│   │   ├── fix-presentaciones.ts# Script de corrección de datos
│   │   ├── next.config.ts       # Configuración del framework
│   │   ├── package.json         # Dependencias del backend
│   │   ├── postcss.config.mjs   # Configuración de PostCSS
│   │   ├── prisma.config.ts     # Configuración de Prisma
│   │   └── tsconfig.json        # Configuración de TypeScript
│   │
│   └── frontend/                # Interfaz de Usuario (React + Vite + Tailwind)
│       ├── public/              # Recursos públicos (favicon.svg, icons.svg)
│       ├── src/                 # Código fuente
│       │   ├── app/             # Directorio contenedor (con .gitkeep)
│       │   ├── assets/          # Imágenes estáticas (hero.png, react.svg)
│       │   ├── components/      
│       │   │   └── client/      # Componentes aislados (ClientLayout, Card)
│       │   ├── modules/         # Lógica de negocio dividida por dominio/rol
│       │   │   ├── admin/       # Vistas de menú y reservaciones
│       │   │   ├── auth/        # (api, types, formularios y vistas)
│       │   │   ├── cajero/      # Vista central y gestión de caja
│       │   │   ├── cliente/     # Vistas públicas: menú, detalle, pedidos activos
│       │   │   ├── cocina/      # (api, monitor de preparación en tiempo real)
│       │   │   ├── history/     # Historial y reportes (detalles, cierres)
│       │   │   ├── menu/        # (components, types, api, gestión de carta)
│       │   │   ├── mesero/      # Vistas para toma de pedidos y flujo de atención
│       │   │   ├── tables/      # (components, types, gestión visual de mesas)
│       │   │   └── users/       # (api, types, mappers, administración de personal)
│       │   ├── shared/          # Recursos transversales y reutilizables
│       │   │   ├── api/         # Clientes Axios (caja, client-flow, orders, tables)
│       │   │   ├── components/  # UI genérica (AuthLayout, BaseButton, Modals, Inputs, Sidebar, etc.)
│       │   │   ├── constants/   # Definiciones inmutables (roles.ts, routes.ts)
│       │   │   ├── mappers/     # Funciones de transformación de datos (DTOs)
│       │   │   ├── mocks/       # Datos simulados para desarrollo sin backend
│       │   │   ├── types/       # Interfaces y tipos TypeScript globales
│       │   │   └── utils/       # Helpers globales (eventos, pusher, redirecciones, validaciones)
│       │   ├── store/           # Gestión de estado global con Zustand (cajaStore.ts)
│       │   ├── styles/          # Estilos Tailwind y clases personalizadas (globals.css)
│       │   ├── App.css          # Estilos específicos del componente App
│       │   ├── App.tsx          # Router principal de React
│       │   ├── index.css
│       │   └── main.tsx         # Entry point de la aplicación React
│       ├── eslint.config.js     # Configuración de ESLint para Frontend
│       ├── index.html           # Archivo HTML raíz
│       ├── package.json         # Dependencias del frontend
│       ├── tailwind.config.js   # Configuración visual de Tailwind CSS
│       ├── tsconfig.app.json    # Configuración de TypeScript para la app
│       ├── tsconfig.json        # Configuración principal de TypeScript
│       ├── tsconfig.node.json   # Configuración de TypeScript para node/vite
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

---

## 11. COMUNICACIÓN EN TIEMPO REAL (WEBSOCKETS)

El sistema utiliza **Pusher** para enviar notificaciones y actualizaciones instantáneas (por ejemplo, cuando se crea un nuevo pedido o se actualiza el estado de preparación en la cocina).

### Flujo de Trabajo de Eventos:
1. **Backend (Emisor):** Cuando ocurre un cambio relevante en la base de datos (ej. un pedido cambia a listo), el controlador del backend publica un evento en un canal específico de Pusher usando el SDK `pusher`.
2. **Frontend (Receptor):** El cliente React se suscribe a los mismos canales de Pusher utilizando `pusher-js` y reacciona actualizando el estado de la UI en tiempo real (ej. refrescando la lista de pedidos en el monitor de cocina).

### Variables Requeridas para Pusher:
Asegúrese de definir correctamente las variables `PUSHER_*` en el backend y `VITE_PUSHER_*` en el frontend, como se detalla en la sección de **Configuración de Variables de Entorno**.

---

## 12. GESTIÓN DE BASE DE DATOS (PRISMA)

El acceso y manipulación de datos se gestiona mediante **Prisma ORM**. A continuación se listan los comandos esenciales para trabajar con la base de datos desde la raíz del monorepo:

* **Generar el Cliente de Prisma:**
  ```bash
  pnpm --filter backend exec prisma generate
  ```
  *(Debe ejecutarse cada vez que cambie el archivo `schema.prisma`)*

* **Crear y aplicar una Migración en Desarrollo:**
  ```bash
  pnpm --filter backend exec prisma migrate dev --name <nombre_de_la_migracion>
  ```

* **Aplicar Migraciones Pendientes en Producción:**
  ```bash
  pnpm --filter backend exec prisma migrate deploy
  ```

* **Abrir Prisma Studio (Interfaz Gráfica para ver Datos):**
  ```bash
  pnpm --filter backend exec prisma studio
  ```

---

## 13. REFERENCIA DE LA API (ENDPOINTS DEL BACKEND)

A continuación se detallan los endpoints disponibles en el backend (`apps/backend`), organizados por módulos funcionales:

### 13.1 Autenticación y Seguridad

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/login` | Autentica un usuario con sus credenciales y genera la sesión. |
| `POST` | `/api/register` | Registra a un nuevo usuario (personal del local o cliente) aplicando validaciones de datos personales y roles. |
| `POST` | `/api/forgot-password` | Envía un código de verificación de un solo uso por correo para iniciar la recuperación de contraseña. |
| `POST` | `/api/verify-code` | Valida si el código de seguridad ingresado por el usuario es correcto y no ha expirado. |
| `POST` | `/api/reset-password` | Actualiza la contraseña del usuario tras haber validado exitosamente el código de seguridad. |

### 13.2 Gestión de Caja (`apps/backend/app/api/cajero/*`)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/cajero/apertura` | Abre la sesión de caja del turno registrando el saldo inicial en efectivo. |
| `GET` | `/api/cajero/asignacion` | Verifica si el usuario actual (cajero) cuenta con una asignación activa y válida de caja. |
| `POST` | `/api/cajero/movimiento` | Registra un ingreso o egreso manual de dinero con su respectiva justificación. |
| `GET` | `/api/cajero/movimientos` | Obtiene el listado de todos los movimientos de caja registrados durante el turno en curso. |
| `POST` | `/api/cajero/cierre` | Realiza el cierre definitivo de caja, computando totales de ventas, formas de pago (Efectivo/QR), ingresos, egresos y posibles discrepancias. |

### 13.3 Categorías y Productos del Menú

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/categorias` | Retorna todas las categorías activas en el sistema. |
| `POST` | `/api/categorias` | Crea una nueva categoría de menú (ej. Bebidas, Postres) aplicando validación de caracteres. |
| `PATCH` | `/api/categorias/[id]` | Modifica el nombre, descripción o estado de una categoría específica. |
| `DELETE` | `/api/categorias/[id]` | Desactiva o elimina una categoría del menú. |
| `GET` | `/api/productos` | Obtiene el listado de todos los productos y platos disponibles. |
| `POST` | `/api/productos` | Crea un nuevo producto (asociando categorías, precios y presentaciones). |
| `PATCH` | `/api/productos/[id]` | Edita los detalles, disponibilidad, precios o presentaciones de un producto. |
| `DELETE` | `/api/productos/[id]` | Desactiva un producto del catálogo general. |

### 13.4 Carta Digital y Búsqueda

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/menu` | Retorna el menú completo estructurado por categorías y productos (optimizado para clientes). |
| `GET` | `/api/busqueda` | Endpoint global de búsqueda rápida para filtrar elementos del panel de control. |
| `GET` | `/api/health/db` | Healthcheck que verifica la conexión activa con la base de datos de PostgreSQL. |

### 13.5 Gestión de Mesas

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/mesas` | Obtiene el listado general de mesas del restaurante con su estado actual (`LIBRE`, `OCUPADA`, `RESERVADA`, etc.). |
| `GET` | `/api/mesas/[id]` | Obtiene el estado y detalles específicos de una mesa determinada por su ID. |
| `PATCH` | `/api/mesas/[id]` | Modifica el estado o configuración de una mesa de manera directa. |

### 13.6 Pedidos y Flujo de Cocina

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/pedidos` | Crea un nuevo pedido inicial vinculándolo a una mesa y detallando los ítems seleccionados. |
| `GET` | `/api/pedidos/activos` | Devuelve todos los pedidos activos en preparación o listos para ser entregados. |
| `GET` | `/api/pedidos/historial` | Lista el historial completo de pedidos finalizados (pagados o cancelados) en el local. |
| `GET` | `/api/pedidos/mesa/[tableId]` | Obtiene la información del pedido activo asociado a una mesa específica. |
| `GET` | `/api/pedidos/mesero/[id]` | Obtiene la lista de pedidos atendidos o pendientes a cargo de un mesero específico. |
| `PATCH` | `/api/pedidos/[id]/estado` | Cambia el estado del pedido completo (`PREPARANDOSE`, `LISTO`, `ENTREGADO`, `CANCELADO`). |
| `POST` | `/api/pedidos/[id]/cocina` | Envía formalmente los platos o ítems de un pedido al monitor en tiempo real de la cocina. |
| `POST` | `/api/pedidos/[id]/detalles` | Añade nuevos productos o platos a un pedido que ya se encuentra abierto/activo. |
| `PATCH` | `/api/pedidos/[id]/detalles/[itemId]` | Modifica la cantidad, especificaciones o notas de preparación de un ítem del pedido. |
| `DELETE` | `/api/pedidos/[id]/detalles/[itemId]` | Elimina un ítem específico de un pedido activo. |
| `POST` | `/api/pedidos/reserva` | Crea un pedido vinculado a una reserva de mesa previamente confirmada. |

### 13.7 Clientes e Historiales

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/clientes/ci/[ci]` | Busca a un cliente por su número de Cédula de Identidad (CI) para autocompletar su información de facturación. |
| `GET` | `/api/clientes/pedidos/historial` | Obtiene el registro histórico de consumos y visitas realizadas por un cliente. |

### 13.8 Gestión de Reservas

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/reservas` | Obtiene el listado completo de reservaciones de mesas. |
| `POST` | `/api/reservas` | Registra una nueva reserva especificando mesa, fecha, hora y datos del cliente. |
| `PATCH` | `/api/reservas/[id]` | Modifica el estado o los datos principales de una reserva activa. |
| `POST` | `/api/reservas/mesa/[tableId]/cancelar` | Cancela la reserva activa asociada a una mesa específica para liberarla de inmediato. |
| `GET` | `/api/reservas/cliente/[userId]` | Retorna todas las reservas previas y futuras creadas por un usuario cliente determinado. |

### 13.9 Administración Avanzada (`/api/admin/*`)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/admin/mesas` | Listado completo de mesas y su asignación a nivel de zonas del local para tareas de gestión. |
| `GET` | `/api/admin/zonas` | Obtiene el listado de zonas del restaurante (ej. Terraza, Salón Principal). |
| `POST` | `/api/admin/zonas` | Crea una nueva zona en el mapa de distribución física del restaurante. |
| `PATCH` | `/api/admin/usuarios` | Actualiza la información laboral del personal (roles de usuario, estado activo/inactivo). |
| `POST` | `/api/admin/pagos` | Registra el pago final de una cuenta de mesa, emite el recibo/comprobante y libera la mesa para nuevos clientes. |
| `GET` | `/api/admin/historial-caja` | Consolidado totalizador de transacciones de pago e ingresos/egresos de caja para auditoría administrativa. |
| `GET` | `/api/admin/seed` | Proceso especial para poblar la base de datos de desarrollo y pruebas con datos semilla. |


