import { joinClassNames } from "../joinClassNames";
import styles from "./AccountBadge.module.css";

export interface AccountSummary {
  readonly initials: string;
  /** El nombre, o el correo si la cuenta no tiene nombre. */
  readonly name: string;
  /** Una nota corta bajo el nombre («Sesión vencida»). */
  readonly note?: string | undefined;
  /** Cómo la anuncia un lector cuando solo se ven las iniciales. */
  readonly label: string;
}

interface AccountBadgeProps {
  readonly account: AccountSummary;
  readonly collapsed: boolean;
}

/** Quién está dentro: iniciales y nombre al pie de la barra lateral; contraída, solo las iniciales. */
export function AccountBadge({ account, collapsed }: AccountBadgeProps) {
  const initials = (
    <span aria-hidden="true" className={styles.initials}>
      {account.initials}
    </span>
  );
  if (collapsed) {
    return (
      <span role="img" aria-label={account.label} title={account.label} className={styles.badge}>
        {initials}
      </span>
    );
  }
  return (
    <div className={joinClassNames(styles.badge, styles.expanded)}>
      {initials}
      <span className={styles.text}>
        <span title={account.name} className={styles.name}>
          {account.name}
        </span>
        {account.note && <span className={styles.note}>{account.note}</span>}
      </span>
    </div>
  );
}
