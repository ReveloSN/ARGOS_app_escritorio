import { CompareStart } from "../features/comparison/CompareStart";
import { useComparison } from "../features/comparison/comparisonContext";
import { ComparisonWorkspace } from "../features/comparison/ComparisonWorkspace";
import { useStartComparison } from "../features/comparison/useStartComparison";
import { EngineUnavailableMessage } from "../features/engine/EngineUnavailableMessage";
import { useEngineStatus } from "../features/engine/useEngineStatus";
import styles from "./Page.module.css";

/**
 * Comparar documentos: vacía hasta que el usuario elige los archivos; después, solo datos
 * reales del motor (versiones, inconsistencias y matriz).
 */
export function ComparePage() {
  const { comparison } = useComparison();
  const start = useStartComparison();
  const engineStatus = useEngineStatus();
  if (comparison) {
    // La clave reinicia la vista (pestaña, selección, filtros) con cada comparación nueva.
    return <ComparisonWorkspace key={comparison.id} comparison={comparison} />;
  }
  return (
    <div className={styles.page}>
      {engineStatus === "stopped" && <EngineUnavailableMessage />}
      <CompareStart status={start.status} onFiles={start.start} />
    </div>
  );
}
