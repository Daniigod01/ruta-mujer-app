import { NextResponse } from "next/server";
import { fetchEmpresas, fetchAgendamientos, fetchVacantes, isDemoMode } from "@/lib/zoho";

export async function GET() {
  const empresas = await fetchEmpresas();

  // Para cada empresa traemos un resumen rápido (último agendamiento + total de vacantes activas)
  const conResumen = await Promise.all(
    empresas.map(async (empresa) => {
      const [agendamientos, vacantes] = await Promise.all([
        fetchAgendamientos(empresa.id),
        fetchVacantes(empresa.id),
      ]);
      const ultimoAgendamiento = agendamientos[0] ?? null;
      const vacantesActivas = vacantes.filter((v) => v.estado === "ACTIVA").length;

      return {
        ...empresa,
        ultimoAgendamiento,
        totalVacantes: vacantes.length,
        vacantesActivas,
      };
    })
  );

  return NextResponse.json({ empresas: conResumen, demo: isDemoMode() });
}
