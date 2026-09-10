import { NextResponse } from "next/server";
import { checkZohoHealth } from "@/lib/zoho";

// Endpoint liviano solo para el indicador de "estado de conexión" en la app.
export async function GET() {
  const resultado = await checkZohoHealth();
  return NextResponse.json(resultado);
}
