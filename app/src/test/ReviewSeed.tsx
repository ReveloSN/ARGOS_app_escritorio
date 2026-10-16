import { useEffect } from "react";

import { useReview } from "../features/review/reviewContext";
import type { ReviewResult } from "../services/engine/reviewTypes";

/** Carga una revisión como si el motor la acabara de devolver (para probar Resultados). */
export function ReviewSeed({ review }: { readonly review: ReviewResult }) {
  const { showReview } = useReview();
  useEffect(() => {
    showReview(review);
  }, [review, showReview]);
  return null;
}
