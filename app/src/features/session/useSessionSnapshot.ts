import { useMemo } from "react";

import { useComparison } from "../comparison/comparisonContext";
import { useReview } from "../review/reviewContext";
import { snapshotOf, type SessionSnapshot } from "./sessionSnapshot";

export function useSessionSnapshot(): SessionSnapshot {
  const { review } = useReview();
  const { comparison, recent } = useComparison();
  return useMemo(
    () => snapshotOf(review, comparison ? [comparison, ...recent] : recent),
    [review, comparison, recent],
  );
}
