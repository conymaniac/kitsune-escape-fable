/**
 * WindSystem — the night wind, the antagonist (DESIGN §3, TECH_SPEC §1).
 *
 * Seeded gust state machine: calm (10–14 s, escalation-adjustable via
 * setCalmRange) → telegraph (3 s) → lash (4 s) → calm. Strength is a
 * smooth 0..1 envelope (base oscillation ~0.15 in calm). Owns the shared
 * WindUniforms {uTime, uWindStrength, uWindDir} that world/props and the
 * M2 sway/water shaders consume.
 *
 * Prevailing direction NW→SE ≈ (+0.707, +0.707) on XZ — B-world's wind
 * shadows sit on the SE lee of their obstacles and MUST keep this
 * convention (BUILD_STATE M1 B-world note). Direction wanders a few
 * degrees per gust but never flips.
 *
 * Events: GustStart('telegraph') at telegraph start, GustStart('lash') at
 * lash start, GustEnd when the lash ends, WindStopped on stopForever().
 *
 * Lash-zone hazard: during lash, a player inside a LashZone circle is
 * knocked down (either form) and pushed away from the zone centre. The
 * player itself rejects the call while bracing / already down / in
 * post-recovery grace.
 *
 * setEnabled(false) pauses gusts (interior — DESIGN §3: no gust cycle in
 * the cottage); a gust in flight is cancelled back to calm.
 * stopForever() eases strength to 0 and never gusts again (the finale).
 *
 * M4: after stopForever() the shared shader CLOCK also winds down to a
 * halt (~3 s ease) — the sway shader keeps a small idle breath even at
 * strength 0 and the water keeps scrolling, so freezing uTime is what
 * actually delivers DESIGN §5 "willows dead still, lake to glass".
 */
import * as THREE from 'three';
import type { GustPhase, LashZone, WindState, WindUniforms } from '@/core/types';
import type { EventBus } from '@/core/events';

export const TELEGRAPH_SEC = 3;
export const LASH_SEC = 4;
const DEFAULT_CALM_MIN = 10;
const DEFAULT_CALM_MAX = 14;

/** Base wind direction: prevailing NW→SE (see B-world note). */
const BASE_DIR = new THREE.Vector2(0.7071, 0.7071);
/** Max wander either side of the prevailing direction (radians). */
const DIR_WANDER = 0.18;

/** Strength targets per phase (the envelope eases between them). */
const CALM_BASE = 0.15;
const TELEGRAPH_PEAK = 0.55;
const LASH_PEAK = 0.9;

/** mulberry32 — tiny seeded PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The minimal player surface the hazard check needs. */
export interface WindKnockdownTarget {
  pos: THREE.Vector3;
  /** Returns true when the knockdown actually landed (not braced/graced). */
  applyKnockdown(pushDir: THREE.Vector2): boolean;
}

export class WindSystem {
  /** Live state — player/world/audio read this every frame. */
  readonly state: WindState;
  /** Shared shader uniforms (uWindDir.value aliases state.direction). */
  readonly uniforms: WindUniforms;

  private readonly bus: EventBus;
  private readonly rand: () => number;

  private calmMin = DEFAULT_CALM_MIN;
  private calmMax = DEFAULT_CALM_MAX;

  private phaseT = 0;
  private phaseDur: number;
  private enabled = true;
  private stoppedForever = false;
  /** Shader-clock rate; winds down to 0 after stopForever (dead still). */
  private timeScale = 1;

  private baseAngle = Math.atan2(BASE_DIR.y, BASE_DIR.x);
  private dirAngle = this.baseAngle;

  private lashZones: readonly LashZone[] = [];
  private player: WindKnockdownTarget | null = null;
  private readonly pushTmp = new THREE.Vector2();
  /**
   * M4 fairness rule: the branch whip catches you at most ONCE per lash —
   * a player who recovers inside the zone gets to escape instead of being
   * knock-locked until the gust ends. Only a LANDED knockdown arms it, so
   * dropping a brace mid-lash is still punishable.
   */
  private knockedThisGust = false;

  constructor(bus: EventBus, seed = 0x9e3779b9) {
    this.bus = bus;
    this.rand = mulberry32(seed);
    this.state = {
      time: 0,
      strength: CALM_BASE,
      direction: BASE_DIR.clone(),
      phase: 'calm',
      stopped: false,
    };
    this.uniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: this.state.strength },
      uWindDir: { value: this.state.direction },
    };
    this.phaseDur = this.nextCalmDuration();
  }

  // ── configuration ──

  /** Escalation hook: calm windows shrink 14 → 12 → 8 s (DESIGN §3). */
  setCalmRange(minSec: number, maxSec: number): void {
    this.calmMin = minSec;
    this.calmMax = Math.max(minSec, maxSec);
  }

  /** Pause/resume gust scheduling (interior). Cancels a gust in flight. */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled && this.state.phase !== 'calm') {
      this.endGust();
    }
    if (enabled) {
      this.phaseT = 0;
      this.phaseDur = this.nextCalmDuration();
    }
  }

  /**
   * Tutorial hook (M1 questScript, additive): start one full
   * telegraph→lash cycle right now. No-op unless calm, enabled and not
   * stopped — the scripted first gust past the farm gate (DESIGN §8).
   */
  triggerGustNow(): void {
    if (this.stoppedForever || !this.enabled) return;
    if (this.state.phase !== 'calm') return;
    this.advancePhase(); // calm → telegraph (emits GustStart('telegraph'))
  }

  /** The finale: ease to dead still, never gust again. Silence. */
  stopForever(): void {
    if (this.stoppedForever) return;
    this.stoppedForever = true;
    this.state.stopped = true;
    if (this.state.phase !== 'calm') this.endGust();
    this.bus.emit('WindStopped');
  }

  setLashZones(zones: readonly LashZone[]): void {
    this.lashZones = zones;
  }

  /** Wire the player for lash-zone knockdowns (null while disabled). */
  setPlayer(player: WindKnockdownTarget | null): void {
    this.player = player;
  }

  // ── per-frame ──

  update(dt: number): void {
    if (this.stoppedForever) {
      // The dying breath: strength drains in ~1 s, then the shader clock
      // itself slows to a stop (~3 s) — sway/water freeze, world to glass.
      this.timeScale += (0 - this.timeScale) * (1 - Math.exp(-dt * 1.1));
      if (this.timeScale < 0.01) this.timeScale = 0;
      this.state.time += dt * this.timeScale;
      this.state.strength += (0 - this.state.strength) * (1 - Math.exp(-dt * 3.2));
      if (this.state.strength < 0.005) this.state.strength = 0;
      this.syncUniforms();
      return;
    }

    this.state.time += dt;

    if (this.enabled) {
      this.phaseT += dt;
      if (this.phaseT >= this.phaseDur) this.advancePhase();
    }

    // Smooth strength envelope toward the phase target (+ oscillation).
    const t = this.state.time;
    let target: number;
    let rate: number;
    switch (this.state.phase) {
      case 'telegraph': {
        const k = Math.min(this.phaseT / TELEGRAPH_SEC, 1);
        target = CALM_BASE + (TELEGRAPH_PEAK - CALM_BASE) * k * k;
        rate = 4;
        break;
      }
      case 'lash':
        target = LASH_PEAK + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1);
        rate = 7;
        break;
      default:
        target = CALM_BASE + 0.04 * Math.sin(t * 0.5) + 0.025 * Math.sin(t * 1.3);
        rate = 1.6;
    }
    this.state.strength += (target - this.state.strength) * (1 - Math.exp(-dt * rate));

    // Hazard: lash-zone branch whips knock either form down (once per gust).
    if (this.state.phase === 'lash' && this.player && !this.knockedThisGust) {
      const p = this.player.pos;
      for (let i = 0; i < this.lashZones.length; i += 1) {
        const zone = this.lashZones[i];
        if (!zone) continue;
        const dx = p.x - zone.center.x;
        const dz = p.z - zone.center.z;
        if (dx * dx + dz * dz <= zone.radius * zone.radius) {
          const len = Math.sqrt(dx * dx + dz * dz);
          if (len > 1e-4) this.pushTmp.set(dx / len, dz / len);
          else this.pushTmp.set(-this.state.direction.x, -this.state.direction.y);
          if (this.player.applyKnockdown(this.pushTmp)) this.knockedThisGust = true;
          break;
        }
      }
    }

    this.syncUniforms();
  }

  // ── internals ──

  private advancePhase(): void {
    switch (this.state.phase) {
      case 'calm':
        this.setPhase('telegraph', TELEGRAPH_SEC);
        // New gust → wander the direction a little around prevailing NW→SE.
        this.dirAngle = this.baseAngle + (this.rand() * 2 - 1) * DIR_WANDER;
        this.state.direction.set(Math.cos(this.dirAngle), Math.sin(this.dirAngle));
        this.bus.emit('GustStart', 'telegraph' satisfies GustPhase);
        break;
      case 'telegraph':
        this.setPhase('lash', LASH_SEC);
        this.knockedThisGust = false; // the whip is re-armed for this lash
        this.bus.emit('GustStart', 'lash' satisfies GustPhase);
        break;
      case 'lash':
        this.endGust();
        break;
    }
  }

  /** Back to calm; emits GustEnd when a gust was in flight. */
  private endGust(): void {
    const wasGusting = this.state.phase !== 'calm';
    this.setPhase('calm', this.nextCalmDuration());
    if (wasGusting) this.bus.emit('GustEnd');
  }

  private setPhase(phase: WindState['phase'], duration: number): void {
    this.state.phase = phase;
    this.phaseT = 0;
    this.phaseDur = duration;
  }

  private nextCalmDuration(): number {
    return this.calmMin + this.rand() * (this.calmMax - this.calmMin);
  }

  private syncUniforms(): void {
    this.uniforms.uTime.value = this.state.time;
    this.uniforms.uWindStrength.value = this.state.strength;
    // uWindDir.value IS state.direction (shared Vector2) — nothing to copy.
  }
}
