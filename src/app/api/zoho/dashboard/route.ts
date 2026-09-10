import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    totalEmpresas: 83, totalVacantesActivas: 92,
    agendamientoPorEstado: [{ estado: "Realizada", cantidad: 31 }, { estado: "Agendada", cantidad: 18 }],
    vacantesActivas: [{ empresa: "INNOVATECH IT SAS", vacante: "Agente Contac Center", perfil: "Bachiller con experiencia.", genero: "NO APLICA", cupos: 4 }],
    embudoTotal: { remitidas: 855, enProceso: 825, contratadas: 9, noPaso: 21 },
    embudoPorVacante: [{ empresa: "INNOVATECH IT SAS", vacante: "Agente Contac Center", remitidas: 84, enProceso: 80, contratadas: 2, noPaso: 2 }],
    sinRemision: [{ empresa: "REDEBAN S.A.", vacante: "Analista de Riesgo", motivo: "Sin motivo registrado" }],
    novedades: [{ empresa: "BBVA", vacante: "Cajero", novedad: "La empresa canceló temporalmente la vacante." }],
  });
}
