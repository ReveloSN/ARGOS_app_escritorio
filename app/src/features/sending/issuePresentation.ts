import type { EyeState } from "../../components/atoms/eyeShapes";
import type { I18n } from "../../i18n/i18nContext";
import type { DecisionKindValue } from "../../services/engine/reviewTypes";
import type { SendIssueResult, SendReviewResult } from "../../services/engine/sendTypes";
import { decisionOf, pendingHighCount, pendingIssues } from "./sendState";

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

function headline(pending: number, { t, tPlural }: Texts): string {
  return pending
    ? tPlural({ key: "sending.summary.problems", count: pending })
    : t("sending.summary.ready");
}

function footer(pending: number, high: number, { t, tPlural }: Texts): string {
  if (high) return tPlural({ key: "sending.footer.high", count: high });
  if (pending) return tPlural({ key: "sending.footer.pending", count: pending });
  return t("sending.footer.none");
}

function subline(review: SendReviewResult, pending: number, { t }: Texts): string {
  if (pending) return t("sending.summary.review");
  return review.sessionId ? t("sending.summary.readyCaseFile") : t("sending.summary.readyAlone");
}

function eyeState(pending: number, high: number): EyeState {
  if (high) return "alert";
  return pending ? "doubt" : "success";
}

/** Encabezado del panel y pie de la pantalla, según lo que queda por resolver (mockup). */
export function summaryTexts(review: SendReviewResult, texts: Texts) {
  const pending = pendingIssues(review).length;
  const high = pendingHighCount(review);
  return {
    headline: headline(pending, texts),
    subline: subline(review, pending, texts),
    footer: footer(pending, high, texts),
    isBlocking: high > 0,
    eye: eyeState(pending, high),
  };
}
