import { describe, expect, it } from "vitest";

import { readServerSentEvents, type ServerSentEvent } from "./serverSentEvents";

/** Una respuesta cuyo cuerpo llega en los trozos dados, como un flujo de red. */
function streamed(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => {
        controller.enqueue(encoder.encode(chunk));
      });
      controller.close();
    },
  });
  return new Response(body);
}

async function eventsOf(chunks: readonly string[]): Promise<ServerSentEvent[]> {
  const events: ServerSentEvent[] = [];
  await readServerSentEvents(streamed(chunks), (event) => {
    events.push(event);
  });
  return events;
}

describe("lectura de eventos del motor (text/event-stream)", () => {
  it("lee eventos separados por \\n y el último aunque no termine en línea en blanco", async () => {
    expect(await eventsOf(['event: review\ndata: {"a":1}\n\nevent: done\ndata: 2'])).toEqual([
      { name: "review", data: { a: 1 } },
      { name: "done", data: 2 },
    ]);
  });

  // El estándar admite CRLF; un proxy o un servidor en Windows puede enviarlo así.
  it("(regresión) admite \\r\\n, también partido entre dos trozos", async () => {
    expect(
      await eventsOf(['event: review\r\ndata: {"a":1}\r', "\n\r\nevent: done\r\ndata: 2\r\n\r\n"]),
    ).toEqual([
      { name: "review", data: { a: 1 } },
      { name: "done", data: 2 },
    ]);
  });
});
