/**
 * Action-mapped keyboard/mouse input.
 * Final controls (DESIGN §2): WASD/Arrows move · E interact · F transform ·
 * Space form-verb (Bound/Brace) · Space/Enter/click advance · 1–4 choices ·
 * L language · M mute · Esc pause · R restart.
 */
import { Vector2 } from 'three';

export type InputAction =
  | 'interact'
  | 'transform'
  | 'formVerb'
  | 'advance'
  | 'choice1'
  | 'choice2'
  | 'choice3'
  | 'choice4'
  | 'lang'
  | 'mute'
  | 'pause'
  | 'restart';

const KEY_ACTIONS: Readonly<Record<string, readonly InputAction[]>> = {
  KeyE: ['interact', 'advance'],
  KeyF: ['transform'],
  Space: ['formVerb', 'advance'],
  Enter: ['advance'],
  Digit1: ['choice1'],
  Digit2: ['choice2'],
  Digit3: ['choice3'],
  Digit4: ['choice4'],
  Numpad1: ['choice1'],
  Numpad2: ['choice2'],
  Numpad3: ['choice3'],
  Numpad4: ['choice4'],
  KeyL: ['lang'],
  KeyM: ['mute'],
  Escape: ['pause'],
  KeyR: ['restart'],
};

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export class Input {
  /** Resolves on the first user gesture — audio unlock hook. */
  readonly anyGesture: Promise<void>;

  private keysDown = new Set<string>();
  private actionsDown = new Set<InputAction>();
  private pressed = new Set<InputAction>();
  private axisVec = new Vector2();
  private disposed = false;
  private resolveGesture: (() => void) | null = null;
  private gestureSeen = false;

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    this.markGesture();
    if (MOVE_KEYS.has(e.code) || e.code in KEY_ACTIONS) e.preventDefault();
    if (this.keysDown.has(e.code)) return; // ignore OS key-repeat
    this.keysDown.add(e.code);
    const actions = KEY_ACTIONS[e.code];
    if (actions) {
      for (const a of actions) {
        this.actionsDown.add(a);
        this.pressed.add(a);
      }
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
    const actions = KEY_ACTIONS[e.code];
    if (actions) for (const a of actions) this.actionsDown.delete(a);
  };

  private readonly onMouseDown = (): void => {
    this.markGesture();
    this.pressed.add('advance');
  };

  private readonly onBlur = (): void => {
    this.keysDown.clear();
    this.actionsDown.clear();
  };

  constructor(private target: Window = window) {
    this.anyGesture = new Promise((resolve) => {
      this.resolveGesture = resolve;
    });
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('mousedown', this.onMouseDown);
    target.addEventListener('blur', this.onBlur);
  }

  /** Camera-relative-ready movement axis, normalized, +y = screen up. */
  axis(): Vector2 {
    let x = 0;
    let y = 0;
    if (this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft')) x -= 1;
    if (this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight')) x += 1;
    if (this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp')) y += 1;
    if (this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown')) y -= 1;
    this.axisVec.set(x, y);
    if (this.axisVec.lengthSq() > 1) this.axisVec.normalize();
    return this.axisVec;
  }

  isDown(action: InputAction): boolean {
    return this.actionsDown.has(action);
  }

  /** True once per physical press, until lateUpdate() clears the frame. */
  justPressed(action: InputAction): boolean {
    return this.pressed.has(action);
  }

  /** Clear per-frame just-pressed state. Register late in the loop order. */
  lateUpdate(): void {
    this.pressed.clear();
  }

  /**
   * Drop any pending just-pressed state immediately (M1 additive — see
   * BUILD_STATE "M1 E-ui integrator notes": a stale Escape could leak
   * across the intro→play transition when rAF was throttled and instantly
   * open pause; main.ts calls this on PhaseChanged).
   */
  clearPressed(): void {
    this.pressed.clear();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.target.removeEventListener('keydown', this.onKeyDown);
    this.target.removeEventListener('keyup', this.onKeyUp);
    this.target.removeEventListener('mousedown', this.onMouseDown);
    this.target.removeEventListener('blur', this.onBlur);
  }

  private isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  private markGesture(): void {
    if (this.gestureSeen) return;
    this.gestureSeen = true;
    this.resolveGesture?.();
  }
}
