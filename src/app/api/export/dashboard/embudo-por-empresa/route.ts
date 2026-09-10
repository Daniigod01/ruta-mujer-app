import { fetchDashboard, parseCorte, parseFiltroVacantes } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const filtroVacantes = parseFiltroVacantes(searchParams.get("vacantes"));

  const datos = await fetchDashboard(corte, filtroVacantes);

  const buffer = aXLSX(
    datos.embudoPorEmpresa,
    [
      { clave: "empresa", titulo: "Empresa" },
      { clave: "remitidas", titulo: "Remitidas" },
      { clave: "enProceso", titulo: "En proceso" },
      { clave: "contratadas", titulo: "Contratadas" },
      { clave: "noPaso", titulo: "No pasó" },
    ],
    "Embudo por empresa"
  );

  return respuestaXLSX(buffer, `embudo_por_empresa_${corte.replace(" ", "_")}.xlsx`);
}
