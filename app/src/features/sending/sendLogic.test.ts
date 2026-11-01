import { describe, expect, it } from "vitest";

import { MESSAGES_BY_LOCALE } from "../../i18n/messages";
import {
  translate,
  translatePlural,
  type TranslationKey,
  type TranslationParams,
} from "../../i18n/translate";
import { decided, sendReview } from "../../test/sendFakes";
import { markRuns, paragraphsOf } from "./draftMarks";
import { summaryTexts } from "./issuePresentation";
import { correctedAttachments, correctedRecipients, pendingHighCount } from "./sendState";

const messages = MESSAGES_BY_LOCALE.es;
const I18N_ES = {
  t: (key: TranslationKey, params?: TranslationParams) => translate(messages, key, params),
  tPlural: (request: Parameters<typeof translatePlural>[2]) =>
    translatePlural(messages, "es", request),
};

describe("Revisar antes de enviar", () => {
  it("marca cada problema en su primera aparición dentro del texto", () => {
    const mark = { text: "informe de junio", number: 1, risk: "high" as const };

    expect(markRuns("Le comparto el informe de junio.", [mark])).toEqual([
      { kind: "text", text: "Le comparto el " },
      { kind: "mark", text: "informe de junio", mark },
      { kind: "text", text: "." },
    ]);
    expect(markRuns("Sin marcas", [mark])).toEqual([{ kind: "text", text: "Sin marcas" }]);
  });

  it("divide el cuerpo en párrafos sin líneas vacías", () => {
    expect(paragraphsOf("Hola:\n\nTexto\n")).toEqual(["Hola:", "Texto"]);
  });

  it("muestra el borrador como quedará con las correcciones aceptadas", () => {
    const review = sendReview([decided(1, "error"), decided(2, "error")]);

    expect(correctedAttachments(review).map((item) => [item.name, item.isAdded])).toEqual([
      ["Contrato_4857_v3.docx", false],
      ["Informe_gestion_junio_2026.pdf", true],
    ]);
    expect(correctedRecipients(review, review.draft.cc)).toEqual([]);
    expect(pendingHighCount(review)).toBe(0);
  });

  it("«Es correcto» o «Ignorar» no cambian el borrador", () => {
    const review = sendReview([decided(1, "correct"), decided(2, "ignored")]);

    expect(correctedAttachments(review)).toHaveLength(2);
    expect(correctedRecipients(review, review.draft.cc)).toEqual(review.draft.cc);
  });

  it("(regresión) un problema marcado como error y sin corrección no deja decir «listo»", () => {
    const base = sendReview([decided(1, "error"), decided(2, "error")]);
    const withoutFix = {
      ...base,
      issues: base.issues.map((issue) => (issue.number === 1 ? { ...issue, fix: null } : issue)),
    };

    expect(summaryTexts(base, I18N_ES).headline).toBe("El borrador está listo");
    const summary = summaryTexts(withoutFix, I18N_ES);
    expect(summary.headline).toBe("1 problema marcado como error sin corregir");
    expect(summary.footer).toContain("no puede corregir por usted");
    expect(summary.eye).toBe("doubt");
  });
});
