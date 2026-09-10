import { fetchTodasVacantes, parseCorte } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const vacantes = await fetchTodasVacantes(corte);

  const buffer = aXLSX(
    vacantes,
    [
      { clave: "nombre", titulo: "Vacante" },
      { clave: "empresaNombre", titulo: "Empresa" },
      { clave: "cargo", titulo: "Cargo" },
      { clave: "estado", titulo: "Estado" },
      { clave: "cupos", titulo: "Cupos" },
      { clave: "corte", titulo: "Corte" },
    ],
    "Vacantes"
  );

  return respuestaXLSX(buffer, `vacantes_${corte.replace(" ", "_")}.xlsx`);
}
