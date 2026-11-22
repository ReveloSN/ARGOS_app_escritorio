import { useRef } from "react";

import { Icon } from "../../components/atoms/Icon";
import { SegmentedControl } from "../../components/molecules/SegmentedControl";
import { useModalFocus } from "../../components/useModalFocus";
import { useI18n } from "../../i18n/i18nContext";
import { useShortcuts } from "../keyboard/useShortcuts";
import { useAccount, type GateState } from "./accountContext";
import styles from "./AccountGate.module.css";
import { GateBody } from "./GateBody";
import { GateIdentity } from "./GateIdentity";
import type { GateView } from "./gateTypes";
import { useGateForm } from "./useGateForm";
import { useGateNavigation } from "./useGateNavigation";
import { useKeepFocusInside } from "./useKeepFocusInside";
import { useIsGateShown } from "./useIsGateShown";
import { GATE_MARK } from "./useOtherModalOpen";

const TITLE_ID = "account-gate-title";
const TAB_VIEWS = ["signIn", "signUp"] as const;

/** La puerta de la cuenta: se abre al arrancar sin sesión o desde Ajustes; Esc la cierra sin elegir. */
export function AccountGate() {
  const { gate } = useAccount();
  const isShown = useIsGateShown();
  return gate && isShown ? <GateDialog gate={gate} /> : null;
}

/** Si quien abrió la puerta ya no está (el arranque), el foco vuelve al primer control de la aplicación. */
function focusLiveShellElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>("nav button, main button, main a");
}

function GateDialog({ gate }: { readonly gate: GateState }) {
  const { t } = useI18n();
  const { state, closeGate } = useAccount();
  const dialog = useRef<HTMLDivElement>(null);
  const trapTab = useModalFocus(dialog, focusLiveShellElement);
  const form = useGateForm();
  const navigation = useGateNavigation(form, gate.email ?? state?.email ?? "");
  const { view } = navigation;
  useKeepFocusInside(dialog, form.isBusy);
  useShortcuts([{ key: "Escape", isActiveWhileTyping: true, run: closeGate }], true, "dialog");
  return (
    <div className={styles.screen}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        {...{ [GATE_MARK]: "" }}
        className={styles.layout}
        onKeyDown={trapTab}
      >
        <GateIdentity form={form} />
        <div className={styles.panel}>
          <div className={styles.topline}>
            <kbd className={styles.kbd}>{t("account.escape")}</kbd>
            <button type="button" className={styles.close} onClick={closeGate}>
              <Icon name="close" size="md" />
              {t("account.close")}
            </button>
          </div>
          {(view === "signIn" || view === "signUp") && (
            <SegmentedControl
              label={t("account.tabs.label")}
              options={TAB_VIEWS.map((id) => ({ value: id, label: t(`account.tabs.${id}`) }))}
              value={view}
              onChange={(next) => {
                navigation.switchTab(next as GateView);
              }}
            />
          )}
          <h2 id={TITLE_ID} className={styles.title}>
            {t(`account.views.${view}`)}
          </h2>
          <GateBody {...navigation} form={form} />
        </div>
      </div>
    </div>
  );
}
