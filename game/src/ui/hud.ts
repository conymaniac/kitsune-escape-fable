/**
 * HUD — IHud implementation (M0 functional, visually plain).
 * Quest banner top-left, interact prompt + hint bottom-center, form
 * indicator bottom-left, mute/lang hints top-right. Keys are stored and
 * re-resolved on locale change. Stream E (M4) restyles (brush-stroke
 * banner reveal, SVG form glyphs) behind this exact surface.
 */
import type { IHud, KitsuneForm } from '@/core/types';
import { onLocaleChange, t } from '@/i18n';

export function createHud(layer: HTMLElement): IHud {
  layer.classList.add('ke-hud');
  layer.innerHTML = `
    <div class="ke-banner" style="display:none">
      <div class="ke-banner-title"></div>
      <div class="ke-banner-hint"></div>
    </div>
    <div class="ke-prompt" style="display:none">
      <span class="ke-key">E</span><span class="ke-prompt-text"></span>
    </div>
    <div class="ke-hint" style="display:none"></div>
    <div class="ke-form"></div>
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

    formEl.textContent = t(form === 'fox' ? 'hud.form.fox' : 'hud.form.human');
    formEl.classList.toggle('is-fox', form === 'fox');

    cornerHints.textContent = t('hud.hints');
    mutedTag.textContent = t('hud.muted');
  }

  onLocaleChange(render);
  render();

  return {
    setObjective(titleKey: string | null, hk: string | null = null): void {
      objectiveTitleKey = titleKey;
      objectiveHintKey = hk;
      render();
    },
    setPrompt(key: string | null, blocked = false): void {
      promptKey = key;
      promptBlocked = blocked;
      render();
    },
    setForm(next: KitsuneForm): void {
      form = next;
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
