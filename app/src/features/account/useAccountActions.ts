import type {
  AccountGateway,
  AccountStateResult,
  SignUpForm,
} from "../../services/engine/accountTypes";
import type { AccountActions, SignUpAnswer } from "./accountContext";
import type { AccountStore } from "./useAccountStore";
import type { GateControl } from "./useGate";

const identity = (state: AccountStateResult) => state;

interface Collaborators {
  readonly gateway: AccountGateway;
  readonly store: AccountStore;
  readonly gate: GateControl;
}

/**
 * Una operación que cambia la cuenta. Si su respuesta se descarta por una más nueva, o si falla
 * (pudo completarse en el motor aunque la respuesta no llegara), se vuelve a leer la cuenta.
 */
function mutating({ gateway, store }: Collaborators) {
  const reread = () => store.accept(gateway.account(), identity).then(() => undefined);
  const quietly = () => {
    reread().catch(() => undefined);
  };
  return async <Answer>(
    request: () => Promise<Answer>,
    stateOf: (a: Answer) => AccountStateResult,
  ) => {
    try {
      return await store.accept(request(), stateOf, quietly);
    } catch (error) {
      await reread().catch(() => undefined);
      throw error;
    }
  };
}

type Mutate = ReturnType<typeof mutating>;

/** Una respuesta que deja a la persona dentro cierra la puerta, si sigue siendo la misma. */
function enteringWith(mutate: Mutate, gate: GateControl) {
  return async (request: () => Promise<AccountStateResult>) => {
    const session = gate.session();
    const state = await mutate(request, identity);
    if (state.status === "signed_in") gate.closeIfSame(session);
  };
}

function signingUpWith(mutate: Mutate, { gateway, gate }: Collaborators) {
  return async (form: SignUpForm): Promise<SignUpAnswer> => {
    const session = gate.session();
    const outcome = await mutate(
      () => gateway.signUp(form),
      (answer) => answer.state,
    );
    if (outcome.state.status === "signed_in") gate.closeIfSame(session);
    return { needsConfirmation: outcome.needsConfirmation };
  };
}

function skippingWith(mutate: Mutate, { gateway, gate }: Collaborators) {
  return async () => {
    const session = gate.session();
    await mutate(() => gateway.skip(), identity);
    gate.closeIfSame(session);
  };
}

export function useAccountActions(
  gateway: AccountGateway,
  store: AccountStore,
  gate: GateControl,
): AccountActions {
  const parts = { gateway, store, gate };
  const mutate = mutating(parts);
  const enter = enteringWith(mutate, gate);
  return {
    signIn: (form) => enter(() => gateway.signIn(form)),
    verify: (form) => enter(() => gateway.verify(form)),
    confirmReset: (form) => enter(() => gateway.confirmPasswordReset(form)),
    signUp: signingUpWith(mutate, parts),
    requestReset: (email) => gateway.requestPasswordReset(email),
    skip: skippingWith(mutate, parts),
    signOut: async () => {
      await mutate(() => gateway.signOut(), identity);
    },
  };
}
