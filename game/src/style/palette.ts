/**
 * THE palette — single source of color truth for the whole slice.
 * ~24 named hex constants tuned for one indigo night by a spectral lake.
 * Stream A may fine-tune values; names and ownership never change.
 *
 * Style-guide intent:
 * - The night is deep indigo, never pure black; ink is reserved for outlines
 *   and the impassable pine ridge.
 * - Exactly three warm sources exist in the world: the cottage shoji glow,
 *   lanterns, and (at the very end) the vermillion medallion bloom.
 * - Kitsunebi live in spectral violet/teal; the woman's kimono is canon purple.
 */
export const palette = {
  // — night & ink —
  nightDeep: 0x0e1226, // deepest sky/zenith, scene clear color
  nightIndigo: 0x1a1f3a, // primary night indigo (mid sky, distant fog)
  nightHorizon: 0x2a3560, // horizon band, hemisphere sky tint
  inkBlack: 0x16131a, // charcoal ink — outlines, pine ridge silhouettes
  inkCharcoal: 0x2b2733, // softer ink — rocks, shadowed wood

  // — paper & light —
  paperBone: 0xe9e1cc, // bone/cream washi paper, UI text, ambient whispers
  paperAged: 0xd8c7a3, // aged paper, diary pages, scroll fills
  moonlight: 0xbfd4ff, // moonlight blue-white (key light, glints)
  lanternAmber: 0xffb55e, // warm amber lantern glow
  shojiGlow: 0xffd9a0, // warm shoji window glow (the cottage's pull-light)

  // — fox & vermillion —
  foxOrange: 0xd97c33, // vermillion fox-orange — Mizumi's fox coat
  vermillion: 0xc6402e, // deep vermillion — medallion stamp, torii accents
  foxCream: 0xe8d9bd, // fox chest/tail-tip cream

  // — earth & wood —
  earthBrown: 0x6b5440, // muted earth — paths, mounds
  earthDark: 0x40332a, // dark earth — creek banks, shadowed ground
  thatchStraw: 0xa3814b, // thatched roof straw
  woodDark: 0x4b3727, // dark wood — trunks, beams, dock posts
  woodWarm: 0x7d5c3c, // warm wood — engawa, furniture, shutters

  // — vegetation —
  grassNight: 0x3c4f44, // night grass ground tone
  willowGreen: 0x6e8a72, // willow leaf — cold, desaturated
  willowDeep: 0x44584a, // willow canopy depths, reeds

  // — water —
  lakeDeep: 0x183450, // lake deep water
  lakeShallow: 0x2d5d72, // lake shallows / shore ring

  // — spirits —
  spectralViolet: 0x9c79d8, // kitsunebi violet, spirit shimmer
  spectralTeal: 0x52c8b8, // kitsunebi teal, sonar ring, lake glow
  smokeWhite: 0xe8eef4, // ghost smoke, dissolve, moon disc

  // — cloth —
  kimonoPurple: 0x6f4d92, // the woman's floral kimono (canon purple)
  tatamiStraw: 0x8d8a5e, // tatami mats
} as const;

/** A named color in THE palette. */
export type PaletteKey = keyof typeof palette;

/** Hex number for a palette key. */
export function paletteHex(key: PaletteKey): number {
  return palette[key];
}

/** CSS color string ("#rrggbb") for a palette key — for DOM UI accents. */
export function paletteCss(key: PaletteKey): string {
  return `#${palette[key].toString(16).padStart(6, '0')}`;
}
