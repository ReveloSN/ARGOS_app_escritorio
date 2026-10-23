import { useState } from "react";

import { MODIFIER_KEY } from "../../components/atoms/Kbd";
import type {
  ReportDocumentData,
  ReportFormatValue,
  ReportLocation,
} from "../../services/engine/reportTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useEngineQuery } from "../engine/useEngineQuery";
import { REPORT_PARTS, type ReportPart } from "./reportDocument";

export const EXPORT_SHORTCUT = [MODIFIER_KEY, "E"];

export type ExportStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "exporting" }
  | { readonly kind: "saved"; readonly location: ReportLocation }
  | { readonly kind: "failed" };

function useReportOptions() {
  const [format, setFormat] = useState<ReportFormatValue>("pdf");
  const [parts, setParts] = useState<ReadonlySet<ReportPart>>(new Set(REPORT_PARTS));
  const toggle = (part: ReportPart) => {
    setParts((current) => {
      const next = new Set(current);
      if (!next.delete(part)) next.add(part);
      return next;
    });
  };
  return { format, setFormat, parts, toggle };
}

/** Formato, secciones incluidas, dónde se guarda y «Exportar» con su resultado. */
export function useReportExport(sessionId: string) {
  const { reports } = useEngineServices();
  const plan = useEngineQuery(`report:${sessionId}`, () => reports.planReport(sessionId));
  const options = useReportOptions();
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });
  const exportReport = (document: ReportDocumentData) => {
    setStatus({ kind: "exporting" });
    reports.exportReport(sessionId, options.format, document).then(
      (location) => {
        setStatus({ kind: "saved", location });
      },
      () => {
        setStatus({ kind: "failed" });
      },
    );
  };
  const open = (fileName: string) => reports.openReport(sessionId, fileName);
  return { plan: plan.state, ...options, status, exportReport, open };
}

export type ReportExport = ReturnType<typeof useReportExport>;
