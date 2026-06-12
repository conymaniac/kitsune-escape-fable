/**
 * Music engine — M3 (stream F). All synthesis in code, zero audio files.
 *
 * Score: Transport 72 BPM, D insen scale (D, E♭, G, A, C). 26-bar loop:
 *   bars 0–1  pad intro swell
 *   bars 2–9  A  — sparse falling FM-piano motif (seeded grace notes)
 *   bars 10–17 B — koto answers (Karplus-Strong plucks)
 *   bars 18–25 A′ — piano variation + koto sprinkles
 * Voices: FM piano (harmonicity 1.01, modIndex 6, fast decay, soft LP),
 * koto (PluckSynth pool), pad (slow-attack poly saw → LP 800, swells every
 * 8 bars), drone (soft sine, root/fifth alternating every 4 bars).
 *
 * States (gain crossfades ≈1.8 s): title (pad + sparse piano), exterior
 * (full), interior (koto + pad, darker LP), ending (one-shot D-minor-colour
 * → warm D-major-ish resolve in context time). holdSilence() (WindStopped)
 * mutes everything until the explicit 'ending' state — silence is the
 * design. playLullaby() = fragile music-box cue for the body reveal;
 * startHum()/stopHum() = the faint lowpassed vocal hum under the diary.
 *
 * Wind ambience lives here too: pink noise → main bandpass (centre
 * 250→900 Hz) + narrow "howl" bandpass, gains tracking windStrength every
 * update — calm = distant breath, telegraph = swell, lash = howl. This
 * ambience IS the gust audio.
 */
import * as Tone from 'tone';
import type { MusicState } from '@/core/types';

// ── shared buses handed over by audio/engine.ts ──

export interface MusicBuses {
  /** Ducked music voice bus (dialog −6 dB, diary ≈ −23 dB). */
  voices: Tone.Gain;
  /** Un-ducked master input — lullaby + diary hum bypass the duck. */
  master: Tone.Gain;
  /** Wind-ambience bus (engine muffles it indoors). */
  ambience: Tone.Gain;
  /** Shared reverb send input (2.8 s decay). */
  reverb: Tone.Gain;
}

export interface MusicEngine {
  /** Build the graph + start the Transport. Call once, post Tone.start(). */
  bootstrap(buses: MusicBuses): void;
  setState(state: MusicState): void;
  /** Music-box lullaby cue for the body reveal. */
  playLullaby(): void;
  /** Faint hummed lullaby under the diary overlay. */
  startHum(): void;
  stopHum(): void;
  /** WindStopped: everything off until an explicit 'ending' state. */
  holdSilence(): void;
  update(dt: number, windStrength: number): void;
  dispose(): void;
}

// ── tiny seeded PRNG so decorations loop composed, not random ──

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

// ── composition data (D insen: D, Eb, G, A, C) ──

/** [bar, quarter(.5 steps ok), note, velocity] */
type RawNote = readonly [number, number, string, number];

const PIANO_A: readonly RawNote[] = [
  [2, 0, 'D5', 0.9], [2, 2, 'C5', 0.7], [3, 0, 'A4', 0.8], [3, 2.5, 'G4', 0.6],
  [4, 1, 'C5', 0.7], [4, 3, 'A4', 0.6], [5, 1, 'G4', 0.7], [5, 2.5, 'Eb4', 0.65],
  [6, 0, 'D4', 0.55], [6, 2, 'A4', 0.7], [7, 0, 'G4', 0.6], [7, 2, 'D4', 0.5],
  [8, 0, 'D5', 0.85], [8, 1.5, 'C5', 0.7], [8, 3, 'A4', 0.65], [9, 1, 'G4', 0.6],
  [9, 2.5, 'D4', 0.5],
];

/** Quiet piano echoes under the koto section. */
const PIANO_B: readonly RawNote[] = [
  [11, 0, 'D5', 0.45], [13, 0, 'A4', 0.4], [15, 0, 'G4', 0.45],
];

const PIANO_A2: readonly RawNote[] = [
  [18, 0, 'D5', 0.9], [18, 2, 'C5', 0.7], [19, 0, 'A4', 0.75], [19, 2, 'G4', 0.6],
  [20, 1, 'G4', 0.55], [20, 2.5, 'A4', 0.65], [21, 0, 'C5', 0.7], [21, 2, 'D5', 0.75],
  [22, 0, 'D5', 0.8], [22, 2, 'C5', 0.65], [23, 0, 'A4', 0.7], [23, 2.5, 'Eb4', 0.6],
  [24, 0, 'G4', 0.6], [24, 2, 'A4', 0.65], [25, 0, 'D5', 0.7],
];

const KOTO_B: readonly RawNote[] = [
  [10, 0, 'A3', 0.8], [10, 1.5, 'C4', 0.7], [10, 2.5, 'D4', 0.75],
  [11, 2, 'G3', 0.6],
  [12, 0, 'D4', 0.8], [12, 2, 'C4', 0.65], [13, 0, 'A3', 0.7], [13, 2.5, 'G3', 0.6],
  [14, 1, 'Eb4', 0.75], [14, 3, 'D4', 0.65],
  [15, 2, 'A3', 0.6],
  [16, 0, 'G4', 0.8], [16, 1.5, 'D4', 0.7], [17, 0, 'C4', 0.65], [17, 2, 'A3', 0.6],
  [17, 3, 'G3', 0.55],
  // sprinkles answering A′
  [19, 3, 'D4', 0.5], [21, 3, 'A3', 0.5], [23, 3, 'G3', 0.5], [25, 2, 'D4', 0.55],
];

/** Interior-only koto mirror of the piano motif (an octave down). */
const KOTO_MOTIF: readonly RawNote[] = [
  [2, 0, 'D4', 0.7], [2, 2, 'C4', 0.55], [3, 0, 'A3', 0.6], [3, 2.5, 'G3', 0.5],
  [5, 1, 'G3', 0.55], [5, 2.5, 'Eb3', 0.5], [6, 0, 'D3', 0.45],
  [8, 0, 'D4', 0.65], [8, 3, 'A3', 0.5], [9, 2, 'D3', 0.45],
  [18, 0, 'D4', 0.65], [19, 0, 'A3', 0.55], [21, 0, 'C4', 0.5],
  [22, 0, 'D4', 0.6], [23, 2.5, 'Eb3', 0.5], [25, 0, 'D3', 0.5],
];

/** Pad swells every 8 bars: [bar, notes, duration]. */
const PAD_CHORDS: readonly (readonly [number, readonly string[], string])[] = [
  [0, ['D3', 'A3', 'D4'], '7m'],
  [8, ['D3', 'G3', 'C4'], '7m'],
  [16, ['D3', 'A3', 'C4'], '7m'],
  [24, ['D3', 'A3', 'D4'], '2m'],
];

/** Drone alternates root/fifth every 4 bars. */
const DRONE_NOTES: readonly (readonly [number, string, string])[] = [
  [0, 'D2', '4m'], [4, 'A2', '4m'], [8, 'D2', '4m'], [12, 'A2', '4m'],
  [16, 'D2', '4m'], [20, 'A2', '4m'], [24, 'D2', '2m'],
];

/**
 * The lullaby — Yanagi's hummed melody, later "sourced" as the music box.
 * [offset units, note]; the unit scales per rendition.
 */
const LULLABY: readonly (readonly [number, string])[] = [
  [0, 'A5'], [1, 'G5'], [2.5, 'D5'], [4, 'C5'], [5, 'D5'], [6.5, 'G4'],
  [9, 'A5'], [10, 'G5'], [11.5, 'D5'], [13, 'Eb5'], [14, 'D5'], [15.5, 'C5'],
  [17, 'D5'],
];
const LULLABY_UNITS = 17;

const LOOP_BARS = 26;
const XFADE_SEC = 1.8;

/** Per-state linear gain targets per voice. */
const STATE_GAINS: Record<
  Exclude<MusicState, 'ending' | 'none'>,
  { piano: number; koto: number; kotoMotif: number; pad: number; drone: number }
> = {
  title: { piano: 0.5, koto: 0, kotoMotif: 0, pad: 0.9, drone: 0.8 },
  exterior: { piano: 1, koto: 0.9, kotoMotif: 0, pad: 0.8, drone: 0.7 },
  interior: { piano: 0, koto: 0.9, kotoMotif: 0.85, pad: 0.65, drone: 0.55 },
};

interface NoteEvent {
  time: string;
  note: string;
  vel: number;
  /** Grace note (appoggiatura) played just before the main note. */
  grace?: string;
  /** Explicit duration (pads/drone); voices default otherwise. */
  dur?: string;
}

/** bars:quarters:sixteenths from a fractional quarter offset. */
function bbs(bar: number, quarter: number): string {
  return `${bar}:${Math.floor(quarter)}:${(quarter % 1) * 4}`;
}

const INSEN_LETTERS = ['D', 'Eb', 'G', 'A', 'C'] as const;

/** Next insen scale degree above (for grace notes). */
function insenAbove(note: string): string {
  const letter = note.slice(0, -1);
  const octave = Number(note.slice(-1));
  const i = INSEN_LETTERS.indexOf(letter as (typeof INSEN_LETTERS)[number]);
  if (i < 0) return note;
  const next = INSEN_LETTERS[(i + 1) % INSEN_LETTERS.length] ?? letter;
  // C wraps to D in the next octave; everything else stays put.
  const up = letter === 'C' ? octave + 1 : octave;
  return `${next}${up}`;
}

/** Decorate raw notes with seeded grace notes + velocity humanization. */
function buildEvents(raw: readonly RawNote[], seed: number, graceChance: number): NoteEvent[] {
  const rng = mulberry32(seed);
  const out: NoteEvent[] = [];
  for (const [bar, quarter, note, vel] of raw) {
    const ev: NoteEvent = {
      time: bbs(bar, quarter),
      note,
      vel: Math.min(1, vel * (0.92 + rng() * 0.16)),
    };
    if (rng() < graceChance) ev.grace = insenAbove(note);
    out.push(ev);
  }
  return out;
}

function transposeDown(note: string): string {
  return `${note.slice(0, -1)}${Number(note.slice(-1)) - 1}`;
}

// ─────────────────────────────────────────────────────────── engine ──

export function createMusicEngine(): MusicEngine {
  const owned: { dispose(): void }[] = [];
  let buses: MusicBuses | null = null;

  // voices
  let piano: Tone.PolySynth<Tone.FMSynth> | null = null;
  let pad: Tone.PolySynth<Tone.Synth> | null = null;
  let drone: Tone.PolySynth<Tone.Synth> | null = null;
  let musicBox: Tone.PolySynth<Tone.FMSynth> | null = null;
  let hum: Tone.Synth | null = null;
  const kotoPool: Tone.PluckSynth[] = [];
  let kotoIdx = 0;

  // per-voice gains (state crossfades)
  let pianoGain: Tone.Gain | null = null;
  let kotoGain: Tone.Gain | null = null;
  let kotoMotifGain: Tone.Gain | null = null;
  let padGain: Tone.Gain | null = null;
  let droneGain: Tone.Gain | null = null;
  let padFilter: Tone.Filter | null = null;

  // wind ambience
  let windNoise: Tone.Noise | null = null;
  let windBand: Tone.Filter | null = null;
  let windGain: Tone.Gain | null = null;
  let howlBand: Tone.Filter | null = null;
  let howlGain: Tone.Gain | null = null;
  let windClock = 0;
  let windThrottle = 0;
  let windTarget = 0;

  const parts: Tone.Part<NoteEvent>[] = [];

  let state: MusicState = 'none';
  let silenceHeld = false;
  let humTimer: number | null = null;

  function pluckKoto(note: string, time: number, vel: number): void {
    const p = kotoPool[kotoIdx];
    kotoIdx = (kotoIdx + 1) % kotoPool.length;
    if (!p) return;
    p.volume.value = -10 + (vel - 1) * 8;
    p.triggerAttack(note, time);
  }

  function makePart(
    events: NoteEvent[],
    trigger: (time: number, ev: NoteEvent) => void,
  ): Tone.Part<NoteEvent> {
    const part = new Tone.Part<NoteEvent>((time, ev) => trigger(time, ev), events);
    part.loop = true;
    part.loopStart = 0;
    part.loopEnd = `${LOOP_BARS}m`;
    part.start(0);
    parts.push(part);
    owned.push(part);
    return part;
  }

  function own<T extends { dispose(): void }>(node: T): T {
    owned.push(node);
    return node;
  }

  function bootstrap(io: MusicBuses): void {
    if (buses) return;
    buses = io;

    // ── voice graph ──
    pianoGain = own(new Tone.Gain(0)).connect(io.voices);
    const pianoSend = own(new Tone.Gain(0.3)).connect(io.reverb);
    pianoGain.connect(pianoSend);
    const pianoLp = own(new Tone.Filter(1500, 'lowpass')).connect(pianoGain);
    piano = own(
      new Tone.PolySynth(Tone.FMSynth, {
        volume: -13,
        harmonicity: 1.01,
        modulationIndex: 6,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.004, decay: 1.3, sustain: 0, release: 1.2 },
        modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0.15, release: 0.4 },
      }),
    );
    piano.maxPolyphony = 8;
    piano.connect(pianoLp);

    kotoGain = own(new Tone.Gain(0)).connect(io.voices);
    kotoMotifGain = own(new Tone.Gain(0)).connect(io.voices);
    const kotoSend = own(new Tone.Gain(0.22)).connect(io.reverb);
    kotoGain.connect(kotoSend);
    kotoMotifGain.connect(kotoSend);
    for (let i = 0; i < 3; i += 1) {
      kotoPool.push(
        own(new Tone.PluckSynth({ attackNoise: 0.9, dampening: 3800, resonance: 0.96 })),
      );
    }

    padGain = own(new Tone.Gain(0)).connect(io.voices);
    padFilter = own(new Tone.Filter(800, 'lowpass')).connect(padGain);
    padFilter.Q.value = 0.5;
    pad = own(
      new Tone.PolySynth(Tone.Synth, {
        volume: -20,
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 2.8, decay: 1, sustain: 0.7, release: 5.5 },
      }),
    );
    pad.maxPolyphony = 10;
    pad.connect(padFilter);

    droneGain = own(new Tone.Gain(0)).connect(io.voices);
    drone = own(
      new Tone.PolySynth(Tone.Synth, {
        volume: -15,
        oscillator: { type: 'sine' },
        envelope: { attack: 2.5, decay: 0.5, sustain: 0.9, release: 3.5 },
      }),
    );
    drone.maxPolyphony = 4;
    drone.connect(droneGain);

    // music box + hum bypass the duck (they ARE the ducked-to content)
    const boxGain = own(new Tone.Gain(0.9)).connect(io.master);
    const boxSend = own(new Tone.Gain(0.55)).connect(io.reverb);
    boxGain.connect(boxSend);
    musicBox = own(
      new Tone.PolySynth(Tone.FMSynth, {
        volume: -10,
        harmonicity: 3.99,
        modulationIndex: 12,
        oscillator: { type: 'sine' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.002, decay: 1.6, sustain: 0, release: 1.8 },
        modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.3 },
      }),
    );
    musicBox.maxPolyphony = 6;
    musicBox.connect(boxGain);

    const humLp = own(new Tone.Filter(500, 'lowpass'));
    const humGain = own(new Tone.Gain(0.8)).connect(io.master);
    const humSend = own(new Tone.Gain(0.35)).connect(io.reverb);
    humGain.connect(humSend);
    humLp.connect(humGain);
    hum = own(
      new Tone.Synth({
        volume: -24,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.12, decay: 0.2, sustain: 0.7, release: 0.35 },
      }),
    );
    hum.connect(humLp);

    // ── wind ambience: pink noise → bandpass pair → ambience bus ──
    windGain = own(new Tone.Gain(0)).connect(io.ambience);
    windBand = own(new Tone.Filter(300, 'bandpass')).connect(windGain);
    windBand.Q.value = 0.9;
    howlGain = own(new Tone.Gain(0)).connect(io.ambience);
    howlBand = own(new Tone.Filter(800, 'bandpass')).connect(howlGain);
    howlBand.Q.value = 5;
    windNoise = own(new Tone.Noise('pink'));
    windNoise.connect(windBand);
    windNoise.connect(howlBand);
    windNoise.start();

    // ── score parts on the Transport ──
    const transport = Tone.getTransport();
    transport.bpm.value = 72;

    const pianoEvents = [
      ...buildEvents(PIANO_A, 0xa11ce, 0.3),
      ...buildEvents(PIANO_B, 0xb0b0, 0),
      ...buildEvents(PIANO_A2, 0xc0ffee, 0.35),
    ];
    makePart(pianoEvents, (time, ev) => {
      if (!piano) return;
      let at = time;
      if (ev.grace) {
        piano.triggerAttackRelease(ev.grace, 0.09, at, ev.vel * 0.4);
        at += 0.085;
      }
      piano.triggerAttackRelease(ev.note, '2n', at, ev.vel);
    });

    makePart(buildEvents(KOTO_B, 0x10c0, 0), (time, ev) => {
      // koto answers — kotoGain scales the pool output
      if (!kotoGain || kotoGain.gain.value < 0.01) return;
      pluckKoto(ev.note, time, ev.vel);
    });

    makePart(buildEvents(KOTO_MOTIF, 0x5eed, 0), (time, ev) => {
      if (!kotoMotifGain || kotoMotifGain.gain.value < 0.01) return;
      pluckKoto(ev.note, time, ev.vel);
    });

    // The pluck pool is shared by both koto layers; the audible path runs
    // through kotoGain alone. kotoMotifGain is a pure CONTROL value (the
    // trigger guard above) — it carries no audio, so layers can't double.
    const kotoMix = own(new Tone.Gain(1));
    for (const p of kotoPool) p.connect(kotoMix);
    kotoMix.connect(kotoGain);

    const padEvents: NoteEvent[] = PAD_CHORDS.map(([bar, notes, dur]) => ({
      time: bbs(bar, 0),
      note: notes.join('|'),
      vel: 0.6,
      dur,
    }));
    makePart(padEvents, (time, ev) => {
      pad?.triggerAttackRelease(ev.note.split('|'), ev.dur ?? '4m', time, ev.vel);
    });

    const droneEvents: NoteEvent[] = DRONE_NOTES.map(([bar, note, dur]) => ({
      time: bbs(bar, 0),
      note,
      vel: 0.7,
      dur,
    }));
    makePart(droneEvents, (time, ev) => {
      drone?.triggerAttackRelease(ev.note, ev.dur ?? '4m', time, ev.vel);
    });

    transport.start('+0.05');
  }

  // ── state machine ──

  function rampVoices(
    g: { piano: number; koto: number; kotoMotif: number; pad: number; drone: number },
    sec: number,
  ): void {
    pianoGain?.gain.rampTo(g.piano, sec);
    kotoGain?.gain.rampTo(g.koto, sec);
    kotoMotifGain?.gain.rampTo(g.kotoMotif, sec);
    padGain?.gain.rampTo(g.pad, sec);
    droneGain?.gain.rampTo(g.drone, sec);
  }

  function setState(next: MusicState): void {
    if (next === state) return;
    if (silenceHeld && next !== 'ending') return; // WindStopped holds the floor
    state = next;
    if (!buses) return; // pre-bootstrap: engine re-applies after init

    if (next === 'none') {
      rampVoices({ piano: 0, koto: 0, kotoMotif: 0, pad: 0, drone: 0 }, 1);
      return;
    }
    if (next === 'ending') {
      silenceHeld = false;
      playEnding();
      return;
    }
    rampVoices(STATE_GAINS[next], XFADE_SEC);
    // interior is slightly darker: pull the pad lowpass down
    padFilter?.frequency.rampTo(next === 'interior' ? 620 : 800, XFADE_SEC);
  }

  /** One-shot through-composed resolution — D minor colour → warm D major. */
  function playEnding(): void {
    if (!buses || !pad || !piano || !drone) return;
    // the looping parts stay muted; ending is scheduled in context time
    for (const p of parts) p.mute = true;
    Tone.getTransport().pause();
    rampVoices({ piano: 0.8, koto: 0, kotoMotif: 0, pad: 1, drone: 0.8 }, 2);
    padFilter?.frequency.rampTo(900, 2);

    const t0 = Tone.now() + 0.1;
    drone.triggerAttackRelease('D2', 14, t0, 0.6);
    pad.triggerAttackRelease(['D3', 'F3', 'A3'], 6, t0, 0.5); // minor colour
    piano.triggerAttackRelease('D5', '2n', t0 + 5, 0.5);
    piano.triggerAttackRelease('A4', '2n', t0 + 7, 0.45);
    pad.triggerAttackRelease(['D3', 'F#3', 'A3', 'D4'], 12, t0 + 8, 0.55); // warm resolve
    piano.triggerAttackRelease('F#4', '2n', t0 + 11, 0.4);
    piano.triggerAttackRelease('D4', '2n', t0 + 14, 0.35);
    piano.triggerAttackRelease(['D5', 'A4'], '1n', t0 + 17, 0.3);
    drone.triggerAttackRelease('D2', 16, t0 + 14, 0.45);
    pad.triggerAttackRelease(['D2', 'A2', 'D3', 'F#3'], 14, t0 + 20, 0.4); // dawn glow
  }

  function playLullaby(): void {
    if (!musicBox) return;
    const t0 = Tone.now() + 0.15;
    const unit = 0.55;
    for (const [off, note] of LULLABY) {
      const fade = 1 - (off / LULLABY_UNITS) * 0.35; // dies away like a winding box
      musicBox.triggerAttackRelease(note, 1.4, t0 + off * unit, 0.55 * fade);
    }
    // final fifth, barely there — the box winds down
    musicBox.triggerAttackRelease('A5', 2.2, t0 + (LULLABY_UNITS + 2) * unit, 0.18);
  }

  function humPhrase(): void {
    if (!hum) return;
    const t0 = Tone.now() + 0.12;
    const unit = 0.6;
    for (const [off, note] of LULLABY) {
      hum.triggerAttackRelease(transposeDown(note), unit * 0.82, t0 + off * unit, 0.5);
    }
  }

  function startHum(): void {
    if (humTimer !== null || !hum) return;
    humPhrase();
    humTimer = window.setInterval(humPhrase, (LULLABY_UNITS + 4) * 0.6 * 1000);
  }

  function stopHum(): void {
    if (humTimer === null) return;
    window.clearInterval(humTimer);
    humTimer = null;
  }

  function holdSilence(): void {
    silenceHeld = true;
    state = 'none';
    rampVoices({ piano: 0, koto: 0, kotoMotif: 0, pad: 0, drone: 0 }, 1.2);
    stopHum();
  }

  // ── per-frame: wind ambience tracking (throttled ramps) ──

  function update(dt: number, windStrength: number): void {
    if (!windGain || !windBand || !howlGain || !howlBand) return;
    windClock += dt;
    windThrottle += dt;
    windTarget = Math.min(Math.max(windStrength, 0), 1);
    if (windThrottle < 0.1) return;
    windThrottle = 0;

    const s = windTarget;
    const breath = 1 + 0.15 * Math.sin(windClock * 0.7) * Math.sin(windClock * 0.23);
    windGain.gain.rampTo(Math.pow(s, 1.5) * 0.5 * breath, 0.18);
    windBand.frequency.rampTo(250 + 650 * Math.pow(s, 1.3), 0.18);
    const howl = s < 0.55 ? 0 : (s - 0.55) / 0.45;
    howlGain.gain.rampTo(howl * howl * 0.18, 0.18);
    howlBand.frequency.rampTo(600 + 900 * s, 0.18);
  }

  function dispose(): void {
    stopHum();
    for (const node of owned) node.dispose();
    owned.length = 0;
    buses = null;
  }

  return { bootstrap, setState, playLullaby, startHum, stopHum, holdSilence, update, dispose };
}
