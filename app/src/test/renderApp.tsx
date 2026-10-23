import { render, type RenderResult } from "@testing-library/react";
import { vi } from "vitest";

import { App } from "../App";
import {
  EngineServicesContext,
  type EngineServices,
} from "../features/engine/EngineServicesContext";
import { ComparisonProvider } from "../features/comparison/ComparisonProvider";
import { SendProvider } from "../features/sending/SendProvider";
import { ReviewProvider } from "../features/review/ReviewProvider";
import { ThemeProvider } from "../features/settings/theme/ThemeProvider";
import { I18nProvider } from "../i18n/I18nProvider";
import type { ReviewResult } from "../services/engine/reviewTypes";
import { ReviewSeed } from "./ReviewSeed";

export function stubBrowser(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Element.prototype.scrollIntoView = vi.fn();
}

/** La app completa con servicios del motor de prueba y, si se indica, una revisión cargada. */
export function renderApp(services: EngineServices, review?: ReviewResult): RenderResult {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <EngineServicesContext.Provider value={services}>
          <ReviewProvider>
            <ComparisonProvider>
              <SendProvider>
                {review && <ReviewSeed review={review} />}
                <App />
              </SendProvider>
            </ComparisonProvider>
          </ReviewProvider>
        </EngineServicesContext.Provider>
      </ThemeProvider>
    </I18nProvider>,
  );
}
