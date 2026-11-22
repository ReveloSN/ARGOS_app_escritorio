import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccountStateResult } from "../../services/engine/accountTypes";
import type { PreferencesResult } from "../../services/engine/preferencesTypes";
import { answering, SIGNED_OUT, UNAVAILABLE_ACCOUNT } from "../../test/accountFakes";
import { fakeEngineServices } from "../../test/engineFakes";
import { renderApp, stubBrowser } from "../../test/renderApp";
import { renderAccount } from "./accountHarness";

const PREFERENCES: PreferencesResult = {
  sensitivity: "balanced",
  comparedCategories: ["amounts"],
  hasRetentionLimit: false,
  historyFolder: "C:\\ARGUS",
  suppressionRules: [],
};

async function readPrivacy(state: AccountStateResult) {
  const services = fakeEngineServices({
    account: { account: answering({ ...state, gateSkipped: true }) },
    preferences: { preferences: () => Promise.resolve(PREFERENCES) },
  });
  renderApp(services);
  await act(() => Promise.resolve());
  await userEvent.click(screen.getByRole("button", { name: /Ajustes/ }));
  await screen.findByText("El análisis es local");
  return within(screen.getByRole("region", { name: "Privacidad" }));
}

describe("lo que se dice que sale del equipo", () => {
  beforeEach(stubBrowser);
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("con cuenta disponible, Privacidad nombra su excepción", async () => {
    const privacy = await readPrivacy(SIGNED_OUT);

    expect(privacy.getByText(/si usa la cuenta/)).toHaveTextContent(
      /correo, contraseña, nombre opcional, códigos y sesión.*Supabase/,
    );
  });

  it("sin cuenta disponible, Privacidad no la nombra", async () => {
    const privacy = await readPrivacy(UNAVAILABLE_ACCOUNT);

    expect(privacy.queryByText(/Supabase/)).not.toBeInTheDocument();
    expect(privacy.getByText(/solo sale lo que usted confirme/)).toBeVisible();
  });

  it("el nombre opcional dice que también va a Supabase", async () => {
    await renderAccount({ account: answering(SIGNED_OUT) });

    await userEvent.click(screen.getByRole("radio", { name: "Crear cuenta" }));

    expect(screen.getByLabelText("Nombre")).toHaveAccessibleDescription(/se envía a Supabase/);
  });
});
