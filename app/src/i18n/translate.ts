import type { Messages } from "./messages";

type LeafPaths<Node, Prefix extends string = ""> = {
  [Key in keyof Node & string]: Node[Key] extends string
    ? `${Prefix}${Key}`
    : LeafPaths<Node[Key], `${Prefix}${Key}.`>;
}[keyof Node & string];

export type TranslationKey = LeafPaths<Messages>;

export class MissingTranslationError extends Error {
  constructor(readonly key: string) {
    super(`No existe la traducción «${key}».`);
    this.name = "MissingTranslationError";
  }
}

export function translate(messages: Messages, key: TranslationKey): string {
  const value = key
    .split(".")
    .reduce<unknown>(
      (node, segment) => (node as Record<string, unknown> | undefined)?.[segment],
      messages,
    );
  if (typeof value !== "string") throw new MissingTranslationError(key);
  return value;
}
