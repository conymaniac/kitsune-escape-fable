/**
 * DialogSystem
 *
 * Renders a JRPG-style dialog panel at the bottom of the screen, drawn with
 * Phaser Graphics + Text (no HTML overlay). Supports:
 *   - typewriter reveal of body text
 *   - SPACE to fast-forward / advance
 *   - branching player choices (arrow keys + ENTER, number keys, or mouse)
 *   - per-node onEnter and per-choice onSelect side-effects
 *
 * Public contract: see IDialogSystem in @/types.
 *
 * Lifecycle:
 *   - start(rootId) builds the panel (or reuses an existing one), sets
 *     RegistryKey.DialogActive = true, and walks the tree node by node.
 *   - close() tears the panel down, flips DialogActive to false, and emits
 *     GameEvent.DialogEnded on the scene events bus.
 */

import Phaser from "phaser";
import {
  IDialogSystem,
  DialogNode,
  DialogChoice,
  DialogContext,
  GameEvent,
  GameState,
  RegistryKey,
} from "@/types";
import { Palette } from "@/art/palette";
import { dialogTrees } from "@/data/dialogs";
import { t } from "@/i18n";
import type { AudioSystem } from "@/systems/AudioSystem";

/** Play a dialog-blip every N revealed characters (~ every 4) to soften it. */
const BLIP_CHAR_STRIDE = 4;

// --- Layout constants (centralised for readability) ---
const PANEL_WIDTH = 1280;
const PANEL_HEIGHT = 200;
const PANEL_X = 0;
const PANEL_Y = 520;
const PADDING = 32;
const BORDER_THICKNESS = 4;

const SPEAKER_FONT_SIZE = 18;
const BODY_FONT_SIZE = 22;
const CHOICE_FONT_SIZE = 18;
const HINT_FONT_SIZE = 14;

const TYPEWRITER_MS_PER_CHAR = 30;
const FADE_DURATION_MS = 200;

/**
 * Resolve a speaker label via the active locale. Looks up `speaker.<id>`
 * in the i18n dictionary. NARRATOR / PLAYER_CHOICE map to an empty string.
 */
const speakerLabel = (speaker: DialogNode["speaker"]): string =>
  t(`speaker.${speaker}`);

export class DialogSystem implements IDialogSystem {
  private readonly scene: Phaser.Scene;

  // Visual root + child references. Created lazily on the first start().
  private container: Phaser.GameObjects.Container | null = null;
  private bg: Phaser.GameObjects.Graphics | null = null;
  private speakerText: Phaser.GameObjects.Text | null = null;
  private bodyText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  // Runtime state
  private active = false;
  private currentNode: DialogNode | null = null;
  private fullBody = "";
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private isTyping = false;
  private selectedChoice = 0;

  // Keyboard handler installed on window for the duration of the dialog.
  // Held in a field so we can remove it cleanly on teardown.
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // --- Public API ---------------------------------------------------------

  start(rootId: string): void {
    const node = dialogTrees[rootId];
    if (!node) {
      console.warn(`[DialogSystem] No dialog tree found for id "${rootId}"`);
      return;
    }

    // If we're already active, snap the previous dialog shut before opening
    // the new one. Avoids stuck state when triggers overlap.
    if (this.active) this.teardown();

    this.active = true;
    this.scene.registry.set(RegistryKey.DialogActive, true);

    this.buildPanel();
    this.installInput();
    this.fadeIn();
    this.renderNode(node);
  }

  isActive(): boolean {
    return this.active;
  }

  close(): void {
    if (!this.active) return;
    this.fadeOut(() => {
      this.teardown();
      this.scene.events.emit(GameEvent.DialogEnded);
    });
  }

  // --- Panel construction -------------------------------------------------

  private buildPanel(): void {
    const c = this.scene.add.container(PANEL_X, PANEL_Y);
    c.setDepth(1000);
    c.setScrollFactor(0);
    c.setAlpha(0);

    // Background fill + top border line.
    const bg = this.scene.add.graphics();
    bg.fillStyle(Palette.dark, 0.9);
    bg.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
    bg.fillStyle(Palette.orange, 1);
    bg.fillRect(0, 0, PANEL_WIDTH, BORDER_THICKNESS);
    c.add(bg);

    // Speaker label (top-left of inner area).
    const speaker = this.scene.add
      .text(PADDING, PADDING - 4, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${SPEAKER_FONT_SIZE}px`,
        fontStyle: "bold",
        color: this.toCss(Palette.gold),
      })
      .setOrigin(0, 0);
    c.add(speaker);

    // Body text — word-wrapped to inner width.
    const body = this.scene.add
      .text(PADDING, PADDING + SPEAKER_FONT_SIZE + 8, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${BODY_FONT_SIZE}px`,
        color: this.toCss(Palette.cream),
        wordWrap: { width: PANEL_WIDTH - PADDING * 2, useAdvancedWrap: true },
      })
      .setOrigin(0, 0);
    c.add(body);

    // Hint in bottom-right.
    const hint = this.scene.add
      .text(PANEL_WIDTH - PADDING, PANEL_HEIGHT - PADDING + 4, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: `${HINT_FONT_SIZE}px`,
        color: this.toCss(Palette.gold),
      })
      .setOrigin(1, 1);
    c.add(hint);

    this.container = c;
    this.bg = bg;
    this.speakerText = speaker;
    this.bodyText = body;
    this.hintText = hint;
    this.choiceTexts = [];
  }

  // --- Node rendering -----------------------------------------------------

  private renderNode(node: DialogNode): void {
    this.currentNode = node;
    this.clearChoices();
    this.selectedChoice = 0;

    // Fire onEnter BEFORE the typewriter starts — gameplay side-effects need
    // to be visible (e.g. quest flag flipped) by the time the line shows.
    if (node.onEnter) {
      try {
        node.onEnter(this.buildContext());
      } catch (err) {
        console.error("[DialogSystem] onEnter threw", err);
      }
    }

    // Update speaker label. NARRATOR / PLAYER_CHOICE have no label.
    if (this.speakerText) {
      this.speakerText.setText(speakerLabel(node.speaker));
    }

    // Begin typewriter on body text. Node `text` is a translation key —
    // resolve it lazily so a mid-game locale change is reflected.
    this.fullBody = t(node.text);
    if (this.bodyText) this.bodyText.setText("");
    this.startTypewriter();

    // Hint depends on whether we're entering choices or a linear node.
    if (this.hintText) {
      const isChoice = !!node.choices && node.choices.length > 0;
      this.hintText.setText(
        t(isChoice ? "ui.dialog.hint.choice" : "ui.dialog.hint.advance"),
      );
    }
  }

  /** Animate body text one character at a time. */
  private startTypewriter(): void {
    this.cancelTypewriter();
    this.isTyping = true;

    let i = 0;
    this.typewriterTimer = this.scene.time.addEvent({
      delay: TYPEWRITER_MS_PER_CHAR,
      loop: true,
      callback: () => {
        i++;
        if (this.bodyText) {
          this.bodyText.setText(this.fullBody.substring(0, i));
        }
        // Soft per-character "blip" — only on real glyphs and only every
        // few chars so it doesn't turn into a chiptune mess.
        const ch = this.fullBody.charAt(i - 1);
        if (
          ch &&
          ch !== " " &&
          ch !== "\n" &&
          i % BLIP_CHAR_STRIDE === 0
        ) {
          this.getAudio()?.playSfx("sfx-dialog-blip", 0.5);
        }
        if (i >= this.fullBody.length) {
          this.cancelTypewriter();
          this.isTyping = false;
          this.onTypewriterFinished();
        }
      },
    });
  }

  private cancelTypewriter(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove(false);
      this.typewriterTimer = null;
    }
  }

  /** Called once the body text is fully revealed. Shows choices if any. */
  private onTypewriterFinished(): void {
    if (!this.currentNode) return;
    const choices = this.currentNode.choices;
    if (choices && choices.length > 0) {
      this.renderChoices(choices);
    }
  }

  /** Lay out choices below the body text. */
  private renderChoices(choices: DialogChoice[]): void {
    if (!this.container || !this.bodyText) return;

    // Anchor choices just below the rendered body.
    const startY = this.bodyText.y + this.bodyText.height + 10;
    const lineHeight = CHOICE_FONT_SIZE + 8;

    choices.forEach((choice, idx) => {
      // choice.text is a translation key — resolve via t().
      const label = `▸ ${idx + 1}. ${t(choice.text)}`;
      const txt = this.scene.add
        .text(PADDING + 16, startY + idx * lineHeight, label, {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: `${CHOICE_FONT_SIZE}px`,
          color: this.toCss(Palette.cream),
        })
        .setOrigin(0, 0);

      // Mouse: hover selects, click confirms. Keep keyboard authoritative.
      txt.setInteractive({ useHandCursor: true });
      txt.on("pointerover", () => {
        this.selectedChoice = idx;
        this.updateChoiceHighlight();
      });
      txt.on("pointerdown", () => {
        this.selectedChoice = idx;
        this.confirmChoice();
      });

      this.container!.add(txt);
      this.choiceTexts.push(txt);
    });

    this.updateChoiceHighlight();
  }

  /** Recolour choice rows so the selected one is gold. */
  private updateChoiceHighlight(): void {
    this.choiceTexts.forEach((txt, idx) => {
      txt.setColor(
        idx === this.selectedChoice
          ? this.toCss(Palette.gold)
          : this.toCss(Palette.cream)
      );
    });
  }

  private clearChoices(): void {
    this.choiceTexts.forEach((t) => t.destroy());
    this.choiceTexts = [];
  }

  // --- Input --------------------------------------------------------------

  /**
   * We hook native keydown rather than Phaser keys: dialog state outlives
   * any particular scene's key bindings, and we want to consume input
   * regardless of which keys the scene happens to have registered.
   */
  private installInput(): void {
    const onKey = (event: KeyboardEvent): void => this.handleKey(event);
    window.addEventListener("keydown", onKey);
    this.keydownHandler = onKey;
  }

  private uninstallInput(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler);
      this.keydownHandler = null;
    }
  }

  private handleKey(event: KeyboardEvent): void {
    if (!this.active || !this.currentNode) return;

    const node = this.currentNode;
    const choices = node.choices;
    const inChoices = !!choices && choices.length > 0 && !this.isTyping;

    // SPACE: advance / fast-forward (only valid when not in choices).
    if (event.code === "Space") {
      event.preventDefault();
      if (this.isTyping) {
        this.revealAll();
      } else if (!inChoices) {
        this.advanceLinear();
      }
      return;
    }

    if (inChoices) {
      // Arrow keys navigate.
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        this.selectedChoice =
          (this.selectedChoice - 1 + choices.length) % choices.length;
        this.updateChoiceHighlight();
        return;
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        this.selectedChoice = (this.selectedChoice + 1) % choices.length;
        this.updateChoiceHighlight();
        return;
      }

      // ENTER confirms.
      if (event.code === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        this.confirmChoice();
        return;
      }

      // Number keys 1-4 pick directly.
      const numIdx = this.numberKeyIndex(event.code);
      if (numIdx !== -1 && numIdx < choices.length) {
        event.preventDefault();
        this.selectedChoice = numIdx;
        this.confirmChoice();
        return;
      }
    }
  }

  private numberKeyIndex(code: string): number {
    switch (code) {
      case "Digit1":
      case "Numpad1":
        return 0;
      case "Digit2":
      case "Numpad2":
        return 1;
      case "Digit3":
      case "Numpad3":
        return 2;
      case "Digit4":
      case "Numpad4":
        return 3;
      default:
        return -1;
    }
  }

  /** Reveal the whole body line immediately. */
  private revealAll(): void {
    this.cancelTypewriter();
    if (this.bodyText) this.bodyText.setText(this.fullBody);
    this.isTyping = false;
    this.onTypewriterFinished();
  }

  /** Move to next node for a non-choice linear node. */
  private advanceLinear(): void {
    if (!this.currentNode) return;
    this.getAudio()?.playSfx("sfx-interact", 0.7);
    const nextId = this.currentNode.next;
    if (!nextId || nextId === "END") {
      this.close();
      return;
    }
    const nextNode = dialogTrees[nextId];
    if (!nextNode) {
      console.warn(`[DialogSystem] Missing next node "${nextId}"`);
      this.close();
      return;
    }
    this.renderNode(nextNode);
  }

  /** Confirm currently highlighted choice. */
  private confirmChoice(): void {
    if (!this.currentNode || !this.currentNode.choices) return;
    const choice = this.currentNode.choices[this.selectedChoice];
    if (!choice) return;

    this.getAudio()?.playSfx("sfx-interact", 0.7);

    if (choice.onSelect) {
      try {
        choice.onSelect(this.buildContext());
      } catch (err) {
        console.error("[DialogSystem] onSelect threw", err);
      }
    }

    if (choice.next === "END") {
      this.close();
      return;
    }
    const nextNode = dialogTrees[choice.next];
    if (!nextNode) {
      console.warn(`[DialogSystem] Missing choice.next "${choice.next}"`);
      this.close();
      return;
    }
    this.renderNode(nextNode);
  }

  /** Resolve the scene-shared AudioSystem (may be undefined if a scene
   *  hasn't registered it yet — silently no-op). */
  private getAudio(): AudioSystem | null {
    return (this.scene.registry.get("audio") as AudioSystem | undefined) ?? null;
  }

  // --- Fade in / out ------------------------------------------------------

  private fadeIn(): void {
    if (!this.container) return;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: FADE_DURATION_MS,
      ease: "Sine.easeOut",
    });
  }

  private fadeOut(onComplete: () => void): void {
    if (!this.container) {
      onComplete();
      return;
    }
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: FADE_DURATION_MS,
      ease: "Sine.easeIn",
      onComplete,
    });
  }

  // --- Teardown -----------------------------------------------------------

  private teardown(): void {
    this.cancelTypewriter();
    this.uninstallInput();
    this.clearChoices();
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
    this.bg = null;
    this.speakerText = null;
    this.bodyText = null;
    this.hintText = null;
    this.currentNode = null;
    this.active = false;
    this.scene.registry.set(RegistryKey.DialogActive, false);
  }

  // --- Helpers ------------------------------------------------------------

  private buildContext(): DialogContext {
    return {
      scene: this.scene,
      state: this.scene.registry.get(RegistryKey.GameState) as GameState,
      emit: (event, ...args) => this.scene.events.emit(event, ...args),
    };
  }

  /** Convert a Palette hex number into a CSS string for Phaser.Text. */
  private toCss(color: number): string {
    return "#" + color.toString(16).padStart(6, "0");
  }
}
