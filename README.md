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
| PUSHER_APP_ID              | ID de la aplicación en el panel de Pusher Channels        |
| PUSHER_KEY                 | Clave pública de Pusher para la conexión de WebSockets    |
| PUSHER_SECRET              | Clave secreta de Pusher (estrictamente confidencial)      |
| PUSHER_CLUSTER             | Región del clúster asignado en Pusher (ej. us2, sa1)      |
| JWT_SECRET                 | Clave secreta para la firma y verificación de tokens JWT  |
| EMAIL_USER                 | Dirección de correo de Gmail usada para envíos automáticos|
| EMAIL_PASS                 | Contraseña de aplicación de Gmail para el servidor SMTP   |

#### FRONTEND — `apps/frontend/.env`

| Variable           | Descripción / Valor de Referencia                         |
|--------------------|-----------------------------------------------------------|
| VITE_API_URL       | http://localhost:3001/                                    |
| VITE_PORT          | 4000                                                      |
| VITE_PUSHER_KEY     | Clave pública de Pusher (debe coincidir con la del backend)|
| VITE_PUSHER_CLUSTER | Región del clúster de Pusher                               |

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
│   │   │   │   ├── admin/       # Gestión de mesas, usuarios, zonas, config y cupones
│   │   │   │   ├── busqueda/    # Endpoint de búsqueda global
│   │   │   │   ├── cajero/      # Gestión de caja (apertura, asignación, cierre, movimientos)
│   │   │   │   ├── categorias/  # CRUD y servicios de categorías
│   │   │   │   ├── clientes/    # Búsqueda por CI y su historial
│   │   │   │   ├── cocina/      # Monitor, armado y detalle de pedidos
│   │   │   │   ├── debug-db/    # Diagnóstico de base de datos
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── health/      # Healthcheck de Base de Datos
│   │   │   │   ├── insumos/     # Gestión de materias primas e insumos
│   │   │   │   ├── login/       # Autenticación
│   │   │   │   ├── menu/        # Obtención de la carta
│   │   │   │   ├── mesas/       # Obtención y estados individuales
│   │   │   │   ├── movimientos-stock/ # Flujo de inventario (entradas, salidas, ajustes)
│   │   │   │   ├── pedidos/     # Activos, estado, historial, delivery y detalles
│   │   │   │   ├── productos/   # CRUD y servicios de productos
│   │   │   │   ├── recetas/     # Fórmulas de platos (ingredientes / insumos)
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
│       │   │   ├── admin/       # Vistas de menú, reservaciones y cupones
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
│   └── qa/                      # Suite de Pruebas Automatizadas (Playwright)
│       ├── tests/               # Pruebas de integración de API y E2E
│       ├── playwright.config.ts # Configuración global de Playwright
│       └── package.json         # Dependencias del workspace de QA
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

### 13.4 Carta Digital, Búsqueda y Diagnóstico

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/menu` | Retorna el menú completo estructurado por categorías y productos (optimizado para clientes). |
| `GET` | `/api/busqueda` | Endpoint global de búsqueda rápida para filtrar elementos del panel de control. |
| `GET` | `/api/health/db` | Healthcheck que verifica la conexión activa con la base de datos de PostgreSQL. |
| `GET` | `/api/debug-db` | Endpoint de diagnóstico para verificar el estado de tablas y conectividad de la BD. |

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
| `GET` | `/api/pedidos/[id]/factura` | Obtiene/Genera el recibo o factura del pedido en formato PDF/Excel. |

### 13.6.1 Pedidos de Delivery

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/pedidos/delivery` | Obtiene el listado completo de pedidos de delivery registrados en el sistema. |
| `POST` | `/api/pedidos/delivery` | Registra un nuevo pedido de delivery, reduciendo el stock de insumos de las recetas asociadas. |
| `PATCH` | `/api/pedidos/delivery/[id]/estado` | Actualiza el estado del delivery (ej. EN_CAMINO, ENTREGADO). En estado PAGADO se procesa el cobro en caja y emisión de factura. |
| `GET` | `/api/pedidos/delivery/[id]/track` | Obtiene las coordenadas de latitud/longitud actuales para el seguimiento del repartidor. |
| `POST` | `/api/pedidos/delivery/[id]/track` | Actualiza las coordenadas de ubicación del repartidor en tiempo real. |

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
| `DELETE` | `/api/reservas/[id]` | Elimina físicamente una reservación del sistema. |
| `POST` | `/api/reservas/mesa/[tableId]/cancelar` | Cancela la reserva activa asociada a una mesa específica para liberarla de inmediato. |
| `GET` | `/api/reservas/cliente/[userId]` | Retorna todas las reservas previas y futuras creadas por un usuario cliente determinado. |

### 13.9 Administración Avanzada (`/api/admin/*`)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/admin/mesas` | Listado completo de mesas y su asignación a nivel de zonas del local para tareas de gestión. |
| `PUT` | `/api/admin/mesas/[id]` | Modifica la configuración (número, capacidad, zona) de una mesa específica. |
| `DELETE` | `/api/admin/mesas/[id]` | Elimina una mesa específica de la base de datos. |
| `GET` | `/api/admin/zonas` | Obtiene el listado de zonas del restaurante (ej. Terraza, Salón Principal). |
| `POST` | `/api/admin/zonas` | Crea una nueva zona en el mapa de distribución física del restaurante. |
| `PATCH` | `/api/zonas/[id]` | Modifica el nombre o la descripción de una zona específica. |
| `DELETE` | `/api/zonas/[id]` | Desactiva (soft-delete) una zona del restaurante, verificando que no tenga mesas asociadas activas. |
| `PATCH` | `/api/admin/usuarios` | Actualiza la información laboral del personal (roles de usuario, estado activo/inactivo). |
| `POST` | `/api/admin/pagos` | Registra el pago final de una cuenta de mesa, emite el recibo/comprobante y libera la mesa para nuevos clientes. |
| `GET` | `/api/admin/historial-caja` | Consolidado totalizador de transacciones de pago e ingresos/egresos de caja para auditoría administrativa. |
| `GET` | `/api/admin/seed` | Proceso especial para poblar la base de datos de desarrollo y pruebas con datos semilla. |
| `GET` | `/api/admin/cupones` | Obtiene el listado completo de cupones registrados. |
| `POST` | `/api/admin/cupones` | Crea un nuevo cupón de descuento (tipo porcentaje o monto fijo). |
| `PUT` | `/api/admin/cupones/[id]` | Edita y actualiza los parámetros o el estado de un cupón existente. |
| `DELETE` | `/api/admin/cupones/[id]` | Elimina físicamente un cupón de descuento del sistema. |
| `GET` | `/api/admin/cupones/validar` | Valida la vigencia y condiciones de un cupón dado su código y el monto de compra. |
| `POST` | `/api/admin/cupones/enviar-frecuentes` | Envía por correo un cupón a clientes específicos o masivamente a clientes frecuentes (> 5 compras). |
| `GET` | `/api/admin/facturas` | Obtiene el historial detallado de todas las facturas emitidas por el sistema en orden cronológico descendente. |
| `PATCH` | `/api/admin/facturas/[id]/anular` | Anula una factura emitida actualizando su estado a 'ANULADA' y notificando el cambio en tiempo real vía WebSockets (Pusher). |
| `GET` | `/api/admin/dashboard` | Obtiene estadísticas y métricas acumuladas del restaurante para la administración general. |
| `GET` | `/api/admin/config` | Obtiene la latitud y longitud configuradas del restaurante. |
| `POST` | `/api/admin/config` | Guarda/Actualiza la latitud y longitud de ubicación geográfica del restaurante. |

### 13.10 Gestión de Inventario y Recetas

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/insumos` | Obtiene el listado de todos los insumos activos en el inventario con sus cantidades y límites mínimos de stock. |
| `POST` | `/api/insumos` | Registra un nuevo insumo en el inventario con su unidad de medida y stock inicial. |
| `GET` | `/api/insumos/categorias` | Obtiene el listado de todas las categorías de insumos. |
| `POST` | `/api/insumos/categorias` | Crea una nueva categoría para organizar los insumos en el inventario. |
| `PUT` | `/api/insumos/categorias/[id]` | Modifica el nombre o descripción de una categoría de insumo específica. |
| `DELETE` | `/api/insumos/categorias/[id]` | Elimina una categoría de insumos del sistema. |
| `GET` | `/api/movimientos-stock` | Obtiene el historial completo de movimientos de stock (entradas, salidas, mermas, ajustes) y calcula retrospectivamente los balances de stock. |
| `POST` | `/api/movimientos-stock` | Registra una nueva transacción de stock (entrada, salida, ajuste, merma) actualizando la cantidad del insumo correspondiente. |
| `GET` | `/api/recetas` | Obtiene el listado de productos del menú con sus respectivos ingredientes e insumos necesarios (recetas). |
| `POST` | `/api/recetas` | Crea o actualiza la receta de un producto en el menú, vinculando o reemplazando los insumos requeridos. |

---

## 14. FLUJOS DE TRABAJO Y PROCESOS DE NEGOCIO (FRONTEND)

El frontend (`apps/frontend`) está diseñado con base en roles y vistas independientes que coordinan los procesos operativos del restaurante. A continuación se detallan los principales flujos y las acciones que cada rol realiza:

### 14.1 Flujo del Cliente (Auto-servicio, Reservas y Delivery)
* **Acceso y Autenticación**: El cliente inicia sesión en la plataforma desde su dispositivo móvil o tablet.
* **Consulta de la Carta Digital**: Visualiza el menú estructurado por categorías de alimentos y bebidas actualizadas en tiempo real.
* **Pedidos de Consumo Local (Carrito)**: Selecciona los productos de su preferencia, especifica notas/observaciones especiales y envía el pedido a su mesa.
* **Pedidos de Delivery**: 
  * Selecciona productos en el carrito y elige la modalidad de envío a domicilio (Delivery).
  * Define la dirección de entrega e indica la ubicación exacta mediante un mapa interactivo (Leaflet).
  * Registra un teléfono de contacto y referencias de entrega.
* **Solicitud de Factura**: Desde su panel de seguimiento, el cliente puede ingresar sus datos de facturación (CI/NIT y Nombre/Razón Social) y pulsar el botón **"Solicitar Factura"** en cualquier momento del trayecto.
* **Seguimiento en Tiempo Real (Geolocalización)**: Monitorea el progreso de su orden (en preparación, listo, en camino). Si el pedido está en camino, se muestra un mapa interactivo que rastrea y dibuja el movimiento del repartidor en tiempo real (vía Pusher WebSockets).

### 14.2 Flujo del Mesero (Atención en Mesa)
* **Gestión Visual de Mesas**: Accede al plano o listado de mesas del restaurante, filtrando por estado (disponible, ocupada, reservada).
* **Asignación del Cliente**: Selecciona una mesa libre, ingresa el número de Cédula de Identidad (CI/NIT) del cliente para validar o registrar sus datos.
* **Toma de Pedido**: Abre el pedido de la mesa, agrega los platos solicitados, incrementa cantidades, y escribe notas de preparación (validándose en tiempo real).
* **Envío a Cocina**: Confirma el pedido y lo envía al monitor de preparación de la cocina.
* **Atención y Cuenta**: Hace seguimiento de los platos listos para servirlos a la mesa. Posteriormente, solicita la pre-cuenta del cliente desde el panel.

### 14.3 Flujo de la Cocina (Monitor en Tiempo Real)
* **Monitor de Preparación**: El personal de cocina visualiza las órdenes entrantes (tanto locales como de delivery) en una pantalla dedicada, actualizada en tiempo real mediante WebSockets (Pusher).
* **Cambio de Estado a "En Preparación"**: Al iniciar un plato, el cocinero hace clic sobre él en la pantalla para cambiar el estado a "PREPARÁNDOSE".
* **Control de Ítems (Switches)**: Marca de forma individual la terminación de cada ítem de un pedido.
* **Notificación de Listo**: Cuando se completan todos los platos de una orden, pulsa el botón "LISTO", lo cual notifica inmediatamente al mesero (si es local) o al repartidor (si es delivery).

### 14.4 Flujo del Cajero (Gestión de Caja, Pagos y Despacho Delivery)
* **Apertura de Turno**: Al iniciar la jornada, el cajero realiza la "Apertura de Caja" declarando el saldo inicial en efectivo en la caja física.
* **Registro de Movimientos**: Puede registrar ingresos y egresos manuales con justificación (ej. pago a proveedores).
* **Procesamiento de Pagos Locales**:
  * Visualiza las mesas que han solicitado cuenta.
  * Valida y aplica **cupones de descuento** (con validación de vigencia y monto mínimo).
  * Selecciona el método de pago (Efectivo, Tarjeta, Transferencia / QR).
  * En efectivo, calcula el cambio a entregar de acuerdo al monto recibido.
* **Atención Delivery**:
  * Visualiza y despacha los pedidos que están listos para envío, cambiando el estado a "EN_CAMINO" y asignando un repartidor.
  * Monitorea el estado y el trayecto de los repartidores en el mapa.
  * Al completarse la entrega física, y una vez que el cliente haya solicitado su factura, registra el cobro definitivo en efectivo, lo que ingresa el dinero a la jornada activa de caja, crea el movimiento contable y genera/emite la factura oficial automáticamente (`estado: PAGADO`).
* **Cierre de Caja**: Al finalizar el turno, efectúa el arqueo de caja. El sistema compara los montos computados por el sistema con los montos reales declarados y calcula las discrepancias.

### 14.5 Flujo del Administrador (Gestión, Control y Configuración)
* **Administración de Personal**: Actualiza los roles, datos y estados de activación del personal del restaurante (incluyendo repartidores).
* **Configuración del Mapa de Zonas y Mesas**: Crea o edita las zonas del local (ej. Terraza, Salón) y distribuye/asigna mesas a cada una.
* **Configuración de Ubicación del Restaurante**: Define las coordenadas geográficas base (latitud y longitud) del establecimiento seleccionándolas sobre un mapa de Leaflet en el panel de control.
* **Auditoría e Infracciones**: Visualiza el historial acumulado de cierres de caja y movimientos financieros.
* **Auditoría de Invoices / Facturas**: Consulta el registro de facturas emitidas y posee permisos para anular facturas (anulación en caliente con restablecimiento visual en tiempo real).
* **Gestión de Cupones**: Crea, edita, desactiva o elimina cupones promocionales con topes de uso y fechas de expiración.
* **Gestión de Inventario y Recetas**: Registra materias primas (insumos), realiza ajustes de stock y mapea recetas a los productos para el descuento automático de ingredientes.
* **Simulador de Rutas Delivery**: Permite simular a través de un botón en el mapa el trayecto del repartidor desde el restaurante hasta el destino del cliente utilizando el motor de ruteo OSRM, transmitiendo las coordenadas GPS segundo a segundo a través de Pusher WebSockets.

### 14.6 Flujo del Repartidor / Motorizado (Delivery en Ruta)
* **Asignación y Despacho**: Visualiza las órdenes de delivery listas para salir. Al tomar posesión de un envío, se asigna como conductor y el pedido cambia de estado a "EN_CAMINO".
* **Navegación e Indicaciones**: Visualiza en su panel móvil la dirección, teléfono, comentarios y la ubicación geográfica exacta del cliente sobre el mapa para trazar su ruta.
* **Transmisión de Coordenadas**: Mediante geolocalización activa (o simulación en el panel), envía sus coordenadas GPS actualizadas periódicamente al servidor para que el cliente y el administrador sigan el reparto en tiempo real.
* **Entrega del Pedido**: Al llegar con el cliente, cambia el estado del pedido a "ENTREGADO" (acción bloqueada en el sistema hasta que el cliente ingrese sus datos y solicite su factura).
* **Liquidación del Pago**: Recibe el cobro en efectivo y entrega el dinero al cajero del local, quien registra el cobro en el sistema, completando el flujo (`PAGADO`).



