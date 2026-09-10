// Cliente de Zoho CRM — SOLO se ejecuta en el servidor (rutas /api/*).
// Las credenciales nunca llegan al navegador: viven en variables de entorno.

export type Corte = "Corte 1" | "Corte 2" | "todos";
export const CORTES_DISPONIBLES: Corte[] = ["Corte 1", "Corte 2", "todos"];
export const CORTE_POR_DEFECTO: Corte = "Corte 1";

export type FiltroVacantes = "todas" | "con" | "sin";

export type Empresa = {
  id: string;
  nit: string;
  nombre: string;
  departamento: string;
  municipio: string;
  sector: string;
  tamano: string;
  corte: string;
  tieneVacantes: boolean;
  numVacantes: number;
  tieneAgendamiento: boolean;
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
  verificado: boolean;
  corte: string;
};

export type Pagina<T> = { items: T[]; hasMore: boolean };

const ZOHO_ACCOUNTS_DOMAIN = process.env.ZOHO_ACCOUNTS_DOMAIN || "https://accounts.zoho.com";
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || "https://www.zohoapis.com";

function clausulaCorte(corte: Corte): string {
  return corte === "todos" ? "" : `Corte = '${corte}'`;
}

// Escapa comillas simples para usarlas dentro de un literal COQL ('...').
function escaparTexto(texto: string): string {
  return texto.replace(/'/g, "''");
}

function credentialsConfigured() {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
      process.env.ZOHO_CLIENT_SECRET &&
      process.env.ZOHO_REFRESH_TOKEN
  );
}

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

const PAGE_SIZE = 500;
// Límite generoso para los exportables: trae todo de una sola consulta.
const EXPORT_LIMIT = 2000;

// ---------- Empresas ----------

// Cuenta de vacantes por empresa (id → número de vacantes) en el corte dado.
async function conteoVacantesPorEmpresa(corte: Corte): Promise<Map<string, number>> {
  const filtroCorte = clausulaCorte(corte);
  const where = filtroCorte || "id is not null";
  const rows = await coqlQuery(
    `select Buscar_empresa
     from GE_Vacantes_Colsubsidios
     where ${where}
     limit ${EXPORT_LIMIT}`
  );
  const conteo = new Map<string, number>();
  for (const r of rows) {
    const lookup = r.Buscar_empresa as { id?: string } | null;
    if (lookup?.id) {
      const id = String(lookup.id);
      conteo.set(id, (conteo.get(id) ?? 0) + 1);
    }
  }
  return conteo;
}

// Nombres de empresa (tal cual quedaron escritos en Agendamiento) que tienen
// al menos un agendamiento en el corte dado.
// Nota: el campo de relación "Empresa" de este módulo casi nunca está
// diligenciado en tu CRM, así que usamos el nombre de texto en su lugar.
async function nombresEmpresasConAgendamiento(corte: Corte): Promise<Set<string>> {
  const filtroCorte = clausulaCorte(corte);
  const where = filtroCorte || "id is not null";
  const rows = await coqlQuery(
    `select Nombre_de_la_empresa
     from GE_Agendamiento
     where ${where}
     limit ${EXPORT_LIMIT}`
  );
  const nombres = new Set<string>();
  for (const r of rows) {
    const nombre = r.Nombre_de_la_empresa;
    if (nombre) nombres.add(String(nombre).trim().toUpperCase());
  }
  return nombres;
}

export async function fetchEmpresas(
  corte: Corte,
  offset: number,
  filtroVacantes: FiltroVacantes = "todas"
): Promise<Pagina<Empresa>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const where = clausulaCorte(corte) || "id is not null";
    const [rows, conteoVacantes, conAgendamiento] = await Promise.all([
      coqlQuery(
        `select id, Name, Nombre_de_la_empresa, Departamento, Ciudad_municipio_principal, Sector_econ_mico, Tama_o_de_la_empresa, Corte
         from Pre_registro_Empresarial
         where ${where}
         order by Nombre_de_la_empresa asc
         limit ${PAGE_SIZE + 1}
         offset ${offset}`
      ),
      conteoVacantesPorEmpresa(corte),
      nombresEmpresasConAgendamiento(corte),
    ]);
    const hasMore = rows.length > PAGE_SIZE;
    let items = rows.slice(0, PAGE_SIZE).map((r) => {
      const numVacantes = conteoVacantes.get(String(r.id)) ?? 0;
      const nombre = String(r.Nombre_de_la_empresa ?? "(sin nombre)");
      return {
        id: String(r.id),
        nit: String(r.Name ?? ""),
        nombre,
        departamento: String(r.Departamento ?? ""),
        municipio: String(r.Ciudad_municipio_principal ?? ""),
        sector: String(r.Sector_econ_mico ?? ""),
        tamano: String(r.Tama_o_de_la_empresa ?? ""),
        corte: corteDeRegistro(r, corte),
        numVacantes,
        tieneVacantes: numVacantes > 0,
        tieneAgendamiento: conAgendamiento.has(nombre.trim().toUpperCase()),
      };
    });

    if (filtroVacantes === "con") items = items.filter((e) => e.tieneVacantes);
    if (filtroVacantes === "sin") items = items.filter((e) => !e.tieneVacantes);

    return { items, hasMore };
  } catch (err) {
    console.error("fetchEmpresas:", err);
    return { items: [], hasMore: false };
  }

}

// Todas las empresas del corte, sin paginar (para exportar).
export async function fetchTodasEmpresas(corte: Corte): Promise<Empresa[]> {
  const { items } = await fetchEmpresas(corte, 0, "todas");
  return items;
}

// ---------- Agendamientos por empresa ----------

export async function fetchAgendamientos(
  empresaId: string,
  empresaNombre: string,
  corte: Corte,
  offset: number
): Promise<Pagina<Agendamiento>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const filtroCorte = clausulaCorte(corte);
    // El campo de relación "Empresa" casi nunca está diligenciado en este
    // módulo, así que filtramos por el nombre de texto en su lugar.
    const where = `Nombre_de_la_empresa = '${escaparTexto(empresaNombre)}'${
      filtroCorte ? ` and ${filtroCorte}` : ""
    }`;
    const rows = await coqlQuery(
      `select id, Nombre_de_la_empresa, Fecha_y_hora, Estado, Tipo_de_actividad, Modalidad, Corte
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

// Todos los agendamientos del corte, de todas las empresas (para exportar).
export async function fetchTodosAgendamientos(
  corte: Corte
): Promise<(Agendamiento & { empresaNombre: string })[]> {
  if (!credentialsConfigured()) return [];
  try {
    const where = clausulaCorte(corte) || "id is not null";
    const rows = await coqlQuery(
      `select id, Nombre_de_la_empresa, Fecha_y_hora, Estado, Tipo_de_actividad, Modalidad, Corte
       from GE_Agendamiento
       where ${where}
       order by Fecha_y_hora desc
       limit ${EXPORT_LIMIT}`
    );
    return rows.map((r) => ({
      id: String(r.id),
      empresaId: "",
      empresaNombre: String(r.Nombre_de_la_empresa ?? ""),
      fecha: String(r.Fecha_y_hora ?? ""),
      estado: String(r.Estado ?? ""),
      tipoActividad: String(r.Tipo_de_actividad ?? ""),
      modalidad: String(r.Modalidad ?? ""),
      corte: corteDeRegistro(r, corte),
    }));
  } catch (err) {
    console.error("fetchTodosAgendamientos:", err);
    return [];
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

// Todas las vacantes del corte, de todas las empresas (para exportar).
export async function fetchTodasVacantes(
  corte: Corte
): Promise<(Vacante & { empresaNombre: string })[]> {
  if (!credentialsConfigured()) return [];
  try {
    const where = clausulaCorte(corte) || "id is not null";
    const rows = await coqlQuery(
      `select id, Buscar_empresa, Nombre_de_la_empresa, Nombre_vacante, Cargo, Estado_de_la_vacante, N_mero_de_puestos_de_trabajo, Perfil_de_la_vacante, Corte
       from GE_Vacantes_Colsubsidios
       where ${where}
       order by Nombre_vacante asc
       limit ${EXPORT_LIMIT}`
    );
    return rows.map((r) => {
      const lookup = r.Buscar_empresa as { id?: string } | null;
      return {
        id: String(r.id),
        empresaId: lookup?.id ? String(lookup.id) : "",
        empresaNombre: String(r.Nombre_de_la_empresa ?? ""),
        nombre: String(r.Nombre_vacante ?? "(sin nombre)"),
        cargo: String(r.Cargo ?? ""),
        estado: String(r.Estado_de_la_vacante ?? ""),
        cupos: Number(r.N_mero_de_puestos_de_trabajo ?? 0),
        perfil: String(r.Perfil_de_la_vacante ?? ""),
        corte: corteDeRegistro(r, corte),
      };
    });
  } catch (err) {
    console.error("fetchTodasVacantes:", err);
    return [];
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
  offset: number,
  soloVerificadas: boolean = false
): Promise<Pagina<Colocacion>> {
  if (!credentialsConfigured()) return { items: [], hasMore: false };

  try {
    const filtroCorte = clausulaCorte(corte);
    let where = `Codigo_de_la_vacante.id = ${vacanteId}`;
    if (filtroCorte) where += ` and ${filtroCorte}`;
    if (soloVerificadas) where += ` and Verificaci_n_documento_subido = true`;
    const rows = await coqlQuery(
      `select id, Codigo_de_la_vacante, Primer_nombre, Primer_apellido, Fecha_de_Vinculaci_n_Laboral, Gestor_Operativo, Verificaci_n_documento_subido, Corte
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
      verificado: Boolean(r.Verificaci_n_documento_subido),
      corte: corteDeRegistro(r, corte),
    }));
    return { items, hasMore };
  } catch (err) {
    console.error("fetchColocaciones:", err);
    return { items: [], hasMore: false };
  }
}

// Tipo unificado para el exportable de participantes (intermediados + colocados).
export type ParticipanteExport = {
  tipo: "Intermediado" | "Colocado";
  nombreCompleto: string;
  empresa: string;
  vacante: string;
  estadoOVerificado: string;
  fecha: string;
  corte: string;
};

export async function fetchTodosParticipantes(corte: Corte): Promise<ParticipanteExport[]> {
  if (!credentialsConfigured()) return [];

  const filtroCorte = clausulaCorte(corte);
  const where = filtroCorte || "id is not null";

  const [intermediados, colocados] = await Promise.all([
    coqlQuery(
      `select id, Nombre_de_la_empresa_1, Nombre_vacante, Primer_nombre, Primer_apellido, Estado, Fecha_intermediaci_n, Corte
       from Intermediaci_n_Ruta_M
       where ${where}
       order by Fecha_intermediaci_n desc
       limit ${EXPORT_LIMIT}`
    ).catch((err) => {
      console.error("fetchTodosParticipantes (intermediados):", err);
      return [] as Record<string, unknown>[];
    }),
    coqlQuery(
      `select id, Nombre_de_empresa_donde_labora, Primer_nombre, Primer_apellido, Fecha_de_Vinculaci_n_Laboral, Verificaci_n_documento_subido, Corte
       from Colocaci_n_Colsubsidios
       where ${where}
       order by Fecha_de_Vinculaci_n_Laboral desc
       limit ${EXPORT_LIMIT}`
    ).catch((err) => {
      console.error("fetchTodosParticipantes (colocados):", err);
      return [] as Record<string, unknown>[];
    }),
  ]);

  const filasIntermediados: ParticipanteExport[] = intermediados.map((r) => ({
    tipo: "Intermediado",
    nombreCompleto: `${r.Primer_nombre ?? ""} ${r.Primer_apellido ?? ""}`.trim(),
    empresa: String(r.Nombre_de_la_empresa_1 ?? ""),
    vacante: String(r.Nombre_vacante ?? ""),
    estadoOVerificado: String(r.Estado ?? ""),
    fecha: String(r.Fecha_intermediaci_n ?? ""),
    corte: corteDeRegistro(r, corte),
  }));

  const filasColocados: ParticipanteExport[] = colocados.map((r) => ({
    tipo: "Colocado",
    nombreCompleto: `${r.Primer_nombre ?? ""} ${r.Primer_apellido ?? ""}`.trim(),
    empresa: String(r.Nombre_de_empresa_donde_labora ?? ""),
    vacante: "",
    estadoOVerificado: r.Verificaci_n_documento_subido ? "Verificado" : "Sin verificar",
    fecha: String(r.Fecha_de_Vinculaci_n_Laboral ?? ""),
    corte: corteDeRegistro(r, corte),
  }));

  return [...filasIntermediados, ...filasColocados];
}

export function parseCorte(value: string | null): Corte {
  if (value === "Corte 1" || value === "Corte 2" || value === "todos") return value;
  return CORTE_POR_DEFECTO;
}

export function parseOffset(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function parseFiltroVacantes(value: string | null): FiltroVacantes {
  if (value === "con" || value === "sin") return value;
  return "todas";
}
