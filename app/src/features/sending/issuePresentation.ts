import type { EyeState } from "../../components/atoms/eyeShapes";
import type { I18n } from "../../i18n/i18nContext";
import type { DecisionKindValue } from "../../services/engine/reviewTypes";
import type { SendIssueResult, SendReviewResult } from "../../services/engine/sendTypes";
import { decisionOf, pendingHighCount, pendingIssues, unfixedErrorCount } from "./sendState";

type Texts = Pick<I18n, "t" | "tPlural">;

/** Un problema del borrador ya traducido: título, explicación y la etiqueta de su corrección. */
export interface IssueTexts {
  readonly title: string;
  readonly body: string;
  readonly fixLabel: string;
  readonly status: string;
}

function suggestionNote(issue: SendIssueResult, { t }: Texts): string {
  const suggested = issue.params.suggested ?? "";
  return suggested ? ` ${t("sending.issue.inCaseFile", { name: suggested })}` : "";
}

function issueBody(issue: SendIssueResult, texts: Texts): string {
  const { t } = texts;
  const params = { ...issue.params, marked: issue.markedText };
  return `${t(`sending.issue.${issue.kind}.body`, params)}${suggestionNote(issue, texts)}`;
}

function fixLabel(issue: SendIssueResult, { t }: Texts): string {
  if (!issue.fix) return t("sending.actions.markError");
  return t(`sending.fix.${issue.fix.kind}`, { ...issue.params });
}

function statusLabel(
  issue: SendIssueResult,
  decision: DecisionKindValue | undefined,
  { t }: Texts,
) {
  if (decision === undefined) return "";
  if (decision === "error")
    return issue.fix ? t(`sending.fixed.${issue.fix.kind}`) : t("sending.status.error");
  return t(`sending.status.${decision}`);
}

export function issueTexts(
  review: SendReviewResult,
  issue: SendIssueResult,
  texts: Texts,
): IssueTexts {
  return {
    title: texts.t(`sending.issue.${issue.kind}.title`, {
      ...issue.params,
      marked: issue.markedText,
    }),
    body: issueBody(issue, texts),
    fixLabel: fixLabel(issue, texts),
    status: statusLabel(issue, decisionOf(review, issue), texts),
  };
}

/** Lo que queda por resolver: lo pendiente y lo marcado como error que ARGUS no pudo corregir. */
interface Remaining {
  readonly pending: number;
  readonly high: number;
  readonly unfixed: number;
}

function headline(remaining: Remaining, { t, tPlural }: Texts): string {
  if (remaining.pending) {
    return tPlural({ key: "sending.summary.problems", count: remaining.pending });
  }
  if (remaining.unfixed) {
    return tPlural({ key: "sending.summary.unfixed", count: remaining.unfixed });
  }
  return t("sending.summary.ready");
}

function footer(remaining: Remaining, { t, tPlural }: Texts): string {
  if (remaining.high) return tPlural({ key: "sending.footer.high", count: remaining.high });
  if (remaining.pending) {
    return tPlural({ key: "sending.footer.pending", count: remaining.pending });
  }
  if (remaining.unfixed) {
    return tPlural({ key: "sending.footer.unfixed", count: remaining.unfixed });
  }
  return t("sending.footer.none");
}

function subline(review: SendReviewResult, remaining: Remaining, { t }: Texts): string {
  if (remaining.pending) return t("sending.summary.review");
  if (remaining.unfixed) return t("sending.summary.unfixedReview");
  return review.sessionId ? t("sending.summary.readyCaseFile") : t("sending.summary.readyAlone");
}

function eyeState({ pending, high, unfixed }: Remaining): EyeState {
  if (high) return "alert";
  return pending || unfixed ? "doubt" : "success";
}

/** Encabezado del panel y pie de la pantalla, según lo que queda por resolver (mockup). */
export function summaryTexts(review: SendReviewResult, texts: Texts) {
  const remaining: Remaining = {
    pending: pendingIssues(review).length,
    high: pendingHighCount(review),
    unfixed: unfixedErrorCount(review),
  };
  return {
    headline: headline(remaining, texts),
    subline: subline(review, remaining, texts),
    footer: footer(remaining, texts),
    isBlocking: remaining.high > 0,
    eye: eyeState(remaining),
  };
}
