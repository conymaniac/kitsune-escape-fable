/**
 * Screens — IScreens implementation (M1, Stream E; M4-P2 presentation).
 *
 * M4-P2 GRADE WIRING (style-side, no main.ts changes): screens owns the
 * cinematic moments, so it drives style/postfx's setGlobalGrade():
 *   · GhostDissolved arms the reveal → the NEXT paper overlay (the body
 *     text, by quest order) tweens the world to the 'inkReveal' grade
 *     (DESIGN §5 — desaturate to ink-and-bone except the violet kimono)
 *   · showEnding eases 'inkReveal' → 'dawn' over the still-lake shot
 *   · pause dims/desaturates the frozen world ('pauseDim' ↔ 'normal')
 * M4-P2 also: intro hold-Esc-1s skip (DESIGN §6), ember petals, ending
 * medallion ink-stamp slam + vermillion bloom (juice #16) + prose pacing
 * over the live lake, pause volume hook (setAudioHooks extra).
 *
 * Title (calligraphy DOM over the live 3D diorama — transparent vignette
 * backdrop; EN/ČESKY select; press-any-key), Intro (6 ink-wash narration
 * beats, any-key advance + auto 6 s, Esc skip), Ending (medallion coin
 * SVG card + sequential prose lines; R restart / Esc title), Pause
 * (resume / restart / language / volume placeholder), the DOM ink-fade
 * layer (promise API used by sceneDirector) and the washi paper overlay
 * (line-by-line ink reveal, close on E/Esc).
 *
 * Extras beyond the frozen IScreens contract (ScreensHandle):
 *   showWhisper(textKey, screenAnchor?, opts?)  DESIGN §5 channel 1
 *   showBubble(textKey, durationSec?)           DESIGN §5 channel 2
 *   setProjector(fn)                            integrator hook: () =>
 *     normalized screen point of the player's head (0..1, origin
 *     top-left) or null; when set, self-talk bubbles track it each frame.
 *     Without a projector, bubbles sit fixed near bottom-center (M1 ok).
 */
import type { IScreens, Locale } from '@/core/types';
import type { EventBus } from '@/core/events';
import { setGlobalGrade } from '@/style/postfx';
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
const INTRO_SKIP_HOLD_MS = 1000; // hold Esc 1 s to skip (DESIGN §6)
const INTRO_EMBERS = 7; // drifting ember petals per beat panel
const ENDING_STAMP_DELAY_MS = 700; // medallion ink-stamp lands first…
const ENDING_FIRST_LINE_MS = 2400; // …then the prose starts…
const ENDING_LINE_INTERVAL_SEC = 2.6; // …pacing slowly over the lake

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

// ── extras surface ──

/** Normalized screen point: 0..1 in both axes, origin top-left. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** Returns the player's head as a normalized screen point, or null. */
export type ScreensProjector = () => ScreenPoint | null;

export interface WhisperOptions {
  durationSec?: number;
  /** Shimmer violet — heard via fox spirit sense (DESIGN §5). */
  violet?: boolean;
}

export interface ScreensAudioHooks {
  /** Pause volume slider target (AudioHandle.setMasterVolume). */
  setMasterVolume?: (volume01: number) => void;
}

export interface ScreensExtras {
  /** Channel 1: floating bone-white ambient text. No input, no pause. */
  showWhisper(textKey: string, screenAnchor?: ScreenPoint, opts?: WhisperOptions): void;
  /** Channel 2: Mizumi self-talk brush bubble. Fades after durationSec. */
  showBubble(textKey: string, durationSec?: number): void;
  /** Integrator hook — world-space projection for the self-talk bubble. */
  setProjector(fn: ScreensProjector | null): void;
  /** M4 integrator hook — wires the pause volume slider to the audio. */
  setAudioHooks(hooks: ScreensAudioHooks): void;
}

export type ScreensHandle = IScreens & ScreensExtras;

// ── inline SVG art (vector authored in code — asset-purity safe) ──

/** The Yanagi onna medallion: coin + ring + fox emblem + willow strokes. */
const MEDALLION_SVG = `
  <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle class="ke-coin-face" cx="60" cy="60" r="54"/>
    <circle class="ke-coin-rim" cx="60" cy="60" r="54"/>
    <circle class="ke-coin-ring" cx="60" cy="60" r="44"/>
    <path class="ke-coin-willow" d="M22 38 C30 52 28 70 24 84" />
    <path class="ke-coin-willow" d="M98 38 C90 52 92 70 96 84" />
    <path class="ke-coin-emblem" d="M38 40 L52 50 L60 48 L68 50 L82 40 L79 59 L60 86 L41 59 Z"/>
    <circle class="ke-coin-eye" cx="52.5" cy="58" r="2.4"/>
    <circle class="ke-coin-eye" cx="67.5" cy="58" r="2.4"/>
  </svg>`;

/** Open ensō brush circle behind the title calligraphy. */
const ENSO_SVG = `
  <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="ke-enso-stroke" d="M118 22 A82 82 0 1 0 160 49"/>
  </svg>`;

export function createScreens(
  screensLayer: HTMLElement,
  fadeLayer: HTMLElement,
  paperLayer: HTMLElement,
  bus: EventBus,
): ScreensHandle {
  // ── layer scaffolding ──
  const titleEl = document.createElement('div');
  titleEl.className = 'ke-screen ke-screen-title';
  const introEl = document.createElement('div');
  introEl.className = 'ke-screen ke-screen-intro';
  const endingEl = document.createElement('div');
  endingEl.className = 'ke-screen ke-screen-ending';
  const pauseEl = document.createElement('div');
  pauseEl.className = 'ke-screen ke-screen-pause';
  // Float layer (whispers + bubbles) renders above the screens.
  const floatEl = document.createElement('div');
  floatEl.className = 'ke-float';
  screensLayer.append(titleEl, introEl, endingEl, pauseEl, floatEl);

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
    const art = document.createElement('div');
    art.className = 'ke-title-art';
    art.innerHTML = ENSO_SVG;

    const main = document.createElement('h1');
    main.className = 'ke-title-main';
    main.textContent = t('ui.title');
    const stroke = document.createElement('div');
    stroke.className = 'ke-title-stroke';
    const sub = document.createElement('div');
    sub.className = 'ke-title-sub';
    sub.textContent = t('ui.subtitle');
    const press = document.createElement('div');
    press.className = 'ke-press-key';
    press.textContent = t('ui.pressAnyKey');
    art.append(main);
    titleEl.append(art, stroke, sub, press, langButtons(renderTitle), controlsList());
  }

  function onTitleKey(e: KeyboardEvent): void {
    // L toggles locale, M toggles mute — both are handled by the global
    // input loop (main.ts); the title only swallows them so they don't
    // count as "press any key". (Toggling here too would double-flip —
    // found in the M4 browser pass.) renderTitle re-runs via the
    // onLocaleChange hook below.
    if (e.code === 'KeyL' || e.code === 'KeyM') return;
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
  // hold-Esc-1s skip state (DESIGN §6; M0 deviation note resolved here).
  // Interval-driven (not rAF): keeps working under background-tab rAF
  // throttling, and 50 ms steps are smooth enough for a 1 s meter.
  let escHoldStart: number | null = null;
  let escHoldTimer: number | null = null;
  let skipEl: HTMLElement | null = null;

  /** Drifting ember petals over the ink-wash panel (DESIGN §6 intro). */
  function emberField(): HTMLElement {
    const field = document.createElement('div');
    field.className = 'ke-embers';
    for (let i = 0; i < INTRO_EMBERS; i++) {
      const ember = document.createElement('span');
      ember.className = 'ke-ember';
      ember.style.left = `${8 + Math.random() * 84}%`;
      ember.style.animationDelay = `${Math.random() * 5}s`;
      ember.style.animationDuration = `${7 + Math.random() * 6}s`;
      field.appendChild(ember);
    }
    return field;
  }

  function renderIntroBeat(): void {
    introEl.innerHTML = '';
    introEl.appendChild(emberField());
    const panel = document.createElement('div');
    panel.className = 'ke-intro-panel';
    const beat = document.createElement('div');
    beat.className = 'ke-intro-beat';
    beat.textContent = t(INTRO_BEAT_KEYS[introBeat] ?? '');
    panel.appendChild(beat);
    const advance = document.createElement('div');
    advance.className = 'ke-intro-advance';
    advance.textContent = `${introBeat + 1} / ${INTRO_BEAT_KEYS.length} · ${t('ui.pressAnyKey')}`;
    const skip = document.createElement('div');
    skip.className = 'ke-intro-skip';
    skip.innerHTML = `<span class="ke-skip-label"></span><span class="ke-skip-track"><span class="ke-skip-fill"></span></span>`;
    const skipLabel = skip.querySelector<HTMLElement>('.ke-skip-label');
    if (skipLabel) skipLabel.textContent = t('ui.intro.skip');
    skipEl = skip;
    introEl.append(panel, advance, skip);
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
  function cancelEscHold(): void {
    escHoldStart = null;
    if (escHoldTimer !== null) {
      clearInterval(escHoldTimer);
      escHoldTimer = null;
    }
    skipEl?.classList.remove('is-holding');
    skipEl?.style.removeProperty('--ke-skip');
  }
  function tickEscHold(): void {
    if (!introOpen || escHoldStart === null) {
      cancelEscHold();
      return;
    }
    const held = performance.now() - escHoldStart;
    const k = Math.min(held / INTRO_SKIP_HOLD_MS, 1);
    // re-assert every tick: the auto-advance re-render mints a new skipEl
    skipEl?.classList.add('is-holding');
    skipEl?.style.setProperty('--ke-skip', String(k));
    if (k >= 1) {
      cancelEscHold();
      finishIntro();
    }
  }
  function onIntroKey(e: KeyboardEvent): void {
    if (e.code === 'Escape') {
      // Hold Esc 1 s to skip — a tap does nothing but show the meter.
      if (escHoldStart === null && !e.repeat) {
        escHoldStart = performance.now();
        skipEl?.classList.add('is-holding');
        if (escHoldTimer === null) escHoldTimer = window.setInterval(tickEscHold, 50);
      }
      return;
    }
    advanceIntro();
  }
  function onIntroKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Escape') cancelEscHold();
  }
  function closeIntro(): void {
    if (!introOpen) return;
    introOpen = false;
    introOnDone = null;
    cancelEscHold();
    skipEl = null;
    if (introTimer !== null) {
      clearTimeout(introTimer);
      introTimer = null;
    }
    introEl.classList.remove('is-open');
    window.removeEventListener('keydown', onIntroKey);
    window.removeEventListener('keyup', onIntroKeyUp);
    introEl.removeEventListener('click', advanceIntro);
  }

  // ── ending ──
  let endingOpen = false;
  let endingOnRestart: (() => void) | null = null;
  let endingOnTitle: (() => void) | null = null;
  let endingRevealed = 0; // prose lines currently visible (survives re-render)
  let endingStamped = false; // medallion has slammed (survives re-render)
  let endingTimer: number | null = null;
  let endingStampTimer: number | null = null;
  let endingFirstLineTimer: number | null = null;
  let endingLineEls: HTMLElement[] = [];
  let endingCardEl: HTMLElement | null = null;

  function applyEndingReveal(): void {
    endingLineEls.forEach((el, i) => el.classList.toggle('is-shown', i < endingRevealed));
    endingCardEl?.classList.toggle('is-stamped', endingStamped);
  }
  function renderEnding(): void {
    endingEl.innerHTML = '';
    const scroll = document.createElement('div');
    scroll.className = 'ke-ending-scroll';

    // The medallion ceremony (juice #16): the card waits invisible, then
    // SLAMS in like a hanko seal with a vermillion ink bloom behind it.
    const card = document.createElement('div');
    card.className = 'ke-medallion-card';
    const bloom = document.createElement('div');
    bloom.className = 'ke-medallion-bloom';
    const coin = document.createElement('div');
    coin.className = 'ke-medallion-coin';
    coin.innerHTML = MEDALLION_SVG;
    const award = document.createElement('div');
    award.className = 'ke-medallion-award';
    award.textContent = t('medallion.award');
    const name = document.createElement('div');
    name.className = 'ke-medallion-name';
    name.textContent = t('medallion.title');
    const lore = document.createElement('div');
    lore.className = 'ke-medallion-lore';
    lore.textContent = t('medallion.lore');
    card.append(bloom, coin, award, name, lore);
    endingCardEl = card;
    scroll.appendChild(card);

    endingLineEls = [];
    for (const key of ENDING_LINE_KEYS) {
      const line = document.createElement('div');
      line.className = 'ke-ending-line';
      line.textContent = t(key);
      scroll.appendChild(line);
      endingLineEls.push(line);
    }

    const hint = document.createElement('div');
    hint.className = 'ke-ending-hint';
    hint.textContent = t('ui.ending.restartHint');
    scroll.appendChild(hint);
    endingEl.appendChild(scroll);
    applyEndingReveal();
  }
  function revealNextEndingLine(): void {
    if (endingRevealed >= ENDING_LINE_KEYS.length) {
      if (endingTimer !== null) {
        clearInterval(endingTimer);
        endingTimer = null;
      }
      return;
    }
    endingRevealed += 1;
    applyEndingReveal();
    const lastShown = endingLineEls[endingRevealed - 1];
    lastShown?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    } else {
      // Any other key fast-forwards the ceremony + prose reveal.
      endingStamped = true;
      endingRevealed = ENDING_LINE_KEYS.length;
      applyEndingReveal();
    }
  }
  function closeEnding(): void {
    if (!endingOpen) return;
    endingOpen = false;
    endingOnRestart = null;
    endingOnTitle = null;
    endingRevealed = 0;
    endingStamped = false;
    endingLineEls = [];
    endingCardEl = null;
    if (endingTimer !== null) {
      clearInterval(endingTimer);
      endingTimer = null;
    }
    if (endingStampTimer !== null) {
      clearTimeout(endingStampTimer);
      endingStampTimer = null;
    }
    if (endingFirstLineTimer !== null) {
      clearTimeout(endingFirstLineTimer);
      endingFirstLineTimer = null;
    }
    endingEl.classList.remove('is-open');
    window.removeEventListener('keydown', onEndingKey);
  }

  // ── pause ──
  let pauseOpen = false;
  let pauseOnResume: (() => void) | null = null;
  let pauseOnRestart: (() => void) | null = null;
  let pauseVolume = 80;
  let audioHooks: ScreensAudioHooks = {}; // wired via setAudioHooks (M4)

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

    // Volume slider — drives the master bus when the audio hook is wired
    // (setAudioHooks extra; value persists in-session either way).
    const volumeRow = document.createElement('div');
    volumeRow.className = 'ke-pause-row ke-volume-row';
    const volumeLabel = document.createElement('span');
    volumeLabel.className = 'ke-volume-label';
    volumeLabel.textContent = t('ui.pause.sound');
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(pauseVolume);
    slider.className = 'ke-volume-slider';
    slider.addEventListener('input', () => {
      pauseVolume = Number(slider.value);
      audioHooks.setMasterVolume?.(pauseVolume / 100);
    });
    volumeRow.append(volumeLabel, slider);

    panel.append(resumeRow, restartRow, volumeRow, langButtons(renderPause));
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
    // Pause is only reachable during normal play — restore the play grade.
    setGlobalGrade('normal', 0.45);
  }

  // ── paper overlay ──
  let paperOpen = false;
  let paperOnClose: (() => void) | null = null;

  // M4-P2 reveal grade arming (DESIGN §5 "the reveal must land"): after
  // the ghost dissolves, the next paper overlay IS the body reveal — it
  // opens over a held shot, so the world desaturates to ink-and-bone
  // (except the violet kimono) and the overlay backdrop stays see-through.
  let inkRevealArmed = false;
  bus.on('GhostDissolved', () => {
    inkRevealArmed = true;
  });

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

  // ── whispers + self-talk bubble (DESIGN §5 channels 1–2) ──
  let projector: ScreensProjector | null = null;
  const liveWhispers = new Set<{ el: HTMLElement; key: string }>();
  let bubbleEl: HTMLElement | null = null;
  let bubbleKey = '';
  let bubbleTimer: number | null = null;
  let bubbleRaf: number | null = null;

  function positionBubble(): void {
    if (!bubbleEl) return;
    const point = projector?.();
    if (point) {
      bubbleEl.classList.add('is-projected');
      bubbleEl.style.left = `${point.x * 100}%`;
      bubbleEl.style.top = `${point.y * 100}%`;
    } else {
      bubbleEl.classList.remove('is-projected');
      bubbleEl.style.left = '';
      bubbleEl.style.top = '';
    }
  }
  function trackBubble(): void {
    if (!bubbleEl) {
      bubbleRaf = null;
      return;
    }
    positionBubble();
    bubbleRaf = window.requestAnimationFrame(trackBubble);
  }
  function removeBubble(): void {
    if (bubbleTimer !== null) {
      clearTimeout(bubbleTimer);
      bubbleTimer = null;
    }
    if (bubbleRaf !== null) {
      cancelAnimationFrame(bubbleRaf);
      bubbleRaf = null;
    }
    bubbleEl?.remove();
    bubbleEl = null;
    bubbleKey = '';
  }

  // Re-render open screens + live floats when the locale flips.
  onLocaleChange(() => {
    if (titleOpen) renderTitle();
    if (introOpen) renderIntroBeat();
    if (endingOpen) renderEnding();
    if (pauseOpen) renderPause();
    for (const whisper of liveWhispers) whisper.el.textContent = t(whisper.key);
    if (bubbleEl && bubbleKey) {
      const textEl = bubbleEl.querySelector<HTMLElement>('.ke-bubble-text');
      if (textEl) textEl.textContent = t(bubbleKey);
    }
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
          window.addEventListener('keyup', onIntroKeyUp);
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
        endingRevealed = 0;
        endingStamped = false;
        renderEnding();
        endingEl.classList.add('is-open');
        window.addEventListener('keydown', onEndingKey);
        // The world behind eases from the ink reveal into the first
        // grey-blue hint of dawn over the still lake (DESIGN §6).
        setGlobalGrade('dawn', 7);
        // Ceremony pacing: stamp slam → beat → prose, line by line.
        endingStampTimer = window.setTimeout(() => {
          endingStampTimer = null;
          endingStamped = true;
          applyEndingReveal();
        }, ENDING_STAMP_DELAY_MS);
        endingFirstLineTimer = window.setTimeout(() => {
          endingFirstLineTimer = null;
          revealNextEndingLine();
          endingTimer = window.setInterval(
            revealNextEndingLine,
            ENDING_LINE_INTERVAL_SEC * 1000,
          );
        }, ENDING_FIRST_LINE_MS);
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
        // DESIGN §6: the frozen world desaturates behind the scroll.
        // (The render keeps running while paused; only updates freeze.)
        setGlobalGrade('pauseDim', 0.3);
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
      paperLayer.classList.toggle('is-reveal', inkRevealArmed);
      const sheet = document.createElement('div');
      sheet.className = 'ke-paper-sheet';
      const title = document.createElement('div');
      title.className = 'ke-paper-title';
      title.textContent = titleText;
      sheet.appendChild(title);
      lines.forEach((line, i) => {
        const p = document.createElement('div');
        p.className = 'ke-paper-line';
        p.style.animationDelay = `${0.45 + i * 1.05}s`; // line-by-line ink-draw
        p.textContent = line;
        sheet.appendChild(p);
      });
      const close = document.createElement('div');
      close.className = 'ke-paper-close';
      close.style.animationDelay = `${0.7 + lines.length * 1.05}s`;
      close.textContent = t('paper.closeHint');
      sheet.appendChild(close);
      paperLayer.appendChild(sheet);

      if (!paperOpen) {
        paperOpen = true;
        paperLayer.classList.add('is-open');
        bus.emit('PaperOverlayOpened');
        // The body reveal: the world drains to ink under the held shot.
        if (inkRevealArmed) setGlobalGrade('inkReveal', 1.8);
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

    // ── extras ──
    showWhisper(textKey: string, screenAnchor?: ScreenPoint, opts?: WhisperOptions): void {
      const durationSec = opts?.durationSec ?? 6;
      const el = document.createElement('div');
      el.className = 'ke-whisper';
      if (opts?.violet) el.classList.add('is-violet');
      el.textContent = t(textKey);
      const anchor = screenAnchor ?? { x: 0.5, y: 0.3 };
      el.style.left = `${anchor.x * 100}%`;
      el.style.top = `${anchor.y * 100}%`;
      el.style.animationDuration = `${durationSec}s`;
      floatEl.appendChild(el);
      const item = { el, key: textKey };
      liveWhispers.add(item);
      window.setTimeout(() => {
        liveWhispers.delete(item);
        el.remove();
      }, durationSec * 1000);
    },
    showBubble(textKey: string, durationSec = 4): void {
      removeBubble();
      bubbleKey = textKey;
      const el = document.createElement('div');
      el.className = 'ke-bubble';
      el.style.animationDuration = `${durationSec}s`;
      const text = document.createElement('span');
      text.className = 'ke-bubble-text';
      text.textContent = t(textKey);
      const tail = document.createElement('span');
      tail.className = 'ke-bubble-tail';
      el.append(text, tail);
      floatEl.appendChild(el);
      bubbleEl = el;
      positionBubble();
      if (bubbleRaf === null) bubbleRaf = window.requestAnimationFrame(trackBubble);
      bubbleTimer = window.setTimeout(removeBubble, durationSec * 1000);
    },
    setProjector(fn: ScreensProjector | null): void {
      projector = fn;
    },
    setAudioHooks(hooks: ScreensAudioHooks): void {
      audioHooks = hooks;
    },
  };
}
