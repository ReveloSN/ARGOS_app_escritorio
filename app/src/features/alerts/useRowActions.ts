import type { MenuAction } from "../../components/molecules/ActionMenu";
import type { AlertRowData } from "../../components/organisms/AlertList";
import { useI18n } from "../../i18n/i18nContext";
import type { DecisionKindValue } from "../../services/engine/reviewTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import type { AlertDecisions } from "./useAlertDecisions";
import type { TimedNotice } from "./useTimedNotice";

interface DecisionAction {
  readonly kind: DecisionKindValue;
  readonly icon: string;
  readonly shortcut: string;
}

const DECISION_ACTIONS: readonly DecisionAction[] = [
  { kind: "correct", icon: "check", shortcut: "C" },
  { kind: "error", icon: "edit_note", shortcut: "E" },
  { kind: "ignored", icon: "visibility_off", shortcut: "I" },
];

type RowMenu = (row: AlertRowData) => readonly MenuAction[];
type RowAction = (row: AlertRowData) => MenuAction;

/** Acciones del menú «⋯»: abrir, decidir sin abrir, no alertar casos similares y copiar. */
export function useRowActions(
  decisions: AlertDecisions,
  onOpen: (number: number) => void,
): RowMenu {
  const { t } = useI18n();
  const decide = useDecisionActions(decisions);
  const extras = useExtraActions(decisions.notice);
  const open = (row: AlertRowData): MenuAction => ({
    id: "open",
    icon: "compare",
    label: t("rowActions.open"),
    shortcut: "↵",
    onSelect: () => {
      onOpen(row.number);
    },
  });
  return (row) => [open(row), ...decide(row), ...extras(row)];
}

/** «Es correcto», «Es un error» e «Ignorar» sin abrir el detalle; nada si es de solo lectura. */
function useDecisionActions(decisions: AlertDecisions): RowMenu {
  const { t } = useI18n();
  const label = (kind: DecisionKindValue) =>
    kind === "ignored" ? t("decisionPanel.ignore") : t(`decision.${kind}`);
  const toMenuAction = (row: AlertRowData, action: DecisionAction, index: number) => ({
    ...action,
    id: action.kind,
    label: label(action.kind),
    startsGroup: index === 0,
    isEmphasized: action.kind === "error",
    isMuted: action.kind === "ignored",
    onSelect: () => {
      decisions.decide({ alertNumber: row.number, kind: action.kind });
    },
  });
  return (row) =>
    decisions.isReadOnly
      ? []
      : DECISION_ACTIONS.map((action, index) => toMenuAction(row, action, index));
}

/** «No alertar casos similares» y «Copiar Valor A y Valor B», con su confirmación. */
function useExtraActions(notice: TimedNotice): RowMenu {
  const suppress = useSuppressAction(notice);
  const copy = useCopyAction(notice);
  return (row) => [suppress(row), copy(row)];
}

function confirmWith(notice: TimedNotice, message: string): () => void {
  return () => {
    notice.show(message);
  };
}

function useSuppressAction(notice: TimedNotice): RowAction {
  const { t } = useI18n();
  const { preferences } = useEngineServices();
  const { review } = useReview();
  return (row) => ({
    id: "suppress",
    icon: "notifications_off",
    label: t("rowActions.suppress"),
    startsGroup: true,
    isMuted: true,
    onSelect: () => {
      preferences
        .suppressSimilar(review?.session.id ?? "", row.number)
        .then(
          confirmWith(notice, t("rowActions.suppressed")),
          confirmWith(notice, t("rowActions.suppressFailed")),
        );
    },
  });
}

function useCopyAction(notice: TimedNotice): RowAction {
  const { t } = useI18n();
  return (row) => ({
    id: "copy",
    icon: "content_copy",
    label: t("rowActions.copy"),
    isMuted: true,
    onSelect: () => {
      const text = `${t("alerts.valueA")}: ${row.valueA}\n${t("alerts.valueB")}: ${row.valueB}`;
      navigator.clipboard
        .writeText(text)
        .then(
          confirmWith(notice, t("rowActions.copied")),
          confirmWith(notice, t("rowActions.copyFailed")),
        );
    },
  });
}
