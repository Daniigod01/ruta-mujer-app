import { fetchTodosAgendamientos, parseCorte } from "@/lib/zoho";
import { aCSV, respuestaCSV } from "@/lib/csv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const agendamientos = await fetchTodosAgendamientos(corte);

  const csv = aCSV(agendamientos, [
    { clave: "empresaNombre", titulo: "Empresa" },
    { clave: "tipoActividad", titulo: "Tipo de actividad" },
    { clave: "fecha", titulo: "Fecha" },
    { clave: "estado", titulo: "Estado" },
    { clave: "modalidad", titulo: "Modalidad" },
    { clave: "corte", titulo: "Corte" },
  ]);

  return respuestaCSV(csv, `agendamientos_${corte.replace(" ", "_")}.csv`);
}
