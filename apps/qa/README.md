# 🧪 Suite de Pruebas Automatizadas de QA - Sabor y Gestión

Esta es la estructura y suite oficial para pruebas automatizadas de **Garantía de Calidad (QA)** de **Sabor y Gestión**. Está construida sobre **Playwright**, el estándar de la industria moderna para pruebas de extremo a extremo (E2E) y pruebas de API.

La suite está completamente aislada en el paquete de espacio de trabajo (`workspace`) `apps/qa`, lo que permite mantener limpias las dependencias de producción y ejecutar pruebas de forma integrada en el monorepo.

---

## 📂 Estructura del Proyecto de QA

La suite está organizada siguiendo las mejores prácticas de ingeniería de software para pruebas, implementando el patrón **Page Object Model (POM)**:

```text
apps/qa/
├── src/
│   ├── api/                   # Pruebas integrales de nivel API (Backend validation rules)
│   │   └── menu.spec.ts
│   ├── e2e/                   # Pruebas E2E de flujos de usuario (Frontend + Backend)
│   │   ├── auth.spec.ts
│   │   └── order-flow.spec.ts
│   ├── fixtures/              # Mock-data, roles y configuraciones compartidas
│   │   └── testData.ts
│   └── pages/                 # Clases Page Object Model (Encapsulan selectores y acciones de UI)
│       ├── BasePage.ts        # Clase base con utilidades de navegación, esperas y capturas
│       ├── LoginPage.ts       # POM para el login y control de sesiones
│       ├── MeseroPage.ts      # POM para el panel de Mesero y órdenes
│       └── CajeroPage.ts      # POM para el panel de Facturación y caja registradora
├── playwright.config.ts       # Configuración global de Playwright (Navegadores, reintentos, reportes)
├── tsconfig.json              # Configuración de compilación de TypeScript y alias de rutas (@pages, @fixtures)
└── package.json               # Dependencias de QA y scripts de ejecución
```

---

## 🛠️ Requisitos e Instalación

Para ejecutar las pruebas en tu entorno local, asegúrate de tener instalado el gestor de paquetes **pnpm**.

### 1. Instalar dependencias globales del monorepo
Desde la raíz del proyecto, ejecuta:
```bash
pnpm install
```

### 2. Instalar los navegadores de Playwright (Chromium, Firefox, WebKit)
Para poder ejecutar las pruebas en navegadores reales, corre el instalador de Playwright:
```bash
pnpm --filter qa exec playwright install --with-deps
```

---

## 🚀 Comandos de Ejecución

Hemos expuesto accesos directos convenientes desde la raíz del monorepo para que no tengas que cambiar de directorio:

| Comando | Ubicación | Descripción |
| :--- | :--- | :--- |
| `pnpm test:qa` | **Raíz** | Ejecuta todas las pruebas QA (E2E y API) en modo headless (segundo plano). |
| `pnpm test:qa:ui` | **Raíz** | Abre la **interfaz interactiva de Playwright (UI Mode)** para depurar visualmente paso a paso. |
| `pnpm test:qa:headed` | **Raíz** | Ejecuta las pruebas abriendo el navegador visiblemente. |
| `pnpm test:qa:report` | **Raíz** | Abre el reporte HTML autogenerado con los detalles, screenshots y videos de fallos de la última ejecución. |

> **Nota:** Si estás dentro de la carpeta `apps/qa`, puedes omitir el prefijo `--filter qa` y usar `pnpm test` directamente.

---

## 💡 Reglas de Negocio Específicas Automatizadas

Esta suite inicial ya cubre las dos reglas críticas introducidas recientemente en el sistema:

1. **Validación de Observaciones (Mesero)**: 
   * **Regla:** El campo observaciones de los productos del pedido solo debe aceptar letras, rechazando números.
   * **Prueba:** `order-flow.spec.ts` simula el flujo del mesero y valida que al ingresar números salte la alerta correspondiente.
2. **Control de Flujo de Caja (Cajero)**:
   * **Regla:** No se puede acceder al cierre de caja sin haber iniciado una sesión activa de apertura de caja.
   * **Prueba:** `order-flow.spec.ts` intenta el cierre directo sin sesión previa y valida la advertencia del sistema.
3. **Seguridad y Validación Estricta (API de Menú)**:
   * **Regla:** Los nombres de productos o categorías no deben contener caracteres prohibidos (`@#$%`) ni patrones incoherentes/masheos de teclado (`gibberish`).
   * **Prueba:** `menu.spec.ts` realiza peticiones directas POST al backend para verificar que el servidor responda con código `400 (Bad Request)` ante datos corruptos o de hacking.

---

## 📝 Guía de Contribución: ¿Cómo agregar un nuevo test?

Para mantener la base de código limpia y mantenible, sigue estos pasos al agregar nuevos escenarios:

1. **Definir el flujo de UI en un Page Object**: Si el test requiere interactuar con una nueva sección (ej. cocina), crea un archivo `CocinaPage.ts` en `src/pages/` extendiendo `BasePage`.
2. **Definir los Selectores en el POM**: Utiliza locadores estables (`data-testid`, roles, o clases semánticas).
3. **Escribir la especificación (`.spec.ts`)**: Crea el archivo de prueba bajo `src/e2e/` (para flujos visuales) o `src/api/` (para llamadas HTTP directas).
4. **Usar Datos de Fixtures**: Evita escribir credenciales o cadenas estáticas directamente en el test. Agrégalas al mapa de constantes en `src/fixtures/testData.ts`.

---

## 📈 Integración Continua (CI/CD)

En GitHub Actions (`.github/workflows/ci.yml`), puedes integrar fácilmente la ejecución de QA añadiendo el siguiente paso después de la fase de compilación exitosa:

```yaml
- name: Run E2E & API QA Tests
  run: pnpm test:qa
  env:
    FRONTEND_URL: http://localhost:4000
    API_URL: http://localhost:3001
```
*(Playwright recolectará capturas de pantalla y videos automáticamente para cualquier fallo que ocurra durante la ejecución de CI).*
