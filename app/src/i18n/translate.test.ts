import { describe, expect, it } from "vitest";

import { MESSAGES_BY_LOCALE } from "./messages";
import {
  MissingTranslationError,
  translate,
  translatePlural,
  type TranslationKey,
} from "./translate";

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

  it("reemplaza los parámetros entre llaves", () => {
    const text = translate(MESSAGES_BY_LOCALE.es, "assistant.status.reading", {
      done: 3,
      total: 5,
    });

    expect(text).toBe("Leyendo 3 de 5 archivos");
  });

  it("falla con un error explícito si la clave no existe", () => {
    const missingKey = "app.missing" as TranslationKey;

    expect(() => translate(MESSAGES_BY_LOCALE.es, missingKey)).toThrow(MissingTranslationError);
  });
});

describe("translatePlural", () => {
  it.each([
    [1, "1 aparición"],
    [6, "6 apariciones"],
    [1_000_000, "1000000 apariciones"],
  ])("elige singular o plural en español para %i", (count, expected) => {
    expect(translatePlural(MESSAGES_BY_LOCALE.es, "es", { key: "alerts.occurrences", count })).toBe(
      expected,
    );
  });

  it("usa las reglas del inglés", () => {
    expect(
      translatePlural(MESSAGES_BY_LOCALE.en, "en", { key: "alerts.occurrences", count: 1 }),
    ).toBe("1 occurrence");
  });
});

describe("catálogos de idioma", () => {
  it("español e inglés tienen exactamente las mismas claves", () => {
    expect(collectKeys(MESSAGES_BY_LOCALE.en).sort()).toEqual(
      collectKeys(MESSAGES_BY_LOCALE.es).sort(),
    );
  });
});
