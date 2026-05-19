/**
 * Sprite router.
 *
 * Four implementations of the same texture set live side by side:
 *   - sprites.procedural.ts  — clean geometric placeholders (the original)
 *   - sprites.handdrawn.ts   — sketchy, hand-illustrated feel
 *   - sprites.gemini.ts      — loads PNGs from /src/art/gemini/
 *   - sprites.chatgpt.ts     — loads PNGs from /src/art/chatgpt/, cascades to gemini
 *
 * Every variant exports `generateAllSprites(scene)` and produces textures
 * under the same keys (mizumi-human, willow-tree, …). PNG variants additionally
 * expose `preloadAllSprites(scene)` so BootScene can queue async file loads
 * in its preload phase.
 *
 * Style selection (in precedence order):
 *   1. `window.KITSUNE_ART_STYLE = "procedural" | "gemini" | "chatgpt" | "handdrawn"`
 *      — runtime override in the dev console (set BEFORE the page reloads).
 *   2. `localStorage["kitsune-art-style"]` — persisted user pick from the
 *      Title-screen UI switcher.
 *   3. The DEFAULT_STYLE constant defined below.
 *
 * Public API:
 *   - getArtStyle() / setArtStyle(s)   — read & persist the active style
 *   - SELECTABLE_STYLES / STYLE_LABEL  — drive the Title-screen switcher
 *   - preloadAllSprites(scene)         — queue async PNG loads in preload()
 *   - generateAllSprites(scene)        — build textures in create()
 *
 * Rollback: any style can fall back to handdrawn/procedural for missing keys.
 */

import Phaser from "phaser";
import { generateAllSprites as proceduralGen } from "./sprites.procedural";
import { generateAllSprites as handdrawnGen } from "./sprites.handdrawn";
import {
  preloadAllSprites as geminiPreload,
  generateAllSprites as geminiGen,
} from "./sprites.gemini";
import {
  preloadAllSprites as chatgptPreload,
  generateAllSprites as chatgptGen,
} from "./sprites.chatgpt";

export type ArtStyle = "procedural" | "handdrawn" | "gemini" | "chatgpt";

/**
 * User-facing styles. Used by the in-game switcher on the title screen.
 * `handdrawn` is intentionally NOT exposed — it remains as a silent fallback
 * for missing keys inside the gemini / chatgpt cascade.
 */
export const SELECTABLE_STYLES: ArtStyle[] = ["procedural", "gemini", "chatgpt"];

/** Display label for the title-screen switcher. */
export const STYLE_LABEL: Record<ArtStyle, string> = {
  procedural: "Procedural",
  handdrawn: "Hand-drawn",
  gemini: "Gemini",
  chatgpt: "ChatGPT",
};

/** Default style if nothing is stored / overridden. */
const DEFAULT_STYLE: ArtStyle = "gemini";
const STORAGE_KEY = "kitsune-art-style";

declare global {
  interface Window {
    KITSUNE_ART_STYLE?: ArtStyle;
  }
}

function isArtStyle(v: unknown): v is ArtStyle {
  return (
    v === "procedural" ||
    v === "handdrawn" ||
    v === "gemini" ||
    v === "chatgpt"
  );
}

function readStoredStyle(): ArtStyle | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isArtStyle(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the active art style. Precedence:
 *   1. window.KITSUNE_ART_STYLE (dev console override)
 *   2. localStorage["kitsune-art-style"] (user pick from UI switcher)
 *   3. DEFAULT_STYLE
 */
export function getArtStyle(): ArtStyle {
  if (typeof window !== "undefined" && isArtStyle(window.KITSUNE_ART_STYLE)) {
    return window.KITSUNE_ART_STYLE;
  }
  const stored = readStoredStyle();
  if (stored) return stored;
  return DEFAULT_STYLE;
}

/**
 * Persist a new art style. Caller is responsible for triggering a reload —
 * sprite textures are baked once at BootScene, so a full page reload is the
 * cleanest way to swap them out.
 */
export function setArtStyle(style: ArtStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, style);
  } catch {
    // ignore
  }
}

function activeStyle(): ArtStyle {
  return getArtStyle();
}

/**
 * Queue any async asset loads required by the active style.
 * Called from BootScene.preload(). No-op for procedural / handdrawn.
 */
export function preloadAllSprites(scene: Phaser.Scene): void {
  const style = activeStyle();
  if (style === "gemini") {
    geminiPreload(scene);
  } else if (style === "chatgpt") {
    chatgptPreload(scene);
  }
}

/**
 * Generate / register every sprite texture used by the game.
 * Called from BootScene.create() after preload() has resolved.
 */
export function generateAllSprites(scene: Phaser.Scene): void {
  const style = activeStyle();
  switch (style) {
    case "procedural":
      proceduralGen(scene);
      return;
    case "handdrawn":
      handdrawnGen(scene);
      return;
    case "gemini":
      geminiGen(scene);
      return;
    case "chatgpt":
      chatgptGen(scene);
      return;
  }
}
