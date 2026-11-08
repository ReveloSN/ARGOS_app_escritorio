/** Las filas de cambios se identifican por su estado accesible de selección. */
export function onlyRows(buttons: readonly HTMLElement[]): HTMLElement[] {
  return buttons.filter((button) => button.hasAttribute("aria-current"));
}
