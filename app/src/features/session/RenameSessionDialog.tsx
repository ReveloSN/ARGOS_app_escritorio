import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { TextField } from "../../components/atoms/TextField";
import { ModalDialog } from "../../components/molecules/ModalDialog";
import { useI18n } from "../../i18n/i18nContext";
import type { SessionRename } from "./useSessionRename";

interface RenameSessionDialogProps {
  readonly currentName: string;
  readonly renaming: SessionRename;
  readonly onClose: () => void;
}

export function RenameSessionDialog({ currentName, renaming, onClose }: RenameSessionDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState(currentName);
  const canSave = name.trim() !== "" && name.trim() !== currentName;
  const save = () => {
    if (!canSave) return;
    void renaming.rename(name).then((isSaved) => {
      if (isSaved) onClose();
    });
  };
  return (
    <ModalDialog
      title={t("sessionMenu.renameTitle")}
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose}>{t("sessionMenu.cancel")}</Button>
          <Button variant="primary" disabled={!canSave} onClick={save}>
            {t("sessionMenu.renameSave")}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          label={t("sessionMenu.renameField")}
          value={name}
          onChange={setName}
          {...(renaming.hasFailed ? { error: t("sessionMenu.failed.what") } : {})}
        />
      </form>
    </ModalDialog>
  );
}
