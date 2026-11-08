import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { fakeEngineServices } from "../../test/engineFakes";
import { EngineServicesContext } from "../engine/EngineServicesContext";
import { ReviewProvider } from "../review/ReviewProvider";
import { useAssistantSignalsState } from "./useAssistantSignalsState";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <EngineServicesContext.Provider value={fakeEngineServices()}>
      <ReviewProvider>{children}</ReviewProvider>
    </EngineServicesContext.Provider>
  );
}

// El asistente dice «Necesita una confirmación» según la sesión abierta, no la última que habló.
describe("datos sin confirmar por sesión", () => {
  it("(regresión) una cifra tardía de otra sesión no borra la de la sesión abierta", () => {
    const { result } = renderHook(() => useAssistantSignalsState(), { wrapper });

    act(() => {
      result.current.reportUnconfirmed("s-2", 3);
    });
    act(() => {
      result.current.reportUnconfirmed("s-1", 0);
    });

    expect(result.current.unconfirmedFor("s-2")).toBe(3);
    expect(result.current.unconfirmedFor("s-1")).toBe(0);
  });
});
