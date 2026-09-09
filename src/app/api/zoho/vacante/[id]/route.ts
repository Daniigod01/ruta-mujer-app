import { NextResponse } from "next/server";
import {
  fetchIntermediaciones,
  fetchColocaciones,
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
  const [intermediaciones, colocaciones] = await Promise.all([
    fetchIntermediaciones(id),
    fetchColocaciones(id),
  ]);

  const errorReal = getLastError();
  return NextResponse.json({
    intermediaciones,
    colocaciones,
    demo: isDemoMode() || Boolean(errorReal),
    error: errorReal,
  });
}
