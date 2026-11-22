import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import en from "../../i18n/en.json";
import es from "../../i18n/es.json";
import type { Locale } from "../../i18n/messages";
import { EngineRejectedError, EngineUnavailableError } from "../../services/engine/engineHttp";
import { answering, SIGNED_OUT } from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";
import { PROBLEM_ACTIONS, type AccountProblem } from "./accountProblem";

const CODES = Object.keys(PROBLEM_ACTIONS) as AccountProblem[];
const MESSAGES = { es, en };

function failingWith(error: Error) {
  return vi.fn(() => Promise.reject(error));
}

async function submitSignIn(locale: Locale, error: Error) {
  await renderAccount({ account: answering(SIGNED_OUT), signIn: failingWith(error) }, locale);
  await userEvent.type(
    screen.getByLabelText(locale === "es" ? "Correo electrónico" : "Email address"),
    "a@b.co",
  );
  await userEvent.type(
    screen.getByLabelText(locale === "es" ? "Contraseña" : "Password"),
    "clave{Enter}",
  );
  return screen.findByRole("alert");
}

function errorFor(code: AccountProblem): Error {
  if (code === "engine_unavailable") return new EngineUnavailableError("/account/sign-in");
  if (code === "timeout") {
    const cause = new DOMException("", "TimeoutError");
    return new EngineUnavailableError("/account/sign-in", { cause });
  }
  return new EngineRejectedError("/account/sign-in", code);
}

describe("los fallos de la cuenta", () => {
  it.each(CODES.flatMap((code) => [["es", code] as const, ["en", code] as const]))(
    "en %s, «%s» se explica en 3 partes y con un botón, sin mostrar el código",
    async (locale, code) => {
      const text = MESSAGES[locale].account.problems[code];

      const alert = await submitSignIn(locale, errorFor(code));

      expect(within(alert).getByText(text.what)).toBeVisible();
      expect(within(alert).getByText(text.why)).toBeVisible();
      expect(within(alert).getByText(text.todo)).toBeVisible();
      expect(within(alert).getByRole("button", { name: text.action })).toBeEnabled();
      expect(alert).not.toHaveTextContent(code);
      expect(screen.getAllByRole("alert")).toHaveLength(1);
    },
  );

  it("sin confirmar, el botón lleva a escribir el código con el mismo correo", async () => {
    await submitSignIn("es", errorFor("email_not_confirmed"));

    await userEvent.click(screen.getByRole("button", { name: "Escribir el código" }));

    expect(screen.getByText("Escriba el código que enviamos a a@b.co.")).toBeVisible();
  });

  it("con un código inválido, ofrece pedir uno nuevo en la recuperación", async () => {
    await submitSignIn("es", errorFor("invalid_code"));

    await userEvent.click(screen.getByRole("button", { name: "Pedir un código nuevo" }));

    expect(screen.getByRole("heading", { name: "Recuperar la contraseña" })).toBeVisible();
  });

  it("sin conexión no afirma que internet esté caído y deja continuar sin cuenta", async () => {
    const alert = await submitSignIn("es", errorFor("offline"));

    expect(alert).not.toHaveTextContent(/internet (está|esta) (ca[íi]do|desconectado)/i);
    expect(alert).toHaveTextContent("o que el servicio no esté respondiendo");
    expect(screen.getByRole("button", { name: "Continuar sin cuenta" })).toBeEnabled();
  });

  it("«Reintentar» repite la misma petición y «Entendido» cierra el aviso", async () => {
    const signIn = vi
      .fn()
      .mockRejectedValueOnce(errorFor("timeout"))
      .mockRejectedValueOnce(errorFor("weak_password"));
    await renderAccount({ account: answering(SIGNED_OUT), signIn });
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "a@b.co");
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave{Enter}");

    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Entendido" }));

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
