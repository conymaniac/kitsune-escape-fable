/**
 * GameFlags store. Reset = fresh object, never in-place mutation back
 * to defaults (systems hold the store, not the flags object).
 */
import type { GameFlags } from './types';

export function initialFlags(): GameFlags {
  return {
    questProgress: 0,
    hasMask: false,
    hasDagger: false,
    currentForm: 'human',
    hasTransformed: false,
    ambientHeard: false,
    questRefused: false,
    doorBlockedSeen: false,
    tableSeen: false,
    futonSeen: false,
    paperRead: false,
    sandalsExamined: false,
    sandalsRemoved: false,
    branchesCut: 0,
    ghostDissolved: false,
    windStopped: false,
    bodyExamined: false,
    medallionUnlocked: false,
    questCompleted: false,
  };
}

export class FlagStore {
  private current: GameFlags = initialFlags();

  get flags(): GameFlags {
    return this.current;
  }

  reset(): void {
    this.current = initialFlags();
  }
}
