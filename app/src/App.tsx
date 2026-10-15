import { useState } from "react";

import type { EngineStatusView } from "./components/molecules/EngineStatusIndicator";
import { Sidebar } from "./components/organisms/Sidebar";
import type { SidebarSection } from "./components/organisms/sidebarSections";
import { Topbar } from "./components/organisms/Topbar";
import { AppShell } from "./components/templates/AppShell";
import { useEngineStatus } from "./features/engine/useEngineStatus";
import { DesignSystemPage } from "./pages/DesignSystemPage";
import { SAMPLE_SESSION } from "./pages/designSystemSamples";

const IGNORE = () => undefined;

// Hasta la Fase 6 la app muestra la galería del design system dentro del marco real.
export function App() {
  const engineStatus = useEngineStatus();
  const [section, setSection] = useState<SidebarSection>("review");
  const [collapsed, setCollapsed] = useState(false);
  const engineView: EngineStatusView = { kind: engineStatus };

  return (
    <AppShell
      sidebar={
        <Sidebar
          active={section}
          collapsed={collapsed}
          session={SAMPLE_SESSION}
          reviewBadge="7"
          onNavigate={setSection}
          onToggleCollapsed={() => {
            setCollapsed((current) => !current);
          }}
          onNewReview={IGNORE}
        />
      }
      topbar={
        <Topbar
          sessionName={SAMPLE_SESSION.name}
          engineStatus={engineView}
          onOpenSearch={IGNORE}
          onOpenHelp={IGNORE}
        />
      }
    >
      <DesignSystemPage />
    </AppShell>
  );
}
