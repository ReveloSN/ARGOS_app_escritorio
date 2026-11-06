import type { ReviewResult } from "../../services/engine/reviewTypes";

// Mientras corre este plazo la sesión ya no se ve, pero el motor aún no la borró: «Deshacer».
export const DELETION_UNDO_WINDOW_MS = 8000;

export interface DeletionQueueDeps {
  readonly deleteSession: (sessionId: string) => Promise<void>;
  readonly onChange: (pending: ReviewResult | null) => void;
  /** El motor no pudo borrarla: la sesión sigue guardada y hay que decírselo a la persona. */
  readonly onDeleteFailed: (review: ReviewResult) => void;
}

/** La sesión eliminada espera un plazo antes de que el motor la borre, para poder deshacerlo. */
export class DeletionQueue {
  private pending: ReviewResult | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly deps: DeletionQueueDeps) {}

  /** Aparta la sesión; si ya había otra pendiente, esa se borra en este momento. */
  schedule(review: ReviewResult): void {
    this.flush();
    this.pending = review;
    this.deps.onChange(review);
    this.timer = setTimeout(() => {
      this.flush();
    }, DELETION_UNDO_WINDOW_MS);
  }

  /** Devuelve la sesión apartada, o null si ya no había ninguna. */
  undo(): ReviewResult | null {
    clearTimeout(this.timer);
    const taken = this.pending;
    this.pending = null;
    this.deps.onChange(null);
    return taken;
  }

  /** Borra ya la sesión apartada. */
  flush(): void {
    const taken = this.undo();
    // Si el motor no responde, la sesión sigue guardada (el fallo seguro) y se avisa.
    if (!taken) return;
    this.deps.deleteSession(taken.session.id).catch(() => {
      this.deps.onDeleteFailed(taken);
    });
  }
}
