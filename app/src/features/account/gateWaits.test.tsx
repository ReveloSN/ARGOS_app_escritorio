import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answering, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import type { AccountStateResult } from "../../services/engine/accountTypes";
import type { PreferenceStorage } from "../../services/preferences/preferenceStorage";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { renderAccount } from "./accountHarness";

const STEP_ONE = /Cargue los documentos/;

function emptyStorage(): PreferenceStorage {
  const values = new Map<string, string>();
  return {
    read: (key) => values.get(key) ?? null,
    write: (key, value) => {
      values.set(key, value);
    },
  };
}

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<Value>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("la puerta y los Primeros pasos", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("los Primeros pasos esperan solo mientras la primera lectura está pendiente", async () => {
    const read = deferred<AccountStateResult>();
    renderApp(
      fakeEngineServices({ account: { account: () => read.promise } }),
      undefined,
      emptyStorage(),
    );
    await act(() => Promise.resolve());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      read.resolve(SIGNED_IN);
      await read.promise;
    });

    expect(screen.getByRole("dialog", { name: STEP_ONE })).toBeVisible();
  });

  it("si la lectura falla no esperan para siempre", async () => {
    const account = () => Promise.reject(new Error("sin motor"));
    renderApp(fakeEngineServices({ account: { account } }), undefined, emptyStorage());
    await act(() => Promise.resolve());

    expect(await screen.findByRole("dialog", { name: STEP_ONE })).toBeVisible();
  });

  it("una lectura tardía no interrumpe los Primeros pasos: la puerta espera a que se cierren", async () => {
    const account = vi
      .fn()
      .mockRejectedValueOnce(new Error("arrancando"))
      .mockResolvedValue(SIGNED_OUT);
    renderApp(fakeEngineServices({ account: { account } }), undefined, emptyStorage());
    await act(() => Promise.resolve());
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: /Compruebe lo que se leyó/ })).toBeVisible();

    await act(() => Promise.resolve());

    expect(screen.getByRole("heading", { name: /Compruebe lo que se leyó/ })).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(await screen.findByRole("dialog", { name: "Iniciar sesión" })).toBeVisible();
  });
});

describe("la puerta y otros diálogos", () => {
  it("espera a que otro diálogo modal se cierre", async () => {
    const other = document.createElement("div");
    other.setAttribute("role", "dialog");
    other.setAttribute("aria-modal", "true");
    document.body.append(other);

    await renderAccount({ account: answering(SIGNED_OUT) });
    expect(screen.queryByLabelText("Correo electrónico")).not.toBeInTheDocument();
    await act(async () => {
      other.remove();
      await Promise.resolve();
    });

    expect(await screen.findByLabelText("Correo electrónico")).toBeVisible();
  });
});
