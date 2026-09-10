import { fetchDashboard, parseCorte, parseFiltroVacantes } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const filtroVacantes = parseFiltroVacantes(searchParams.get("vacantes"));

  const datos = await fetchDashboard(corte, filtroVacantes);

  const buffer = aXLSX(
    datos.novedades,
    [
      { clave: "empresa", titulo: "Empresa" },
      { clave: "vacante", titulo: "Vacante" },
      { clave: "novedad", titulo: "Novedad" },
    ],
    "Novedades"
  );

  return respuestaXLSX(buffer, `novedades_${corte.replace(" ", "_")}.xlsx`);
}
