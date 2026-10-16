import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import type { DocumentOpener } from "./useOpenDocument";

interface OpenDocumentFailureProps {
  readonly failure: NonNullable<DocumentOpener["failure"]>;
  readonly onDismiss: () => void;
}

/** No se pudo abrir el archivo: qué pasó, por qué y qué hacer (mockup «Archivo movido»). */
export function OpenDocumentFailure({ failure, onDismiss }: OpenDocumentFailureProps) {
  const { t } = useI18n();
  const prefix = failure.kind === "missing" ? "openDocument.missing" : "openDocument.unavailable";
  return (
    <ErrorMessage
      tone="neutral"
      icon="link_off"
      what={t(`${prefix}.what`, { name: failure.document })}
      why={t(`${prefix}.why`)}
      todo={t(`${prefix}.todo`)}
      primaryAction={{ label: t("openDocument.dismiss"), onClick: onDismiss }}
    />
  );
}
