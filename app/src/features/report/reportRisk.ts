import type { AlertResult, ReviewResult, RiskLevelValue } from "../../services/engine/reviewTypes";
import { decisionStateOf } from "../alerts/alertDecisions";
import type { ReportTexts } from "./reportSections";

function riskOf(review: ReviewResult, risk: RiskLevelValue): AlertResult[] {
  return review.alerts.filter((alert) => alert.risk === risk);
}

/** «Por riesgo: 2 altas, 1 media y 0 bajas.» y, si quedan, cuántas altas siguen sin decidir. */
export function riskParagraph(review: ReviewResult, { t, tPlural }: ReportTexts): string {
  const count = (risk: RiskLevelValue) => riskOf(review, risk).length;
  const byRisk = t("report.summary.byRisk", {
    high: tPlural({ key: "report.summary.riskHigh", count: count("high") }),
    medium: tPlural({ key: "report.summary.riskMedium", count: count("medium") }),
    low: tPlural({ key: "report.summary.riskLow", count: count("low") }),
  });
  const pendingHigh = riskOf(review, "high").filter(
    (alert) => decisionStateOf(review, alert.number) === "pending",
  ).length;
  if (pendingHigh === 0) return byRisk;
  return `${byRisk} ${tPlural({ key: "report.summary.pendingHigh", count: pendingHigh })}`;
}
