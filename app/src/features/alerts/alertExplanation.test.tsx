import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChangeExplanationResult } from "../../services/engine/aiTypes";
import type { AlertResult } from "../../services/engine/reviewTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CONTRACT_ALERT, REVIEW } from "../../test/reviewFixtures";

const IMPOSSIBLE_DATE: AlertResult = {
  number: 1,
  risk: "high",
  entityType: "date",
  differenceKind: "impossible_date",
  confidence: 0.99,
  highlightPositions: [],
  first: {
    value: "31/02/2026",
    normalizedValue: "31/02/2026",
    occurrences: [
      {
        document: "Contrato.docx",
        location: { kind: "paragraph", paragraph: 4 },
        excerpt: "Entrega el 31/02/2026.",
      },
    ],
  },
  second: null,
  explanation: [
    {
      key: "explanation.internal.impossible_date",
      params: { document: "Contrato.docx", first: "31/02/2026", second: "" },
      count: null,
    },
  ],
};
const LOCAL: ChangeExplanationResult = {
  source: "template",
  parts: CONTRACT_ALERT.explanation,
  text: "",
  fallbackReason: null,
};
const FROM_AI: ChangeExplanationResult = {
  ...LOCAL,
  source: "ai",
  parts: [],
  text: "El anexo cita 1324 y el contrato 1234: dos cifras intercambiadas.",
};

async function openAlertAndExplain(
  explainAlert: () => Promise<ChangeExplanationResult>,
  review = REVIEW,
) {
  renderApp(fakeEngineServices({ ai: { explainAlert } }), review);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
  const table = screen.getByRole("table", { name: "Lista de alertas" });
  await userEvent.click(within(table).getAllByRole("row")[2] ?? table);
  await userEvent.click(screen.getByRole("button", { name: "Explicar esta alerta" }));
}

describe("Explicar esta alerta", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("una alerta de dos valores cita el archivo y la página de cada uno", async () => {
    const explainAlert = vi.fn(() => Promise.resolve(FROM_AI));
    await openAlertAndExplain(explainAlert);

    expect(explainAlert).toHaveBeenCalledWith("s-1", 1, "es");
    expect(await screen.findByText("Sugerencia de IA")).toBeInTheDocument();
    expect(screen.getByText(FROM_AI.text)).toBeInTheDocument();
    expect(screen.getByText("contrato.txt · Línea 1")).toBeInTheDocument();
    expect(screen.getByText("anexo.pdf · Página 3")).toBeInTheDocument();
    expect(screen.getByText(/la decisión sigue siendo suya/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Es un error/ })).toBeEnabled();
  });

  it("una alerta de un solo valor cita su único origen", async () => {
    const explainAlert = vi.fn(() => Promise.resolve(FROM_AI));
    await openAlertAndExplain(explainAlert, { ...REVIEW, alerts: [IMPOSSIBLE_DATE] });

    expect(await screen.findByText("Sugerencia de IA")).toBeInTheDocument();
    const quotes = screen.getAllByText(/Contrato\.docx · Párrafo 4/);
    expect(quotes).toHaveLength(1);
    const cited = screen.getAllByText("Entrega el 31/02/2026.");
    expect(cited.some((element) => element.closest("blockquote") !== null)).toBe(true);
  });

  it("sin clave usa la explicación local y lo explica en tres partes", async () => {
    const noKey = { ...LOCAL, fallbackReason: "no_key" as const };
    await openAlertAndExplain(() => Promise.resolve(noKey));

    expect(await screen.findByText("Explicación de ARGUS")).toBeInTheDocument();
    expect(
      screen.getByText("La IA está activada, pero no hay una clave guardada."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sin la clave, ARGUS no puede pedir/)).toBeInTheDocument();
    expect(screen.getByText(/Guarde la clave en Ajustes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("si el proveedor no responde, lo dice y Reintentar vuelve a pedirla", async () => {
    const offline = { ...LOCAL, fallbackReason: "provider_unavailable" as const };
    const explainAlert = vi.fn().mockResolvedValueOnce(offline).mockResolvedValueOnce(FROM_AI);
    await openAlertAndExplain(explainAlert);

    expect(await screen.findByText("El proveedor de IA no respondió.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(explainAlert).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Sugerencia de IA")).toBeInTheDocument();
  });

  it("si el motor no responde, lo dice sin inventar una explicación", async () => {
    await openAlertAndExplain(() => Promise.reject(new Error("motor detenido")));

    expect(await screen.findByText(/No se pudo obtener la explicación/)).toBeInTheDocument();
    expect(screen.queryByText("Sugerencia de IA")).not.toBeInTheDocument();
  });
});
