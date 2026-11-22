import type {
  AccountGateway,
  AccountStateResult,
  SignUpForm,
} from "../../services/engine/accountTypes";
import type { AccountActions, SignUpAnswer } from "./accountContext";
import { problemOf } from "./accountProblem";
import type { AccountStore } from "./useAccountStore";
import type { GateControl } from "./useGate";

const identity = (state: AccountStateResult) => state;

/** Cierra la puerta con una respuesta que dejó a la persona dentro; solo si sigue siendo la misma. */
function closingGateWhenSignedIn(gate: GateControl, store: AccountStore) {
  return (request: () => Promise<AccountStateResult>) => {
    const session = gate.session();
    return store.accept(request(), identity).then((state) => {
      if (state.status === "signed_in") gate.closeIfSame(session);
    });
  };
}

/** Tras un fallo al salir, la sesión pudo cerrarse en memoria: se vuelve a leer y se muestra. */
async function signOutRereadingAfterFailure(gateway: AccountGateway, store: AccountStore) {
  try {
    await store.accept(gateway.signOut(), identity);
  } catch (error) {
    if (problemOf(error) === "keychain_unavailable") {
      await store.accept(gateway.account(), identity).catch(() => undefined);
    }
    throw error;
  }
}

async function signUpAndCloseIfSignedIn(
  form: SignUpForm,
  gateway: AccountGateway,
  { store, gate }: { store: AccountStore; gate: GateControl },
): Promise<SignUpAnswer> {
  const session = gate.session();
  const outcome = await store.accept(gateway.signUp(form), (answer) => answer.state);
  if (outcome.state.status === "signed_in") gate.closeIfSame(session);
  return { needsConfirmation: outcome.needsConfirmation };
}

async function skipAndClose(gateway: AccountGateway, store: AccountStore, gate: GateControl) {
  const session = gate.session();
  await store.accept(gateway.skip(), identity);
  gate.closeIfSame(session);
}

export function useAccountActions(
  gateway: AccountGateway,
  store: AccountStore,
  gate: GateControl,
): AccountActions {
  const enter = closingGateWhenSignedIn(gate, store);
  return {
    signIn: (form) => enter(() => gateway.signIn(form)),
    verify: (form) => enter(() => gateway.verify(form)),
    confirmReset: (form) => enter(() => gateway.confirmPasswordReset(form)),
    signUp: (form) => signUpAndCloseIfSignedIn(form, gateway, { store, gate }),
    requestReset: (email) => gateway.requestPasswordReset(email),
    skip: () => skipAndClose(gateway, store, gate),
    signOut: () => signOutRereadingAfterFailure(gateway, store),
  };
}
