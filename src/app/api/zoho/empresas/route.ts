import { NextResponse } from "next/server";
import { fetchEmpresas, parseCorte, parseOffset, parseFiltroVacantes } from "@/lib/zoho";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const offset = parseOffset(searchParams.get("offset"));
  const filtroVacantes = parseFiltroVacantes(searchParams.get("vacantes"));

  const { items, hasMore } = await fetchEmpresas(corte, offset, filtroVacantes);

  return NextResponse.json({ empresas: items, hasMore, corte });
}
