import { useState } from "react";

import { useI18n, type I18n } from "../../i18n/i18nContext";
import type { ComparisonResult } from "../../services/engine/comparisonTypes";
import type {
  ReportFormatValue,
  ReportGateway,
  ReportLocation,
} from "../../services/engine/reportTypes";
import { useEngineServices } from "../engine/EngineServicesContext";
import type { ExportOutcome, ExportStatus } from "../report/useReportExport";
import { comparisonReportDocument } from "./comparisonReport";

export interface ComparisonReportExport extends ExportOutcome {
  readonly export: (format: ReportFormatValue) => void;
}

interface ExportJob {
  readonly gateway: ReportGateway;
  readonly comparison: ComparisonResult;
  readonly format: ReportFormatValue;
  readonly texts: Pick<I18n, "t" | "tPlural" | "format" | "locale">;
}

/** Pide la versión del motor para el pie, redacta el informe con los datos reales y lo guarda. */
async function exportComparison({
  gateway,
  comparison,
  format,
  texts,
}: ExportJob): Promise<ReportLocation> {
  const plan = await gateway.planReport(comparison.id);
  const request = { comparison, version: plan.version, generatedAt: new Date() };
  return gateway.exportReport(comparison.id, format, comparisonReportDocument(request, texts));
}

/** El estado de una exportación: preparando, guardada (dónde) o fallida. */
function useExportStatus() {
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });
  const run = (saving: Promise<ReportLocation>) => {
    setStatus({ kind: "exporting" });
    saving.then(
      (location) => {
        setStatus({ kind: "saved", location });
      },
      () => {
        setStatus({ kind: "failed" });
      },
    );
  };
  return { status, run };
}

/** «Exportar informe» de una comparación, con su estado para mostrar dónde quedó o por qué falló. */
export function useComparisonReportExport(comparison: ComparisonResult): ComparisonReportExport {
  const { comparisonReports: gateway } = useEngineServices();
  const { t, tPlural, format: formats, locale } = useI18n();
  const { status, run } = useExportStatus();
  const texts = { t, tPlural, format: formats, locale };
  return {
    status,
    export: (format) => {
      run(exportComparison({ gateway, comparison, format, texts }));
    },
    open: (fileName) => gateway.openReport(comparison.id, fileName),
  };
}
