import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { answering, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import { renderAccount } from "./accountHarness";

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("Reintentar", () => {
  it("tras corregir la contraseña, Reintentar manda la nueva", async () => {
    const signIn = vi
      .fn()
      .mockRejectedValueOnce(new EngineRejectedError("/account/sign-in", "offline"))
      .mockResolvedValue(SIGNED_IN);
    await renderAccount({ account: answering(SIGNED_OUT), signIn });
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave-vieja{Enter}");
    await screen.findByRole("button", { name: "Reintentar" });

    await userEvent.clear(screen.getByLabelText("Contraseña"));
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave-nueva");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(signIn).toHaveBeenLastCalledWith({ email: "ana@correo.co", password: "clave-nueva" });
  });
});

describe("la navegación mientras hay una petición", () => {
  it("no deja cambiar de pestaña: el envío sigue siendo de su vista", async () => {
    const pending = deferred<typeof SIGNED_IN>();
    await renderAccount({ account: answering(SIGNED_OUT), signIn: () => pending.promise });
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave{Enter}");

    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));

    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    expect(screen.queryByText("Creando la cuenta…")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@correo.co");
  });

  it("una respuesta tardía de recuperar no saca a la persona de lo que escribe", async () => {
    const pending = deferred<undefined>();
    await renderAccount({
      account: answering(SIGNED_OUT),
      requestPasswordReset: () => pending.promise,
    });
    await userEvent.click(screen.getByRole("button", { name: "¿Olvidó su contraseña?" }));
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co{Enter}");

    await userEvent.click(screen.getByRole("button", { name: "Volver a iniciar sesión" }));

    expect(screen.getByRole("heading", { name: "Recuperar la contraseña" })).toBeVisible();
  });

  it("el correo escrito se conserva al cambiar de pestaña", async () => {
    await renderAccount({ account: answering(SIGNED_OUT) });
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");

    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));

    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@correo.co");
  });
});
