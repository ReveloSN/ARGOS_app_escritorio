import { vi } from "vitest";

import type { EngineServices } from "../features/engine/EngineServicesContext";
import type { DesktopShell } from "../services/desktop/desktopShell";
import type { EngineHealth } from "../services/engine/engineClient";
import type {
  EngineConnectionSource,
  EngineConnectionState,
} from "../services/engine/engineConnection";
import { EngineStatusMonitor } from "../services/engine/engineStatusMonitor";

export const READY_STATE: EngineConnectionState = {
  kind: "ready",
  connection: { baseUrl: "http://127.0.0.1:5000", token: "secret" },
};

export const HEALTHY: EngineHealth = { status: "ok", version: "1" };

export function sourceReturning(state: EngineConnectionState): EngineConnectionSource {
  return { readConnectionState: () => Promise.resolve(state) };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function notConfigured() {
  return vi.fn(() => Promise.reject(new Error("Doble de prueba sin respuesta configurada.")));
}

export interface FakeEngineOptions {
  readonly checkHealth?: () => Promise<EngineHealth>;
  readonly reviews?: Partial<EngineServices["reviews"]>;
  readonly comparisons?: Partial<EngineServices["comparisons"]>;
  readonly facts?: Partial<EngineServices["facts"]>;
  readonly sending?: Partial<EngineServices["sending"]>;
  readonly history?: Partial<EngineServices["history"]>;
  readonly preferences?: Partial<EngineServices["preferences"]>;
  readonly documents?: Partial<EngineServices["documents"]>;
  /** Sin valor, la prueba simula el navegador (no hay acciones de escritorio). */
  readonly desktop?: DesktopShell;
}

function fakeReviews(overrides: FakeEngineOptions["reviews"]): EngineServices["reviews"] {
  return {
    startReview: notConfigured(),
    openReview: notConfigured(),
    closeReview: notConfigured(),
    decide: notConfigured(),
    undoDecision: notConfigured(),
    ...overrides,
  };
}

function fakeComparisons(
  overrides: FakeEngineOptions["comparisons"],
): EngineServices["comparisons"] {
  return {
    startComparison: notConfigured(),
    openComparison: notConfigured(),
    decide: notConfigured(),
    undoDecision: notConfigured(),
    ...overrides,
  };
}

function fakeFacts(overrides: FakeEngineOptions["facts"]): EngineServices["facts"] {
  return {
    listFacts: notConfigured(),
    addFact: notConfigured(),
    editFact: notConfigured(),
    retireFact: notConfigured(),
    restoreFact: notConfigured(),
    undoFact: notConfigured(),
    ...overrides,
  };
}

function fakeSending(overrides: FakeEngineOptions["sending"]): EngineServices["sending"] {
  return {
    reviewDraft: notConfigured(),
    decide: notConfigured(),
    undoDecision: notConfigured(),
    openCorrected: notConfigured(),
    ...overrides,
  };
}

function fakePreferences(
  overrides: FakeEngineOptions["preferences"],
): EngineServices["preferences"] {
  return {
    preferences: notConfigured(),
    savePreferences: notConfigured(),
    suppressSimilar: notConfigured(),
    removeSuppressionRule: notConfigured(),
    moveHistoryFolder: notConfigured(),
    ...overrides,
  };
}

/** Servicios del motor para pruebas de interfaz: solo responden lo que cada prueba configura. */
export function fakeEngineServices(options: FakeEngineOptions = {}): EngineServices {
  const checkHealth = options.checkHealth ?? (() => Promise.resolve(HEALTHY));
  return {
    statusMonitor: new EngineStatusMonitor({ checkHealth }),
    reviews: fakeReviews(options.reviews),
    comparisons: fakeComparisons(options.comparisons),
    facts: fakeFacts(options.facts),
    sending: fakeSending(options.sending),
    history: { history: notConfigured(), records: notConfigured(), ...options.history },
    preferences: fakePreferences(options.preferences),
    documents: {
      searchDocuments: notConfigured(),
      openDocument: notConfigured(),
      ...options.documents,
    },
    desktop: options.desktop ?? null,
  };
}
