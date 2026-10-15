import type { ReactNode } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { joinClassNames } from "../joinClassNames";
import styles from "./ErrorMessage.module.css";

export type ErrorTone = "inline" | "neutral" | "dialog";

export interface ErrorAction {
  readonly label: string;
  readonly onClick: () => void;
}

const ICON_BY_TONE: Readonly<Record<ErrorTone, string>> = {
  inline: "report",
  neutral: "error",
  dialog: "lock",
};

interface ErrorMessageProps {
  readonly tone: ErrorTone;
  /** 1 · Qué pasó, en lenguaje del usuario. */
  readonly what: string;
  /** 2 · Por qué, solo si ayuda a actuar. */
  readonly why?: string;
  /** 3 · Qué hacer ahora; siempre acompañado de un botón. */
  readonly todo: string;
  readonly primaryAction: ErrorAction;
  readonly secondaryAction?: ErrorAction;
  readonly icon?: string;
  /** Código interno: nunca solo, siempre presentado como detalle para soporte. */
  readonly technicalCode?: string;
  readonly children?: ReactNode;
}

export function ErrorMessage(props: ErrorMessageProps) {
  const { t } = useI18n();
  const { tone, what, why, todo, primaryAction, secondaryAction, technicalCode } = props;

  return (
    <div role="alert" className={joinClassNames(styles.message, styles[tone])}>
      <Icon name={props.icon ?? ICON_BY_TONE[tone]} size="md" className={styles.icon} />
      <div className={styles.body}>
        <span className={styles.what}>{what}</span>
        {why && <span className={styles.why}>{why}</span>}
        <span>{todo}</span>
        {props.children}
        {technicalCode && (
          <span className={styles.technical}>
            {t("errors.technicalDetail", { code: technicalCode })}
          </span>
        )}
        <div className={styles.actions}>
          <Button variant="primary" size="md" onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
          {secondaryAction && (
            <Button size="md" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
