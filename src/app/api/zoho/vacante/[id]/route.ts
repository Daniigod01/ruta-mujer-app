import { NextResponse } from "next/server";
import { fetchIntermediaciones, fetchColocaciones, parseCorte, parseOffset } from "@/lib/zoho";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const offsetIntermediaciones = parseOffset(searchParams.get("offsetIntermediaciones"));
  const offsetColocaciones = parseOffset(searchParams.get("offsetColocaciones"));
  const soloVerificadas = searchParams.get("soloVerificadas") === "true";

  const [intermediaciones, colocaciones] = await Promise.all([
    fetchIntermediaciones(id, corte, offsetIntermediaciones),
    fetchColocaciones(id, corte, offsetColocaciones, soloVerificadas),
  ]);

  return NextResponse.json({
    intermediaciones: intermediaciones.items,
    colocaciones: colocaciones.items,
  });
}
