import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import { fakeEngineServices } from "../../test/engineFakes";
import { confirmedFact, factsResult } from "../../test/factFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { CLOSED_REVIEW, REVIEW } from "../../test/reviewFixtures";

const EMPTY = { facts: [], pending: [], canUndo: false };

async function openFacts() {
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /^Expediente/ }));
  await userEvent.click(screen.getByRole("tab", { name: "Datos confirmados" }));
}

function rowNamed(name: RegExp) {
  const table = screen.getByRole("table", { name: "Datos confirmados" });
  const row = within(table)
    .getAllByRole("row")
    .find((item) => name.test(item.textContent ?? ""));
  if (!row) throw new Error(`No hay fila ${String(name)}`);
  return within(row);
}

describe("Expediente: datos confirmados", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sin datos pide confirmarlos y «Agregar dato» guarda el primero", async () => {
    const addFact = vi.fn(() => Promise.resolve(factsResult({ pending: [], canUndo: true })));
    renderApp(
      fakeEngineServices({ facts: { listFacts: () => Promise.resolve(EMPTY), addFact } }),
      REVIEW,
    );
    await openFacts();

    expect(await screen.findByText("Aún no hay datos confirmados")).toBeInTheDocument();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Agregar dato" })[0] ?? document.body,
    );
    await userEvent.type(
      screen.getByRole("textbox", { name: "Nombre del dato" }),
      "Número de contrato",
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Valor confirmado" }), "4857{Enter}");

    expect(addFact).toHaveBeenCalledWith(REVIEW.session.id, {
      label: "Número de contrato",
      entityType: "contract_id",
      value: "4857",
    });
    expect(await screen.findByText("Se guardó «Número de contrato»: 4857")).toBeInTheDocument();
  });

  it("muestra qué documento contradice el dato y dónde aparece", async () => {
    renderApp(
      fakeEngineServices({ facts: { listFacts: () => Promise.resolve(factsResult()) } }),
      REVIEW,
    );
    await openFacts();

    expect(await screen.findByText("1 lo contradice")).toBeInTheDocument();
    const aside = within(
      screen.getByRole("complementary", { name: "Documentos que lo contradicen" }),
    );
    expect(aside.getByText("Riesgo alto")).toBeInTheDocument();
    expect(aside.getByText("Anexo_1_condiciones.pdf")).toBeInTheDocument();
    expect(aside.getByText("Aparece en")).toBeInTheDocument();
    expect(aside.getByText("Contrato_4857_v3.docx")).toBeInTheDocument();
  });

  it("confirma un valor pendiente, retira un dato y deshace con Ctrl Z", async () => {
    const after = factsResult({ canUndo: true });
    const addFact = vi.fn(() => Promise.resolve(after));
    const retireFact = vi.fn(() => Promise.resolve(after));
    const undoFact = vi.fn(() => Promise.resolve(factsResult()));
    renderApp(
      fakeEngineServices({
        facts: { listFacts: () => Promise.resolve(factsResult()), addFact, retireFact, undoFact },
      }),
      REVIEW,
    );
    await openFacts();

    await userEvent.click(await screen.findByRole("button", { name: "Confirmar valor" }));
    await userEvent.keyboard("{Enter}");
    expect(addFact).toHaveBeenCalledWith(REVIEW.session.id, {
      label: "Monto",
      entityType: "money",
      value: "$ 18.450.000",
    });
    await userEvent.click(rowNamed(/Número de contrato/).getByRole("button", { name: "Retirar" }));
    expect(retireFact).toHaveBeenCalledWith(REVIEW.session.id, 1);
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(undoFact).toHaveBeenCalledWith(REVIEW.session.id);
  });

  it("explica en 3 partes un valor que no se reconoce", async () => {
    const editFact = vi.fn(() =>
      Promise.reject(new EngineRejectedError("/reviews", "unrecognized_fact_value")),
    );
    renderApp(
      fakeEngineServices({ facts: { listFacts: () => Promise.resolve(factsResult()), editFact } }),
      REVIEW,
    );
    await openFacts();

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }));
    const input = screen.getByRole("textbox", { name: "Nuevo valor" });
    await userEvent.clear(input);
    await userEvent.type(input, "pendiente{Enter}");

    expect(
      await screen.findByText("No se guardó el cambio en «Número de contrato»."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("«pendiente» no se reconoce como un valor del tipo elegido."),
    ).toBeInTheDocument();
  });

  it("un dato retirado no se compara y se puede restaurar", async () => {
    const retired = confirmedFact({ retiredAt: "2026-10-02T10:00:00+00:00" });
    const restoreFact = vi.fn(() => Promise.resolve(factsResult()));
    renderApp(
      fakeEngineServices({
        facts: { listFacts: () => Promise.resolve(factsResult({ facts: [retired] })), restoreFact },
      }),
      REVIEW,
    );
    await openFacts();

    expect(await screen.findByText("No se compara")).toBeInTheDocument();
    expect(
      screen.getByText("El dato está retirado y no se usa en las comparaciones."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Restaurar" }));
    expect(restoreFact).toHaveBeenCalledWith(REVIEW.session.id, 1);
  });

  it("en una revisión cerrada los datos son de solo lectura", async () => {
    renderApp(
      fakeEngineServices({ facts: { listFacts: () => Promise.resolve(factsResult()) } }),
      CLOSED_REVIEW,
    );
    await openFacts();

    expect(await screen.findByText("1 lo contradice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar dato" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirar" })).not.toBeInTheDocument();
  });
});
