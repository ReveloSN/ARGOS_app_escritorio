import { DecisionCard } from "../../components/organisms/DecisionCard";
import { useI18n } from "../../i18n/i18nContext";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { decisionCardsOf } from "./decisionCards";
import styles from "./DecisionCardList.module.css";

interface DecisionCardListProps {
  readonly review: ReviewResult;
  readonly onOpenAlert?: ((number: number) => void) | undefined;
}

/** Las decisiones de una revisión: pestaña «Decisiones» y panel lateral del historial. */
export function DecisionCardList({ review, onOpenAlert }: DecisionCardListProps) {
  const i18n = useI18n();
  const cards = decisionCardsOf(review, i18n);
  if (cards.length === 0) return <p className={styles.empty}>{i18n.t("decisionCard.none")}</p>;
  return (
    <div aria-label={i18n.t("decisionCard.listLabel")} role="list" className={styles.list}>
      {cards.map((card) => (
        <div key={card.number} role="listitem">
          <DecisionCard
            data={card}
            onOpen={
              onOpenAlert &&
              (() => {
                onOpenAlert(card.number);
              })
            }
          />
        </div>
      ))}
    </div>
  );
}
