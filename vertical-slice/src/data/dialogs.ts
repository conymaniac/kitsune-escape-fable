/**
 * Dialog trees for the Kitsune Escape vertical slice.
 *
 * Each top-level entry in `dialogTrees` is a root node id used by
 * scenes via `DialogSystem.start(id)`. Linear chains live as separate
 * sibling nodes referenced by `next` ids; branching uses `choices`.
 *
 * Quest progression side-effects (questProgress writes and event emits)
 * live inside `onEnter`/`onSelect` callbacks — see types/DialogContext.
 * We never call QuestSystem directly; QuestSystem refreshes on the
 * GameEvent.QuestStepCompleted event emitted here.
 *
 * Localization convention:
 *   Every `text` field on a DialogNode and on a DialogChoice is a TRANSLATION
 *   KEY (e.g. "dialog.yanagi-intro", "choice.yanagi-intro.help.1"), not raw
 *   prose. DialogSystem looks the key up via `t()` from "@/i18n" before
 *   rendering, so changing locale at runtime affects future dialog renders.
 *   The actual prose lives in `src/i18n/en.ts` and `src/i18n/cs.ts`.
 */

import type { DialogNode, DialogContext } from "@/types";
import { GameEvent } from "@/types";

/**
 * Helper: advance the quest progress flag and notify QuestSystem to refresh.
 * Use this from `onEnter` of the node where the player observably "completes"
 * a step. Step is the new value of questProgress (not the previous one).
 */
const setQuestStep = (ctx: DialogContext, step: number): void => {
  const prev = ctx.state.questProgress;
  ctx.state.questProgress = step;
  ctx.emit(GameEvent.QuestStepCompleted, prev, step);
};

export const dialogTrees: Record<string, DialogNode> = {
  // =====================================================================
  // Tree 1: yanagi-intro
  // Initial encounter at the willow. Player can opt in (A1) or bow out (Z1).
  // The chain bottoms out at `yanagi-intro-quest-start`, which fires the
  // QuestStarted event and sets questProgress to 1.
  // =====================================================================

  "yanagi-intro": {
    id: "yanagi-intro",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro",
    next: "yanagi-intro-help-choice",
  },

  "yanagi-intro-help-choice": {
    id: "yanagi-intro-help-choice",
    speaker: "PLAYER_CHOICE",
    text: "dialog.yanagi-intro-help-choice",
    choices: [
      { text: "choice.yanagi-intro.help.1", next: "yanagi-intro-context" },
      { text: "choice.yanagi-intro.help.2", next: "END" },
    ],
  },

  "yanagi-intro-context": {
    id: "yanagi-intro-context",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-context",
    next: "yanagi-intro-second-choice",
  },

  "yanagi-intro-second-choice": {
    id: "yanagi-intro-second-choice",
    speaker: "PLAYER_CHOICE",
    text: "dialog.yanagi-intro-second-choice",
    choices: [
      { text: "choice.yanagi-intro.second.1", next: "yanagi-intro-cant-go-home" },
      { text: "choice.yanagi-intro.second.2", next: "yanagi-intro-trying" },
      { text: "choice.yanagi-intro.second.3", next: "END" },
    ],
  },

  "yanagi-intro-cant-go-home": {
    id: "yanagi-intro-cant-go-home",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-cant-go-home",
    next: "yanagi-intro-hurt",
  },

  "yanagi-intro-trying": {
    id: "yanagi-intro-trying",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-trying",
    next: "yanagi-intro-hurt",
  },

  "yanagi-intro-hurt": {
    id: "yanagi-intro-hurt",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-hurt",
    next: "yanagi-intro-hurt-choice",
  },

  "yanagi-intro-hurt-choice": {
    id: "yanagi-intro-hurt-choice",
    speaker: "PLAYER_CHOICE",
    text: "dialog.yanagi-intro-hurt-choice",
    choices: [
      { text: "choice.yanagi-intro.hurt.1", next: "yanagi-intro-branches" },
      { text: "choice.yanagi-intro.hurt.2", next: "yanagi-intro-help-confirm" },
    ],
  },

  "yanagi-intro-branches": {
    id: "yanagi-intro-branches",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-branches",
    next: "yanagi-intro-what-do-you-mean",
  },

  "yanagi-intro-what-do-you-mean": {
    id: "yanagi-intro-what-do-you-mean",
    speaker: "MIZUMI",
    text: "dialog.yanagi-intro-what-do-you-mean",
    next: "yanagi-intro-lashed",
  },

  "yanagi-intro-lashed": {
    id: "yanagi-intro-lashed",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-lashed",
    next: "yanagi-intro-i-will-help",
  },

  "yanagi-intro-i-will-help": {
    id: "yanagi-intro-i-will-help",
    speaker: "MIZUMI",
    text: "dialog.yanagi-intro-i-will-help",
    next: "yanagi-intro-help-confirm",
  },

  "yanagi-intro-help-confirm": {
    id: "yanagi-intro-help-confirm",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-help-confirm",
    next: "yanagi-intro-doubt-choice",
  },

  "yanagi-intro-doubt-choice": {
    id: "yanagi-intro-doubt-choice",
    speaker: "PLAYER_CHOICE",
    text: "dialog.yanagi-intro-doubt-choice",
    choices: [
      { text: "choice.yanagi-intro.doubt.1", next: "yanagi-intro-young-fox" },
      { text: "choice.yanagi-intro.doubt.2", next: "yanagi-intro-fear-line" },
    ],
  },

  "yanagi-intro-young-fox": {
    id: "yanagi-intro-young-fox",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-young-fox",
    next: "yanagi-intro-i-can-do-it",
  },

  "yanagi-intro-i-can-do-it": {
    id: "yanagi-intro-i-can-do-it",
    speaker: "MIZUMI",
    text: "dialog.yanagi-intro-i-can-do-it",
    next: "yanagi-intro-fear-line",
  },

  "yanagi-intro-fear-line": {
    id: "yanagi-intro-fear-line",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-fear-line",
    next: "yanagi-intro-what-do-you-need",
  },

  "yanagi-intro-what-do-you-need": {
    id: "yanagi-intro-what-do-you-need",
    speaker: "MIZUMI",
    text: "dialog.yanagi-intro-what-do-you-need",
    next: "yanagi-intro-dagger-request",
  },

  "yanagi-intro-dagger-request": {
    id: "yanagi-intro-dagger-request",
    speaker: "YANAGI",
    text: "dialog.yanagi-intro-dagger-request",
    next: "yanagi-intro-quest-start",
  },

  "yanagi-intro-quest-start": {
    id: "yanagi-intro-quest-start",
    speaker: "MIZUMI",
    text: "dialog.yanagi-intro-quest-start",
    next: "END",
    onEnter: (ctx) => {
      // Start the quest: jump straight to step 1 ("Find the woman's cottage").
      setQuestStep(ctx, 1);
      ctx.emit(GameEvent.QuestStarted);
    },
  },

  // =====================================================================
  // Tree 2: yanagi-return
  // Player has the dagger and comes back. Yanagi asks them to cut the
  // willow's branches. Advance to step 5 (Cut the cursed willow branches).
  // =====================================================================

  "yanagi-return": {
    id: "yanagi-return",
    speaker: "YANAGI",
    text: "dialog.yanagi-return",
    next: "yanagi-return-yes",
  },

  "yanagi-return-yes": {
    id: "yanagi-return-yes",
    speaker: "MIZUMI",
    text: "dialog.yanagi-return-yes",
    next: "yanagi-return-cut",
  },

  "yanagi-return-cut": {
    id: "yanagi-return-cut",
    speaker: "YANAGI",
    text: "dialog.yanagi-return-cut",
    next: "END",
    onEnter: (ctx) => {
      setQuestStep(ctx, 5);
      ctx.emit("yanagi-asked-to-cut");
    },
  },

  // =====================================================================
  // Tree 3: willow-thanks
  // After cutting the branches: Yanagi dissipates. Advance to step 6.
  // =====================================================================

  "willow-thanks": {
    id: "willow-thanks",
    speaker: "YANAGI",
    text: "dialog.willow-thanks",
    next: "willow-thanks-dissipate",
  },

  "willow-thanks-dissipate": {
    id: "willow-thanks-dissipate",
    speaker: "NARRATOR",
    text: "dialog.willow-thanks-dissipate",
    next: "END",
    onEnter: (ctx) => {
      setQuestStep(ctx, 6);
      ctx.emit("yanagi-dissipated");
    },
  },

  // =====================================================================
  // Tree 4: willow-body
  // Investigation. Going past step 6 takes questProgress out of range,
  // which QuestSystem treats as completion (fires QuestCompleted).
  // =====================================================================

  "willow-body": {
    id: "willow-body",
    speaker: "NARRATOR",
    text: "dialog.willow-body",
    next: "willow-body-medallion",
  },

  "willow-body-medallion": {
    id: "willow-body-medallion",
    speaker: "NARRATOR",
    text: "dialog.willow-body-medallion",
    next: "END",
    onEnter: (ctx) => {
      setQuestStep(ctx, 7);
      ctx.emit("investigate-complete");
    },
  },

  // =====================================================================
  // Tree 5: house-door-blocked
  // First interaction at the cottage door. Hints at the fox transformation.
  // =====================================================================

  "house-door-blocked": {
    id: "house-door-blocked",
    speaker: "MIZUMI",
    text: "dialog.house-door-blocked",
    next: "house-door-thinking",
  },

  "house-door-thinking": {
    id: "house-door-thinking",
    speaker: "MIZUMI",
    text: "dialog.house-door-thinking",
    next: "house-door-prompt",
  },

  "house-door-prompt": {
    id: "house-door-prompt",
    speaker: "NARRATOR",
    text: "dialog.house-door-prompt",
    next: "END",
  },

  // =====================================================================
  // Tree 6: papers-read
  // Scattered notes inside the cottage. Sets atmosphere; no quest effect.
  // =====================================================================

  "papers-read": {
    id: "papers-read",
    speaker: "NARRATOR",
    text: "dialog.papers-read",
    next: "papers-read-1",
  },
  "papers-read-1": {
    id: "papers-read-1",
    speaker: "NARRATOR",
    text: "dialog.papers-read-1",
    next: "papers-read-2",
  },
  "papers-read-2": {
    id: "papers-read-2",
    speaker: "NARRATOR",
    text: "dialog.papers-read-2",
    next: "papers-read-3",
  },
  "papers-read-3": {
    id: "papers-read-3",
    speaker: "NARRATOR",
    text: "dialog.papers-read-3",
    next: "papers-read-4",
  },
  "papers-read-4": {
    id: "papers-read-4",
    speaker: "NARRATOR",
    text: "dialog.papers-read-4",
    next: "papers-read-mizumi",
  },
  "papers-read-mizumi": {
    id: "papers-read-mizumi",
    speaker: "MIZUMI",
    text: "dialog.papers-read-mizumi",
    next: "END",
  },

  // =====================================================================
  // Trees 7–9: short observations inside the cottage. No side-effects.
  // =====================================================================

  "table-explore": {
    id: "table-explore",
    speaker: "MIZUMI",
    text: "dialog.table-explore",
    next: "END",
  },

  "futon-explore": {
    id: "futon-explore",
    speaker: "MIZUMI",
    text: "dialog.futon-explore",
    next: "END",
  },

  "sandals-explore": {
    id: "sandals-explore",
    speaker: "MIZUMI",
    text: "dialog.sandals-explore",
    next: "END",
  },
};
