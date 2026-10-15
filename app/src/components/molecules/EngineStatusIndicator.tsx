import { useI18n } from "../../i18n/i18nContext";
import { Icon } from "../atoms/Icon";
import { ProgressBar } from "../atoms/ProgressBar";
import { joinClassNames } from "../joinClassNames";
import styles from "./EngineStatusIndicator.module.css";

export type EngineStatusView =
  | { readonly kind: "starting" | "ready" | "stopped" }
  | { readonly kind: "analyzing"; readonly done: number; readonly total: number };

interface EngineStatusIndicatorProps {
  readonly status: EngineStatusView;
}

// El estado se comunica con texto e icono, no solo con color (CLAUDE.md §9).
export function EngineStatusIndicator({ status }: EngineStatusIndicatorProps) {
  const { t } = useI18n();

  if (status.kind === "analyzing") {
    const text = t("engine.status.analyzing", { done: status.done, total: status.total });
    return (
      <p role="status" className={styles.status}>
        <span className={styles.progress}>
          <ProgressBar value={status.done / status.total} label={text} />
        </span>
        {text}
      </p>
    );
  }
  const icon = { starting: "hourglass_top", ready: "check_circle", stopped: "report" }[status.kind];
  return (
    <p role="status" className={joinClassNames(styles.status, styles[status.kind])}>
      <Icon name={icon} size="sm" className={styles.icon} />
      {t(`engine.status.${status.kind}`)}
    </p>
  );
}
