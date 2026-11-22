import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { answering, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("el correo que se envió", () => {
  it("al crear la cuenta, la verificación usa el correo enviado aunque se siga escribiendo", async () => {
    const pending = deferred<{ state: typeof SIGNED_OUT; needsConfirmation: boolean }>();
    const verify = answering(SIGNED_IN);
    await renderAccount({
      account: answering(SIGNED_OUT),
      signUp: () => pending.promise,
      verify,
    });
    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "a@correo.co");
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave larga{Enter}");
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "b");

    await act(async () => {
      pending.resolve({ state: SIGNED_OUT, needsConfirmation: true });
      await pending.promise;
    });

    expect(await screen.findByText("Escriba el código que enviamos a a@correo.co.")).toBeVisible();
    await userEvent.type(screen.getByLabelText("Código del correo"), "123456{Enter}");
    expect(verify).toHaveBeenCalledWith({ email: "a@correo.co", code: "123456" });
  });

  it("al pedir la recuperación, el paso siguiente usa el correo pedido", async () => {
    const pending = deferred<undefined>();
    const confirmPasswordReset = answering(SIGNED_IN);
    await renderAccount({
      account: answering(SIGNED_OUT),
      requestPasswordReset: vi.fn(() => pending.promise),
      confirmPasswordReset,
    });
    await userEvent.click(screen.getByRole("button", { name: "¿Olvidó su contraseña?" }));
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "a@correo.co{Enter}");
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "b");

    await act(async () => {
      pending.resolve(undefined);
      await pending.promise;
    });

    expect(await screen.findByLabelText("Código del correo")).toBeVisible();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("a@correo.co");
  });
});
