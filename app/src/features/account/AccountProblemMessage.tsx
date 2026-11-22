import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import { problemCopy, type AccountProblem, type ProblemAction } from "./accountProblem";
import type { GateView } from "./gateTypes";

interface AccountProblemMessageProps {
  readonly problem: AccountProblem;
  readonly onAction: (action: ProblemAction) => void;
  /** La vista donde ocurrió: afina el mensaje. */
  readonly flow?: GateView;
  /** Hay otro botón principal a la vista (el del formulario). */
  readonly isActionSecondary?: boolean;
}

/** El fallo de una operación de la cuenta en 3 partes: qué pasó, por qué y qué hacer, con su botón. */
export function AccountProblemMessage(props: AccountProblemMessageProps) {
  const { t } = useI18n();
  const { problem, onAction, flow, isActionSecondary } = props;
  const { prefix, action } = problemCopy(problem, flow);
  return (
    <ErrorMessage
      tone="inline"
      isActionSecondary={isActionSecondary === true}
      what={t(`${prefix}.what`)}
      why={t(`${prefix}.why`)}
      todo={t(`${prefix}.todo`)}
      primaryAction={{
        label: t(`${prefix}.action`),
        onClick: () => {
          onAction(action);
        },
      }}
    />
  );
}
