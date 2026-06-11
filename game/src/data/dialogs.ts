/**
 * The canon dialogue tree — authored fresh from
 * "Kitsune Escape _ Interactive dialog" (branching structure of record) and
 * "Kitsune Escape _ Nářek pod vrbou" / "Cry under the Willow" (linear beats).
 *
 * Branch map (player options → her answer node):
 *   entry: A1 → a1 · Z1 → zExit
 *   a1:    B1 → b1 · B2 → b2 · B3 → b3 · Z1 → zExit
 *   b1:    C1 → c12 · C3 → c3 · Z1 → zExit
 *   b2/b3: C2 → c12 · C3 → c3 · Z1 → zExit
 *   c12:   D1 → d1 · Z1 → zExit
 *   c3:    D2 → d2 · Z1 → zExit
 *   d1:    E1 → e1 · Z1 → zExit
 *   d2:    E2 → e2 · Z1 → zExit
 *   e1:    C3 → c3 (loop-in) · Z2 → zExit
 *   e2:    F1 → f1 · Z2 → zExit
 *   f1:    G1 → quest start, end · Z2 → zExit
 * Z1/Z2 end with her sad line and grant NO quest (canon).
 *
 * Quest-step hooks owned by this data (per TECH_SPEC):
 *   G1 onSelect → questProgress 1 + QuestStarted
 *   return.3    → questProgress 5 (she asks you to cut)
 *   thanks      → questProgress 6 (cutting completed objective 5; Dialog 7
 *                 plays, then objective 6 = search the area)
 * Steps 2/3/4 and the body-explore completion (step 7 + QuestCompleted)
 * are wired by gameplay/questScript.ts in M1.
 */
import type { DialogContext, DialogNode } from '@/core/types';
import { QUEST_ID } from './quests';

function startQuest(ctx: DialogContext): void {
  if (ctx.flags.questProgress >= 1) return;
  ctx.flags.questProgress = 1;
  ctx.emit('QuestStarted', QUEST_ID);
}

function refuseQuest(ctx: DialogContext): void {
  if (ctx.flags.questProgress === 0) ctx.flags.questRefused = true;
}

const nodes: DialogNode[] = [
  // ── ambient whisper (15 m auto-trigger; floating text, not the panel) ──
  {
    id: 'yanagi.ambient',
    speaker: 'yanagi',
    textKey: 'dlg.ambient.yanagi',
    next: null,
    onEnter: (ctx) => {
      ctx.flags.ambientHeard = true;
    },
  },

  // ── her waiting line — hushing the baby over the howl (canon linear) ──
  {
    id: 'yanagi.fear',
    speaker: 'yanagi',
    textKey: 'dlg.y.fear',
    next: null,
  },

  // ── DIALOG 1 — the branching tree ──
  {
    id: 'main.entry',
    speaker: 'mizumi',
    choices: [
      { textKey: 'dlg.c.a1', next: 'main.a1' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.a1',
    speaker: 'yanagi',
    textKey: 'dlg.y.a1',
    choices: [
      { textKey: 'dlg.c.b1', next: 'main.b1' },
      { textKey: 'dlg.c.b2', next: 'main.b2' },
      { textKey: 'dlg.c.b3', next: 'main.b3' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.b1',
    speaker: 'yanagi',
    textKey: 'dlg.y.b1',
    choices: [
      { textKey: 'dlg.c.c1', next: 'main.c12' },
      { textKey: 'dlg.c.c3', next: 'main.c3' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.b2',
    speaker: 'yanagi',
    textKey: 'dlg.y.b2',
    choices: [
      { textKey: 'dlg.c.c2', next: 'main.c12' },
      { textKey: 'dlg.c.c3', next: 'main.c3' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.b3',
    speaker: 'yanagi',
    textKey: 'dlg.y.b3',
    choices: [
      { textKey: 'dlg.c.c2', next: 'main.c12' },
      { textKey: 'dlg.c.c3', next: 'main.c3' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.c12',
    speaker: 'yanagi',
    textKey: 'dlg.y.c12',
    choices: [
      { textKey: 'dlg.c.d1', next: 'main.d1' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.c3',
    speaker: 'yanagi',
    textKey: 'dlg.y.c3',
    choices: [
      { textKey: 'dlg.c.d2', next: 'main.d2' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.d1',
    speaker: 'yanagi',
    textKey: 'dlg.y.d1',
    choices: [
      { textKey: 'dlg.c.e1', next: 'main.e1' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.d2',
    speaker: 'yanagi',
    textKey: 'dlg.y.d2',
    choices: [
      { textKey: 'dlg.c.e2', next: 'main.e2' },
      { textKey: 'dlg.c.z1', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.e1',
    speaker: 'yanagi',
    textKey: 'dlg.y.e1',
    choices: [
      { textKey: 'dlg.c.c3', next: 'main.c3' },
      { textKey: 'dlg.c.z2', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.e2',
    speaker: 'yanagi',
    textKey: 'dlg.y.e2',
    choices: [
      { textKey: 'dlg.c.f1', next: 'main.f1' },
      { textKey: 'dlg.c.z2', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  {
    id: 'main.f1',
    speaker: 'yanagi',
    textKey: 'dlg.y.f1',
    choices: [
      { textKey: 'dlg.c.g1', next: null, onSelect: startQuest },
      { textKey: 'dlg.c.z2', next: 'main.zExit', onSelect: refuseQuest },
    ],
  },
  // Z1/Z2 exit — her sad line; NO quest granted.
  {
    id: 'main.zExit',
    speaker: 'yanagi',
    textKey: 'dlg.y.z',
    next: null,
  },

  // ── cottage door blocked (Objective 1 beat) ──
  {
    id: 'door.blocked',
    speaker: 'mizumi',
    textKey: 'dlg.m.doorBlocked',
    next: null,
    onEnter: (ctx) => {
      ctx.flags.doorBlockedSeen = true;
    },
  },

  // ── optional interior beats ──
  {
    id: 'int.table',
    speaker: 'mizumi',
    textKey: 'dlg.m.table',
    next: null,
    onEnter: (ctx) => {
      ctx.flags.tableSeen = true;
    },
  },
  // Dialog 3; the scripted shutter-slam (Dialog 4) auto-follows via
  // questScript, which then runs the int.scare1 → int.scare2 chain.
  {
    id: 'int.futon',
    speaker: 'mizumi',
    textKey: 'dlg.m.futon',
    next: null,
    onEnter: (ctx) => {
      ctx.flags.futonSeen = true;
    },
  },
  {
    id: 'int.scare1',
    speaker: 'mizumi',
    textKey: 'dlg.m.scare1',
    next: 'int.scare2',
  },
  {
    id: 'int.scare2',
    speaker: 'mizumi',
    textKey: 'dlg.m.scare2',
    next: null,
  },
  // Sad reflection after reading the diary papers (paper overlay closes).
  {
    id: 'int.papersAfter',
    speaker: 'mizumi',
    textKey: 'dlg.m.papersAfter',
    next: null,
    onEnter: (ctx) => {
      ctx.flags.paperRead = true;
    },
  },
  {
    id: 'int.sandals',
    speaker: 'mizumi',
    textKey: 'dlg.m.sandals',
    next: null,
    onEnter: (ctx) => {
      ctx.flags.sandalsExamined = true;
    },
  },

  // ── DIALOG 6 — return with the dagger ──
  {
    id: 'return.1',
    speaker: 'yanagi',
    textKey: 'dlg.y.return1',
    next: 'return.2',
  },
  {
    id: 'return.2',
    speaker: 'mizumi',
    textKey: 'dlg.m.return2',
    next: 'return.3',
  },
  {
    id: 'return.3',
    speaker: 'yanagi',
    textKey: 'dlg.y.return3',
    next: null,
    onEnter: (ctx) => {
      if (ctx.flags.questProgress < 5) {
        ctx.flags.questProgress = 5;
        ctx.emit('QuestStepCompleted', 4);
      }
    },
  },

  // ── DIALOG 7 — thanks after the third cut; the dissolve follows ──
  {
    id: 'thanks',
    speaker: 'yanagi',
    textKey: 'dlg.y.thanks',
    next: null,
    onEnter: (ctx) => {
      if (ctx.flags.questProgress < 6) {
        ctx.flags.questProgress = 6;
        ctx.emit('QuestStepCompleted', 5);
      }
    },
  },
];

/** All dialog nodes keyed by id. */
export const dialogNodes: Readonly<Record<string, DialogNode>> = Object.fromEntries(
  nodes.map((node) => [node.id, node]),
);

export function getDialogNode(id: string): DialogNode | undefined {
  return dialogNodes[id];
}

/** Root ids the rest of the game starts dialogs from. */
export const DialogRoot = {
  ambient: 'yanagi.ambient',
  fear: 'yanagi.fear',
  main: 'main.entry',
  doorBlocked: 'door.blocked',
  table: 'int.table',
  futon: 'int.futon',
  scare: 'int.scare1',
  papersAfter: 'int.papersAfter',
  sandals: 'int.sandals',
  returnWithDagger: 'return.1',
  thanks: 'thanks',
} as const;
