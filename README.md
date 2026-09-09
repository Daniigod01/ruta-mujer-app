# Ruta Mujer — Seguimiento a empresas

Aplicación web interactiva para que el equipo de Colsubsidio navegue, con un
solo enlace y sin acceso al CRM, el flujo completo:

**Empresa → Agendamiento y vacantes → Participantes remitidas y contratadas**

Incluye un selector de **Corte** (Corte 1 / Corte 2 / Todos) y las listas
cargan por partes (botón "Cargar más") para que puedas ver todas las
empresas, vacantes y agendamientos sin importar cuántas haya.

Requiere las credenciales de Zoho configuradas (paso 3) para mostrar
cualquier dato — sin ellas, las listas aparecen vacías.

---

## Antes de empezar

Vas a necesitar dos cuentas gratuitas:
- Una cuenta en **[github.com](https://github.com)** (para guardar el código)
- Una cuenta en **[vercel.com](https://vercel.com)** (para publicarlo — puedes
  crearla con el mismo login de GitHub, un solo clic)

No necesitas instalar nada en tu computador ni usar la terminal.

---

## Paso 1 — Sube el código a GitHub

1. Entra a [github.com](https://github.com) y crea una cuenta si no tienes.
2. Arriba a la derecha, clic en **+** → **New repository**.
3. Ponle de nombre `ruta-mujer-app`, déjalo en **Private**, y clic en
   **Create repository**.
4. En la página del repositorio recién creado, busca el link que dice
   **"uploading an existing file"** (o ve a **Add file → Upload files**).
5. Arrastra **todos los archivos y carpetas de este proyecto** ahí (todo
   excepto la carpeta `node_modules` y `.next`, si las ves — no hacen falta).
6. Clic en **Commit changes**.

---

## Paso 2 — Publica en Vercel

1. Entra a [vercel.com](https://vercel.com) → **Sign up** → elige
   **Continue with GitHub**.
2. Clic en **Add New...** → **Project**.
3. Busca y selecciona el repositorio `ruta-mujer-app` → clic en **Import**.
4. Vercel detecta solo que es un proyecto Next.js — no cambies nada, clic en
   **Deploy**.
5. En 1-2 minutos te da un enlace parecido a
   `https://ruta-mujer-app-tuusuario.vercel.app` — **ese es el enlace que le
   compartes a Colsubsidio**.

En este punto la app ya está publicada, pero sin credenciales de Zoho las
listas van a aparecer vacías. El paso 3 la conecta con tu CRM real.

---

## Paso 3 — Conecta con tu Zoho CRM real

### 3.1 — Genera las credenciales en Zoho

1. Entra a [api-console.zoho.com](https://api-console.zoho.com) con la
   cuenta de Zoho que administra el CRM.
2. **Add Client** → **Self Client**.
3. En la pestaña **Generate Code**, en "Scope" escribe:
   `ZohoCRM.modules.READ,ZohoCRM.settings.READ`
   (son permisos de **solo lectura** — esta app nunca modifica nada en tu CRM)
4. Duración: 10 minutos (es solo para el siguiente paso). Clic **Create**.
5. Te da un **código** — cópialo, y en los siguientes 10 minutos, sigue la
   [documentación de Zoho para intercambiarlo por un refresh token](https://www.zoho.com/crm/developer/docs/api/v6/self-client.html)
   (te va a mostrar cómo obtener `client_id`, `client_secret` y
   `refresh_token` — los 3 valores que necesitas).

Si en este paso te trabas, dime y seguimos juntos con capturas de pantalla.

### 3.2 — Agrégalas en Vercel

1. En tu proyecto en Vercel → **Settings** → **Environment Variables**.
2. Agrega, una por una:
   - `ZOHO_CLIENT_ID`
   - `ZOHO_CLIENT_SECRET`
   - `ZOHO_REFRESH_TOKEN`
3. Ve a la pestaña **Deployments** → en el último despliegue, menú **...** →
   **Redeploy**.

Listo — ahora la app consulta tu CRM real en vivo.

---

## ¿Qué datos consulta exactamente?

| Nivel | Módulo de Zoho | Campos usados |
|---|---|---|
| Empresas | `Pre_registro_Empresarial` | Nombre, NIT, sector, ubicación |
| Agendamiento | `GE_Agendamiento` | Fecha, estado, tipo de actividad |
| Vacantes | `GE_Vacantes_Colsubsidios` | Nombre, cargo, estado, cupos, perfil |
| Remitidas | `Intermediaci_n_Ruta_M` | Nombre, estado del proceso, fecha |
| Contratadas | `Colocaci_n_Colsubsidios` | Nombre, fecha de vinculación, gestor |

Toda la consulta ocurre **del lado del servidor** (dentro de `src/lib/zoho.ts`
y las rutas en `src/app/api/zoho/`) — las credenciales nunca llegan al
navegador de quien use la app.

## Cambiar colores o textos

- Colores y tipografía: `src/app/globals.css` (arriba del archivo, sección
  `:root`).
- Estructura de las pantallas: `src/app/page.tsx`.
- Consultas a Zoho: `src/lib/zoho.ts`.

Cualquier cambio que subas a GitHub, Vercel lo publica solo en 1-2 minutos.
