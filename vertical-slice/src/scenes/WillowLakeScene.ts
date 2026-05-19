/**
 * WillowLakeScene
 *
 * The main hub of the vertical slice. A horizontal side-scroller (world width
 * 2200 px, view 1280×720) set at night by a lake under a moonlit willow.
 *
 * Spatial layout (left → right):
 *   0      sleeping spot (Mizumi wakes here)
 *   ~600   open ground / lake foreground with hanging lanterns
 *   ~1100  willow tree + Yanagi onna (quest giver)
 *   ~2100  exit marker → CottageScene
 *
 * Quest progression handled here:
 *   0 → 1  Yanagi intro dialog ("yanagi-intro") starts the quest.
 *   3 → 4  Returning from Cottage with the dagger; init() bumps step to 4.
 *   4 → 5  Talking to Yanagi again triggers "yanagi-return".
 *   5 → 6  Cutting the willow branches (E near willow tree).
 *   6 → 7  Investigating the dead body under the willow → EndScene.
 */

import Phaser from "phaser";
import {
  SceneKey,
  RegistryKey,
  GameState,
  GameEvent,
  PlayerInput,
} from "@/types";
import { Palette, css } from "@/art/palette";
import { Player } from "@/entities/Player";
import { DialogSystem } from "@/systems/DialogSystem";
import { QuestSystem } from "@/systems/QuestSystem";
import { AudioSystem } from "@/systems/AudioSystem";
import { attachMuteIndicator } from "@/systems/MuteIndicator";
import { getLocale, onLocaleChange, t, toggleLocale } from "@/i18n";

// --- World layout constants ---
const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 720;
const GROUND_Y = 660; // top of the physics ground band
const GROUND_HEIGHT = 60;

// Yanagi / willow anchor positions (kept in sync with the sleeping spot etc.).
const SLEEP_SPOT_X = 180;
const WILLOW_X = 1100;
const WILLOW_Y = 380; // image center
const YANAGI_X = 1100;
const YANAGI_Y = 588; // sits on ground under willow
const EXIT_X = 2100; // right-edge cottage transition trigger
const RETURN_SPAWN_X = 1000; // spawn near willow on return

// Interaction radii (squared distance compared against these).
const YANAGI_RADIUS = 120;
const WILLOW_RADIUS = 140;
const BODY_RADIUS = 100;

// --- Scene data payload (used by CottageScene → WillowLake transition) ---
interface WillowSceneData {
  fromCottage?: boolean;
}

export class WillowLakeScene extends Phaser.Scene {
  // Core systems
  private player!: Player;
  private dialog!: DialogSystem;
  private quest!: QuestSystem;

  // Input
  private input_!: PlayerInput;

  // Scene objects (kept as fields so we can move / fade / destroy them later)
  private yanagi!: Phaser.GameObjects.Image;
  private willowTree!: Phaser.GameObjects.Image;
  private yanagiIndicator!: Phaser.GameObjects.Text;
  private exitBeam!: Phaser.GameObjects.Rectangle;
  private exitArrow!: Phaser.GameObjects.Text;
  private willowIndicator: Phaser.GameObjects.Text | null = null;
  private bodyGraphics: Phaser.GameObjects.Container | null = null;
  private bodyIndicator: Phaser.GameObjects.Text | null = null;

  // Ambience pool – kept so we can stop tweens on shutdown.
  private fireflies: Phaser.GameObjects.Image[] = [];

  // Flags
  private fromCottage = false;
  private willowCut = false; // becomes true after step 5 → 6 transition
  private interactCooldownMs = 0; // small debounce so E doesn't re-fire
  private endingTriggered = false;

  // Audio
  private audio!: AudioSystem;
  private windLoop: Phaser.Sound.BaseSound | null = null;

  // i18n: in-game [L]-key toggle indicator + locale listener handle.
  private langToggleText: Phaser.GameObjects.Text | null = null;
  private langKey: Phaser.Input.Keyboard.Key | null = null;
  private unsubscribeLocale: (() => void) | null = null;

  constructor() {
    super(SceneKey.WillowLake);
  }

  // ----------------------------------------------------------------------
  // Lifecycle
  // ----------------------------------------------------------------------

  init(data: WillowSceneData): void {
    this.fromCottage = data?.fromCottage === true;
    this.willowCut = false;
    this.endingTriggered = false;
    this.interactCooldownMs = 0;
    this.fireflies = [];
    this.willowIndicator = null;
    this.bodyGraphics = null;
    this.bodyIndicator = null;
    this.langToggleText = null;
    this.langKey = null;
    this.unsubscribeLocale = null;
  }

  create(): void {
    // --- Cross-scene state ---------------------------------------------------
    const state = this.registry.get(RegistryKey.GameState) as GameState;

    // If the player just came back from the cottage holding the dagger,
    // bump the quest to step 4 ("Return to the woman by the willow").
    if (this.fromCottage && state.hasDagger && state.questProgress === 3) {
      state.questProgress = 4;
      this.registry.set(RegistryKey.GameState, state);
    }

    // Dialog registry flag is per-scene — make sure it's reset.
    this.registry.set(RegistryKey.DialogActive, false);

    // --- World setup --------------------------------------------------------
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.fadeIn(500, 0, 0, 0);

    this.buildBackground();
    this.buildSleepingSpot();
    this.buildLanterns();
    this.buildWillowAndYanagi();
    this.buildExitMarker();
    this.spawnFireflies(10);

    // Static ground (invisible — the painted ground is in lake-bg).
    const ground = this.add.rectangle(
      WORLD_WIDTH / 2,
      GROUND_Y + GROUND_HEIGHT / 2,
      WORLD_WIDTH,
      GROUND_HEIGHT,
      0x000000,
      0,
    );
    this.physics.add.existing(ground, true); // static body

    // --- Player -------------------------------------------------------------
    // If returning from cottage with the dagger, spawn close to the willow so
    // the player can immediately re-engage with Yanagi.
    const spawnX =
      state.questProgress >= 5 || this.fromCottage ? RETURN_SPAWN_X : SLEEP_SPOT_X;
    this.player = new Player(this, spawnX, 550);
    this.physics.add.collider(this.player.sprite, ground);
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);

    // --- Input -------------------------------------------------------------
    this.input_ = this.makeInput();

    // --- Systems -----------------------------------------------------------
    this.dialog = new DialogSystem(this);
    this.quest = new QuestSystem(this);

    // --- Audio: night music + ambient wind loop + mute indicator ----------
    this.audio = new AudioSystem(this);
    this.registry.set("audio", this.audio);
    this.audio.playMusic("music-willow");
    this.windLoop = this.audio.playAmbient("sfx-wind", 0.2);
    attachMuteIndicator(this, this.audio);

    // --- Event wiring ------------------------------------------------------
    this.events.on(GameEvent.DialogEnded, this.onDialogEnded, this);
    this.events.on(
      GameEvent.QuestStepCompleted,
      this.onQuestStepCompleted,
      this,
    );

    // --- Locale switcher (L key + top-left indicator) ---------------------
    this.langKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.L,
    ) ?? null;
    this.buildLangToggleIndicator();
    this.unsubscribeLocale = onLocaleChange(() => {
      this.refreshLangToggleIndicator();
      this.exitArrow.setText(t("hint.cottageExit"));
    });

    // Clean up listeners on shutdown so they don't leak when re-entering.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(GameEvent.DialogEnded, this.onDialogEnded, this);
      this.events.off(
        GameEvent.QuestStepCompleted,
        this.onQuestStepCompleted,
        this,
      );
      if (this.unsubscribeLocale) {
        this.unsubscribeLocale();
        this.unsubscribeLocale = null;
      }
      // Stop the ambient wind loop so it doesn't leak across scenes.
      if (this.windLoop) {
        this.windLoop.stop();
        this.windLoop.destroy();
        this.windLoop = null;
      }
    });

    // If the player has already cut the willow before (returning at step >=6),
    // restore the scene to that state immediately so the player isn't presented
    // with a phantom Yanagi.
    if (state.questProgress >= 6) {
      this.yanagi.setVisible(false);
      this.yanagiIndicator.setVisible(false);
      this.willowCut = true;
      this.spawnBody();
    }
  }

  update(time: number, delta: number): void {
    // Decrement interact cooldown each frame.
    if (this.interactCooldownMs > 0) {
      this.interactCooldownMs -= delta;
    }

    // Locale toggle via [L] — works regardless of dialog state so the
    // player can flip languages between or during a beat.
    if (this.langKey && Phaser.Input.Keyboard.JustDown(this.langKey)) {
      toggleLocale();
    }

    const dialogActive = this.registry.get(RegistryKey.DialogActive) === true;

    // While dialog is up, freeze the player entirely and skip world logic.
    if (dialogActive) {
      const body = this.player.sprite.body as Phaser.Physics.Arcade.Body | null;
      if (body) {
        body.setVelocity(0, body.velocity.y);
      }
      return;
    }

    // Normal frame: tick player + check world interactions.
    this.player.update(this.input_, time, delta);
    this.updateYanagiIndicator();
    this.handleInteractions();
    this.checkExitTransition();
  }

  // ----------------------------------------------------------------------
  // World construction
  // ----------------------------------------------------------------------

  /** Two side-by-side copies of the 1920-wide lake-bg fill the 2200 world. */
  private buildBackground(): void {
    // Solid night fill behind everything (in case the bg tiles don't cover).
    this.cameras.main.setBackgroundColor(Palette.nightDeep);

    this.add.image(0, 0, "lake-bg").setOrigin(0, 0).setDepth(-100);
    this.add.image(1920, 0, "lake-bg").setOrigin(0, 0).setDepth(-100);

    // Moon, anchored in world-space so it scrolls with the camera (mild
    // parallax would be nicer, but a single fixed moon reads fine for the
    // slice).
    this.add.image(1900, 130, "moon").setDepth(-95);
  }

  /** A soft glow on the ground where Mizumi wakes up. */
  private buildSleepingSpot(): void {
    const g = this.add.graphics();
    g.setDepth(-50);
    g.fillStyle(Palette.gold, 0.18);
    g.fillEllipse(SLEEP_SPOT_X, GROUND_Y - 4, 180, 36);
    g.fillStyle(Palette.cream, 0.1);
    g.fillEllipse(SLEEP_SPOT_X, GROUND_Y - 4, 120, 22);

    // Tween the glow softly so it breathes.
    this.tweens.add({
      targets: g,
      alpha: { from: 0.7, to: 1 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Five hanging lanterns spaced across the open ground area. */
  private buildLanterns(): void {
    const positions = [320, 560, 780, 1500, 1750];
    for (const x of positions) {
      const lantern = this.add.image(x, 80, "lantern");
      lantern.setDepth(-30);

      // Subtle sway — each lantern offset so they don't move in lockstep.
      this.tweens.add({
        targets: lantern,
        angle: { from: -4, to: 4 },
        duration: 2400 + Math.random() * 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // A soft warm halo behind each lantern.
      const halo = this.add.graphics();
      halo.fillStyle(Palette.gold, 0.12);
      halo.fillCircle(x, 100, 26);
      halo.setDepth(-31);
    }
  }

  /** The willow tree + Yanagi onna sitting under it + her interact arrow. */
  private buildWillowAndYanagi(): void {
    // Willow tree (image is 300×420, anchor mid-bottom so trunk lands on
    // GROUND_Y).
    this.willowTree = this.add.image(WILLOW_X, WILLOW_Y, "willow-tree");
    this.willowTree.setOrigin(0.5, 0.5);
    this.willowTree.setDepth(-10);

    // Gentle sway tween (±0.5deg).
    this.tweens.add({
      targets: this.willowTree,
      angle: { from: -0.5, to: 0.5 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Periodic stronger shake — branches rattle every few seconds.
    this.time.addEvent({
      delay: 6500,
      loop: true,
      callback: () => {
        if (!this.willowTree.active) return;
        this.tweens.add({
          targets: this.willowTree,
          angle: { from: -1.5, to: 1.5 },
          duration: 120,
          yoyo: true,
          repeat: 3,
          ease: "Sine.easeInOut",
        });
      },
    });

    // Yanagi onna — anchored bottom-center so she stands cleanly on ground.
    this.yanagi = this.add.image(YANAGI_X, YANAGI_Y, "yanagi-onna");
    this.yanagi.setOrigin(0.5, 1);
    this.yanagi.setDepth(0); // in front of willow, behind UI

    // Subtle ghost-bob.
    this.tweens.add({
      targets: this.yanagi,
      y: { from: YANAGI_Y - 2, to: YANAGI_Y + 2 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Floating "▸" indicator above her head.
    this.yanagiIndicator = this.add.text(YANAGI_X, YANAGI_Y - 130, "▸", {
      fontFamily: "Georgia, serif",
      fontSize: "28px",
      color: "#f2c14e", // Palette.gold
    });
    this.yanagiIndicator.setOrigin(0.5, 0.5);
    this.yanagiIndicator.setDepth(10);

    this.tweens.add({
      targets: this.yanagiIndicator,
      y: { from: YANAGI_Y - 136, to: YANAGI_Y - 124 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** The tweening orange light beam at the right edge → cottage. */
  private buildExitMarker(): void {
    // A vertical orange beam.
    this.exitBeam = this.add.rectangle(
      EXIT_X,
      GROUND_Y - 100,
      6,
      200,
      Palette.orange,
      0.65,
    );
    this.exitBeam.setOrigin(0.5, 0.5);
    this.exitBeam.setDepth(-5);

    this.tweens.add({
      targets: this.exitBeam,
      alpha: { from: 0.25, to: 0.85 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // An arrow / hint text above the beam.
    this.exitArrow = this.add.text(EXIT_X, GROUND_Y - 220, t("hint.cottageExit"), {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#f3e9d2", // Palette.cream
    });
    this.exitArrow.setOrigin(0.5, 0.5);
    this.exitArrow.setDepth(-5);
    this.exitArrow.setAlpha(0.75);
  }

  /** Spawn ambient drifting fireflies. They recycle themselves on tween end. */
  private spawnFireflies(count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnOneFirefly(true);
    }
  }

  private spawnOneFirefly(initial: boolean): void {
    const x = Math.random() * (WORLD_WIDTH - 200) + 100;
    const yStart = GROUND_Y - 40 - Math.random() * 80;
    const f = this.add.image(x, yStart, "particle");
    f.setDepth(-2);
    f.setAlpha(0);
    f.setScale(0.6 + Math.random() * 0.6);
    f.setTint(Math.random() < 0.5 ? Palette.gold : Palette.cream);
    this.fireflies.push(f);

    const duration = 4000 + Math.random() * 2000;
    const drift = 30 + Math.random() * 20;
    const delay = initial ? Math.random() * 4000 : 0;

    this.tweens.add({
      targets: f,
      y: yStart - drift,
      x: x + (Math.random() - 0.5) * 40,
      alpha: { from: 0, to: 0.7 },
      duration: duration * 0.5,
      delay,
      ease: "Sine.easeInOut",
      yoyo: true,
      onComplete: () => {
        f.destroy();
        // Replace with a fresh firefly so the count stays roughly stable.
        // Guard against teardown via scene being shut down.
        if (this.scene.isActive(SceneKey.WillowLake)) {
          this.spawnOneFirefly(false);
        }
      },
    });
  }

  // ----------------------------------------------------------------------
  // Input
  // ----------------------------------------------------------------------

  /** Capture the standard set of input keys and pass them to Player.update. */
  private makeInput(): PlayerInput {
    const kb = this.input.keyboard;
    if (!kb) {
      throw new Error("Keyboard input not available in WillowLakeScene");
    }
    return {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      transform: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };
  }

  // ----------------------------------------------------------------------
  // Interactions
  // ----------------------------------------------------------------------

  /** Show / hide the floating ▸ indicator over Yanagi based on player range. */
  private updateYanagiIndicator(): void {
    if (!this.yanagi.visible) {
      this.yanagiIndicator.setVisible(false);
      return;
    }
    const dx = this.player.sprite.x - YANAGI_X;
    const dy = this.player.sprite.y - YANAGI_Y;
    const dist2 = dx * dx + dy * dy;
    const visible = dist2 <= YANAGI_RADIUS * YANAGI_RADIUS;
    this.yanagiIndicator.setVisible(visible);
  }

  /** Player pressed E — route to the nearest interactable. */
  private handleInteractions(): void {
    if (this.interactCooldownMs > 0) return;
    if (!Phaser.Input.Keyboard.JustDown(this.input_.interact)) return;

    const state = this.registry.get(RegistryKey.GameState) as GameState;
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    // 1) Investigate dead body (step >= 6, body present)
    if (this.bodyGraphics && state.questProgress === 6) {
      const dx = px - WILLOW_X;
      const dy = py - YANAGI_Y;
      if (dx * dx + dy * dy <= BODY_RADIUS * BODY_RADIUS) {
        this.interactCooldownMs = 350;
        this.dialog.start("willow-body");
        return;
      }
    }

    // 2) Cut the willow branches (step 5, near willow, dagger in inventory)
    if (
      state.questProgress === 5 &&
      state.hasDagger &&
      this.yanagi.visible &&
      !this.willowCut
    ) {
      const dx = px - WILLOW_X;
      const dy = py - WILLOW_Y;
      if (dx * dx + dy * dy <= WILLOW_RADIUS * WILLOW_RADIUS) {
        this.interactCooldownMs = 500;
        this.cutWillowBranches();
        return;
      }
    }

    // 3) Talk to Yanagi (steps 0, 4) / hint at step 5
    if (this.yanagi.visible) {
      const dx = px - YANAGI_X;
      const dy = py - YANAGI_Y;
      if (dx * dx + dy * dy <= YANAGI_RADIUS * YANAGI_RADIUS) {
        this.interactCooldownMs = 350;
        this.talkToYanagi(state);
        return;
      }
    }
  }

  /** Dispatch the right dialog tree (or floating hint) for current quest step. */
  private talkToYanagi(state: GameState): void {
    if (state.questProgress === 0) {
      this.dialog.start("yanagi-intro");
      return;
    }
    if (state.questProgress === 4) {
      this.dialog.start("yanagi-return");
      return;
    }
    if (state.questProgress === 5) {
      // No full dialog — just a floating hint above Yanagi.
      this.showFloatingHint(
        YANAGI_X,
        YANAGI_Y - 150,
        t("hint.cutBranches"),
      );
      return;
    }
    // Other states (1-3 covered by cottage trip) — gentle reminder.
    if (state.questProgress >= 1 && state.questProgress <= 3) {
      this.showFloatingHint(
        YANAGI_X,
        YANAGI_Y - 150,
        t("hint.findCottage"),
      );
    }
  }

  /**
   * Step 5 → 6: slash effect on willow, shake the tree, fade Yanagi out in a
   * burst of particles, then trigger the willow-thanks dialog.
   */
  private cutWillowBranches(): void {
    this.willowCut = true;

    // Sharp slice SFX synced with the slash flash.
    this.audio.playSfx("sfx-cut");

    // 1. Slash visual — a quick orange line angled across the willow trunk.
    const slash = this.add.graphics();
    slash.lineStyle(6, Palette.orange, 1);
    slash.beginPath();
    slash.moveTo(WILLOW_X - 60, WILLOW_Y - 80);
    slash.lineTo(WILLOW_X + 60, WILLOW_Y + 80);
    slash.strokePath();
    slash.setDepth(20);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      duration: 400,
      ease: "Cubic.easeOut",
      onComplete: () => slash.destroy(),
    });

    // 2. Strong shake on the willow.
    this.tweens.add({
      targets: this.willowTree,
      angle: { from: -3, to: 3 },
      duration: 90,
      yoyo: true,
      repeat: 6,
      ease: "Sine.easeInOut",
    });

    // 3. Camera punch for impact.
    this.cameras.main.shake(220, 0.005);

    // 4. Yanagi dissolves into a particle dispersion.
    this.dissolveYanagi();

    // 5. Brief delay then fire the dialog.
    this.time.delayedCall(700, () => {
      this.dialog.start("willow-thanks");
    });
  }

  /** Spawn ~30 particles flying upward from Yanagi, fading her out with them. */
  private dissolveYanagi(): void {
    const cx = YANAGI_X;
    const cy = YANAGI_Y - 50;

    for (let i = 0; i < 30; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const dist = 70 + Math.random() * 90;
      const p = this.add.image(
        cx + (Math.random() - 0.5) * 40,
        cy + (Math.random() - 0.5) * 50,
        "particle",
      );
      p.setDepth(5);
      p.setTint(i % 2 === 0 ? Palette.cream : Palette.purpleDeep);
      p.setScale(0.6 + Math.random() * 0.8);

      this.tweens.add({
        targets: p,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist - 30,
        alpha: 0,
        scale: 0.1,
        duration: 900 + Math.random() * 400,
        ease: "Cubic.easeOut",
        onComplete: () => p.destroy(),
      });
    }

    // Fade her out concurrently.
    this.tweens.add({
      targets: this.yanagi,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        this.yanagi.setVisible(false);
        this.yanagiIndicator.setVisible(false);
      },
    });
  }

  /**
   * Step 6 — drop a withered body sprite on the ground where Yanagi sat, and
   * add an interact indicator so the player can press E to learn the truth.
   *
   * Prefers the `yanagi-dead` texture (PNG, when the active art style ships
   * one). Falls back to inline Graphics drawing if the texture is missing —
   * keeps the slice working on procedural / partial asset sets.
   */
  private spawnBody(): void {
    if (this.bodyGraphics) return;

    const container = this.add.container(WILLOW_X, GROUND_Y - 10);
    container.setDepth(1);

    if (this.textures.exists("yanagi-dead")) {
      // Sprite path — the texture is centred on (0,0) inside the container,
      // so the body lies horizontally just above the ground.
      const img = this.add.image(0, 0, "yanagi-dead");
      img.setOrigin(0.5, 0.5);
      container.add(img);
    } else {
      // Fallback: original procedural body drawn inline.
      const g = this.add.graphics();
      g.fillStyle(Palette.purpleDeep, 0.9);
      g.fillEllipse(0, 0, 80, 28);
      g.fillStyle(Palette.dark, 1);
      g.fillEllipse(-30, 4, 36, 14);
      g.fillStyle(Palette.creamSoft, 0.85);
      g.fillCircle(-22, -2, 7);
      g.fillStyle(Palette.darkSoft, 1);
      g.fillCircle(-24, -3, 1.5);
      g.lineStyle(2, Palette.willow, 1);
      g.beginPath();
      g.moveTo(-16, -2);
      g.lineTo(-6, 6);
      g.lineTo(2, -2);
      g.lineTo(10, 6);
      g.strokePath();
      g.lineStyle(2, Palette.leaf, 0.9);
      g.beginPath();
      g.moveTo(-14, 1);
      g.lineTo(-4, 8);
      g.strokePath();
      g.fillStyle(Palette.cream, 0.7);
      g.fillEllipse(28, 4, 18, 8);
      g.fillStyle(Palette.creamSoft, 0.95);
      g.fillRect(20, 0, 8, 2);
      container.add(g);
    }

    this.bodyGraphics = container;

    // Indicator hovering over the body.
    this.bodyIndicator = this.add.text(WILLOW_X, GROUND_Y - 60, "▸", {
      fontFamily: "Georgia, serif",
      fontSize: "26px",
      color: "#e26a2c", // Palette.orange
    });
    this.bodyIndicator.setOrigin(0.5, 0.5);
    this.bodyIndicator.setDepth(10);
    this.tweens.add({
      targets: this.bodyIndicator,
      y: { from: GROUND_Y - 66, to: GROUND_Y - 54 },
      alpha: { from: 0.6, to: 1 },
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * Build the small top-left "[L] EN | CS" hint that shows the player can
   * press L to toggle locale. The text is fixed to the camera viewport so
   * it stays visible while scrolling the world.
   */
  private buildLangToggleIndicator(): void {
    this.langToggleText = this.add
      .text(16, 16, this.langToggleLabel(), {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "14px",
        color: css(Palette.gold),
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1100);
  }

  private refreshLangToggleIndicator(): void {
    if (this.langToggleText) {
      this.langToggleText.setText(this.langToggleLabel());
    }
  }

  private langToggleLabel(): string {
    return getLocale() === "en"
      ? t("ui.lang.toggleHint.en")
      : t("ui.lang.toggleHint.cs");
  }

  /** Tiny floating text that drifts up and fades — used for nudges/hints. */
  private showFloatingHint(x: number, y: number, msg: string): void {
    const t = this.add.text(x, y, msg, {
      fontFamily: "Georgia, serif",
      fontSize: "15px",
      color: "#f3e9d2",
      backgroundColor: "#0d0814aa",
      padding: { x: 8, y: 4 },
    });
    t.setOrigin(0.5, 1);
    t.setDepth(50);
    t.setAlpha(0);

    this.tweens.add({
      targets: t,
      alpha: { from: 0, to: 1 },
      duration: 200,
      yoyo: true,
      hold: 1400,
      onComplete: () => t.destroy(),
    });
  }

  // ----------------------------------------------------------------------
  // Cottage transition
  // ----------------------------------------------------------------------

  /**
   * If the quest is in the "find/enter/loot the cottage" arc (steps 1-3) AND
   * the player walks past the right-edge marker, transition to CottageScene.
   */
  private checkExitTransition(): void {
    const state = this.registry.get(RegistryKey.GameState) as GameState;
    if (state.questProgress < 1 || state.questProgress > 3) return;

    if (this.player.sprite.x >= EXIT_X) {
      // Avoid double-trigger across multiple frames during fade.
      const cam = this.cameras.main;
      if (cam.fadeEffect.isRunning) return;

      cam.fadeOut(400, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start(SceneKey.Cottage);
      });
    }
  }

  // ----------------------------------------------------------------------
  // Event handlers
  // ----------------------------------------------------------------------

  /**
   * Dialog finished — refresh HUD and check for quest-step gating.
   *
   * Note: The DialogSystem and dialog data are responsible for advancing the
   * quest itself via QuestSystem.advance(). This handler reacts to the new
   * state (e.g. body reveal, ending) rather than mutating it.
   */
  private onDialogEnded(): void {
    this.quest.refresh();

    const state = this.registry.get(RegistryKey.GameState) as GameState;

    // Step 6 reached → reveal the body and indicator (if not already).
    if (state.questProgress === 6 && this.willowCut && !this.bodyGraphics) {
      this.spawnBody();
    }

    // Step 7 (or beyond) reached → ending.
    if (state.questProgress >= 7 && !this.endingTriggered) {
      this.endingTriggered = true;
      this.time.delayedCall(400, () => {
        this.cameras.main.fadeOut(900, 0, 0, 0);
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
          () => {
            this.scene.start(SceneKey.End);
          },
        );
      });
    }
  }

  /**
   * Quest advanced — QuestSystem already refreshed the banner; we just check
   * for side effects that aren't tied to the end of a dialog (defensive).
   */
  private onQuestStepCompleted(_prev: number, next: number): void {
    this.quest.refresh();
    if (next === 6 && this.willowCut && !this.bodyGraphics) {
      this.spawnBody();
    }
  }
}
