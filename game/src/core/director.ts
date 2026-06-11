/**
 * GameDirector — the top-level FSM.
 * phase: boot → title → intro → play ⇄ cutscene → ending
 * dialogActive is an overlay flag on top of `play`.
 */
import type { GamePhase } from './types';
import type { EventBus } from './events';

export class GameDirector {
  private currentPhase: GamePhase = 'boot';

  /** True while the dialog panel owns input (overlay over `play`). */
  dialogActive = false;

  constructor(private bus: EventBus) {}

  get phase(): GamePhase {
    return this.currentPhase;
  }

  setPhase(phase: GamePhase): void {
    if (phase === this.currentPhase) return;
    this.currentPhase = phase;
    this.bus.emit('PhaseChanged', phase);
  }

  /** Free player movement/interaction this frame? */
  canPlayerAct(): boolean {
    return this.currentPhase === 'play' && !this.dialogActive;
  }
}
