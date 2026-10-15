/** Une nombres de clase omitiendo los vacíos: los CSS Modules devuelven `string | undefined`. */
export function joinClassNames(...names: readonly (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
