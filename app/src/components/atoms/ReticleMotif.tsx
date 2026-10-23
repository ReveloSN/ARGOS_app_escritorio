import { joinClassNames } from "../joinClassNames";
import styles from "./ReticleMotif.module.css";

// Motivo de la identidad: círculos concéntricos y marcas de encuadre (viewBox de 720).
const CENTER = 360;
const SOLID_RADII = [104, 184] as const;
const NEAR_DOTTED_RADIUS = 264;
const FAR_DOTTED_RADIUS = 344;
const TICKS = "M360 0 V72 M360 648 V720 M0 360 H72 M648 360 H720";

interface ReticleMotifProps {
  readonly size: "sm" | "lg";
  readonly className?: string;
}

/**
 * Retícula decorativa detrás del asistente: solo en Inicio, estados vacíos y errores, nunca
 * detrás de documentos ni de tablas (mockup de identidad).
 */
export function ReticleMotif({ size, className }: ReticleMotifProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 720 720"
      className={joinClassNames(styles.reticle, styles[size], className)}
    >
      {SOLID_RADII.map((radius) => (
        <circle key={radius} cx={CENTER} cy={CENTER} r={radius} />
      ))}
      <circle className={styles.near} cx={CENTER} cy={CENTER} r={NEAR_DOTTED_RADIUS} />
      <circle className={styles.far} cx={CENTER} cy={CENTER} r={FAR_DOTTED_RADIUS} />
      <path d={TICKS} />
    </svg>
  );
}
