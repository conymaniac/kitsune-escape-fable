/**
 * UI root — owns the #ui DOM layer stack and injects styles.
 * Layer order (bottom→top): hud · dialog · screens · fade · paper.
 * (screens.ts mounts its own float sublayer — whispers/self-talk bubbles —
 * inside the screens layer, so it needs no slot here.)
 */
import './styles.css';

export interface UiLayers {
  root: HTMLElement;
  hud: HTMLDivElement;
  dialog: HTMLDivElement;
  screens: HTMLDivElement;
  fade: HTMLDivElement;
  paper: HTMLDivElement;
}

export function createUiRoot(): UiLayers {
  const root = document.getElementById('ui');
  if (!root) throw new Error('#ui root element missing in index.html');
  root.innerHTML = '';

  function layer(name: string): HTMLDivElement {
    const el = document.createElement('div');
    el.className = `ke-layer ke-layer-${name}`;
    root!.appendChild(el);
    return el;
  }

  return {
    root,
    hud: layer('hud'),
    dialog: layer('dialog'),
    screens: layer('screens'),
    fade: layer('fade'),
    paper: layer('paper'),
  };
}
