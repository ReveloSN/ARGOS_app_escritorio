import type { AccountGateway, AccountStateResult } from "../../services/engine/accountTypes";
import type { AccountStore } from "./useAccountStore";
import type { GateControl } from "./useGate";

const identity = (state: AccountStateResult) => state;
// Con el motor ya respondiendo, una lectura que falla se repite una sola vez.
const RETRY_DELAY_MS = 3000;

export interface FirstReadContext {
  readonly gateway: AccountGateway;
  readonly store: AccountStore;
  readonly gate: GateControl;
  readonly isEngineReady: boolean;
}

/**
 * La primera lectura de la cuenta que llega decide, una sola vez por ejecución, si la puerta se
 * abre: solo con `signed_out` y sin la marca de «Continuar sin cuenta». Con sesión, se renueva en
 * segundo plano. Una lectura a la vez; si falla con el motor ya listo, se repite una vez.
 */
export class FirstAccountRead {
  private isDecided = false;
  private isReading = false;
  private wasAsked = false;
  private hasRetried = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly context: () => FirstReadContext,
    private readonly onSettled: () => void,
  ) {}

  read(): void {
    if (this.isDecided) return;
    if (this.isReading) {
      this.wasAsked = true;
      return;
    }
    this.isReading = true;
    const { gateway, store } = this.context();
    store.accept(gateway.account(), identity).then(
      (state) => {
        this.finish();
        this.decide(state);
      },
      () => {
        this.finish();
        this.scheduleRetry();
      },
    );
  }

  stop(): void {
    clearTimeout(this.timer);
  }

  private finish(): void {
    this.isReading = false;
    this.onSettled();
  }

  private decide(state: AccountStateResult): void {
    if (this.isDecided) return;
    this.isDecided = true;
    const { gateway, store, gate } = this.context();
    if (state.status === "signed_out" && !state.gateSkipped) gate.open("startup", null);
    if (state.status === "signed_in") {
      store.accept(gateway.refresh(), identity).catch(() => undefined);
    }
  }

  private scheduleRetry(): void {
    if (this.wasAsked) {
      this.wasAsked = false;
      this.after(0);
    } else if (this.context().isEngineReady && !this.hasRetried) {
      this.hasRetried = true;
      this.after(RETRY_DELAY_MS);
    }
  }

  private after(delayMs: number): void {
    this.timer = setTimeout(() => {
      this.read();
    }, delayMs);
  }
}
