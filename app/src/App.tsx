import { useState } from "react";

import { Sidebar } from "./components/organisms/Sidebar";
import { Topbar } from "./components/organisms/Topbar";
import { AppShell } from "./components/templates/AppShell";
import { useEngineStatusView } from "./features/engine/useEngineStatusView";
import { useShortcuts } from "./features/keyboard/useShortcuts";
import {
  HOME_ROUTE,
  routeForSection,
  sectionOf,
  type AppRoute,
} from "./features/navigation/appRoute";
import { useReview } from "./features/review/reviewContext";
import { useActiveSessionSummary } from "./features/review/useActiveSessionSummary";
import { GlobalSearch } from "./features/search/GlobalSearch";
import { useGlobalSearch } from "./features/search/useGlobalSearch";
import { CurrentPage } from "./pages/CurrentPage";

const NEW_REVIEW_ROUTE: AppRoute = { page: "newReview" };

/** Arranca en Inicio; sesión activa y contadores aparecen solo con una revisión real. */
export function App() {
  const { review } = useReview();
  const indicators = useActiveSessionSummary(review);
  const [route, setRoute] = useState<AppRoute>(HOME_ROUTE);
  const [collapsed, setCollapsed] = useState(false);
  const search = useGlobalSearch(route, setRoute);
  const engineStatus = useEngineStatusView();
  const toggleSidebar = () => {
    setCollapsed((current) => !current);
  };
  useShortcuts([
    {
      key: "n",
      withModifier: true,
      isActiveWhileTyping: true,
      run: () => {
        setRoute(NEW_REVIEW_ROUTE);
      },
    },
    {
      key: "k",
      withModifier: true,
      isActiveWhileTyping: true,
      run: () => {
        search.open?.();
      },
    },
    { key: "b", withModifier: true, run: toggleSidebar },
  ]);

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
          onToggleCollapsed={toggleSidebar}
          onNewReview={() => {
            setRoute(NEW_REVIEW_ROUTE);
          }}
        />
      }
      topbar={
        <Topbar
          sessionName={review?.session.name}
          engineStatus={engineStatus}
          searchPlaceholder={search.scope?.placeholder}
          onOpenSearch={
            search.open &&
            (() => {
              search.open?.();
            })
          }
        />
      }
    >
      <CurrentPage route={route} onNavigate={setRoute} onSearchDocuments={search.open} />
      {search.scope && search.query !== null && (
        <GlobalSearch scope={search.scope} initialQuery={search.query} onClose={search.close} />
      )}
    </AppShell>
  );
}
