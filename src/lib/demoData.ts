// Datos de demostración — misma forma que los datos reales de Zoho CRM.
// Se usan automáticamente mientras no haya credenciales de Zoho configuradas,
// para que la aplicación se pueda ver y navegar desde el primer momento.

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
  fecha: string; // ISO
  estado: "Pendiente" | "Agendada" | "Realizada" | "Reprogramada" | "Cancelada";
  tipoActividad: string;
  modalidad: "Virtual" | "Presencial";
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

export const demoEmpresas: Empresa[] = [
  {
    id: "emp-1",
    nit: "900123456-1",
    nombre: "Yisus SAS",
    departamento: "Bogotá D.C",
    municipio: "Suba",
    sector: "Tecnología y comunicaciones",
    tamano: "51–200",
    corte: "Corte 2",
  },
  {
    id: "emp-2",
    nit: "800987654-3",
    nombre: "Comercializadora Andina",
    departamento: "Cundinamarca",
    municipio: "Soacha",
    sector: "Comercio",
    tamano: "11–50",
    corte: "Corte 2",
  },
  {
    id: "emp-3",
    nit: "901555222-7",
    nombre: "Textiles del Norte",
    departamento: "Bogotá D.C",
    municipio: "Engativá",
    sector: "Manufactura",
    tamano: "Más de 200",
    corte: "Corte 1",
  },
];

export const demoAgendamientos: Agendamiento[] = [
  { id: "age-1", empresaId: "emp-1", fecha: "2026-08-12T14:00:00", estado: "Realizada", tipoActividad: "Reunión Gestión Vacantes", modalidad: "Virtual", corte: "Corte 2" },
  { id: "age-2", empresaId: "emp-2", fecha: "2026-09-02T10:00:00", estado: "Agendada", tipoActividad: "Contacto Inicial", modalidad: "Presencial", corte: "Corte 2" },
  { id: "age-3", empresaId: "emp-3", fecha: "2026-07-20T09:00:00", estado: "Realizada", tipoActividad: "Diagnóstico", modalidad: "Presencial", corte: "Corte 1" },
];

export const demoVacantes: Vacante[] = [
  { id: "vac-1", empresaId: "emp-1", nombre: "Analista Contable Jr", cargo: "Analista Contable", estado: "ACTIVA", cupos: 2, perfil: "Técnico o tecnólogo en contabilidad, 6 meses de experiencia.", corte: "Corte 2" },
  { id: "vac-2", empresaId: "emp-1", nombre: "Auxiliar Administrativo", cargo: "Auxiliar Administrativo", estado: "CERRADA", cupos: 1, perfil: "Bachiller, manejo de office.", corte: "Corte 2" },
  { id: "vac-3", empresaId: "emp-2", nombre: "Vendedor de mostrador", cargo: "Vendedor", estado: "ACTIVA", cupos: 3, perfil: "Experiencia en atención al cliente.", corte: "Corte 2" },
  { id: "vac-4", empresaId: "emp-3", nombre: "Operaria de confección", cargo: "Operaria", estado: "ACTIVA", cupos: 5, perfil: "Manejo de máquina plana e industrial.", corte: "Corte 1" },
];

export const demoIntermediaciones: Intermediacion[] = [
  { id: "int-1", vacanteId: "vac-1", nombreCompleto: "Laura Martínez Rojas", documento: "1032xxxx45", estado: "Contratado", fecha: "2026-08-25", corte: "Corte 2" },
  { id: "int-2", vacanteId: "vac-1", nombreCompleto: "Diana Suárez Peña", documento: "1019xxxx02", estado: "Asistió/No superó el proceso", fecha: "2026-08-26", corte: "Corte 2" },
  { id: "int-3", vacanteId: "vac-3", nombreCompleto: "Camila Gómez Silva", documento: "1022xxxx18", estado: "Citado para proceso de selección en la empresa", fecha: "2026-09-01", corte: "Corte 2" },
  { id: "int-4", vacanteId: "vac-4", nombreCompleto: "Yesenia Torres Ávila", documento: "1015xxxx77", estado: "Contratado", fecha: "2026-07-28", corte: "Corte 1" },
];

export const demoColocaciones: Colocacion[] = [
  { id: "col-1", vacanteId: "vac-1", nombreCompleto: "Laura Martínez Rojas", documento: "1032xxxx45", fechaVinculacion: "2026-09-01", gestor: "Jessica Castaño", corte: "Corte 2" },
  { id: "col-2", vacanteId: "vac-4", nombreCompleto: "Yesenia Torres Ávila", documento: "1015xxxx77", fechaVinculacion: "2026-08-03", gestor: "Sara Moreno", corte: "Corte 1" },
];
