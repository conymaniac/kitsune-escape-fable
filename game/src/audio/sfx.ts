/**
 * SFX engine — M3 (stream F). Every SfxName synthesized per TECH_SPEC §1
 * recipes, zero audio files. All synths/filters are constructed ONCE at
 * bootstrap and pooled; play() only schedules — no per-call allocation
 * beyond Tone's own event objects.
 *
 * Extras beyond SfxName (engine.ts wiring, both files stream-F-owned):
 *   playSlam()                 the shutter-slam scare — THE one loud moment
 *   setTransformDirection(f)   FormChanged → distinct shimmer per direction
 *                              (→fox low whomp + bell shimmer, →human
 *                               breathy chord + cloth flutter — DESIGN §2)
 */
import * as Tone from 'tone';
import type { KitsuneForm, SfxName } from '@/core/types';

/** Every SFX the slice ships — single checklist (kept from M0). */
export const SFX_NAMES: readonly SfxName[] = [
  'footstepGrass',
  'footstepWood',
  'transform',
  'interact',
  'pickup',
  'paperRustle',
  'windowLeap',
  'branchCut',
  'ghostDissolved',
  'dialogBlip',
  'uiConfirm',
  'knockdown',
  'suzuBell',
] as const;

export interface SfxBuses {
  /** Dry SFX bus → master. */
  out: Tone.Gain;
  /** Shared reverb send input (2.8 s decay). */
  reverb: Tone.Gain;
}

export interface SfxEngine {
  /** Build + pool every synth. Call once, post Tone.start(). */
  bootstrap(buses: SfxBuses): void;
  play(name: SfxName): void;
  /** Shutter-slam transient (noise burst + low boom) — the scare. */
  playSlam(): void;
  /** Latched from FormChanged so 'transform' picks the right flavor. */
  setTransformDirection(form: KitsuneForm): void;
  dispose(): void;
}

const BLIP_MIN_INTERVAL = 0.06;

export function createSfxEngine(): SfxEngine {
  const owned: { dispose(): void }[] = [];
  let ready = false;

  // pooled voices
  let grassNoise: Tone.NoiseSynth | null = null;
  let grassLp: Tone.Filter | null = null;
  let woodNoise: Tone.NoiseSynth | null = null;
  let woodBp: Tone.Filter | null = null;
  let thump: Tone.Synth | null = null; // small sine thumps (wood, landing)
  let glissFm: Tone.PolySynth<Tone.FMSynth> | null = null;
  let sweepNoise: Tone.NoiseSynth | null = null;
  let sweepHp: Tone.Filter | null = null;
  let tri: Tone.Synth | null = null; // interact + uiConfirm
  let ping: Tone.PolySynth<Tone.FMSynth> | null = null; // metal/suzu/bell
  let rustleNoise: Tone.NoiseSynth | null = null;
  let whooshNoise: Tone.NoiseSynth | null = null;
  let whooshLp: Tone.Filter | null = null;
  let snapNoise: Tone.NoiseSynth | null = null;
  let washNoise: Tone.NoiseSynth | null = null;
  let sines: Tone.PolySynth<Tone.Synth> | null = null; // dissolve + breathy chord
  let blip: Tone.Synth | null = null;
  let boom: Tone.MembraneSynth | null = null; // knockdown/branch thud
  let slamBoom: Tone.MembraneSynth | null = null; // the scare, hotter level
  const plucks: Tone.PluckSynth[] = [];
  let pluckIdx = 0;

  let toForm: KitsuneForm = 'fox';
  let lastBlipAt = -1;

  function own<T extends { dispose(): void }>(node: T): T {
    owned.push(node);
    return node;
  }

  function pluck(note: string, time: number, vel: number): void {
    const p = plucks[pluckIdx];
    pluckIdx = (pluckIdx + 1) % plucks.length;
    if (!p) return;
    p.volume.value = -9 + (vel - 1) * 8;
    p.triggerAttack(note, time);
  }

  function bootstrap(io: SfxBuses): void {
    if (ready) return;
    ready = true;

    // footstepGrass: 60 ms filtered-noise tick, lowpass 800, ±10 % pitch
    grassLp = own(new Tone.Filter(800, 'lowpass')).connect(io.out);
    grassNoise = own(
      new Tone.NoiseSynth({
        volume: -16,
        noise: { type: 'white' },
        envelope: { attack: 0.002, decay: 0.055, sustain: 0, release: 0.03 },
      }),
    ).connect(grassLp);

    // footstepWood: noise tick through bandpass 400 + 90 Hz sine thump
    woodBp = own(new Tone.Filter(400, 'bandpass')).connect(io.out);
    woodBp.Q.value = 1.2;
    woodNoise = own(
      new Tone.NoiseSynth({
        volume: -13,
        noise: { type: 'white' },
        envelope: { attack: 0.002, decay: 0.05, sustain: 0, release: 0.03 },
      }),
    ).connect(woodBp);
    thump = own(
      new Tone.Synth({
        volume: -14,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.09, sustain: 0, release: 0.05 },
      }),
    ).connect(io.out);

    // transform: fast FM gliss + highpass-swept noise (+ reverb shimmer)
    const glissSend = own(new Tone.Gain(0.35)).connect(io.reverb);
    glissFm = own(
      new Tone.PolySynth(Tone.FMSynth, {
        volume: -6, // the hero sound — must read clearly over the bed
        harmonicity: 2,
        modulationIndex: 8,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.004, decay: 0.25, sustain: 0, release: 0.3 },
        modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.2 },
      }),
    );
    // 12, not 6: one transform is a 4-note gliss w/ ~0.45 s tails and F-spam
    // is a design pillar ("shifting is joy") — two transforms inside half a
    // second legitimately demand 8+ voices (playtest: 6 dropped notes at 1x).
    glissFm.maxPolyphony = 12;
    glissFm.connect(io.out);
    glissFm.connect(glissSend);
    sweepHp = own(new Tone.Filter(1000, 'highpass')).connect(io.out);
    sweepNoise = own(
      new Tone.NoiseSynth({
        volume: -11,
        noise: { type: 'white' },
        envelope: { attack: 0.03, decay: 0.32, sustain: 0, release: 0.1 },
      }),
    ).connect(sweepHp);

    // interact: 40 ms triangle 880, −14 dB
    tri = own(
      new Tone.Synth({
        volume: -14,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 0.035, sustain: 0, release: 0.03 },
      }),
    ).connect(io.out);

    // plucks: pickup + branch-cut koto accent
    const pluckSend = own(new Tone.Gain(0.25)).connect(io.reverb);
    const pluckMix = own(new Tone.Gain(1)).connect(io.out);
    pluckMix.connect(pluckSend);
    for (let i = 0; i < 3; i += 1) {
      const p = own(new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.95 }));
      p.connect(pluckMix);
      plucks.push(p);
    }

    // ping: faint metal ping / suzu bell / fox bell shimmer
    const pingSend = own(new Tone.Gain(0.5)).connect(io.reverb);
    ping = own(
      new Tone.PolySynth(Tone.FMSynth, {
        volume: -8, // velocities scale it back down where faintness is wanted
        harmonicity: 5.7,
        modulationIndex: 16,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.001, decay: 0.6, sustain: 0, release: 0.8 },
        modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      }),
    );
    // 12: suzu chime = 3 notes w/ 1.4 s tails; transform + pickup + quest
    // tick can overlap in normal play (playtest: drops at 1x density).
    ping.maxPolyphony = 12;
    ping.connect(io.out);
    ping.connect(pingSend);

    // paperRustle: 300 ms noise through a 20 Hz-LFO-wobbled bandpass
    const rustleBp = own(new Tone.Filter(900, 'bandpass')).connect(io.out);
    rustleBp.Q.value = 1.2;
    const rustleLfo = own(new Tone.LFO(20, 500, 1400));
    rustleLfo.connect(rustleBp.frequency);
    rustleLfo.start();
    rustleNoise = own(
      new Tone.NoiseSynth({
        volume: -16,
        noise: { type: 'white' },
        envelope: { attack: 0.02, decay: 0.28, sustain: 0, release: 0.08 },
      }),
    ).connect(rustleBp);

    // windowLeap: descending lowpass whoosh (+ landing thump via `thump`)
    whooshLp = own(new Tone.Filter(2400, 'lowpass')).connect(io.out);
    whooshNoise = own(
      new Tone.NoiseSynth({
        volume: -7,
        noise: { type: 'pink' },
        envelope: { attack: 0.08, decay: 0.38, sustain: 0, release: 0.12 },
      }),
    ).connect(whooshLp);

    // branch snap / crack: 30 ms highpass noise
    const snapHp = own(new Tone.Filter(2400, 'highpass')).connect(io.out);
    snapNoise = own(
      new Tone.NoiseSynth({
        volume: -12,
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.02 },
      }),
    ).connect(snapHp);

    // ghost dissolve: breathy noise wash + 3 detuned sines into long reverb
    const washLp = own(new Tone.Filter(1200, 'lowpass')).connect(io.out);
    washNoise = own(
      new Tone.NoiseSynth({
        volume: -18,
        noise: { type: 'pink' },
        envelope: { attack: 1.1, decay: 2.2, sustain: 0, release: 1 },
      }),
    ).connect(washLp);
    const sineSend = own(new Tone.Gain(0.6)).connect(io.reverb);
    sines = own(
      new Tone.PolySynth(Tone.Synth, {
        volume: -14,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.4, decay: 0.6, sustain: 0.6, release: 2.4 },
      }),
    );
    // 12: →human chord (3 voices, 0.8 s tails) + dissolve trio (2.4 s tails)
    // — back-to-back F presses alone can exceed 6.
    sines.maxPolyphony = 12;
    sines.connect(io.out);
    sines.connect(sineSend);

    // dialogBlip: 25 ms sine ~1200 ±50 Hz — quiet tick under the typewriter
    // (spec said −18 dB, but a bare 1.2 kHz sine reads HOT next to the
    // filtered/FM voices; −23 lands it under the one-shot SFX in practice)
    blip = own(
      new Tone.Synth({
        volume: -23,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 0.022, sustain: 0, release: 0.02 },
      }),
    ).connect(io.out);

    // low thuds: knockdown / branch fall / landing boom
    boom = own(
      new Tone.MembraneSynth({
        volume: -9,
        pitchDecay: 0.06,
        octaves: 2.5,
        envelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.2 },
      }),
    ).connect(io.out);

    // the shutter slam — dedicated hotter membrane (the ONE loud moment)
    slamBoom = own(
      new Tone.MembraneSynth({
        volume: -3,
        pitchDecay: 0.09,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.45, sustain: 0, release: 0.3 },
      }),
    ).connect(io.out);
  }

  // ── recipes ──

  function playTransform(t0: number): void {
    if (!glissFm || !sweepNoise || !sweepHp || !ping || !sines || !rustleNoise) return;
    if (toForm === 'fox') {
      // low whomp + rising gliss D–G–A–D′ + bell shimmer + swept noise 1→8 kHz
      boom?.triggerAttackRelease('D2', 0.22, t0, 0.55); // the whomp (DESIGN §2)
      const notes = ['D4', 'G4', 'A4', 'D5'] as const;
      notes.forEach((n, i) => {
        glissFm?.triggerAttackRelease(n, 0.14, t0 + i * 0.055, 0.85 - i * 0.07);
      });
      sweepHp.frequency.cancelScheduledValues(t0);
      sweepHp.frequency.setValueAtTime(1000, t0);
      sweepHp.frequency.exponentialRampToValueAtTime(8000, t0 + 0.4);
      sweepNoise.triggerAttackRelease(0.35, t0, 0.55);
      ping.triggerAttackRelease('A6', 0.3, t0 + 0.18, 0.5);
      ping.triggerAttackRelease('E7', 0.25, t0 + 0.3, 0.35);
    } else {
      // falling gliss + breathy chord + cloth flutter
      const notes = ['D5', 'A4', 'G4', 'D4'] as const;
      notes.forEach((n, i) => {
        glissFm?.triggerAttackRelease(n, 0.14, t0 + i * 0.055, 0.65 - i * 0.05);
      });
      sines.set({ envelope: { attack: 0.06, release: 0.8 } });
      sines.triggerAttackRelease(['D4', 'G4', 'A4'], 0.5, t0 + 0.05, 0.5);
      rustleNoise.triggerAttackRelease(0.3, t0 + 0.04, 0.7);
    }
  }

  function play(name: SfxName): void {
    if (!ready) return;
    // A recipe must NEVER throw into the game loop: mono synths are shared
    // across recipes (thump: windowLeap+footstepWood; boom: transform/
    // knockdown/branchCut) and two triggers ≤0.4 s apart can collide on
    // Tone's timeline ("time must be greater than or equal to the last
    // scheduled time"). M4 playtest froze the WHOLE game on a wood footstep
    // during the window leap — GameLoop stops rescheduling after a throw.
    // Worst case under the guard: one quiet layer of one SFX is skipped.
    try {
      playUnsafe(name);
    } catch {
      /* dropped sfx layer — never fatal */
    }
  }

  function playUnsafe(name: SfxName): void {
    const r = Math.random();
    const t0 = Tone.now() + 0.02;
    switch (name) {
      case 'footstepGrass': {
        if (!grassLp || !grassNoise) return;
        grassLp.frequency.value = 800 * (0.9 + r * 0.2); // ±10 % "pitch"
        grassNoise.triggerAttackRelease(0.06, t0, 0.4 + r * 0.2);
        return;
      }
      case 'footstepWood': {
        if (!woodBp || !woodNoise || !thump) return;
        woodBp.frequency.value = 400 * (0.9 + r * 0.2);
        woodNoise.triggerAttackRelease(0.05, t0, 0.45 + r * 0.15);
        thump.triggerAttackRelease(90 * (0.95 + r * 0.1), 0.09, t0, 0.65);
        return;
      }
      case 'transform':
        playTransform(t0);
        return;
      case 'interact':
        tri?.triggerAttackRelease(880, 0.04, t0, 0.8);
        return;
      case 'pickup': {
        // two plucks a fifth apart + faint metal ping
        pluck('D5', t0, 0.9);
        pluck('A5', t0 + 0.07, 0.8);
        ping?.triggerAttackRelease('A6', 0.2, t0 + 0.1, 0.25);
        return;
      }
      case 'paperRustle':
        rustleNoise?.triggerAttackRelease(0.3, t0, 0.6 + r * 0.2);
        return;
      case 'windowLeap': {
        if (!whooshLp || !whooshNoise || !thump) return;
        whooshLp.frequency.cancelScheduledValues(t0);
        whooshLp.frequency.setValueAtTime(2400, t0);
        whooshLp.frequency.exponentialRampToValueAtTime(280, t0 + 0.45);
        whooshNoise.triggerAttackRelease(0.4, t0, 0.6);
        thump.triggerAttackRelease(70, 0.12, t0 + 0.42, 0.5); // soft landing
        return;
      }
      case 'branchCut': {
        // 30 ms highpass snap + low thud + koto accent
        snapNoise?.triggerAttackRelease(0.03, t0, 0.9);
        boom?.triggerAttackRelease('A1', 0.15, t0 + 0.01, 0.45);
        pluck('A3', t0 + 0.03, 0.9);
        return;
      }
      case 'ghostDissolved': {
        if (!sines || !washNoise) return;
        // 3 detuned high sines fading ~3 s into the long reverb + breath
        sines.set({ envelope: { attack: 0.4, release: 2.4 } });
        const d6 = 1174.66;
        sines.triggerAttackRelease([d6, d6 * 1.007, d6 * 0.994], 3, t0, 0.5);
        washNoise.triggerAttackRelease(2.2, t0 + 0.2, 0.5);
        return;
      }
      case 'dialogBlip': {
        const now = Tone.now();
        if (now - lastBlipAt < BLIP_MIN_INTERVAL) return; // throttle
        lastBlipAt = now;
        blip?.triggerAttackRelease(1150 + r * 100, 0.025, t0, 0.8);
        return;
      }
      case 'uiConfirm': {
        tri?.triggerAttackRelease(660, 0.06, t0, 0.7);
        tri?.triggerAttackRelease(990, 0.07, t0 + 0.09, 0.8);
        return;
      }
      case 'knockdown': {
        // low thud + branch crack
        boom?.triggerAttackRelease('A1', 0.3, t0, 1);
        snapNoise?.triggerAttackRelease(0.04, t0 + 0.02, 0.6);
        snapNoise?.triggerAttackRelease(0.03, t0 + 0.09, 0.4);
        return;
      }
      case 'suzuBell': {
        // small high bell ding-shimmer (quest tick) — the banner chime
        // must read over the bed (DESIGN §7 juice item 7)
        ping?.triggerAttackRelease('A6', 0.3, t0, 0.85);
        ping?.triggerAttackRelease('E7', 0.25, t0 + 0.08, 0.6);
        ping?.triggerAttackRelease('A7', 0.2, t0 + 0.05, 0.35);
        return;
      }
    }
  }

  function playSlam(): void {
    if (!ready || !slamBoom || !snapNoise || !whooshNoise || !whooshLp) return;
    try {
      const t0 = Tone.now() + 0.02;
      snapNoise.triggerAttackRelease(0.04, t0, 1);
      slamBoom.triggerAttackRelease('F1', 0.4, t0, 1);
      // short dark gust burst behind the bang
      whooshLp.frequency.cancelScheduledValues(t0);
      whooshLp.frequency.setValueAtTime(1800, t0);
      whooshLp.frequency.exponentialRampToValueAtTime(400, t0 + 0.5);
      whooshNoise.triggerAttackRelease(0.45, t0 + 0.02, 0.9);
    } catch {
      /* dropped sfx layer — never fatal (see play()) */
    }
  }

  function setTransformDirection(form: KitsuneForm): void {
    toForm = form;
  }

  function dispose(): void {
    for (const node of owned) node.dispose();
    owned.length = 0;
    ready = false;
  }

  return { bootstrap, play, playSlam, setTransformDirection, dispose };
}
