import { screen } from "@testing-library/react";
import { vi } from "vitest";

import type { EngineServices } from "../features/engine/EngineServicesContext";
import type { AccountStateResult } from "../services/engine/accountTypes";

/** Sin cuenta configurada: ninguna pantalla de cuenta existe, como en todas las pruebas previas. */
export const UNAVAILABLE_ACCOUNT: AccountStateResult = {
  status: "unavailable",
  account: null,
  email: null,
  gateSkipped: false,
  isOffline: false,
  isPersisted: true,
};

export const SIGNED_OUT: AccountStateResult = { ...UNAVAILABLE_ACCOUNT, status: "signed_out" };

export const SIGNED_IN: AccountStateResult = {
  ...SIGNED_OUT,
  status: "signed_in",
  account: { id: "u1", email: "ana@correo.co", displayName: "Ana Pérez" },
};

export const EXPIRED: AccountStateResult = {
  ...SIGNED_OUT,
  status: "expired",
  email: "ana@correo.co",
};

export function answering(state: AccountStateResult) {
  return vi.fn(() => Promise.resolve(state));
}

function notConfigured() {
  return vi.fn(() => Promise.reject(new Error("Doble de prueba sin respuesta configurada.")));
}

/** La cuenta de las pruebas: lee `unavailable` y solo responde lo que cada prueba configura. */
export function fakeAccount(
  overrides?: Partial<EngineServices["account"]>,
): EngineServices["account"] {
  return {
    account: answering(UNAVAILABLE_ACCOUNT),
    refresh: notConfigured(),
    skip: notConfigured(),
    signOut: notConfigured(),
    signUp: notConfigured(),
    verify: notConfigured(),
    signIn: notConfigured(),
    requestPasswordReset: notConfigured(),
    confirmPasswordReset: notConfigured(),
    ...overrides,
  };
}

export function gateDialog(): HTMLElement | null {
  return screen.queryByRole("dialog");
}
