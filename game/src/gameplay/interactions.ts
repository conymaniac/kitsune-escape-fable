/**
 * InteractionSystem — the Interactable registry (TECH_SPEC §1
 * gameplay/interactions.ts).
 *
 * Per frame: pick the best candidate (in range, roughly faced — dot >
 * 0.25 toward the target, enabled()), drive the IHud prompt (localized
 * promptKey; form-gated actions show the crossed-paw blocked variant —
 * humanOnly while fox and vice versa), fire onInteract on E.
 *
 * E only fires when the injected canInteract() gate allows it (main wires
 * director.canPlayerAct() + player-not-busy). While a dialog is open the
 * dialog UI owns E entirely (E-ui note) — canPlayerAct() is already false
 * then, and the prompt hides too.
 */
import type { Interactable, KitsuneForm } from '@/core/types';
import type * as THREE from 'three';
import type { EventBus } from '@/core/events';
import type { Input } from '@/core/input';
import type { IHud } from '@/core/types';

/** Accept facing-agnostic interaction when this close (avoids fiddling). */
const NEAR_OVERRIDE_DIST = 0.45;
const FACING_DOT_MIN = 0.25;

export interface InteractionSystemOptions {
  hud: IHud;
  bus: EventBus;
  input: Input;
  getPlayerPos: () => THREE.Vector3;
  /** Heading in radians around +Y (0 = +Z). */
  getPlayerFacing: () => number;
  getForm: () => KitsuneForm;
  /** Global gate: director.canPlayerAct() && player not busy. */
  canInteract: () => boolean;
}

export class InteractionSystem {
  private readonly items: Interactable[] = [];
  private readonly opts: InteractionSystemOptions;

  /** Current best candidate (null = no prompt). */
  private current: Interactable | null = null;
  private currentBlocked = false;

  /** Last prompt pushed to the HUD (avoid re-rendering every frame). */
  private lastPromptKey: string | null = null;
  private lastBlocked = false;

  constructor(opts: InteractionSystemOptions) {
    this.opts = opts;
  }

  /** Register an interactable. Returns an unregister function. */
  register(item: Interactable): () => void {
    this.items.push(item);
    return () => this.unregister(item.id);
  }

  unregister(id: string): void {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const item = this.items[i];
      if (item && item.id === id) this.items.splice(i, 1);
    }
  }

  /** The interactable currently prompted (quest-script introspection). */
  get active(): Interactable | null {
    return this.current;
  }

  /** True when the prompted action is form-blocked (crossed paw). */
  get activeBlocked(): boolean {
    return this.currentBlocked;
  }

  update(): void {
    const opts = this.opts;

    if (!opts.canInteract()) {
      this.setCurrent(null, false);
      return;
    }

    const pos = opts.getPlayerPos();
    const heading = opts.getPlayerFacing();
    const faceX = Math.sin(heading);
    const faceZ = Math.cos(heading);
    const form = opts.getForm();

    let best: Interactable | null = null;
    let bestBlocked = false;
    let bestPriority = Number.NEGATIVE_INFINITY;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      if (!item) continue;
      if (item.enabled && !item.enabled()) continue;

      const dx = item.position.x - pos.x;
      const dz = item.position.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > item.radius) continue;

      // Facing: dot(facing, toTarget) > 0.25 unless practically on top.
      if (dist > NEAR_OVERRIDE_DIST) {
        const dot = (dx / dist) * faceX + (dz / dist) * faceZ;
        if (dot <= FACING_DOT_MIN) continue;
      }

      const blocked = (item.humanOnly === true && form === 'fox') ||
        (item.foxOnly === true && form === 'human');

      const priority = item.priority ?? 0;
      if (priority > bestPriority || (priority === bestPriority && dist < bestDist)) {
        best = item;
        bestBlocked = blocked;
        bestPriority = priority;
        bestDist = dist;
      }
    }

    this.setCurrent(best, bestBlocked);

    if (best && !bestBlocked && opts.input.justPressed('interact')) {
      best.onInteract();
      opts.bus.emit('Interacted', best.id);
    }
  }

  /** Drop everything (restart). */
  clear(): void {
    this.items.length = 0;
    this.setCurrent(null, false);
  }

  // ── internals ──

  private setCurrent(item: Interactable | null, blocked: boolean): void {
    this.current = item;
    this.currentBlocked = blocked;
    const key = item ? item.promptKey : null;
    if (key !== this.lastPromptKey || blocked !== this.lastBlocked) {
      this.lastPromptKey = key;
      this.lastBlocked = blocked;
      this.opts.hud.setPrompt(key, blocked);
    }
  }
}
