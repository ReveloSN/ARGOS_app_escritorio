import { render, type RenderResult } from "@testing-library/react";
import { vi } from "vitest";

import { App } from "../App";
import { AssistantProvider } from "../features/assistant/AssistantProvider";
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
import type { PreferenceStorage } from "../services/preferences/preferenceStorage";
import { ReviewSeed } from "./ReviewSeed";

export function stubBrowser(): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Element.prototype.scrollIntoView = vi.fn();
}

/**
 * La app completa con servicios del motor de prueba y, si se indica, una revisión cargada.
 * Sin `storage` no se recuerda nada y los primeros pasos no se abren solos.
 */
export function renderApp(
  services: EngineServices,
  review?: ReviewResult,
  storage?: PreferenceStorage,
): RenderResult {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <EngineServicesContext.Provider value={services}>
          <ReviewProvider>
            <AssistantProvider storage={storage}>
              <ComparisonProvider>
                <SendProvider>
                  {review && <ReviewSeed review={review} />}
                  <App />
                </SendProvider>
              </ComparisonProvider>
            </AssistantProvider>
          </ReviewProvider>
        </EngineServicesContext.Provider>
      </ThemeProvider>
    </I18nProvider>,
  );
}
