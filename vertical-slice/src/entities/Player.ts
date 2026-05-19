// Player: Mizumi — side-scroller character with human/fox transformation.
// Two forms with different physics bodies and movement tunables. F triggers
// transformation, which emits a scene event so scenes can gate progression.

import Phaser from "phaser";
import {
  KitsuneForm,
  PlayerInput,
  RegistryKey,
  GameState,
  GameEvent,
} from "@/types";
import { Palette } from "@/art/palette";
import type { AudioSystem } from "@/systems/AudioSystem";

// --- Footstep throttle ---
const FOOTSTEP_INTERVAL_MS = 350;

// --- Movement tunables (px/s) ---
const SPEED_HUMAN = 200;
const SPEED_FOX = 240;
const JUMP_HUMAN = -550;
const JUMP_FOX = -620;

// --- Transform visuals ---
const TINT_DURATION_MS = 150;
const PARTICLE_COUNT = 14;
const PARTICLE_LIFETIME_MS = 450;
const PARTICLE_SPEED = 110;

// --- Body shapes per form: { width, height, offsetX, offsetY } ---
interface BodyShape {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}
const HUMAN_BODY: BodyShape = { width: 32, height: 88, offsetX: 16, offsetY: 4 };
const FOX_BODY: BodyShape = { width: 50, height: 28, offsetX: 7, offsetY: 10 };

export class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  form: KitsuneForm = "human";

  /** Game time (ms) at which the next footstep SFX is allowed. */
  private nextFootstepAt = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Always create with the human texture first; setForm will swap if needed.
    this.sprite = scene.physics.add.sprite(x, y, "mizumi-human");
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setOrigin(0.5, 0.5);

    // Resume in whichever form the registry remembers (default human).
    const state = scene.registry.get(RegistryKey.GameState) as
      | GameState
      | undefined;
    const startForm: KitsuneForm = state?.currentForm ?? "human";

    // Apply initial body shape silently (no transform event on construct).
    this.form = startForm;
    this.sprite.setTexture(
      startForm === "fox" ? "mizumi-fox" : "mizumi-human",
    );
    this.applyBody(startForm);
  }

  update(input: PlayerInput, time: number, _delta: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // --- Horizontal movement ---
    const speed = this.form === "fox" ? SPEED_FOX : SPEED_HUMAN;
    let moving = false;
    if (input.left.isDown && !input.right.isDown) {
      this.sprite.setVelocityX(-speed);
      this.sprite.setFlipX(true);
      moving = true;
    } else if (input.right.isDown && !input.left.isDown) {
      this.sprite.setVelocityX(speed);
      this.sprite.setFlipX(false);
      moving = true;
    } else {
      this.sprite.setVelocityX(0);
    }

    // --- Footstep SFX (throttled to FOOTSTEP_INTERVAL_MS) ---
    if (moving && body.onFloor() && time >= this.nextFootstepAt) {
      const audio = this.getAudio();
      // Quieter in fox form (smaller animal, lighter pads on the ground).
      audio?.playSfx("sfx-footstep", this.form === "fox" ? 0.5 : 1);
      this.nextFootstepAt = time + FOOTSTEP_INTERVAL_MS;
    }

    // --- Jump (single press, only when grounded) ---
    if (Phaser.Input.Keyboard.JustDown(input.jump) && body.onFloor()) {
      this.sprite.setVelocityY(this.form === "fox" ? JUMP_FOX : JUMP_HUMAN);
      this.getAudio()?.playSfx("sfx-jump");
    }

    // --- Transform ---
    if (Phaser.Input.Keyboard.JustDown(input.transform)) {
      this.toggleForm();
    }
  }

  /** Look up the scene-shared AudioSystem (registered in each scene's create). */
  private getAudio(): AudioSystem | null {
    return (this.scene.registry.get("audio") as AudioSystem | undefined) ?? null;
  }

  setForm(form: KitsuneForm): void {
    if (form === this.form) return;

    this.form = form;
    this.sprite.setTexture(form === "fox" ? "mizumi-fox" : "mizumi-human");
    this.applyBody(form);
    this.persistForm(form);
  }

  toggleForm(): void {
    const next: KitsuneForm = this.form === "human" ? "fox" : "human";
    const prev = this.form;

    // Magical chime audio cue before the visual burst.
    this.getAudio()?.playSfx("sfx-transform");

    // Spawn cream/gold burst at current position (before swap so it reads
    // as the "old form dissolving").
    this.spawnTransformBurst();

    // Brief gold tint, then clear it.
    this.sprite.setTint(Palette.gold);
    this.scene.time.delayedCall(TINT_DURATION_MS, () => {
      // Sprite may have been destroyed by scene change; guard.
      if (this.sprite && this.sprite.active) {
        this.sprite.clearTint();
      }
    });

    // Swap texture + body.
    this.form = next;
    this.sprite.setTexture(next === "fox" ? "mizumi-fox" : "mizumi-human");
    this.applyBody(next);

    // Persist + flag first-ever transformation.
    const state = this.scene.registry.get(RegistryKey.GameState) as
      | GameState
      | undefined;
    if (state) {
      state.currentForm = next;
      if (!state.hasTransformed) state.hasTransformed = true;
      this.scene.registry.set(RegistryKey.GameState, state);
    }

    // Notify scenes (quest gating, sfx, camera shake, etc.).
    this.scene.events.emit(GameEvent.TransformRequested, {
      from: prev,
      to: next,
    });
  }

  // --- Internal helpers ---

  /** Resize and re-offset the physics body to match the given form. */
  private applyBody(form: KitsuneForm): void {
    const shape = form === "fox" ? FOX_BODY : HUMAN_BODY;
    this.sprite.body?.setSize(shape.width, shape.height);
    this.sprite.body?.setOffset(shape.offsetX, shape.offsetY);
  }

  /** Write form into the shared registry GameState so other scenes see it. */
  private persistForm(form: KitsuneForm): void {
    const state = this.scene.registry.get(RegistryKey.GameState) as
      | GameState
      | undefined;
    if (!state) return;
    state.currentForm = form;
    this.scene.registry.set(RegistryKey.GameState, state);
  }

  /** Cream/gold particle puff that radiates outward and fades. */
  private spawnTransformBurst(): void {
    const cx = this.sprite.x;
    const cy = this.sprite.y;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.3;
      const dist = PARTICLE_SPEED * (0.6 + Math.random() * 0.6);
      const p = this.scene.add.image(cx, cy, "particle");
      p.setDepth(this.sprite.depth + 1);
      p.setAlpha(1);
      p.setScale(0.8 + Math.random() * 0.6);
      // Alternate cream / gold for some variation.
      p.setTint(i % 2 === 0 ? Palette.gold : Palette.cream);

      this.scene.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: PARTICLE_LIFETIME_MS,
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }
  }
}
