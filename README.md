
        GUÍA DE CONFIGURACIÓN DEL PROYECTO — ARQUITECTURA MONOREPO
              Turborepo · pnpm Workspaces · PostgreSQL + Prisma



────────────────────────────────────────────────────────────────────────────────
1. DESCRIPCIÓN GENERAL
────────────────────────────────────────────────────────────────────────────────

Este documento describe la configuración, estructura y flujos de trabajo del
repositorio monorepo del proyecto. Está destinado a todos los miembros del
equipo de desarrollo y debe consultarse antes de realizar cualquier tipo de
contribución al código base.


────────────────────────────────────────────────────────────────────────────────
2. ARQUITECTURA DEL SISTEMA
────────────────────────────────────────────────────────────────────────────────

El proyecto adopta una arquitectura monorepo gestionada mediante Turborepo y
pnpm Workspaces, lo que permite compartir configuraciones y dependencias entre
las distintas aplicaciones de forma eficiente.

  Capa                  Tecnología                                Ubicación
  ──────────────────────────────────────────────────────────────────────────
  Frontend              React 19, Vite, Tailwind CSS 4,          apps/frontend
                        TypeScript
  Backend / API         Next.js 16 (App Router), Prisma ORM      apps/backend
  Base de Datos         PostgreSQL (via Supabase)                 —
  Gestión del Monorepo  Turborepo + pnpm Workspaces              raíz del proyecto


────────────────────────────────────────────────────────────────────────────────
3. REQUISITOS PREVIOS
────────────────────────────────────────────────────────────────────────────────

Antes de clonar o ejecutar el proyecto, asegúrese de contar con los siguientes
elementos instalados y configurados en su entorno de desarrollo:

  • pnpm versión 10.33.0 o superior.
  • Node.js compatible con las versiones de las dependencias del proyecto.
  • Una instancia de PostgreSQL activa y accesible (se recomienda Supabase).


────────────────────────────────────────────────────────────────────────────────
4. CONFIGURACIÓN INICIAL
────────────────────────────────────────────────────────────────────────────────

4.1  Instalación de Dependencias
─────────────────────────────────
Ejecute el siguiente comando desde la raíz del monorepo para instalar todas
las dependencias de los workspaces:

    $ pnpm install


4.2  Generación del Cliente de Prisma
──────────────────────────────────────
Este paso es obligatorio para que la API pueda interactuar con la base de
datos. Debe ejecutarse inmediatamente después de la instalación de dependencias:

    $ pnpm --filter api run prisma:generate


4.3  Configuración de Variables de Entorno
──────────────────────────────────────────
Cada aplicación requiere su propio archivo .env. Tome como referencia el
archivo .env.example ubicado en la raíz del proyecto y cree los archivos
correspondientes según se detalla a continuación.

  BACKEND — apps/backend/.env

    Variable                  Descripción / Valor de Referencia
    ────────────────────────────────────────────────────────────────────────
    PORT                      3001
    DATABASE_URL              postgresql://... (conexión pooled, pgbouncer=true)
    DIRECT_URL                postgresql://... (conexión directa para migraciones)
    SUPABASE_URL              URL pública del proyecto en Supabase
    SUPABASE_PUBLISHABLE_KEY  Clave pública de Supabase
    SUPABASE_SECRET_KEY       Clave secreta de Supabase (confidencial)
    WEB_URL                   http://localhost:4000/ (CORS hacia el frontend)

  FRONTEND — apps/frontend/.env

    Variable                  Descripción / Valor de Referencia
    ────────────────────────────────────────────────────────────────────────
    VITE_API_URL              http://localhost:3001/
    VITE_PORT                 4000


────────────────────────────────────────────────────────────────────────────────
5. EJECUCIÓN DEL PROYECTO
────────────────────────────────────────────────────────────────────────────────

Los siguientes comandos deben ejecutarse desde la raíz del monorepo:

  Comando               Descripción                                       Puerto
  ──────────────────────────────────────────────────────────────────────────────
  pnpm dev              Levanta todas las aplicaciones simultáneamente.   —
  pnpm dev:frontend     Levanta únicamente el Frontend.                   4000
  pnpm dev:backend      Levanta únicamente el Backend / API.              3001


────────────────────────────────────────────────────────────────────────────────
6. CALIDAD DE CÓDIGO
────────────────────────────────────────────────────────────────────────────────

Es obligatorio ejecutar los siguientes comandos desde la raíz del monorepo
antes de realizar cualquier push a las ramas del repositorio remoto:

  Comando           Propósito
  ──────────────────────────────────────────────────────────────────────────────
  pnpm lint         Aplica las reglas de estilo y detecta errores comunes
                    en todo el proyecto.
  pnpm typecheck    Valida la integridad de los tipos de TypeScript en todas
                    las aplicaciones del monorepo.
  pnpm build        Compila el monorepo completo. Turborepo cachea los
                    resultados para optimizar tiempos de construcción futuros.


────────────────────────────────────────────────────────────────────────────────
7. ESTRATEGIA DE RAMAS (GIT FLOW)
────────────────────────────────────────────────────────────────────────────────

7.1  Rama main — Producción
────────────────────────────
Contiene el código estable y listo para despliegue. Todo cambio en esta rama
debe haber superado las pruebas de integración correspondientes.

RESTRICCIÓN: Está estrictamente prohibido trabajar directamente sobre esta
rama. Únicamente recibe cambios mediante Pull Requests o Merge Requests
provenientes de la rama develop, una vez confirmada la estabilidad de la
versión a publicar.


7.2  Rama develop — Integración
─────────────────────────────────
Rama principal de integración donde se consolidan las nuevas funcionalidades
antes de su paso a producción. Aquí se realizan las pruebas de compatibilidad
entre Frontend y Backend.

REQUISITO: Antes de integrar cualquier cambio, es obligatorio ejecutar
pnpm lint y pnpm typecheck desde la raíz del monorepo para garantizar la
estabilidad del repositorio compartido.


────────────────────────────────────────────────────────────────────────────────
8. ESTRUCTURA DE CARPETAS
────────────────────────────────────────────────────────────────────────────────
```
  / (raíz del proyecto)
  ├── apps/
  │   ├── backend/                  Backend (Next.js 16 + Prisma)
  │   │   ├── app/              Rutas de la API (Next.js App Router)
  │   │   ├── lib/              Configuración de Prisma y utilidades
  │   │   ├── prisma/           Esquemas y migraciones de la base de datos
  │   │   ├── public/           Archivos estáticos del backend
  │   │   └── .env              Variables de entorno — NO commitear
  │   └── frontend/                 Frontend (React 19 + Vite)
  │       ├── src/              Código fuente (componentes, App.tsx, etc.)
  │       ├── public/           Archivos estáticos públicos (favicon, etc.)
  │       └── .env              Variables de entorno — NO commitear
  ├── .env.example              Plantilla general de variables de entorno
  ├── package.json              Dependencias raíz y scripts principales
  ├── pnpm-workspace.yaml       Definición de los workspaces de pnpm
  └── turbo.json                Configuración de las tareas de Turborepo
```

────────────────────────────────────────────────────────────────────────────────
9. CONSIDERACIONES DE SEGURIDAD
────────────────────────────────────────────────────────────────────────────────

  • Nunca commitear los archivos .env al repositorio. Se encuentran excluidos
    mediante .gitignore y deben permanecer locales en cada entorno.

  • La variable SUPABASE_SECRET_KEY es estrictamente confidencial. No debe
    compartirse, exponerse públicamente ni incluirse en logs o reportes.

  • Utilice siempre el archivo .env.example como plantilla de referencia al
    configurar nuevos entornos de desarrollo o producción.


================================================================================
