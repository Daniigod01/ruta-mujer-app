import { NextResponse } from "next/server";
import {
  fetchAgendamientos,
  fetchVacantes,
  fetchResumenEmpresa,
  parseCorte,
  parseOffset,
} from "@/lib/zoho";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const nombre = searchParams.get("nombre") ?? "";
  const offsetAgendamientos = parseOffset(searchParams.get("offsetAgendamientos"));
  const offsetVacantes = parseOffset(searchParams.get("offsetVacantes"));

  const [agendamientos, vacantes, resumen] = await Promise.all([
    fetchAgendamientos(id, nombre, corte, offsetAgendamientos),
    fetchVacantes(id, corte, offsetVacantes),
    fetchResumenEmpresa(nombre, corte),
  ]);

  return NextResponse.json({
    agendamientos: agendamientos.items,
    hasMoreAgendamientos: agendamientos.hasMore,
    vacantes: vacantes.items,
    hasMoreVacantes: vacantes.hasMore,
    resumen,
  });
}
