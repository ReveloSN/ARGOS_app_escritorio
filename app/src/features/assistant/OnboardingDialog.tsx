import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { ReticleMotif } from "../../components/atoms/ReticleMotif";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import { useShortcuts } from "../keyboard/useShortcuts";
import { useAssistantPreferences } from "./assistantContext";
import { AssistantEye } from "./AssistantEye";
import styles from "./Onboarding.module.css";
import { ONBOARDING_STEPS, type OnboardingStep } from "./onboardingSteps";

const TITLE_ID = "onboarding-title";

function StepDots({ current }: { readonly current: number }) {
  const { t } = useI18n();
  return (
    <div role="list" aria-label={t("assistant.onboarding.progress")} className={styles.dots}>
      {ONBOARDING_STEPS.map((step, index) => (
        <span
          key={step.title}
          role="listitem"
          aria-label={t(
            index === current ? "assistant.onboarding.dotCurrent" : "assistant.onboarding.dot",
            { number: index + 1 },
          )}
          className={joinClassNames(
            styles.dot,
            index <= current && styles.dotDone,
            index === current && styles.dotCurrent,
          )}
        />
      ))}
    </div>
  );
}

function StepContent({ step }: { readonly step: OnboardingStep }) {
  const { t } = useI18n();
  return (
    <div className={styles.body}>
      <div className={styles.figure}>
        <ReticleMotif size="sm" className={styles.reticle} />
        <AssistantEye state={step.eye} size="lg" />
      </div>
      <div className={styles.copy}>
        <p className={styles.bubble}>
          <span className={styles.bubbleName}>{t("assistant.onboarding.speaker")}</span>
          {t(step.say)}
        </p>
        <h2 id={TITLE_ID} className={styles.title}>
          {t(step.title)}
        </h2>
        <p className={styles.text}>{t(step.body)}</p>
        <ul className={styles.points}>
          {step.points.map((point) => (
            <li key={point}>
              <Icon name="check" size="sm" className={styles.check} />
              {t(point)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Los primeros pasos, solo mientras están abiertos (la primera vez o desde Ajustes). */
export function OnboardingGate() {
  const { isOnboardingOpen } = useAssistantPreferences();
  return isOnboardingOpen ? <OnboardingDialog /> : null;
}

/** Primeros pasos: tres pantallas con el asistente; se omiten con Esc y avanzan con Enter. */
function OnboardingDialog() {
  const { t } = useI18n();
  const { closeOnboarding } = useAssistantPreferences();
  const [current, setCurrent] = useState(0);
  const step = ONBOARDING_STEPS[current] ?? ONBOARDING_STEPS[0];
  const isLast = current === ONBOARDING_STEPS.length - 1;
  useShortcuts([{ key: "Escape", isActiveWhileTyping: true, run: closeOnboarding }]);
  if (!step) return null;
  const next = () => {
    if (isLast) closeOnboarding();
    else setCurrent(current + 1);
  };
  return (
    <div className={styles.backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} className={styles.dialog}>
        <div className={styles.header}>
          <span>{t("assistant.onboarding.heading")}</span>
          <span className={styles.mono}>
            {t("assistant.onboarding.step", {
              current: current + 1,
              total: ONBOARDING_STEPS.length,
            })}
          </span>
          <span className={styles.grow} />
          <button type="button" className={styles.skip} onClick={closeOnboarding}>
            {t("assistant.onboarding.skip")}
          </button>
          <kbd className={styles.kbd}>{t("assistant.onboarding.escape")}</kbd>
        </div>
        <StepContent step={step} />
        <div className={styles.footer}>
          <StepDots current={current} />
          <span className={styles.grow} />
          {current > 0 && (
            <Button
              size="md"
              onClick={() => {
                setCurrent(current - 1);
              }}
            >
              {t("assistant.onboarding.back")}
            </Button>
          )}
          {/* El foco queda en el botón principal: Enter avanza sin un atajo aparte. */}
          <Button variant="primary" size="md" autoFocus shortcut={["Enter"]} onClick={next}>
            {t(isLast ? "assistant.onboarding.start" : "assistant.onboarding.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
