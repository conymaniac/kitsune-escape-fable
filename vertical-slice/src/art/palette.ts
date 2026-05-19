/**
 * Visual palette extracted from the Kitsune Escape pitch deck.
 * All scenes and entities reference these constants for color consistency.
 *
 * Hex numbers as 0xRRGGBB for Phaser. String versions for CSS / HTML overlays.
 */

export const Palette = {
  // Background tones
  cream: 0xf3e9d2,
  creamSoft: 0xeddda5,
  paper: 0xe8dcc0,

  // Accent (orange / red clay)
  orange: 0xe26a2c,
  orangeDeep: 0xc0441f,
  redClay: 0xb13e2a,
  gold: 0xf2c14e,

  // Darks
  dark: 0x1f1809,
  darkSoft: 0x2b1f0e,
  night: 0x1a1226,
  nightDeep: 0x0d0814,

  // Nature
  willow: 0x5a7048,
  leaf: 0x6b7f44,
  leafLight: 0x8aab68,
  bark: 0x6f4e2a,
  barkDark: 0x3e2c1c,

  // Character / kimono accents
  purple: 0x7a4c80,
  purpleDeep: 0x4d2a55,
  foxOrange: 0xd86b3f,
  foxOrangeLight: 0xe88e5e,

  // Utility
  white: 0xffffff,
  black: 0x000000,
} as const;

export type PaletteKey = keyof typeof Palette;

/** Convert Phaser hex number to a CSS string */
export const css = (color: number): string =>
  "#" + color.toString(16).padStart(6, "0");
