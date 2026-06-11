/**
 * DialogSystem — the dialog runner (TECH_SPEC §1 dialog/dialogSystem.ts).
 *
 * Walks `data/dialogs.ts` nodes, resolves i18n keys via t(), fires node
 * onEnter / onExit and choice onSelect with DialogContext {flags, emit},
 * drives IDialogUi, flips director.dialogActive through an injected
 * setter, and emits DialogStarted / DialogEnded on the bus (DialogBlip is
 * emitted by the typewriter inside ui/dialogUi.ts).
 *
 * Typewriter "complete-then-advance" semantics: advance() finishes the
 * current line when it is still typing, and only moves to the next node
 * on the following advance. Input plumbing: ui/dialogUi.ts handles all
 * dialog keyboard/mouse input itself and calls back into advance()
 * through the setRequestAdvance hook — the integrator must NOT also wire
 * input actions to advance()/choose() (both are nevertheless idempotent
 * and debounced, so accidental double-wiring stays harmless).
 *
 * Integrator wiring example:
 *   const dialog = new DialogSystem({
 *     ui: dialogUi,            // DialogUiHandle from createDialogUi
 *     bus,
 *     getFlags: () => flagStore.flags,
 *     setDialogActive: (a) => { director.dialogActive = a; },
 *   });
 */
import type { DialogChoice, DialogContext, DialogNode, GameFlags } from '@/core/types';
import type { EventBus } from '@/core/events';
import type { DialogUiPort } from '@/ui/dialogUi';
import { getDialogNode } from '@/data/dialogs';
import { onLocaleChange, t } from '@/i18n';

export interface DialogSystemOptions {
  /** The dialog panel. Accepts plain IDialogUi or the extended handle. */
  ui: DialogUiPort;
  bus: EventBus;
  /** Live flags accessor — restart swaps the flags object, never cache it. */
  getFlags: () => GameFlags;
  /** Setter for director.dialogActive (constructor injection per spec). */
  setDialogActive: (active: boolean) => void;
  /** Node lookup; defaults to data/dialogs.ts getDialogNode. */
  getNode?: (id: string) => DialogNode | undefined;
}

type RunnerState = 'idle' | 'typing' | 'lineDone' | 'choices';

/** Ignore advance() calls closer together than this (double-wiring guard). */
const ADVANCE_DEBOUNCE_MS = 60;

function speakerLabelKey(node: DialogNode): string | null {
  switch (node.speaker) {
    case 'mizumi':
      return 'speaker.mizumi';
    case 'yanagi':
      return 'speaker.yanagi';
    case 'none':
      return null;
  }
}

export class DialogSystem {
  private readonly ui: DialogUiPort;
  private readonly bus: EventBus;
  private readonly getFlags: () => GameFlags;
  private readonly setDialogActive: (active: boolean) => void;
  private readonly getNode: (id: string) => DialogNode | undefined;

  private state: RunnerState = 'idle';
  private node: DialogNode | null = null;
  /** Choices currently presented (already filtered by enabled()). */
  private visibleChoices: DialogChoice[] = [];
  private lastAdvanceAt = 0;
  private readonly offLocale: () => void;

  constructor(options: DialogSystemOptions) {
    this.ui = options.ui;
    this.bus = options.bus;
    this.getFlags = options.getFlags;
    this.setDialogActive = options.setDialogActive;
    this.getNode = options.getNode ?? getDialogNode;
    this.ui.setRequestAdvance?.(() => this.advance());
    this.offLocale = onLocaleChange(() => this.rerender());
  }

  // ───────────────────────────────────────────────── public API ──

  isActive(): boolean {
    return this.state !== 'idle';
  }

  get currentNodeId(): string | null {
    return this.node?.id ?? null;
  }

  /** Start a dialog at a root node id (see data/dialogs.ts DialogRoot). */
  start(rootId: string): void {
    const node = this.getNode(rootId);
    if (!node) {
      console.warn(`[dialog] unknown node id "${rootId}"`);
      return;
    }
    if (this.isActive()) this.close(); // emits DialogEnded for the old one
    this.setDialogActive(true);
    this.ui.open();
    this.bus.emit('DialogStarted', rootId);
    this.enterNode(node);
  }

  /**
   * Player advance (E/Space/Enter/click). Completes the current line when
   * still typing; otherwise moves on through `next` (or ends the dialog).
   * Ignored while choices are on screen — those need an explicit pick.
   */
  advance(): void {
    if (!this.isActive()) return;
    const now = performance.now();
    if (now - this.lastAdvanceAt < ADVANCE_DEBOUNCE_MS) return;
    this.lastAdvanceAt = now;

    if (this.state === 'typing') {
      this.ui.completeLine(); // its onComplete fires handleLineComplete()
      return;
    }
    if (this.state !== 'lineDone' || !this.node) return;
    this.goTo(this.node.next ?? null);
  }

  /** Keyboard path for choices (0-based). No-op when nothing is shown. */
  choose(index: number): void {
    if (this.state !== 'choices') return;
    this.ui.pickChoice(index);
  }

  /** Force-close (cutscene interrupt, restart). Fires onExit of the node. */
  close(): void {
    if (!this.isActive() || !this.node) return;
    const node = this.node;
    node.onExit?.(this.context());
    this.finish(node.id);
  }

  /** Detach locale subscription (restart teardown). */
  dispose(): void {
    this.offLocale();
    this.ui.setRequestAdvance?.(null);
  }

  // ──────────────────────────────────────────────────── internals ──

  private context(): DialogContext {
    return {
      flags: this.getFlags(),
      emit: (event, ...args) => this.bus.emit(event, ...args),
    };
  }

  private enterNode(node: DialogNode): void {
    this.node = node;
    node.onEnter?.(this.context());
    this.present(node, /* instant */ false);
  }

  /** Presentation only — never re-fires hooks. Safe for locale rerender. */
  private present(node: DialogNode, instant: boolean): void {
    const labelKey = speakerLabelKey(node);
    this.ui.setSpeaker(labelKey ? t(labelKey) : null);
    this.ui.setSpeakerId?.(node.speaker);
    const text = node.textKey ? t(node.textKey) : '';
    this.state = 'typing';
    this.ui.showLine(text, () => this.handleLineComplete());
    if (instant) this.ui.completeLine();
  }

  private rerender(): void {
    if (!this.isActive() || !this.node) return;
    const wasTyping = this.state === 'typing';
    // Re-resolve everything in the new locale; keep typing lines typing.
    this.present(this.node, !wasTyping);
  }

  private handleLineComplete(): void {
    const node = this.node;
    if (!node) return;
    const choices = (node.choices ?? []).filter((c) => c.enabled?.(this.context()) !== false);
    if (choices.length > 0) {
      this.visibleChoices = choices;
      this.state = 'choices';
      this.ui.showChoices(
        choices.map((c) => t(c.textKey)),
        (index) => this.handlePick(index),
      );
    } else if (node.choices && node.choices.length > 0) {
      // Authored choices all hidden — degrade to a linear node.
      this.state = 'lineDone';
    } else {
      this.state = 'lineDone';
    }
  }

  private handlePick(index: number): void {
    const choice = this.visibleChoices[index];
    if (!choice || this.state !== 'choices') return;
    this.visibleChoices = [];
    choice.onSelect?.(this.context());
    this.goTo(choice.next);
  }

  /** Leave the current node (onExit) and enter `nextId` or end. */
  private goTo(nextId: string | null): void {
    const node = this.node;
    if (!node) return;
    node.onExit?.(this.context());
    if (nextId !== null) {
      const next = this.getNode(nextId);
      if (next) {
        this.enterNode(next);
        return;
      }
      console.warn(`[dialog] unknown next node id "${nextId}" — ending dialog`);
    }
    this.finish(node.id);
  }

  /** Tear down and emit DialogEnded LAST so handlers may chain start(). */
  private finish(lastNodeId: string): void {
    this.state = 'idle';
    this.node = null;
    this.visibleChoices = [];
    this.ui.close();
    this.setDialogActive(false);
    this.bus.emit('DialogEnded', lastNodeId);
  }
}
