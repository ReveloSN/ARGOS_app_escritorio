import type { I18n } from "../../i18n/i18nContext";
import type { PluralKey, TranslationKey } from "../../i18n/translate";
import type { DocumentReadResult, ReadMethodValue } from "../../services/engine/reviewTypes";
import { fileTypeLabel } from "./fileTypeLabel";

export interface UnreadableKeys {
  readonly what: TranslationKey;
  readonly why: TranslationKey;
  readonly todo: TranslationKey;
}

const READ_STATUS: Readonly<Record<ReadMethodValue, PluralKey>> = {
  text: "newReview.readStatus",
  local_ocr: "newReview.readStatusLocalOcr",
  cloud_ocr: "newReview.readStatusCloudOcr",
};
const PDF_LABEL = "PDF";

/** Un PDF escaneado que todavía no se intentó con OCR: ofrece «Activar OCR». */
export function canActivateOcr(document: DocumentReadResult): boolean {
  const isScanned = document.reason === "no_text" && document.method === "text";
  return isScanned && fileTypeLabel(document.name) === PDF_LABEL;
}

/** «Leído · 3 fragmentos», «Leído con OCR · …» o «Leído con Document AI · …». */
export function readStatusText(document: DocumentReadResult, i18n: Pick<I18n, "tPlural">): string {
  return i18n.tPlural({ key: READ_STATUS[document.method], count: document.fragmentCount });
}

const OCR_WITHOUT_TEXT: UnreadableKeys = {
  what: "unreadable.ocr_no_text.what",
  why: "unreadable.ocr_no_text.why",
  todo: "unreadable.ocr_no_text.todo",
};
// «Imagen escaneada» solo describe a un PDF: un texto o un Word vacío simplemente no tiene texto.
const EMPTY_FILE: UnreadableKeys = {
  what: "unreadable.no_text.what",
  why: "unreadable.no_text.whyEmpty",
  todo: "unreadable.no_text.todoEmpty",
};

/** Los textos de los casos de «sin texto» que no son un PDF escaneado sin OCR. */
function noTextSpecialCase(document: DocumentReadResult): UnreadableKeys | undefined {
  if (document.reason !== "no_text") return undefined;
  if (document.method !== "text") return OCR_WITHOUT_TEXT;
  return fileTypeLabel(document.name) === PDF_LABEL ? undefined : EMPTY_FILE;
}

/** El mensaje de 3 partes de un archivo que no se leyó; el OCR sin texto y el archivo vacío tienen el suyo. */
export function unreadableKeys(document: DocumentReadResult): UnreadableKeys | undefined {
  if (!document.reason) return undefined;
  const special = noTextSpecialCase(document);
  if (special) return special;
  const reason = document.reason;
  const todo: TranslationKey = canActivateOcr(document)
    ? "unreadable.no_text.todoOcr"
    : `unreadable.${reason}.todo`;
  return { what: `unreadable.${reason}.what`, why: `unreadable.${reason}.why`, todo };
}
