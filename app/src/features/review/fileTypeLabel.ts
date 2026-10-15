const UNKNOWN_TYPE = "—";

/** Etiqueta corta del tipo de archivo a partir de su extensión: «PDF», «XLSX». */
export function fileTypeLabel(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toUpperCase() : UNKNOWN_TYPE;
}
