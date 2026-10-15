import { EngineStatusIndicator } from "./components/molecules/EngineStatusIndicator";
import { useEngineStatus } from "./features/engine/useEngineStatus";
import { useTranslation } from "./i18n/useTranslation";

export function App() {
  const t = useTranslation();
  const engineStatus = useEngineStatus();

  return (
    <main>
      <h1>{t("app.name")}</h1>
      <EngineStatusIndicator status={engineStatus} />
    </main>
  );
}
