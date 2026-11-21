import type { TopbarSection } from "../../components/organisms/Topbar";
import { SIDEBAR_SECTIONS } from "../../components/organisms/sidebarSections";
import type { I18n } from "../../i18n/i18nContext";
import { sectionOf, type AppRoute } from "./appRoute";

/** La sección de la pantalla actual, con el mismo icono y nombre que la barra lateral. */
export function topbarSectionFor(route: AppRoute, i18n: Pick<I18n, "t">): TopbarSection {
  const current = sectionOf(route);
  const item = SIDEBAR_SECTIONS.find((section) => section.section === current);
  return { icon: item?.icon ?? "home", label: i18n.t(item?.label ?? "navigation.home") };
}
