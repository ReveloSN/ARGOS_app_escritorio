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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { EngineServicesContext } from "./features/engine/EngineServicesContext";
import { ThemeProvider } from "./features/settings/theme/ThemeProvider";
import { I18nProvider } from "./i18n/I18nProvider";
import { createEngineServices } from "./services/engine/createEngineServices";

const ROOT_ELEMENT_ID = "root";

const rootElement = document.getElementById(ROOT_ELEMENT_ID);
if (!rootElement) throw new Error(`Falta el elemento #${ROOT_ELEMENT_ID} en index.html.`);

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <EngineServicesContext.Provider value={createEngineServices()}>
          <App />
        </EngineServicesContext.Provider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
);
