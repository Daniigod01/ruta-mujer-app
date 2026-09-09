import { NextResponse } from "next/server";
import {
  fetchEmpresas,
  fetchAgendamientos,
  fetchVacantes,
  isDemoMode,
  clearLastError,
  getLastError,
  parseCorte,
} from "@/lib/zoho";

export async function GET(req: Request) {
  clearLastError();

  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const empresas = await fetchEmpresas(corte);

  // Para cada empresa traemos un resumen rápido (último agendamiento + total de vacantes activas)
  const conResumen = await Promise.all(
    empresas.map(async (empresa) => {
      const [agendamientos, vacantes] = await Promise.all([
        fetchAgendamientos(empresa.id, corte),
        fetchVacantes(empresa.id, corte),
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

  const errorReal = getLastError();

  return NextResponse.json({
    empresas: conResumen,
    corte,
    // "demo" ahora refleja si REALMENTE se usaron datos de prueba
    // (por falta de credenciales, o porque la conexión a Zoho falló).
    demo: isDemoMode() || Boolean(errorReal),
    error: errorReal, // null si todo salió bien
  });
}
