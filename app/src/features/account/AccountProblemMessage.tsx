import { ErrorMessage } from "../../components/molecules/ErrorMessage";
import { useI18n } from "../../i18n/i18nContext";
import { PROBLEM_ACTIONS, type AccountProblem, type ProblemAction } from "./accountProblem";

interface AccountProblemMessageProps {
  readonly problem: AccountProblem;
  readonly onAction: (action: ProblemAction) => void;
}

/** El fallo de una operación de la cuenta en 3 partes: qué pasó, por qué y qué hacer, con su botón. */
export function AccountProblemMessage({ problem, onAction }: AccountProblemMessageProps) {
  const { t } = useI18n();
  const prefix = `account.problems.${problem}` as const;
  return (
    <ErrorMessage
      tone="inline"
      what={t(`${prefix}.what`)}
      why={t(`${prefix}.why`)}
      todo={t(`${prefix}.todo`)}
      primaryAction={{
        label: t(`${prefix}.action`),
        onClick: () => {
          onAction(PROBLEM_ACTIONS[problem]);
        },
      }}
    />
  );
}
