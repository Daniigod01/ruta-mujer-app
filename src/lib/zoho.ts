// Cliente de Zoho CRM — SOLO se ejecuta en el servidor (rutas /api/*).
// Las credenciales nunca llegan al navegador: viven en variables de entorno.

export type Corte = "Corte 1" | "Corte 2" | "todos";
export const CORTES_DISPONIBLES: Corte[] = ["Corte 1", "Corte 2", "todos"];
export const CORTE_POR_DEFECTO: Corte = "Corte 1";

export type Empresa = {
  id: string;
  nit: string;
  nombre: string;
  departamento: string;
  municipio: string;
  sector: string;
  tamano: string;
  corte: string;
};

export type Agendamiento = {
  id: string;
  empresaId: string;
  fecha: string;
  estado: string;
  tipoActividad: string;
  modalidad: string;
  corte: string;
};

export type Vacante = {
  id: string;
  empresaId: string;
  nombre: string;
  cargo: string;
  estado: string;
  cupos: number;
  perfil: string;
  corte: string;
};

export type Intermediacion = {
  id: string;
  vacanteId: string;
  nombreCompleto: string;
  documento: string;
  estado: string;
  fecha: string;
  corte: string;
};

export type Colocacion = {
  id: string;
  vacanteId: string;
  nombreCompleto: string;
  documento: string;
  fechaVinculacion: string;
  gestor: string;
  corte: string;
};

export type Pagina<T> = { items: T[]; hasMore: boolean };

const ZOHO_ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com";
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com";

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

// Trae PAGE_SIZE + 1 registros para saber si hay más sin necesitar otra consulta.
const PAGE_SIZE = 40;

// ---------- Empresas ----------

export async function fetchEmpresas(corte: Corte, offset: number): Promise<Pagina<Empresa>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const where = clausulaCorte(corte) || "id is not null";
    const rows = await coqlQuery(
      `select id, Name, Nombre_de_la_empresa, Departamento, Ciudad_municipio_principal, Sector_econ_mico, Tama_o_de_la_empresa, Corte
       from Pre_registro_Empresarial
       where ${where}
       order by Nombre_de_la_empresa asc
       limit ${PAGE_SIZE + 1}
       offset ${offset}`
    );
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map((r) => ({
      id: String(r.id),
      nit: String(r.Name ?? ""),
      nombre: String(r.Nombre_de_la_empresa ?? "(sin nombre)"),
      departamento: String(r.Departamento ?? ""),
      municipio: String(r.Ciudad_municipio_principal ?? ""),
      sector: String(r.Sector_econ_mico ?? ""),
      tamano: String(r.Tama_o_de_la_empresa ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
    return { items, hasMore };
  } catch (err) {
    console.error("fetchEmpresas:", err);
    return { items: [], hasMore: false };
  }
}

// ---------- Agendamientos por empresa ----------

export async function fetchAgendamientos(
  empresaId: string,
  corte: Corte,
  offset: number
): Promise<Pagina<Agendamiento>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Empresa.id = ${empresaId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Empresa, Fecha_y_hora, Estado, Tipo_de_actividad, Modalidad, Corte
       from GE_Agendamiento
       where ${where}
       order by Fecha_y_hora desc
       limit ${PAGE_SIZE + 1}
       offset ${offset}`
    );
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map((r) => ({
      id: String(r.id),
      empresaId,
      fecha: String(r.Fecha_y_hora ?? ""),
      estado: String(r.Estado ?? "Pendiente"),
      tipoActividad: String(r.Tipo_de_actividad ?? ""),
      modalidad: String(r.Modalidad ?? "Virtual"),
      corte: corteDeRegistro(r, corte),
    }));
    return { items, hasMore };
  } catch (err) {
    console.error("fetchAgendamientos:", err);
    return { items: [], hasMore: false };
  }
}

// ---------- Vacantes por empresa ----------

export async function fetchVacantes(
  empresaId: string,
  corte: Corte,
  offset: number
): Promise<Pagina<Vacante>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Buscar_empresa.id = ${empresaId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Buscar_empresa, Nombre_vacante, Cargo, Estado_de_la_vacante, N_mero_de_puestos_de_trabajo, Perfil_de_la_vacante, Corte
       from GE_Vacantes_Colsubsidios
       where ${where}
       order by Nombre_vacante asc
       limit ${PAGE_SIZE + 1}
       offset ${offset}`
    );
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map((r) => ({
      id: String(r.id),
      empresaId,
      nombre: String(r.Nombre_vacante ?? "(sin nombre)"),
      cargo: String(r.Cargo ?? ""),
      estado: String(r.Estado_de_la_vacante ?? ""),
      cupos: Number(r.N_mero_de_puestos_de_trabajo ?? 0),
      perfil: String(r.Perfil_de_la_vacante ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
    return { items, hasMore };
  } catch (err) {
    console.error("fetchVacantes:", err);
    return { items: [], hasMore: false };
  }
}

// ---------- Intermediaciones + Colocaciones por vacante ----------

export async function fetchIntermediaciones(
  vacanteId: string,
  corte: Corte,
  offset: number
): Promise<Pagina<Intermediacion>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Buscar_Vacante.id = ${vacanteId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Buscar_Vacante, Primer_nombre, Primer_apellido, Estado, Fecha_intermediaci_n, Corte
       from Intermediaci_n_Ruta_M
       where ${where}
       order by Fecha_intermediaci_n desc
       limit ${PAGE_SIZE + 1}
       offset ${offset}`
    );
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map((r) => ({
      id: String(r.id),
      vacanteId,
      nombreCompleto: `${r.Primer_nombre ?? ""} ${r.Primer_apellido ?? ""}`.trim(),
      documento: String(r.Name ?? ""),
      estado: String(r.Estado ?? ""),
      fecha: String(r.Fecha_intermediaci_n ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
    return { items, hasMore };
  } catch (err) {
    console.error("fetchIntermediaciones:", err);
    return { items: [], hasMore: false };
  }
}

export async function fetchColocaciones(
  vacanteId: string,
  corte: Corte,
  offset: number
): Promise<Pagina<Colocacion>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const filtroCorte = clausulaCorte(corte);
    const where = `Codigo_de_la_vacante.id = ${vacanteId}${filtroCorte ? ` and ${filtroCorte}` : ""}`;
    const rows = await coqlQuery(
      `select id, Codigo_de_la_vacante, Primer_nombre, Primer_apellido, Fecha_de_Vinculaci_n_Laboral, Gestor_Operativo, Corte
       from Colocaci_n_Colsubsidios
       where ${where}
       order by Fecha_de_Vinculaci_n_Laboral desc
       limit ${PAGE_SIZE + 1}
       offset ${offset}`
    );
    const hasMore = rows.length > PAGE_SIZE;
    const items = rows.slice(0, PAGE_SIZE).map((r) => ({
      id: String(r.id),
      vacanteId,
      nombreCompleto: `${r.Primer_nombre ?? ""} ${r.Primer_apellido ?? ""}`.trim(),
      documento: String(r.Name ?? ""),
      fechaVinculacion: String(r.Fecha_de_Vinculaci_n_Laboral ?? ""),
      gestor: String(r.Gestor_Operativo ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
    return { items, hasMore };
  } catch (err) {
    console.error("fetchColocaciones:", err);
    return { items: [], hasMore: false };
  }
}

export function parseCorte(value: string | null): Corte {
  if (value === "Corte 1" || value === "Corte 2" || value === "todos") return value;
  return CORTE_POR_DEFECTO;
}

export function parseOffset(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
