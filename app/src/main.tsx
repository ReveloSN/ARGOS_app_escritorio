import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";

const ROOT_ELEMENT_ID = "root";

const rootElement = document.getElementById(ROOT_ELEMENT_ID);
if (!rootElement) throw new Error(`Falta el elemento #${ROOT_ELEMENT_ID} en index.html.`);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
