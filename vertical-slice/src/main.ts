/**
 * Kitsune Escape - Vertical Slice
 * Entry point. Boots Phaser, registers all scenes.
 */

import Phaser from "phaser";
import { Palette, css } from "@/art/palette";

import { BootScene } from "@/scenes/BootScene";
import { TitleScene } from "@/scenes/TitleScene";
import { IntroScene } from "@/scenes/IntroScene";
import { WillowLakeScene } from "@/scenes/WillowLakeScene";
import { CottageScene } from "@/scenes/CottageScene";
import { EndScene } from "@/scenes/EndScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-root",
  backgroundColor: css(Palette.nightDeep),
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 1400 },
      debug: false,
    },
  },
  pixelArt: false,
  roundPixels: true,
  scene: [
    BootScene,
    TitleScene,
    IntroScene,
    WillowLakeScene,
    CottageScene,
    EndScene,
  ],
};

new Phaser.Game(config);

// Reset handler — fired by EndScene "R" key
window.addEventListener("game-reset", () => {
  document.getElementById("quest-banner")?.classList.add("hidden");
});
