RESUMEN DE CONFIGURACIÓN DEL PROYECTO (MONOREPO)

ARQUITECTURA

Frontend: React 19, Vite, Tailwind CSS 4, TypeScript (apps/web)
Backend: Next.js 16 como API framework (apps/api)
DB: PostgreSQL + Prisma ORM
Gestión: Turborepo + pnpm workspaces

ESTRUCTURA DE CARPETAS
(Monorepo gestionado por Turborepo y pnpm workspaces)

/ (Raíz del proyecto)
├── apps/
│   ├── backend/            # Backend (Next.js, Prisma)
│   │   ├── app/        # Rutas de la API (Next.js App Router)
│   │   ├── lib/        # Configuración de Prisma y utilidades
│   │   ├── prisma/     # Esquemas y migraciones de la base de datos
│   │   ├── public/     # Archivos estáticos del backend
│   │   └── .env        # Variables de entorno del backend (¡No commitear!)
│   └── frontend/            # Frontend (React, Vite)
│       ├── public/     # Archivos estáticos públicos (favicon, etc.)
│       ├── src/        # Código fuente (Componentes, App.tsx, etc.)
│       └── .env        # Variables de entorno del frontend (¡No commitear!)
├── .env.example        # Plantilla general de variables de entorno
├── package.json        # Dependencias raíz y scripts principales
├── pnpm-workspace.yaml # Definición de los workspaces de pnpm
└── turbo.json          # Configuración de las tareas de Turborepo

SETUP INICIAL (Paso a paso)

Instalar dependencias:
$ pnpm install
Generar cliente de Prisma (Obligatorio para la API):
$ pnpm --filter api run prisma:generate

Configurar Variables de Entorno:
Crear archivos .env independientes en cada app.

VARIABLES DE ENTORNO (.env)

BACKEND (apps/backend/.env):
PORT=3001
DATABASE_URL="postgresql://...pgbouncer=true" (Conexión pooled)
DIRECT_URL="postgresql://..." (Conexión directa para migraciones)
SUPABASE_URL=URL pública del proyecto
SUPABASE_PUBLISHABLE_KEY=Clave pública
SUPABASE_SECRET_KEY=Clave secreta 
WEB_URL=http://localhost:4000/ (Para CORS)

FRONTEND (apps/frontend/.env):
VITE_API_URL=http://localhost:3001/
VITE_PORT=4000

COMANDOS DE EJECUCIÓN

Levantar todo: pnpm dev
Solo Frontend: pnpm dev:frontend (Puerto 4000)
Solo Backend:  pnpm dev:backend (Puerto 3001)

CALIDAD DE CÓDIGO (Antes de pushear)

(Estos comandos deben ejecutarse desde la raíz del monorepo)
Linting:    pnpm lint
(Asegura estándares de estilo y busca errores comunes en el código de todo el proyecto).
Typecheck:  pnpm typecheck
(Valida la integridad de los tipos de TypeScript en todas las aplicaciones del monorepo).
Build:      pnpm build
(Compila todo el monorepo. Turborepo cachea los resultados para acelerar builds futuros).
