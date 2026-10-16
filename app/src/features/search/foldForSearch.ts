const COMBINING_MARKS = /\p{M}/gu;

/** Minúsculas y sin tildes: «Bogotá» encuentra «bogota», como la búsqueda del motor. */
export function foldForSearch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

export function includesFolded(text: string, query: string): boolean {
  return foldForSearch(text).includes(foldForSearch(query.trim()));
}
