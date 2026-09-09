// Cliente de Zoho CRM — SOLO se ejecuta en el servidor (rutas /api/*).
// Las credenciales nunca llegan al navegador: viven en variables de entorno.
//
// Mientras ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN no estén
// configuradas, cada función devuelve datos de demostración (ver demoData.ts)
// para que la aplicación se pueda navegar igual.

import {
  demoEmpresas,
  demoAgendamientos,
  demoVacantes,
  demoIntermediaciones,
  demoColocaciones,
  type Empresa,
  type Agendamiento,
  type Vacante,
  type Intermediacion,
  type Colocacion,
} from "./demoData";

const ZOHO_ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com";
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com";

// Valores válidos para el filtro de corte. "todos" no filtra por corte.
export type Corte = "Corte 1" | "Corte 2" | "todos";
export const CORTES_DISPONIBLES: Corte[] = ["Corte 1", "Corte 2", "todos"];
export const CORTE_POR_DEFECTO: Corte = "Corte 1";

function clausulaCorte(corte: Corte): string {
  return corte === "todos" ? "" : `Corte = '${corte}'`;
}

function credentialsConfigured() {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN
  );
}

// Guarda el último error real de Zoho (si lo hubo), para poder mostrarlo
// directo en la respuesta de la API y diagnosticar sin tener que ir a
// buscar en los Runtime Logs de Vercel.
let lastFetchError: string | null = null;

export function getLastError(): string | null {
  return lastFetchError;
}

export function clearLastError(): void {
  lastFetchError = null;
}

function recordError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  lastFetchError = `${context}: ${message}`;
  console.error(lastFetchError);
}

// El access token dura ~1 hora. Lo guardamos en memoria del proceso para no
// pedir uno nuevo en cada consulta (se reinicia solo si la función se "enfría").
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    client_id: process.env.ZOHO_CLIENT_ID!,
    client_secret: process.env.ZOHO_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });

  const res = await fetch(`${ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token?${params}`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`No se pudo renovar el token de Zoho (${res.status})`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Zoho no devolvió un access_token. Revisa el refresh token.");
  }

  cachedToken = {
    value: data.access_token,
    // Restamos 2 minutos de margen de seguridad.
    expiresAt: Date.now() + (data.expires_in - 120) * 1000,
  };
  return cachedToken.value;
}

async function coqlQuery(select_query: string): Promise<Record<string, unknown>[]> {
  const token = await getAccessToken();
  const res = await fetch(`${ZOHO_API_DOMAIN}/crm/v6/coql`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ select_query }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Consulta COQL fallida (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.data || [];
}

function corteDeRegistro(r: Record<string, unknown>, corte: Corte): string {
  return corte === "todos" ? String(r.Corte ?? "") : corte;
}

// ---------- Empresas ----------

export async function fetchEmpresas(corte: Corte): Promise<Empresa[]> {
  if (!credentialsConfigured()) {
    return demoEmpresas.filter((e) => corte === "todos" || e.corte === corte);
  }

  try {
    const where = clausulaCorte(corte) || "id is not null";
    const rows = await coqlQuery(
      `select id, Name, Nombre_de_la_empresa, Departamento, Ciudad_municipio_principal, Sector_econ_mico, Tama_o_de_la_empresa, Corte
       from Pre_registro_Empresarial
       where ${where}
       order by Nombre_de_la_empresa asc
       limit 200`
    );
    return rows.map((r) => ({
      id: String(r.id),
      nit: String(r.Name ?? ""),
      nombre: String(r.Nombre_de_la_empresa ?? "(sin nombre)"),
      departamento: String(r.Departamento ?? ""),
      municipio: String(r.Ciudad_municipio_principal ?? ""),
      sector: String(r.Sector_econ_mico ?? ""),
      tamano: String(r.Tama_o_de_la_empresa ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
  } catch (err) {
    recordError("fetchEmpresas", err);
    return demoEmpresas.filter((e) => corte === "todos" || e.corte === corte);
  }
}

// ---------- Agendamientos por empresa ----------

export async function fetchAgendamientos(empresaId: string, corte: Corte): Promise<Agendamiento[]> {
  if (!credentialsConfigured()) {
    return demoAgendamientos.filter(
      (a) => a.empresaId === empresaId && (corte === "todos" || a.corte === corte)
    );
  }

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Empresa.id = ${empresaId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Empresa, Fecha_y_hora, Estado, Tipo_de_actividad, Modalidad, Corte
       from GE_Agendamiento
       where ${where}
       order by Fecha_y_hora desc
       limit 100`
    );
    return rows.map((r) => ({
      id: String(r.id),
      empresaId,
      fecha: String(r.Fecha_y_hora ?? ""),
      estado: (r.Estado as Agendamiento["estado"]) ?? "Pendiente",
      tipoActividad: String(r.Tipo_de_actividad ?? ""),
      modalidad: (r.Modalidad as Agendamiento["modalidad"]) ?? "Virtual",
      corte: corteDeRegistro(r, corte),
    }));
  } catch (err) {
    recordError("fetchAgendamientos", err);
    return demoAgendamientos.filter(
      (a) => a.empresaId === empresaId && (corte === "todos" || a.corte === corte)
    );
  }
}

// ---------- Vacantes por empresa ----------

export async function fetchVacantes(empresaId: string, corte: Corte): Promise<Vacante[]> {
  if (!credentialsConfigured()) {
    return demoVacantes.filter(
      (v) => v.empresaId === empresaId && (corte === "todos" || v.corte === corte)
    );
  }

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Buscar_empresa.id = ${empresaId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Buscar_empresa, Nombre_vacante, Cargo, Estado_de_la_vacante, N_mero_de_puestos_de_trabajo, Perfil_de_la_vacante, Corte
       from GE_Vacantes_Colsubsidios
       where ${where}
       order by Nombre_vacante asc
       limit 200`
    );
    return rows.map((r) => ({
      id: String(r.id),
      empresaId,
      nombre: String(r.Nombre_vacante ?? "(sin nombre)"),
      cargo: String(r.Cargo ?? ""),
      estado: String(r.Estado_de_la_vacante ?? ""),
      cupos: Number(r.N_mero_de_puestos_de_trabajo ?? 0),
      perfil: String(r.Perfil_de_la_vacante ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
  } catch (err) {
    recordError("fetchVacantes", err);
    return demoVacantes.filter(
      (v) => v.empresaId === empresaId && (corte === "todos" || v.corte === corte)
    );
  }
}

// ---------- Intermediaciones + Colocaciones por vacante ----------

export async function fetchIntermediaciones(vacanteId: string, corte: Corte): Promise<Intermediacion[]> {
  if (!credentialsConfigured()) {
    return demoIntermediaciones.filter(
      (i) => i.vacanteId === vacanteId && (corte === "todos" || i.corte === corte)
    );
  }

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Buscar_Vacante.id = ${vacanteId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Buscar_Vacante, Primer_nombre, Primer_apellido, Estado, Fecha_intermediaci_n, Corte
       from Intermediaci_n_Ruta_M
       where ${where}
       order by Fecha_intermediaci_n desc
       limit 200`
    );
    return rows.map((r) => ({
      id: String(r.id),
      vacanteId,
      nombreCompleto: `${r.Primer_nombre ?? ""} ${r.Primer_apellido ?? ""}`.trim(),
      documento: String(r.Name ?? ""),
      estado: String(r.Estado ?? ""),
      fecha: String(r.Fecha_intermediaci_n ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
  } catch (err) {
    recordError("fetchIntermediaciones", err);
    return demoIntermediaciones.filter(
      (i) => i.vacanteId === vacanteId && (corte === "todos" || i.corte === corte)
    );
  }
}

export async function fetchColocaciones(vacanteId: string, corte: Corte): Promise<Colocacion[]> {
  if (!credentialsConfigured()) {
    return demoColocaciones.filter(
      (c) => c.vacanteId === vacanteId && (corte === "todos" || c.corte === corte)
    );
  }

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Codigo_de_la_vacante.id = ${vacanteId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Codigo_de_la_vacante, Primer_nombre, Primer_apellido, Fecha_de_Vinculaci_n_Laboral, Gestor_Operativo, Corte
       from Colocaci_n_Colsubsidios
       where ${where}
       order by Fecha_de_Vinculaci_n_Laboral desc
       limit 200`
    );
    return rows.map((r) => ({
      id: String(r.id),
      vacanteId,
      nombreCompleto: `${r.Primer_nombre ?? ""} ${r.Primer_apellido ?? ""}`.trim(),
      documento: String(r.Name ?? ""),
      fechaVinculacion: String(r.Fecha_de_Vinculaci_n_Laboral ?? ""),
      gestor: String(r.Gestor_Operativo ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
  } catch (err) {
    recordError("fetchColocaciones", err);
    return demoColocaciones.filter(
      (c) => c.vacanteId === vacanteId && (corte === "todos" || c.corte === corte)
    );
  }
}

export function isDemoMode(): boolean {
  return !credentialsConfigured();
}

export function parseCorte(value: string | null): Corte {
  if (value === "Corte 1" || value === "Corte 2" || value === "todos") return value;
  return CORTE_POR_DEFECTO;
}
