import { fetchDashboard, parseCorte, parseFiltroVacantes } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));
  const filtroVacantes = parseFiltroVacantes(searchParams.get("vacantes"));

  const datos = await fetchDashboard(corte, filtroVacantes);

  const buffer = aXLSX(
    datos.vacantesActivas,
    [
      { clave: "empresa", titulo: "Empresa" },
      { clave: "vacante", titulo: "Vacante" },
      { clave: "cupos", titulo: "Cupos" },
      { clave: "genero", titulo: "Género" },
      { clave: "perfil", titulo: "Perfil" },
    ],
    "Vacantes activadas"
  );

  return respuestaXLSX(buffer, `vacantes_activadas_${corte.replace(" ", "_")}.xlsx`);
}
