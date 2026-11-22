import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { answering, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import { renderAccount } from "./accountHarness";

const OUTSIDE = <button type="button" aria-label="fuera" />;

function insideDialog(): boolean {
  return screen.getByRole("dialog").contains(document.activeElement);
}

describe("el foco de la puerta", () => {
  it("al abrirse, el foco entra al primer campo", async () => {
    await renderAccount({ account: answering(SIGNED_OUT) });

    expect(document.activeElement).toBe(screen.getByLabelText("Correo electrónico"));
  });

  it("con una petición en curso, Tab no sale de la puerta", async () => {
    const signIn = vi.fn(() => new Promise<typeof SIGNED_IN>(() => undefined));
    await renderAccount({ account: answering(SIGNED_OUT), signIn }, "es", OUTSIDE);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave");
    await userEvent.click(screen.getByRole("button", { name: /^Entrar/ }));

    expect(insideDialog()).toBe(true);
    expect(document.activeElement).not.toBeDisabled();
    for (let press = 0; press < 12; press += 1) {
      await userEvent.tab();
      expect(insideDialog()).toBe(true);
    }
    await userEvent.tab({ shift: true });
    expect(insideDialog()).toBe(true);
  });

  it("tras «Entendido», el foco sigue dentro de la puerta", async () => {
    const weak = new EngineRejectedError("/account/sign-in", "weak_password");
    await renderAccount({ account: answering(SIGNED_OUT), signIn: () => Promise.reject(weak) });
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
    await userEvent.type(screen.getByLabelText("Contraseña"), "clave{Enter}");

    await userEvent.click(await screen.findByRole("button", { name: "Entendido" }));

    expect(insideDialog()).toBe(true);
    expect(within(screen.getByRole("dialog")).queryByRole("alert")).not.toBeInTheDocument();
  });
});
