import { HOME_ROUTE, type AppRoute } from "../features/navigation/appRoute";
import { useReview } from "../features/review/reviewContext";
import { AlertDetailPage } from "./AlertDetailPage";
import { HomePage } from "./HomePage";
import { NewReviewPage } from "./NewReviewPage";
import { ResultsPage } from "./ResultsPage";
import { SectionUnavailablePage } from "./SectionUnavailablePage";

interface CurrentPageProps {
  readonly route: AppRoute;
  readonly onNavigate: (route: AppRoute) => void;
}

/** Resultados y detalle solo existen con una revisión real; sin ella se vuelve a Inicio. */
export function CurrentPage({ route, onNavigate }: CurrentPageProps) {
  const { review } = useReview();
  const openNewReview = () => {
    onNavigate({ page: "newReview" });
  };
  const openAlert = (number: number) => {
    onNavigate({ page: "alert", number });
  };
  const openResults = () => {
    onNavigate({ page: "results" });
  };

  if (route.page === "newReview") {
    return (
      <NewReviewPage
        onCancel={() => {
          onNavigate(HOME_ROUTE);
        }}
        onReviewed={openResults}
      />
    );
  }
  if (route.page === "history" || route.page === "settings") return <SectionUnavailablePage />;
  if (review && route.page === "results") {
    return <ResultsPage review={review} onOpenAlert={openAlert} onNewReview={openNewReview} />;
  }
  if (review && route.page === "alert") {
    return (
      <AlertDetailPage
        review={review}
        number={route.number}
        onBack={openResults}
        onOpenAlert={openAlert}
      />
    );
  }
  return <HomePage onNewReview={openNewReview} />;
}
