/**
 * MuteIndicator
 *
 * Reusable helper that attaches an "M to mute" toggle to any Phaser scene.
 *
 * Renders a tiny top-right indicator: "♪" when audio is on, "✕" when muted.
 * Wires M to AudioSystem.toggleMute() and updates the indicator in sync.
 *
 * Depth is 1100 so it sits above the dialog panel (1000) and HUD chrome.
 */

import Phaser from "phaser";
import { Palette, css } from "@/art/palette";
import { AudioSystem } from "@/systems/AudioSystem";

const INDICATOR_PADDING = 14;

export function attachMuteIndicator(
  scene: Phaser.Scene,
  audio: AudioSystem,
): Phaser.GameObjects.Text {
  const { width } = scene.scale;

  const indicator = scene.add.text(
    width - INDICATOR_PADDING,
    INDICATOR_PADDING,
    audio.isMuted() ? "✕" : "♪",
    {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: audio.isMuted()
        ? css(Palette.orange)
        : css(Palette.gold),
      fontStyle: "bold",
    },
  );
  indicator.setOrigin(1, 0);
  indicator.setDepth(1100);
  indicator.setScrollFactor(0);

  // Allow mouse click as an alternate to the M key.
  indicator.setInteractive({ useHandCursor: true });
  const toggle = (): void => {
    const muted = audio.toggleMute();
    indicator.setText(muted ? "✕" : "♪");
    indicator.setColor(muted ? css(Palette.orange) : css(Palette.gold));
  };
  indicator.on("pointerdown", toggle);

  scene.input.keyboard?.on("keydown-M", toggle);

  // Clean up listeners on shutdown so re-entering doesn't leak handlers.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.input.keyboard?.off("keydown-M", toggle);
  });

  return indicator;
}
