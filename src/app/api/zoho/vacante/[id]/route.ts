import { NextResponse } from "next/server";
import { fetchIntermediaciones, fetchColocaciones, isDemoMode } from "@/lib/zoho";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [intermediaciones, colocaciones] = await Promise.all([
    fetchIntermediaciones(id),
    fetchColocaciones(id),
  ]);

  return NextResponse.json({ intermediaciones, colocaciones, demo: isDemoMode() });
}
