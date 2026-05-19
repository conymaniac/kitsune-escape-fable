/// <reference types="vite/client" />
/**
 * Gemini-generated sprite variant.
 *
 * Loads PNGs from /src/art/gemini/ at boot time (via Vite's `import.meta.glob`),
 * rescales each into the canonical sprite dimensions, and registers them under
 * the same texture keys the rest of the codebase already uses. Any texture key
 * not covered by a PNG falls back to the handdrawn implementation, which in
 * turn falls back to procedural if needed.
 *
 * To use: set `ART_STYLE = "gemini"` in sprites.ts (or
 * `window.KITSUNE_ART_STYLE = "gemini"` before boot).
 *
 * To add new PNGs: drop them into /src/art/gemini/ with one of the filenames
 * listed in FILENAME_TO_KEY (see ./dimensions.ts) and rebuild.
 */

import Phaser from "phaser";
import {
  SPRITE_DIMENSIONS,
  FILENAME_TO_KEY,
  KEYS_WITH_OPAQUE_BG,
  WHITE_KEY_THRESHOLD,
} from "./dimensions";
import { generateAllSprites as handdrawnGen } from "./sprites.handdrawn";

// Vite eager glob — resolves every PNG URL at build time into a string.
// The `?url` query tells Vite to return the resolved URL rather than the
// decoded module. Unicode filenames work as long as the resolver can read them.
const geminiModules = import.meta.glob("./gemini/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

interface PngEntry {
  /** Final texture key the rest of the game uses (e.g. "mizumi-human"). */
  key: string;
  /** Temporary key the raw image is loaded under before being rescaled. */
  srcKey: string;
  /** Resolved URL from Vite. */
  url: string;
}

/**
 * Build the manifest by intersecting the on-disk PNG set with the
 * FILENAME_TO_KEY map. Unknown filenames are logged once and ignored.
 */
function buildManifest(): PngEntry[] {
  const out: PngEntry[] = [];
  for (const [path, url] of Object.entries(geminiModules)) {
    const filename = path.split("/").pop() ?? "";
    const key = FILENAME_TO_KEY[filename];
    if (!key) {
      console.warn(`[sprites.gemini] No key mapping for filename "${filename}"`);
      continue;
    }
    out.push({ key, srcKey: `__gemini_${key}`, url });
  }
  return out;
}

const PNG_MANIFEST: PngEntry[] = buildManifest();

/**
 * Queue async image loads. Call from BootScene.preload().
 */
export function preloadAllSprites(scene: Phaser.Scene): void {
  // Phaser's loader dedupes by key, so requeuing is safe.
  for (const entry of PNG_MANIFEST) {
    if (scene.textures.exists(entry.key)) continue;
    scene.load.image(entry.srcKey, entry.url);
  }
}

/**
 * Chroma-key pass: turn near-white pixels into transparent ones.
 *
 * The image generators (Gemini, ChatGPT) produce subjects on solid white
 * backgrounds. To make them composite cleanly over scene backdrops we walk
 * the pixel buffer once and zero the alpha of anything that's "near white"
 * (all three channels above WHITE_KEY_THRESHOLD). The threshold is tuned so
 * that cream skin (#F3E9D2, B=210) is preserved.
 *
 * Skipped for keys in KEYS_WITH_OPAQUE_BG — those are intentional full-frame
 * backgrounds (lake, interior wall) that need to stay solid.
 */
function applyWhiteKey(canvas: Phaser.Textures.CanvasTexture): void {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.context;
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const t = WHITE_KEY_THRESHOLD;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > t && data[i + 1] > t && data[i + 2] > t) {
      data[i + 3] = 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  canvas.refresh();
}

/**
 * Resize loaded PNGs into canonical sprite dimensions and register them under
 * the final keys. Then call handdrawnGen() so any missing key gets a fallback.
 *
 * Idempotent: running twice is a no-op for keys that already exist.
 */
export function generateAllSprites(scene: Phaser.Scene): void {
  for (const entry of PNG_MANIFEST) {
    if (scene.textures.exists(entry.key)) continue; // already registered
    if (!scene.textures.exists(entry.srcKey)) continue; // load failed

    const dims = SPRITE_DIMENSIONS[entry.key];
    if (!dims) continue;
    const [w, h] = dims;

    const src = scene.textures.get(entry.srcKey).getSourceImage();
    if (
      !(src instanceof HTMLImageElement) &&
      !(src instanceof HTMLCanvasElement)
    ) {
      continue;
    }

    const canvas = scene.textures.createCanvas(entry.key, w, h);
    if (!canvas) continue;
    // High-quality downscale; PNGs from Gemini/ChatGPT are typically 800–1700 px.
    canvas.context.imageSmoothingEnabled = true;
    canvas.context.imageSmoothingQuality = "high";
    canvas.context.drawImage(src, 0, 0, w, h);

    // For everything that's NOT an intentional backdrop, key out the white
    // background so the subject sits on its silhouette only.
    if (!KEYS_WITH_OPAQUE_BG.has(entry.key)) {
      applyWhiteKey(canvas);
    } else {
      canvas.refresh();
    }

    // Drop the temporary high-res source so we don't keep huge bitmaps in RAM.
    scene.textures.remove(entry.srcKey);
  }

  // Fill in any missing keys with the procedural / handdrawn fallback.
  // bake() inside handdrawn skips keys that already exist, so this is safe.
  handdrawnGen(scene);
}
