/**
 * IAudio implementation — M0 NO-OP STUB behind the FINAL IAudio surface.
 * M3 (stream F) adds the Tone.js bootstrap (unlock on first gesture,
 * master→{music,sfx,ambience} buses, −6 dB dialog duck, shared reverb)
 * behind these exact signatures. Mute is persisted already.
 */
import type { IAudio, MusicState, SfxName } from '@/core/types';
import type { EventBus } from '@/core/events';
import { createMusicEngine } from './music';
import { createSfxEngine } from './sfx';

const MUTE_STORAGE_KEY = 'kitsune.muted';

export function createAudio(_bus: EventBus): IAudio {
  const music = createMusicEngine();
  const sfx = createSfxEngine();

  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_STORAGE_KEY) === '1';
  } catch {
    /* storage unavailable — stay unmuted */
  }
  let unlocked = false;

  function applyMuted(next: boolean): void {
    muted = next;
    music.setMuted(next);
    sfx.setMuted(next);
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  return {
    async init(): Promise<void> {
      // M3: await Tone.start() here. Stub just flips the latch.
      unlocked = true;
    },
    playSfx(name: SfxName): void {
      if (!unlocked || muted) return;
      sfx.play(name);
    },
    setMusicState(state: MusicState): void {
      music.setState(state);
    },
    duck(on: boolean): void {
      music.duck(on);
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
    update(dt: number, windStrength: number): void {
      music.update(dt, windStrength);
    },
  };
}
