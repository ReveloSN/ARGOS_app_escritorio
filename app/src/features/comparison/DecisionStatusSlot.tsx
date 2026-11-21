import { Kbd, MODIFIER_KEY } from "../../components/atoms/Kbd";
import { Toast } from "../../components/molecules/Toast";
import { useI18n } from "../../i18n/i18nContext";
import { DecisionFeedback } from "../alerts/DecisionFeedback";
import { DECISION_LABELS, type AlertDecisions } from "../alerts/useAlertDecisions";
import styles from "./Compare.module.css";

const MOVE_KEYS = ["J", "K"];
const DECIDE_KEYS = ["C", "E", "I"];
const UNDO_KEYS = [MODIFIER_KEY, "Z"];
const IGNORE_UNDO = () => undefined;

interface DecisionStatusSlotProps {
  readonly decisions: AlertDecisions;
  /** El número más alto de la lista: con él se mide la confirmación más larga posible. */
  readonly largestNumber: number;
}

/** La confirmación más larga que puede salir aquí: con ese texto se reserva el alto de la franja. */
function useLongestConfirmation(largestNumber: number): string {
  const { t } = useI18n();
  const labels = Object.values(DECISION_LABELS).map((key) => t(key));
  const longest = labels.reduce((a, b) => (b.length > a.length ? b : a), "");
  return t("comparison.decided", { number: largestNumber, decision: longest });
}

/**
 * Franja de alto fijo arriba del panel de Comparar: en reposo recuerda los atajos y, al
 * decidir, la confirmación con «Deshacer» ocupa el mismo hueco. Una copia oculta de la
 * confirmación más larga fija ese alto, así la lista no se mueve y el cambio elegido no sale de
 * la vista cuando la confirmación aparece, cambia o se va.
 */
export function DecisionStatusSlot({ decisions, largestNumber }: DecisionStatusSlotProps) {
  const { t } = useI18n();
  const sizing = useLongestConfirmation(largestNumber);
  const isShowing = decisions.notice.isVisible || decisions.failure !== null;
  return (
    <div className={styles.decisionSlot}>
      <p aria-hidden={isShowing} className={isShowing ? styles.slotHintHidden : styles.slotHint}>
        <Kbd keys={MOVE_KEYS} variant="inline" /> {t("shortcuts.move")} ·{" "}
        <Kbd keys={DECIDE_KEYS} variant="inline" /> {t("shortcuts.decide")} ·{" "}
        <Kbd keys={UNDO_KEYS} variant="inline" /> {t("shortcuts.undo")}
      </p>
      <div aria-hidden="true" data-slot-sizer="">
        <Toast message={sizing} visible={false} onUndo={IGNORE_UNDO} isInline reservesSpace />
      </div>
      <DecisionFeedback decisions={decisions} isInline reservesSpace />
    </div>
  );
}
