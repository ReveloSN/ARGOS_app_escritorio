import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFormatters } from "../../i18n/formatters";
import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import {
  isPluralKey,
  isTranslationKey,
  translate,
  translatePlural,
  type PluralRequest,
  type TranslationKey,
  type TranslationParams,
} from "../../i18n/translate";
import type { AlertResult, ReviewResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CONTRACT_ALERT, REVIEW } from "../../test/reviewFixtures";
import { alertTitle } from "./alertPresentation";
import { describeDifference } from "./differenceDescription";
import { explanationText } from "./explanationText";

const messages = MESSAGES_BY_LOCALE.es;
const i18n = {
  t: (key: TranslationKey, params?: TranslationParams) => translate(messages, key, params),
  tPlural: (request: PluralRequest) => translatePlural(messages, "es", request),
  isKey: (key: string): key is TranslationKey => isTranslationKey(messages, key),
  isPluralKey: (key: string) => isPluralKey(messages, key),
  format: createFormatters("es-CO", "es"),
};

const REFERENCED: AlertResult = {
  ...CONTRACT_ALERT,
  number: 1,
  entityType: "period",
  differenceKind: "referenced_period",
  confidence: 0.86,
  highlightPositions: [],
  first: {
    value: "junio",
    normalizedValue: "XXXX-06",
    occurrences: [
      {
        document: "correo.eml",
        location: { kind: "email_part", part: "body" },
        excerpt: "Adjunto el informe de junio con las tarifas.",
      },
    ],
  },
  second: {
    value: "mayo 2026",
    normalizedValue: "2026-05",
    occurrences: [
      {
        document: "Anexo_2_tarifas.xlsx",
        location: { kind: "sheet_cell", sheet: "Resumen", cell: "A1" },
        excerpt: "Tarifas mayo 2026",
      },
    ],
  },
  explanation: [
    {
      key: "explanation.lead.period",
      params: { first: "correo.eml", second: "Anexo_2_tarifas.xlsx" },
      count: null,
    },
    {
      key: "explanation.cause.referenced_period",
      params: { mentioned: "junio", attached: "mayo 2026", attachment: "Anexo_2_tarifas.xlsx" },
      count: null,
    },
  ],
};

describe("explicación de la alerta", () => {
  it("arma el párrafo en el idioma de la interfaz, con singular y plural", () => {
    expect(explanationText(CONTRACT_ALERT.explanation, i18n)).toBe(
      "«contrato.txt» y «anexo.pdf» citan números de contrato distintos. " +
        "Los caracteres 2 y 3 aparecen en orden invertido, lo que suele indicar un error de digitación. " +
        "El Valor A aparece 2 veces y el Valor B, una sola: lo más probable es que el error esté en el Valor B.",
    );
  });

  it("omite una frase que esta versión de la interfaz no conoce", () => {
    const parts = [
      { key: "explanation.desconocida", params: {}, count: null },
      { key: "explanation.feedback", params: { errors: 1 }, count: 3 },
    ];

    expect(explanationText(parts, i18n)).toBe(
      "En revisiones anteriores marcó como error 1 de 3 alertas parecidas.",
    );
  });

  it("las alertas semánticas y de anomalías tienen título y diferencia propios", () => {
    expect(alertTitle(REFERENCED, i18n.t)).toBe(
      "El correo cita un periodo distinto al de su adjunto",
    );
    expect(describeDifference(REFERENCED, i18n).description).toBe(
      "Diferencia: el periodo citado en el correo no es el del adjunto",
    );
    expect(
      alertTitle({ ...REFERENCED, entityType: "money", differenceKind: "magnitude" }, i18n.t),
    ).toBe("El mismo monto aparece con otra escala");
  });
});

describe("explicación en el detalle", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra el párrafo y, si la alerta viene de la IA, la presenta como sugerencia con su confianza", async () => {
    const review: ReviewResult = { ...REVIEW, alerts: [REFERENCED] };
    renderApp(fakeEngineServices(), review);
    await act(() => Promise.resolve());
    await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
    const table = screen.getByRole("table", { name: "Lista de alertas" });
    await userEvent.click(within(table).getAllByRole("row")[2] ?? table);

    expect(
      screen.getByRole("heading", { name: "El correo cita un periodo distinto al de su adjunto" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/El correo menciona «junio» y su adjunto «Anexo_2_tarifas.xlsx»/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sugerencia de la IA local · confianza 86/)).toBeInTheDocument();
  });
});
