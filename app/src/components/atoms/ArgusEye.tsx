import { joinClassNames } from "../joinClassNames";
import styles from "./ArgusEye.module.css";
import {
  EYE_CENTER,
  EYE_SHAPES,
  EYE_VIEWBOX,
  FRAME_PATH,
  type EyeShape,
  type EyeState,
} from "./eyeShapes";

export type EyeSize = "sm" | "md" | "lg";

interface ArgusEyeProps {
  readonly state: EyeState;
  readonly size?: EyeSize;
  /** Texto accesible; sin él es decorativo (por ejemplo, junto al nombre «ARGUS» visible). */
  readonly label?: string | undefined;
}

function EyeParts({ shape }: { readonly shape: EyeShape }) {
  const centerX = shape.centerX ?? EYE_CENTER;
  return (
    <>
      {shape.isFramed && <path className={styles.stroke} d={FRAME_PATH} />}
      {shape.outline && (
        <path
          className={joinClassNames(styles.stroke, shape.isDashed && styles.dashed)}
          d={shape.outline}
        />
      )}
      {shape.irisRadius && (
        <circle className={styles.stroke} cx={centerX} cy={EYE_CENTER} r={shape.irisRadius} />
      )}
      {shape.pupilRadius && (
        <circle className={styles.pupil} cx={centerX} cy={EYE_CENTER} r={shape.pupilRadius} />
      )}
      {shape.extra && <path className={styles.stroke} d={shape.extra} />}
    </>
  );
}

/** El ojo de ARGUS: logo de la app y figura del asistente de IA. */
export function ArgusEye({ state, size = "sm", label }: ArgusEyeProps) {
  const shape = EYE_SHAPES[state];
  const accessibility = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <svg
      viewBox={EYE_VIEWBOX}
      data-state={state}
      className={joinClassNames(styles.eye, styles[size], styles[shape.tone])}
      {...accessibility}
    >
      <EyeParts shape={shape} />
    </svg>
  );
}
