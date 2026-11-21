import { createContext } from "react";

/** El hueco de la barra superior donde cada pantalla pone su ruta contextual. */
export const TopbarLocationContext = createContext<HTMLElement | null>(null);
