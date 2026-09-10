import { fetchTodosParticipantes, parseCorte } from "@/lib/zoho";
import { aCSV, respuestaCSV } from "@/lib/csv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const participantes = await fetchTodosParticipantes(corte);

  const csv = aCSV(participantes, [
    { clave: "tipo", titulo: "Tipo" },
    { clave: "nombreCompleto", titulo: "Nombre completo" },
    { clave: "empresa", titulo: "Empresa" },
    { clave: "vacante", titulo: "Vacante" },
    { clave: "estadoOVerificado", titulo: "Estado / Verificación" },
    { clave: "fecha", titulo: "Fecha" },
    { clave: "corte", titulo: "Corte" },
  ]);

  return respuestaCSV(csv, `participantes_${corte.replace(" ", "_")}.csv`);
}
