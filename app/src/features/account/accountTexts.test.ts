import { describe, expect, it } from "vitest";

import en from "../../i18n/en.json";
import es from "../../i18n/es.json";

function leaves(node: unknown, prefix = ""): [string, string][] {
  if (typeof node === "string") return [[prefix, node]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

const SCOPES = [
  (messages: typeof es) => ({ account: messages.account }),
  (messages: typeof es) => ({ settingsAccount: messages.settings.account }),
  (messages: typeof es) => ({ settingsPrivacy: messages.settings.privacy }),
  (messages: typeof es) => ({
    nav: [messages.navigation.accountLabel, messages.navigation.accountExpired],
  }),
];

describe("textos de la cuenta", () => {
  it.each(SCOPES)("es y en tienen las mismas claves", (scope) => {
    const spanish = leaves(scope(es)).map(([key]) => key);
    const english = leaves(scope(en)).map(([key]) => key);

    expect(english).toEqual(spanish);
  });

  it("ningún texto lleva exclamaciones, vacíos ni jerga de diseño", () => {
    const texts = [...leaves(es.account), ...leaves(en.account)].map(([, text]) => text);

    for (const text of texts) {
      expect(text.trim()).not.toBe("");
      expect(text).not.toMatch(/[!¡]/);
      expect(text).not.toMatch(/átomo|molécula|organismo|atom|molecule|organism/i);
    }
  });

  it("un dato no aceptado también puede ser una contraseña larga", () => {
    expect(es.account.problems.invalid_value.why).toMatch(/contraseña.*72 caracteres/);
    expect(en.account.problems.invalid_value.why).toMatch(/password.*72 characters/);
  });

  it("el aviso de privacidad es el acordado", () => {
    expect(es.account.privacy).toBe(
      "Su correo y contraseña se envían a Supabase solo para verificar la cuenta. Sus documentos no salen del equipo.",
    );
  });
});
