import { NextResponse } from "next/server";
import {
  fetchIntermediaciones,
  fetchColocaciones,
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

  const [intermediaciones, colocaciones] = await Promise.all([
    fetchIntermediaciones(id, corte),
    fetchColocaciones(id, corte),
  ]);

  const errorReal = getLastError();
  return NextResponse.json({
    intermediaciones,
    colocaciones,
    demo: isDemoMode() || Boolean(errorReal),
    error: errorReal,
  });
}
