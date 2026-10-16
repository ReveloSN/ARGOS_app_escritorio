import type { I18n } from "../../i18n/i18nContext";
import type { HistorySource } from "../../services/engine/historyTypes";
import type { AppRoute } from "../navigation/appRoute";
import { scrollToSettingsSection, SETTINGS_SECTIONS } from "../settings/settingsSections";
import { includesFolded } from "./foldForSearch";
import { MAX_RESULTS_PER_GROUP, nonEmptyGroups, type SearchScope } from "./searchScope";

// El historial completo que guarda el motor (con o sin el límite de 90 días).
const WHOLE_HISTORY_DAYS = 3650;

interface HistorySearchContext {
  readonly history: HistorySource;
  readonly i18n: Pick<I18n, "t" | "format">;
  readonly navigate: (route: AppRoute) => void;
}

/** En el historial, Ctrl K busca sesiones por su nombre. */
export function historySearchScope({ history, i18n, navigate }: HistorySearchContext): SearchScope {
  return {
    placeholder: i18n.t("search.historyPlaceholder"),
    search: async (query) => {
      const { sessions } = await history.history(WHOLE_HISTORY_DAYS);
      const items = sessions
        .filter((session) => includesFolded(session.name, query))
        .slice(0, MAX_RESULTS_PER_GROUP)
        .map((session) => ({
          id: session.id,
          title: session.name,
          detail: i18n.format.dateTime(new Date(session.createdAt)),
          open: () => {
            navigate({ page: "history", sessionId: session.id });
          },
        }));
      return nonEmptyGroups([{ id: "sessions", label: i18n.t("search.sessionsGroup"), items }]);
    },
  };
}

/** En Ajustes, Ctrl K lleva a la sección buscada. */
export function settingsSearchScope(i18n: Pick<I18n, "t">): SearchScope {
  return {
    placeholder: i18n.t("search.settingsPlaceholder"),
    search: (query) => {
      const items = SETTINGS_SECTIONS.filter((section) =>
        includesFolded(i18n.t(section.title), query),
      ).map((section) => ({
        id: section.id,
        title: i18n.t(section.title),
        open: () => {
          scrollToSettingsSection(section.id);
        },
      }));
      return Promise.resolve(
        nonEmptyGroups([{ id: "sections", label: i18n.t("search.sectionsGroup"), items }]),
      );
    },
  };
}
