import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { useShortcuts } from "../keyboard/useShortcuts";
import styles from "./CloudOcrConsent.module.css";

interface CloudOcrConsentProps {
  readonly document: DocumentReadResult;
  readonly onSendToCloud: () => void;
  readonly onUseLocal: () => void;
  readonly onCancel: () => void;
}

const TITLE_ID = "cloud-ocr-title";

/**
 * Consentimiento antes de cada envío a Document AI: dice cuántas páginas saldrán del equipo
 * (CLAUDE.md §15). Sin confirmar no se envía nada; el OCR local siempre está a mano.
 */
export function CloudOcrConsent(props: CloudOcrConsentProps) {
  const { t, tPlural } = useI18n();
  const pages = props.document.pageCount ?? 0;
  useShortcuts([{ key: "Escape", isActiveWhileTyping: true, run: props.onCancel }]);
  return (
    <div className={styles.backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} className={styles.dialog}>
        <Icon name="cloud_upload" size="md" className={styles.icon} />
        <div className={styles.body}>
          <h2 id={TITLE_ID} className={styles.title}>
            {t("ocr.consent.title", { name: props.document.name })}
          </h2>
          <p className={styles.text}>{tPlural({ key: "ocr.consent.pages", count: pages })}</p>
          <p className={styles.text}>{t("ocr.consent.local")}</p>
          <div className={styles.actions}>
            <Button variant="primary" size="md" autoFocus onClick={props.onSendToCloud}>
              {tPlural({ key: "ocr.consent.send", count: pages })}
            </Button>
            <Button size="md" onClick={props.onUseLocal}>
              {t("ocr.consent.useLocal")}
            </Button>
            <Button variant="tertiary" size="md" shortcut={["Esc"]} onClick={props.onCancel}>
              {t("ocr.consent.cancel")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
