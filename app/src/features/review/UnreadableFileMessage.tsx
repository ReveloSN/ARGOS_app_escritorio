import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { UnreadableReasonValue } from "../../services/engine/reviewTypes";

interface MessageKeys {
  readonly what: TranslationKey;
  readonly why: TranslationKey;
  readonly todo: TranslationKey;
}

function keysFor(reason: UnreadableReasonValue): MessageKeys {
  return {
    what: `unreadable.${reason}.what`,
    why: `unreadable.${reason}.why`,
    todo: `unreadable.${reason}.todo`,
  };
}

interface UnreadableFileMessageProps {
  readonly name: string;
  readonly reason: UnreadableReasonValue;
  readonly onReplace: () => void;
}

/** El motivo del motor traducido al mensaje de 3 partes; nunca el código interno. */
export function UnreadableFileMessage({ name, reason, onReplace }: UnreadableFileMessageProps) {
  const { t } = useI18n();
  const keys = keysFor(reason);
  return (
    <ErrorMessage
      tone="inline"
      what={t(keys.what, { name })}
      why={t(keys.why)}
      todo={t(keys.todo)}
      primaryAction={{ label: t("newReview.replaceFile"), onClick: onReplace }}
    />
  );
}
