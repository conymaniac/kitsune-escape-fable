/**
 * QuestSystem — quest progression glue (TECH_SPEC §1 dialog/questSystem.ts).
 *
 * Listens to QuestStarted / QuestStepCompleted on the bus, computes the
 * current objective from flags.questProgress + data/quests.ts, and pushes
 * localized banner updates into IHud (the HUD stores keys and re-resolves
 * them itself on LocaleChanged). When progress passes objective 6
 * (questProgress reaches 7) it marks flags.questCompleted and emits
 * QuestCompleted exactly once.
 *
 * Contract with emitters (data/dialogs.ts hooks + gameplay/questScript):
 * set flags.questProgress FIRST, then emit QuestStepCompleted(step).
 * Defensively, if an emitter forgot the flag write, this system advances
 * questProgress to step+1 itself, so the event stays authoritative.
 *
 * Integrator wiring example:
 *   const quests = new QuestSystem({ bus, hud, getFlags: () => flagStore.flags });
 *   // after a restart (fresh flags object): quests.refresh();
 */
import type { GameFlags } from '@/core/types';
import type { IHud } from '@/core/types';
import type { EventBus } from '@/core/events';
import { COMPLETED_PROGRESS, QUEST_ID, activeObjective } from '@/data/quests';

export interface QuestSystemOptions {
  bus: EventBus;
  hud: IHud;
  /** Live flags accessor — restart swaps the flags object, never cache it. */
  getFlags: () => GameFlags;
}

export class QuestSystem {
  private readonly bus: EventBus;
  private readonly hud: IHud;
  private readonly getFlags: () => GameFlags;
  private completedEmitted = false;
  private readonly unsubscribes: Array<() => void> = [];

  constructor(options: QuestSystemOptions) {
    this.bus = options.bus;
    this.hud = options.hud;
    this.getFlags = options.getFlags;

    this.unsubscribes.push(
      this.bus.on('QuestStarted', () => this.handleStarted()),
      this.bus.on('QuestStepCompleted', (step) => this.handleStepCompleted(step)),
      // External completion (e.g. questScript emits it directly) — keep
      // the banner + flag consistent without double-emitting.
      this.bus.on('QuestCompleted', () => this.handleCompleted(false)),
    );
  }

  /**
   * Recompute the banner from flags (call after restart with fresh flags,
   * or when handing the HUD back after a cutscene).
   */
  refresh(): void {
    const flags = this.getFlags();
    if (flags.questProgress >= COMPLETED_PROGRESS) {
      this.completedEmitted = true; // never re-emit for an already-done quest
      this.showCompletedBanner();
      return;
    }
    if (flags.questProgress <= 0) {
      this.completedEmitted = false;
      this.hud.setObjective(null);
      return;
    }
    this.completedEmitted = false;
    this.showActiveObjective(flags);
  }

  dispose(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
  }

  // ──────────────────────────────────────────────────── internals ──

  private handleStarted(): void {
    const flags = this.getFlags();
    if (flags.questProgress < 1) flags.questProgress = 1; // defensive
    this.completedEmitted = false;
    this.showActiveObjective(flags);
  }

  private handleStepCompleted(step: number): void {
    const flags = this.getFlags();
    // Emitters write the flag first; advance defensively if they did not.
    if (flags.questProgress <= step) flags.questProgress = step + 1;

    if (flags.questProgress >= COMPLETED_PROGRESS) {
      this.handleCompleted(true);
      return;
    }
    this.showActiveObjective(flags);
  }

  /** @param emit true when this system is the one announcing completion */
  private handleCompleted(emit: boolean): void {
    const flags = this.getFlags();
    if (flags.questProgress < COMPLETED_PROGRESS) flags.questProgress = COMPLETED_PROGRESS;
    flags.questCompleted = true;
    this.showCompletedBanner();
    if (emit && !this.completedEmitted) {
      this.completedEmitted = true;
      this.bus.emit('QuestCompleted', QUEST_ID);
    } else {
      this.completedEmitted = true;
    }
  }

  private showActiveObjective(flags: GameFlags): void {
    const objective = activeObjective(flags);
    if (objective) {
      this.hud.setObjective(objective.titleKey, objective.hintKey);
    } else {
      this.hud.setObjective(null);
    }
  }

  private showCompletedBanner(): void {
    this.hud.setObjective('quest.completed', 'quest.title');
  }
}
