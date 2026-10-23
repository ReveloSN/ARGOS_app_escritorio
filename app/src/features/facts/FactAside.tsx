import { useI18n } from "../../i18n/i18nContext";
import type { FactResult, PendingFactResult } from "../../services/engine/factTypes";
import { describeLocation, entityTypeLabel } from "../alerts/alertPresentation";
import { OpenDocumentFailure } from "../alerts/OpenDocumentFailure";
import { useOpenDocument } from "../alerts/useOpenDocument";
import type { TimedNotice } from "../alerts/useTimedNotice";
import { ContradictionCard } from "./ContradictionCard";
import { agreementNotes } from "./factPresentation";
import { isContradicted, type FactRow } from "./factRows";
import styles from "./Facts.module.css";
import { AssistantEye } from "../assistant/AssistantEye";

interface FactAsideProps {
  readonly row: FactRow | undefined;
  readonly sessionId: string;
  readonly notice: TimedNotice;
}

function Agreement({ fact }: { fact: FactResult }) {
  const texts = useI18n();
  return (
    <div className={styles.agreement}>
      <AssistantEye state="success" size="md" />
      <span className={styles.agreementTitle}>{texts.t("facts.aside.noneTitle")}</span>
      {agreementNotes(fact, texts).map((note) => (
        <span key={note} className={styles.note}>
          {note}
        </span>
      ))}
    </div>
  );
}

function Appearances({ fact }: { fact: FactResult }) {
  const { t } = useI18n();
  return (
    <div className={styles.appearances}>
      <span className={styles.appearancesTitle}>{t("facts.aside.appearsIn")}</span>
      {fact.appearances.map((item, index) => (
        <span key={`${item.document}-${String(index)}`} className={styles.appearance}>
          <span className={styles.document}>{item.document}</span>
          <span className={styles.where}>{describeLocation(item.location, t)}</span>
        </span>
      ))}
    </div>
  );
}

function FactDetail({
  fact,
  sessionId,
  notice,
}: {
  fact: FactResult;
  sessionId: string;
  notice: TimedNotice;
}) {
  const opener = useOpenDocument(sessionId, notice);
  return (
    <>
      {opener.failure && (
        <OpenDocumentFailure failure={opener.failure} onDismiss={opener.dismiss} />
      )}
      {isContradicted(fact) ? (
        fact.contradictions.map((item) => (
          <ContradictionCard key={item.value} contradiction={item} onOpen={opener.open} />
        ))
      ) : (
        <Agreement fact={fact} />
      )}
      {fact.appearances.length > 0 && <Appearances fact={fact} />}
    </>
  );
}

function PendingDetail({ pending }: { pending: PendingFactResult }) {
  const { t, format } = useI18n();
  return (
    <p className={styles.note}>
      {t("facts.aside.pendingText", { values: format.list(pending.values) })}
    </p>
  );
}

/** Panel lateral del dato elegido: qué documentos lo contradicen o por qué ninguno lo hace. */
export function FactAside({ row, sessionId, notice }: FactAsideProps) {
  const { t } = useI18n();
  if (!row) return <aside className={styles.aside} />;
  const name = row.kind === "fact" ? row.fact.label : entityTypeLabel(row.pending.entityType, t);
  const value = row.kind === "fact" ? row.fact.value : t("facts.aside.unconfirmed");
  return (
    <aside className={styles.aside} aria-label={t("facts.aside.title")}>
      <span className={styles.asideTitle}>{t("facts.aside.title")}</span>
      <div className={styles.asideFact}>
        <span className={styles.asideName}>{name}</span>
        <span className={styles.asideValue}>{value}</span>
      </div>
      {row.kind === "fact" ? (
        <FactDetail fact={row.fact} sessionId={sessionId} notice={notice} />
      ) : (
        <PendingDetail pending={row.pending} />
      )}
    </aside>
  );
}
