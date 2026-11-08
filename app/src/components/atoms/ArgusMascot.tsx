import { useRef } from "react";

import { ArgusEye, type EyeSize } from "./ArgusEye";
import { usePointerGaze } from "./pointerGaze";
import { usePokeReaction, useReactionOnChange } from "./pokeReaction";
import type { EyeState } from "./eyeShapes";
import { joinClassNames } from "../joinClassNames";
import styles from "./ArgusMascot.module.css";

interface ArgusMascotProps {
  readonly state: EyeState;
  readonly size?: EyeSize;
  readonly label?: string | undefined;
}

type MascotPose = "rest" | "celebrate";

interface PoseShape {
  readonly arms: string;
  /** El ojo de éxito es un arco hacia arriba; sin boca, dentro del cuerpo se lee como ceño. */
  readonly mouth?: string;
}

/** Coordenadas en el viewBox 120×128 del cuerpo. */
const POSE_SHAPES: Readonly<Record<MascotPose, PoseShape>> = {
  rest: { arms: "M26 68 Q8 65 12 82 M94 68 Q112 65 108 82" },
  celebrate: {
    arms: "M24 62 Q8 56 11 36 M96 62 Q112 56 109 36",
    mouth: "M50 64 Q60 73 70 64",
  },
};

// La pose solo refleja el estado que ya calcula el motor; no añade señales propias.
function poseFor(state: EyeState): MascotPose {
  return state === "success" ? "celebrate" : "rest";
}

/**
 * Solo la figura grande (Inicio vacío, primeros pasos) sigue al puntero: ahí es el contenido.
 * En la barra lateral un ojo que se mueve sin parar distraería del trabajo.
 */
const FOLLOWING_SIZE: EyeSize = "lg";

/** Estados que merecen llamar la atención al aparecer: riesgo alto, archivo ilegible y éxito. */
const NOTEWORTHY: ReadonlySet<EyeState> = new Set<EyeState>(["alert", "error", "success"]);

const FEET_PATH = "M39 100 L33 116 Q40 121 49 115 L51 103 M69 103 L71 115 Q80 121 87 116 L81 100";
const SHELL_PATH =
  "M60 12 C89 12 102 32 102 62 L98 87 Q93 107 60 107 Q27 107 22 87 L18 62 C18 32 31 12 60 12 Z";
const CREST_PATH = "M53 13 Q46 2 39 8 M60 12 Q63 3 70 5";
const PAGE_PATH = "M48 80 H73 V98 H48 Z";
const PAGE_LINES_PATH = "M54 86 H66 M54 91 H62";

/** El cuerpo dibujado según la pose; el ojo va encima, en su propia capa. */
function MascotBody({ pose }: { readonly pose: MascotPose }) {
  const { arms, mouth } = POSE_SHAPES[pose];
  return (
    <svg className={styles.body} viewBox="0 0 120 128" aria-hidden="true">
      <path className={styles.limbs} d={arms} />
      <path className={styles.feet} d={FEET_PATH} />
      <path className={styles.shell} d={SHELL_PATH} />
      <path className={styles.crest} d={CREST_PATH} />
      <path className={styles.page} d={PAGE_PATH} />
      <path className={styles.pageLines} d={PAGE_LINES_PATH} />
      {mouth && <path className={styles.mouth} d={mouth} />}
    </svg>
  );
}

/** El personaje reutiliza las expresiones del ojo; el logo mantiene su forma original. */
export function ArgusMascot({ state, size = "sm", label }: ArgusMascotProps) {
  const figure = useRef<HTMLSpanElement>(null);
  usePointerGaze(figure, size === FOLLOWING_SIZE);
  usePokeReaction(figure);
  useReactionOnChange(figure, state, NOTEWORTHY.has(state));
  const pose = poseFor(state);
  return (
    <span
      ref={figure}
      className={joinClassNames(styles.mascot, styles[size])}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-state={state}
      data-pose={pose}
    >
      <MascotBody pose={pose} />
      <span className={styles.face}>
        <ArgusEye state={state} isFluid />
      </span>
    </span>
  );
}
