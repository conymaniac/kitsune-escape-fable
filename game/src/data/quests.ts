/**
 * Quest "Cry under the Willow" / "Nářek pod vrbou" — authored fresh from
 * the canon quest scripts. Six objectives, strictly in order.
 *
 * questProgress semantics (GameFlags): 0 none · 1..6 objective N active ·
 * 7 completed (body examined, medallion unlocked).
 */
import type { GameFlags, QuestDefinition, QuestObjective } from '@/core/types';

export const QUEST_ID = 'cryUnderWillow';

export const cryUnderWillow: QuestDefinition = {
  id: QUEST_ID,
  titleKey: 'quest.title',
  descriptionKey: 'quest.description',
  objectives: [
    { step: 1, titleKey: 'quest.obj1.title', hintKey: 'quest.obj1.hint' },
    { step: 2, titleKey: 'quest.obj2.title', hintKey: 'quest.obj2.hint' },
    { step: 3, titleKey: 'quest.obj3.title', hintKey: 'quest.obj3.hint' },
    { step: 4, titleKey: 'quest.obj4.title', hintKey: 'quest.obj4.hint' },
    { step: 5, titleKey: 'quest.obj5.title', hintKey: 'quest.obj5.hint' },
    { step: 6, titleKey: 'quest.obj6.title', hintKey: 'quest.obj6.hint' },
  ],
} as const;

export const COMPLETED_PROGRESS = 7;

/** Objective record for a 1-based step, or null when out of range. */
export function objectiveForStep(step: number): QuestObjective | null {
  return cryUnderWillow.objectives.find((o) => o.step === step) ?? null;
}

/** i18n key of the banner title for a step ('' when out of range). */
export function objectiveKey(step: number): string {
  return objectiveForStep(step)?.titleKey ?? '';
}

/** i18n key of the short objective line for a step ('' when out of range). */
export function objectiveHintKey(step: number): string {
  return objectiveForStep(step)?.hintKey ?? '';
}

/** The currently active objective per flags, or null (no quest / done). */
export function activeObjective(flags: GameFlags): QuestObjective | null {
  return objectiveForStep(flags.questProgress);
}

export function isStarted(flags: GameFlags): boolean {
  return flags.questProgress >= 1;
}

export function isComplete(flags: GameFlags): boolean {
  return flags.questProgress >= COMPLETED_PROGRESS;
}
