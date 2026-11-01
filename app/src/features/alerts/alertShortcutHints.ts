import type { ShortcutHint } from "../../components/molecules/ShortcutBar";
import type { ReviewResult } from "../../services/engine/reviewTypes";
import { isReadOnly } from "./alertDecisions";
import type { Translate } from "./alertPresentation";
import { SEARCH_KEY } from "./AlertsToolbar";
import { UNDO_KEYS } from "./useDecisionShortcuts";

/** Decidir y deshacer solo se anuncian si la revisión admite cambios. */
export function shortcutHints(review: ReviewResult, t: Translate): readonly ShortcutHint[] {
  const navigation = [
    { keys: ["J", "K"], label: t("shortcuts.move") },
    { keys: ["↵"], label: t("shortcuts.open") },
  ];
  const search = { keys: [SEARCH_KEY], label: t("shortcuts.search") };
  if (isReadOnly(review)) return [...navigation, search];
  return [
    ...navigation,
    { keys: ["C", "E", "I"], label: t("shortcuts.decide") },
    search,
    { keys: UNDO_KEYS, label: t("shortcuts.undo") },
  ];
}
