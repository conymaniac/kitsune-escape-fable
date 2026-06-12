/**
 * IAudio implementation — M3 (stream F). Tone.js bootstrap + bus tree:
 *
 *   master(−6 dB headroom) ─→ Destination
 *     ├─ music voices ─→ duck (dialog −6 dB / diary ≈ −23 dB)
 *     ├─ sfx
 *     ├─ ambience ─→ muffle LP (interior 900 Hz)
 *     └─ reverb return (shared Tone.Reverb 2.8 s, ≈0.3 wet via return gain)
 *
 * Unlock: main.ts calls init() from input.anyGesture (first gesture);
 * everything is built once after Tone.start() resolves. Mute (M key)
 * ramps the master gain and persists to localStorage.
 *
 * EventBus subscriptions OWNED HERE (kept inside the audio module so no
 * other stream's files change — main.ts already passes the bus):
 *   FormChanged        → transform SFX flavor (event fires before the
 *                        burst's playSfx('transform') — player.ts order)
 *   EnterInterior/Exit → muffle + dim the wind ambience (DESIGN §4)
 *   GustStart('lash') while interior → the shutter-slam one-shot (the
 *                        questScript scare emits gust events indoors)
 *   WindStopped        → hold ALL music silent (silence is the payoff)
 *                        until questScript's explicit 'ending' state
 *   PaperOverlayOpened → pre-WindStopped: diary — duck music to a whisper
 *                        + faint hummed lullaby; post: body reveal — the
 *                        music-box lullaby cue
 *   PaperOverlayClosed → restore the diary duck
 */
import * as Tone from 'tone';
import type { IAudio, MusicState, SfxName } from '@/core/types';
import type { EventBus } from '@/core/events';
import { createMusicEngine } from './music';
import { createSfxEngine } from './sfx';

const MUTE_STORAGE_KEY = 'kitsune.muted';

const MASTER_LEVEL = 0.5; // ≈ −6 dBFS headroom on the sum
const DUCK_DIALOG = 0.5; // −6 dB while dialog is active
const DUCK_DIARY = 0.07; // ≈ −23 dB under the diary overlay
const SFX_LEVEL = 0.9;
const REVERB_RETURN = 0.32; // ≈ 0.3 wet — a quiet night, not a cathedral
const AMB_LP_OUTDOOR = 9500;
const AMB_LP_INDOOR = 900;

/** IAudio + the additive master-volume hook (pause menu, M4 wiring). */
export interface AudioHandle extends IAudio {
  /** 0..1 master volume (multiplies the −6 dB headroom level). */
  setMasterVolume(volume01: number): void;
}

export function createAudio(bus: EventBus): AudioHandle {
  const music = createMusicEngine();
  const sfx = createSfxEngine();

  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    /* storage unavailable — stay unmuted */
  }

  let unlocked = false;
  let initPromise: Promise<void> | null = null;
  let volume = 1;

  // graph (built once in init)
  let master: Tone.Gain | null = null;
  let duckGain: Tone.Gain | null = null;
  let ambGain: Tone.Gain | null = null;
  let ambFilter: Tone.Filter | null = null;

  // observable game context (engine-owned subscriptions below)
  let indoor = false;
  let windStopped = false;
  let dialogDuck = false;
  let diaryOpen = false;
  let pendingMusic: MusicState = 'none';

  // gesture→init gap: keep the freshest few SFX so e.g. the title's
  // uiConfirm (same keypress that unlocks audio) still sounds.
  const pendingSfx: { name: SfxName; at: number }[] = [];

  function masterTarget(): number {
    return muted ? 0 : MASTER_LEVEL * volume;
  }

  function applyDuck(rampSec: number): void {
    duckGain?.gain.rampTo((dialogDuck ? DUCK_DIALOG : 1) * (diaryOpen ? DUCK_DIARY : 1), rampSec);
  }

  function applyAmbience(): void {
    ambGain?.gain.rampTo((indoor ? 0.4 : 1) * (diaryOpen ? 0.3 : 1), 0.6);
    ambFilter?.frequency.rampTo(indoor ? AMB_LP_INDOOR : AMB_LP_OUTDOOR, 0.6);
  }

  function applyMuted(next: boolean): void {
    muted = next;
    master?.gain.rampTo(masterTarget(), 0.08);
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function buildGraph(): void {
    master = new Tone.Gain(masterTarget()).connect(Tone.getDestination());

    duckGain = new Tone.Gain(1).connect(master);
    const musicVoices = new Tone.Gain(1).connect(duckGain);

    const sfxBus = new Tone.Gain(SFX_LEVEL).connect(master);

    ambFilter = new Tone.Filter(AMB_LP_OUTDOOR, 'lowpass').connect(master);
    ambGain = new Tone.Gain(1).connect(ambFilter);

    const reverb = new Tone.Reverb({ decay: 2.8, preDelay: 0.03 });
    reverb.wet.value = 1; // it's a send — the return gain sets the mix
    const reverbReturn = new Tone.Gain(REVERB_RETURN).connect(master);
    reverb.connect(reverbReturn);
    const reverbSend = new Tone.Gain(1).connect(reverb);

    music.bootstrap({
      voices: musicVoices,
      master,
      ambience: ambGain,
      reverb: reverbSend,
    });
    sfx.bootstrap({ out: sfxBus, reverb: reverbSend });

    applyDuck(0.01);
    applyAmbience();
  }

  async function doInit(): Promise<void> {
    await Tone.start();
    buildGraph();
    unlocked = true;
    music.setState(pendingMusic);
    // flush only the freshest gesture-frame sounds
    const now = performance.now();
    for (const item of pendingSfx) {
      if (now - item.at < 500 && !muted) sfx.play(item.name);
    }
    pendingSfx.length = 0;
  }

  // ── engine-owned bus subscriptions (see header) ──

  bus.on('FormChanged', (form) => sfx.setTransformDirection(form));
  bus.on('EnterInterior', () => {
    indoor = true;
    applyAmbience();
  });
  bus.on('ExitInterior', () => {
    indoor = false;
    applyAmbience();
  });
  bus.on('GustStart', (phase) => {
    // The wind system never gusts indoors — an indoor lash IS the
    // questScript shutter-slam scare. Make that one bang.
    if (phase === 'lash' && indoor && unlocked && !muted) sfx.playSlam();
  });
  bus.on('WindStopped', () => {
    windStopped = true;
    music.holdSilence();
  });
  bus.on('PaperOverlayOpened', () => {
    if (!unlocked) return;
    if (windStopped) {
      music.playLullaby(); // the body reveal — the hummed melody, sourced
      return;
    }
    diaryOpen = true;
    applyDuck(0.4);
    applyAmbience();
    music.startHum();
  });
  bus.on('PaperOverlayClosed', () => {
    if (!diaryOpen) return;
    diaryOpen = false;
    applyDuck(0.8);
    applyAmbience();
    music.stopHum();
  });

  // DEV-only inspection handle for scripted audio verification (stripped
  // from production builds by the import.meta.env.DEV guard).
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__kitsuneAudio = {
      tone: Tone,
      music,
      sfx,
      /** Live node refs for scripted meter taps (null pre-init). */
      nodes: () => ({ master, duckGain, ambGain, ambFilter }),
      state: () => ({
        context: Tone.getContext().state,
        transport: Tone.getTransport().state,
        bpm: Tone.getTransport().bpm.value,
        unlocked,
        muted,
        indoor,
        windStopped,
        diaryOpen,
        pendingMusic,
        master: master?.gain.value ?? -1,
        duck: duckGain?.gain.value ?? -1,
        ambience: ambGain?.gain.value ?? -1,
      }),
    };
  }

  return {
    async init(): Promise<void> {
      initPromise ??= doInit();
      return initPromise;
    },
    playSfx(name: SfxName): void {
      if (muted) return;
      if (!unlocked) {
        pendingSfx.push({ name, at: performance.now() });
        if (pendingSfx.length > 4) pendingSfx.shift();
        return;
      }
      sfx.play(name);
    },
    setMusicState(state: MusicState): void {
      pendingMusic = state;
      if (unlocked) music.setState(state);
    },
    duck(on: boolean): void {
      dialogDuck = on;
      applyDuck(0.05); // 50 ms ramp per spec
    },
    setMuted(next: boolean): void {
      applyMuted(next);
    },
    isMuted(): boolean {
      return muted;
    },
    toggleMute(): boolean {
      applyMuted(!muted);
      return muted;
    },
    setMasterVolume(volume01: number): void {
      volume = Math.min(Math.max(volume01, 0), 1);
      master?.gain.rampTo(masterTarget(), 0.08);
    },
    update(dt: number, windStrength: number): void {
      if (!unlocked) return;
      music.update(dt, windStrength);
    },
  };
}
