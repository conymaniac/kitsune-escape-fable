/**
 * Dialog panel — IDialogUi implementation (M1, Stream E).
 *
 * Ink-brush styled bone-paper panel: speaker label + inline-SVG ink
 * portrait, typewriter at 35 chars/s with throttled DialogBlip events,
 * choices as a numbered list. ALL dialog input lives here while the
 * panel is open:
 *   · E / Space / Enter / click  → completes-then-advances (via the
 *     requestAdvance hook the DialogSystem registers)
 *   · 1–4 (and numpad)           → pick a choice
 *   · ↑/↓ + Enter/E/Space        → keyboard choice selection
 *   · mouse click / hover        → pick / select a choice
 * The integrator must NOT additionally wire input actions to
 * DialogSystem.advance()/choose() — pickChoice() is idempotent and
 * advance() is debounced, so even accidental double-wiring is safe.
 */
import type { IDialogUi, SpeakerId } from '@/core/types';
import type { EventBus } from '@/core/events';

const CHARS_PER_SECOND = 35;
const BLIP_EVERY_N_CHARS = 3;

/** Extra hooks beyond the frozen IDialogUi contract. */
export interface DialogUiExtras {
  /** DialogSystem registers its advance() here; keys/clicks call it. */
  setRequestAdvance(fn: (() => void) | null): void;
  /** Speaker id for the ink portrait ('none' hides the portrait). */
  setSpeakerId(id: SpeakerId): void;
}

export type DialogUiHandle = IDialogUi & DialogUiExtras;

/** What DialogSystem needs: the contract plus optional extras. */
export type DialogUiPort = IDialogUi & Partial<DialogUiExtras>;

const CHOICE_DIGIT_CODES: Readonly<Record<string, number>> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Numpad1: 0,
  Numpad2: 1,
  Numpad3: 2,
  Numpad4: 3,
};

const ADVANCE_CODES = new Set(['KeyE', 'Space', 'Enter', 'NumpadEnter']);

/** Ink portrait silhouettes, authored as inline SVG paths (vector only). */
const PORTRAIT_SVG: Readonly<Record<Exclude<SpeakerId, 'none'>, string>> = {
  // Mizumi — girl silhouette with fox ears (the mask never quite leaves her).
  mizumi: `
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="ke-portrait-ink" d="M14 14 L10 3 L19 9 Z"/>
      <path class="ke-portrait-ink" d="M34 14 L38 3 L29 9 Z"/>
      <circle class="ke-portrait-ink" cx="24" cy="19" r="10"/>
      <path class="ke-portrait-ink" d="M24 28 C15 28 10 34 9 45 L39 45 C38 34 33 28 24 28 Z"/>
      <path class="ke-portrait-accent" d="M14 17 C14 10 18 7 24 7 C30 7 34 10 34 17 C30 13 27 12 24 12 C21 12 18 13 14 17 Z"/>
    </svg>`,
  // Yanagi — veiled woman cradling a small bundle.
  yanagi: `
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path class="ke-portrait-ink" d="M24 4 C31 4 35 9 35 16 C35 20 34 23 32 25 L36 45 L12 45 L16 25 C14 23 13 20 13 16 C13 9 17 4 24 4 Z"/>
      <path class="ke-portrait-accent" d="M13 15 C13 8 17 5 24 5 C31 5 35 8 35 15 C35 11 30 9 24 9 C18 9 13 11 13 15 Z"/>
      <ellipse class="ke-portrait-paper" cx="24" cy="33" rx="7" ry="5"/>
      <circle class="ke-portrait-ink" cx="24" cy="31.5" r="2.6"/>
    </svg>`,
};

export function createDialogUi(layer: HTMLElement, bus: EventBus): DialogUiHandle {
  layer.classList.add('ke-dialog');
  layer.innerHTML = `
    <div class="ke-dialog-panel">
      <div class="ke-portrait" style="display:none"></div>
      <div class="ke-dialog-body">
        <div class="ke-dialog-speaker"></div>
        <div class="ke-dialog-text"></div>
        <ul class="ke-choices" style="display:none"></ul>
        <div class="ke-dialog-advance"><span class="ke-advance-glyph">▼</span> E</div>
      </div>
    </div>
  `;

  const panelEl = layer.querySelector<HTMLElement>('.ke-dialog-panel')!;
  const portraitEl = layer.querySelector<HTMLElement>('.ke-portrait')!;
  const speakerEl = layer.querySelector<HTMLElement>('.ke-dialog-speaker')!;
  const textEl = layer.querySelector<HTMLElement>('.ke-dialog-text')!;
  const choicesEl = layer.querySelector<HTMLUListElement>('.ke-choices')!;
  const advanceEl = layer.querySelector<HTMLElement>('.ke-dialog-advance')!;

  let open = false;
  let fullText = '';
  let shownChars = 0;
  let typingTimer: number | null = null;
  let onLineComplete: (() => void) | undefined;
  let currentOnPick: ((index: number) => void) | null = null;
  let choiceCount = 0;
  let selectedChoice = 0;
  let choiceButtons: HTMLButtonElement[] = [];
  let requestAdvance: (() => void) | null = null;

  // ── typewriter ──

  function stopTyping(): void {
    if (typingTimer !== null) {
      clearInterval(typingTimer);
      typingTimer = null;
    }
  }

  function finishLine(): void {
    stopTyping();
    shownChars = fullText.length;
    textEl.textContent = fullText;
    advanceEl.classList.add('is-visible');
    const done = onLineComplete;
    onLineComplete = undefined;
    done?.();
  }

  // ── choice selection (keyboard ↑/↓ highlight) ──

  function setSelected(index: number): void {
    if (choiceCount === 0) return;
    selectedChoice = ((index % choiceCount) + choiceCount) % choiceCount;
    choiceButtons.forEach((btn, i) => btn.classList.toggle('is-selected', i === selectedChoice));
  }

  // ── input: the panel owns dialog keys while open ──

  function onKeyDown(e: KeyboardEvent): void {
    if (!open) return;
    if (currentOnPick) {
      const digit = CHOICE_DIGIT_CODES[e.code];
      if (digit !== undefined) {
        e.preventDefault();
        api.pickChoice(digit);
        return;
      }
      if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
        e.preventDefault();
        setSelected(selectedChoice - 1);
        return;
      }
      if (e.code === 'ArrowDown' || e.code === 'ArrowRight') {
        e.preventDefault();
        setSelected(selectedChoice + 1);
        return;
      }
      if (ADVANCE_CODES.has(e.code)) {
        e.preventDefault();
        api.pickChoice(selectedChoice);
        return;
      }
      return;
    }
    if (ADVANCE_CODES.has(e.code)) {
      e.preventDefault();
      requestAdvance?.();
    }
  }

  function onPanelClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.ke-choice')) return; // buttons handle it
    if (currentOnPick) return; // choices need an explicit pick
    requestAdvance?.();
  }

  panelEl.addEventListener('click', onPanelClick);

  const api: DialogUiHandle = {
    open(): void {
      if (open) return;
      open = true;
      layer.classList.add('is-open');
      window.addEventListener('keydown', onKeyDown);
    },
    close(): void {
      if (!open) {
        layer.classList.remove('is-open');
        return;
      }
      open = false;
      stopTyping();
      fullText = '';
      shownChars = 0;
      onLineComplete = undefined;
      textEl.textContent = '';
      speakerEl.textContent = '';
      portraitEl.style.display = 'none';
      this.clearChoices();
      advanceEl.classList.remove('is-visible');
      layer.classList.remove('is-open');
      window.removeEventListener('keydown', onKeyDown);
    },
    isOpen(): boolean {
      return open;
    },
    setSpeaker(label: string | null): void {
      speakerEl.textContent = label ?? '';
      speakerEl.style.display = label ? '' : 'none';
      speakerEl.classList.toggle('is-mizumi', label !== null && /mizumi/i.test(label));
    },
    setSpeakerId(id: SpeakerId): void {
      if (id === 'none') {
        portraitEl.style.display = 'none';
        portraitEl.innerHTML = '';
        return;
      }
      portraitEl.style.display = '';
      portraitEl.innerHTML = PORTRAIT_SVG[id];
      portraitEl.classList.toggle('is-mizumi', id === 'mizumi');
      portraitEl.classList.toggle('is-yanagi', id === 'yanagi');
    },
    showLine(text: string, onComplete?: () => void): void {
      stopTyping();
      this.clearChoices();
      advanceEl.classList.remove('is-visible');
      fullText = text;
      shownChars = 0;
      textEl.textContent = '';
      onLineComplete = onComplete;
      if (text.length === 0) {
        finishLine();
        return;
      }
      typingTimer = window.setInterval(() => {
        shownChars += 1;
        textEl.textContent = fullText.slice(0, shownChars);
        const glyph = fullText[shownChars - 1];
        if (shownChars % BLIP_EVERY_N_CHARS === 0 && glyph !== ' ') {
          bus.emit('DialogBlip');
        }
        if (shownChars >= fullText.length) finishLine();
      }, 1000 / CHARS_PER_SECOND);
    },
    isTyping(): boolean {
      return typingTimer !== null;
    },
    completeLine(): void {
      if (typingTimer !== null) finishLine();
    },
    showChoices(texts: string[], onPick: (index: number) => void): void {
      currentOnPick = onPick;
      choiceCount = texts.length;
      choiceButtons = [];
      choicesEl.innerHTML = '';
      texts.forEach((text, i) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ke-choice';
        const num = document.createElement('span');
        num.className = 'ke-choice-num';
        num.textContent = `${i + 1}`;
        button.appendChild(num);
        const label = document.createElement('span');
        label.className = 'ke-choice-label';
        label.textContent = text;
        button.appendChild(label);
        button.addEventListener('click', () => this.pickChoice(i));
        button.addEventListener('mouseenter', () => setSelected(i));
        li.appendChild(button);
        choicesEl.appendChild(li);
        choiceButtons.push(button);
      });
      choicesEl.style.display = '';
      advanceEl.classList.remove('is-visible');
      setSelected(0);
    },
    clearChoices(): void {
      currentOnPick = null;
      choiceCount = 0;
      selectedChoice = 0;
      choiceButtons = [];
      choicesEl.innerHTML = '';
      choicesEl.style.display = 'none';
    },
    pickChoice(index: number): void {
      if (!currentOnPick || index < 0 || index >= choiceCount) return;
      const pick = currentOnPick;
      this.clearChoices();
      pick(index);
    },
    setRequestAdvance(fn: (() => void) | null): void {
      requestAdvance = fn;
    },
  };

  return api;
}
