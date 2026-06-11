/**
 * Dialog panel — IDialogUi implementation (M0 functional, plain).
 * Typewriter 35 chars/s with throttled DialogBlip events, speaker label,
 * numbered choice list (1–4 / click). Stream E (M4) adds ink portraits
 * and styling behind this exact surface.
 */
import type { IDialogUi } from '@/core/types';
import type { EventBus } from '@/core/events';

const CHARS_PER_SECOND = 35;
const BLIP_EVERY_N_CHARS = 3;

export function createDialogUi(layer: HTMLElement, bus: EventBus): IDialogUi {
  layer.classList.add('ke-dialog');
  layer.innerHTML = `
    <div class="ke-dialog-panel">
      <div class="ke-dialog-speaker"></div>
      <div class="ke-dialog-text"></div>
      <ul class="ke-choices" style="display:none"></ul>
      <div class="ke-dialog-advance">▼ E</div>
    </div>
  `;

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

  return {
    open(): void {
      open = true;
      layer.classList.add('is-open');
    },
    close(): void {
      open = false;
      stopTyping();
      fullText = '';
      shownChars = 0;
      textEl.textContent = '';
      speakerEl.textContent = '';
      this.clearChoices();
      advanceEl.classList.remove('is-visible');
      layer.classList.remove('is-open');
    },
    isOpen(): boolean {
      return open;
    },
    setSpeaker(label: string | null): void {
      speakerEl.textContent = label ?? '';
      speakerEl.classList.toggle('is-mizumi', label !== null && /mizumi/i.test(label));
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
      choicesEl.innerHTML = '';
      texts.forEach((text, i) => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ke-choice';
        const num = document.createElement('span');
        num.className = 'ke-choice-num';
        num.textContent = `${i + 1}.`;
        button.appendChild(num);
        button.appendChild(document.createTextNode(text));
        button.addEventListener('click', () => this.pickChoice(i));
        li.appendChild(button);
        choicesEl.appendChild(li);
      });
      choicesEl.style.display = '';
      advanceEl.classList.remove('is-visible');
    },
    clearChoices(): void {
      currentOnPick = null;
      choiceCount = 0;
      choicesEl.innerHTML = '';
      choicesEl.style.display = 'none';
    },
    pickChoice(index: number): void {
      if (!currentOnPick || index < 0 || index >= choiceCount) return;
      const pick = currentOnPick;
      this.clearChoices();
      pick(index);
    },
  };
}
