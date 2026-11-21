import { useState } from "react";

import { Button } from "../../components/atoms/Button";
import { Icon } from "../../components/atoms/Icon";
import { useI18n } from "../../i18n/i18nContext";
import { useEngineServices } from "./EngineServicesContext";
import styles from "./EngineConnectionNotice.module.css";
import { useEngineStatus } from "./useEngineStatus";

/**
 * El único aviso de motor detenido en toda la app: qué pasó, por qué importa y qué hacer, con
 * «Reintentar conexión». Desaparece solo cuando el motor responde de verdad.
 */
export function EngineConnectionNotice() {
  const status = useEngineStatus();
  return status === "stopped" ? <StoppedNotice /> : null;
}

function StoppedNotice() {
  const { t, format } = useI18n();
  const { statusMonitor } = useEngineServices();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const retry = () => {
    setIsChecking(true);
    void statusMonitor.refresh().finally(() => {
      setIsChecking(false);
      setLastCheck(new Date());
    });
  };
  return (
    <div role="alert" className={styles.notice}>
      <Icon name="cloud_off" size="md" className={styles.icon} />
      <p className={styles.text}>
        <strong className={styles.what}>{t("engineUnavailable.what")}</strong>{" "}
        {t("engineUnavailable.why")} {t("engineUnavailable.todo")}
      </p>
      <div className={styles.actions}>
        <span role="status" className={styles.lastCheck}>
          {lastCheck && !isChecking
            ? t("engineUnavailable.stillDown", { time: format.time(lastCheck) })
            : ""}
        </span>
        <Button variant="primary" size="md" disabled={isChecking} onClick={retry}>
          {t(isChecking ? "engineUnavailable.checking" : "engineUnavailable.retry")}
        </Button>
      </div>
    </div>
  );
}
