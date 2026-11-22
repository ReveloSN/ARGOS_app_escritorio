import { act, render, type RenderResult } from "@testing-library/react";

import { I18nProvider } from "../../i18n/I18nProvider";
import type { Locale } from "../../i18n/messages";
import { fakeEngineServices, type FakeEngineOptions } from "../../test/engineFakes";
import { EngineServicesContext } from "../engine/EngineServicesContext";
import { AccountGate } from "./AccountGate";
import { AccountProvider } from "./AccountProvider";
import { AccountSection } from "./AccountSection";

/** La cuenta con su puerta y su sección de Ajustes, sin el resto de la app. */
export async function renderAccount(
  account: NonNullable<FakeEngineOptions["account"]>,
  locale: Locale = "es",
): Promise<RenderResult> {
  const services = fakeEngineServices({ account });
  const result = render(
    <I18nProvider initialLocale={locale}>
      <EngineServicesContext.Provider value={services}>
        <AccountProvider>
          <AccountSection />
          <AccountGate />
        </AccountProvider>
      </EngineServicesContext.Provider>
    </I18nProvider>,
  );
  await act(() => Promise.resolve());
  return result;
}
