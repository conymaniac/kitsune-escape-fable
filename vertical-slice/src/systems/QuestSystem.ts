/**
 * QuestSystem
 *
 * Lightweight quest tracker that:
 * - Reads/writes GameState in Phaser registry
 * - Updates the HUD banner (#quest-banner) in index.html
 * - Emits GameEvent.QuestStepCompleted / .QuestCompleted on the scene event bus
 * - Listens for locale changes and re-renders the banner so the player can
 *   toggle EN/CS mid-game and see the active objective in the new language.
 *
 * Instantiate once per scene that needs quest tracking. State is shared via
 * the global game registry.
 */

import Phaser from "phaser";
import {
  GameState,
  RegistryKey,
  GameEvent,
  QuestObjective,
} from "@/types";
import { getObjective, cryUnderWillow } from "@/data/quests";
import { onLocaleChange, t } from "@/i18n";

export class QuestSystem {
  private scene: Phaser.Scene;
  private banner: HTMLElement | null;
  private titleEl: HTMLElement | null;
  private objectiveEl: HTMLElement | null;
  private unsubscribeLocale: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.banner = document.getElementById("quest-banner");
    this.titleEl = this.banner?.querySelector(".quest-title") ?? null;
    this.objectiveEl = this.banner?.querySelector(".quest-objective") ?? null;

    // Refresh the banner whenever the locale flips so the player sees the
    // new language without having to re-trigger anything.
    this.unsubscribeLocale = onLocaleChange(() => this.refresh());

    // Clean up the global listener when the scene shuts down to avoid leaks
    // across scene restarts.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeLocale();
    });

    this.refresh();
  }

  private get state(): GameState {
    return this.scene.registry.get(RegistryKey.GameState) as GameState;
  }

  /** Reflect current quest step into the HUD banner. */
  refresh(): void {
    const step = this.state.questProgress;
    const obj = getObjective(step);
    if (!this.banner) return;
    if (!obj) {
      this.banner.classList.add("hidden");
      return;
    }
    this.banner.classList.remove("hidden");
    if (this.titleEl) {
      this.titleEl.textContent = t("quest.cryUnderWillow.title");
    }
    if (this.objectiveEl) {
      this.objectiveEl.textContent = t(
        `quest.cryUnderWillow.step.${obj.step}.description`,
      );
    }
  }

  /**
   * Advance the quest to the next step (or to a specific step).
   * Emits QuestStepCompleted on the scene event bus.
   */
  advance(toStep?: number): void {
    const state = this.state;
    const prev = state.questProgress;
    state.questProgress = toStep ?? state.questProgress + 1;
    this.refresh();
    this.scene.events.emit(
      GameEvent.QuestStepCompleted,
      prev,
      state.questProgress
    );
    if (state.questProgress > cryUnderWillow.length) {
      state.questCompleted = true;
      this.scene.events.emit(GameEvent.QuestCompleted);
    }
  }

  /** Get current step number (0 = no quest yet). */
  currentStep(): number {
    return this.state.questProgress;
  }

  /** Get the current objective object, or null if no active quest. */
  currentObjective(): QuestObjective | null {
    return getObjective(this.state.questProgress);
  }

  /** Hide the banner entirely (e.g. between zones). */
  hide(): void {
    this.banner?.classList.add("hidden");
  }
}
