/**
 * BootScene
 * - Generates all procedural sprites
 * - Preloads audio assets listed in AudioManifest
 * - Sets up shared registry state
 * - Hands off to TitleScene
 */

import Phaser from "phaser";
import { SceneKey, RegistryKey, initialGameState } from "@/types";
import { generateAllSprites, preloadAllSprites } from "@/art/sprites";
import { AudioManifest } from "@/systems/AudioSystem";
import { Palette, css } from "@/art/palette";

export class BootScene extends Phaser.Scene {
  private loadingText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SceneKey.Boot);
  }

  preload(): void {
    // Queue every audio manifest entry. Phaser dedupes by key, so re-entering
    // the boot scene after a reset is safe.
    for (const entry of AudioManifest) {
      if (!this.cache.audio.exists(entry.key)) {
        this.load.audio(entry.key, entry.path);
      }
    }

    // Queue any sprite PNGs required by the active art style.
    // Procedural / handdrawn styles are no-op here; gemini / chatgpt queue
    // their PNG files for async loading.
    preloadAllSprites(this);

    // Show a tiny "Loading…" message only if the loader actually has work to
    // do. Audio and PNG fetches both happen in here.
    if (this.load.totalToLoad > 0) {
      const { width, height } = this.scale;
      this.loadingText = this.add
        .text(width / 2, height / 2, "Loading…", {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: css(Palette.cream),
          fontStyle: "italic",
        })
        .setOrigin(0.5, 0.5);
      this.cameras.main.setBackgroundColor(css(Palette.nightDeep));
    }
  }

  create(): void {
    // Initialize global game state if not yet present
    if (!this.registry.has(RegistryKey.GameState)) {
      this.registry.set(RegistryKey.GameState, initialGameState());
    }
    this.registry.set(RegistryKey.DialogActive, false);

    // Generate all textures from src/art/sprites.ts
    generateAllSprites(this);

    // Clear loading text (if shown).
    if (this.loadingText) {
      this.loadingText.destroy();
      this.loadingText = null;
    }

    // Move on
    this.scene.start(SceneKey.Title);
  }
}
