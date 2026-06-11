/**
 * Screens — IScreens implementation (M0 functional, plain).
 * Title (over the live diorama, locale select, press-any-key), Intro
 * (6 narration beats), Ending (medallion + prose), Pause, the DOM
 * ink-fade layer and the washi paper overlay. Stream E (M4) restyles
 * behind this exact surface.
 */
import type { IScreens, Locale } from '@/core/types';
import type { EventBus } from '@/core/events';
import { getLocale, onLocaleChange, setLocale, t } from '@/i18n';

const INTRO_BEAT_KEYS = ['intro.1', 'intro.2', 'intro.3', 'intro.4', 'intro.5', 'intro.6'];
const ENDING_LINE_KEYS = [
  'end.1',
  'end.2',
  'end.3',
  'end.4',
  'end.5',
  'end.6',
  'end.7',
  'end.8',
  'end.9',
  'end.10',
];
const INTRO_AUTO_ADVANCE_SEC = 6;

const CONTROL_KEYS = [
  'controls.move',
  'controls.interact',
  'controls.transform',
  'controls.bound',
  'controls.brace',
  'controls.choices',
  'controls.language',
  'controls.mute',
  'controls.pause',
];

export function createScreens(
  screensLayer: HTMLElement,
  fadeLayer: HTMLElement,
  paperLayer: HTMLElement,
  bus: EventBus,
): IScreens {
  // ── layer scaffolding ──
  const titleEl = document.createElement('div');
  titleEl.className = 'ke-screen ke-screen-title';
  const introEl = document.createElement('div');
  introEl.className = 'ke-screen ke-screen-intro';
  const endingEl = document.createElement('div');
  endingEl.className = 'ke-screen ke-screen-ending';
  const pauseEl = document.createElement('div');
  pauseEl.className = 'ke-screen ke-screen-pause';
  screensLayer.append(titleEl, introEl, endingEl, pauseEl);

  fadeLayer.classList.add('ke-fade');
  paperLayer.classList.add('ke-paper');

  // ── shared helpers ──
  function langButtons(onPick?: () => void): HTMLElement {
    const row = document.createElement('div');
    row.className = 'ke-lang-row';
    const label = document.createElement('span');
    label.className = 'ke-lang-label';
    label.textContent = t('ui.menu.language');
    row.appendChild(label);
    (['en', 'cs'] as Locale[]).forEach((locale) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ke-btn';
      btn.classList.toggle('is-active', getLocale() === locale);
      btn.textContent = t(locale === 'en' ? 'ui.lang.en' : 'ui.lang.cs');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setLocale(locale);
        onPick?.();
      });
      row.appendChild(btn);
    });
    return row;
  }

  function controlsList(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'ke-controls-list';
    const title = document.createElement('div');
    title.className = 'ke-controls-title';
    title.textContent = t('controls.title');
    wrap.appendChild(title);
    for (const key of CONTROL_KEYS) {
      const line = document.createElement('div');
      line.textContent = t(key);
      wrap.appendChild(line);
    }
    return wrap;
  }

  // ── title ──
  let titleOpen = false;
  let titleOnStart: (() => void) | null = null;

  function renderTitle(): void {
    titleEl.innerHTML = '';
    const main = document.createElement('h1');
    main.className = 'ke-title-main';
    main.textContent = t('ui.title');
    const sub = document.createElement('div');
    sub.className = 'ke-title-sub';
    sub.textContent = t('ui.subtitle');
    const press = document.createElement('div');
    press.className = 'ke-press-key';
    press.textContent = t('ui.pressAnyKey');
    titleEl.append(main, sub, press, langButtons(renderTitle), controlsList());
  }

  function onTitleKey(e: KeyboardEvent): void {
    // L stays a live locale toggle on the title screen.
    if (e.code === 'KeyL') {
      setLocale(getLocale() === 'en' ? 'cs' : 'en');
      renderTitle();
      return;
    }
    fireTitleStart();
  }
  function onTitleClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.ke-btn')) return;
    fireTitleStart();
  }
  function fireTitleStart(): void {
    const cb = titleOnStart;
    closeTitle();
    cb?.();
  }
  function closeTitle(): void {
    if (!titleOpen) return;
    titleOpen = false;
    titleOnStart = null;
    titleEl.classList.remove('is-open');
    window.removeEventListener('keydown', onTitleKey);
    titleEl.removeEventListener('click', onTitleClick);
  }

  // ── intro ──
  let introOpen = false;
  let introBeat = 0;
  let introOnDone: (() => void) | null = null;
  let introTimer: number | null = null;

  function renderIntroBeat(): void {
    introEl.innerHTML = '';
    const beat = document.createElement('div');
    beat.className = 'ke-intro-beat';
    beat.textContent = t(INTRO_BEAT_KEYS[introBeat] ?? '');
    const advance = document.createElement('div');
    advance.className = 'ke-intro-advance';
    advance.textContent = `${introBeat + 1} / ${INTRO_BEAT_KEYS.length} · ${t('ui.pressAnyKey')}`;
    const skip = document.createElement('div');
    skip.className = 'ke-intro-skip';
    skip.textContent = t('ui.intro.skip');
    introEl.append(beat, advance, skip);
    if (introTimer !== null) clearTimeout(introTimer);
    introTimer = window.setTimeout(advanceIntro, INTRO_AUTO_ADVANCE_SEC * 1000);
  }
  function advanceIntro(): void {
    if (!introOpen) return;
    introBeat += 1;
    if (introBeat >= INTRO_BEAT_KEYS.length) {
      finishIntro();
    } else {
      renderIntroBeat();
    }
  }
  function finishIntro(): void {
    const cb = introOnDone;
    closeIntro();
    cb?.();
  }
  function onIntroKey(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      finishIntro(); // M0: Esc skips immediately (hold-to-skip is M4 polish)
      return;
    }
    advanceIntro();
  }
  function closeIntro(): void {
    if (!introOpen) return;
    introOpen = false;
    introOnDone = null;
    if (introTimer !== null) {
      clearTimeout(introTimer);
      introTimer = null;
    }
    introEl.classList.remove('is-open');
    window.removeEventListener('keydown', onIntroKey);
    introEl.removeEventListener('click', advanceIntro);
  }

  // ── ending ──
  let endingOpen = false;
  let endingOnRestart: (() => void) | null = null;
  let endingOnTitle: (() => void) | null = null;

  function renderEnding(): void {
    endingEl.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'ke-ending-scroll';

    const card = document.createElement('div');
    card.className = 'ke-medallion-card';
    const award = document.createElement('div');
    award.className = 'ke-medallion-award';
    award.textContent = t('medallion.award');
    const name = document.createElement('div');
    name.className = 'ke-medallion-name';
    name.textContent = t('medallion.title');
    const lore = document.createElement('div');
    lore.className = 'ke-medallion-lore';
    lore.textContent = t('medallion.lore');
    card.append(award, name, lore);
    scroll.appendChild(card);

    for (const key of ENDING_LINE_KEYS) {
      const line = document.createElement('div');
      line.className = 'ke-ending-line';
      line.textContent = t(key);
      scroll.appendChild(line);
    }

    const hint = document.createElement('div');
    hint.className = 'ke-ending-hint';
    hint.textContent = t('ui.ending.restartHint');
    scroll.appendChild(hint);
    endingEl.appendChild(scroll);
  }
  function onEndingKey(e: KeyboardEvent): void {
    if (e.code === 'KeyR') {
      const cb = endingOnRestart;
      closeEnding();
      cb?.();
    } else if (e.code === 'Escape') {
      const cb = endingOnTitle;
      closeEnding();
      cb?.();
    }
  }
  function closeEnding(): void {
    if (!endingOpen) return;
    endingOpen = false;
    endingOnRestart = null;
    endingOnTitle = null;
    endingEl.classList.remove('is-open');
    window.removeEventListener('keydown', onEndingKey);
  }

  // ── pause ──
  let pauseOpen = false;
  let pauseOnResume: (() => void) | null = null;
  let pauseOnRestart: (() => void) | null = null;

  function renderPause(): void {
    pauseEl.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'ke-pause-panel';
    const title = document.createElement('h2');
    title.className = 'ke-pause-title';
    title.textContent = t('ui.pause.title');
    panel.appendChild(title);

    const resumeRow = document.createElement('div');
    resumeRow.className = 'ke-pause-row';
    const resumeBtn = document.createElement('button');
    resumeBtn.type = 'button';
    resumeBtn.className = 'ke-btn';
    resumeBtn.textContent = t('ui.pause.resume');
    resumeBtn.addEventListener('click', () => {
      const cb = pauseOnResume;
      closePause();
      cb?.();
    });
    resumeRow.appendChild(resumeBtn);

    const restartRow = document.createElement('div');
    restartRow.className = 'ke-pause-row';
    const restartBtn = document.createElement('button');
    restartBtn.type = 'button';
    restartBtn.className = 'ke-btn';
    restartBtn.textContent = t('ui.pause.restart');
    restartBtn.addEventListener('click', () => {
      const cb = pauseOnRestart;
      closePause();
      cb?.();
    });
    restartRow.appendChild(restartBtn);

    panel.append(resumeRow, restartRow, langButtons(renderPause));
    pauseEl.appendChild(panel);
  }
  function onPauseKey(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      const cb = pauseOnResume;
      closePause();
      cb?.();
    }
  }
  function closePause(): void {
    if (!pauseOpen) return;
    pauseOpen = false;
    pauseOnResume = null;
    pauseOnRestart = null;
    pauseEl.classList.remove('is-open');
    window.removeEventListener('keydown', onPauseKey);
  }

  // ── paper overlay ──
  let paperOpen = false;
  let paperOnClose: (() => void) | null = null;

  function onPaperKey(e: KeyboardEvent): void {
    if (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      doClosePaper();
    }
  }
  function doClosePaper(): void {
    if (!paperOpen) return;
    paperOpen = false;
    paperLayer.classList.remove('is-open');
    window.removeEventListener('keydown', onPaperKey);
    paperLayer.removeEventListener('click', doClosePaper);
    bus.emit('PaperOverlayClosed');
    const cb = paperOnClose;
    paperOnClose = null;
    cb?.();
  }

  // Re-render open screens when the locale flips.
  onLocaleChange(() => {
    if (titleOpen) renderTitle();
    if (introOpen) renderIntroBeat();
    if (endingOpen) renderEnding();
    if (pauseOpen) renderPause();
  });

  return {
    showTitle(onStart: () => void): void {
      titleOnStart = onStart;
      if (!titleOpen) {
        titleOpen = true;
        renderTitle();
        titleEl.classList.add('is-open');
        // Delay so the gesture that opened the title doesn't also start it.
        setTimeout(() => {
          if (!titleOpen) return;
          window.addEventListener('keydown', onTitleKey);
          titleEl.addEventListener('click', onTitleClick);
        }, 50);
      }
    },
    hideTitle(): void {
      closeTitle();
    },
    showIntro(onDone: () => void): void {
      introOnDone = onDone;
      if (!introOpen) {
        introOpen = true;
        introBeat = 0;
        renderIntroBeat();
        introEl.classList.add('is-open');
        setTimeout(() => {
          if (!introOpen) return;
          window.addEventListener('keydown', onIntroKey);
          introEl.addEventListener('click', advanceIntro);
        }, 50);
      }
    },
    hideIntro(): void {
      closeIntro();
    },
    showEnding(onRestart: () => void, onTitle: () => void): void {
      endingOnRestart = onRestart;
      endingOnTitle = onTitle;
      if (!endingOpen) {
        endingOpen = true;
        renderEnding();
        endingEl.classList.add('is-open');
        window.addEventListener('keydown', onEndingKey);
      }
    },
    hideEnding(): void {
      closeEnding();
    },
    showPause(onResume: () => void, onRestart: () => void): void {
      pauseOnResume = onResume;
      pauseOnRestart = onRestart;
      if (!pauseOpen) {
        pauseOpen = true;
        renderPause();
        pauseEl.classList.add('is-open');
        setTimeout(() => {
          if (!pauseOpen) return;
          window.addEventListener('keydown', onPauseKey);
        }, 50);
      }
    },
    hidePause(): void {
      closePause();
    },
    isPauseOpen(): boolean {
      return pauseOpen;
    },
    fadeToBlack(seconds = 0.3): Promise<void> {
      fadeLayer.style.transitionDuration = `${seconds}s`;
      fadeLayer.classList.add('is-black');
      return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    },
    fadeFromBlack(seconds = 0.3): Promise<void> {
      fadeLayer.style.transitionDuration = `${seconds}s`;
      fadeLayer.classList.remove('is-black');
      return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    },
    showPaper(titleText: string, lines: string[], onClose?: () => void): void {
      paperOnClose = onClose ?? null;
      paperLayer.innerHTML = '';
      const sheet = document.createElement('div');
      sheet.className = 'ke-paper-sheet';
      const title = document.createElement('div');
      title.className = 'ke-paper-title';
      title.textContent = titleText;
      sheet.appendChild(title);
      for (const line of lines) {
        const p = document.createElement('div');
        p.className = 'ke-paper-line';
        p.textContent = line;
        sheet.appendChild(p);
      }
      const close = document.createElement('div');
      close.className = 'ke-paper-close';
      close.textContent = t('paper.closeHint');
      sheet.appendChild(close);
      paperLayer.appendChild(sheet);

      if (!paperOpen) {
        paperOpen = true;
        paperLayer.classList.add('is-open');
        bus.emit('PaperOverlayOpened');
        setTimeout(() => {
          if (!paperOpen) return;
          window.addEventListener('keydown', onPaperKey);
          paperLayer.addEventListener('click', doClosePaper);
        }, 50);
      }
    },
    closePaper(): void {
      doClosePaper();
    },
    isPaperOpen(): boolean {
      return paperOpen;
    },
  };
}
