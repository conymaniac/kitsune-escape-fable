/**
 * Renderer — WebGLRenderer wrapper per TECH_SPEC §1/§7 (STREAM D).
 *
 * SRGBColorSpace + NoToneMapping, pixelRatio capped at 1.75, MSAA via
 * antialias, PCF-soft shadow map enabled. Owns the window-resize plumbing:
 * subscribers (the iso camera) get the new aspect on every resize.
 */
import * as THREE from 'three';

export const MAX_PIXEL_RATIO = 1.75;

export class Renderer {
  readonly gl: THREE.WebGLRenderer;

  private readonly resizeCbs: Array<(aspect: number, w: number, h: number) => void> = [];
  private readonly handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.gl.setSize(w, h);
    const aspect = w / Math.max(h, 1);
    for (const cb of this.resizeCbs) cb(aspect, w, h);
  };

  constructor(canvas: HTMLCanvasElement) {
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.gl.toneMapping = THREE.NoToneMapping;
    this.gl.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.gl.setSize(window.innerWidth, window.innerHeight);
    this.gl.shadowMap.enabled = true;
    this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    window.addEventListener('resize', this.handleResize);
  }

  get aspect(): number {
    return window.innerWidth / Math.max(window.innerHeight, 1);
  }

  /** Subscribe to resizes. Returns an unsubscribe function. */
  onResize(cb: (aspect: number, w: number, h: number) => void): () => void {
    this.resizeCbs.push(cb);
    return () => {
      const i = this.resizeCbs.indexOf(cb);
      if (i >= 0) this.resizeCbs.splice(i, 1);
    };
  }

  setClearColor(hex: number): void {
    this.gl.setClearColor(hex);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.gl.render(scene, camera);
  }

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.resizeCbs.length = 0;
    this.gl.dispose();
  }
}
