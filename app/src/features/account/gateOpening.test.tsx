import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  answering,
  EXPIRED,
  gateDialog,
  SIGNED_IN,
  SIGNED_OUT,
  UNAVAILABLE_ACCOUNT,
} from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

describe("cuándo se abre la puerta", () => {
  it("se abre sola con la sesión cerrada y sin la marca de «Continuar sin cuenta»", async () => {
    await renderAccount({ account: answering(SIGNED_OUT) });

    expect(gateDialog()).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it.each([
    ["con la marca de omitir", { ...SIGNED_OUT, gateSkipped: true }],
    ["sin cuenta configurada", UNAVAILABLE_ACCOUNT],
    ["con la sesión vencida", EXPIRED],
  ])("no se abre %s", async (_name, state) => {
    await renderAccount({ account: answering(state) });

    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("con sesión no se abre y la renueva una vez en segundo plano", async () => {
    const refresh = answering(SIGNED_IN);

    await renderAccount({ account: answering(SIGNED_IN), refresh });

    expect(gateDialog()).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("con el motor caído no se abre, y tampoco existe nada de la cuenta", async () => {
    const account = vi.fn(() => Promise.reject(new Error("sin motor")));

    await renderAccount({ account });

    expect(gateDialog()).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Iniciar sesión" })).not.toBeInTheDocument();
  });

  it("si el motor tarda en responder, la primera lectura que llega decide", async () => {
    const account = vi
      .fn()
      .mockRejectedValueOnce(new Error("arrancando"))
      .mockResolvedValue(SIGNED_OUT);

    await renderAccount({ account });
    expect(gateDialog()).toBeInTheDocument();
    expect(account).toHaveBeenCalledTimes(2);
  });

  it("no se vuelve a abrir al cerrar sesión en esta ejecución", async () => {
    const signOut = answering(SIGNED_OUT);
    await renderAccount({ account: answering(SIGNED_IN), refresh: answering(SIGNED_IN), signOut });
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await act(() => Promise.resolve());

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("desde Ajustes se abre con «Iniciar sesión» y Esc la cierra sin cambiar la marca", async () => {
    const skip = vi.fn();
    await renderAccount({ account: answering({ ...SIGNED_OUT, gateSkipped: true }), skip });

    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(gateDialog()).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");

    expect(gateDialog()).not.toBeInTheDocument();
    expect(skip).not.toHaveBeenCalled();
  });
});
