/**
 * Composition root (M1, STREAM D) — builds renderer/camera/worlds/
 * characters/gameplay systems/UI, wires the GameDirector and starts the
 * loop. Update order per TECH_SPEC §5:
 *   input → wind → player → triggers → interactions → characters/world
 *   anims → wisps/vfx → camera → audio tick → render.
 *
 * Quest scripting is NOT here: a follow-up agent ships
 * gameplay/questScript.ts. Everything marked DEV-PROVISIONAL below exists
 * only so the greybox world is testable and WILL be replaced by it.
 */
import * as THREE from 'three';
import { EventBus } from '@/core/events';
import { FlagStore } from '@/core/flags';
import { GameLoop } from '@/core/loop';
import { Input } from '@/core/input';
import { GameDirector } from '@/core/director';
import { palette } from '@/style/palette';
import { createMaterialKit } from '@/style/materials';
import { createAudio } from '@/audio/engine';
import { createUiRoot } from '@/ui/uiRoot';
import { createHud } from '@/ui/hud';
import { createDialogUi } from '@/ui/dialogUi';
import { createScreens } from '@/ui/screens';
import { onLocaleChange, setLocale, getLocale } from '@/i18n';
import { DialogSystem } from '@/dialog/dialogSystem';
import { QuestSystem } from '@/dialog/questSystem';
import { DialogRoot } from '@/data/dialogs';
import { buildExterior } from '@/world/exterior';
import { buildInterior } from '@/world/interior';
import { PlayerAvatar } from '@/characters/playerAvatar';
import { VfxSystem } from '@/characters/vfx';
import { Yanagi } from '@/characters/yanagi';
import { Renderer } from '@/engine/renderer';
import { IsoCamera } from '@/engine/camera';
import { PlayerController } from '@/gameplay/player';
import { InteractionSystem } from '@/gameplay/interactions';
import { TriggerSystem } from '@/gameplay/triggers';
import { SceneDirector } from '@/gameplay/sceneDirector';
import { WindSystem } from '@/gameplay/wind';
import type { ColliderShape, MotionState } from '@/core/types';

// ─────────────────────────────────────────────────────────── kernel ──
const bus = new EventBus();
const flagStore = new FlagStore();
const loop = new GameLoop();
const input = new Input();
const director = new GameDirector(bus);
const audio = createAudio(bus);
const kit = createMaterialKit();

// ───────────────────────────────────────────────────────────── ui ──
const ui = createUiRoot();
const hud = createHud(ui.hud);
const dialogUi = createDialogUi(ui.dialog, bus);
const screens = createScreens(ui.screens, ui.fade, ui.paper, bus);
dialogUi.close();

onLocaleChange((locale) => bus.emit('LocaleChanged', locale));

const dialogSystem = new DialogSystem({
  ui: dialogUi,
  bus,
  getFlags: () => flagStore.flags,
  setDialogActive: (active) => {
    director.dialogActive = active;
  },
});
const questSystem = new QuestSystem({ bus, hud, getFlags: () => flagStore.flags });
void questSystem; // subscribes on construction; questScript drives the steps

// ─────────────────────────────────────────────── renderer + camera ──
const canvas = document.getElementById('app-canvas') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
renderer.setClearColor(palette.nightDeep);
const isoCam = new IsoCamera(renderer.aspect);
renderer.onResize((aspect) => isoCam.resize(aspect));

// ─────────────────────────────────────── worlds (built once at boot) ──
const exterior = buildExterior(kit);
const interior = buildInterior(kit);

const exteriorScene = new THREE.Scene();
exteriorScene.fog = new THREE.Fog(palette.nightDeep, 40, 120);
exteriorScene.add(exterior.group);

const interiorScene = new THREE.Scene();
interiorScene.add(interior.group); // carries its own placeholder lights

// Exterior light rig (placeholder until stream A's lighting.ts — spec §7):
// moon key w/ ONE 1024² shadow map on a tight 40×40 frustum that follows
// the player, hemisphere fill, warm no-shadow rim.
exteriorScene.add(new THREE.HemisphereLight(palette.nightHorizon, 0x1a1228, 0.6));
const moon = new THREE.DirectionalLight(palette.moonlight, 1.2);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -20;
moon.shadow.camera.right = 20;
moon.shadow.camera.top = 20;
moon.shadow.camera.bottom = -20;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 90;
moon.shadow.bias = -0.002;
exteriorScene.add(moon, moon.target);
const rim = new THREE.DirectionalLight(palette.lanternAmber, 0.35);
rim.position.set(18, 8, 22);
exteriorScene.add(rim);

/** Mark meshes for the shadow pass (transparent mats never cast). */
function enableShadows(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as THREE.Material | THREE.Material[];
    const transparent = Array.isArray(material)
      ? material.some((m) => m.transparent)
      : material.transparent;
    mesh.receiveShadow = true;
    mesh.castShadow = !transparent;
  });
}
enableShadows(exterior.group);
enableShadows(interior.group);

// ──────────────────────────────────────────────────── characters ──
const avatar = new PlayerAvatar(kit, 'human');
enableShadows(avatar.root);
const vfx = new VfxSystem(kit);

// The ghost waits at the Cursed Willow all night (questScript owns her
// beats — dissolve, standAndBow; placement itself is final).
const yanagi = new Yanagi(kit);
yanagi.root.position.copy(exterior.anchors.ghostSpot);
yanagi.setHeading(-Math.PI / 2.6); // facing the promontory approach
exteriorScene.add(yanagi.root);
const yanagiMotion: MotionState = { speed: 0, heading: 0, grounded: true };

// ──────────────────────────────────────────────── gameplay systems ──
const wind = new WindSystem(bus, 0xf0c5);
wind.setLashZones(exterior.lashZones);

const player: PlayerController = new PlayerController({
  avatar,
  input,
  bus,
  director,
  getWind: () => wind.state,
  isOutdoors: () => sceneDir.active === 'exterior',
  getSurface: () => (sceneDir.active === 'interior' ? 'wood' : 'grass'),
  onDust: (pos) => vfx.dustPoof(pos),
});
player.setWindShadows(exterior.windShadows);
wind.setPlayer(player);

// Bound may cross the creek-narrows water collider [B1] — B-world ships
// it untagged, so pick it by its FINAL data (aabb x -10..-6, z 4..6 — see
// BUILD_STATE M1 B-world note). M2/B-world may replace this with a tag.
const boundPassable = new Set<ColliderShape>();
for (const c of exterior.colliders) {
  if (c.kind === 'aabb' && c.minX === -10 && c.minZ === 4 && c.maxX === -6 && c.maxZ === 6) {
    boundPassable.add(c);
  }
}
player.setBoundPassable(boundPassable);

const sceneDir: SceneDirector = new SceneDirector({
  bus,
  screens,
  camera: isoCam,
  player,
  travellers: [avatar.root, vfx.root],
  wind,
  exterior: {
    scene: exteriorScene,
    colliders: exterior.colliders, // LIVE array (gate splices in place)
    bounds: { minX: -40, minZ: -32, maxX: 40, maxZ: 32 },
  },
  interior: {
    scene: interiorScene,
    colliders: interior.colliders,
    bounds: { minX: -5.4, minZ: -4.4, maxX: 5.4, maxZ: 4.4 }, // locks centre
  },
});

const interactions = new InteractionSystem({
  hud,
  bus,
  input,
  getPlayerPos: () => player.pos,
  getPlayerFacing: () => player.facing,
  getForm: () => player.form,
  canInteract: () =>
    director.canPlayerAct() &&
    !player.isKnockedDown() &&
    !player.isBounding() &&
    !player.isSwapping() &&
    !sceneDir.isSwapping() &&
    !screens.isPaperOpen(),
});

const triggers = new TriggerSystem({
  getPlayerPos: () => player.pos,
  getForm: () => player.form,
  isActive: () => director.canPlayerAct() && !sceneDir.isSwapping(),
});

// ───────────────────────────────── transform-burst hook (DESIGN §2) ──
let timeDipRemaining = 0;
const TIME_DIP_SEC = 0.1;
const TIME_DIP_SCALE = 0.85;

avatar.onSwapVisual = (phase, worldPos, toForm) => {
  if (phase === 'anticipation') {
    player.lockControls(0.2); // 0.2 s input lock over the burst
  } else if (phase === 'burst') {
    vfx.transformBurst(worldPos);
    audio.playSfx('transform');
    timeDipRemaining = TIME_DIP_SEC; // loop timescale 0.85 for 0.1 s
    isoCam.punch(0.02, 0.22); // 2 % camera punch-zoom
    hud.setForm(toForm);
  }
};

// ───────────────────────────────────────────────── event wiring ──
bus.on('FormChanged', (form) => {
  flagStore.flags.currentForm = form;
});
bus.on('Knockdown', () => {
  hud.setHint('hint.wiggleFree');
  isoCam.shake(0.25, 0.4);
  audio.playSfx('knockdown');
});
bus.on('KnockdownRecovered', () => hud.setHint(null));
bus.on('Footstep', (surface) =>
  audio.playSfx(surface === 'wood' ? 'footstepWood' : 'footstepGrass'),
);
bus.on('DialogStarted', () => audio.duck(true));
bus.on('DialogEnded', () => {
  audio.duck(false);
  // The E that closed the dialog must not leak into interactions and
  // instantly restart the same dialog (E-ui note).
  input.clearPressed();
});
bus.on('PaperOverlayClosed', () => input.clearPressed()); // Esc leak guard
bus.on('PhaseChanged', () => input.clearPressed()); // intro→play Esc leak
bus.on('EnterInterior', () => audio.setMusicState('interior'));
bus.on('ExitInterior', () => audio.setMusicState('exterior'));
bus.on('DialogBlip', () => audio.playSfx('dialogBlip'));

// Brace coaching while a lash catches the human outside (DEV-level juice;
// questScript owns the real tutorial beats).
bus.on('GustStart', (phase) => {
  if (phase === 'lash' && player.form === 'human' && sceneDir.active === 'exterior') {
    hud.setHint('hint.brace');
  }
});
bus.on('GustEnd', () => {
  if (!player.isKnockedDown()) hud.setHint(null);
});

// Self-talk bubble projector: track the player's head on screen.
const headTmp = new THREE.Vector3();
const headPt = { x: 0, y: 0 };
screens.setProjector(() => {
  if (director.phase !== 'play') return null;
  headTmp.copy(player.pos);
  headTmp.y = player.form === 'fox' ? 0.85 : 1.55;
  return isoCam.projectToScreen(headTmp, headPt);
});

// ────────────────────────────────────────── DEV-PROVISIONAL content ──
// Everything in this block is throwaway scaffolding so the world is
// testable WITHOUT gameplay/questScript.ts. The quest-script agent
// REPLACES every registration below (ids prefixed `dev-`).
{
  // DEV-PROVISIONAL (questScript replaces): farm gate opens on E (human).
  let devGateOpen = false;
  interactions.register({
    id: 'dev-gate',
    position: exterior.anchors.gate,
    radius: 1.8,
    promptKey: 'prompt.open',
    humanOnly: true,
    enabled: () => sceneDir.active === 'exterior' && !devGateOpen,
    onInteract: () => {
      devGateOpen = true;
      exterior.setGateOpen(true);
      audio.playSfx('interact');
    },
  });

  // DEV-PROVISIONAL (questScript replaces): cottage door is blocked.
  interactions.register({
    id: 'dev-door-exterior',
    position: exterior.anchors.door,
    radius: 1.5,
    promptKey: 'prompt.open',
    humanOnly: true,
    enabled: () => sceneDir.active === 'exterior',
    onInteract: () => screens.showBubble('dlg.m.doorBlocked'),
  });

  // DEV-PROVISIONAL (questScript replaces): fox window leap → interior.
  interactions.register({
    id: 'dev-window-leap',
    position: exterior.anchors.window,
    radius: 1.2,
    promptKey: 'prompt.explore',
    foxOnly: true,
    enabled: () => sceneDir.active === 'exterior',
    onInteract: () => {
      audio.playSfx('windowLeap');
      void sceneDir.enterInterior(interior.anchors.windowLanding);
    },
  });

  // DEV-PROVISIONAL (questScript replaces): interior exits — sliding door
  // and sandals both walk out to the exterior door anchor; the interior
  // window leaps back beside the crates.
  interactions.register({
    id: 'dev-int-door',
    position: interior.anchors.door,
    radius: 1.3,
    promptKey: 'prompt.open',
    humanOnly: true,
    enabled: () => sceneDir.active === 'interior',
    onInteract: () => {
      interior.setDoorOpen(true);
      void sceneDir.exitToExterior(exterior.anchors.door);
    },
  });
  interactions.register({
    id: 'dev-int-sandals',
    position: interior.anchors.sandals,
    radius: 1.1,
    promptKey: 'prompt.remove',
    humanOnly: true,
    enabled: () => sceneDir.active === 'interior',
    onInteract: () => {
      interior.setDoorOpen(true);
      void sceneDir.exitToExterior(exterior.anchors.door);
    },
  });
  interactions.register({
    id: 'dev-int-window',
    position: interior.anchors.windowLanding,
    radius: 1.2,
    promptKey: 'prompt.explore',
    foxOnly: true,
    enabled: () => sceneDir.active === 'interior',
    onInteract: () => {
      audio.playSfx('windowLeap');
      void sceneDir.exitToExterior(exterior.anchors.window);
    },
  });

  // DEV-PROVISIONAL (questScript replaces): the ghost. Ambient whisper at
  // 15 m (canon beat), full Dialog 1 tree on E — exercises the dialog
  // runner end-to-end (G1 grants the quest via the authored hooks).
  const ghostHead = exterior.anchors.ghostSpot.clone().setY(1.5);
  const ghostPt = { x: 0, y: 0 };
  triggers.register({
    id: 'dev-ambient',
    position: exterior.anchors.ghostSpot,
    radius: 15,
    once: true,
    onEnter: () => {
      isoCam.projectToScreen(ghostHead, ghostPt);
      screens.showWhisper('dlg.ambient.yanagi', ghostPt, {
        violet: player.form === 'fox',
      });
      flagStore.flags.ambientHeard = true;
    },
  });
  interactions.register({
    id: 'dev-ghost',
    position: exterior.anchors.ghostSpot,
    radius: 2.6,
    promptKey: 'prompt.talk',
    enabled: () => sceneDir.active === 'exterior' && !flagStore.flags.questCompleted,
    onInteract: () => dialogSystem.start(DialogRoot.main),
  });
}

// ──────────────────────────────────────────────────── loop wiring ──
const dioramaTarget = new THREE.Vector3();
let elapsed = 0;

loop.add((rawDt) => {
  // Transform time-dip: scale gameplay dt, never the UI/renderer.
  const dt = timeDipRemaining > 0 ? rawDt * TIME_DIP_SCALE : rawDt;
  timeDipRemaining = Math.max(0, timeDipRemaining - rawDt);
  elapsed += dt;

  // input: global keys (dialog/pause/paper own theirs — E-ui note)
  if (input.justPressed('lang')) setLocale(getLocale() === 'en' ? 'cs' : 'en');
  if (input.justPressed('mute')) hud.setMuted(audio.toggleMute());
  if (
    input.justPressed('pause') &&
    director.phase === 'play' &&
    !director.dialogActive && // dialog input is owned by dialogUi
    !screens.isPaperOpen() &&
    !screens.isPauseOpen()
  ) {
    loop.setPaused(true);
    screens.showPause(
      () => {
        // The Esc that resumed us already sits in Input.pressed — drop it
        // or the next frame instantly re-opens pause.
        input.clearPressed();
        loop.setPaused(false);
      },
      () => window.location.reload(), // restart fallback (full reload)
    );
  }

  // wind → player → triggers → interactions
  wind.update(dt);
  player.update(dt);
  triggers.update();
  interactions.update();

  // characters/world anims (active scene only)
  if (sceneDir.active === 'exterior') {
    exterior.update(dt, wind.state);
    yanagi.setWindSway(wind.state.strength);
    yanagi.update(dt, yanagiMotion);
    // Moon shadow frustum follows the player along the playable spine.
    moon.position.set(player.pos.x - 12, 24, player.pos.z - 8);
    moon.target.position.copy(player.pos);
  }
  vfx.update(dt);

  // camera: diorama drift on title/intro, follow in play
  if (director.phase === 'title' || director.phase === 'intro') {
    dioramaTarget.set(
      exterior.anchors.willow.x + Math.sin(elapsed * 0.07) * 5,
      0,
      exterior.anchors.willow.z + Math.cos(elapsed * 0.07) * 3.5,
    );
    isoCam.update(dt, dioramaTarget, null);
  } else {
    isoCam.update(dt, player.pos, player.velocity);
  }

  // audio tick
  audio.update(dt, wind.state.strength);
}, 0);

loop.add(() => renderer.render(sceneDir.activeScene, isoCam.camera), 100, true);
loop.add(() => input.lateUpdate(), 1000, true);

// ─────────────────────────────── boot flow: title → intro → play ──
void input.anyGesture.then(() => audio.init());
hud.setMuted(audio.isMuted());

player.teleport(exterior.anchors.spawn);
player.setFormInstant('human'); // mask not owned yet; F enabled for DEV
hud.setForm('human');

function startGame(): void {
  director.setPhase('intro');
  audio.playSfx('uiConfirm');
  screens.showIntro(() => {
    void screens.fadeToBlack(0.3).then(() => {
      director.setPhase('play');
      hud.setVisible(true);
      hud.setHint('hint.move');
      isoCam.snapTo(player.pos);
      audio.setMusicState('exterior');
      void screens.fadeFromBlack(0.5);
    });
  });
}

director.setPhase('title');
audio.setMusicState('title');
screens.showTitle(startGame);
loop.start();

// Quest-script handoff (unused here, constructed for it): dialogSystem,
// questSystem, triggers, interactions, sceneDir, wind, flagStore, vfx.
void dialogSystem;

// DEV-only debug handle for scripted browser verification (stripped from
// production builds by the `import.meta.env.DEV` guard).
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__kitsune = {
    player,
    sceneDir,
    wind,
    director,
    isoCam,
    getFlags: () => flagStore.flags,
  };
}
