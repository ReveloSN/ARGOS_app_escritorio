// Fuentes empaquetadas con la app: la interfaz funciona sin internet (CLAUDE.md §1).
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-serif/400.css";
import "material-symbols/outlined.css";
import "./design-tokens/index.css";
import "./styles/base.css";

import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { EngineServicesContext } from "./features/engine/EngineServicesContext";
import { ComparisonProvider } from "./features/comparison/ComparisonProvider";
import { SendProvider } from "./features/sending/SendProvider";
import { ReviewProvider } from "./features/review/ReviewProvider";
import { ThemeProvider } from "./features/settings/theme/ThemeProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import { createEngineServices } from "./services/engine/createEngineServices";
import { browserPreferenceStorage } from "./services/preferences/preferenceStorage";

const ROOT_ELEMENT_ID = "root";
const DEV_CATALOG_PATH = "/dev/design-system";

const rootElement = document.getElementById(ROOT_ELEMENT_ID);
if (!rootElement) throw new Error(`Falta el elemento #${ROOT_ELEMENT_ID} en index.html.`);
const root = createRoot(rootElement);
const engineServices = createEngineServices();

function render(content: ReactNode) {
  root.render(
    <StrictMode>
      <I18nProvider storage={browserPreferenceStorage}>
        <ThemeProvider storage={browserPreferenceStorage}>
          <EngineServicesContext.Provider value={engineServices}>
            <ReviewProvider>
              <ComparisonProvider>
                <SendProvider>{content}</SendProvider>
              </ComparisonProvider>
            </ReviewProvider>
          </EngineServicesContext.Provider>
        </ThemeProvider>
      </I18nProvider>
    </StrictMode>,
  );
}

// El catálogo de componentes solo existe en desarrollo: en el build de producción
// import.meta.env.DEV es `false` y esta rama, con su import dinámico, se elimina.
if (import.meta.env.DEV && window.location.pathname === DEV_CATALOG_PATH) {
  void import("./dev/DesignSystemCatalog").then(({ DesignSystemCatalog }) => {
    render(<DesignSystemCatalog />);
  });
} else {
  render(<App />);
}
