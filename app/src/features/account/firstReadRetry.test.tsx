import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gateDialog, SIGNED_OUT } from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

describe("la primera lectura que falla con el motor listo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("se reintenta una vez", async () => {
    const account = vi
      .fn()
      .mockRejectedValueOnce(new Error("arrancando"))
      .mockRejectedValueOnce(new Error("aún no"))
      .mockResolvedValue(SIGNED_OUT);

    await renderAccount({ account });
    await act(() => vi.advanceTimersByTimeAsync(10_000));

    expect(account).toHaveBeenCalledTimes(3);
    expect(gateDialog()).toBeInTheDocument();
  });

  it("y solo una vez", async () => {
    const account = vi.fn(() => Promise.reject(new Error("caído")));

    await renderAccount({ account });
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    expect(account).toHaveBeenCalledTimes(3);
  });
});
