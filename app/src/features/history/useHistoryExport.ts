import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { saveTextFile } from "../../services/download/saveTextFile";
import type { HistoryRecordResult } from "../../services/engine/historyTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { buildHistoryCsv } from "./historyCsv";

const CSV_TYPE = "text/csv;charset=utf-8";
const ISO_DATE_LENGTH = "yyyy-mm-dd".length;

export interface HistoryExport {
  readonly exportCsv: () => void;
  readonly hasFailed: boolean;
}

/** «Exportar registro (CSV)»: todas las alertas del periodo con su decisión. */
export function useHistoryExport(days: number): HistoryExport {
  const i18n = useI18n();
  const { history } = useEngineServices();
  const [hasFailed, setHasFailed] = useState(false);
  const save = (records: readonly HistoryRecordResult[]) => {
    const date = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
    const name = i18n.t("history.exportFileName", { date });
    saveTextFile({ name, content: buildHistoryCsv(records, i18n), type: CSV_TYPE });
  };
  const exportCsv = () => {
    setHasFailed(false);
    history.records(days).then(save, () => {
      setHasFailed(true);
    });
  };
  return { exportCsv, hasFailed };
}
