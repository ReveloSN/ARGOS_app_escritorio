import { Button } from "../../components/atoms/Button";
import { ModalDialog } from "../../components/molecules/ModalDialog";
import { useI18n } from "../../i18n/i18nContext";

interface DeleteSessionDialogProps {
  readonly name: string;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

/** Confirmación antes de eliminar; el foco queda en «Cancelar», la opción segura. */
export function DeleteSessionDialog({ name, onConfirm, onClose }: DeleteSessionDialogProps) {
  const { t } = useI18n();
  return (
    <ModalDialog
      title={t("sessionMenu.deleteTitle", { name })}
      onClose={onClose}
      actions={
        <>
          <Button autoFocus onClick={onClose}>
            {t("sessionMenu.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onConfirm();
            }}
          >
            {t("sessionMenu.deleteConfirm")}
          </Button>
        </>
      }
    >
      <p>{t("sessionMenu.deleteBody")}</p>
      <p>{t("sessionMenu.deleteHint")}</p>
    </ModalDialog>
  );
}
