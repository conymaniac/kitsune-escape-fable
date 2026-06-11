/**
 * HUD — IHud implementation (M1, Stream E).
 *
 * Quest banner top-left (brush-stroke reveal re-triggers on every
 * objective change, then settles dimmer when stale), interact prompt
 * bottom-center ([E] key glyph + localized verb; blocked = crossed-out
 * paw SVG re-teaching F), form indicator bottom-left (two inline-SVG
 * glyphs: fox head / girl silhouette), mute + language hints top-right.
 * All keys are stored and re-resolved on locale change.
 */
import type { IHud, KitsuneForm } from '@/core/types';
import { onLocaleChange, t } from '@/i18n';

/** Fox head glyph — ears, cheeks, snout (authored vector path). */
const FOX_SVG = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="ke-glyph-fill" d="M3.4 2.6 L8.2 6.4 L12 5.7 L15.8 6.4 L20.6 2.6 L19.4 10.2 L12 21.4 L4.6 10.2 Z"/>
    <circle class="ke-glyph-dot" cx="8.9" cy="10.4" r="0.95"/>
    <circle class="ke-glyph-dot" cx="15.1" cy="10.4" r="0.95"/>
    <path class="ke-glyph-dot" d="M12 14.2 L13.2 15.6 L12 16.7 L10.8 15.6 Z"/>
  </svg>`;

/** Girl silhouette glyph — bobbed hair, shoulders (authored vector path). */
const GIRL_SVG = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="ke-glyph-fill" d="M12 2.2 C15.4 2.2 17.6 4.6 17.6 8 C17.6 9.5 17.2 10.9 16.4 11.9 C16.9 12.6 17.2 13.2 17.2 13.2 L15 13.4 C14.2 14 13.1 14.4 12 14.4 C10.9 14.4 9.8 14 9 13.4 L6.8 13.2 C6.8 13.2 7.1 12.6 7.6 11.9 C6.8 10.9 6.4 9.5 6.4 8 C6.4 4.6 8.6 2.2 12 2.2 Z"/>
    <path class="ke-glyph-fill" d="M5.4 21.8 C5.8 17.6 8.4 15.4 12 15.4 C15.6 15.4 18.2 17.6 18.6 21.8 Z"/>
  </svg>`;

/** Crossed-out paw — shown instead of [E] when the form can't act. */
const PAW_BLOCKED_SVG = `
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse class="ke-glyph-fill" cx="12" cy="15.4" rx="4.6" ry="3.8"/>
    <ellipse class="ke-glyph-fill" cx="5.6" cy="10.6" rx="1.9" ry="2.5"/>
    <ellipse class="ke-glyph-fill" cx="9.9" cy="7.4" rx="1.9" ry="2.6"/>
    <ellipse class="ke-glyph-fill" cx="14.1" cy="7.4" rx="1.9" ry="2.6"/>
    <ellipse class="ke-glyph-fill" cx="18.4" cy="10.6" rx="1.9" ry="2.5"/>
    <line class="ke-glyph-cross" x1="3" y1="21" x2="21" y2="3"/>
  </svg>`;

export function createHud(layer: HTMLElement): IHud {
  layer.classList.add('ke-hud');
  layer.innerHTML = `
    <div class="ke-banner" style="display:none">
      <div class="ke-banner-stroke"></div>
      <div class="ke-banner-text">
        <div class="ke-banner-title"></div>
        <div class="ke-banner-hint"></div>
      </div>
    </div>
    <div class="ke-prompt" style="display:none">
      <span class="ke-key">E</span>
      <span class="ke-paw">${PAW_BLOCKED_SVG}</span>
      <span class="ke-prompt-text"></span>
    </div>
    <div class="ke-hint" style="display:none"></div>
    <div class="ke-form">
      <span class="ke-form-glyph ke-form-girl">${GIRL_SVG}</span>
      <span class="ke-form-glyph ke-form-fox">${FOX_SVG}</span>
      <span class="ke-form-label"></span>
    </div>
    <div class="ke-corner">
      <div class="ke-corner-hints"></div>
      <div class="ke-muted-tag"></div>
    </div>
  `;

  const banner = layer.querySelector<HTMLElement>('.ke-banner')!;
  const bannerTitle = layer.querySelector<HTMLElement>('.ke-banner-title')!;
  const bannerHint = layer.querySelector<HTMLElement>('.ke-banner-hint')!;
  const prompt = layer.querySelector<HTMLElement>('.ke-prompt')!;
  const promptText = layer.querySelector<HTMLElement>('.ke-prompt-text')!;
  const hint = layer.querySelector<HTMLElement>('.ke-hint')!;
  const formEl = layer.querySelector<HTMLElement>('.ke-form')!;
  const formLabel = layer.querySelector<HTMLElement>('.ke-form-label')!;
  const corner = layer.querySelector<HTMLElement>('.ke-corner')!;
  const cornerHints = layer.querySelector<HTMLElement>('.ke-corner-hints')!;
  const mutedTag = layer.querySelector<HTMLElement>('.ke-muted-tag')!;

  let objectiveTitleKey: string | null = null;
  let objectiveHintKey: string | null = null;
  let promptKey: string | null = null;
  let promptBlocked = false;
  let hintKey: string | null = null;
  let form: KitsuneForm = 'human';

  function render(): void {
    banner.style.display = objectiveTitleKey ? '' : 'none';
    bannerTitle.textContent = objectiveTitleKey ? t(objectiveTitleKey) : '';
    bannerHint.textContent = objectiveHintKey ? t(objectiveHintKey) : '';
    bannerHint.style.display = objectiveHintKey ? '' : 'none';

    prompt.style.display = promptKey ? '' : 'none';
    promptText.textContent = promptKey ? t(promptKey) : '';
    prompt.classList.toggle('is-blocked', promptBlocked);

    hint.style.display = hintKey ? '' : 'none';
    hint.textContent = hintKey ? t(hintKey) : '';

    formLabel.textContent = t(form === 'fox' ? 'hud.form.fox' : 'hud.form.human');
    formEl.classList.toggle('is-fox', form === 'fox');

    cornerHints.textContent = t('hud.hints');
    mutedTag.textContent = t('hud.muted');
  }

  /** Re-trigger the brush-stroke reveal animation (objective changes). */
  function playBannerReveal(): void {
    banner.classList.remove('ke-reveal');
    void banner.offsetWidth; // force reflow so the animation restarts
    banner.classList.add('ke-reveal');
  }

  onLocaleChange(render);
  render();

  return {
    setObjective(titleKey: string | null, hk: string | null = null): void {
      const changed = titleKey !== objectiveTitleKey || hk !== objectiveHintKey;
      objectiveTitleKey = titleKey;
      objectiveHintKey = hk;
      render();
      if (changed && titleKey) playBannerReveal();
    },
    setPrompt(key: string | null, blocked = false): void {
      promptKey = key;
      promptBlocked = blocked;
      render();
    },
    setForm(next: KitsuneForm): void {
      if (next !== form) {
        form = next;
        // Tiny pop on the indicator so the switch reads in the corner too.
        formEl.classList.remove('ke-pop');
        void formEl.offsetWidth;
        formEl.classList.add('ke-pop');
      }
      render();
    },
    setHint(key: string | null): void {
      hintKey = key;
      render();
    },
    setMuted(muted: boolean): void {
      corner.classList.toggle('is-muted', muted);
    },
    setVisible(visible: boolean): void {
      layer.classList.toggle('is-visible', visible);
    },
  };
}
