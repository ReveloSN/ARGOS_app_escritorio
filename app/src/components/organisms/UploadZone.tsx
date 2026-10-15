import { useId, useState, type DragEvent } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { Button } from "../atoms/Button";
import { Icon } from "../atoms/Icon";
import { MODIFIER_KEY } from "../atoms/Kbd";
import { joinClassNames } from "../joinClassNames";
import styles from "./UploadZone.module.css";

const CHOOSE_SHORTCUT = [MODIFIER_KEY, "O"];
const PASTE_SHORTCUT = [MODIFIER_KEY, "V"];

interface UploadZoneProps {
  readonly onFilesSelected: (files: readonly File[]) => void;
  readonly onPasteText: () => void;
}

export function UploadZone({ onFilesSelected, onPasteText }: UploadZoneProps) {
  const { t, tPlural } = useI18n();
  const inputId = useId();
  const [draggedCount, setDraggedCount] = useState(0);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDraggedCount(0);
    onFilesSelected([...event.dataTransfer.files]);
  };

  return (
    <div
      className={joinClassNames(styles.zone, draggedCount > 0 && styles.dragging)}
      onDragEnter={(event) => {
        setDraggedCount(event.dataTransfer.items.length);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={() => {
        setDraggedCount(0);
      }}
      onDrop={handleDrop}
    >
      <Icon name="upload_file" size="xl" className={styles.icon} />
      {draggedCount > 0 ? (
        <span className={styles.prompt}>
          {tPlural({ key: "upload.dropping", count: draggedCount })}
        </span>
      ) : (
        <span className={styles.text}>
          <span className={styles.prompt}>{t("upload.prompt")}</span>
          <span className={styles.formats}>{t("upload.formats")}</span>
        </span>
      )}
      <label htmlFor={inputId} className="visually-hidden">
        {t("upload.choose")}
      </label>
      <input
        id={inputId}
        type="file"
        multiple
        className="visually-hidden"
        onChange={(event) => {
          onFilesSelected([...(event.target.files ?? [])]);
        }}
      />
      <Button
        size="md"
        shortcut={CHOOSE_SHORTCUT}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {t("upload.choose")}
      </Button>
      <Button size="md" shortcut={PASTE_SHORTCUT} onClick={onPasteText}>
        {t("upload.paste")}
      </Button>
    </div>
  );
}
