import { NextResponse } from "next/server";
import { fetchDashboard, parseCorte, parseFiltroVacantes } from "@/lib/zoho";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const filtroVacantes = parseFiltroVacantes(searchParams.get("vacantes"));

  const data = await fetchDashboard(corte, filtroVacantes);

  return NextResponse.json(data);
}
