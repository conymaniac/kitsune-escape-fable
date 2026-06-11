/**
 * QuestScript — THE glue (TECH_SPEC §1 gameplay/questScript.ts).
 *
 * The entire scripted experience, beginning to end, on top of the generic
 * systems (DESIGN §§1–6, 8; canon order per DESIGN §9 is non-negotiable):
 *
 *  TUTORIAL (DESIGN §8)
 *   · move glyph at spawn (fades on first input)
 *   · mask shrine: 3 s scripted beat — burst VFX, hasMask, FORCED first
 *     transform to fox ("the mask happens to her"), whisper, unlock.
 *     F stays dormant until hasMask (gated in main.ts).
 *   · creek Bound-glyph whisper (fox near the gap) · farm gate (human E;
 *     crossed-paw + F-glyph hint while prompted as fox)
 *   · scripted first gust past the gate (wind.triggerGustNow())
 *
 *  QUEST (six objectives, strictly in order — questProgress 0..7)
 *   1 ghost: ambient whisper r 15 → auto Dialog 1 r 3 (Z1/Z2 refusal
 *     re-offers on re-approach) → G1 starts the quest (data hooks)
 *   2 cottage door blocked → bubble + step 1 done
 *   3 fox window leap (scripted arc, scene swap mid-arc) → step 2 done
 *   4 interior: table/futon(+shutter-slam scare)/papers(diary overlay)/
 *     drawer→dagger Take (step 3 done)/sandals Explore→Remove→door —
 *     both exits work (sandals path + window leap-out)
 *   5 return zone → auto Dialog 6 → step 4 done (data hook) + storm
 *     escalation setCalmRange(8, 10)
 *   6 three branch cuts (human + dagger, calm/telegraph only) → Dialog 7
 *     → step 5 done (data hook) → THE SEQUENCE: stand+bow → dissolve +
 *     smoke → wind.stopForever() → 2 s held quiet → kitsunebi marker at
 *     the body mound → body Explore → paper overlay → step 6 done →
 *     QuestCompleted (QuestSystem) → medallion + ending screen.
 *
 *  CONNECTIVE TISSUE: 2 guide kitsunebi drift toward the current
 *  objective; yanagi.fear whisper when bracing beside her in a lash
 *  post-step-5; suzu bell on quest ticks.
 *
 * Restart = full window.location.reload() (BUILD_STATE M1 D-core note):
 * wind.stopForever() and the cut branch meshes (removed + materials
 * disposed by vfx.branchFallFade) are one-way, so an in-memory reset is
 * riskier than a reload in an asset-free app that boots instantly.
 */
import * as THREE from 'three';
import type { GameFlags, IAudio, IHud } from '@/core/types';
import type { MaterialKit } from '@/core/types';
import type { EventBus } from '@/core/events';
import type { GameDirector } from '@/core/director';
import type { Input } from '@/core/input';
import type { IsoCamera } from '@/engine/camera';
import type { PlayerController } from '@/gameplay/player';
import type { InteractionSystem } from '@/gameplay/interactions';
import type { TriggerSystem } from '@/gameplay/triggers';
import type { SceneDirector } from '@/gameplay/sceneDirector';
import type { WindSystem } from '@/gameplay/wind';
import type { DialogSystem } from '@/dialog/dialogSystem';
import type { PlayerAvatar } from '@/characters/playerAvatar';
import type { VfxSystem } from '@/characters/vfx';
import type { Yanagi } from '@/characters/yanagi';
import type { ExteriorBuild } from '@/world/exterior';
import type { InteriorBuild } from '@/world/interior';
import type { ScreensHandle } from '@/ui/screens';
import { DialogRoot } from '@/data/dialogs';
import { createWisps, type WispsBuild } from '@/world/props/wisps';
import { t } from '@/i18n';

// ── timings (seconds) ──
const MASK_BURST_AT = 0.4;
const MASK_TRANSFORM_AT = 1.4;
const MASK_WHISPER_AT = 2.2;
const MASK_UNLOCK_AT = 3.0;
const LEAP_SEC = 0.6; // window-leap arc duration
const LEAP_HEIGHT = 1.35;
const LEAP_SWAP_AT = 0.45; // fraction of the arc where the fade-swap fires
const SCARE_DELAY_SEC = 1.5;
const CUT_LOCK_SEC = 0.55;
const DISSOLVE_SEC = 3.0;
const QUIET_HOLD_SEC = 2.0;
const ENDING_HOLD_SEC = 1.5;
const SUPPRESS_CLEAR_DIST = 4.5; // walk this far away to re-offer Dialog 1
const PAPER_GRAVITY = 5.0;

interface Timer {
  t: number;
  fn: () => void;
}

interface LeapState {
  t: number;
  dir: 'in' | 'out';
  swapped: boolean;
}

interface PaperAnim {
  mesh: THREE.Mesh;
  baseY: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  t: number;
}

export interface QuestScriptOptions {
  bus: EventBus;
  director: GameDirector;
  input: Input;
  hud: IHud;
  screens: ScreensHandle;
  dialog: DialogSystem;
  interactions: InteractionSystem;
  triggers: TriggerSystem;
  sceneDir: SceneDirector;
  wind: WindSystem;
  vfx: VfxSystem;
  player: PlayerController;
  avatar: PlayerAvatar;
  isoCam: IsoCamera;
  audio: IAudio;
  kit: MaterialKit;
  exterior: ExteriorBuild;
  interior: InteriorBuild;
  yanagi: Yanagi;
  /** Live flags accessor — restart swaps the flags object. */
  getFlags: () => GameFlags;
}

export class QuestScript {
  private readonly o: QuestScriptOptions;

  // scheduled one-shots, ticked with game dt (freeze with the loop)
  private readonly timers: Timer[] = [];

  // tutorial state
  private moveHintDone = false;
  private gateHintShowing = false;
  private gateOpened = false;

  // beat state
  private maskBeatStarted = false;
  private leap: LeapState | null = null;
  private busyT = 0; // pickup/cut anim lock for re-prompt gating
  private drawerOpened = false;
  private scareArmed = false;
  private scareDone = false;
  private paperAnims: PaperAnim[] = [];

  // dialog auto-trigger suppression (refusal → walk away to re-offer)
  private dlg1Suppressed = false;
  private dlg6Suppressed = false;

  // finale
  private readonly cutBranches = new Set<number>();
  private dissolveT = -1; // <0 idle; 0.. running; done when ghostDissolved
  private dissolvePuffs = 0;
  private fearShownThisGust = false;

  // guide kitsunebi
  private readonly guideHomes: THREE.Vector3[];
  private readonly guideWisps: WispsBuild;
  private readonly markerWisps: WispsBuild;

  // scratch
  private readonly tmp = new THREE.Vector3();
  private readonly tmpPt = { x: 0, y: 0 };

  constructor(options: QuestScriptOptions) {
    this.o = options;

    // ── guide kitsunebi: 2 wisps easing toward the current objective ──
    // (createWisps keeps the homes array live — mutating the vectors
    // retargets the drift; see world/props/wisps.ts)
    this.guideHomes = [new THREE.Vector3(), new THREE.Vector3()];
    this.guideWisps = createWisps(options.kit, this.guideHomes, { drift: 0.55, size: 0.13 });
    this.guideWisps.group.name = 'guide-wisps';
    options.exterior.group.add(this.guideWisps.group);
    const target = this.guideTarget(this.guideTargetTmp);
    if (target) this.applyGuideOffsets(target, 1);

    // single kitsunebi marker at the body mound (lit after the dissolve)
    const markerHome = options.exterior.anchors.bodyMound.clone();
    markerHome.y = 1.0;
    this.markerWisps = createWisps(options.kit, [markerHome], { drift: 0.25, size: 0.2 });
    this.markerWisps.group.name = 'body-marker-wisp';
    this.markerWisps.group.visible = false;
    options.exterior.group.add(this.markerWisps.group);

    this.registerTutorial();
    this.registerGhost();
    this.registerCottage();
    this.registerInterior();
    this.registerFinale();
    this.wireEvents();
  }

  // ─────────────────────────────────────────────────── per-frame ──

  update(dt: number): void {
    // timers tick in play AND cutscene (the loop pause freezes us anyway)
    for (let i = this.timers.length - 1; i >= 0; i -= 1) {
      const timer = this.timers[i];
      if (!timer) continue;
      timer.t -= dt;
      if (timer.t <= 0) {
        this.timers.splice(i, 1);
        timer.fn();
      }
    }

    this.busyT = Math.max(0, this.busyT - dt);

    this.updateLeap(dt);
    this.updatePapers(dt);
    this.updateDissolve(dt);
    this.updateTutorialHints();
    this.updateSuppression();
    this.updateFearWhisper();
    this.updateGuides(dt);
  }

  // ───────────────────────────────────────── tutorial (DESIGN §8) ──

  private registerTutorial(): void {
    const o = this.o;
    const flags = (): GameFlags => o.getFlags();
    const outside = (): boolean => o.sceneDir.active === 'exterior';

    // — mask shrine [A]: the scripted 3 s beat —
    o.interactions.register({
      id: 'q-shrine',
      position: o.exterior.anchors.shrine.clone(),
      radius: 1.7,
      promptKey: 'prompt.explore',
      enabled: () => outside() && !flags().hasMask && !this.maskBeatStarted,
      onInteract: () => this.runMaskBeat(),
    });

    // — creek Bound-glyph whisper (fox only, near the gap [B1]) —
    o.triggers.register({
      id: 'q-creek-hint',
      position: o.exterior.anchors.creekGap.clone(),
      radius: 3,
      once: true,
      form: 'fox',
      enabled: () => outside(),
      onEnter: () => {
        this.tmp.copy(o.exterior.anchors.creekGap);
        this.tmp.y = 0.6;
        o.isoCam.projectToScreen(this.tmp, this.tmpPt);
        o.screens.showWhisper('hint.bound', this.tmpPt, { durationSec: 4 });
      },
    });

    // — farm gate [B2]: human E opens (fox sees the crossed paw) —
    o.interactions.register({
      id: 'q-gate',
      position: o.exterior.anchors.gate.clone(),
      radius: 1.8,
      promptKey: 'prompt.open',
      humanOnly: true,
      enabled: () => outside() && !this.gateOpened,
      onInteract: () => {
        this.gateOpened = true;
        o.exterior.setGateOpen(true);
        o.audio.playSfx('interact');
        if (this.gateHintShowing) {
          o.hud.setHint(null);
          this.gateHintShowing = false;
        }
      },
    });

    // — scripted first gust: first steps into the open field past the
    //   gate fire one immediate telegraph+lash cycle (main's GustStart
    //   handler shows the brace glyph if the human gets staggered) —
    o.triggers.register({
      id: 'q-first-gust',
      position: new THREE.Vector3(-16, 0, -5),
      radius: 6,
      once: true,
      enabled: () => outside() && this.gateOpened,
      onEnter: () => o.wind.triggerGustNow(),
    });
  }

  /** The mask "happens to her": lock, burst, forced fox, whisper, unlock. */
  private runMaskBeat(): void {
    const o = this.o;
    if (this.maskBeatStarted) return;
    this.maskBeatStarted = true;

    o.director.setPhase('cutscene');
    o.bus.emit('CutsceneStart', 'maskShrine');

    const mask = o.exterior.group.getObjectByName('shrine-mask');
    const maskPos = new THREE.Vector3();
    if (mask) mask.getWorldPosition(maskPos);
    else maskPos.copy(o.exterior.anchors.shrine).setY(1.2);

    this.schedule(MASK_BURST_AT, () => {
      o.vfx.transformBurst(maskPos);
      o.audio.playSfx('pickup');
      if (mask) mask.visible = false;
    });
    this.schedule(MASK_TRANSFORM_AT, () => {
      const flags = o.getFlags();
      flags.hasMask = true;
      flags.hasTransformed = false; // the first transform is FORCED on her
      o.avatar.setForm('fox'); // onSwapVisual fires burst/sfx/punch via main
      o.bus.emit('FormChanged', 'fox');
      flags.hasTransformed = true;
    });
    this.schedule(MASK_WHISPER_AT, () => {
      this.tmp.copy(o.player.pos);
      this.tmp.y = 1.3;
      o.isoCam.projectToScreen(this.tmp, this.tmpPt);
      o.screens.showWhisper('whisper.mask', this.tmpPt, { violet: true, durationSec: 5 });
    });
    this.schedule(MASK_UNLOCK_AT, () => {
      o.director.setPhase('play');
      o.bus.emit('CutsceneEnd', 'maskShrine');
    });
  }

  /** Move glyph fades on first input · F-glyph while gate-blocked as fox. */
  private updateTutorialHints(): void {
    const o = this.o;
    if (o.director.phase !== 'play') return;

    if (!this.moveHintDone && o.input.axis().lengthSq() > 0) {
      this.moveHintDone = true;
      o.hud.setHint(null); // the spawn move glyph (set by main at play start)
    }

    // Crossed-paw at the gate → teach F (DESIGN §8, 45–60 s beat).
    const wantGateHint =
      !this.gateOpened &&
      o.interactions.active?.id === 'q-gate' &&
      o.interactions.activeBlocked;
    if (wantGateHint && !this.gateHintShowing) {
      this.gateHintShowing = true;
      o.hud.setHint('hint.transform');
    } else if (!wantGateHint && this.gateHintShowing) {
      this.gateHintShowing = false;
      o.hud.setHint(null);
    }
  }

  // ───────────────────────────── the ghost (Objective start + return) ──

  private registerGhost(): void {
    const o = this.o;
    const flags = (): GameFlags => o.getFlags();
    const outside = (): boolean => o.sceneDir.active === 'exterior';

    // — ambient whisper, canon 15 m (violet when heard via fox sense) —
    o.triggers.register({
      id: 'q-ambient',
      position: o.exterior.anchors.ghostSpot.clone(),
      radius: 15,
      once: true,
      enabled: () => outside() && !flags().ghostDissolved,
      onEnter: () => {
        this.whisperAtGhost('dlg.ambient.yanagi');
        flags().ambientHeard = true; // the faint crying-loop flag (M3 audio)
      },
    });

    // — Dialog 1 auto-start at 3 m; refusal re-offers on re-approach —
    o.triggers.register({
      id: 'q-dialog1',
      position: o.exterior.anchors.ghostSpot.clone(),
      radius: 3,
      enabled: () => outside() && flags().questProgress === 0 && !flags().ghostDissolved,
      onEnter: () => {
        if (!this.dlg1Suppressed) this.offerDialog(DialogRoot.main);
      },
    });

    // — Dialog 6 auto-start: the return zone (step 4, dagger in hand) —
    o.triggers.register({
      id: 'q-dialog6',
      position: o.exterior.anchors.willow.clone(),
      radius: 3.5,
      enabled: () => outside() && flags().questProgress === 4 && flags().hasDagger,
      onEnter: () => {
        if (!this.dlg6Suppressed) this.offerDialog(DialogRoot.returnWithDagger);
      },
    });

    // — manual Talk (re-talk without leaving the radius) —
    o.interactions.register({
      id: 'q-ghost-talk',
      position: o.exterior.anchors.ghostSpot.clone(),
      radius: 2.6,
      promptKey: 'prompt.talk',
      enabled: () =>
        outside() &&
        !flags().ghostDissolved &&
        (flags().questProgress === 0 || flags().questProgress === 4),
      onInteract: () =>
        this.offerDialog(
          flags().questProgress === 4 ? DialogRoot.returnWithDagger : DialogRoot.main,
        ),
    });
  }

  /** Start a dialog tree if nothing else owns the moment. */
  private offerDialog(rootId: string): void {
    const o = this.o;
    if (o.dialog.isActive() || o.director.phase !== 'play') return;
    o.dialog.start(rootId);
  }

  /** Refusals re-offer only after walking away (DESIGN §5 canon exits). */
  private updateSuppression(): void {
    if (!this.dlg1Suppressed && !this.dlg6Suppressed) return;
    const o = this.o;
    const ghost = o.exterior.anchors.ghostSpot;
    const dx = o.player.pos.x - ghost.x;
    const dz = o.player.pos.z - ghost.z;
    if (dx * dx + dz * dz > SUPPRESS_CLEAR_DIST * SUPPRESS_CLEAR_DIST) {
      this.dlg1Suppressed = false;
      this.dlg6Suppressed = false;
    }
  }

  // ─────────────────────────── cottage exterior (steps 1→2, 2→3) ──

  private registerCottage(): void {
    const o = this.o;
    const flags = (): GameFlags => o.getFlags();
    const outside = (): boolean => o.sceneDir.active === 'exterior';

    // — the blocked sliding door (step 1 beat; later the sandals exit) —
    o.interactions.register({
      id: 'q-door',
      position: o.exterior.anchors.door.clone(),
      radius: 1.6,
      promptKey: 'prompt.open',
      humanOnly: true,
      enabled: () => outside(),
      onInteract: () => {
        const f = flags();
        if (f.sandalsRemoved) {
          // Once the sandals are gone the door works both ways.
          o.audio.playSfx('interact');
          void o.sceneDir.enterInterior(o.interior.anchors.doorSpawn);
          return;
        }
        o.audio.playSfx('interact');
        o.screens.showBubble('dlg.m.doorBlocked');
        f.doorBlockedSeen = true;
        if (f.questProgress === 1) this.completeStep(1); // → objective 2
      },
    });

    // — fox window leap in (enabled from step 2; scripted arc) —
    o.interactions.register({
      id: 'q-window',
      position: o.exterior.anchors.window.clone(),
      radius: 1.4,
      promptKey: 'prompt.explore',
      foxOnly: true,
      enabled: () => outside() && flags().questProgress >= 2 && this.leap === null,
      onInteract: () => this.startLeap('in'),
    });
  }

  /** Window leap: input lock → parabola → fade-swap mid-arc (TECH_SPEC §5). */
  private startLeap(dir: 'in' | 'out'): void {
    const o = this.o;
    if (this.leap) return;
    o.player.lockControls(LEAP_SEC + 1.0); // the swap re-locks over the fade
    o.avatar.setAction('leap');
    o.audio.playSfx('windowLeap');
    this.leap = { t: 0, dir, swapped: false };
  }

  private updateLeap(dt: number): void {
    const leap = this.leap;
    if (!leap) return;
    const o = this.o;
    leap.t += dt;
    const k = Math.min(leap.t / LEAP_SEC, 1);

    if (!leap.swapped) {
      // Parabolic visual arc on the avatar root (truth pos stays put;
      // the ink-fade hides the actual travel — DESIGN §4 "fixed arc hop").
      o.avatar.root.position.y = LEAP_HEIGHT * 4 * k * (1 - k);
      if (k >= LEAP_SWAP_AT) {
        leap.swapped = true;
        if (leap.dir === 'in') {
          void o.sceneDir.enterInterior(o.interior.anchors.windowLanding);
        } else {
          void o.sceneDir.exitToExterior(o.exterior.anchors.window);
        }
      }
    } else if (!o.sceneDir.isSwapping()) {
      this.leap = null; // landed (teleport reset the root + action)
    }
  }

  // ────────────────────────────── interior (step 3→4 + optionals) ──

  private registerInterior(): void {
    const o = this.o;
    const flags = (): GameFlags => o.getFlags();
    const inside = (): boolean => o.sceneDir.active === 'interior';

    // — low table (optional Dialog 2) —
    o.interactions.register({
      id: 'q-table',
      position: o.interior.anchors.table.clone(),
      radius: 1.6,
      promptKey: 'prompt.explore',
      enabled: () => inside(),
      onInteract: () => {
        flags().tableSeen = true;
        o.audio.playSfx('interact');
        o.screens.showBubble('dlg.m.table', 5);
      },
    });

    // — futon (optional Dialog 3 → the scripted shutter-slam Dialog 4) —
    o.interactions.register({
      id: 'q-futon',
      position: o.interior.anchors.futon.clone(),
      radius: 1.6,
      promptKey: 'prompt.explore',
      enabled: () => inside(),
      onInteract: () => {
        flags().futonSeen = true;
        o.audio.playSfx('interact');
        o.screens.showBubble('dlg.m.futon', 5);
        if (!this.scareArmed) {
          this.scareArmed = true;
          this.schedule(SCARE_DELAY_SEC, () => this.runScare());
        }
      },
    });

    // — scattered diary papers (READABLE → paper overlay → sad bubble) —
    o.interactions.register({
      id: 'q-papers',
      position: o.interior.anchors.papers.clone(),
      radius: 1.4,
      promptKey: 'prompt.read',
      enabled: () => inside(),
      onInteract: () => {
        o.audio.playSfx('paperRustle');
        o.screens.showPaper(
          t('paper.title'),
          [t('paper.line1'), t('paper.line2'), t('paper.line3'), t('paper.line4')],
          () => {
            flags().paperRead = true;
            o.screens.showBubble('dlg.m.papersAfter', 5);
          },
        );
      },
    });

    // — kitchen drawer (Explore reveals the dagger) —
    o.interactions.register({
      id: 'q-drawer',
      position: o.interior.anchors.drawer.clone(),
      radius: 1.5,
      promptKey: 'prompt.explore',
      enabled: () => inside() && !this.drawerOpened,
      onInteract: () => {
        this.drawerOpened = true;
        o.interior.setDrawerOpen(true);
        o.audio.playSfx('interact');
      },
    });

    // — the dagger (Take, human only — crossed paw re-teaches F) —
    o.interactions.register({
      id: 'q-dagger',
      position: o.interior.anchors.drawer.clone(),
      radius: 1.5,
      promptKey: 'prompt.take',
      humanOnly: true,
      priority: 2,
      enabled: () => inside() && this.drawerOpened && !flags().hasDagger && this.busyT <= 0,
      onInteract: () => {
        const f = flags();
        this.busyT = 0.7;
        o.player.lockControls(0.7);
        o.avatar.setAction('pickup');
        o.audio.playSfx('pickup');
        o.interior.dagger.visible = false;
        f.hasDagger = true;
        o.bus.emit('ItemPickedUp', 'dagger');
        if (f.questProgress === 3) this.completeStep(3); // → objective 4
        o.wind.setCalmRange(9, 12); // storm escalation: the trip back
      },
    });

    // — sandals: Explore (after the dagger, canon order) then Remove —
    o.interactions.register({
      id: 'q-sandals-explore',
      position: o.interior.anchors.sandals.clone(),
      radius: 1.3,
      promptKey: 'prompt.explore',
      enabled: () => inside() && flags().hasDagger && !flags().sandalsExamined,
      onInteract: () => {
        flags().sandalsExamined = true;
        o.audio.playSfx('interact');
        o.screens.showBubble('dlg.m.sandals', 5);
      },
    });
    o.interactions.register({
      id: 'q-sandals-remove',
      position: o.interior.anchors.sandals.clone(),
      radius: 1.3,
      promptKey: 'prompt.remove',
      humanOnly: true,
      enabled: () =>
        inside() && flags().sandalsExamined && !flags().sandalsRemoved && this.busyT <= 0,
      onInteract: () => {
        this.busyT = 0.6;
        o.player.lockControls(0.6);
        o.avatar.setAction('pickup');
        o.audio.playSfx('pickup');
        flags().sandalsRemoved = true;
        o.interior.setDoorOpen(true);
        // Shift the sandals off the door rail so the change reads.
        const sandals = o.interior.group.getObjectByName('sandals');
        if (sandals) {
          sandals.position.x += 0.9;
          sandals.rotation.y = 0.4;
        }
      },
    });

    // — sliding door: blocked until the sandals are gone, then the exit —
    o.interactions.register({
      id: 'q-int-door',
      position: o.interior.anchors.door.clone(),
      radius: 1.3,
      promptKey: 'prompt.open',
      humanOnly: true,
      enabled: () => inside(),
      onInteract: () => {
        o.audio.playSfx('interact');
        if (!flags().sandalsRemoved) {
          o.screens.showBubble('dlg.m.doorBlocked');
          return;
        }
        void o.sceneDir.exitToExterior(o.exterior.anchors.door);
      },
    });

    // — window leap back out (fox, always available) —
    o.interactions.register({
      id: 'q-int-window',
      position: o.interior.anchors.windowLanding.clone(),
      radius: 1.4,
      promptKey: 'prompt.explore',
      foxOnly: true,
      enabled: () => inside() && this.leap === null,
      onInteract: () => this.startLeap('out'),
    });
  }

  /** Dialog 4, the shutter-slam scare (canon: auto after the futon line). */
  private runScare(): void {
    const o = this.o;
    if (this.scareDone) return;
    this.scareDone = true;
    if (o.sceneDir.active !== 'interior') return; // fled before it landed

    o.bus.emit('GustStart', 'lash'); // Gust-ish event for M3 audio (no cycle)
    o.audio.playSfx('paperRustle');
    o.isoCam.shake(0.22, 0.3);
    this.tossPapers();
    o.screens.showBubble('dlg.m.scare1', 1.3);
    this.schedule(1.2, () => o.bus.emit('GustEnd'));
    this.schedule(1.4, () => o.screens.showBubble('dlg.m.scare2', 3.5));
  }

  /** Papers explode upward, tumble and settle (DESIGN §4 interior beat). */
  private tossPapers(): void {
    this.paperAnims = [];
    for (const mesh of this.o.interior.papers) {
      this.paperAnims.push({
        mesh,
        baseY: mesh.position.y,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 1.4 + Math.random() * 1.0,
        vz: (Math.random() - 0.5) * 0.6,
        spin: (Math.random() - 0.5) * 5,
        t: 0,
      });
    }
  }

  private updatePapers(dt: number): void {
    if (this.paperAnims.length === 0) return;
    for (let i = this.paperAnims.length - 1; i >= 0; i -= 1) {
      const p = this.paperAnims[i];
      if (!p) continue;
      p.t += dt;
      const y = p.baseY + p.vy * p.t - 0.5 * PAPER_GRAVITY * p.t * p.t;
      if (y <= p.baseY && p.t > 0.2) {
        p.mesh.position.y = p.baseY; // settled (keeps the drifted XZ)
        this.paperAnims.splice(i, 1);
        continue;
      }
      p.mesh.position.y = y;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.y += p.spin * dt;
    }
  }

  // ────────────────── finale: branch cuts → dissolve → body reveal ──

  private registerFinale(): void {
    const o = this.o;
    const flags = (): GameFlags => o.getFlags();
    const outside = (): boolean => o.sceneDir.active === 'exterior';

    // — 3 cuttable branch clusters (human + dagger, calm/telegraph only;
    //   during lash the willow's sweep covers the promontory — the
    //   existing lash-zone knockdown enforces it physically too) —
    o.exterior.group.updateWorldMatrix(true, true);
    o.exterior.cuttableBranches.forEach((mesh, index) => {
      const at = new THREE.Vector3();
      mesh.getWorldPosition(at);
      at.y = 0;
      o.interactions.register({
        id: `q-branch-${index}`,
        position: at,
        radius: 2.4,
        promptKey: 'prompt.cut',
        humanOnly: true,
        priority: 1,
        enabled: () =>
          outside() &&
          flags().questProgress === 5 &&
          flags().hasDagger &&
          !this.cutBranches.has(index) &&
          o.wind.state.phase !== 'lash' &&
          this.busyT <= 0,
        onInteract: () => this.cutBranch(index, mesh),
      });
    });

    // — the body mound (Objective 6 → quest completion) —
    o.interactions.register({
      id: 'q-body',
      position: o.exterior.anchors.bodyMound.clone(),
      radius: 1.8,
      promptKey: 'prompt.explore',
      enabled: () =>
        outside() && flags().questProgress === 6 && flags().ghostDissolved && !flags().bodyExamined,
      onInteract: () => {
        o.audio.playSfx('paperRustle');
        o.screens.showPaper(t('body.title'), [t('body.text')], () => this.completeQuest());
      },
    });
  }

  private cutBranch(index: number, mesh: THREE.Mesh): void {
    const o = this.o;
    const flags = o.getFlags();
    this.cutBranches.add(index);
    this.busyT = CUT_LOCK_SEC;
    o.player.lockControls(CUT_LOCK_SEC);
    o.avatar.setAction('cut');
    o.audio.playSfx('branchCut');
    o.vfx.branchFallFade(mesh); // removes the mesh ~1.3 s later (C-chars note)

    flags.branchesCut += 1;
    o.bus.emit('BranchCut', 3 - flags.branchesCut);
    o.audio.playSfx('suzuBell');

    if (flags.branchesCut === 1) {
      o.screens.showBubble('cut.1', 3);
    } else if (flags.branchesCut === 2) {
      o.screens.showBubble('cut.2', 3);
    } else {
      // Third cut: she is free — the whips stop mattering; Dialog 7.
      o.wind.setPlayer(null); // no knockdowns during the thanks/dissolve beat
      this.schedule(0.9, () => this.offerDialog(DialogRoot.thanks));
    }
  }

  /** Dialog 7 ended → THE SEQUENCE (DESIGN §5 "the reveal must land"). */
  private beginFinale(): void {
    const o = this.o;
    o.director.setPhase('cutscene');
    o.bus.emit('CutsceneStart', 'dissolve');
    o.yanagi.standAndBow(() => {
      // Rise–bow–rise done (~3.6 s) → unravel into white smoke.
      this.dissolveT = 0;
      this.dissolvePuffs = 0;
      o.audio.playSfx('ghostDissolved');
    });
  }

  private updateDissolve(dt: number): void {
    if (this.dissolveT < 0) return;
    const o = this.o;
    this.dissolveT += dt;
    const k = Math.min(this.dissolveT / DISSOLVE_SEC, 1);
    o.yanagi.setDissolve(k);

    // Smoke puffs at 0 / 1 / 2 s, drawn up from her position.
    if (this.dissolveT > this.dissolvePuffs * 1.0 && this.dissolvePuffs < 3) {
      this.dissolvePuffs += 1;
      this.tmp.copy(o.yanagi.root.position);
      this.tmp.y += 0.7;
      o.vfx.ghostSmokePuffs(this.tmp);
    }

    if (k >= 1) {
      this.dissolveT = -1;
      const flags = o.getFlags();
      flags.ghostDissolved = true;
      o.bus.emit('GhostDissolved');
      o.wind.stopForever(); // emits WindStopped — silence is the payoff
      flags.windStopped = true;
      // 2 s held quiet → one kitsunebi lights at the willow roots →
      // the body interactable arms (enabled() keys off ghostDissolved)
      // → input released (still phase: play).
      this.schedule(QUIET_HOLD_SEC, () => {
        this.markerWisps.group.visible = true;
        o.director.setPhase('play');
        o.bus.emit('CutsceneEnd', 'dissolve');
      });
    }
  }

  /** Body examined → step 6 → QuestCompleted → medallion + ending. */
  private completeQuest(): void {
    const o = this.o;
    const flags = o.getFlags();
    if (flags.bodyExamined) return;
    flags.bodyExamined = true;
    flags.medallionUnlocked = true;
    flags.questProgress = 7;
    o.bus.emit('QuestStepCompleted', 6); // QuestSystem emits QuestCompleted

    o.director.setPhase('cutscene');
    o.bus.emit('CutsceneStart', 'ending');
    this.schedule(ENDING_HOLD_SEC, () => {
      o.director.setPhase('ending');
      o.hud.setVisible(false);
      o.audio.setMusicState('ending');
      // Restart/back-to-title are both a full reload (header note): the
      // boot lands on the title screen with everything factory-fresh.
      o.screens.showEnding(
        () => window.location.reload(),
        () => window.location.reload(),
      );
      o.bus.emit('CutsceneEnd', 'ending');
    });
  }

  // ─────────────────────────────────────────────── event wiring ──

  private wireEvents(): void {
    const o = this.o;

    // Quest ticks ring the suzu bell (juice #7).
    o.bus.on('QuestStarted', () => o.audio.playSfx('suzuBell'));
    o.bus.on('QuestStepCompleted', () => o.audio.playSfx('suzuBell'));

    // First interior entry = Objective 2 done (window leap landed).
    o.bus.on('EnterInterior', () => {
      const flags = o.getFlags();
      if (flags.questProgress === 2) this.completeStep(2); // → objective 3
    });

    o.bus.on('DialogEnded', (nodeId) => {
      const flags = o.getFlags();
      // Z1/Z2 refusal (quest still ungranted): suppress the auto-offer
      // until the player walks away and re-approaches (canon re-offer).
      if (nodeId.startsWith('main.') && flags.questProgress === 0) {
        this.dlg1Suppressed = true;
      }
      // Dialog 6 done (data hook set step 5): escalate the storm.
      if (nodeId === 'return.3') {
        o.wind.setCalmRange(8, 10);
        this.dlg6Suppressed = true; // progress 5 disables the zone anyway
      }
      // Dialog 7 done (data hook set step 6): the dissolve sequence.
      if (nodeId === 'thanks') this.beginFinale();
    });

    // The fear-whisper fires at most once per gust.
    o.bus.on('GustEnd', () => {
      this.fearShownThisGust = false;
    });
  }

  /** Mark quest step `step` done: write the flag, then emit (contract). */
  private completeStep(step: number): void {
    const flags = this.o.getFlags();
    if (flags.questProgress !== step) return;
    flags.questProgress = step + 1;
    this.o.bus.emit('QuestStepCompleted', step);
  }

  // ───────────────────────────────────────── connective tissue ──

  /** Her hushed line when bracing beside her through a lash (DESIGN §3). */
  private updateFearWhisper(): void {
    const o = this.o;
    if (this.fearShownThisGust) return;
    const flags = o.getFlags();
    if (flags.questProgress < 5 || flags.ghostDissolved) return;
    if (o.wind.state.phase !== 'lash' || !o.player.isBracing()) return;
    const ghost = o.exterior.anchors.ghostSpot;
    const dx = o.player.pos.x - ghost.x;
    const dz = o.player.pos.z - ghost.z;
    if (dx * dx + dz * dz > 5 * 5) return;
    this.fearShownThisGust = true;
    this.whisperAtGhost('dlg.y.fear');
  }

  private whisperAtGhost(textKey: string): void {
    const o = this.o;
    this.tmp.copy(o.exterior.anchors.ghostSpot);
    this.tmp.y = 1.6;
    o.isoCam.projectToScreen(this.tmp, this.tmpPt);
    o.screens.showWhisper(textKey, this.tmpPt, {
      violet: o.player.form === 'fox',
      durationSec: 7,
    });
  }

  /** Where the guide kitsunebi should hover for the current objective. */
  private guideTarget(out: THREE.Vector3): THREE.Vector3 | null {
    const o = this.o;
    const flags = o.getFlags();
    const a = o.exterior.anchors;
    switch (flags.questProgress) {
      case 0:
        return out.copy(flags.hasMask ? a.willow : a.shrine);
      case 1:
        return out.copy(a.door);
      case 2:
        return out.copy(a.window);
      case 3:
        return null; // inside the cottage — exterior wisps hide
      case 4:
      case 5:
        return out.copy(a.willow);
      case 6:
        return out.copy(a.bodyMound);
      default:
        return null; // quest done
    }
  }

  private applyGuideOffsets(target: THREE.Vector3, blend: number): void {
    const h0 = this.guideHomes[0];
    const h1 = this.guideHomes[1];
    if (!h0 || !h1) return;
    const k = Math.min(blend, 1);
    const tx = target.x; // capture first — `target` may alias this.tmp
    const tz = target.z;
    h0.lerp(this.tmp.set(tx + 0.9, 1.5, tz + 0.4), k);
    h1.lerp(this.tmp.set(tx - 0.7, 2.1, tz - 0.6), k);
  }

  private readonly guideTargetTmp = new THREE.Vector3();

  private updateGuides(dt: number): void {
    const o = this.o;
    const outside = o.sceneDir.active === 'exterior';
    const target = this.guideTarget(this.guideTargetTmp);
    const phaseOk = o.director.phase === 'play' || o.director.phase === 'cutscene';
    this.guideWisps.group.visible = outside && phaseOk && target !== null;

    if (!outside) return;
    if (target) {
      // Ease the homes toward the objective — the pair visibly drifts
      // ahead of the player instead of teleporting (juice #6-adjacent).
      this.applyGuideOffsets(target, 1 - Math.exp(-dt * 1.1));
    }
    this.guideWisps.update(dt, o.wind.state);
    if (this.markerWisps.group.visible) this.markerWisps.update(dt, o.wind.state);
  }

  // ── internals ──

  private schedule(delaySec: number, fn: () => void): void {
    this.timers.push({ t: delaySec, fn });
  }
}
