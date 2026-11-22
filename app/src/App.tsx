import { useState } from "react";

import { Sidebar } from "./components/organisms/Sidebar";
import { Topbar } from "./components/organisms/Topbar";
import { AppShell } from "./components/templates/AppShell";
import { useAccount } from "./features/account/accountContext";
import { useIsGateShown } from "./features/account/useIsGateShown";
import { AccountGate } from "./features/account/AccountGate";
import { summarizeAccount } from "./features/account/accountSummary";
import { OnboardingGate } from "./features/assistant/OnboardingDialog";
import { topbarStatusFor, useAssistantChrome } from "./features/assistant/useAssistantChrome";
import { EngineConnectionNotice } from "./features/engine/EngineConnectionNotice";
import { useShortcuts } from "./features/keyboard/useShortcuts";
import { TopbarLocationContext } from "./features/navigation/topbarLocationContext";
import { topbarSectionFor } from "./features/navigation/topbarSection";
import {
  HOME_ROUTE,
  routeForSection,
  sectionOf,
  type AppRoute,
} from "./features/navigation/appRoute";
import { useActiveSessionSummary } from "./features/review/useActiveSessionSummary";
import { SessionNotice } from "./features/session/SessionNotice";
import { SessionSwitcher } from "./features/session/SessionSwitcher";
import { usePendingSessionDeletion } from "./features/session/usePendingSessionDeletion";
import { useSessionRename } from "./features/session/useSessionRename";
import { useSessionSnapshot } from "./features/session/useSessionSnapshot";
import { useSessionSwitch } from "./features/session/useSessionSwitch";
import { GlobalSearch } from "./features/search/GlobalSearch";
import { useGlobalSearch } from "./features/search/useGlobalSearch";
import { CurrentPage } from "./pages/CurrentPage";
import { useI18n } from "./i18n/i18nContext";

const NEW_REVIEW_ROUTE: AppRoute = { page: "newReview" };

/** Arranca en Inicio; sesión activa y contadores aparecen solo con una revisión real. */
export function App() {
  const snapshot = useSessionSnapshot();
  const indicators = useActiveSessionSummary(snapshot.review);
  const switching = useSessionSwitch();
  const renaming = useSessionRename();
  const deletion = usePendingSessionDeletion();
  const [route, setRoute] = useState<AppRoute>(HOME_ROUTE);
  const [collapsed, setCollapsed] = useState(false);
  const search = useGlobalSearch(route, setRoute);
  const assistant = useAssistantChrome();
  const i18n = useI18n();
  const { state: account } = useAccount();
  const isGateShown = useIsGateShown();
  const [locationTarget, setLocationTarget] = useState<HTMLElement | null>(null);
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
    <>
      <AppShell
        isInert={isGateShown}
        notice={<EngineConnectionNotice />}
        sidebar={
          <Sidebar
            active={sectionOf(route)}
            collapsed={collapsed}
            session={indicators?.card}
            reviewBadge={indicators?.badge}
            assistant={assistant.sidebar}
            account={summarizeAccount(account, i18n)}
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
            section={topbarSectionFor(route, i18n)}
            locationRef={setLocationTarget}
            session={
              snapshot.review && (
                <SessionSwitcher
                  active={snapshot.review}
                  renaming={renaming}
                  onSwitch={switching.switchTo}
                  onNewSession={() => {
                    setRoute(NEW_REVIEW_ROUTE);
                  }}
                  onDelete={deletion.schedule}
                />
              )
            }
            assistantStatus={topbarStatusFor(assistant, collapsed)}
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
        <TopbarLocationContext.Provider value={locationTarget}>
          <CurrentPage route={route} onNavigate={setRoute} onSearchDocuments={search.open} />
        </TopbarLocationContext.Provider>
        {search.scope && search.query !== null && (
          <GlobalSearch scope={search.scope} initialQuery={search.query} onClose={search.close} />
        )}
        <OnboardingGate />
        <SessionNotice deletion={deletion} switching={switching} />
      </AppShell>
      <AccountGate />
    </>
  );
}
