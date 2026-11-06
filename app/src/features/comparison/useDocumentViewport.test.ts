import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDocumentViewport } from "./useDocumentViewport";

describe("parte visible del texto unificado", () => {
  it("(regresión) el minimapa sigue el desplazamiento del único texto", () => {
    const { result } = renderHook(() => useDocumentViewport());
    expect(result.current.viewport).toEqual({ top: 0, height: 1 });

    const body = document.createElement("div");
    Object.defineProperties(body, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 250 },
      scrollTop: { value: 375 },
    });
    result.current.body.current = body;
    act(() => {
      result.current.onScroll();
    });

    expect(result.current.viewport).toEqual({ top: 0.375, height: 0.25 });
  });
});
