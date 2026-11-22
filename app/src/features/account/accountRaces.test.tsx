import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { answering, gateDialog, SIGNED_IN, SIGNED_OUT } from "../../test/accountFakes";
import type { AccountStateResult } from "../../services/engine/accountTypes";
import { EngineUnavailableError } from "../../services/engine/engineHttp";
import { renderAccount } from "./accountHarness";

function deferred<Value>() {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function startSignInThenReopenGate(signIn: () => Promise<AccountStateResult>) {
  const skip = answering({ ...SIGNED_OUT, gateSkipped: true });
  const account = vi.fn().mockResolvedValueOnce(SIGNED_OUT).mockResolvedValue(SIGNED_IN);
  await renderAccount({ account, signIn, skip });
  await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@correo.co");
  await userEvent.type(screen.getByLabelText("Contraseña"), "clave{Enter}");
  await userEvent.keyboard("{Escape}");
  await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
  return skip;
}

describe("peticiones que se cruzan", () => {
  it("un inicio de sesión que sí ocurrió no se pierde por una omisión posterior", async () => {
    const pending = deferred<AccountStateResult>();
    await startSignInThenReopenGate(() => pending.promise);
    await userEvent.click(screen.getByRole("button", { name: "Continuar sin cuenta" }));

    await act(async () => {
      pending.resolve(SIGNED_IN);
      await pending.promise;
    });

    expect(await screen.findByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  });

  it("la respuesta tardía de una puerta anterior no cierra la puerta nueva", async () => {
    const pending = deferred<AccountStateResult>();
    await startSignInThenReopenGate(() => pending.promise);

    await act(async () => {
      pending.resolve(SIGNED_IN);
      await pending.promise;
    });

    expect(gateDialog()).toBeInTheDocument();
  });

  it("un cierre de sesión que venció pudo completarse: se vuelve a leer la cuenta", async () => {
    const account = vi.fn().mockResolvedValueOnce(SIGNED_IN).mockResolvedValue(SIGNED_OUT);
    const cause = new DOMException("", "TimeoutError");
    const signOut = vi.fn(() => Promise.reject(new EngineUnavailableError("/x", { cause })));
    await renderAccount({ account, refresh: answering(SIGNED_IN), signOut });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByText(/No ha iniciado sesión/)).toBeVisible();
    expect(screen.getByText("La solicitud tardó demasiado.")).toBeVisible();
  });
});
