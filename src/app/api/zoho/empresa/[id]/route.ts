import { NextResponse } from "next/server";
import { fetchAgendamientos, fetchVacantes, isDemoMode } from "@/lib/zoho";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [agendamientos, vacantes] = await Promise.all([
    fetchAgendamientos(id),
    fetchVacantes(id),
  ]);

  return NextResponse.json({ agendamientos, vacantes, demo: isDemoMode() });
}
