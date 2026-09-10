import * as XLSX from "xlsx";

// Convierte una lista de objetos a un archivo .xlsx (Excel real, no CSV).
export function aXLSX<T extends Record<string, unknown>>(
  filas: T[],
  columnas: { clave: keyof T; titulo: string }[],
  nombreHoja: string = "Datos"
): Buffer {
  const datos = filas.map((fila) => {
    const objeto: Record<string, unknown> = {};
    for (const c of columnas) objeto[c.titulo] = fila[c.clave];
    return objeto;
  });

  const hoja = XLSX.utils.json_to_sheet(datos, {
    header: columnas.map((c) => c.titulo),
  });

  // Ancho de columna aproximado según el contenido más largo.
  hoja["!cols"] = columnas.map((c) => {
    const largoTitulo = c.titulo.length;
    const largoMax = datos.reduce((max, fila) => {
      const valor = fila[c.titulo];
      const largo = valor === null || valor === undefined ? 0 : String(valor).length;
      return Math.max(max, largo);
    }, largoTitulo);
    return { wch: Math.min(Math.max(largoMax + 2, 10), 50) };
  });

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, nombreHoja.slice(0, 31));

  return XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function respuestaXLSX(buffer: Buffer, nombreArchivo: string): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
