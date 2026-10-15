import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { I18nProvider } from "../i18n/I18nProvider";
import type { Locale } from "../i18n/messages";

export function renderWithProviders(ui: ReactElement, locale: Locale = "es"): RenderResult {
  return render(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>);
}
