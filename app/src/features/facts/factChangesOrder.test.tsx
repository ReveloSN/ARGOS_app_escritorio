import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nProvider";
import type { FactsResult } from "../../services/engine/factTypes";
import { fakeEngineServices } from "../../test/engineFakes";
import { confirmedFact, factsResult } from "../../test/factFakes";
import { EngineServicesContext } from "../engine/EngineServicesContext";
import { useFactChanges } from "./useFactChanges";

/** Cada edición queda pendiente hasta que la prueba decide en qué orden responde el motor. */
function deferredEdits() {
  const pending: ((result: FactsResult) => void)[] = [];
  const editFact = vi.fn(
    () =>
      new Promise<FactsResult>((resolve) => {
        pending.push(resolve);
      }),
  );
  const answer = async (call: number, result: FactsResult) => {
    await act(async () => {
      pending[call]?.(result);
      await Promise.resolve();
    });
  };
  return { editFact, answer };
}

function renderChanges(editFact: ReturnType<typeof deferredEdits>["editFact"]) {
  const services = fakeEngineServices({ facts: { editFact } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider initialLocale="es">
      <EngineServicesContext.Provider value={services}>{children}</EngineServicesContext.Provider>
    </I18nProvider>
  );
  const onSaved = vi.fn();
  const hook = renderHook(({ sessionId }) => useFactChanges(sessionId, onSaved), {
    initialProps: { sessionId: "s-1" },
    wrapper,
  });
  return { ...hook, onSaved };
}

const FACT = confirmedFact();
const withValue = (value: string) => factsResult({ facts: [confirmedFact({ value })] });

describe("cambios de datos confirmados con respuestas tardías", () => {
  it("(regresión) lo guardado en la sesión A no reemplaza los datos de B", async () => {
    const { editFact, answer } = deferredEdits();
    const { result, rerender, onSaved } = renderChanges(editFact);

    act(() => {
      result.current.edit(FACT, "4857");
    });
    rerender({ sessionId: "s-2" });
    await answer(0, withValue("4857"));

    expect(onSaved).not.toHaveBeenCalled();
  });

  it("(regresión) si el motor responde en otro orden, queda lo último que se guardó", async () => {
    const { editFact, answer } = deferredEdits();
    const { result, onSaved } = renderChanges(editFact);

    act(() => {
      result.current.edit(FACT, "4857");
    });
    act(() => {
      result.current.edit(FACT, "4587");
    });
    await answer(1, withValue("4587"));
    await answer(0, withValue("4857"));

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenLastCalledWith(withValue("4587"));
  });

  it("(regresión) un dato agregado cierra su formulario aunque otra acción posterior responda antes", async () => {
    let finishAdd: (result: FactsResult) => void = () => undefined;
    let finishRetire: (result: FactsResult) => void = () => undefined;
    const addFact = vi.fn(
      () =>
        new Promise<FactsResult>((resolve) => {
          finishAdd = resolve;
        }),
    );
    const retireFact = vi.fn(
      () =>
        new Promise<FactsResult>((resolve) => {
          finishRetire = resolve;
        }),
    );
    const services = fakeEngineServices({ facts: { addFact, retireFact } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <I18nProvider initialLocale="es">
        <EngineServicesContext.Provider value={services}>{children}</EngineServicesContext.Provider>
      </I18nProvider>
    );
    const closeForm = vi.fn();
    const { result } = renderHook(() => useFactChanges("s-1", vi.fn()), { wrapper });

    act(() => {
      result.current.add(
        { label: "Contrato", entityType: "contract_id", value: "4857" },
        closeForm,
      );
    });
    act(() => {
      result.current.retire(FACT);
    });
    await act(async () => {
      finishRetire(withValue("4857"));
      await Promise.resolve();
    });
    await act(async () => {
      finishAdd(withValue("4857"));
      await Promise.resolve();
    });

    expect(closeForm).toHaveBeenCalledTimes(1);
  });
});
