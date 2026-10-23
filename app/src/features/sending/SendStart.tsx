import { useRef, type ChangeEvent } from "react";

import { Button } from "../../components/atoms/Button";
import { EmptyState } from "../../components/molecules/EmptyState";
import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Send.module.css";
import type { SendStartStatus } from "./useStartSendReview";

const DRAFT_FILES = ".eml";

interface SendStartProps {
  readonly status: SendStartStatus;
  readonly hasCaseFile: boolean;
  readonly onFile: (file: File) => void;
}

function Failure({ isNotADraft, onChoose }: { isNotADraft: boolean; onChoose: () => void }) {
  const { t } = useI18n();
  const prefix = isNotADraft ? "sending.start.notADraft" : "sending.start.failed";
  return (
    <ErrorMessage
      tone="neutral"
      what={t(`${prefix}.what`)}
      why={t(`${prefix}.why`)}
      todo={t(`${prefix}.todo`)}
      primaryAction={{ label: t("sending.start.choose"), onClick: onChoose }}
    />
  );
}

/** Sin borrador todavía: pide el correo (.eml), muestra que se está revisando o por qué falló. */
export function SendStart({ status, hasCaseFile, onFile }: SendStartProps) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const choose = () => input.current?.click();
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = [...(event.target.files ?? [])];
    event.target.value = "";
    if (file) onFile(file);
  };
  return (
    <div className={styles.start}>
      <input
        ref={input}
        type="file"
        hidden
        accept={DRAFT_FILES}
        aria-label={t("sending.start.choose")}
        onChange={onChange}
      />
      {status.kind === "running" && (
        <p role="status" className={styles.running}>
          {t("sending.start.reviewing", { name: status.fileName })}
        </p>
      )}
      {status.kind === "failed" && <Failure isNotADraft={status.isNotADraft} onChoose={choose} />}
      {status.kind === "idle" && (
        <EmptyState
          icon="outgoing_mail"
          title={t("sending.start.title")}
          description={t("sending.start.description")}
          note={hasCaseFile ? t("sending.start.withCaseFile") : t("sending.start.withoutCaseFile")}
          actions={
            <Button variant="primary" onClick={choose}>
              {t("sending.start.choose")}
            </Button>
          }
        />
      )}
    </div>
  );
}
