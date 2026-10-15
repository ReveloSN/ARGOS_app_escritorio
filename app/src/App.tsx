import { useState } from "react";

import { Sidebar } from "./components/organisms/Sidebar";
import { Topbar } from "./components/organisms/Topbar";
import { AppShell } from "./components/templates/AppShell";
import { useEngineStatus } from "./features/engine/useEngineStatus";
import {
  HOME_ROUTE,
  routeForSection,
  sectionOf,
  type AppRoute,
} from "./features/navigation/appRoute";
import { useReview } from "./features/review/reviewContext";
import { useActiveSessionSummary } from "./features/review/useActiveSessionSummary";
import { CurrentPage } from "./pages/CurrentPage";

/** Arranca en Inicio; sesión activa y contadores aparecen solo con una revisión real. */
export function App() {
  const engineStatus = useEngineStatus();
  const { review } = useReview();
  const indicators = useActiveSessionSummary(review);
  const [route, setRoute] = useState<AppRoute>(HOME_ROUTE);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AppShell
      sidebar={
        <Sidebar
          active={sectionOf(route)}
          collapsed={collapsed}
          session={indicators?.card}
          reviewBadge={indicators?.badge}
          onNavigate={(section) => {
            setRoute(routeForSection(section));
          }}
          onToggleCollapsed={() => {
            setCollapsed((current) => !current);
          }}
          onNewReview={() => {
            setRoute({ page: "newReview" });
          }}
        />
      }
      topbar={<Topbar sessionName={review?.session.name} engineStatus={{ kind: engineStatus }} />}
    >
      <CurrentPage route={route} onNavigate={setRoute} />
    </AppShell>
  );
}
