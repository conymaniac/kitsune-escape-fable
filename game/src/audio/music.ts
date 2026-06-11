/**
 * Music engine — M0 NO-OP STUB behind the final internal surface.
 * M3 (stream F) replaces internals with Tone.js: Transport 72 BPM,
 * D insen scale, FM-piano motif + koto answers + pad + drone, state
 * crossfades (title|exterior|interior|ending), music-box lullaby cue,
 * pink-noise wind ambience tracking WindState.strength.
 */
import type { MusicState } from '@/core/types';

export interface MusicEngine {
  setState(state: MusicState): void;
  /** Music-box lullaby cue for the body reveal. */
  playLullaby(): void;
  duck(on: boolean): void;
  setMuted(muted: boolean): void;
  update(dt: number, windStrength: number): void;
  dispose(): void;
}

export function createMusicEngine(): MusicEngine {
  return {
    setState(_state: MusicState): void {
      /* no-op until M3 */
    },
    playLullaby(): void {
      /* no-op until M3 */
    },
    duck(_on: boolean): void {
      /* no-op until M3 */
    },
    setMuted(_muted: boolean): void {
      /* no-op until M3 */
    },
    update(_dt: number, _windStrength: number): void {
      /* no-op until M3 */
    },
    dispose(): void {
      /* no-op until M3 */
    },
  };
}
