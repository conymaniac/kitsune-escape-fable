/**
 * TriggerSystem — circle trigger-volume registry (TECH_SPEC §1
 * gameplay/triggers.ts).
 *
 * Enter/exit callbacks on XZ circles, once-flags (auto-unregister after
 * the first enter), enabled() predicates and optional form predicates
 * (`form: 'fox'` = only a fox trips it — the window-leap point). The
 * quest script registers its volumes (ghost ambient r 15, dialog r 3,
 * willow return zone, tutorial beats) through this registry.
 *
 * A trigger that turns disabled (or stops matching the form) while the
 * player stands inside fires onExit — quest logic never sees a stale
 * "inside" state.
 */
import type * as THREE from 'three';
import type { KitsuneForm, TriggerVolume } from '@/core/types';

export interface TriggerDef extends TriggerVolume {
  /** Only this form trips the trigger (e.g. the fox-only window leap). */
  form?: KitsuneForm;
}

interface Entry {
  def: TriggerDef;
  inside: boolean;
}

export interface TriggerSystemOptions {
  getPlayerPos: () => THREE.Vector3;
  getForm: () => KitsuneForm;
  /** Global gate (director.canPlayerAct()); exits still fire when false. */
  isActive: () => boolean;
}

export class TriggerSystem {
  private readonly entries: Entry[] = [];
  private readonly opts: TriggerSystemOptions;

  constructor(opts: TriggerSystemOptions) {
    this.opts = opts;
  }

  /** Register a trigger volume. Returns an unregister function. */
  register(def: TriggerDef): () => void {
    const entry: Entry = { def, inside: false };
    this.entries.push(entry);
    return () => this.remove(entry);
  }

  unregister(id: string): void {
    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.entries[i];
      if (entry && entry.def.id === id) this.entries.splice(i, 1);
    }
  }

  /** Drop everything (restart). */
  clear(): void {
    this.entries.length = 0;
  }

  update(): void {
    const pos = this.opts.getPlayerPos();
    const form = this.opts.getForm();
    const active = this.opts.isActive();

    for (let i = this.entries.length - 1; i >= 0; i -= 1) {
      const entry = this.entries[i];
      if (!entry) continue;
      const def = entry.def;

      const eligible =
        active &&
        (def.enabled === undefined || def.enabled()) &&
        (def.form === undefined || def.form === form);

      let inside = false;
      if (eligible) {
        const dx = pos.x - def.position.x;
        const dz = pos.z - def.position.z;
        inside = dx * dx + dz * dz <= def.radius * def.radius;
      }

      if (inside && !entry.inside) {
        entry.inside = true;
        def.onEnter?.();
        if (def.once) this.remove(entry);
      } else if (!inside && entry.inside) {
        entry.inside = false;
        def.onExit?.();
      }
    }
  }

  // ── internals ──

  private remove(entry: Entry): void {
    const i = this.entries.indexOf(entry);
    if (i >= 0) this.entries.splice(i, 1);
  }
}
