import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { EngineServicesContext } from "./features/engine/EngineServicesContext";
import { createEngineServices } from "./services/engine/createEngineServices";

const ROOT_ELEMENT_ID = "root";

const rootElement = document.getElementById(ROOT_ELEMENT_ID);
if (!rootElement) throw new Error(`Falta el elemento #${ROOT_ELEMENT_ID} en index.html.`);

createRoot(rootElement).render(
  <StrictMode>
    <EngineServicesContext.Provider value={createEngineServices()}>
      <App />
    </EngineServicesContext.Provider>
  </StrictMode>,
);
