/**
 * CottageScene
 *
 * The cottage portion of the "Cry under the Willow" quest. Implemented as a
 * single Phaser scene with two internal "modes" that share input, player,
 * dialog and quest systems:
 *
 *   - "exterior"  — short single-screen vista of the cottage from outside.
 *                   The door is blocked (story beat); the only way in is to
 *                   transform into a fox and leap through the lit window.
 *   - "interior"  — the abandoned interior. Environmental storytelling via
 *                   interactables: dining table with moldy food, soiled
 *                   futon, scattered desperate notes, dagger to pick up,
 *                   and sandals blocking the door from the inside.
 *
 * The two modes are NOT separate Phaser scenes — switching between them
 * tears down the current layout, rebuilds the new one, and crossfades the
 * camera. This keeps quest/dialog state simple and avoids cross-scene
 * registry juggling.
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

// ---------------------------------------------------------------------------
// Types & layout constants
// ---------------------------------------------------------------------------

type CottageMode = "exterior" | "interior";

/** A world-space interactable: when the player walks within `range`, the
 *  scene shows a floating "▸" indicator above the target and pressing E
 *  fires the handler keyed by `id`. */
interface Interactable {
  id: string;
  /** Visual game object the indicator should hover above. */
  target: Phaser.GameObjects.Components.Transform &
    Phaser.GameObjects.GameObject;
  /** Half-extent (px) within which the player can interact. */
  range: number;
  /** Optional vertical offset for the indicator (above the sprite). */
  indicatorOffsetY?: number;
  /** True while interaction is disabled (e.g. door blocked by sandals). */
  disabled?: boolean;
}

const WORLD_WIDTH = 1280;
const WORLD_HEIGHT = 720;
const GROUND_Y = 660;
const FLOOR_TOP = GROUND_Y - 2; // physics platform's top edge

// Exterior layout
const EXT_PLAYER_SPAWN = { x: 200, y: 550 };
const EXT_COTTAGE = { x: 640, y: 400 };
// Door/window interaction coords are placed in world space below; they are
// derived from the cottage-ext anchor (the texture is 420x300 with content
// roughly inside [40..380] × [30..270]).
//
// IMPORTANT: this is a side-scroller. The player is grounded around y=636
// and can't physically reach a zone at y=360. So we keep the *visual*
// position of the window high (where the glow renders) but place its
// *interaction* zone at ground level under the window — pressing E there
// triggers the "leap up through the window" beat.
const EXT_DOOR = { x: EXT_COTTAGE.x, y: EXT_COTTAGE.y + 70 };
const EXT_WINDOW_VISUAL = { x: EXT_COTTAGE.x - 145, y: EXT_COTTAGE.y - 40 };
const EXT_WINDOW_ZONE = { x: EXT_COTTAGE.x - 145, y: 600 };

// Interior layout
const INT_PLAYER_SPAWN = { x: 240, y: 300 };
const INT_TABLE = { x: 460, y: 600 };
const INT_FUTON = { x: 720, y: 620 };
const INT_PAPERS = { x: 900, y: 625 };
const INT_DAGGER = { x: 1080, y: 625 };
const INT_DOOR = { x: 80, y: 560 };
const INT_SANDALS = { x: 80, y: 635 };
// "Window back out" — visual is high on the wall; interaction zone is at
// the floor under the broken window so the fox can "leap up" from there.
const INT_WINDOW_VISUAL = { x: 240, y: 250 };
const INT_WINDOW_EXIT = { x: 240, y: 600 };

// Interaction tunables
const INTERACT_RANGE_DEFAULT = 80;
const FADE_MS = 300;
const ENTRY_LOCK_MS = 500;

// ---------------------------------------------------------------------------

export class CottageScene extends Phaser.Scene {
  private mode!: CottageMode;

  // Core systems (rebuilt per-scene, but kept across mode switches)
  private player!: Player;
  private dialog!: DialogSystem;
  private quest!: QuestSystem;
  private playerInput!: PlayerInput;
  private audio!: AudioSystem;

  // Per-mode disposable game objects. Cleared on switchMode().
  private modeObjects: Phaser.GameObjects.GameObject[] = [];
  private platforms!: Phaser.Physics.Arcade.StaticGroup;

  // Interactables active in the current mode.
  private interactables: Interactable[] = [];
  private activeId: string | null = null;
  private indicator?: Phaser.GameObjects.Text;
  private indicatorTween?: Phaser.Tweens.Tween;

  // Set true during entry animation / camera fade — locks player input.
  private inputLocked = false;

  // Track whether the sandals have been "explained" via dialog. After the
  // first dialog interaction, a second press of E destroys them and unlocks
  // the door.
  private sandalsReadyToRemove = false;

  // Dynamic refs we reach for in handlers.
  private sandalsSprite?: Phaser.GameObjects.Image;
  private daggerSprite?: Phaser.GameObjects.Image;

  // i18n: in-game [L]-key toggle indicator + locale listener handle.
  private langToggleText?: Phaser.GameObjects.Text;
  private langKey?: Phaser.Input.Keyboard.Key;
  private unsubscribeLocale?: () => void;
  // Track the hint banner so it can re-render when locale changes.
  private hintText?: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKey.Cottage);
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  create(): void {
    this.cameras.main.setBackgroundColor(css(Palette.nightDeep));
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Build shared systems.
    this.dialog = new DialogSystem(this);
    this.quest = new QuestSystem(this);
    this.playerInput = this.buildInput();

    // --- Audio: cottage interior haunting piano + mute indicator ---------
    this.audio = new AudioSystem(this);
    this.registry.set("audio", this.audio);
    this.audio.playMusic("music-cottage");
    attachMuteIndicator(this, this.audio);

    // Decide which mode to start in. The brief says: always exterior unless
    // the player already has the dagger and somehow hasn't finished the
    // quest step yet — in which case drop them back inside.
    const state = this.getState();
    const startInInterior =
      state.hasDagger && state.questProgress < 4;
    this.mode = startInInterior ? "interior" : "exterior";

    this.buildCurrentMode();

    // Listen for dialog-end events so we can respond to "sandals-explore"
    // finishing (which arms sandal removal).
    this.events.on(GameEvent.DialogEnded, this.onDialogEnded, this);

    // --- Locale switcher (L key + top-left indicator) ---------------------
    this.langKey = this.input.keyboard?.addKey(
      Phaser.Input.Keyboard.KeyCodes.L,
    );
    this.buildLangToggleIndicator();
    this.unsubscribeLocale = onLocaleChange(() => {
      this.refreshLangToggleIndicator();
      this.refreshHint();
    });

    // Clean up scene-wide listeners and any open dialog when this Phaser
    // scene is shut down (e.g. transitioning to WillowLake).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(GameEvent.DialogEnded, this.onDialogEnded, this);
      if (this.dialog.isActive()) this.dialog.close();
      if (this.unsubscribeLocale) {
        this.unsubscribeLocale();
        this.unsubscribeLocale = undefined;
      }
    });
  }

  update(time: number, delta: number): void {
    // Locale toggle via [L] — independent of dialog state.
    if (this.langKey && Phaser.Input.Keyboard.JustDown(this.langKey)) {
      toggleLocale();
    }

    // Hard-gate the player while dialog is active or during entry locks.
    const dialogActive = this.registry.get(
      RegistryKey.DialogActive,
    ) as boolean;
    if (!dialogActive && !this.inputLocked) {
      this.player.update(this.playerInput, time, delta);
    } else {
      // Zero out horizontal velocity so the character doesn't slide while
      // we hand control to the dialog UI.
      const body = this.player.sprite
        .body as Phaser.Physics.Arcade.Body | null;
      if (body) body.setVelocityX(0);
    }

    // Update nearest-interactable detection + indicator.
    this.refreshActiveInteractable();

    // Interact key (E) — only when free and we have an active target.
    if (
      !dialogActive &&
      !this.inputLocked &&
      Phaser.Input.Keyboard.JustDown(this.playerInput.interact) &&
      this.activeId !== null
    ) {
      this.onInteract(this.activeId);
    }
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private buildInput(): PlayerInput {
    const kb = this.input.keyboard;
    if (!kb) {
      // We rely on keyboard input; if it isn't available the scene is unusable
      // but Phaser still expects valid PlayerInput shape. Build placeholders.
      throw new Error("CottageScene requires a keyboard plugin");
    }
    // Use both arrow keys and WASD as movement; SPACE for jump; E interact; F transform.
    // Player controller treats `left/right/jump` as single Phaser keys. We
    // pick the arrow keys here; A/D could be added but Player already
    // covers movement via the single-key contract.
    return {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      jump: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      interact: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      transform: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
    };
  }

  // -------------------------------------------------------------------------
  // Mode building / tearing down
  // -------------------------------------------------------------------------

  /** Build whichever mode is currently selected. Used on `create` and after
   *  switchMode tears the old one down. */
  private buildCurrentMode(): void {
    if (this.mode === "exterior") this.buildExterior();
    else this.buildInterior();
  }

  /** Destroy all per-mode objects, including player, platforms, indicator,
   *  and any interactable game objects. Systems (dialog/quest) survive. */
  private teardownCurrentMode(): void {
    // Drop the indicator + its tween.
    if (this.indicatorTween) {
      this.indicatorTween.stop();
      this.indicatorTween = undefined;
    }
    if (this.indicator) {
      this.indicator.destroy();
      this.indicator = undefined;
    }

    // Destroy interactables (target sprites are part of modeObjects, so we
    // don't double-destroy here — we just clear the registry).
    this.interactables = [];
    this.activeId = null;

    // Destroy the player (it'll be recreated by buildXxx).
    if (this.player && this.player.sprite) {
      this.player.sprite.destroy();
    }

    // Destroy the static platforms group (its children get torn down too).
    if (this.platforms) {
      this.platforms.clear(true, true);
    }

    // Destroy each mode-scoped game object that isn't a system UI element.
    for (const go of this.modeObjects) {
      if (go && go.active) go.destroy();
    }
    this.modeObjects = [];

    // Reset transient mode flags.
    this.sandalsReadyToRemove = false;
    this.sandalsSprite = undefined;
    this.daggerSprite = undefined;
    this.hintText = undefined;
  }

  /** Cross-fade between modes inside the same Phaser scene. */
  private switchMode(next: CottageMode): void {
    if (next === this.mode) return;
    this.inputLocked = true;

    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.teardownCurrentMode();
        this.mode = next;
        this.buildCurrentMode();
        this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
          () => {
            this.inputLocked = false;
          },
        );
      },
    );
  }

  // -------------------------------------------------------------------------
  // EXTERIOR
  // -------------------------------------------------------------------------

  private buildExterior(): void {
    // Night sky background — reuse the lake-bg image, dimmed and scaled to
    // cover. The exterior of the cottage sits on top of it.
    const bg = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "lake-bg");
    bg.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
    bg.setAlpha(0.7);
    bg.setDepth(0);
    this.modeObjects.push(bg);

    // Moon for atmosphere.
    const moon = this.add.image(WORLD_WIDTH - 180, 140, "moon");
    moon.setDepth(1);
    moon.setAlpha(0.9);
    this.modeObjects.push(moon);

    // Cottage exterior texture. Texture is 420x300 so center-anchor places
    // its visible bulk around the configured EXT_COTTAGE coords.
    const cottage = this.add.image(EXT_COTTAGE.x, EXT_COTTAGE.y, "cottage-ext");
    cottage.setDepth(5);
    this.modeObjects.push(cottage);

    // Ground platform (invisible physics body, drawn earth by the bg image).
    this.platforms = this.physics.add.staticGroup();
    const ground = this.add.rectangle(
      WORLD_WIDTH / 2,
      GROUND_Y,
      WORLD_WIDTH,
      8,
      Palette.dark,
      0,
    );
    this.physics.add.existing(ground, true);
    this.platforms.add(ground);
    this.modeObjects.push(ground);

    // Spawn the player.
    this.player = new Player(this, EXT_PLAYER_SPAWN.x, EXT_PLAYER_SPAWN.y);
    this.player.sprite.setDepth(20);
    this.physics.add.collider(this.player.sprite, this.platforms);

    // Door interaction zone — invisible rectangle for hit detection. The
    // texture's door sits roughly centered horizontally.
    const door = this.add.zone(EXT_DOOR.x, EXT_DOOR.y, 80, 120);
    door.setDepth(6);
    this.modeObjects.push(door);
    this.interactables.push({
      id: "ext-door",
      target: door,
      range: 90,
      indicatorOffsetY: -80,
    });

    // Window interaction zone — placed at GROUND LEVEL under the window so
    // the side-scroller player can reach it (the visual window is high on
    // the wall; the zone is "stand here to leap up"). Indicator offset is
    // large + negative so the "▸" still appears up by the actual window.
    const win = this.add.zone(EXT_WINDOW_ZONE.x, EXT_WINDOW_ZONE.y, 90, 120);
    win.setDepth(6);
    this.modeObjects.push(win);
    this.interactables.push({
      id: "ext-window",
      target: win,
      range: 110,
      indicatorOffsetY: -(EXT_WINDOW_ZONE.y - EXT_WINDOW_VISUAL.y + 40),
    });

    // Add a subtle warm glow over the (visual) window so the player notices it.
    const glow = this.add.image(
      EXT_WINDOW_VISUAL.x,
      EXT_WINDOW_VISUAL.y,
      "window-glow",
    );
    glow.setDepth(4);
    glow.setAlpha(0.55);
    glow.setScale(0.55);
    this.tweens.add({
      targets: glow,
      alpha: 0.85,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.modeObjects.push(glow);

    // Hint text — what we expect the player to do in this beat.
    const hint = this.add
      .text(WORLD_WIDTH / 2, 60, this.exteriorHint(), {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "18px",
        color: css(Palette.cream),
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(50)
      .setAlpha(0.85);
    this.modeObjects.push(hint);
    this.hintText = hint;

    // Ensure HUD reflects current quest step.
    this.quest.refresh();
  }

  /** Returns context-sensitive hint copy for the exterior banner. */
  private exteriorHint(): string {
    const state = this.getState();
    if (state.questProgress <= 1) {
      return t("hint.cottageExterior.tryDoor");
    }
    if (state.questProgress === 2 && state.currentForm !== "fox") {
      return t("hint.cottageExterior.transform");
    }
    return t("hint.cottageExterior.leap");
  }

  // -------------------------------------------------------------------------
  // INTERIOR
  // -------------------------------------------------------------------------

  private buildInterior(): void {
    // Interior background covers the whole world.
    const bg = this.add.image(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      "cottage-int-bg",
    );
    bg.setDepth(0);
    this.modeObjects.push(bg);

    // Oppressive dark overlay (above bg, below entities) — makes the room
    // feel cold, abandoned, haunted.
    const overlay = this.add.graphics();
    overlay.fillStyle(Palette.dark, 0.4);
    overlay.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    overlay.setDepth(1);
    this.modeObjects.push(overlay);

    // Floor platform.
    this.platforms = this.physics.add.staticGroup();
    const floor = this.add.rectangle(
      WORLD_WIDTH / 2,
      GROUND_Y,
      WORLD_WIDTH,
      8,
      Palette.barkDark,
      0,
    );
    this.physics.add.existing(floor, true);
    this.platforms.add(floor);
    this.modeObjects.push(floor);

    // Place props. Use small body-less images and rely on visual placement
    // plus interaction zones for collisions.
    const table = this.add.image(INT_TABLE.x, INT_TABLE.y, "dining-table");
    table.setDepth(10);
    this.modeObjects.push(table);

    const futon = this.add.image(INT_FUTON.x, INT_FUTON.y, "futon");
    futon.setDepth(10);
    this.modeObjects.push(futon);

    const papers = this.add.image(INT_PAPERS.x, INT_PAPERS.y, "papers");
    papers.setDepth(10);
    this.modeObjects.push(papers);

    // Dagger only if not yet collected. Glows softly.
    const state = this.getState();
    if (!state.hasDagger) {
      const dagger = this.add.image(INT_DAGGER.x, INT_DAGGER.y, "dagger");
      dagger.setDepth(11);
      this.daggerSprite = dagger;
      this.modeObjects.push(dagger);

      // Pulsing gold tint to draw the eye.
      dagger.setTint(Palette.gold);
      this.tweens.add({
        targets: dagger,
        alpha: 0.6,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

    // Sandals blocking the interior side of the door.
    const sandals = this.add.image(INT_SANDALS.x, INT_SANDALS.y, "sandals");
    sandals.setDepth(11);
    this.sandalsSprite = sandals;
    this.modeObjects.push(sandals);

    // Spawn the player above the window — they're "leaping in" as a fox.
    this.player = new Player(this, INT_PLAYER_SPAWN.x, INT_PLAYER_SPAWN.y);
    this.player.sprite.setDepth(20);
    this.physics.add.collider(this.player.sprite, this.platforms);

    // Lock input for half a second so the player visibly falls/lands before
    // they can move. Gravity (1400) handles the drop.
    this.inputLocked = true;
    this.time.delayedCall(ENTRY_LOCK_MS, () => {
      this.inputLocked = false;
    });

    // Register interactables for the interior.
    this.interactables.push({
      id: "int-table",
      target: table,
      range: INTERACT_RANGE_DEFAULT,
      indicatorOffsetY: -50,
    });
    this.interactables.push({
      id: "int-futon",
      target: futon,
      range: INTERACT_RANGE_DEFAULT,
      indicatorOffsetY: -50,
    });
    this.interactables.push({
      id: "int-papers",
      target: papers,
      range: INTERACT_RANGE_DEFAULT,
      indicatorOffsetY: -50,
    });
    if (this.daggerSprite) {
      this.interactables.push({
        id: "int-dagger",
        target: this.daggerSprite,
        range: 70,
        indicatorOffsetY: -40,
      });
    }
    this.interactables.push({
      id: "int-sandals",
      target: sandals,
      range: INTERACT_RANGE_DEFAULT,
      indicatorOffsetY: -60,
    });

    // Interior door — a tall invisible zone next to the sandals. Acts as a
    // separate interactable so the player can try walking through after the
    // sandals are cleared, OR they can leap back out via the window.
    const intDoor = this.add.zone(INT_DOOR.x, INT_DOOR.y, 80, 130);
    intDoor.setDepth(6);
    this.modeObjects.push(intDoor);
    this.interactables.push({
      id: "int-door",
      target: intDoor,
      range: 90,
      indicatorOffsetY: -90,
    });

    // Exit-window zone — placed at GROUND LEVEL under the broken window so
    // the side-scroller player can reach it. The indicator points up to the
    // visual window position.
    const exitWindow = this.add.zone(
      INT_WINDOW_EXIT.x,
      INT_WINDOW_EXIT.y,
      120,
      140,
    );
    exitWindow.setDepth(6);
    this.modeObjects.push(exitWindow);
    this.interactables.push({
      id: "int-window-exit",
      target: exitWindow,
      range: 110,
      indicatorOffsetY: -(INT_WINDOW_EXIT.y - INT_WINDOW_VISUAL.y + 40),
    });

    // Hint banner.
    const hint = this.add
      .text(WORLD_WIDTH / 2, 60, this.interiorHint(), {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "18px",
        color: css(Palette.cream),
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setDepth(50)
      .setAlpha(0.8);
    this.modeObjects.push(hint);
    this.hintText = hint;

    this.quest.refresh();
  }

  private interiorHint(): string {
    const state = this.getState();
    if (!state.hasDagger) {
      return t("hint.cottageInterior.search");
    }
    return t("hint.cottageInterior.hasDagger");
  }

  // -------------------------------------------------------------------------
  // Interactable management
  // -------------------------------------------------------------------------

  /** Compute the nearest interactable within range every frame and show
   *  the floating "▸" indicator over it. */
  private refreshActiveInteractable(): void {
    if (!this.player || !this.player.sprite || !this.player.sprite.active) {
      this.activeId = null;
      this.hideIndicator();
      return;
    }

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;

    let best: Interactable | null = null;
    let bestDist = Infinity;

    for (const it of this.interactables) {
      if (it.disabled) continue;
      // The target zones can be valid game objects even when their internal
      // body isn't set — read transform coords directly.
      const tx = it.target.x;
      const ty = it.target.y;
      const dist = Phaser.Math.Distance.Between(px, py, tx, ty);
      if (dist <= it.range && dist < bestDist) {
        best = it;
        bestDist = dist;
      }
    }

    if (!best) {
      this.activeId = null;
      this.hideIndicator();
      return;
    }

    this.activeId = best.id;
    this.showIndicator(best);
  }

  /** Show / move the floating "▸" indicator above the given interactable. */
  private showIndicator(it: Interactable): void {
    const offsetY = it.indicatorOffsetY ?? -50;
    const tx = it.target.x;
    const ty = it.target.y + offsetY;

    if (!this.indicator) {
      this.indicator = this.add
        .text(tx, ty, "▸", {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "32px",
          color: css(Palette.gold),
          fontStyle: "bold",
        })
        .setOrigin(0.5, 0.5)
        .setDepth(60)
        .setAngle(-90); // Point "downward" toward the object.

      // Up-down bob. We tween the indicator's y by ±6 from its target.
      this.indicatorTween = this.tweens.add({
        targets: this.indicator,
        y: this.indicator.y - 6,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else {
      // If the indicator moved to a new target, restart its tween so the
      // bob anchors around the new y.
      if (
        Math.abs(this.indicator.x - tx) > 0.5 ||
        Math.abs(this.indicator.y - ty) > 12
      ) {
        if (this.indicatorTween) this.indicatorTween.stop();
        this.indicator.setPosition(tx, ty);
        this.indicatorTween = this.tweens.add({
          targets: this.indicator,
          y: ty - 6,
          duration: 450,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      } else {
        // Same target — keep x in sync (target sprites don't move, but cheap).
        this.indicator.setX(tx);
      }
      this.indicator.setVisible(true);
    }
  }

  private hideIndicator(): void {
    if (this.indicator) this.indicator.setVisible(false);
  }

  // -------------------------------------------------------------------------
  // Interaction handlers
  // -------------------------------------------------------------------------

  private onInteract(id: string): void {
    switch (id) {
      case "ext-door":
        this.handleExteriorDoor();
        return;
      case "ext-window":
        this.handleExteriorWindow();
        return;
      case "int-table":
        this.tryDialog("table-explore", t("hint.fallback.tableExplore"));
        return;
      case "int-futon":
        this.tryDialog("futon-explore", t("hint.fallback.futonExplore"));
        return;
      case "int-papers":
        this.tryDialog("papers-read", t("hint.fallback.papersExplore"));
        return;
      case "int-dagger":
        this.handleDaggerPickup();
        return;
      case "int-sandals":
        this.handleSandals();
        return;
      case "int-door":
        this.handleInteriorDoor();
        return;
      case "int-window-exit":
        this.handleInteriorWindowExit();
        return;
      default:
        // Unknown id — log but don't crash.
        console.warn(`[CottageScene] Unknown interactable id: "${id}"`);
        return;
    }
  }

  // --- Exterior ----

  private handleExteriorDoor(): void {
    const state = this.getState();

    if (state.questProgress <= 1) {
      // First time: full "door is blocked" dialog. The dialog tree itself
      // is responsible for advancing the quest, but we also nudge the flag
      // here in case the data file's tree doesn't include the onEnter.
      this.tryDialog("house-door-blocked", t("hint.fallback.doorBlocked"));
      if (state.questProgress < 2) {
        state.questProgress = 2;
        this.setState(state);
        this.quest.refresh();
        // Refresh the hint to reflect the new step.
        this.refreshExteriorHint();
      }
      return;
    }

    // Already past step 1 — short repeated hint.
    this.tryDialog("house-door-blocked", t("hint.fallback.doorStillBlocked"));
  }

  private handleExteriorWindow(): void {
    const state = this.getState();
    // Player must be in fox form to leap through the window.
    if (state.currentForm !== "fox") {
      this.floatingText(
        EXT_WINDOW_VISUAL.x,
        EXT_WINDOW_VISUAL.y - 80,
        t("hint.cottageInterior.fitThrough"),
        2400,
      );
      return;
    }

    // Going in! Transition to interior layout.
    this.switchMode("interior");
  }

  /** Update the exterior banner hint after state changes. */
  private refreshExteriorHint(): void {
    if (this.mode !== "exterior") return;
    if (this.hintText) this.hintText.setText(this.exteriorHint());
  }

  // --- Interior ----

  private handleDaggerPickup(): void {
    const state = this.getState();
    if (state.hasDagger) return;

    state.hasDagger = true;
    if (state.questProgress < 3) state.questProgress = 3;
    this.setState(state);

    // Metallic chime to signal the pickup landed.
    this.audio.playSfx("sfx-pickup");

    // Visual pickup: drop a fading "Picked up the dagger" message above
    // where it lay, then destroy the sprite.
    if (this.daggerSprite) {
      const px = this.daggerSprite.x;
      const py = this.daggerSprite.y - 30;
      this.floatingText(px, py, t("hint.daggerPickup"), 2000);
      // Quick scale + fade tween on the sprite itself for feedback.
      this.tweens.add({
        targets: this.daggerSprite,
        scale: 1.4,
        alpha: 0,
        duration: 350,
        ease: "Cubic.easeOut",
        onComplete: () => {
          if (this.daggerSprite) {
            this.daggerSprite.destroy();
            this.daggerSprite = undefined;
          }
        },
      });
    }

    // Remove the dagger from the interactable list so the indicator
    // doesn't try to follow a dead sprite.
    this.interactables = this.interactables.filter(
      (it) => it.id !== "int-dagger",
    );
    this.activeId = null;

    this.quest.refresh();
    this.events.emit(GameEvent.ItemPickedUp, "dagger");
    this.refreshInteriorHint();
  }

  private handleSandals(): void {
    if (this.sandalsReadyToRemove) {
      // Second interaction: actually clear them.
      if (this.sandalsSprite) {
        const sx = this.sandalsSprite.x;
        const sy = this.sandalsSprite.y - 20;
        this.floatingText(sx, sy, t("hint.cottageInterior.sandalsMoved"), 1800);
        this.tweens.add({
          targets: this.sandalsSprite,
          alpha: 0,
          x: this.sandalsSprite.x - 40,
          duration: 300,
          onComplete: () => {
            if (this.sandalsSprite) {
              this.sandalsSprite.destroy();
              this.sandalsSprite = undefined;
            }
          },
        });
      }
      this.interactables = this.interactables.filter(
        (it) => it.id !== "int-sandals",
      );
      this.activeId = null;
      this.events.emit("sandals-removed");
      this.refreshInteriorHint();
      return;
    }
    // First interaction: show the dialog. onDialogEnded will arm removal.
    this.tryDialog("sandals-explore", t("hint.fallback.sandalsExplore"));
  }

  private handleInteriorDoor(): void {
    const state = this.getState();
    if (!state.hasDagger) {
      // Don't leave empty-handed.
      this.floatingText(
        INT_DOOR.x,
        INT_DOOR.y - 100,
        t("hint.cottageInterior.notWithout"),
        2200,
      );
      return;
    }
    if (this.sandalsSprite) {
      // Sandals still blocking.
      this.floatingText(
        INT_DOOR.x,
        INT_DOOR.y - 100,
        t("hint.cottageInterior.sandalsBlocking"),
        2000,
      );
      return;
    }
    // Sandals cleared + has dagger → exit to WillowLake.
    this.exitCottage();
  }

  private handleInteriorWindowExit(): void {
    const state = this.getState();
    if (!state.hasDagger) {
      this.floatingText(
        INT_WINDOW_VISUAL.x,
        INT_WINDOW_VISUAL.y + 60,
        t("hint.cottageInterior.notWithout"),
        2200,
      );
      return;
    }
    // Allow the window exit even in human form for the slice — the brief
    // simplifies to "either route works once you have the dagger".
    this.exitCottage();
  }

  private exitCottage(): void {
    this.inputLocked = true;
    this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start(SceneKey.WillowLake, { fromCottage: true });
      },
    );
  }

  private refreshInteriorHint(): void {
    if (this.mode !== "interior") return;
    if (this.hintText) this.hintText.setText(this.interiorHint());
  }

  /** Refresh whichever hint banner the current mode owns. Used on locale change. */
  private refreshHint(): void {
    if (this.mode === "exterior") this.refreshExteriorHint();
    else this.refreshInteriorHint();
  }

  // -------------------------------------------------------------------------
  // Dialog helpers
  // -------------------------------------------------------------------------

  /** Attempt to play a dialog tree by id. If the data file has no entry
   *  for that id (the stub dialogs.ts ships empty), fall back to a single
   *  floating-text line so gameplay still flows. */
  private tryDialog(id: string, fallbackLine: string): void {
    // Inspect the dialog data without forcing a hard import dependency:
    // DialogSystem.start logs and bails if the id is missing. To keep the
    // slice playable while dialogs.ts is still a stub, we check first.
    // We import dialogTrees lazily via a dynamic-style require would be
    // overkill — easier to ask the registry directly.
    const tree = this.lookupDialogTree(id);
    if (tree) {
      this.dialog.start(id);
      return;
    }
    // No dialog yet — play a quick narrative floating-text and emit
    // DialogEnded so any downstream listeners (like the sandals arming
    // logic) still fire as if a real dialog had played.
    const px = this.player.sprite.x;
    const py = this.player.sprite.y - 90;
    this.floatingText(px, py, fallbackLine, 2400);

    // Defer the "DialogEnded" event by the floating-text duration so the
    // player can read the line before subsequent interactions arm.
    this.time.delayedCall(2400, () => {
      this.events.emit(GameEvent.DialogEnded, id);
    });
  }

  /** Pull a dialog node out of the data file without binding directly to
   *  it inside this scene (avoids tight coupling for slice testing). */
  private lookupDialogTree(id: string): unknown | null {
    // Use a runtime import path; the bundled module is already in memory
    // because DialogSystem imported it.
    // We avoid `any` by using `unknown` and a narrow shape probe.
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const data =
      // dialogTrees is imported by DialogSystem at module init; if it's
      // populated, this lookup works. Otherwise returns null.
      (this.cache.json.get("dialogTrees") as Record<string, unknown> | null) ??
      null;
    if (!data) return null;
    return data[id] ?? null;
  }

  /** Listener: when a dialog ends, react to story-driven side-effects. */
  private onDialogEnded(id?: string): void {
    // If the sandals-explore dialog just ended, arm them for removal on
    // the next interaction press.
    if (id === "sandals-explore" || this.justClosedSandalsDialog(id)) {
      this.sandalsReadyToRemove = true;
    }
  }

  /** The actual DialogEnded event fires with no payload from DialogSystem,
   *  so we keep this little helper for forward compatibility. */
  private justClosedSandalsDialog(_id?: string): boolean {
    // Without a payload we can't know which tree closed. The conservative
    // fallback: if the player's currently inside the cottage and standing
    // next to the sandals, treat the close as the sandals dialog's close.
    if (this.mode !== "interior") return false;
    if (!this.sandalsSprite || !this.player || !this.player.sprite)
      return false;
    const d = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      this.sandalsSprite.x,
      this.sandalsSprite.y,
    );
    return d < 100;
  }

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------

  /** Tween a short gold message at the given world coords upward, then fade
   *  and destroy. Used for pickup feedback and missing-dialog fallbacks. */
  private floatingText(x: number, y: number, text: string, durationMs: number): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "18px",
        color: css(Palette.gold),
        fontStyle: "italic",
        align: "center",
        wordWrap: { width: 320 },
        stroke: css(Palette.dark),
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(70);

    this.tweens.add({
      targets: t,
      y: y - 36,
      alpha: 0,
      duration: durationMs,
      ease: "Sine.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  // -------------------------------------------------------------------------
  // Language toggle indicator
  // -------------------------------------------------------------------------

  /** Build the small top-left "[L] EN" / "[L] CS" hint. Fixed to the camera. */
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

  // -------------------------------------------------------------------------
  // State helpers
  // -------------------------------------------------------------------------

  private getState(): GameState {
    return this.registry.get(RegistryKey.GameState) as GameState;
  }

  private setState(state: GameState): void {
    this.registry.set(RegistryKey.GameState, state);
  }
}
