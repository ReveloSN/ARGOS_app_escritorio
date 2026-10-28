/** Las filas de la lista de cambios: su detalle, abierto bajo la elegida, también tiene botones. */
export function onlyRows(buttons: readonly HTMLElement[]): HTMLElement[] {
  return buttons.filter((button) => button.hasAttribute("aria-current"));
}
