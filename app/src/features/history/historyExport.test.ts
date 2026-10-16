import { describe, expect, it } from "vitest";

import { createFormatters } from "../../i18n/formatters";
import { MESSAGES_BY_LOCALE, type Locale, type Region } from "../../i18n/messages";
import { translate, type TranslationKey, type TranslationParams } from "../../i18n/translate";
import type { HistoryRecordResult } from "../../services/engine/historyTypes";
import { formatDuration } from "./formatDuration";
import { buildHistoryCsv } from "./historyCsv";

function i18nFor(locale: Locale, region: Region) {
  return {
    t: (key: TranslationKey, params?: TranslationParams) =>
      translate(MESSAGES_BY_LOCALE[locale], key, params),
    format: createFormatters(region, locale),
  };
}

const PENDING: HistoryRecordResult = {
  sessionName: 'Contrato "Bodega" 2026',
  sessionCreatedAt: "2026-10-15T10:00:00+00:00",
  alertNumber: 2,
  risk: "medium",
  entityType: "person_name",
  firstValue: "María Rojas Pérez",
  secondValue: "María Rojas Peña",
  decision: null,
  correctSide: null,
  decidedAt: null,
};

describe("registro CSV del historial", () => {
  it("usa «;» donde la coma es decimal y escapa las comillas", () => {
    const csv = buildHistoryCsv([PENDING], i18nFor("es", "es-CO"));
    const [header, row] = csv.split("\r\n");

    expect(header).toBe(
      '"Sesión";"Fecha de la sesión";"Alerta";"Riesgo";"Tipo";"Valor A";"Valor B";"Decisión";"Valor correcto";"Fecha de la decisión"',
    );
    expect(row).toContain('"Contrato ""Bodega"" 2026"');
    expect(row).toContain(
      '"Medio";"Nombre";"María Rojas Pérez";"María Rojas Peña";"Pendiente";"";""',
    );
  });

  it("usa «,» con el formato regional de Estados Unidos", () => {
    const csv = buildHistoryCsv([], i18nFor("en", "en-US"));

    expect(csv.startsWith('"Session","Session date"')).toBe(true);
  });
});

describe("duración de una revisión", () => {
  const { t } = i18nFor("es", "es-CO");

  it.each([
    [45, "45 s"],
    [400, "6 min 40 s"],
    [3900, "1 h 5 min"],
  ])("%d segundos se muestran como «%s»", (seconds, text) => {
    expect(formatDuration(seconds, t)).toBe(text);
  });
});
