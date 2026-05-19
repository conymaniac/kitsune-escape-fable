/**
 * Canonical sprite dimensions.
 *
 * These match the dimensions baked into sprites.procedural.ts / sprites.handdrawn.ts,
 * and they're the sizes scene code expects when positioning game objects.
 * External-asset variants (gemini, chatgpt) resize their source PNGs to these
 * exact dimensions at load time, so the scenes work without changes.
 *
 * If you bump a dimension here, check:
 *   - src/entities/Player.ts — body sizes for mizumi-* are computed as a
 *     percentage of texture dimensions, so this just works.
 *   - src/scenes/CottageScene.ts — door/window offset constants for cottage-ext
 *     are absolute pixel offsets and may need to be re-tuned.
 */

export const SPRITE_DIMENSIONS: Record<string, [number, number]> = {
  // Characters — sized so Mizumi is readable next to the willow / Yanagi.
  "mizumi-human": [80, 120],
  "mizumi-fox": [96, 60],
  "yanagi-onna": [90, 136],

  // Lying body — reveal sprite under the willow after the quest climax.
  "yanagi-dead": [200, 70],

  // Environment.
  "willow-tree": [300, 420],
  "cottage-ext": [600, 440],
  "cottage-int-bg": [1280, 720],
  "lake-bg": [1920, 720],
  moon: [120, 120],
  lantern: [24, 40],

  // Props (cottage interior storytelling).
  futon: [150, 70],
  "dining-table": [140, 70],
  papers: [80, 60],
  dagger: [48, 24],
  sandals: [70, 32],

  // UI / FX.
  "window-glow": [120, 140],
  particle: [8, 8],
};

/**
 * Map from Gemini / ChatGPT generated filenames (matching the prompt pack we
 * shipped) to internal texture keys. Used by sprites.gemini.ts and
 * sprites.chatgpt.ts — both pull from this single source of truth.
 */
export const FILENAME_TO_KEY: Record<string, string> = {
  // Characters.
  "Mizumi — human form.png": "mizumi-human",
  "Mizumi — kitsune (fox) form.png": "mizumi-fox",
  "Yanagi onna — the willow ghost.png": "yanagi-onna",
  "Yanagi onna — dead.png": "yanagi-dead",

  // Environment.
  "Willow tree.png": "willow-tree",
  "Cottage exterior at night.png": "cottage-ext",
  "Cottage interior — abandoned.png": "cottage-int-bg",
  "Lake background — night.png": "lake-bg",
  "Moon.png": "moon",
  "Paper lantern.png": "lantern",

  // Props.
  "Futon.png": "futon",
  "Dining table.png": "dining-table",
  "Papers.png": "papers",
  "Dagger.png": "dagger",
  "Sandals.png": "sandals",

  // UI / FX.
  "Window glow.png": "window-glow",
  "Particle.png": "particle",
};

/**
 * Keys whose PNGs are full-frame backgrounds that should KEEP their white /
 * solid bg (i.e. don't try to chroma-key away the white). Everything else
 * gets the "near-white → transparent" pass applied at load time, so isolated
 * subjects (characters, props) composite cleanly over scenes.
 *
 * Add a key here if its PNG is meant to fill the screen as a backdrop.
 */
export const KEYS_WITH_OPAQUE_BG: ReadonlySet<string> = new Set([
  "lake-bg",
  "cottage-int-bg",
]);

/**
 * "Near white" RGB threshold. Pixels where R, G, AND B are all above this
 * value have their alpha set to 0 in the load-time chroma-key step. Anti-
 * aliased subject edges that fall just below this are preserved.
 *
 * Cream tone (#F3E9D2 = 243,233,210) has B=210 → NOT keyed.
 * Pure white background (255,255,255) → keyed.
 */
export const WHITE_KEY_THRESHOLD = 235;
