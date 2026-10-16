import type { I18n } from "../../i18n/i18nContext";
import type { DocumentAccess, DocumentMatchResult } from "../../services/engine/documentTypes";
import type { AlertResult, ReviewResult } from "../../services/engine/reviewTypes";
import { alertSearchText, alertTitle, describeLocation } from "../alerts/alertPresentation";
import type { AppRoute } from "../navigation/appRoute";
import { includesFolded } from "./foldForSearch";
import {
  MAX_RESULTS_PER_GROUP,
  nonEmptyGroups,
  type ScopedSearchItem,
  type SearchScope,
} from "./searchScope";

export interface ReviewSearchContext {
  readonly review: ReviewResult;
  readonly documents: DocumentAccess;
  readonly i18n: Pick<I18n, "t">;
  readonly navigate: (route: AppRoute) => void;
}

function alertItem(alert: AlertResult, context: ReviewSearchContext): ScopedSearchItem {
  const { t } = context.i18n;
  return {
    id: `alert-${String(alert.number)}`,
    title: t("search.alertTitle", { number: alert.number, title: alertTitle(alert, t) }),
    detail: `${alert.first.value} · ${alert.second.value}`,
    open: () => {
      context.navigate({ page: "alert", number: alert.number });
    },
  };
}

function fragmentItem(match: DocumentMatchResult, index: number, context: ReviewSearchContext) {
  const { review, documents, i18n } = context;
  return {
    id: `fragment-${String(index)}`,
    title: match.document,
    detail: describeLocation(match.location, i18n.t),
    excerpt: {
      text: match.excerpt,
      highlightStart: match.highlightStart,
      highlightEnd: match.highlightEnd,
    },
    open: () => documents.openDocument(review.session.id, match.document),
  } satisfies ScopedSearchItem;
}

function matchingAlerts(query: string, context: ReviewSearchContext): ScopedSearchItem[] {
  const { t } = context.i18n;
  return context.review.alerts
    .filter((alert) => includesFolded(alertSearchText(alert, t), query))
    .slice(0, MAX_RESULTS_PER_GROUP)
    .map((alert) => alertItem(alert, context));
}

async function searchReview(query: string, context: ReviewSearchContext) {
  const { review, documents, i18n } = context;
  const matches = await documents.searchDocuments(review.session.id, query);
  return nonEmptyGroups([
    { id: "alerts", label: i18n.t("search.alertsGroup"), items: matchingAlerts(query, context) },
    {
      id: "documents",
      label: i18n.t("search.documentsGroup"),
      items: matches.map((match, index) => fragmentItem(match, index, context)),
    },
  ]);
}

/** En una revisión, Ctrl K busca en sus alertas y en el texto de sus documentos. */
export function reviewSearchScope(context: ReviewSearchContext): SearchScope {
  return {
    placeholder: context.i18n.t("topbar.searchPlaceholder"),
    search: (query) => searchReview(query, context),
  };
}
