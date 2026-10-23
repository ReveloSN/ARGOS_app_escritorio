import { Breadcrumb } from "../../components/molecules/Breadcrumb";
import { joinClassNames } from "../../components/joinClassNames";
import { useI18n } from "../../i18n/i18nContext";
import styles from "./Compare.module.css";
import { COMPARE_TABS } from "./compareTabs";
import type { CompareTab } from "./useComparisonView";

interface CompareHeaderProps {
  readonly tab: CompareTab;
  readonly crumb: string;
  readonly onTab: (tab: CompareTab) => void;
}

/** «Comparar documentos»: breadcrumb y los tres modos (versiones, inconsistencias, matriz). */
export function CompareHeader({ tab, crumb, onTab }: CompareHeaderProps) {
  const { t } = useI18n();
  return (
    <div className={styles.header}>
      <Breadcrumb
        items={[
          { id: "compare", label: t("navigation.compare") },
          { id: "current", label: crumb },
        ]}
      />
      <div className={styles.titleRow}>
        <h1 className={styles.title}>{t("comparison.title")}</h1>
        <div role="tablist" aria-label={t("comparison.modes.label")} className={styles.modes}>
          {COMPARE_TABS.map((item) => (
            <button
              key={item.tab}
              type="button"
              role="tab"
              aria-selected={tab === item.tab}
              className={joinClassNames(styles.mode, tab === item.tab && styles.modeSelected)}
              onClick={() => {
                onTab(item.tab);
              }}
            >
              {t(item.label)}
              <kbd className={styles.modeKey}>{item.key}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
