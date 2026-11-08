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

const IDLE: ExportStatus = { kind: "idle" };

/**
 * El resultado de una exportación es de la sesión que la pidió: si entretanto se abrió otra, no
 * se muestra ahí (ni su «Abrir informe», que usaría el id de la sesión equivocada).
 */
function useSessionExportStatus(sessionId: string) {
  // Uno por sesión: lo que termina en A no borra lo que está en curso en B.
  const [bySession, setBySession] = useState<Readonly<Record<string, ExportStatus>>>({});
  const status = bySession[sessionId] ?? IDLE;
  const setFor = (owner: string) => (next: ExportStatus) => {
    setBySession((current) => ({ ...current, [owner]: next }));
  };
  return { status, setFor };
}

/** Formato, secciones incluidas, dónde se guarda y «Exportar» con su resultado. */
export function useReportExport(sessionId: string) {
  const { reports } = useEngineServices();
  const plan = useEngineQuery(`report:${sessionId}`, () => reports.planReport(sessionId));
  const options = useReportOptions();
  const { status, setFor } = useSessionExportStatus(sessionId);
  const exportReport = (document: ReportDocumentData) => {
    const setStatus = setFor(sessionId);
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

/** Lo que `ExportFeedback` necesita saber de una exportación, sea de una revisión o de una comparación. */
export interface ExportOutcome {
  readonly status: ExportStatus;
  readonly open: (fileName: string) => Promise<void>;
}
