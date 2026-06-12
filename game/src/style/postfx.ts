/**
 * PostFX pipeline (STREAM A, M2 — TECH_SPEC §1/§7).
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
 * API: setScene(scene, camera) — cheap, call every frame with the scene
 * director's active scene; render(dt); resize(w, h); setEnabled(b)
 * fallback to a direct renderer.render.
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
    uGrain: { value: 0.02 },
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
varying vec2 vUv;

void main() {
  vec4 c = texture2D(tDiffuse, vUv);
  // indigo vignette pulling the eye to centre
  vec2 q = vUv - 0.5;
  float d = length(q * vec2(1.12, 1.0));
  float vig = smoothstep(0.38, 0.86, d) * uVignetteStrength;
  c.rgb = mix(c.rgb, uVignetteTint, vig);
  // ink-wash floor: shadows lift toward indigo, never pure black
  float luma = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  c.rgb += uShadowLift * (1.0 - smoothstep(0.0, 0.32, luma));
  // a whisper of paper grain
  float g = fract(sin(dot(vUv * vec2(917.13, 711.7), vec2(12.9898, 78.233)) + uTime * 61.7) * 43758.5453);
  c.rgb += (g - 0.5) * uGrain;
  gl_FragColor = c;
}
`,
};

export interface PostFx {
  setScene(scene: THREE.Scene, camera: THREE.Camera): void;
  render(dt: number): void;
  resize(width: number, height: number): void;
  /** Fallback: false = plain renderer.render (no bloom/vignette). */
  setEnabled(enabled: boolean): void;
  dispose(): void;
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
  const gradePass = new ShaderPass(GradeShader);
  const outputPass = new OutputPass();

  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(gradePass);
  composer.addPass(outputPass);

  let enabled = true;

  return {
    setScene(nextScene: THREE.Scene, nextCamera: THREE.Camera): void {
      scene = nextScene;
      camera = nextCamera;
      renderPass.scene = nextScene;
      renderPass.camera = nextCamera;
    },

    render(dt: number): void {
      tickStyleUniforms(dt); // the style stream's single heartbeat
      const uTime = gradePass.uniforms['uTime'];
      if (uTime) uTime.value = (uTime.value + dt) % 1000;
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
      composer.dispose();
      target.dispose();
    },
  };
}
