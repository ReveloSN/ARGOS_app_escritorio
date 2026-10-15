import { DEFAULT_LOCALE, MESSAGES_BY_LOCALE } from "./i18n/messages";
import { translate } from "./i18n/translate";

export function App() {
  const messages = MESSAGES_BY_LOCALE[DEFAULT_LOCALE];

  return (
    <main>
      <h1>{translate(messages, "app.name")}</h1>
    </main>
  );
}
