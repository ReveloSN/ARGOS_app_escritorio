import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { answering, gateDialog, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

const PRIVACY =
  "Su correo y contraseña se envían a Supabase solo para verificar la cuenta. Sus documentos no salen del equipo.";

async function openGate(extra: Parameters<typeof renderAccount>[0] = {}) {
  await renderAccount({ account: answering(SIGNED_OUT), ...extra });
}

async function typeInto(label: string, text: string) {
  await userEvent.type(screen.getByLabelText(label), text);
}

describe("las vistas de la puerta", () => {
  it("muestra el aviso de privacidad y «Continuar sin cuenta» en toda vista", async () => {
    await openGate();

    expect(screen.getByText(PRIVACY)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar sin cuenta" })).toBeEnabled();
    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));
    expect(screen.getByText(PRIVACY)).toBeInTheDocument();
  });

  it("entrar: campos con su autocompletado, mostrar la contraseña y Enter envía", async () => {
    const signIn = answering(SIGNED_IN);
    await openGate({ signIn });

    const email = screen.getByLabelText("Correo electrónico");
    const password = screen.getByLabelText("Contraseña");
    expect(email).toHaveAttribute("autocomplete", "username");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toHaveAttribute("type", "password");
    await userEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password).toHaveAttribute("type", "text");
    await typeInto("Correo electrónico", "ana@correo.co");
    await typeInto("Contraseña", "clave larga{Enter}");

    expect(signIn).toHaveBeenCalledWith({ email: "ana@correo.co", password: "clave larga" });
    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("un campo vacío se señala sin llamar al motor", async () => {
    const signIn = answering(SIGNED_IN);
    await openGate({ signIn });

    await userEvent.click(screen.getByRole("button", { name: /^Entrar/ }));

    expect(signIn).not.toHaveBeenCalled();
    expect(screen.getAllByText("Este dato es obligatorio.")).toHaveLength(2);
  });

  it("crear: el nombre es opcional y, sin confirmación, la puerta se cierra", async () => {
    const state = { state: SIGNED_IN, needsConfirmation: false };
    const signUp = vi.fn(() => Promise.resolve(state));
    await openGate({ signUp });

    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute("autocomplete", "new-password");
    await typeInto("Correo electrónico", "ana@correo.co");
    await typeInto("Contraseña", "clave larga");
    await userEvent.click(screen.getByRole("button", { name: /^Crear cuenta/ }));

    expect(signUp).toHaveBeenCalledWith({ email: "ana@correo.co", password: "clave larga" });
    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("crear con confirmación lleva al código y confirma con él", async () => {
    const outcome = { state: SIGNED_OUT, needsConfirmation: true };
    const verify = answering(SIGNED_IN);
    await openGate({ signUp: vi.fn(() => Promise.resolve(outcome)), verify });

    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));
    await typeInto("Nombre", "Ana");
    await typeInto("Correo electrónico", "ana@correo.co");
    await typeInto("Contraseña", "clave larga{Enter}");

    expect(
      await screen.findByRole("heading", { name: "Revise su correo para confirmar la cuenta" }),
    ).toBeInTheDocument();
    await typeInto("Código del correo", "12345678{Enter}");
    expect(verify).toHaveBeenCalledWith({ email: "ana@correo.co", code: "12345678" });
  });

  it("recuperar: pide el código sin afirmar que haya cuenta y sigue con la contraseña nueva", async () => {
    const requestPasswordReset = vi.fn(() => Promise.resolve());
    const confirmPasswordReset = answering(SIGNED_IN);
    await openGate({ requestPasswordReset, confirmPasswordReset });

    await userEvent.click(screen.getByRole("button", { name: "¿Olvidó su contraseña?" }));
    expect(
      screen.getByText(/Si hay una cuenta con ese correo, recibirá un código\./),
    ).toBeVisible();
    await typeInto("Correo electrónico", "ana@correo.co{Enter}");

    expect(requestPasswordReset).toHaveBeenCalledWith("ana@correo.co");
    expect(
      await screen.findByRole("heading", { name: "Elija una contraseña nueva" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Contraseña nueva")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Código del correo")).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
    await typeInto("Código del correo", "123456");
    await typeInto("Contraseña nueva", "otra clave larga{Enter}");
    expect(confirmPasswordReset).toHaveBeenCalledWith({
      email: "ana@correo.co",
      code: "123456",
      password: "otra clave larga",
    });
  });

  it("«Continuar sin cuenta» guarda la elección y cierra", async () => {
    const skip = answering({ ...SIGNED_OUT, gateSkipped: true });
    await openGate({ skip });

    await userEvent.click(screen.getByRole("button", { name: "Continuar sin cuenta" }));

    expect(skip).toHaveBeenCalledTimes(1);
    expect(gateDialog()).not.toBeInTheDocument();
  });
});
