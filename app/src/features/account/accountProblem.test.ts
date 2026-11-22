import { describe, expect, it } from "vitest";

import {
  EngineNotReadyError,
  EngineRejectedError,
  EngineUnavailableError,
} from "../../services/engine/engineHttp";
import { problemOf } from "./accountProblem";

describe("problemOf", () => {
  it("toma el motivo que el motor informa", () => {
    expect(problemOf(new EngineRejectedError("/account/sign-in", "email_not_confirmed"))).toBe(
      "email_not_confirmed",
    );
    expect(problemOf(new EngineRejectedError("/account/sign-out", "keychain_unavailable"))).toBe(
      "keychain_unavailable",
    );
  });

  it("un motivo que la interfaz no conoce es el motor sin respuesta", () => {
    expect(problemOf(new EngineRejectedError("/account", "algo_nuevo"))).toBe("engine_unavailable");
  });

  it("distingue el límite de tiempo del motor que no responde", () => {
    const timeout = new EngineUnavailableError("/account/sign-in", {
      cause: new DOMException("", "TimeoutError"),
    });

    expect(problemOf(timeout)).toBe("timeout");
    expect(problemOf(new EngineUnavailableError("/account/sign-in"))).toBe("engine_unavailable");
    expect(problemOf(new EngineNotReadyError(true))).toBe("engine_unavailable");
    expect(problemOf(new TypeError("otra cosa"))).toBe("engine_unavailable");
  });
});
