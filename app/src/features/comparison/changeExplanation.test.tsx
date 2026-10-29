import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChangeExplanationResult } from "../../services/engine/aiTypes";
import { comparison } from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const TEMPLATE: ChangeExplanationResult = {
  source: "template",
  parts: [{ key: "changeExplanation.number", params: {}, count: null }],
  text: "",
  fallbackReason: null,
  structure: null,
};
const FROM_AI: ChangeExplanationResult = {
  ...TEMPLATE,
  source: "ai",
  parts: [],
  text: "El número del contrato pasó de 4857 a 4587 y eso puede ser otro contrato.",
  structure: {
    summary: "El número del contrato cambió.",
    whatChanged: "El 4857 ahora dice 4587.",
    whyItMatters: "Puede ser otro contrato.",
    whatToDo: "Pregunte cuál es el número correcto.",
  },
};

async function openFirstChange(explainChange: () => Promise<ChangeExplanationResult>) {
  const startComparison = vi.fn(() => Promise.resolve(comparison()));
  renderApp(fakeEngineServices({ comparisons: { startComparison }, ai: { explainChange } }));
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), [
    new File(["a"], "v1.docx"),
    new File(["b"], "v2.docx"),
  ]);
  await screen.findByRole("heading", { name: "Comparar documentos" });
}

const panel = () => within(screen.getByRole("region", { name: "Explicación del cambio" }));

describe("Panel de explicación de un cambio", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rotula la sugerencia de significado en lenguaje claro, sin etiquetas técnicas", async () => {
    await openFirstChange(() => Promise.resolve(TEMPLATE));

    expect(panel().getAllByText("Posible cambio de significado").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^IA: /)).not.toBeInTheDocument();
    expect(panel().getByText("Sugerencia de IA, usted decide")).toBeInTheDocument();
  });

  it("se entiende de un vistazo: frase, las decisiones justo debajo, los dos valores y tres bloques", async () => {
    const explainChange = vi.fn(() => Promise.resolve(TEMPLATE));
    await openFirstChange(explainChange);

    expect(
      panel().getByRole("heading", { name: "En el documento B, «4857» pasa a ser «4587»." }),
    ).toBeInTheDocument();
    const a = panel().getByRole("region", { name: "Documento A dice: Contrato_v2.docx" });
    const b = panel().getByRole("region", { name: "Documento B dice: Contrato_v3.docx" });
    expect(within(a).getByText("4857").tagName).toBe("MARK");
    expect(within(b).getByText("4587").tagName).toBe("MARK");
    const titles = ["Qué cambió", "Por qué importa", "Qué puede hacer"].map((title) =>
      panel().getByText(title),
    );
    expect(titles).toHaveLength(3);
    expect(panel().getByText("Cambia un número o identificador.")).toBeInTheDocument();
    const decision = panel().getByRole("button", { name: /Es un error/ });
    expect(titles[0]?.compareDocumentPosition(decision)).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(explainChange).not.toHaveBeenCalled();
  });

  it("lo que falta en un documento se dice con texto e ícono, no solo con color", async () => {
    await openFirstChange(() => Promise.resolve(TEMPLATE));

    await userEvent.click(screen.getByRole("button", { name: /Cláusula penal/ }));

    const b = panel().getByRole("region", { name: "Documento B dice: Contrato_v3.docx" });
    expect(within(b).getByText("Cláusula penal por $ 5.000.000.").tagName).toBe("INS");
    const a = panel().getByRole("region", { name: "Documento A dice: Contrato_v2.docx" });
    expect(within(a).getByText("No aparece en este documento")).toBeInTheDocument();
  });

  it("«Ver detalle» pide el texto largo solo al abrirlo y lo muestra con su origen", async () => {
    let finish: (result: ChangeExplanationResult) => void = () => undefined;
    const explainChange = vi.fn(
      () =>
        new Promise<ChangeExplanationResult>((resolve) => {
          finish = resolve;
        }),
    );
    await openFirstChange(explainChange);
    expect(explainChange).not.toHaveBeenCalled();

    await userEvent.click(panel().getByRole("button", { name: "Ver detalle" }));

    expect(explainChange).toHaveBeenCalledWith("c1", 1, "es");
    const navigation = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(navigation).getByRole("status")).toHaveAccessibleName(
      "Asistente de IA: Explicando un cambio",
    );
    await act(async () => {
      finish(TEMPLATE);
      await Promise.resolve();
    });
    const label = await panel().findByText("Explicación de ARGUS");
    const detail = within(label.parentElement ?? label);
    expect(
      detail.getByText(/Cambia un número o identificador: puede referirse/),
    ).toBeInTheDocument();
    expect(detail.getByText(/Contrato_v3.docx · /)).toBeInTheDocument();
    expect(within(navigation).getByRole("status")).not.toHaveAccessibleName(
      "Asistente de IA: Explicando un cambio",
    );
  });

  it("si la IA entrega los cuatro bloques, ocupan el lugar de la plantilla", async () => {
    await openFirstChange(() => Promise.resolve(FROM_AI));

    await userEvent.click(panel().getByRole("button", { name: "Ver detalle" }));

    expect(await panel().findByText("El número del contrato cambió.")).toBeInTheDocument();
    expect(panel().getByText("Pregunte cuál es el número correcto.")).toBeInTheDocument();
    expect(panel().getByText("Sugerencia de IA")).toBeInTheDocument();
    expect(panel().getByText(FROM_AI.text)).toBeInTheDocument();
    expect(panel().getByText("Sugerencia de IA, usted decide")).toBeInTheDocument();
  });

  it("si la IA no pudo responder, dice por qué y deja la misma estructura con la plantilla", async () => {
    const fallback = { ...TEMPLATE, fallbackReason: "invalid_key" as const };
    await openFirstChange(() => Promise.resolve(fallback));

    await userEvent.click(panel().getByRole("button", { name: "Ver detalle" }));

    expect(await screen.findByText(/El proveedor rechazó la clave/)).toBeInTheDocument();
    expect(panel().getByText("Cambia un número o identificador.")).toBeInTheDocument();
    expect(panel().getByText("Explicación de ARGUS")).toBeInTheDocument();
  });

  it("todo es alcanzable con el teclado", async () => {
    await openFirstChange(() => Promise.resolve(TEMPLATE));
    const toggle = panel().getByRole("button", { name: "Ver detalle" });

    toggle.focus();
    await userEvent.keyboard("{Enter}");

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveFocus();
  });
});
