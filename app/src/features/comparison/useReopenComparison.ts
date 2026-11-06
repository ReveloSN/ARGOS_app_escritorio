import { useComparison } from "./comparisonContext";

/** Vuelve a abrir una comparación cerrada, con las decisiones que ya tenía. */
export function useReopenComparison(): (comparisonId: string) => void {
  const { comparison, recent, showComparison } = useComparison();
  return (comparisonId) => {
    const closed = recent.find((item) => item.id === comparisonId);
    if (closed && closed.id !== comparison?.id) showComparison(closed);
  };
}
