/**
 * GameLoop — rAF driver with clamped delta and a single ordered update list.
 * No fixed timestep. dt = min(elapsed, 0.05).
 */
export type UpdateFn = (dt: number) => void;

interface LoopEntry {
  fn: UpdateFn;
  order: number;
  runWhenPaused: boolean;
}

const MAX_DT = 0.05;

export class GameLoop {
  private entries: LoopEntry[] = [];
  private running = false;
  private paused = false;
  private last = 0;
  private rafId = 0;

  /**
   * Register an update function. Lower `order` runs first.
   * `runWhenPaused` keeps the fn ticking while the loop is paused
   * (renderer, UI-only animation). Returns an unregister function.
   */
  add(fn: UpdateFn, order = 0, runWhenPaused = false): () => void {
    const entry: LoopEntry = { fn, order, runWhenPaused };
    this.entries.push(entry);
    this.entries.sort((a, b) => a.order - b.order);
    return () => {
      const i = this.entries.indexOf(entry);
      if (i >= 0) this.entries.splice(i, 1);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number): void => {
      if (!this.running) return;
      // Clamp 0..MAX_DT (M1 additive: a non-monotonic timestamp source
      // must never produce a negative dt — exponential-damp math diverges).
      const dt = Math.min(Math.max((now - this.last) / 1000, 0), MAX_DT);
      this.last = now;
      // Copy: update fns may add/remove entries mid-frame.
      for (const entry of [...this.entries]) {
        if (this.paused && !entry.runWhenPaused) continue;
        entry.fn(dt);
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (!paused) this.last = performance.now();
  }

  isPaused(): boolean {
    return this.paused;
  }
}
