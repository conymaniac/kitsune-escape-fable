/**
 * EndScene
 *
 * Outro card after the player completes the willow quest.
 * Reveals the dead body / lore, hints at the bigger arc.
 */

import Phaser from "phaser";
import { SceneKey } from "@/types";
import { Palette, css } from "@/art/palette";
import { t } from "@/i18n";
import { AudioSystem } from "@/systems/AudioSystem";
import { attachMuteIndicator } from "@/systems/MuteIndicator";

const LINE_KEYS = [
  "end.line.1",
  "end.line.2",
  "end.line.3",
  "end.line.4",
  "end.line.5",
  "end.line.6",
  "end.line.7",
  "end.line.8",
  "end.line.9",
  "end.line.10",
] as const;

export class EndScene extends Phaser.Scene {
  private audio!: AudioSystem;

  constructor() {
    super(SceneKey.End);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(css(Palette.dark));
    this.cameras.main.fadeIn(900, 0, 0, 0);

    // Return to the title-theme (same key as TitleScene). AudioSystem
    // crossfades from whatever was playing (likely music-willow).
    this.audio = new AudioSystem(this);
    this.audio.playMusic("music-title");
    this.registry.set("audio", this.audio);
    attachMuteIndicator(this, this.audio);

    // Decorative leaves silhouette
    const decor = this.add.graphics();
    decor.fillStyle(Palette.willow, 0.6);
    decor.fillTriangle(0, height, 200, height, 100, height - 280);
    decor.fillTriangle(width, height, width - 200, height, width - 100, height - 280);

    // Title
    this.add
      .text(width / 2, 90, t("ui.end.title"), {
        fontFamily: "Georgia, serif",
        fontSize: "72px",
        color: css(Palette.gold),
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // We classify lines by their localized "Medallion" prefix so we can
    // highlight that one in orange. Since the locale may change the prefix
    // (e.g. "Odemčen medailon"), we look up a sentinel CZ/EN-aware label.
    const medallionLine = t("end.line.5");

    // Lines — resolve each translation key in order.
    const lines: string[] = LINE_KEYS.map((k) => t(k));

    let y = 200;
    for (const ln of lines) {
      const isMedallion = ln === medallionLine && ln.trim().length > 0;
      const isItalic = ln.startsWith("—");
      const t2 = this.add
        .text(width / 2, y, ln, {
          fontFamily: "Georgia, serif",
          fontSize: isMedallion ? "22px" : "20px",
          color: isMedallion ? css(Palette.orange) : css(Palette.cream),
          fontStyle: isItalic ? "italic" : "normal",
          align: "center",
          wordWrap: { width: width - 200 },
        })
        .setOrigin(0.5);
      t2.setAlpha(0);
      this.tweens.add({
        targets: t2,
        alpha: 1,
        delay: 400 + (y - 200) * 4,
        duration: 700,
      });
      y += 42;
    }

    // Restart hint
    const hint = this.add
      .text(width / 2, height - 60, t("ui.end.restart"), {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: css(Palette.cream),
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({ targets: hint, alpha: 0.7, delay: 3500, duration: 600 });

    this.input.keyboard?.once("keydown-R", () => {
      this.registry.events.emit("game-reset");
      this.scene.start(SceneKey.Boot);
    });
    this.input.keyboard?.once("keydown-ESC", () => {
      this.scene.start(SceneKey.Title);
    });
  }
}
