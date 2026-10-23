import { useState } from "react";

import { useI18n } from "../../i18n/i18nContext";
import { EngineRejectedError } from "../../services/engine/engineHttp";
import type {
  FactGateway,
  FactInput,
  FactResult,
  FactsResult,
} from "../../services/engine/factTypes";
import type { Translate } from "../alerts/alertPresentation";
import { useTimedNotice, type TimedNotice } from "../alerts/useTimedNotice";
import { useEngineServices } from "../engine/EngineServicesContext";

// El motor responde así cuando el texto no contiene un valor del tipo elegido.
const UNRECOGNIZED_VALUE = "unrecognized_fact_value";

/** Un cambio que no se guardó, con lo necesario para explicarlo y reintentarlo. */
export interface FactFailure {
  readonly label: string;
  /** El valor escrito, si el motor no lo reconoció; null si el motor no respondió. */
  readonly unrecognizedValue: string | null;
  readonly retry: () => void;
}

export interface FactChanges {
  readonly add: (input: FactInput) => void;
  readonly edit: (fact: FactResult, value: string) => void;
  readonly retire: (fact: FactResult) => void;
  readonly restore: (fact: FactResult) => void;
  readonly undo: () => void;
  readonly failure: FactFailure | null;
  readonly dismiss: () => void;
  readonly notice: TimedNotice;
}

interface FactChange {
  readonly send: () => Promise<FactsResult>;
  readonly label: string;
  readonly message: string;
  readonly value?: string;
}

function unrecognizedValue(error: unknown, change: FactChange): string | null {
  const isUnrecognized =
    error instanceof EngineRejectedError && error.detail === UNRECOGNIZED_VALUE;
  return isUnrecognized ? (change.value ?? null) : null;
}

function failureOf(error: unknown, change: FactChange, retry: () => void): FactFailure {
  return { label: change.label, unrecognizedValue: unrecognizedValue(error, change), retry };
}

function useFactRunner(onSaved: (result: FactsResult) => void, notice: TimedNotice) {
  const [failure, setFailure] = useState<FactFailure | null>(null);
  const run = (change: FactChange) => {
    setFailure(null);
    const saved = (result: FactsResult) => {
      onSaved(result);
      notice.show(change.message, true);
    };
    const retry = () => {
      run(change);
    };
    change.send().then(saved, (error: unknown) => {
      setFailure(failureOf(error, change, retry));
    });
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
    add: (input: FactInput) => {
      const send = () => gateway.addFact(sessionId, input);
      run({
        send,
        label: input.label,
        message: message(input.label, input.value),
        value: input.value,
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
  const { run, failure, dismiss } = useFactRunner(onSaved, notice);
  const context = { sessionId, gateway, run, t };
  const undo = () => {
    const undone = (result: FactsResult) => {
      onSaved(result);
      notice.show(t("facts.notice.undone"));
    };
    gateway.undoFact(sessionId).then(undone, () => {
      notice.show(t("decisionNotice.undoFailed"));
    });
  };
  return { ...valueActions(context), ...stateActions(context), undo, failure, dismiss, notice };
}
