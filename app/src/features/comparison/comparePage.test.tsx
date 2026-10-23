import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ComparisonRequest, ComparisonResult } from "../../services/engine/comparisonTypes";
import {
  CASE_CHANGE,
  comparison,
  MOVED_CHANGE,
  pair,
  VERSION_CHANGES,
} from "../../test/comparisonFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { inconsistency } from "../../test/inconsistencyFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const DECIDED = {
  decisions: [{ alertNumber: 2, kind: "error" as const, correctSide: null, decidedAt: "" }],
  canUndo: true,
};

function files(count: number): File[] {
  return Array.from(
    { length: count },
    (_, index) => new File(["texto"], `v${String(index + 1)}.docx`),
  );
}

function startingWith(result: ComparisonResult) {
  return vi.fn((request: ComparisonRequest) => {
    request.onProgress?.({ kind: "pair_compared", position: 0, total: 1 });
    return Promise.resolve(result);
  });
}

async function compare(services: ReturnType<typeof fakeEngineServices>, count = 2) {
  renderApp(services);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));
  await userEvent.upload(screen.getByLabelText("Elegir documentos"), files(count));
}

describe("Comparar documentos", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("empieza vacía y pide dos o más documentos", async () => {
    renderApp(fakeEngineServices());
    await act(() => Promise.resolve());

    await userEvent.click(screen.getByRole("button", { name: "Comparar dos versiones" }));

    expect(screen.getByText("Elija dos o más documentos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir documentos" })).toBeInTheDocument();
  });

  it("compara dos versiones y marca cada diferencia dentro del texto", async () => {
    const startComparison = startingWith(comparison());

    await compare(fakeEngineServices({ comparisons: { startComparison } }));

    expect(startComparison).toHaveBeenCalledWith(expect.objectContaining({ mode: "versions" }));
    expect(await screen.findByRole("heading", { name: "Comparar documentos" })).toBeInTheDocument();
    expect(screen.getAllByText("4857")[0]?.closest("mark")).not.toBeNull();
    expect(screen.getAllByText("no").some((element) => element.tagName === "INS")).toBe(true);
    expect(screen.getByText(/Movido: en A está en Párrafo 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cláusula penal/ })).toBeInTheDocument();
  });

  it("decide un cambio con el teclado y lo deshace con Ctrl Z", async () => {
    const decide = vi.fn(() => Promise.resolve(DECIDED));
    const undoDecision = vi.fn(() => Promise.resolve({ decisions: [], canUndo: false }));
    await compare(
      fakeEngineServices({
        comparisons: { startComparison: startingWith(comparison()), decide, undoDecision },
      }),
    );
    await screen.findByRole("heading", { name: "Comparar documentos" });

    await userEvent.keyboard("j");
    await userEvent.keyboard("e");

    expect(decide).toHaveBeenCalledWith("c1", { alertNumber: 2, kind: "error" });
    expect(await screen.findByText("Se guardó: Es un error")).toBeInTheDocument();
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(undoDecision).toHaveBeenCalledWith("c1");
  });

  it("filtra por tipo y oculta los cambios de mayúsculas cuando se ignoran", async () => {
    const withCase = comparison({
      pairs: [pair("Contrato_v2.docx", "Contrato_v3.docx", [...VERSION_CHANGES, CASE_CHANGE])],
    });
    await compare(fakeEngineServices({ comparisons: { startComparison: startingWith(withCase) } }));
    const list = within(await screen.findByRole("list", { name: "Cambios" }));
    expect(list.getAllByRole("button")).toHaveLength(5);

    await userEvent.click(screen.getByRole("checkbox", { name: "mayúsculas" }));
    expect(list.getAllByRole("button")).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: /^Movidas/ }));
    expect(list.getAllByRole("button")).toHaveLength(1);
    expect(list.getByRole("button")).toHaveAccessibleName(
      expect.stringContaining(String(MOVED_CHANGE.number)),
    );
  });

  it("muestra las inconsistencias como dato por documento, con el valor distinto marcado", async () => {
    const withInconsistency = comparison({ inconsistencies: [inconsistency(5)] });
    await compare(
      fakeEngineServices({ comparisons: { startComparison: startingWith(withInconsistency) } }),
    );
    await screen.findByRole("heading", { name: "Comparar documentos" });

    await userEvent.keyboard("2");

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Identificador")).toBeInTheDocument();
    expect(table.getByLabelText("No coincide").parentElement).toHaveTextContent("≠ 4587");
    expect(table.getAllByText("Sin dato confirmado")).toHaveLength(1);
  });

  it("con tres documentos abre la matriz y desde un par vuelve a las versiones", async () => {
    const three = comparison({
      mode: "contract_annexes",
      pairs: [
        pair("Contrato_v2.docx", "Contrato_v3.docx", VERSION_CHANGES),
        pair("Contrato_v2.docx", "Anexo.pdf"),
        pair("Contrato_v3.docx", "Anexo.pdf"),
      ],
    });
    const startComparison = startingWith(three);
    await compare(fakeEngineServices({ comparisons: { startComparison } }), 3);

    expect(startComparison).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "contract_annexes" }),
    );
    expect(await screen.findByRole("grid", { name: "Matriz de diferencias" })).toBeInTheDocument();
    expect(screen.getAllByText("sin diferencias")).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: /Abrir el par/ }));
    expect(screen.getByText("tachado = falta en B")).toBeInTheDocument();
  });

  it("explica que dos versiones no se pueden comparar y ofrece cambiar de modo", async () => {
    const unrelated = comparison({
      pairs: [{ ...pair("Contrato_v2.docx", "Contrato_v3.docx"), seemsUnrelated: true }],
    });
    await compare(
      fakeEngineServices({ comparisons: { startComparison: startingWith(unrelated) } }),
    );

    expect(await screen.findByText("No se pueden comparar estas versiones.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cambiar de modo" }));
    expect(screen.getByRole("tab", { name: /Buscar inconsistencias/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("si el motor falla, lo explica y deja volver a elegir", async () => {
    const startComparison = vi.fn(() => Promise.reject(new Error("motor detenido")));

    await compare(fakeEngineServices({ comparisons: { startComparison } }));

    expect(await screen.findByText("No se pudieron comparar los documentos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elegir documentos" })).toBeInTheDocument();
  });
});
