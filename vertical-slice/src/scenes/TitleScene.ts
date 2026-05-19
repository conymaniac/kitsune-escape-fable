/**
 * TitleScene
 *
 * Branded title screen using the pitch's typography and palette.
 * Press SPACE / click to begin.
 *
 * Includes a language toggle (EN | CS) in the top-right. Clicking either
 * label flips the locale and restarts the scene so every label re-renders
 * in the chosen language.
 */

import Phaser from "phaser";
import { SceneKey } from "@/types";
import { Palette, css } from "@/art/palette";
import { getLocale, setLocale, t, type Locale } from "@/i18n";
import { AudioSystem } from "@/systems/AudioSystem";
import { attachMuteIndicator } from "@/systems/MuteIndicator";

export class TitleScene extends Phaser.Scene {
  private audio!: AudioSystem;

  constructor() {
    super(SceneKey.Title);
  }

  create(): void {
    const { width, height } = this.scale;

    // Background — orange-red clay color block from pitch's overview slide
    this.cameras.main.setBackgroundColor(css(Palette.redClay));

    // --- Audio: start (or continue) the title theme --------------------------
    this.audio = new AudioSystem(this);
    this.audio.playMusic("music-title");
    this.registry.set("audio", this.audio);
    attachMuteIndicator(this, this.audio);

    // Decorative texture (subtle noise rectangles)
    const noise = this.add.graphics();
    noise.fillStyle(Palette.orangeDeep, 0.4);
    for (let i = 0; i < 400; i++) {
      noise.fillRect(
        Math.random() * width,
        Math.random() * height,
        2,
        2
      );
    }

    // Title
    const title = this.add.text(width / 2, height / 2 - 80, t("ui.title.title"), {
      fontFamily: "Georgia, serif",
      fontSize: "84px",
      color: css(Palette.creamSoft),
      fontStyle: "bold italic",
    });
    title.setOrigin(0.5);
    title.setStroke(css(Palette.dark), 6);

    // Subtitle
    const sub = this.add.text(
      width / 2,
      height / 2 - 10,
      t("ui.title.subtitle"),
      {
        fontFamily: "Georgia, serif",
        fontSize: "22px",
        color: css(Palette.cream),
        fontStyle: "italic",
      }
    );
    sub.setOrigin(0.5);

    // Press to start
    const start = this.add.text(
      width / 2,
      height / 2 + 90,
      t("ui.title.start"),
      {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: css(Palette.gold),
      }
    );
    start.setOrigin(0.5);

    this.tweens.add({
      targets: start,
      alpha: 0.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // Controls hint
    this.add
      .text(width / 2, height - 60, t("ui.title.controls"), {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: css(Palette.cream),
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    // Tiny fox icon top-left (callback to logo on slide 2)
    const fox = this.add.image(60, 60, "mizumi-fox");
    fox.setScale(0.7);

    // --- Language toggle (top-right) -------------------------------------
    this.buildLanguageToggle(width);

    const begin = (): void => {
      this.scene.start(SceneKey.Intro);
    };
    this.input.keyboard?.once("keydown-SPACE", begin);
    this.input.once("pointerdown", begin);
  }

  /**
   * Two clickable labels — "EN" and "CS" — separated by a divider. The
   * active locale renders in gold; the other in dimmed cream. Clicking
   * either swaps the locale and restarts the scene so labels re-render.
   */
  private buildLanguageToggle(width: number): void {
    const activeLocale = getLocale();
    const baseY = 50;
    const rightPad = 28;

    // Tiny "Language" label above the toggle.
    this.add
      .text(width - rightPad, baseY - 22, t("ui.title.language"), {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: css(Palette.cream),
      })
      .setOrigin(1, 0)
      .setAlpha(0.7);

    const makeLabel = (
      locale: Locale,
      label: string,
      x: number,
    ): Phaser.GameObjects.Text => {
      const isActive = locale === activeLocale;
      const txt = this.add.text(x, baseY, label, {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        fontStyle: isActive ? "bold" : "normal",
        color: isActive ? css(Palette.gold) : css(Palette.cream),
      });
      txt.setOrigin(1, 0);
      txt.setAlpha(isActive ? 1 : 0.5);
      txt.setInteractive({ useHandCursor: true });
      txt.on("pointerdown", (
        _pointer: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        event?: { stopPropagation: () => void },
      ) => {
        // Prevent click from also bubbling to the global "begin" handler.
        if (event && typeof event.stopPropagation === "function") {
          event.stopPropagation();
        }
        if (locale !== getLocale()) {
          setLocale(locale);
          this.scene.restart();
        }
      });
      return txt;
    };

    // Layout from right to left: CS, "|", EN.
    const csLabel = makeLabel("cs", "CS", width - rightPad);
    const dividerX = csLabel.x - csLabel.width - 6;
    this.add
      .text(dividerX, baseY, "|", {
        fontFamily: "Georgia, serif",
        fontSize: "18px",
        color: css(Palette.cream),
      })
      .setOrigin(1, 0)
      .setAlpha(0.5);
    makeLabel("en", "EN", dividerX - 10);
  }
}
