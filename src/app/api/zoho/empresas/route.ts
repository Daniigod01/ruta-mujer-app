import { NextResponse } from "next/server";
import { fetchEmpresas, parseCorte, parseOffset } from "@/lib/zoho";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const offset = parseOffset(searchParams.get("offset"));

  const { items, hasMore } = await fetchEmpresas(corte, offset);

  return NextResponse.json({ empresas: items, hasMore, corte });
}
