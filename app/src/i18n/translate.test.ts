import { describe, expect, it } from "vitest";

import { MESSAGES_BY_LOCALE } from "./messages";
import { MissingTranslationError, translate, type TranslationKey } from "./translate";

function collectKeys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === "string"
      ? [`${prefix}${key}`]
      : collectKeys(value as object, `${prefix}${key}.`),
  );
}

describe("translate", () => {
  it("devuelve el texto de una clave anidada", () => {
    expect(translate(MESSAGES_BY_LOCALE.es, "app.name")).toBe("ARGUS");
  });

  it("falla con un error explícito si la clave no existe", () => {
    const missingKey = "app.missing" as TranslationKey;

    expect(() => translate(MESSAGES_BY_LOCALE.es, missingKey)).toThrow(MissingTranslationError);
  });
});

describe("catálogos de idioma", () => {
  it("español e inglés tienen exactamente las mismas claves", () => {
    expect(collectKeys(MESSAGES_BY_LOCALE.en).sort()).toEqual(
      collectKeys(MESSAGES_BY_LOCALE.es).sort(),
    );
  });
});
