import { useContext } from "react";
import { createPortal } from "react-dom";

import { Breadcrumb, type BreadcrumbItem } from "../../components/molecules/Breadcrumb";
import { TopbarLocationContext } from "./topbarLocationContext";

/**
 * La ruta contextual de la pantalla («Inicio › Nueva revisión»): se muestra en la barra superior,
 * no dentro de la página. Fuera de la app completa (una pantalla suelta) se muestra en su sitio.
 */
export function TopbarLocation({ items }: { readonly items: readonly BreadcrumbItem[] }) {
  const target = useContext(TopbarLocationContext);
  const trail = <Breadcrumb items={items} />;
  return target ? createPortal(trail, target) : trail;
}
