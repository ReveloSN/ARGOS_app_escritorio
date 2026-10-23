/**
 * Formas del ojo de ARGUS (mockup «ARGUS Ojo»): el logo y los estados del asistente de IA.
 * Cada estado cambia la forma, no solo el color (CLAUDE.md §9). Coordenadas en un viewBox de 48.
 */

export type EyeState =
  "logo" | "idle" | "reading" | "success" | "doubt" | "alert" | "explaining" | "error";

export type EyeTone = "accent" | "alert" | "muted";

export interface EyeShape {
  readonly tone: EyeTone;
  readonly outline?: string;
  readonly isFramed?: boolean;
  readonly isDashed?: boolean;
  readonly irisRadius?: number;
  readonly pupilRadius?: number;
  readonly centerX?: number;
  readonly extra?: string;
}

export const EYE_VIEWBOX = "0 0 48 48";
export const EYE_CENTER = 24;
export const FRAME_PATH = "M2 10 V2 H10 M38 2 H46 V10 M46 38 V46 H38 M10 46 H2 V38";

const OPEN = "M4 24 C12 12 36 12 44 24 C36 36 12 36 4 24 Z";
const WIDE = "M3 24 C11 8 37 8 45 24 C37 40 11 40 3 24 Z";
const SQUINT = "M5 24 C13 18 35 18 43 24 C35 30 13 30 5 24 Z";

export const EYE_SHAPES: Readonly<Record<EyeState, EyeShape>> = {
  logo: { tone: "accent", outline: OPEN, pupilRadius: 5, isFramed: true },
  idle: {
    tone: "muted",
    extra: "M6 22 C14 31 34 31 42 22 M14 28.5 L12 33 M24 30.5 V35 M34 28.5 L36 33",
  },
  reading: { tone: "accent", outline: OPEN, irisRadius: 8, pupilRadius: 3.5, isFramed: true },
  success: {
    tone: "accent",
    extra: "M9 28 C15 16 33 16 39 28 M24 7 V11 M12 11 L14.5 14.5 M36 11 L33.5 14.5",
  },
  doubt: {
    tone: "accent",
    outline: SQUINT,
    irisRadius: 5,
    pupilRadius: 2.5,
    extra: "M29 12 L40 15",
  },
  alert: { tone: "alert", outline: WIDE, irisRadius: 9, pupilRadius: 2, isFramed: true },
  explaining: { tone: "accent", outline: OPEN, irisRadius: 7, pupilRadius: 3, centerX: 28 },
  error: { tone: "muted", outline: OPEN, isDashed: true, extra: "M18 24 H30" },
};
