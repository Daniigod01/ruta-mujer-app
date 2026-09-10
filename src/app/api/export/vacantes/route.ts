import { fetchTodasVacantes, parseCorte } from "@/lib/zoho";
import { aCSV, respuestaCSV } from "@/lib/csv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const vacantes = await fetchTodasVacantes(corte);

  const csv = aCSV(vacantes, [
    { clave: "nombre", titulo: "Vacante" },
    { clave: "empresaNombre", titulo: "Empresa" },
    { clave: "cargo", titulo: "Cargo" },
    { clave: "estado", titulo: "Estado" },
    { clave: "cupos", titulo: "Cupos" },
    { clave: "corte", titulo: "Corte" },
  ]);

  return respuestaCSV(csv, `vacantes_${corte.replace(" ", "_")}.csv`);
}
