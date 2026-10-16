import type { EngineStatusView } from "../../components/molecules/EngineStatusIndicator";
import { useReview } from "../review/reviewContext";
import { useEngineStatus } from "./useEngineStatus";

/** Estado del motor en la barra superior: mientras lee una revisión, cuántos archivos lleva. */
export function useEngineStatusView(): EngineStatusView {
  const status = useEngineStatus();
  const { readingProgress } = useReview();
  return readingProgress ? { kind: "analyzing", ...readingProgress } : { kind: status };
}
