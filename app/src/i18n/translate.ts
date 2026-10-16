import { REGION_BY_LOCALE, type Locale, type Messages } from "./messages";

interface PluralNode {
  readonly one: string;
  readonly other: string;
}

type LeafPaths<Node, Prefix extends string = ""> = {
  [Key in keyof Node & string]: Node[Key] extends string
    ? `${Prefix}${Key}`
    : LeafPaths<Node[Key], `${Prefix}${Key}.`>;
}[keyof Node & string];

type PluralPaths<Node, Prefix extends string = ""> = {
  [Key in keyof Node & string]: Node[Key] extends PluralNode
    ? `${Prefix}${Key}`
    : Node[Key] extends string
      ? never
      : PluralPaths<Node[Key], `${Prefix}${Key}.`>;
}[keyof Node & string];

export type TranslationKey = LeafPaths<Messages>;
export type PluralKey = PluralPaths<Messages>;
export type TranslationParams = Readonly<Record<string, string | number>>;

const PARAMETER = /\{(\w+)\}/g;

export class MissingTranslationError extends Error {
  constructor(readonly key: string) {
    super(`No existe la traducción «${key}».`);
    this.name = "MissingTranslationError";
  }
}

function nodeAt(messages: Messages, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, segment) => (node as Record<string, unknown> | undefined)?.[segment],
      messages,
    );
}

/** Si la clave existe como texto: las claves que llegan del motor se validan antes de usarlas. */
export function isTranslationKey(messages: Messages, key: string): key is TranslationKey {
  return typeof nodeAt(messages, key) === "string";
}

export function isPluralKey(messages: Messages, key: string): key is PluralKey {
  const node = nodeAt(messages, key) as Partial<PluralNode> | undefined;
  return typeof node?.one === "string" && typeof node.other === "string";
}

export function translate(
  messages: Messages,
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  const value = nodeAt(messages, key);
  if (typeof value !== "string") throw new MissingTranslationError(key);
  return value.replace(PARAMETER, (match, name: string) => String(params[name] ?? match));
}

export interface PluralRequest {
  readonly key: PluralKey;
  readonly count: number;
  readonly params?: TranslationParams;
}

/** Elige singular o plural con las reglas del idioma; {count} queda disponible en el texto. */
export function translatePlural(
  messages: Messages,
  locale: Locale,
  { key, count, params = {} }: PluralRequest,
): string {
  const category = new Intl.PluralRules(REGION_BY_LOCALE[locale]).select(count);
  const form = category === "one" ? "one" : "other";
  return translate(messages, `${key}.${form}` as TranslationKey, { count, ...params });
}
