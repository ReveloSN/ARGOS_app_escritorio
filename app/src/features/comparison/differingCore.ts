/** Los caracteres que difieren dentro del tramo; lo que queda antes y después es igual en A y en B. */
export interface DifferingCore {
  readonly start: number;
  readonly end: number;
}

export interface DifferingCores {
  readonly first: DifferingCore;
  readonly second: DifferingCore;
}

function commonPrefix(first: string, second: string): number {
  let length = 0;
  while (length < Math.min(first.length, second.length) && first[length] === second[length]) {
    length += 1;
  }
  return length;
}

function commonSuffix(first: string, second: string, prefix: number): number {
  const room = Math.min(first.length, second.length) - prefix;
  let length = 0;
  while (length < room && first.at(-1 - length) === second.at(-1 - length)) length += 1;
  return length;
}

/** Prefijo y sufijo en común de dos textos: lo que queda en medio es lo que de verdad cambió. */
export function differingCores(first: string, second: string): DifferingCores | undefined {
  if (!first || !second) return undefined;
  const prefix = commonPrefix(first, second);
  const suffix = commonSuffix(first, second, prefix);
  if (!prefix && !suffix) return undefined;
  return {
    first: { start: prefix, end: first.length - suffix },
    second: { start: prefix, end: second.length - suffix },
  };
}
