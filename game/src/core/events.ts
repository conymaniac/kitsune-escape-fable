/**
 * Typed EventBus over GameEventMap + GameEvent name constants.
 */
import type { GameEventMap, GameEventName } from './types';

/** Name constants — use these instead of raw strings where convenient. */
export const GameEvent: { readonly [K in GameEventName]: K } = {
  QuestStarted: 'QuestStarted',
  QuestStepCompleted: 'QuestStepCompleted',
  QuestCompleted: 'QuestCompleted',
  DialogStarted: 'DialogStarted',
  DialogEnded: 'DialogEnded',
  DialogBlip: 'DialogBlip',
  FormChanged: 'FormChanged',
  GustStart: 'GustStart',
  GustEnd: 'GustEnd',
  Knockdown: 'Knockdown',
  KnockdownRecovered: 'KnockdownRecovered',
  EnterInterior: 'EnterInterior',
  ExitInterior: 'ExitInterior',
  Footstep: 'Footstep',
  Interacted: 'Interacted',
  ItemPickedUp: 'ItemPickedUp',
  BranchCut: 'BranchCut',
  GhostDissolved: 'GhostDissolved',
  CutsceneStart: 'CutsceneStart',
  CutsceneEnd: 'CutsceneEnd',
  LocaleChanged: 'LocaleChanged',
  PhaseChanged: 'PhaseChanged',
  PaperOverlayOpened: 'PaperOverlayOpened',
  PaperOverlayClosed: 'PaperOverlayClosed',
  WindStopped: 'WindStopped',
} as const;

export type GameEventHandler<K extends GameEventName> = (...args: GameEventMap[K]) => void;

type AnyHandler = (...args: unknown[]) => void;

export class EventBus {
  private handlers = new Map<GameEventName, Set<AnyHandler>>();

  /** Subscribe. Returns an unsubscribe function. */
  on<K extends GameEventName>(event: K, handler: GameEventHandler<K>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as AnyHandler);
    return () => this.off(event, handler);
  }

  /** Subscribe for a single emission. Returns an unsubscribe function. */
  once<K extends GameEventName>(event: K, handler: GameEventHandler<K>): () => void {
    const off = this.on(event, ((...args: GameEventMap[K]) => {
      off();
      handler(...args);
    }) as GameEventHandler<K>);
    return off;
  }

  off<K extends GameEventName>(event: K, handler: GameEventHandler<K>): void {
    this.handlers.get(event)?.delete(handler as AnyHandler);
  }

  emit<K extends GameEventName>(event: K, ...args: GameEventMap[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy so handlers may unsubscribe/subscribe during emission.
    for (const handler of [...set]) {
      (handler as GameEventHandler<K>)(...args);
    }
  }

  /** Drop every subscription (restart). */
  clear(): void {
    this.handlers.clear();
  }
}
