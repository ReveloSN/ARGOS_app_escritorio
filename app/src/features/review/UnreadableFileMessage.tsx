import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentReadResult } from "../../services/engine/reviewTypes";
import { canActivateOcr, unreadableKeys } from "./readOutcomeText";

interface UnreadableFileMessageProps {
  readonly document: DocumentReadResult;
  readonly onReplace: () => void;
  /** Solo para un PDF escaneado que aún no se leyó con OCR (mockup «Confirmar lectura»). */
  readonly onActivateOcr: () => void;
}

/** El motivo del motor traducido al mensaje de 3 partes; nunca el código interno. */
export function UnreadableFileMessage({
  document,
  onReplace,
  onActivateOcr,
}: UnreadableFileMessageProps) {
  const { t } = useI18n();
  const keys = unreadableKeys(document);
  if (!keys) return null;
  const replace = { label: t("newReview.replaceFile"), onClick: onReplace };
  const offersOcr = canActivateOcr(document);
  return (
    <ErrorMessage
      tone="inline"
      what={t(keys.what, { name: document.name })}
      why={t(keys.why)}
      todo={t(keys.todo)}
      primaryAction={offersOcr ? { label: t("ocr.activate"), onClick: onActivateOcr } : replace}
      {...(offersOcr ? { secondaryAction: replace } : {})}
    />
  );
}
