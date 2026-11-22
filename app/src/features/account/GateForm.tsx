import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

import { Button } from "../../components/atoms/Button";
import { useI18n } from "../../i18n/i18nContext";
import type { TranslationKey } from "../../i18n/translate";
import type { ProblemAction } from "./accountProblem";
import { AccountProblemMessage } from "./AccountProblemMessage";
import styles from "./AccountGate.module.css";
import type { GateView, GateViewProps } from "./gateTypes";

const VIEW_BY_ACTION: Readonly<Partial<Record<ProblemAction, GateView>>> = {
  signIn: "signIn",
  verify: "verify",
  recover: "recover",
};

interface GateFormProps extends GateViewProps {
  readonly submitLabel: TranslationKey;
  readonly busyLabel: TranslationKey;
  /** Se llama con la vista ya validada; no se vuelve a llamar mientras haya una petición. */
  readonly onSubmit: () => void;
  readonly children: ReactNode;
}

/** Con el botón deshabilitado el foco no debe perderse en la ventana de atrás. */
function useKeepFocusWhileBusy(isBusy: boolean) {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const active = document.activeElement;
    const isLost = !active || active === document.body || (active as HTMLButtonElement).disabled;
    if (isBusy && isLost) form.current?.focus();
  }, [isBusy]);
  return form;
}

/** El cuerpo de una vista: campos, el fallo (una sola alerta) y el botón principal. Enter envía. */
export function GateForm(props: GateFormProps) {
  const { t } = useI18n();
  const { form, email, go, onSubmit, children } = props;
  const element = useKeepFocusWhileBusy(form.isBusy);
  const submitOnEnter = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    onSubmit();
  };
  const act = (action: ProblemAction) => {
    const view = VIEW_BY_ACTION[action];
    if (view) go(view, email);
    else if (action === "retry") form.retry();
    else form.dismiss();
  };
  return (
    <form
      ref={element}
      tabIndex={-1}
      noValidate
      aria-busy={form.isBusy}
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
      }}
      onKeyDown={submitOnEnter}
    >
      {children}
      {form.problem && <AccountProblemMessage problem={form.problem} onAction={act} />}
      <Button
        variant="primary"
        size="lg"
        disabled={form.isBusy}
        shortcut={["Enter"]}
        onClick={onSubmit}
      >
        {t(form.isBusy ? props.busyLabel : props.submitLabel)}
      </Button>
    </form>
  );
}
