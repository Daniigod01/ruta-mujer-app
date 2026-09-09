import { NextResponse } from "next/server";
import {
  fetchAgendamientos,
  fetchVacantes,
  isDemoMode,
  clearLastError,
  getLastError,
} from "@/lib/zoho";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  clearLastError();
  const { id } = await params;
  const [agendamientos, vacantes] = await Promise.all([
    fetchAgendamientos(id),
    fetchVacantes(id),
  ]);

  const errorReal = getLastError();
  return NextResponse.json({
    agendamientos,
    vacantes,
    demo: isDemoMode() || Boolean(errorReal),
    error: errorReal,
  });
}
