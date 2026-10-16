export interface ServerSentEvent {
  readonly name: string;
  readonly data: unknown;
}

const EVENT_SEPARATOR = "\n\n";
const FIELD_SEPARATOR = ": ";
const DEFAULT_EVENT_NAME = "message";

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
    pending = emitCompleteEvents(pending + decoder.decode(value, { stream: true }), onEvent);
  }
  emitCompleteEvents(pending + decoder.decode() + EVENT_SEPARATOR, onEvent);
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
