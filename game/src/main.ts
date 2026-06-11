/**
 * Composition root — M0 smoke test.
 * Boots a minimal inline renderer + iso camera (engine/renderer.ts and
 * engine/camera.ts arrive in M1 — nothing here creates engine/ or
 * gameplay/ files), one lit scene of palette-colored stand-ins built via
 * the stub MaterialKit, the GameLoop, UI root, and the title→intro→play
 * flow with a working locale toggle. M1 replaces the scene content.
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
import { cryUnderWillow } from '@/data/quests';
import { dialogNodes } from '@/data/dialogs';

// ── kernel ──
const bus = new EventBus();
const flagStore = new FlagStore();
const loop = new GameLoop();
const input = new Input();
const director = new GameDirector(bus);
const audio = createAudio(bus);
const kit = createMaterialKit();

// ── ui ──
const ui = createUiRoot();
const hud = createHud(ui.hud);
const dialogUi = createDialogUi(ui.dialog, bus);
const screens = createScreens(ui.screens, ui.fade, ui.paper, bus);
dialogUi.close(); // mounted + hidden until M1's dialog system drives it

onLocaleChange((locale) => bus.emit('LocaleChanged', locale));
void flagStore.flags; // flags live; gameplay systems consume them in M1
void dialogNodes; // content data compiled in; dialog runner arrives in M1

// ── renderer (minimal inline bootstrap; M1 ships engine/renderer.ts) ──
const canvas = document.getElementById('app-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(palette.nightDeep);

// ── iso camera per spec: azimuth 45°, elevation 30°, viewHeight 14 ──
const VIEW_HEIGHT = 14;
const CAM_DIR = new THREE.Vector3(0.6124, 0.5, 0.6124); // unit vector
const CAM_DIST = 60;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const camTarget = new THREE.Vector3(0, 0, 0);

function applyFrustum(): void {
  const aspect = window.innerWidth / window.innerHeight;
  camera.top = VIEW_HEIGHT / 2;
  camera.bottom = -VIEW_HEIGHT / 2;
  camera.left = (-VIEW_HEIGHT / 2) * aspect;
  camera.right = (VIEW_HEIGHT / 2) * aspect;
  camera.updateProjectionMatrix();
}
camera.position.copy(camTarget).addScaledVector(CAM_DIR, CAM_DIST);
camera.lookAt(camTarget);
applyFrustum();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyFrustum();
});

// ── smoke-test scene: lights + palette-colored stand-ins ──
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(palette.nightDeep, 40, 120);

scene.add(new THREE.HemisphereLight(palette.nightHorizon, 0x1a1228, 0.6));
const moon = new THREE.DirectionalLight(palette.moonlight, 1.2);
moon.position.set(-12, 24, -8);
scene.add(moon);
const windowGlow = new THREE.PointLight(palette.shojiGlow, 8, 14);
windowGlow.position.set(-4.5, 1.4, -2.5);
scene.add(windowGlow);

function box(
  w: number,
  h: number,
  d: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

// ground + path band
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 64), kit.toon('grassNight'));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const path = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 30), kit.toon('earthBrown'));
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.01, 2);
scene.add(path);

// cottage stand-in (walls + thatch + warm shoji window)
box(4, 2, 3, kit.toon('woodWarm'), -5, 1, -3);
box(4.6, 1.2, 3.6, kit.toon('thatchStraw'), -5, 2.6, -3);
box(0.1, 0.8, 1, kit.emissive('shojiGlow'), -2.93, 1.1, -2.5);

// willow stand-in + lake
box(0.6, 2.4, 0.6, kit.toon('woodDark'), 5, 1.2, -4);
box(3.4, 2.2, 3.4, kit.toon('willowGreen'), 5, 3.2, -4);
box(2.6, 0.8, 2.6, kit.toon('willowDeep'), 5, 2.0, -4);
const lake = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), kit.water());
lake.rotation.x = -Math.PI / 2;
lake.position.set(11, 0.02, 2);
scene.add(lake);
const shallows = new THREE.Mesh(new THREE.PlaneGeometry(18.8, 12.8), kit.toon('lakeShallow'));
shallows.rotation.x = -Math.PI / 2;
shallows.position.set(11, 0.005, 2);
scene.add(shallows);

// characters' stand-ins: fox-orange Mizumi, kimono-purple Yanagi + ghost veil
const mizumi = box(0.7, 1.0, 0.7, kit.toon('foxOrange'), 0, 0.5, 4);
box(0.7, 1.1, 0.7, kit.toon('kimonoPurple'), 5.6, 0.55, -2.2);
box(0.9, 1.3, 0.9, kit.ghost(), 5.6, 0.65, -2.2);

// shrine lantern + boulders + ink ridge
box(0.3, 1.2, 0.3, kit.toon('woodDark'), -1.6, 0.6, 8);
const lantern = box(0.5, 0.5, 0.5, kit.emissive('lanternAmber'), -1.6, 1.4, 8);
box(1.4, 1.0, 1.2, kit.toon('inkCharcoal'), -1, 0.5, -8);
box(1.0, 0.7, 1.0, kit.toon('inkCharcoal'), 1.2, 0.35, -7);
box(30, 3, 1.5, kit.ink(), 0, 1.5, -14);

// kitsunebi wisps
const wisps: THREE.Mesh[] = [];
for (let i = 0; i < 5; i += 1) {
  const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), kit.wisp());
  wisp.position.set(3 + i * 0.9, 1 + (i % 2) * 0.4, -2 - (i % 3) * 0.8);
  scene.add(wisp);
  wisps.push(wisp);
}

// ── loop wiring ──
let elapsed = 0;
loop.add((dt) => {
  elapsed += dt;
  for (let i = 0; i < wisps.length; i += 1) {
    const wisp = wisps[i];
    if (!wisp) continue;
    wisp.position.y = 1 + 0.25 * Math.sin(elapsed * 1.7 + i * 1.3);
  }
  lantern.scale.setScalar(1 + 0.06 * Math.sin(elapsed * 9) * Math.sin(elapsed * 2.3));
  mizumi.rotation.y += dt * 0.4;
}, 0);

loop.add((dt) => audio.update(dt, 0.15), 50);
loop.add(() => renderer.render(scene, camera), 100, true);

// global keys (locale / mute / pause) — M1 moves these into systems
loop.add(() => {
  if (input.justPressed('lang')) {
    setLocale(getLocale() === 'en' ? 'cs' : 'en');
  }
  if (input.justPressed('mute')) {
    hud.setMuted(audio.toggleMute());
  }
  if (input.justPressed('pause') && director.phase === 'play' && !screens.isPauseOpen()) {
    loop.setPaused(true);
    screens.showPause(
      () => loop.setPaused(false),
      () => window.location.reload(),
    );
  }
}, -10);

loop.add(() => input.lateUpdate(), 1000, true);

// ── boot flow: title → intro → play ──
void input.anyGesture.then(() => audio.init());
hud.setMuted(audio.isMuted());

function startGame(): void {
  director.setPhase('intro');
  audio.playSfx('uiConfirm');
  screens.showIntro(() => {
    void screens.fadeToBlack(0.3).then(() => {
      director.setPhase('play');
      hud.setVisible(true);
      hud.setForm(flagStore.flags.currentForm);
      hud.setObjective(cryUnderWillow.titleKey, 'quest.description');
      hud.setHint('hint.move');
      audio.setMusicState('exterior');
      void screens.fadeFromBlack(0.5);
    });
  });
}

director.setPhase('title');
audio.setMusicState('title');
screens.showTitle(startGame);
loop.start();
