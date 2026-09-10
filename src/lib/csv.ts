// Convierte una lista de objetos a texto CSV (separado por comas, con comillas
// donde haga falta). Pensado para abrirse directo en Excel/Sheets.

export function aCSV<T extends Record<string, unknown>>(
  filas: T[],
  columnas: { clave: keyof T; titulo: string }[]
): string {
  const escapar = (valor: unknown): string => {
    const texto = valor === null || valor === undefined ? "" : String(valor);
    if (texto.includes(",") || texto.includes('"') || texto.includes("\n")) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  };

  const encabezado = columnas.map((c) => escapar(c.titulo)).join(",");
  const cuerpo = filas.map((fila) => columnas.map((c) => escapar(fila[c.clave])).join(","));
  // BOM al inicio para que Excel detecte bien los acentos (UTF-8).
  return "\uFEFF" + [encabezado, ...cuerpo].join("\n");
}

export function respuestaCSV(contenido: string, nombreArchivo: string): Response {
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
