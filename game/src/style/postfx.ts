/**
 * PostFX pipeline (STREAM A, M2 — TECH_SPEC §1/§7; M4-P2 grade hook).
 *
 * EffectComposer: RenderPass → UnrealBloomPass (internally half-res mips;
 * threshold .85 / strength .35 / radius .4 — only emissives, wisps, the
 * moon and water glints cross it) → one cheap combined grade ShaderPass
 * (indigo-tinted vignette + whisper of film grain + indigo shadow lift so
 * blacks read as ink wash) → OutputPass (sRGB).
 *
 * The composer renders into a WebGL2 MSAA (4×) half-float target so the
 * HDR emissives survive into bloom and edges stay clean without FXAA.
 *
 * Also owns the per-frame tick of the shared style uniforms (water/ghost/
 * wisp/sway clock — see shaders/chunks.ts): render(dt) is the single
 * style heartbeat.
 *
 * ── M4-P2: cinematic grades ──
 * setGrade(name, tweenSec) tweens the grade pass between named looks:
 *   'normal'    the playing grade (deep indigo, never washed)
 *   'inkReveal' DESIGN §5 body-reveal beat — the world desaturates to
 *               ink-and-bone EXCEPT violet hues (her kimono / kitsunebi
 *               keep their color), vignette closes in
 *   'pauseDim'  pause scroll — frozen world drains and dims (DESIGN §6)
 *   'dawn'      ending drift over the still lake — a whisper of desat +
 *               an open frame for the first grey-blue hint of morning
 * `setGlobalGrade()` is a module-level proxy to the live instance so
 * UI-side code (screens.ts owns the reveal/pause/ending moments) can
 * drive the grade without new main.ts wiring.
 *
 * API: setScene(scene, camera) — cheap, call every frame with the scene
 * director's active scene; render(dt); resize(w, h); setEnabled(b)
 * fallback to a direct renderer.render; setGrade(name, tweenSec).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { palette } from './palette';
import { tickStyleUniforms } from './shaders/chunks';

export const BLOOM_THRESHOLD = 0.85;
export const BLOOM_STRENGTH = 0.35;
export const BLOOM_RADIUS = 0.4;

const GradeShader = {
  name: 'KitsuneGradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    /** Vignette corner tint (deep indigo, never black). */
    uVignetteTint: { value: new THREE.Color(palette.nightDeep).multiplyScalar(0.35) },
    /** Additive indigo lift in the deepest shadows (ink-wash floor). */
    uShadowLift: { value: new THREE.Color(palette.nightIndigo).multiplyScalar(0.055) },
    uVignetteStrength: { value: 0.42 },
    uGrain: { value: 0.015 },
    // — M4 grade controls (tweened by setGrade) —
    /** 0..1 ink-wash desaturation amount. */
    uInk: { value: 0 },
    /** 0..1 how much violet hues resist the ink wash (the kimono). */
    uVioletKeep: { value: 1 },
    /** Overall exposure dim (pause). */
    uDim: { value: 1 },
    /** Ink ramp ends: shadow ink (indigo-charcoal, never black) + bone. */
    uInkShadow: { value: new THREE.Color(palette.inkCharcoal).multiplyScalar(0.55) },
    uInkBone: { value: new THREE.Color(palette.paperBone).multiplyScalar(0.85) },
  },
  vertexShader: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uTime;
uniform vec3 uVignetteTint;
uniform vec3 uShadowLift;
uniform float uVignetteStrength;
uniform float uGrain;
uniform float uInk;
uniform float uVioletKeep;
uniform float uDim;
uniform vec3 uInkShadow;
uniform vec3 uInkBone;
varying vec2 vUv;

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));

  // — ink-wash grade (the reveal): desaturate to ink-and-bone, but let
  //   violet hues (her kimono, the kitsunebi) hold their color —
  if (uInk > 0.001) {
    // violetness: red+blue above green, the spectral/kimono axis
    float violet = clamp((c.b - c.g) * 2.4, 0.0, 1.0) * clamp((c.r - c.g) * 1.6 + 0.3, 0.0, 1.0);
    float keep = clamp(violet * uVioletKeep * 1.6, 0.0, 1.0);
    vec3 inkCol = mix(uInkShadow, uInkBone, smoothstep(0.015, 0.55, luma));
    c.rgb = mix(c.rgb, inkCol, uInk * (1.0 - keep));
  }
  c.rgb *= uDim;

  // indigo vignette pulling the eye to centre
  vec2 q = vUv - 0.5;
  float d = length(q * vec2(1.12, 1.0));
  float vig = smoothstep(0.38, 0.86, d) * uVignetteStrength;
  c.rgb = mix(c.rgb, uVignetteTint, vig);
  // ink-wash floor: shadows lift toward indigo, never pure black
  float luma2 = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb += uShadowLift * (1.0 - smoothstep(0.0, 0.32, luma2));
  // a whisper of paper grain
  float g = fract(sin(dot(vUv * vec2(917.13, 711.7), vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453);
  c.rgb += (g - 0.5) * uGrain;
  gl_FragColor = c;
}
`,
};

/** Named cinematic grades (M4-P2). */
export type GradeName = 'normal' | 'inkReveal' | 'pauseDim' | 'dawn';

interface GradeValues {
  ink: number;
  violetKeep: number;
  dim: number;
  vignette: number;
}

const GRADES: Readonly<Record<GradeName, GradeValues>> = {
  normal: { ink: 0, violetKeep: 1, dim: 1, vignette: 0.42 },
  // The body-reveal beat: ink-and-bone world, the violet kimono survives.
  inkReveal: { ink: 0.88, violetKeep: 1, dim: 0.96, vignette: 0.56 },
  // Pause scroll: the frozen world drains and recedes behind the paper.
  pauseDim: { ink: 0.55, violetKeep: 0.25, dim: 0.78, vignette: 0.5 },
  // Ending drift: barely-there desat, open frame for the dawn hint.
  dawn: { ink: 0.16, violetKeep: 0.6, dim: 1, vignette: 0.34 },
};

export interface PostFx {
  setScene(scene: THREE.Scene, camera: THREE.Camera): void;
  render(dt: number): void;
  resize(width: number, height: number): void;
  /** Fallback: false = plain renderer.render (no bloom/vignette). */
  setEnabled(enabled: boolean): void;
  /** Tween to a named cinematic grade (M4-P2 — DESIGN §5/§6 beats). */
  setGrade(name: GradeName, tweenSec?: number): void;
  /** The grade currently targeted (for state checks). */
  readonly gradeName: GradeName;
  /** Dev introspection (pass toggling from the console). */
  readonly passes: { bloom: UnrealBloomPass; grade: ShaderPass; output: OutputPass };
  dispose(): void;
}

/** The live PostFx instance (set by createPostFx — one per app). */
let liveInstance: PostFx | null = null;

/**
 * Module-level grade proxy: lets UI-side owners of the cinematic moments
 * (screens.ts — reveal overlay, pause, ending) drive the grade without
 * threading the PostFx instance through main.ts. No-op before boot.
 */
export function setGlobalGrade(name: GradeName, tweenSec?: number): void {
  liveInstance?.setGrade(name, tweenSec);
}

export function createPostFx(renderer: THREE.WebGLRenderer): PostFx {
  const size = renderer.getSize(new THREE.Vector2());
  const pixelRatio = renderer.getPixelRatio();

  // MSAA 4× half-float target — HDR emissives feed bloom, edges stay clean.
  const target = new THREE.WebGLRenderTarget(size.x * pixelRatio, size.y * pixelRatio, {
    type: THREE.HalfFloatType,
    samples: 4,
  });

  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(size.x, size.y);

  let scene: THREE.Scene = new THREE.Scene();
  let camera: THREE.Camera = new THREE.PerspectiveCamera();

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y), // internal mip chain starts at half-res
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );

  // Harden the bloom high-pass. Any non-finite fragment in the scene
  // (NaN vertex colors, zero-length normals → NaN lighting) would smear
  // through the mip blur into a screen-covering white blob — and NaN is
  // immune to the luminance threshold. Kill non-finite texels and cap
  // radiance so no single hotspot can wash the frame, whatever the
  // content streams feed us.
  const highPass = bloomPass.materialHighPassFilter;
  highPass.fragmentShader = highPass.fragmentShader.replace(
    'vec4 texel = texture2D( tDiffuse, vUv );',
    /* glsl */ `vec4 texel = texture2D( tDiffuse, vUv );
      if (any(isnan(texel)) || any(isinf(texel))) texel = vec4(0.0);
      texel.rgb = min(texel.rgb, vec3(8.0));`,
  );
  highPass.needsUpdate = true;
  const gradePass = new ShaderPass(GradeShader);
  const outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(gradePass);
  composer.addPass(outputPass);

  let enabled = true;

  // — grade tween state —
  let gradeName: GradeName = 'normal';
  const gradeFrom: GradeValues = { ...GRADES.normal };
  const gradeTo: GradeValues = { ...GRADES.normal };
  const gradeNow: GradeValues = { ...GRADES.normal };
  let gradeT = 1; // 0..1 progress
  let gradeTween = 1; // seconds

  function applyGrade(values: GradeValues): void {
    const u = gradePass.uniforms;
    if (u['uInk']) u['uInk'].value = values.ink;
    if (u['uVioletKeep']) u['uVioletKeep'].value = values.violetKeep;
    if (u['uDim']) u['uDim'].value = values.dim;
    if (u['uVignetteStrength']) u['uVignetteStrength'].value = values.vignette;
  }

  const instance: PostFx = {
    passes: { bloom: bloomPass, grade: gradePass, output: outputPass },

    get gradeName(): GradeName {
      return gradeName;
    },

    setScene(nextScene: THREE.Scene, nextCamera: THREE.Camera): void {
      scene = nextScene;
      camera = nextCamera;
      renderPass.scene = nextScene;
      renderPass.camera = nextCamera;
    },

    setGrade(name: GradeName, tweenSec = 1): void {
      if (name === gradeName && gradeT >= 1) return;
      gradeName = name;
      gradeFrom.ink = gradeNow.ink;
      gradeFrom.violetKeep = gradeNow.violetKeep;
      gradeFrom.dim = gradeNow.dim;
      gradeFrom.vignette = gradeNow.vignette;
      const to = GRADES[name];
      gradeTo.ink = to.ink;
      gradeTo.violetKeep = to.violetKeep;
      gradeTo.dim = to.dim;
      gradeTo.vignette = to.vignette;
      gradeTween = Math.max(tweenSec, 0.001);
      gradeT = 0;
    },

    render(dt: number): void {
      tickStyleUniforms(dt); // the style stream's single heartbeat
      const uTime = gradePass.uniforms['uTime'];
      if (uTime) uTime.value = (uTime.value + dt) % 1000;

      // grade tween (smoothstep ease, frame-rate independent)
      if (gradeT < 1) {
        gradeT = Math.min(1, gradeT + dt / gradeTween);
        const k = gradeT * gradeT * (3 - 2 * gradeT);
        gradeNow.ink = gradeFrom.ink + (gradeTo.ink - gradeFrom.ink) * k;
        gradeNow.violetKeep =
          gradeFrom.violetKeep + (gradeTo.violetKeep - gradeFrom.violetKeep) * k;
        gradeNow.dim = gradeFrom.dim + (gradeTo.dim - gradeFrom.dim) * k;
        gradeNow.vignette = gradeFrom.vignette + (gradeTo.vignette - gradeFrom.vignette) * k;
        applyGrade(gradeNow);
      }

      if (enabled) {
        composer.render(dt);
      } else {
        renderer.render(scene, camera);
      }
    },

    resize(width: number, height: number): void {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      bloomPass.setSize(width, height);
    },

    setEnabled(value: boolean): void {
      enabled = value;
    },

    dispose(): void {
      if (liveInstance === instance) liveInstance = null;
      composer.dispose();
      target.dispose();
    },
  };

  liveInstance = instance;
  return instance;
}
