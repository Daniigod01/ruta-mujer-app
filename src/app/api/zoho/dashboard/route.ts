import { NextResponse } from "next/server";
import { fetchDashboard, parseCorte } from "@/lib/zoho";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const data = await fetchDashboard(corte);

  return NextResponse.json(data);
}
