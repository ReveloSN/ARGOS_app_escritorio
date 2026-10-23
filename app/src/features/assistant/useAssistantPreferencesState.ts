import { useEffect, useState } from "react";

import { readChoice, type PreferenceStorage } from "../../services/preferences/preferenceStorage";
import type { AssistantPreferences } from "./assistantContext";

/** Un ajuste de dos valores guardado como texto: el primero es el predeterminado. */
interface StoredFlag {
  readonly key: string;
  readonly values: readonly [off: string, on: string];
}

const ASSISTANT_HIDDEN: StoredFlag = { key: "argus.assistant", values: ["shown", "hidden"] };
const MOTION_REDUCED: StoredFlag = { key: "argus.motion", values: ["system", "reduced"] };
const ONBOARDING_KEY = "argus.onboarding";
const ONBOARDING_DONE = "done";

function useStoredFlag(storage: PreferenceStorage | undefined, flag: StoredFlag) {
  const [off, on] = flag.values;
  const [isOn, setIsOn] = useState(() => readChoice(storage, flag.key, flag.values) === on);
  const setFlag = (next: boolean) => {
    storage?.write(flag.key, next ? on : off);
    setIsOn(next);
  };
  return [isOn, setFlag] as const;
}

/**
 * Los primeros pasos se abren solos solo si hay dónde recordar que ya se vieron; si no,
 * aparecerían en cada arranque.
 */
function useOnboarding(storage: PreferenceStorage | undefined) {
  const [isOpen, setIsOpen] = useState(
    () => storage !== undefined && storage.read(ONBOARDING_KEY) !== ONBOARDING_DONE,
  );
  const close = () => {
    storage?.write(ONBOARDING_KEY, ONBOARDING_DONE);
    setIsOpen(false);
  };
  const open = () => {
    setIsOpen(true);
  };
  return { isOpen, open, close };
}

/** «Reducir movimiento» se aplica como `data-motion` en el documento; los tokens hacen el resto. */
function useMotionAttribute(isReduced: boolean) {
  useEffect(() => {
    if (isReduced) document.documentElement.dataset.motion = "reduced";
    else delete document.documentElement.dataset.motion;
  }, [isReduced]);
}

export function useAssistantPreferencesState(
  storage: PreferenceStorage | undefined,
): AssistantPreferences {
  const [isHidden, setHidden] = useStoredFlag(storage, ASSISTANT_HIDDEN);
  const [isMotionReduced, setMotionReduced] = useStoredFlag(storage, MOTION_REDUCED);
  const onboarding = useOnboarding(storage);
  useMotionAttribute(isMotionReduced);
  return {
    isAssistantShown: !isHidden,
    setAssistantShown: (isShown) => {
      setHidden(!isShown);
    },
    isMotionReduced,
    setMotionReduced,
    isOnboardingOpen: onboarding.isOpen,
    openOnboarding: onboarding.open,
    closeOnboarding: onboarding.close,
  };
}
