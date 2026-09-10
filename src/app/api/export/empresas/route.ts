import { fetchTodasEmpresas, parseCorte } from "@/lib/zoho";
import { aXLSX, respuestaXLSX } from "@/lib/xlsx";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const empresas = await fetchTodasEmpresas(corte);

  const filas = empresas.map((e) => ({
    ...e,
    tieneVacantesTexto: e.tieneVacantes ? "Sí" : "No",
    tieneAgendamientoTexto: e.tieneAgendamiento ? "Sí" : "No",
  }));

  const buffer = aXLSX(
    filas,
    [
      { clave: "nombre", titulo: "Empresa" },
      { clave: "nit", titulo: "NIT" },
      { clave: "departamento", titulo: "Departamento" },
      { clave: "municipio", titulo: "Municipio" },
      { clave: "sector", titulo: "Sector" },
      { clave: "tamano", titulo: "Tamaño" },
      { clave: "numVacantes", titulo: "N° vacantes" },
      { clave: "tieneVacantesTexto", titulo: "Tiene vacantes" },
      { clave: "tieneAgendamientoTexto", titulo: "Tiene agendamiento" },
      { clave: "corte", titulo: "Corte" },
    ],
    "Empresas"
  );

  return respuestaXLSX(buffer, `empresas_${corte.replace(" ", "_")}.xlsx`);
}
