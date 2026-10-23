import { EngineUnavailableMessage } from "../features/engine/EngineUnavailableMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import { useReview } from "../features/review/reviewContext";
import { useSendReview } from "../features/sending/sendContext";
import { SendStart } from "../features/sending/SendStart";
import { SendWorkspace } from "../features/sending/SendWorkspace";
import { useStartSendReview } from "../features/sending/useStartSendReview";
import styles from "./Page.module.css";

/**
 * Revisar antes de enviar: vacía hasta que el usuario elige el borrador; después, solo lo que
 * encontró el motor frente al expediente abierto. ARGUS no envía el correo.
 */
export function SendPage() {
  const { review } = useSendReview();
  const { review: caseFile } = useReview();
  const start = useStartSendReview();
  const engineStatus = useEngineStatus();
  if (review) return <SendWorkspace key={review.id} review={review} />;
  return (
    <div className={styles.page}>
      {engineStatus === "stopped" && <EngineUnavailableMessage />}
      <SendStart status={start.status} hasCaseFile={caseFile !== null} onFile={start.start} />
    </div>
  );
}
