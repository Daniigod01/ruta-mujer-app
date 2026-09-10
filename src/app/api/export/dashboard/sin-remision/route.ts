import { fetchDashboard, parseCorte, parseFiltroVacantes } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const filtroVacantes = parseFiltroVacantes(searchParams.get("vacantes"));

  const datos = await fetchDashboard(corte, filtroVacantes);

  const buffer = aXLSX(
    datos.sinRemision,
    [
      { clave: "empresa", titulo: "Empresa" },
      { clave: "vacante", titulo: "Vacante" },
      { clave: "motivo", titulo: "Motivo" },
    ],
    "Sin remisión"
  );

  return respuestaXLSX(buffer, `empresas_sin_remision_${corte.replace(" ", "_")}.xlsx`);
}
