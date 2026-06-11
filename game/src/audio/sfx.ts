/**
 * SFX engine — M0 NO-OP STUB behind the final internal surface.
 * M3 (stream F) implements the ~13 synthesis recipes from TECH_SPEC
 * (filtered-noise footsteps, FM transform gliss, koto branch-cut accent,
 * detuned-sine ghost dissolve, dialog blips, suzu bell quest tick…).
 */
import type { SfxName } from '@/core/types';

/** Every SFX the slice ships — single checklist for M3. */
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

export interface SfxEngine {
  play(name: SfxName): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

export function createSfxEngine(): SfxEngine {
  return {
    play(_name: SfxName): void {
      /* no-op until M3 */
    },
    setMuted(_muted: boolean): void {
      /* no-op until M3 */
    },
    dispose(): void {
      /* no-op until M3 */
    },
  };
}
