// Shared types for Kitsune Escape vertical slice.
// All scenes and systems import from here. DO NOT add scene-specific types.

import type Phaser from "phaser";

/** Scene keys — single source of truth */
export const SceneKey = {
  Boot: "BootScene",
  Title: "TitleScene",
  Intro: "IntroScene",
  WillowLake: "WillowLakeScene",
  Cottage: "CottageScene",
  End: "EndScene",
} as const;
export type SceneKey = (typeof SceneKey)[keyof typeof SceneKey];

/** Player transformation state. Mizumi can switch between human and fox. */
export type KitsuneForm = "human" | "fox";

/** Game-wide flags carried between scenes via Phaser registry. */
export interface GameState {
  /** Quest progression (current objective index, 0 = no quest yet) */
  questProgress: number;
  /** Has player picked up the dagger? */
  hasDagger: boolean;
  /** Has player completed the willow quest? */
  questCompleted: boolean;
  /** Has player ever transformed (controls tutorial hints)? */
  hasTransformed: boolean;
  /** Current player form (persisted across scenes) */
  currentForm: KitsuneForm;
}

export const initialGameState = (): GameState => ({
  questProgress: 0,
  hasDagger: false,
  questCompleted: false,
  hasTransformed: false,
  currentForm: "human",
});

/** Registry keys for cross-scene shared state */
export const RegistryKey = {
  GameState: "gameState",
  DialogActive: "dialogActive",
} as const;

/** Standard input keys exposed by the player controller */
export interface PlayerInput {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
  interact: Phaser.Input.Keyboard.Key;
  transform: Phaser.Input.Keyboard.Key;
}

/** A single line / choice node in a dialog tree */
export interface DialogNode {
  id: string;
  speaker: "MIZUMI" | "YANAGI" | "NARRATOR" | "PLAYER_CHOICE";
  text: string;
  /** If this node is a player choice, these are the options shown */
  choices?: DialogChoice[];
  /** If linear, the next node id (or "END" to close dialog) */
  next?: string;
  /** Optional side-effect to run when this node displays */
  onEnter?: (ctx: DialogContext) => void;
}

export interface DialogChoice {
  text: string;
  next: string;
  /** Optional side-effect when selected */
  onSelect?: (ctx: DialogContext) => void;
}

export interface DialogContext {
  scene: Phaser.Scene;
  state: GameState;
  /** Fire a custom event on the scene events bus */
  emit: (event: string, ...args: unknown[]) => void;
}

/** Public API contract that DialogSystem must expose */
export interface IDialogSystem {
  /** Start a dialog tree at the given root node id */
  start(rootId: string): void;
  /** True if dialog is currently active */
  isActive(): boolean;
  /** Close any open dialog immediately */
  close(): void;
}

/** Custom event names emitted on scene events bus */
export const GameEvent = {
  DialogEnded: "dialog-ended",
  QuestStarted: "quest-started",
  QuestStepCompleted: "quest-step-completed",
  QuestCompleted: "quest-completed",
  TransformRequested: "transform-requested",
  Interact: "interact",
  ItemPickedUp: "item-picked-up",
} as const;

/** Quest objective metadata for HUD banner */
export interface QuestObjective {
  step: number;
  title: string;
  description: string;
}
