import { describe, expect, it } from "vitest";

import { createFormatters } from "./formatters";

// Intl separa símbolo y cifra con espacios no separables; `\s` los incluye y se vuelven espacios.
function plain(text: string): string {
  return text.replace(/\s/g, " ");
}

const DATE = new Date(2026, 9, 13, 9, 42);

describe("formatos regionales", () => {
  it("es-CO usa día/mes/año, punto de miles y coma decimal", () => {
    const format = createFormatters("es");

    expect(format.date(DATE)).toBe("13/10/2026");
    expect(plain(format.amount(18_450_000, "COP"))).toBe("$ 18.450.000,00");
    // El espacio antes de «%» depende de la versión de los datos regionales (CLDR).
    expect(format.percent(0.31).replace(/\s/g, "")).toBe("31%");
  });

  it("en-US usa mes/día/año y coma de miles", () => {
    const format = createFormatters("en");

    expect(format.date(DATE)).toBe("10/13/2026");
    expect(plain(format.amount(18_450_000, "COP"))).toBe("COP 18,450,000.00");
    expect(plain(format.percent(0.31))).toBe("31%");
  });

  it("muestra fecha y hora para las sesiones del historial", () => {
    expect(createFormatters("es").dateTime(DATE)).toBe("13/10/2026 09:42");
  });
});
