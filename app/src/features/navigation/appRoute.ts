import type { SidebarSection } from "../../components/organisms/sidebarSections";

/** Pantallas de la app: Inicio → Nueva revisión → Resultados → Detalle de alerta; y Comparar. */
export type AppRoute =
  | { readonly page: "home" }
  | { readonly page: "newReview" }
  | { readonly page: "results" }
  | { readonly page: "alert"; readonly number: number }
  | { readonly page: "compare" }
  | { readonly page: "history"; readonly sessionId?: string }
  | { readonly page: "settings" };

export const HOME_ROUTE: AppRoute = { page: "home" };

const SECTION_BY_PAGE: Readonly<Record<AppRoute["page"], SidebarSection>> = {
  home: "home",
  newReview: "home",
  results: "review",
  alert: "review",
  compare: "compare",
  history: "history",
  settings: "settings",
};

const ROUTE_BY_SECTION: Readonly<Record<SidebarSection, AppRoute>> = {
  home: HOME_ROUTE,
  review: { page: "results" },
  compare: { page: "compare" },
  history: { page: "history" },
  settings: { page: "settings" },
};

export function sectionOf(route: AppRoute): SidebarSection {
  return SECTION_BY_PAGE[route.page];
}

export function routeForSection(section: SidebarSection): AppRoute {
  return ROUTE_BY_SECTION[section];
}
