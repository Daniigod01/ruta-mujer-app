import { fetchTodosAgendamientos, parseCorte } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const agendamientos = await fetchTodosAgendamientos(corte);

  const buffer = aXLSX(
    agendamientos,
    [
      { clave: "empresaNombre", titulo: "Empresa" },
      { clave: "tipoActividad", titulo: "Tipo de actividad" },
      { clave: "fecha", titulo: "Fecha" },
      { clave: "estado", titulo: "Estado" },
      { clave: "modalidad", titulo: "Modalidad" },
      { clave: "corte", titulo: "Corte" },
    ],
    "Agendamiento"
  );

  return respuestaXLSX(buffer, `agendamientos_${corte.replace(" ", "_")}.xlsx`);
}
