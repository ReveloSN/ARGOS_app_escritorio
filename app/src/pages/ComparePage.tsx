import { RecentComparisons } from "../features/session/RecentComparisons";
import { snapshotOf } from "../features/session/sessionSnapshot";
import { useSessionSnapshot } from "../features/session/useSessionSnapshot";
import { useReopenComparison } from "../features/comparison/useReopenComparison";
import { CompareStart } from "../features/comparison/CompareStart";
import { useComparison } from "../features/comparison/comparisonContext";
import { ComparisonWorkspace } from "../features/comparison/ComparisonWorkspace";
import { SessionDocumentsPicker } from "../features/comparison/SessionDocumentsPicker";
import { useStartComparison } from "../features/comparison/useStartComparison";
import { EngineUnavailableMessage } from "../features/engine/EngineUnavailableMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import styles from "./Page.module.css";

// Con menos de dos archivos leídos en el expediente no hay nada que comparar entre sí.
const MIN_SESSION_DOCUMENTS = 2;

/**
 * Comparar documentos: vacía hasta que el usuario elige los archivos; después, solo datos
 * reales del motor (versiones, inconsistencias y matriz).
 */
export function ComparePage() {
  const { comparison, recent } = useComparison();
  const reopen = useReopenComparison();
  const start = useStartComparison();
  const session = useSessionSnapshot().review;
  const engineStatus = useEngineStatus();
  if (comparison) {
    // La clave reinicia la vista (pestaña, selección, filtros) con cada comparación nueva.
    return <ComparisonWorkspace key={comparison.id} comparison={comparison} />;
  }
  return (
    <div className={styles.page}>
      {engineStatus === "stopped" && <EngineUnavailableMessage />}
      <CompareStart status={start.status} onFiles={start.start} />
      {session &&
        session.readableDocuments.length >= MIN_SESSION_DOCUMENTS &&
        start.status.kind === "idle" && (
          <SessionDocumentsPicker
            documents={session.readableDocuments}
            onCompare={(documents) => {
              start.startFromSession(session.id, documents);
            }}
          />
        )}
      <RecentComparisons comparisons={snapshotOf(null, recent).comparisons} onOpen={reopen} />
    </div>
  );
}
