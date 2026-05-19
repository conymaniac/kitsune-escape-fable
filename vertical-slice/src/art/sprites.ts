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
 * To pick a style: change `ART_STYLE` below, or set
 *   `window.KITSUNE_ART_STYLE = "procedural" | "handdrawn" | "gemini" | "chatgpt"`
 * in the browser console BEFORE the page is reloaded.
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

/** Default style. Override at runtime via window.KITSUNE_ART_STYLE. */
export const ART_STYLE: ArtStyle = "gemini";

declare global {
  interface Window {
    KITSUNE_ART_STYLE?: ArtStyle;
  }
}

function activeStyle(): ArtStyle {
  if (typeof window !== "undefined" && window.KITSUNE_ART_STYLE) {
    return window.KITSUNE_ART_STYLE;
  }
  return ART_STYLE;
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
