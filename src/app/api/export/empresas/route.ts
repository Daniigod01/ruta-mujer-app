import { fetchTodasEmpresas, parseCorte } from "@/lib/zoho";
import { aCSV, respuestaCSV } from "@/lib/csv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corte = parseCorte(searchParams.get("corte"));

  const empresas = await fetchTodasEmpresas(corte);

  const csv = aCSV(empresas, [
    { clave: "nombre", titulo: "Empresa" },
    { clave: "nit", titulo: "NIT" },
    { clave: "departamento", titulo: "Departamento" },
    { clave: "municipio", titulo: "Municipio" },
    { clave: "sector", titulo: "Sector" },
    { clave: "tamano", titulo: "Tamaño" },
    { clave: "tieneVacantes", titulo: "Tiene vacantes" },
    { clave: "corte", titulo: "Corte" },
  ]);

  return respuestaCSV(csv, `empresas_${corte.replace(" ", "_")}.csv`);
}
