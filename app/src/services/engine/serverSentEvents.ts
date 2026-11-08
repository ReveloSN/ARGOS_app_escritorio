export interface ServerSentEvent {
  readonly name: string;
  readonly data: unknown;
}

const EVENT_SEPARATOR = "\n\n";
const FIELD_SEPARATOR = ": ";
const DEFAULT_EVENT_NAME = "message";
const CRLF = /\r\n/g;
// Un \r suelto es fin de línea, salvo al final: puede ser la mitad de un \r\n partido en dos trozos.
const LONE_CR_NOT_LAST = /\r(?!$)/g;
const ANY_CR = /\r/g;

/** El estándar admite LF, CRLF y CR como fin de línea; se trabaja siempre con LF. */
function toLineFeeds(text: string, isFinal: boolean): string {
  const unified = text.replace(CRLF, "\n");
  return isFinal ? unified.replace(ANY_CR, "\n") : unified.replace(LONE_CR_NOT_LAST, "\n");
}

/** Lee un flujo `text/event-stream` y avisa cada evento apenas llega completo (ADR 004). */
export async function readServerSentEvents(
  response: Response,
  onEvent: (event: ServerSentEvent) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let pending = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = toLineFeeds(pending + decoder.decode(value, { stream: true }), false);
    pending = emitCompleteEvents(text, onEvent);
  }
  emitCompleteEvents(toLineFeeds(pending + decoder.decode(), true) + EVENT_SEPARATOR, onEvent);
}

/** Avisa los eventos completos y devuelve lo que falta por llegar del último. */
function emitCompleteEvents(text: string, onEvent: (event: ServerSentEvent) => void): string {
  const blocks = text.split(EVENT_SEPARATOR);
  const incomplete = blocks.pop() ?? "";
  blocks
    .filter((block) => block.trim())
    .forEach((block) => {
      onEvent(parseEvent(block));
    });
  return incomplete;
}

function parseEvent(block: string): ServerSentEvent {
  const fields = new Map(
    block.split("\n").map((line) => {
      const separator = line.indexOf(FIELD_SEPARATOR);
      return [line.slice(0, separator), line.slice(separator + FIELD_SEPARATOR.length)] as const;
    }),
  );
  return {
    name: fields.get("event") ?? DEFAULT_EVENT_NAME,
    data: JSON.parse(fields.get("data") ?? "null") as unknown,
  };
}
