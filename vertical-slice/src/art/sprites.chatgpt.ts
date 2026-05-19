/// <reference types="vite/client" />
/**
 * ChatGPT-generated sprite variant.
 *
 * Loads PNGs from /src/art/chatgpt/ with the same rescale logic as the Gemini
 * variant. Falls back to the Gemini variant for any key not covered, which in
 * turn falls back to handdrawn → procedural.
 *
 * The intended pattern: ChatGPT for character work (often stronger figure
 * proportions), Gemini for environments, handdrawn/procedural for tiny props.
 *
 * To use: set `ART_STYLE = "chatgpt"` in sprites.ts.
 *
 * To add PNGs: drop them into /src/art/chatgpt/ with one of the filenames
 * listed in FILENAME_TO_KEY (see ./dimensions.ts) and rebuild.
 */

import Phaser from "phaser";
import { SPRITE_DIMENSIONS, FILENAME_TO_KEY } from "./dimensions";
import {
  preloadAllSprites as geminiPreload,
  generateAllSprites as geminiGen,
} from "./sprites.gemini";

const chatgptModules = import.meta.glob("./chatgpt/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

interface PngEntry {
  key: string;
  srcKey: string;
  url: string;
}

function buildManifest(): PngEntry[] {
  const out: PngEntry[] = [];
  for (const [path, url] of Object.entries(chatgptModules)) {
    const filename = path.split("/").pop() ?? "";
    const key = FILENAME_TO_KEY[filename];
    if (!key) {
      console.warn(`[sprites.chatgpt] No key mapping for filename "${filename}"`);
      continue;
    }
    out.push({ key, srcKey: `__chatgpt_${key}`, url });
  }
  return out;
}

const PNG_MANIFEST: PngEntry[] = buildManifest();

/** Queue both ChatGPT (priority) and Gemini (fallback) PNGs. */
export function preloadAllSprites(scene: Phaser.Scene): void {
  // Phaser's loader dedupes by key, so requeuing is safe.
  for (const entry of PNG_MANIFEST) {
    if (scene.textures.exists(entry.key)) continue;
    scene.load.image(entry.srcKey, entry.url);
  }
  // Also queue Gemini PNGs — they'll be consumed by geminiGen() for any key
  // that ChatGPT didn't cover.
  geminiPreload(scene);
}

/**
 * 1) Convert ChatGPT PNGs first (they win on collision).
 * 2) Delegate to geminiGen() for the rest. That function:
 *    - converts Gemini PNGs into any key still missing
 *    - then calls handdrawnGen() for everything else
 */
export function generateAllSprites(scene: Phaser.Scene): void {
  for (const entry of PNG_MANIFEST) {
    if (scene.textures.exists(entry.key)) continue;
    if (!scene.textures.exists(entry.srcKey)) continue;

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
    canvas.context.imageSmoothingEnabled = true;
    canvas.context.imageSmoothingQuality = "high";
    canvas.context.drawImage(src, 0, 0, w, h);
    canvas.refresh();

    scene.textures.remove(entry.srcKey);
  }

  // Cascade — Gemini handles its own PNGs + handdrawn fallback.
  geminiGen(scene);
}
