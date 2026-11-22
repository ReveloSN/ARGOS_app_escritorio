import { useRef, useState } from "react";

import { ArgusEye } from "../../components/atoms/ArgusEye";
import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { SegmentedControl } from "../../components/molecules/SegmentedControl";
import { useModalFocus } from "../../components/useModalFocus";
import { useI18n } from "../../i18n/i18nContext";
import { useShortcuts } from "../keyboard/useShortcuts";
import { useAccount, type GateState } from "./accountContext";
import styles from "./AccountGate.module.css";
import { GateBody } from "./GateBody";
import type { GateView } from "./gateTypes";
import { useGateForm } from "./useGateForm";

const TITLE_ID = "account-gate-title";
const TAB_VIEWS = ["signIn", "signUp"] as const;

/** La puerta de la cuenta: se abre al arrancar sin sesión o desde Ajustes; Esc la cierra sin elegir. */
export function AccountGate() {
  const { gate } = useAccount();
  return gate ? <GateDialog gate={gate} /> : null;
}

function GateDialog({ gate }: { readonly gate: GateState }) {
  const { t } = useI18n();
  const { state, actions, closeGate } = useAccount();
  const dialog = useRef<HTMLDivElement>(null);
  const trapTab = useModalFocus(dialog);
  const form = useGateForm();
  const [view, setView] = useState<GateView>("signIn");
  const [email, setEmail] = useState(gate.email ?? state?.email ?? "");
  const [isTabSwitch, setTabSwitch] = useState(false);
  useShortcuts([{ key: "Escape", isActiveWhileTyping: true, run: closeGate }], true, "dialog");
  const go = (next: GateView, nextEmail = email) => {
    form.dismiss();
    setTabSwitch(false);
    setEmail(nextEmail);
    setView(next);
  };
  const switchTab = (next: string) => {
    go(next as GateView);
    // Las flechas del selector siguen en el selector: el foco no salta al primer campo.
    setTabSwitch(true);
  };
  return (
    <div className={styles.backdrop}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className={styles.dialog}
        onKeyDown={trapTab}
      >
        <div className={styles.header}>
          <ArgusEye state="logo" />
          <span className={styles.grow}>{t("account.heading")}</span>
          <kbd className={styles.kbd}>{t("account.escape")}</kbd>
          <button type="button" className={styles.close} onClick={closeGate}>
            <Icon name="close" size="md" />
            {t("account.close")}
          </button>
        </div>
        <div className={styles.body}>
          {(view === "signIn" || view === "signUp") && (
            <SegmentedControl
              label={t("account.tabs.label")}
              options={TAB_VIEWS.map((id) => ({ value: id, label: t(`account.tabs.${id}`) }))}
              value={view}
              onChange={switchTab}
            />
          )}
          <h2 id={TITLE_ID} className={styles.title}>
            {t(`account.views.${view}`)}
          </h2>
          <GateBody view={view} form={form} email={email} go={go} autoFocus={!isTabSwitch} />
        </div>
        <div className={styles.footer}>
          <p className={styles.privacy}>{t("account.privacy")}</p>
          <Button
            size="md"
            disabled={form.isBusy}
            onClick={() => {
              form.run(actions.skip);
            }}
          >
            {t("account.skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
