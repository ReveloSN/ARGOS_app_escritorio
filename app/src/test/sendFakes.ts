import type { DecisionsResult } from "../services/engine/reviewTypes";
import type { SendIssueResult, SendReviewResult } from "../services/engine/sendTypes";

/** El borrador del mockup «Revisar antes de enviar», como lo devuelve el motor. */
const PERIOD_ISSUE: SendIssueResult = {
  number: 1,
  kind: "period_mismatch",
  risk: "high",
  part: "body",
  markedText: "informe de junio",
  params: {
    mentioned: "junio",
    attached: "Informe_gestion_mayo_2026.pdf",
    suggested: "Informe_gestion_junio_2026.pdf",
  },
  fix: {
    kind: "replace_attachment",
    target: "Informe_gestion_mayo_2026.pdf",
    replacement: "Informe_gestion_junio_2026.pdf",
  },
};

const RECIPIENT_ISSUE: SendIssueResult = {
  number: 2,
  kind: "foreign_recipient",
  risk: "medium",
  part: "cc",
  markedText: "contabilidad@inmobiliariaprisma.co",
  params: { recipient: "contabilidad@inmobiliariaprisma.co" },
  fix: { kind: "remove_recipient", target: "contabilidad@inmobiliariaprisma.co", replacement: "" },
};

export function sendReview(decisions: DecisionsResult["decisions"] = []): SendReviewResult {
  return {
    id: "r1",
    sessionId: "s-1",
    createdAt: "2026-10-23T10:00:00+00:00",
    draft: {
      fileName: "Remision_contrato_4857.eml",
      subject: "Contrato 4857 · informe de junio y póliza",
      to: ["jgomez@logisticaandina.com.co"],
      cc: ["contabilidad@inmobiliariaprisma.co"],
      body: "Buenos días, Juliana:\nLe comparto el informe de junio con el estado de la bodega.",
      attachments: [
        { name: "Informe_gestion_mayo_2026.pdf", size: 1_153_434 },
        { name: "Contrato_4857_v3.docx", size: 88_064 },
      ],
    },
    issues: [PERIOD_ISSUE, RECIPIENT_ISSUE],
    decisions: { decisions, canUndo: decisions.length > 0 },
  };
}

export function decided(number: number, kind: "error" | "correct" | "ignored") {
  return { alertNumber: number, kind, correctSide: null, decidedAt: "2026-10-23T10:01:00+00:00" };
}
