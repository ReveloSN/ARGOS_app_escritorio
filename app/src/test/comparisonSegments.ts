/** Los textos de las dos versiones del contrato de prueba, con la forma que entrega el motor. */

import type { SegmentResult, WordEditResult } from "../services/engine/comparisonTypes";

export function segment(document: string, position: number, text: string): SegmentResult {
  return {
    position,
    kind: "paragraph",
    text,
    document,
    location: { kind: "paragraph", paragraph: position },
    span: { start: 0, end: text.length },
  };
}

export function replaced(first: [number, number, string], second: [number, number, string]) {
  const edit: WordEditResult = {
    kind: "replaced",
    first: { start: first[0], end: first[1] },
    second: { start: second[0], end: second[1] },
    firstText: first[2],
    secondText: second[2],
    characters: [],
  };
  return edit;
}

export const V2 = [
  segment("Contrato_v2.docx", 1, "Contrato No. 4857"),
  segment("Contrato_v2.docx", 2, "El arrendatario podrá ceder el contrato."),
  segment("Contrato_v2.docx", 3, "Seguros a cargo del arrendatario."),
];
export const V3 = [
  segment("Contrato_v3.docx", 1, "Contrato No. 4587"),
  segment("Contrato_v3.docx", 2, "Seguros a cargo del arrendatario."),
  segment("Contrato_v3.docx", 3, "El arrendatario no podrá ceder el contrato."),
  segment("Contrato_v3.docx", 4, "Cláusula penal por $ 5.000.000."),
];
