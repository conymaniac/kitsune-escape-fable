/**
 * Composition root (M1, STREAM D) — builds renderer/camera/worlds/
 * characters/gameplay systems/UI, wires the GameDirector and starts the
 * loop. Update order per TECH_SPEC §5:
 *   input → wind → player → triggers → interactions → characters/world
 *   anims → wisps/vfx → camera → audio tick → render.
 *
 * Quest scripting lives in gameplay/questScript.ts (constructed + wired
 * below) — main stays a composition root.
 */
import * as THREE from 'three';
import { EventBus } from '@/core/events';
import { FlagStore } from '@/core/flags';
import { GameLoop } from '@/core/loop';
import { Input } from '@/core/input';
import { GameDirector } from '@/core/director';
import { palette } from '@/style/palette';
import { bindWindUniforms, createMaterialKit } from '@/style/materials';
import { makeExteriorRig, makeInteriorRig } from '@/style/lighting';
import { createPostFx } from '@/style/postfx';
import { createAudio } from '@/audio/engine';
import { createUiRoot } from '@/ui/uiRoot';
import { createHud } from '@/ui/hud';
import { createDialogUi } from '@/ui/dialogUi';
import { createScreens } from '@/ui/screens';
import { onLocaleChange, setLocale, getLocale } from '@/i18n';
import { DialogSystem } from '@/dialog/dialogSystem';
import { QuestSystem } from '@/dialog/questSystem';
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
import { QuestScript } from '@/gameplay/questScript';
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
const postfx = createPostFx(renderer.gl);
renderer.onResize((aspect, w, h) => {
  isoCam.resize(aspect);
  postfx.resize(w, h);
});

// ─────────────────────────────────────── worlds (built once at boot) ──
const exterior = buildExterior(kit);
const interior = buildInterior(kit);

const exteriorScene = new THREE.Scene();
exteriorScene.add(exterior.group);

const interiorScene = new THREE.Scene();
interiorScene.add(interior.group);

// Light rigs + fog (style/lighting.ts — spec §7 budgets). The interior
// build still carries B-world's M1 placeholder lights inside its group —
// strip them before the real rig lands (B-world removes them in M2).
const placeholderLights: THREE.Object3D[] = [];
interior.group.traverse((obj) => {
  if ((obj as THREE.Light).isLight) placeholderLights.push(obj);
});
for (const light of placeholderLights) light.removeFromParent();
const extRig = makeExteriorRig(exteriorScene);
const intRig = makeInteriorRig(interiorScene);

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
bindWindUniforms(wind.uniforms); // water/sway/ghost/wisp shader clock

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

// ──────────────────────────────────────────────────── quest script ──
// The entire scripted experience (tutorial → six objectives → reveal →
// ending) — registers every interactable/trigger and owns all beats.
const questScript = new QuestScript({
  bus,
  director,
  input,
  hud,
  screens,
  dialog: dialogSystem,
  interactions,
  triggers,
  sceneDir,
  wind,
  vfx,
  player,
  avatar,
  isoCam,
  audio,
  kit,
  exterior,
  interior,
  yanagi,
  getFlags: () => flagStore.flags,
});

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

  // F is dormant until the mask-shrine beat grants it (DESIGN §8 —
  // spawn as human WITHOUT the mask). Swallow the press before the
  // player controller sees it; clearing all just-pressed state this
  // frame is acceptable pre-mask (movement uses held keys, not presses).
  if (!flagStore.flags.hasMask && input.justPressed('transform')) {
    input.clearPressed();
  }

  // wind → player → triggers → interactions → quest script
  wind.update(dt);
  player.update(dt);
  triggers.update();
  interactions.update();
  questScript.update(dt);

  // characters/world anims (active scene only)
  if (sceneDir.active === 'exterior') {
    exterior.update(dt, wind.state);
    yanagi.setWindSway(wind.state.strength);
    yanagi.update(dt, yanagiMotion);
    extRig.flicker(dt, wind.state.strength);
  } else {
    intRig.flicker(dt);
  }
  vfx.update(dt);

  // camera: diorama drift on title/intro, follow in play.
  // The moon shadow frustum tracks whatever the camera looks at.
  if (director.phase === 'title' || director.phase === 'intro') {
    dioramaTarget.set(
      exterior.anchors.willow.x + Math.sin(elapsed * 0.07) * 5,
      0,
      exterior.anchors.willow.z + Math.cos(elapsed * 0.07) * 3.5,
    );
    isoCam.update(dt, dioramaTarget, null);
    extRig.follow(dioramaTarget);
  } else {
    isoCam.update(dt, player.pos, player.velocity);
    if (sceneDir.active === 'exterior') extRig.follow(player.pos);
  }

  // audio tick
  audio.update(dt, wind.state.strength);
}, 0);

// render through the postfx composer (bloom → vignette/grade → output);
// setScene every frame keeps the swap seam trivial (sceneDirector flips
// activeScene mid-fade — postfx simply follows).
loop.add(
  (dt) => {
    postfx.setScene(sceneDir.activeScene, isoCam.camera);
    postfx.render(dt);
  },
  100,
  true,
);
loop.add(() => input.lateUpdate(), 1000, true);

// ─────────────────────────────── boot flow: title → intro → play ──
void input.anyGesture.then(() => audio.init());
hud.setMuted(audio.isMuted());

player.teleport(exterior.anchors.spawn);
player.setFormInstant('human'); // human, no mask — F unlocks at the shrine
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

// Restart (pause menu + ending R/Esc, wired inside questScript) is a full
// page reload: flags, quest script, wind (stopForever is one-way), cut
// branches and the world all come back factory-fresh — see BUILD_STATE.

// DEV-only debug handle for scripted browser verification (stripped from
// production builds by the `import.meta.env.DEV` guard).
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__kitsune = {
    renderer: renderer.gl, // renderer.info for perf verification
    player,
    sceneDir,
    wind,
    director,
    isoCam,
    postfx,
    extRig,
    intRig,
    kit,
    dialog: dialogSystem,
    questScript,
    screens,
    interactions,
    triggers,
    input,
    bus,
    getFlags: () => flagStore.flags,
  };
}
