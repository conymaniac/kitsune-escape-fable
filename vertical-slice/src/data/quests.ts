/**
 * Quest objectives for the vertical slice (Cry under the Willow).
 *
 * Step index aligns with GameState.questProgress. Titles and descriptions
 * are no longer stored here — they come from the i18n dictionary, keyed as
 *   quest.cryUnderWillow.title
 *   quest.cryUnderWillow.step.<step>.description
 * QuestSystem reads those keys via `t()` when refreshing the HUD banner.
 */

import type { QuestObjective } from "@/types";

/** Valid step numbers for the Cry under the Willow quest (1..6). */
export const CRY_UNDER_WILLOW_STEPS: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * Backwards-compatible export — kept so QuestSystem can still compare
 * against the total count when deciding if the quest is complete.
 */
export const cryUnderWillow: readonly { step: number }[] = CRY_UNDER_WILLOW_STEPS.map(
  (step) => ({ step }),
);

/**
 * Returns a stub objective for the given step, or null if out of range.
 * Title / description are intentionally empty strings — callers should
 * fetch the localized strings via `t()` themselves. We keep this function
 * so the shape stays compatible with the QuestObjective interface.
 */
export function getObjective(step: number): QuestObjective | null {
  if (!CRY_UNDER_WILLOW_STEPS.includes(step)) return null;
  return { step, title: "", description: "" };
}
