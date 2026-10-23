import type { AppRoute } from "../features/navigation/appRoute";
import { usePageNavigation, type PageNavigation } from "../features/navigation/usePageNavigation";
import { useReview } from "../features/review/reviewContext";
import { AlertDetailPage } from "./AlertDetailPage";
import { ComparePage } from "./ComparePage";
import { HistoryPage } from "./HistoryPage";
import { HomePage } from "./HomePage";
import { NewReviewPage } from "./NewReviewPage";
import { ResultsPage } from "./ResultsPage";
import { SettingsPage } from "./SettingsPage";

interface CurrentPageProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
  readonly onSearchDocuments?: ((query: string) => void) | undefined;
}

/** La pantalla de la ruta actual. */
export function CurrentPage({ route, onNavigate, onSearchDocuments }: CurrentPageProps) {
  const navigation = usePageNavigation(onNavigate);
  switch (route.page) {
    case "newReview":
      return (
        <NewReviewPage
          onCancel={navigation.openHome}
          onReviewed={() => {
            navigation.openTab("alerts");
          }}
        />
      );
    case "history":
      return (
        <HistoryPage
          selectedId={route.sessionId}
          onOpenReview={() => {
            navigation.openTab("alerts");
          }}
          onOpenAlert={navigation.openAlert}
          onNewReview={navigation.openNewReview}
        />
      );
    case "settings":
      return <SettingsPage />;
    case "compare":
      return <ComparePage />;
    case "results":
    case "alert":
      return (
        <ReviewPage route={route} navigation={navigation} onSearchDocuments={onSearchDocuments} />
      );
    case "home":
      return <HomePage onNewReview={navigation.openNewReview} onCompare={navigation.openCompare} />;
  }
}

interface ReviewPageProps {
  readonly route: Extract<AppRoute, { page: "results" | "alert" }>;
  readonly navigation: PageNavigation;
  readonly onSearchDocuments?: ((query: string) => void) | undefined;
}

/** Resultados y detalle solo existen con una revisión real; sin ella se vuelve a Inicio. */
function ReviewPage({ route, navigation, onSearchDocuments }: ReviewPageProps) {
  const { review } = useReview();
  if (!review) {
    return <HomePage onNewReview={navigation.openNewReview} onCompare={navigation.openCompare} />;
  }
  if (route.page === "alert") {
    return (
      <AlertDetailPage
        review={review}
        number={route.number}
        onOpenTab={navigation.openTab}
        onOpenAlert={navigation.openAlert}
        onCloseReview={navigation.closer.close}
      />
    );
  }
  return (
    <ResultsPage
      review={review}
      closer={navigation.closer}
      onOpenAlert={navigation.openAlert}
      onSearchDocuments={onSearchDocuments}
    />
  );
}
