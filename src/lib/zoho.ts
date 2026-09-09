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

function credentialsConfigured() {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN
  );
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

// ---------- Empresas ----------

export async function fetchEmpresas(): Promise<Empresa[]> {
  if (!credentialsConfigured()) return demoEmpresas;

  try {
    const rows = await coqlQuery(
      `select id, Name, Nombre_de_la_empresa, Departamento, Ciudad_municipio_principal, Sector_econ_mico, Tama_o_de_la_empresa
       from Pre_registro_Empresarial
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
    }));
  } catch (err) {
    console.error("fetchEmpresas: usando datos de demo por error:", err);
    return demoEmpresas;
  }
}

// ---------- Agendamientos por empresa ----------

export async function fetchAgendamientos(empresaId: string): Promise<Agendamiento[]> {
  if (!credentialsConfigured()) {
    return demoAgendamientos.filter((a) => a.empresaId === empresaId);
  }

  try {
    const rows = await coqlQuery(
      `select id, Empresa, Fecha_y_hora, Estado, Tipo_de_actividad, Modalidad
       from GE_Agendamiento
       where Empresa = '${empresaId}'
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
    }));
  } catch (err) {
    console.error("fetchAgendamientos: usando datos de demo por error:", err);
    return demoAgendamientos.filter((a) => a.empresaId === empresaId);
  }
}

// ---------- Vacantes por empresa ----------

export async function fetchVacantes(empresaId: string): Promise<Vacante[]> {
  if (!credentialsConfigured()) {
    return demoVacantes.filter((v) => v.empresaId === empresaId);
  }

  try {
    const rows = await coqlQuery(
      `select id, Buscar_empresa, Nombre_vacante, Cargo, Estado_de_la_vacante, N_mero_de_puestos_de_trabajo, Perfil_de_la_vacante
       from GE_Vacantes_Colsubsidios
       where Buscar_empresa = '${empresaId}'
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
    }));
  } catch (err) {
    console.error("fetchVacantes: usando datos de demo por error:", err);
    return demoVacantes.filter((v) => v.empresaId === empresaId);
  }
}

// ---------- Intermediaciones + Colocaciones por vacante ----------

export async function fetchIntermediaciones(vacanteId: string): Promise<Intermediacion[]> {
  if (!credentialsConfigured()) {
    return demoIntermediaciones.filter((i) => i.vacanteId === vacanteId);
  }

  try {
    const rows = await coqlQuery(
      `select id, Buscar_Vacante, Primer_nombre, Primer_apellido, Estado, Fecha_intermediaci_n
       from Intermediaci_n_Ruta_M
       where Buscar_Vacante = '${vacanteId}'
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
    }));
  } catch (err) {
    console.error("fetchIntermediaciones: usando datos de demo por error:", err);
    return demoIntermediaciones.filter((i) => i.vacanteId === vacanteId);
  }
}

export async function fetchColocaciones(vacanteId: string): Promise<Colocacion[]> {
  if (!credentialsConfigured()) {
    return demoColocaciones.filter((c) => c.vacanteId === vacanteId);
  }

  try {
    const rows = await coqlQuery(
      `select id, Codigo_de_la_vacante, Primer_nombre, Primer_apellido, Fecha_de_Vinculaci_n_Laboral, Gestor_Operativo
       from Colocaci_n_Colsubsidios
       where Codigo_de_la_vacante = '${vacanteId}'
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
    }));
  } catch (err) {
    console.error("fetchColocaciones: usando datos de demo por error:", err);
    return demoColocaciones.filter((c) => c.vacanteId === vacanteId);
  }
}

export function isDemoMode(): boolean {
  return !credentialsConfigured();
}
