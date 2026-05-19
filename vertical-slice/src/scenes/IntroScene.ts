/**
 * IntroScene
 *
 * Text-based prologue: Mizumi runs away from home, falls asleep,
 * wakes in a forest of yokai. Auto-advancing paragraphs over a
 * dark night backdrop, then transitions to WillowLakeScene.
 */

import Phaser from "phaser";
import { SceneKey } from "@/types";
import { Palette, css } from "@/art/palette";
import { t } from "@/i18n";
import { AudioSystem } from "@/systems/AudioSystem";
import { attachMuteIndicator } from "@/systems/MuteIndicator";

const BEAT_KEYS = [
  "intro.beat.1",
  "intro.beat.2",
  "intro.beat.3",
  "intro.beat.4",
  "intro.beat.5",
  "intro.beat.6",
] as const;

export class IntroScene extends Phaser.Scene {
  private audio!: AudioSystem;

  constructor() {
    super(SceneKey.Intro);
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(css(Palette.nightDeep));

    // Carry the title-theme through the prologue (no crossfade — same key).
    this.audio = new AudioSystem(this);
    this.audio.playMusic("music-title");
    this.registry.set("audio", this.audio);
    attachMuteIndicator(this, this.audio);

    // Background lake
    const bg = this.add.image(width / 2, height / 2, "lake-bg");
    bg.setDisplaySize(width, height);
    bg.setAlpha(0.5);

    // Moon
    this.add.image(width - 180, 130, "moon").setAlpha(0.9);

    // Mizumi silhouette down-right (asleep look)
    const mz = this.add.image(width / 2, height - 140, "mizumi-human");
    mz.setScale(1.4);
    mz.setAngle(15);
    mz.setAlpha(0.85);

    // Resolve beats at scene start (locale will be picked up if it changed
    // earlier; we don't expect language switching mid-intro).
    const beats: string[] = BEAT_KEYS.map((k) => t(k));

    // Text container
    const textObj = this.add.text(width / 2, height / 2 - 40, "", {
      fontFamily: "Georgia, serif",
      fontSize: "28px",
      color: css(Palette.cream),
      align: "center",
      wordWrap: { width: width - 200 },
    });
    textObj.setOrigin(0.5);

    // Skip hint
    const skip = this.add.text(width - 24, height - 24, t("ui.skip"), {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: css(Palette.cream),
    });
    skip.setOrigin(1, 1);
    skip.setAlpha(0.5);

    let beatIdx = 0;
    const showBeat = (): void => {
      if (beatIdx >= beats.length) {
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
          () => this.scene.start(SceneKey.WillowLake)
        );
        return;
      }
      const line = beats[beatIdx++];
      textObj.setText(line);
      textObj.setAlpha(0);
      this.tweens.add({
        targets: textObj,
        alpha: 1,
        duration: 600,
        ease: "Sine.easeOut",
      });
    };

    showBeat();
    this.time.addEvent({ delay: 3000, repeat: beats.length, callback: showBeat });

    // Skip immediately
    this.input.keyboard?.on("keydown-SPACE", () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        () => this.scene.start(SceneKey.WillowLake)
      );
    });
  }
}
