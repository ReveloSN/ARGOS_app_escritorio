import { ArgusEye, type EyeSize } from "../../components/atoms/ArgusEye";
import type { EyeState } from "../../components/atoms/eyeShapes";
import { useAssistantPreferences } from "./assistantContext";

interface AssistantEyeProps {
  readonly state: EyeState;
  readonly size?: EyeSize;
  readonly label?: string | undefined;
}

/** El ojo como asistente de IA: Ajustes › Mostrar asistente lo oculta (el logo no). */
export function AssistantEye(props: AssistantEyeProps) {
  const { isAssistantShown } = useAssistantPreferences();
  return isAssistantShown ? <ArgusEye {...props} /> : null;
}
