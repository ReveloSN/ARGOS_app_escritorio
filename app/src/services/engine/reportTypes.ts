/** Informe exportable (engine/argus/api/schemas/report.py): la interfaz lo redacta, el motor lo maqueta. */

export type ReportFormatValue = "pdf" | "docx";

export interface ReportCellData {
  readonly text: string;
  /** Debajo del valor: su origen (archivo y ubicación). */
  readonly detail?: string;
}

export interface ReportTableData {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly ReportCellData[])[];
}

export interface ReportMetricData {
  readonly value: string;
  readonly label: string;
}

export interface ReportSectionData {
  readonly heading: string;
  readonly paragraphs: readonly string[];
  readonly metrics: readonly ReportMetricData[];
  readonly table: ReportTableData | null;
}

export interface ReportDocumentData {
  readonly title: string;
  readonly subtitles: readonly string[];
  readonly brand: string;
  readonly sections: readonly ReportSectionData[];
  readonly footer: string;
  /** Lleva {page} y {total}: «Página {page} de {total}». */
  readonly pageLabel: string;
}

/** Dónde quedó (o quedará) el informe; `fileName` va sin extensión antes de exportar. */
export interface ReportLocation {
  readonly folder: string;
  readonly fileName: string;
}

export interface ReportPlan extends ReportLocation {
  readonly version: string;
}

/** Puerto de la interfaz para el informe; el cliente HTTP lo implementa. */
export interface ReportGateway {
  planReport(sessionId: string): Promise<ReportPlan>;
  exportReport(
    sessionId: string,
    format: ReportFormatValue,
    document: ReportDocumentData,
  ): Promise<ReportLocation>;
  openReport(sessionId: string, fileName: string): Promise<void>;
}
