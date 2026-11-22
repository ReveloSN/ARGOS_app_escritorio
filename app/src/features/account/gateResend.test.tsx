import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Locale } from "../../i18n/messages";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import { answering, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

const EMAIL = "ana@correo.co";
const RESEND = "Enviar un código nuevo";
const SENT = "Si hay una cuenta por confirmar con ese correo, recibirá un código nuevo.";

function rejecting(code: string) {
  return vi.fn(() => Promise.reject(new EngineRejectedError("/account", code)));
}

async function openVerification(extra: Parameters<typeof renderAccount>[0], locale: Locale = "es") {
  const signIn = rejecting("email_not_confirmed");
  await renderAccount({ account: answering(SIGNED_OUT), signIn, ...extra }, locale);
  const [email, password, action] =
    locale === "es"
      ? ["Correo electrónico", "Contraseña", "Escribir el código"]
      : ["Email address", "Password", "Enter the code"];
  await userEvent.type(screen.getByLabelText(email), EMAIL);
  await userEvent.type(screen.getByLabelText(password), "clave{Enter}");
  await userEvent.click(await screen.findByRole("button", { name: action }));
}

describe("un código de alta nuevo", () => {
  it("se pide desde la confirmación y no promete más de lo que dijo el servicio", async () => {
    const resendSignUpCode = vi.fn(() => Promise.resolve());
    await openVerification({ resendSignUpCode });
    expect(screen.queryByText(SENT)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: RESEND }));

    expect(resendSignUpCode).toHaveBeenCalledWith(EMAIL);
    expect(await screen.findByText(SENT)).toBeVisible();
    expect(screen.getByText(SENT).closest('[role="status"]')).not.toBeNull();
    expect(screen.getByLabelText("Código del correo")).toBeVisible();
  });

  it("es la salida de un código vencido, y con el nuevo se entra", async () => {
    const resendSignUpCode = vi.fn(() => Promise.resolve());
    const verify = vi
      .fn()
      .mockRejectedValueOnce(new EngineRejectedError("/account/verify", "invalid_code"))
      .mockResolvedValue(SIGNED_IN);
    await openVerification({ resendSignUpCode, verify });
    await userEvent.type(screen.getByLabelText("Código del correo"), "111111{Enter}");

    const alert = await screen.findByRole("alert");
    expect(screen.getAllByRole("button", { name: RESEND })).toHaveLength(1);
    await userEvent.click(within(alert).getByRole("button", { name: RESEND }));

    expect(resendSignUpCode).toHaveBeenCalledWith(EMAIL);
    expect(await screen.findByText(SENT)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText("Código del correo"));
    await userEvent.type(screen.getByLabelText("Código del correo"), "222222{Enter}");
    expect(verify).toHaveBeenLastCalledWith({ email: EMAIL, code: "222222" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mientras se envía lo dice, sin afirmar que confirma", async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<void>((done) => {
      finish = done;
    });
    await openVerification({ resendSignUpCode: () => pending });

    await userEvent.click(screen.getByRole("button", { name: RESEND }));

    expect(screen.getByRole("button", { name: /^Enviando…/ })).toBeDisabled();
    expect(screen.queryByText("Confirmando…")).not.toBeInTheDocument();
    expect(screen.queryByText(SENT)).not.toBeInTheDocument();
    await act(async () => {
      finish();
      await pending;
    });
  });

  it("Reintentar repite el envío, no la confirmación", async () => {
    const resendSignUpCode = vi
      .fn()
      .mockRejectedValueOnce(new EngineRejectedError("/account/verify/resend", "offline"))
      .mockResolvedValue(undefined);
    const verify = answering(SIGNED_IN);
    await openVerification({ resendSignUpCode, verify });
    await userEvent.click(screen.getByRole("button", { name: RESEND }));

    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(resendSignUpCode).toHaveBeenCalledTimes(2);
    expect(verify).not.toHaveBeenCalled();
    expect(await screen.findByText(SENT)).toBeVisible();
  });

  it.each([
    ["es", RESEND, "No se pudo enviar el correo de confirmación."],
    ["en", "Send a new code", "The confirmation email could not be sent."],
  ] as const)("en %s, sin correo no habla de la contraseña", async (locale, action, text) => {
    await openVerification({ resendSignUpCode: rejecting("email_unavailable") }, locale);

    await userEvent.click(screen.getByRole("button", { name: action }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(alert).not.toHaveTextContent(/contraseña|password/i);
  });
});
