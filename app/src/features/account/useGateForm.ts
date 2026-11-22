import { useRef, useState } from "react";

import { problemOf, type AccountProblem } from "./accountProblem";

export interface GateFormState {
  readonly isBusy: boolean;
  readonly problem: AccountProblem | null;
  /** Una petición a la vez: mientras hay una en curso, otra no arranca. */
  readonly run: (action: () => Promise<void>) => void;
  readonly retry: () => void;
  readonly dismiss: () => void;
}

interface Flight {
  isBusy: boolean;
  last: (() => Promise<void>) | null;
}

interface Reporting {
  readonly setBusy: (isBusy: boolean) => void;
  readonly setProblem: (problem: AccountProblem | null) => void;
}

function launch(action: () => Promise<void>, flight: Flight, reporting: Reporting): void {
  if (flight.isBusy) return;
  flight.isBusy = true;
  flight.last = action;
  reporting.setBusy(true);
  reporting.setProblem(null);
  action()
    .catch((error: unknown) => {
      reporting.setProblem(problemOf(error));
    })
    .finally(() => {
      flight.isBusy = false;
      reporting.setBusy(false);
    });
}

/** La petición en curso de la puerta y su fallo; la comparten el formulario y «Continuar sin cuenta». */
export function useGateForm(): GateFormState {
  const [isBusy, setBusy] = useState(false);
  const [problem, setProblem] = useState<AccountProblem | null>(null);
  const flight = useRef<Flight>({ isBusy: false, last: null });
  const run = (action: () => Promise<void>) => {
    launch(action, flight.current, { setBusy, setProblem });
  };
  const retry = () => {
    if (flight.current.last) run(flight.current.last);
  };
  const dismiss = () => {
    setProblem(null);
  };
  return { isBusy, problem, run, retry, dismiss };
}
