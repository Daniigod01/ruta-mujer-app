import { NextResponse } from "next/server";
import {
  fetchAgendamientos,
  fetchVacantes,
  isDemoMode,
  clearLastError,
  getLastError,
  parseCorte,
} from "@/lib/zoho";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  clearLastError();
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const [agendamientos, vacantes] = await Promise.all([
    fetchAgendamientos(id, corte),
    fetchVacantes(id, corte),
  ]);

  const errorReal = getLastError();
  return NextResponse.json({
    agendamientos,
    vacantes,
    demo: isDemoMode() || Boolean(errorReal),
    error: errorReal,
  });
}
