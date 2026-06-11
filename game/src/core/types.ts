/**
 * ALL shared contracts for the vertical slice. M0 defines these once;
 * every later milestone implements them — never redefines them.
 *
 * Only `import type` from three is allowed here (no runtime dependency).
 */
import type * as THREE from 'three';
import type { PaletteKey } from '@/style/palette';

// ─────────────────────────────────────────────────────────── locale ──

export type Locale = 'en' | 'cs';

// ──────────────────────────────────────────────────── director / fsm ──

export type GamePhase = 'boot' | 'title' | 'intro' | 'play' | 'cutscene' | 'ending';

// ─────────────────────────────────────────────────────────── player ──

export type KitsuneForm = 'human' | 'fox';

/** Per-frame motion snapshot fed to character rigs. */
export interface MotionState {
  /** Horizontal speed in m/s. */
  speed: number;
  /** Facing/movement heading in radians around +Y (0 = +Z). */
  heading: number;
  grounded: boolean;
}

// ──────────────────────────────────────────────────────────── flags ──

/**
 * The single mutable game-state record. Reset = fresh object from
 * `initialFlags()` in core/flags.ts.
 *
 * questProgress semantics (0..7):
 *   0 = no quest · 1..6 = objective N active · 7 = quest completed.
 */
export interface GameFlags {
  questProgress: number;
  hasMask: boolean;
  hasDagger: boolean;
  currentForm: KitsuneForm;
  hasTransformed: boolean;
  /** Player heard the woman's 15 m ambient line. */
  ambientHeard: boolean;
  /** Player refused via Z1/Z2 at least once (no quest granted). */
  questRefused: boolean;
  /** Cottage door tried while blocked (Objective 1 beat). */
  doorBlockedSeen: boolean;
  tableSeen: boolean;
  futonSeen: boolean;
  /** Diary papers read (paper overlay seen). */
  paperRead: boolean;
  sandalsExamined: boolean;
  sandalsRemoved: boolean;
  /** Willow branch clusters cut so far (0..3). */
  branchesCut: number;
  ghostDissolved: boolean;
  /** The wind has stopped permanently (post-dissolve finale). */
  windStopped: boolean;
  bodyExamined: boolean;
  medallionUnlocked: boolean;
  questCompleted: boolean;
}

// ─────────────────────────────────────────────────────────── events ──

export type GustPhase = 'telegraph' | 'lash';
export type FootstepSurface = 'grass' | 'wood';

/**
 * The full game event map: event name → emitter argument tuple.
 * core/events.ts implements the typed EventBus over this map.
 */
export interface GameEventMap {
  QuestStarted: [questId: string];
  QuestStepCompleted: [step: number];
  QuestCompleted: [questId: string];
  DialogStarted: [nodeId: string];
  DialogEnded: [nodeId: string];
  /** One typewriter glyph landed (throttled) — audio blip hook. */
  DialogBlip: [];
  FormChanged: [form: KitsuneForm];
  GustStart: [phase: GustPhase];
  GustEnd: [];
  Knockdown: [];
  KnockdownRecovered: [];
  EnterInterior: [];
  ExitInterior: [];
  Footstep: [surface: FootstepSurface];
  Interacted: [interactableId: string];
  ItemPickedUp: [itemId: string];
  BranchCut: [remaining: number];
  GhostDissolved: [];
  CutsceneStart: [name: string];
  CutsceneEnd: [name: string];
  LocaleChanged: [locale: Locale];
  PhaseChanged: [phase: GamePhase];
  PaperOverlayOpened: [];
  PaperOverlayClosed: [];
  /** The wind stops globally and permanently — silence is the payoff. */
  WindStopped: [];
}

export type GameEventName = keyof GameEventMap;

// ─────────────────────────────────────────────────────────── dialog ──

export type SpeakerId = 'mizumi' | 'yanagi' | 'none';

/** Side-effect context handed to dialog hooks. */
export interface DialogContext {
  flags: GameFlags;
  emit: <K extends GameEventName>(event: K, ...args: GameEventMap[K]) => void;
}

export interface DialogChoice {
  /** i18n key of the player's line. */
  textKey: string;
  /** Next node id, or null to end the dialog after this choice. */
  next: string | null;
  /** Hidden when this returns false. */
  enabled?: (ctx: DialogContext) => boolean;
  onSelect?: (ctx: DialogContext) => void;
}

export interface DialogNode {
  id: string;
  speaker: SpeakerId;
  /** i18n key of the spoken line; omitted for pure choice hubs. */
  textKey?: string;
  /** Next node id, or null/undefined to end (when no choices). */
  next?: string | null;
  /** Player choices presented after the line completes. */
  choices?: DialogChoice[];
  onEnter?: (ctx: DialogContext) => void;
  onExit?: (ctx: DialogContext) => void;
}

// ──────────────────────────────────────────────────────────── quest ──

export interface QuestObjective {
  /** 1-based step number (1..6). */
  step: number;
  /** i18n key of the banner title. */
  titleKey: string;
  /** i18n key of the short objective line under the title. */
  hintKey: string;
}

export interface QuestDefinition {
  id: string;
  titleKey: string;
  descriptionKey: string;
  objectives: readonly QuestObjective[];
}

// ──────────────────────────────────────────────── gameplay registries ──

export interface Interactable {
  id: string;
  position: THREE.Vector3;
  radius: number;
  /** i18n key of the action verb shown in the prompt (e.g. prompt.open). */
  promptKey: string;
  /** Higher wins when several are in range. */
  priority?: number;
  humanOnly?: boolean;
  foxOnly?: boolean;
  enabled?: () => boolean;
  onInteract: () => void;
}

/** Circle trigger on the XZ plane. */
export interface TriggerVolume {
  id: string;
  position: THREE.Vector3;
  radius: number;
  once?: boolean;
  enabled?: () => boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

// ────────────────────────────────────────────────────────── physics ──

/** Static collision shapes on the XZ plane (player is a circle). */
export type ColliderShape =
  | { kind: 'aabb'; minX: number; minZ: number; maxX: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; radius: number };

// ───────────────────────────────────────────────────────────── wind ──

export interface WindState {
  /** Accumulated time in seconds. */
  time: number;
  /** 0..1 current strength envelope (base oscillation + gust). */
  strength: number;
  /** Normalized wind direction on the XZ plane. */
  direction: THREE.Vector2;
  phase: 'calm' | GustPhase;
  /** True after the finale — wind never blows again. */
  stopped: boolean;
}

/** Shared shader uniforms owned by the WindSystem. */
export interface WindUniforms {
  uTime: { value: number };
  uWindStrength: { value: number };
  uWindDir: { value: THREE.Vector2 };
}

// ──────────────────────────────────────────────────────── materials ──

export interface ToonOptions {
  vertexColors?: boolean;
  transparent?: boolean;
  opacity?: number;
  flatShading?: boolean;
  emissiveKey?: PaletteKey;
  emissiveIntensity?: number;
  doubleSided?: boolean;
}

/**
 * Material factory — the only way meshes get materials.
 * M0 ships flat Lambert/Basic internals; stream A swaps in toon ramps and
 * custom shaders behind these exact signatures. Instances are cached.
 */
export interface MaterialKit {
  toon(colorKey: PaletteKey, opts?: ToonOptions): THREE.Material;
  emissive(colorKey: PaletteKey, intensity?: number): THREE.Material;
  water(): THREE.Material;
  ghost(): THREE.Material;
  wisp(): THREE.Material;
  sky(): THREE.Material;
  /** Inverted-hull ink outline material (characters only). */
  ink(): THREE.Material;
}

// ──────────────────────────────────────────────────── world builders ──

export interface CircleZone {
  center: THREE.Vector3;
  radius: number;
}

/** Willow lash hazard zone (branch sweep arcs during gusts). */
export interface LashZone extends CircleZone {
  id: string;
}

/** Wind shadow — lee of boulders/trunks/dock posts; no stagger inside. */
export type WindShadow = CircleZone;

export interface ExteriorAnchors {
  spawn: THREE.Vector3;
  shrine: THREE.Vector3;
  log: THREE.Vector3;
  creekGap: THREE.Vector3;
  gate: THREE.Vector3;
  willow: THREE.Vector3;
  ghostSpot: THREE.Vector3;
  dock: THREE.Vector3;
  boulders: THREE.Vector3[];
  window: THREE.Vector3;
  door: THREE.Vector3;
  bodyMound: THREE.Vector3;
  reedTunnel: THREE.Vector3;
  fenceGap: THREE.Vector3;
}

export interface ExteriorBuildResult {
  group: THREE.Group;
  colliders: ColliderShape[];
  anchors: ExteriorAnchors;
  lashZones: LashZone[];
  windShadows: WindShadow[];
}

export interface InteriorAnchors {
  windowLanding: THREE.Vector3;
  doorSpawn: THREE.Vector3;
  table: THREE.Vector3;
  futon: THREE.Vector3;
  papers: THREE.Vector3;
  drawer: THREE.Vector3;
  sandals: THREE.Vector3;
  door: THREE.Vector3;
}

export interface InteriorBuildResult {
  group: THREE.Group;
  colliders: ColliderShape[];
  anchors: InteriorAnchors;
}

// ──────────────────────────────────────────────────────── characters ──

export type CharacterAction =
  | 'idle'
  | 'walk'
  | 'leap'
  | 'cut'
  | 'pickup'
  | 'sit'
  | 'brace'
  | 'knockdown'
  | 'none';

export interface ICharacter {
  root: THREE.Group;
  update(dt: number, motion: MotionState): void;
  setAction(action: CharacterAction): void;
  dispose(): void;
}

// ──────────────────────────────────────────────────────────── audio ──

/** Every synthesized SFX in the slice (see TECH_SPEC audio/sfx.ts). */
export type SfxName =
  | 'footstepGrass'
  | 'footstepWood'
  | 'transform'
  | 'interact'
  | 'pickup'
  | 'paperRustle'
  | 'windowLeap'
  | 'branchCut'
  | 'ghostDissolved'
  | 'dialogBlip'
  | 'uiConfirm'
  | 'knockdown'
  | 'suzuBell';

export type MusicState = 'title' | 'exterior' | 'interior' | 'ending' | 'none';

export interface IAudio {
  /** Bootstrap + unlock on first user gesture. Safe to call repeatedly. */
  init(): Promise<void>;
  playSfx(name: SfxName): void;
  setMusicState(state: MusicState): void;
  /** Duck music (−6 dB) while dialog is active. */
  duck(on: boolean): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  /** Returns the new muted state. */
  toggleMute(): boolean;
  update(dt: number, windStrength: number): void;
}

// ─────────────────────────────────────────────────────────────── ui ──

export interface IHud {
  /** Quest banner: title + short objective line. null hides the banner. */
  setObjective(titleKey: string | null, hintKey?: string | null): void;
  /**
   * Interact prompt (e.g. "[E] Open"). null hides it.
   * blocked = action exists but current form can't do it (crossed-out paw).
   */
  setPrompt(promptKey: string | null, blocked?: boolean): void;
  setForm(form: KitsuneForm): void;
  /** Contextual hint line (tutorial glyphs, knockdown wiggle). null hides. */
  setHint(hintKey: string | null): void;
  setMuted(muted: boolean): void;
  setVisible(visible: boolean): void;
}

export interface IDialogUi {
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** Resolved speaker label (already localized), or null to hide. */
  setSpeaker(label: string | null): void;
  /** Typewriter a resolved line; onComplete fires when fully shown. */
  showLine(text: string, onComplete?: () => void): void;
  isTyping(): boolean;
  /** Finish the current line instantly (E completes-then-advances). */
  completeLine(): void;
  /** Present resolved choice texts; onPick gets the 0-based index. */
  showChoices(texts: string[], onPick: (index: number) => void): void;
  clearChoices(): void;
  /** Keyboard path for choices 1–4. No-op when index out of range. */
  pickChoice(index: number): void;
}

export interface IScreens {
  showTitle(onStart: () => void): void;
  hideTitle(): void;
  /** 6 intro narration beats; any key advances; Esc skips. */
  showIntro(onDone: () => void): void;
  hideIntro(): void;
  /** Medallion ceremony + ending prose; R restarts, Esc to title. */
  showEnding(onRestart: () => void, onTitle: () => void): void;
  hideEnding(): void;
  showPause(onResume: () => void, onRestart: () => void): void;
  hidePause(): void;
  isPauseOpen(): boolean;
  fadeToBlack(seconds?: number): Promise<void>;
  fadeFromBlack(seconds?: number): Promise<void>;
  /** Full-screen washi paper overlay (diary, body reveal). */
  showPaper(titleText: string, lines: string[], onClose?: () => void): void;
  closePaper(): void;
  isPaperOpen(): boolean;
}
