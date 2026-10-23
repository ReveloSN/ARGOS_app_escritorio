import { useI18n } from "../../i18n/i18nContext";
import { DECISION_LABELS, type AlertDecisions } from "../alerts/useAlertDecisions";
import { useDecisionCommands, type DecisionTarget } from "../alerts/useDecisionCommands";
import { useTimedNotice } from "../alerts/useTimedNotice";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useComparison } from "./comparisonContext";

function useComparisonDecisionTarget(): DecisionTarget {
  const { t } = useI18n();
  const { comparisons } = useEngineServices();
  const { comparison, updateDecisions } = useComparison();
  const comparisonId = comparison?.id ?? "";
  return {
    send: (input) => comparisons.decide(comparisonId, input),
    sendUndo: () => comparisons.undoDecision(comparisonId),
    apply: updateDecisions,
    decidedMessage: (input) =>
      t("comparison.decided", {
        number: input.alertNumber,
        decision: t(DECISION_LABELS[input.kind]),
      }),
  };
}

/** Las mismas decisiones del detalle de alerta, sobre cambios e inconsistencias (con Ctrl Z). */
export function useComparisonDecisions(): AlertDecisions {
  const { comparison } = useComparison();
  const notice = useTimedNotice();
  const commands = useDecisionCommands(useComparisonDecisionTarget(), notice);
  return {
    isReadOnly: !comparison,
    canUndo: comparison?.decisions.canUndo ?? false,
    notice,
    ...commands,
  };
}
