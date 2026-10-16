import { Button } from "../../components/atoms/Button";
import { EmptyState } from "../../components/molecules/EmptyState";
import { useI18n } from "../../i18n/i18nContext";
import { activeFacetCount, NO_FILTERS, type AlertFilters } from "./alertFilters";

interface NoMatchingAlertsProps {
  readonly filters: AlertFilters;
  readonly onChange: (filters: AlertFilters) => void;
  readonly onSearchDocuments?: ((query: string) => void) | undefined;
}

/** «Búsqueda sin resultados» de los mockups: por qué no hay alertas y cómo seguir buscando. */
export function NoMatchingAlerts({ filters, onChange, onSearchDocuments }: NoMatchingAlertsProps) {
  const { t } = useI18n();
  const facets = activeFacetCount(filters);
  const title = filters.query
    ? t("results.noMatchesFor", { query: filters.query })
    : t("results.noMatches");
  const description =
    facets > 0 ? t("results.activeFilters", { count: facets }) : t("results.searchInDocuments");
  return (
    <EmptyState
      icon="search_off"
      title={title}
      description={description}
      actions={
        <>
          {facets > 0 && (
            <Button
              onClick={() => {
                onChange({ ...NO_FILTERS, query: filters.query });
              }}
            >
              {t("filters.clear")}
            </Button>
          )}
          {onSearchDocuments && filters.query && (
            <Button
              onClick={() => {
                onSearchDocuments(filters.query);
              }}
            >
              {t("results.searchDocuments")}
            </Button>
          )}
        </>
      }
    />
  );
}
