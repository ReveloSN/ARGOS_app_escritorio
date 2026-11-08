import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import type {
  FactGateway,
  FactInput,
  FactResult,
  FactsResult,
} from "../../services/engine/factTypes";
import type { Translate } from "../alerts/alertPresentation";
import { useTimedNotice, type TimedNotice } from "../alerts/useTimedNotice";
import { useEngineServices } from "../engine/EngineServicesContext";
import { failureOf, type FactChange, type FactFailure } from "./factFailure";
import { settleIn, useFactTurns, type FactTurn } from "./factTurns";

export type { FactFailure } from "./factFailure";

export interface FactChanges {
  /** `onSaved` solo corre si se guardó: así un formulario no se cierra sobre un error. */
  readonly add: (input: FactInput, onSaved?: () => void) => void;
  readonly edit: (fact: FactResult, value: string) => void;
  readonly retire: (fact: FactResult) => void;
  readonly restore: (fact: FactResult) => void;
  readonly undo: () => void;
  readonly failure: FactFailure | null;
  readonly dismiss: () => void;
  readonly notice: TimedNotice;
}

function savedWith(onSaved: (result: FactsResult) => void, notice: TimedNotice) {
  return (result: FactsResult, change: FactChange) => {
    onSaved(result);
    notice.show(change.message, true);
  };
}

function undoneWith(onSaved: (result: FactsResult) => void, notice: TimedNotice, t: Translate) {
  return (result: FactsResult) => {
    onSaved(result);
    notice.show(t("facts.notice.undone"));
  };
}

interface RunnerDeps {
  readonly onSaved: (result: FactsResult) => void;
  readonly notice: TimedNotice;
  readonly setFailure: (failure: FactFailure | null) => void;
  readonly rerun: (change: FactChange) => void;
}

/** Envía un cambio; si no se guardó, deja el fallo con «Reintentar» (que lo vuelve a enviar). */
function sendChange(change: FactChange, turn: FactTurn, deps: RunnerDeps) {
  const retry = () => {
    deps.rerun(change);
  };
  settleIn(change.send(), turn, {
    onSucceeded: change.onSaved,
    onResult: (result) => {
      savedWith(deps.onSaved, deps.notice)(result, change);
    },
    onError: (error) => {
      deps.setFailure(failureOf(error, change, retry));
    },
  });
}

function useFactRunner(
  onSaved: (result: FactsResult) => void,
  notice: TimedNotice,
  begin: () => FactTurn,
) {
  const [failure, setFailure] = useState<FactFailure | null>(null);
  const run = (change: FactChange) => {
    setFailure(null);
    sendChange(change, begin(), { onSaved, notice, setFailure, rerun: run });
  };
  const dismiss = () => {
    setFailure(null);
  };
  return { run, failure, dismiss };
}

interface ActionContext {
  readonly sessionId: string;
  readonly gateway: FactGateway;
  readonly run: (change: FactChange) => void;
  readonly t: Translate;
}

function valueActions({ sessionId, gateway, run, t }: ActionContext) {
  const message = (label: string, value: string) => t("facts.notice.saved", { label, value });
  return {
    add: (input: FactInput, onSaved?: () => void) => {
      const send = () => gateway.addFact(sessionId, input);
      run({
        send,
        label: input.label,
        message: message(input.label, input.value),
        value: input.value,
        ...(onSaved ? { onSaved } : {}),
      });
    },
    edit: (fact: FactResult, value: string) => {
      const send = () => gateway.editFact(sessionId, fact.id, value);
      run({ send, label: fact.label, message: message(fact.label, value), value });
    },
  };
}

function stateActions({ sessionId, gateway, run, t }: ActionContext) {
  return {
    retire: (fact: FactResult) => {
      const send = () => gateway.retireFact(sessionId, fact.id);
      run({ send, label: fact.label, message: t("facts.notice.retired", { label: fact.label }) });
    },
    restore: (fact: FactResult) => {
      const send = () => gateway.restoreFact(sessionId, fact.id);
      run({ send, label: fact.label, message: t("facts.notice.restored", { label: fact.label }) });
    },
  };
}

/** Agregar, editar, retirar y restaurar datos con confirmación y «Deshacer» (mockup Expediente). */
export function useFactChanges(
  sessionId: string,
  onSaved: (result: FactsResult) => void,
): FactChanges {
  const { t } = useI18n();
  const { facts: gateway } = useEngineServices();
  const notice = useTimedNotice();
  const begin = useFactTurns(sessionId);
  const { run, failure, dismiss } = useFactRunner(onSaved, notice, begin);
  const context = { sessionId, gateway, run, t };
  const undo = () => {
    settleIn(gateway.undoFact(sessionId), begin(), {
      onResult: undoneWith(onSaved, notice, t),
      onError: () => {
        notice.show(t("decisionNotice.undoFailed"));
      },
    });
  };
  return { ...valueActions(context), ...stateActions(context), undo, failure, dismiss, notice };
}
