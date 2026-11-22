import type { ComponentType } from "react";

import type { GateView, GateViewProps } from "./gateTypes";
import { RecoverView } from "./RecoverView";
import { ResetView } from "./ResetView";
import { SignInView } from "./SignInView";
import { SignUpView } from "./SignUpView";
import { VerifyView } from "./VerifyView";

const VIEWS: Readonly<Record<GateView, ComponentType<GateViewProps>>> = {
  signIn: SignInView,
  signUp: SignUpView,
  verify: VerifyView,
  recover: RecoverView,
  reset: ResetView,
};

/** La vista que toca: cada una empieza con campos vacíos, así la contraseña no pasa de una a otra. */
export function GateBody({ view, ...props }: GateViewProps & { readonly view: GateView }) {
  const View = VIEWS[view];
  return <View key={view} {...props} />;
}
