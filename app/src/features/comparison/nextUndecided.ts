/** El siguiente número sin decidir tras `current`, dando la vuelta a la lista; undefined si ya no queda ninguno. */
export function nextUndecided(
  numbers: readonly number[],
  decided: ReadonlySet<number>,
  current: number | undefined,
): number | undefined {
  const start = current === undefined ? 0 : numbers.indexOf(current) + 1;
  const ordered = [...numbers.slice(start), ...numbers.slice(0, start)];
  return ordered.find((number) => !decided.has(number));
}
