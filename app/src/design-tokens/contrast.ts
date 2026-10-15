// Fórmulas de WCAG 2.x: luminancia relativa sRGB y razón de contraste.
const LINEAR_THRESHOLD = 0.04045;
const LOW_DIVISOR = 12.92;
const GAMMA_OFFSET = 0.055;
const GAMMA_DIVISOR = 1.055;
const GAMMA = 2.4;
const CHANNEL_MAX = 255;
const CHANNEL_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
const FLARE = 0.05;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CHANNEL_HEX_LENGTH = 2;

function linearChannel(hexPair: string): number {
  const channel = Number.parseInt(hexPair, 16) / CHANNEL_MAX;
  return channel <= LINEAR_THRESHOLD
    ? channel / LOW_DIVISOR
    : ((channel + GAMMA_OFFSET) / GAMMA_DIVISOR) ** GAMMA;
}

function hexChannels(hexColor: string): readonly string[] {
  if (!HEX_COLOR.test(hexColor)) throw new Error(`Color no hexadecimal: ${hexColor}`);
  return CHANNEL_WEIGHTS.map((_, index) =>
    hexColor.slice(1 + index * CHANNEL_HEX_LENGTH, 1 + (index + 1) * CHANNEL_HEX_LENGTH),
  );
}

export function relativeLuminance(hexColor: string): number {
  return hexChannels(hexColor).reduce(
    (sum, channel, index) => sum + (CHANNEL_WEIGHTS[index] ?? 0) * linearChannel(channel),
    0,
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + FLARE) / (Math.min(first, second) + FLARE);
}
