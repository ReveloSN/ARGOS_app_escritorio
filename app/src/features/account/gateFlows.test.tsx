import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { answering, SIGNED_OUT } from "../../test/accountFakes";
import type { Locale } from "../../i18n/messages";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import { renderAccount } from "./accountHarness";

function rejecting(code: string) {
  return vi.fn(() => Promise.reject(new EngineRejectedError("/account", code)));
}

async function typeEmailAndPassword(locale: Locale) {
  const [email, password] =
    locale === "es" ? ["Correo electrónico", "Contraseña"] : ["Email address", "Password"];
  await userEvent.type(screen.getByLabelText(email), "ana@correo.co");
  await userEvent.type(screen.getByLabelText(password), "clave{Enter}");
}

describe("mensajes según el flujo", () => {
  it("un código de alta inválido pide corregirlo, no recuperar la contraseña", async () => {
    const signUp = vi.fn(() => Promise.resolve({ state: SIGNED_OUT, needsConfirmation: true }));
    await renderAccount({
      account: answering(SIGNED_OUT),
      signUp,
      verify: rejecting("invalid_code"),
    });
    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));
    await typeEmailAndPassword("es");
    await userEvent.type(await screen.findByLabelText("Código del correo"), "123456{Enter}");

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Revise el código");
    expect(within(alert).queryByRole("button", { name: "Pedir un código nuevo" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Recuperar la contraseña" })).toBeNull();
  });

  it.each([
    ["es", "Crear cuenta", "No se pudo enviar el correo de confirmación"],
    ["en", "Create account", "The confirmation email could not be sent"],
  ] as const)(
    "en %s, sin correo al crear la cuenta no habla de recuperar la contraseña",
    async (locale, tab, text) => {
      await renderAccount(
        { account: answering(SIGNED_OUT), signUp: rejecting("email_unavailable") },
        locale,
      );
      await userEvent.click(screen.getByRole("radio", { name: tab }));
      await typeEmailAndPassword(locale);

      const alert = await screen.findByRole("alert");

      expect(alert).toHaveTextContent(text);
      expect(alert).not.toHaveTextContent(/recuperar|recovered/i);
    },
  );

  it("en la recuperación, un código inválido sí ofrece pedir uno nuevo", async () => {
    await renderAccount({
      account: answering(SIGNED_OUT),
      confirmPasswordReset: rejecting("invalid_code"),
    });
    await userEvent.click(screen.getByRole("button", { name: "¿Olvidó su contraseña?" }));
    await userEvent.click(screen.getByRole("button", { name: "Ya tengo un código" }));
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
    await userEvent.type(screen.getByLabelText("Código del correo"), "123456");
    await userEvent.type(screen.getByLabelText("Contraseña nueva"), "otra clave{Enter}");

    expect(await screen.findByRole("button", { name: "Pedir un código nuevo" })).toBeVisible();
  });
});

describe("la pantalla de la puerta", () => {
  it("con un error, solo «Entrar» es el botón principal", async () => {
    await renderAccount({ account: answering(SIGNED_OUT), signIn: rejecting("offline") });
    await typeEmailAndPassword("es");

    const action = await screen.findByRole("button", { name: "Reintentar" });

    expect(action.className).toMatch(/secondary/);
    expect(screen.getByRole("button", { name: /^Entrar/ }).className).toMatch(/primary/);
  });

  it("lleva la identidad de ARGUS y deja el aviso y «Continuar sin cuenta» junto a ella", async () => {
    await renderAccount({ account: answering(SIGNED_OUT) });
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("ARGUS")).toBeVisible();
    expect(within(dialog).getByText(/Sus documentos no salen del equipo/)).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Continuar sin cuenta" })).toBeVisible();
  });
});
