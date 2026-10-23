import { useState } from "react";

import { EngineRejectedError } from "../../services/engine/engineHttp";
import { useEngineServices } from "../engine/EngineServicesContext";
import { useReview } from "../review/reviewContext";
import { useSendReview } from "./sendContext";

// El motor responde así cuando lo elegido no es un correo o no se puede leer.
const NOT_A_DRAFT = new Set(["not_a_draft_email", "unreadable_draft"]);

export type SendStartStatus =
  | { readonly kind: "idle" }
  | { readonly kind: "running"; readonly fileName: string }
  | { readonly kind: "failed"; readonly isNotADraft: boolean };

function isNotADraft(error: unknown): boolean {
  return error instanceof EngineRejectedError && NOT_A_DRAFT.has(error.detail);
}

/** «Elegir borrador»: revisa el correo frente al expediente abierto, si hay uno. */
export function useStartSendReview() {
  const { sending } = useEngineServices();
  const { review: caseFile } = useReview();
  const { showReview } = useSendReview();
  const [status, setStatus] = useState<SendStartStatus>({ kind: "idle" });
  const start = (file: File) => {
    setStatus({ kind: "running", fileName: file.name });
    const sessionId = caseFile?.session.id ?? null;
    sending.reviewDraft({ file, sessionId }).then(showReview, (error: unknown) => {
      setStatus({ kind: "failed", isNotADraft: isNotADraft(error) });
    });
  };
  return { status, start };
}
