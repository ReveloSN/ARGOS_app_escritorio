import { act, configure, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountClient } from "../../services/engine/accountClient";
import type { AccountStateResult } from "../../services/engine/accountTypes";
import { EngineClient } from "../../services/engine/engineClient";
import type { EngineConnectionState } from "../../services/engine/engineConnection";
import { EngineHttp, type FetchResource } from "../../services/engine/engineHttp";
import { EngineStatusMonitor } from "../../services/engine/engineStatusMonitor";
import { SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { fakeEngineServices, HEALTHY, jsonResponse, READY_STATE } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";

const STARTING: EngineConnectionState = { kind: "starting" };
const FAILED: EngineConnectionState = { kind: "failed" };
const STEP_ONE = /Cargue los documentos/;
const GATE = "Iniciar sesión";

interface SimulatedEngine {
  connection: EngineConnectionState | "hung";
  account: AccountStateResult | "failing";
  accountDelayMs: number;
}

let engine: SimulatedEngine;

const answer: FetchResource = async (url) => {
  if (url.endsWith("/health")) return jsonResponse(HEALTHY);
  await new Promise((done) => setTimeout(done, engine.accountDelayMs));
  if (engine.account === "failing") return jsonResponse({ detail: "fallo" }, 500);
  return jsonResponse(engine.account);
};

/** La app con los clientes reales y la conexión como la informa Tauri: «starting» rechaza ya. */
async function openApp() {
  const readConnectionState = () =>
    engine.connection === "hung"
      ? new Promise<EngineConnectionState>(() => undefined)
      : Promise.resolve(engine.connection);
  const http = new EngineHttp({ readConnectionState }, answer);
  const services = {
    ...fakeEngineServices(),
    statusMonitor: new EngineStatusMonitor(new EngineClient(http)),
    account: new AccountClient(http),
  };
  const firstRun = { read: () => null, write: () => undefined };
  renderApp(services, undefined, firstRun);
  await wait(1);
}

async function wait(milliseconds: number) {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds));
}

describe("el orden al abrir ARGUS", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubBrowser();
    engine = { connection: STARTING, account: SIGNED_OUT, accountDelayMs: 0 };
  });
  afterEach(() => {
    configure({ reactStrictMode: false });
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([false, true])(
    "si el motor tarda varios segundos, primero va la puerta (StrictMode: %s)",
    async (reactStrictMode) => {
      configure({ reactStrictMode });
      await openApp();
      await wait(8000);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      engine.connection = READY_STATE;
      await wait(2500);

      expect(screen.getByRole("dialog", { name: GATE })).toBeInTheDocument();
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
      await wait(1);
      expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeInTheDocument();
    },
  );

  it("con sesión, los Primeros pasos salen cuando el motor responde", async () => {
    engine.account = SIGNED_IN;
    await openApp();
    await wait(6000);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    engine.connection = READY_STATE;
    await wait(2500);

    expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeInTheDocument();
  });

  it("con el motor listo esperan a que la lectura responda", async () => {
    engine.accountDelayMs = 3000;
    await openApp();
    engine.connection = READY_STATE;
    await wait(2500);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await wait(3500);

    expect(screen.getByRole("dialog", { name: GATE })).toBeInTheDocument();
  });

  it("con el motor listo y la lectura fallida no esperan al reintento", async () => {
    engine.account = "failing";
    await openApp();
    engine.connection = READY_STATE;
    await wait(2500);

    expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeInTheDocument();
  });

  it("si el motor falla al arrancar, los Primeros pasos salen y ya no se retiran", async () => {
    await openApp();
    await wait(5000);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    engine.connection = FAILED;
    await wait(2500);
    expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeInTheDocument();
    engine.connection = STARTING;
    await wait(2500);

    expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeInTheDocument();
  });

  it.each([
    ["sigue arrancando", STARTING],
    ["no contesta", "hung"],
  ] as const)("si %s, no se espera sin fin", async (_name, state) => {
    engine.connection = state;
    await openApp();
    await wait(100_000);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await wait(21_000);

    expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeInTheDocument();
  });
});
