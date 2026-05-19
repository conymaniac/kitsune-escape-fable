/**
 * Canonical sprite dimensions.
 *
 * These match the dimensions baked into sprites.procedural.ts / sprites.handdrawn.ts,
 * and they're the sizes scene code expects when positioning game objects.
 * External-asset variants (gemini, chatgpt) resize their source PNGs to these
 * exact dimensions at load time, so the scenes work without changes.
 */

export const SPRITE_DIMENSIONS: Record<string, [number, number]> = {
  "mizumi-human": [64, 96],
  "mizumi-fox": [64, 40],
  "yanagi-onna": [72, 110],
  "willow-tree": [300, 420],
  "cottage-ext": [420, 300],
  "cottage-int-bg": [1280, 720],
  futon: [150, 70],
  "dining-table": [140, 70],
  papers: [80, 60],
  dagger: [48, 24],
  sandals: [70, 32],
  "window-glow": [120, 140],
  "lake-bg": [1920, 720],
  moon: [120, 120],
  lantern: [24, 40],
  particle: [8, 8],
};

/**
 * Map from Gemini / ChatGPT generated filenames (matching the prompt pack we
 * shipped) to internal texture keys. Used by sprites.gemini.ts and
 * sprites.chatgpt.ts — both pull from this single source of truth.
 */
export const FILENAME_TO_KEY: Record<string, string> = {
  "Mizumi — human form.png": "mizumi-human",
  "Mizumi — kitsune (fox) form.png": "mizumi-fox",
  "Yanagi onna — the willow ghost.png": "yanagi-onna",
  "Willow tree.png": "willow-tree",
  "Cottage exterior at night.png": "cottage-ext",
  "Cottage interior — abandoned.png": "cottage-int-bg",
  "Lake background — night.png": "lake-bg",
  "Moon.png": "moon",
  "Paper lantern.png": "lantern",
  // Smaller props — only fill these if the user generates them; otherwise
  // procedural / handdrawn fallback covers them.
  "Futon.png": "futon",
  "Dining table.png": "dining-table",
  "Papers.png": "papers",
  "Dagger.png": "dagger",
  "Sandals.png": "sandals",
  "Window glow.png": "window-glow",
  "Particle.png": "particle",
};
