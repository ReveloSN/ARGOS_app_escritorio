import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import {
  answering,
  EXPIRED,
  gateDialog,
  SIGNED_IN,
  SIGNED_OUT,
  UNAVAILABLE_ACCOUNT,
} from "../../test/accountFakes";
import { renderAccount } from "./accountHarness";

const REFRESHED = { refresh: answering(SIGNED_IN) };

describe("Ajustes › Cuenta", () => {
  it("con la sesión abierta dice quién está dentro y avisa de lo que no es normal", async () => {
    const state = { ...SIGNED_IN, isOffline: true, isPersisted: false };
    await renderAccount({ account: answering(state), refresh: answering(state) });

    expect(screen.getByText("ana@correo.co")).toBeVisible();
    expect(screen.getByText("Ana Pérez")).toBeVisible();
    expect(screen.getByText(/Sin conexión con el servicio de cuentas/)).toBeVisible();
    expect(screen.getByText(/No se pudo usar el llavero del sistema/)).toBeVisible();
  });

  it("sin cuenta configurada no existe nada", async () => {
    const { container } = await renderAccount({ account: answering(UNAVAILABLE_ACCOUNT) });

    expect(within(container).queryByText(/sesión/i)).not.toBeInTheDocument();
    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("vencida, pide volver a entrar sin bloquear y rellena el correo", async () => {
    await renderAccount({ account: answering(EXPIRED) });

    expect(screen.getByText("Su sesión venció.")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@correo.co");
  });

  it("cierra la sesión y no abre la puerta", async () => {
    await renderAccount({
      account: answering(SIGNED_IN),
      ...REFRESHED,
      signOut: answering(SIGNED_OUT),
    });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByText(/No ha iniciado sesión/)).toBeVisible();
    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("vencida, también deja cerrar la sesión", async () => {
    const signOut = answering(SIGNED_OUT);
    await renderAccount({ account: answering(EXPIRED), signOut });

    const leave = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(leave.className).toMatch(/secondary/);
    await userEvent.click(leave);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/No ha iniciado sesión/)).toBeVisible();
    expect(gateDialog()).not.toBeInTheDocument();
  });

  it("si el llavero falla al salir, vuelve a leer la cuenta y sigue mostrando el fallo", async () => {
    const account = vi.fn().mockResolvedValueOnce(SIGNED_IN).mockResolvedValue(SIGNED_OUT);
    const signOut = vi.fn(() =>
      Promise.reject(new EngineRejectedError("/account/sign-out", "keychain_unavailable")),
    );
    await renderAccount({ account, ...REFRESHED, signOut });

    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await act(() => Promise.resolve());

    expect(await screen.findByText("No se pudo usar el llavero del sistema.")).toBeVisible();
    expect(screen.getByText(/No ha iniciado sesión/)).toBeVisible();
    expect(account).toHaveBeenCalledTimes(2);
  });
});
