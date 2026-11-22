import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { AccountStateResult } from "../../services/engine/accountTypes";
import { answering, gateDialog, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function fillSignIn(password = "clave larga") {
  await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
  await userEvent.type(screen.getByLabelText("Contraseña"), password);
}

describe("una petición en curso", () => {
  it("deshabilita el envío y «Continuar sin cuenta», lo dice, y no envía dos veces", async () => {
    const pending = deferred<AccountStateResult>();
    const signIn = vi.fn(() => pending.promise);
    await renderAccount({ account: answering(SIGNED_OUT), signIn });
    await fillSignIn();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: /^Entrando…/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continuar sin cuenta" })).toBeDisabled();
    expect(signIn).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve(SIGNED_IN);
      await pending.promise;
    });
  });

  it("se puede cerrar; la respuesta que llega después actualiza la cuenta sin reabrir la puerta", async () => {
    const pending = deferred<AccountStateResult>();
    await renderAccount({ account: answering(SIGNED_OUT), signIn: () => pending.promise });
    await fillSignIn();
    await userEvent.keyboard("{Enter}");

    await userEvent.keyboard("{Escape}");
    expect(gateDialog()).not.toBeInTheDocument();
    await act(async () => {
      pending.resolve(SIGNED_IN);
      await pending.promise;
    });

    expect(gateDialog()).not.toBeInTheDocument();
    expect(screen.getByText("ana@correo.co")).toBeVisible();
  });

  it("una respuesta vieja no pisa a una más nueva", async () => {
    const slowRefresh = deferred<AccountStateResult>();
    const signOut = answering(SIGNED_OUT);
    await renderAccount({
      account: answering(SIGNED_IN),
      refresh: () => slowRefresh.promise,
      signOut,
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await act(async () => {
      slowRefresh.resolve({ ...SIGNED_IN, isOffline: true });
      await slowRefresh.promise;
    });

    expect(screen.getByText(/No ha iniciado sesión/)).toBeVisible();
    expect(screen.queryByText(/Sin conexión con el servicio/)).not.toBeInTheDocument();
  });
});

describe("la contraseña", () => {
  it("se borra al cambiar de vista y al cerrar, y no llega al almacenamiento del navegador", async () => {
    const signIn = vi.fn(() => Promise.reject(new Error("falla")));
    await renderAccount({ account: answering(SIGNED_OUT), signIn });
    await fillSignIn("secreto-único-123");
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("alert");

    const stored = JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]);
    expect(stored).not.toContain("secreto-único-123");
    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));
    await userEvent.click(screen.getByRole("radio", { name: "Iniciar sesión" }));
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");

    await fillSignIn("otro-secreto");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(screen.getByLabelText("Contraseña")).toHaveValue("");
  });

  it("se oculta de nuevo al cambiar de vista", async () => {
    await renderAccount({ account: answering(SIGNED_OUT) });
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));

    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("type", "password");
  });
});
