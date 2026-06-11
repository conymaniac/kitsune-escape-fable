/**
 * Character VFX — STREAM C, FINAL APIs, pooled, geometry/shader-only
 * (no textures, no sprites-from-images — TECH_SPEC purity rule).
 *
 * M1 visual quality: simple rings/quads with kit materials. M2 polishes the
 * looks (wisp shader, smoke erosion) behind these exact signatures:
 *
 *   transformBurst(pos)   ring + 6 spiraling kitsunebi wisps + light flash
 *   dustPoof(pos)         bound-landing dust
 *   emberTrail.attach(o) / emberTrail.detach()   fox sprint trail emitter
 *   ghostSmokePuffs(pos)  dissolve smoke
 *   branchFallFade(mesh)  cut willow branch falls + fades out
 *
 * All pool materials are CLONES of kit materials (only Material-base props
 * — opacity / transparent / blending / depthWrite — are ever mutated, so
 * the M2 material swap cannot break this file). Clones are owned and
 * disposed here.
 */
import * as THREE from 'three';
import { paletteHex } from '@/style/palette';
import type { MaterialKit } from '@/core/types';
import { clamp01, lerp } from './rig';

/** Fixed iso camera direction (TECH_SPEC §1) — quads billboard against it. */
const ISO_CAM_DIR = new THREE.Vector3(0.6124, 0.5, 0.6124);

interface Particle {
  mesh: THREE.Mesh;
  mat: THREE.Material;
  active: boolean;
  age: number;
  life: number;
  baseOpacity: number;
  scale0: number;
  scale1: number;
  /** Linear motion. */
  vel: THREE.Vector3;
  /** Spiral motion (transform-burst wisps) overrides linear when true. */
  spiral: boolean;
  center: THREE.Vector3;
  angle: number;
  angVel: number;
  radius: number;
  radVel: number;
  lift: number;
}

interface BranchFade {
  mesh: THREE.Mesh;
  mats: THREE.Material[];
  baseOpacities: number[];
  age: number;
  life: number;
  fallVel: number;
  spin: number;
}

const POOL_WISPS = 18;
const POOL_SMOKE = 16;
const POOL_EMBERS = 32;
const POOL_DUST = 12;
const POOL_RINGS = 4;

const EMBER_INTERVAL = 0.055;

export class VfxSystem {
  /** Add this to the active scene; effects live under it. */
  readonly root = new THREE.Group();

  readonly emberTrail: {
    attach(target: THREE.Object3D): void;
    detach(): void;
  };

  private readonly wisps: Particle[] = [];
  private readonly smoke: Particle[] = [];
  private readonly embers: Particle[] = [];
  private readonly dust: Particle[] = [];
  private readonly rings: Particle[] = [];
  private readonly branchFades: BranchFade[] = [];

  private readonly flash: THREE.PointLight;
  private flashAge = 1;
  private flashLife = 0.3;
  private flashPeak = 0;

  private emberTarget: THREE.Object3D | null = null;
  private emberAccum = 0;

  private readonly quadGeo: THREE.PlaneGeometry;
  private readonly ringGeo: THREE.RingGeometry;
  private readonly ownedMats: THREE.Material[] = [];

  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();

  constructor(kit: MaterialKit) {
    this.root.name = 'vfx';

    this.quadGeo = new THREE.PlaneGeometry(1, 1);
    this.ringGeo = new THREE.RingGeometry(0.78, 1, 28);

    // Material prototypes — cloned per pooled particle so per-effect
    // opacity fades never touch the shared kit cache.
    const wispProto = kit.wisp();
    const smokeProto = kit.ghost();
    const emberProto = kit.emissive('lanternAmber');
    const dustProto = kit.toon('paperAged', { transparent: true, opacity: 0.5 });

    this.wisps.push(...this.makePool(POOL_WISPS, this.quadGeo, wispProto, 0.16));
    this.smoke.push(...this.makePool(POOL_SMOKE, this.quadGeo, smokeProto, 0.3));
    this.embers.push(
      ...this.makePool(POOL_EMBERS, this.quadGeo, emberProto, 0.07, (m) => {
        m.transparent = true;
        m.blending = THREE.AdditiveBlending;
        m.depthWrite = false;
      }),
    );
    this.dust.push(
      ...this.makePool(POOL_DUST, this.quadGeo, dustProto, 0.24, (m) => {
        m.depthWrite = false;
      }),
    );
    this.rings.push(...this.makePool(POOL_RINGS, this.ringGeo, wispProto, 1));

    this.flash = new THREE.PointLight(paletteHex('spectralTeal'), 0, 7, 2);
    this.flash.visible = false;
    this.root.add(this.flash);

    this.emberTrail = {
      attach: (target: THREE.Object3D): void => {
        this.emberTarget = target;
        this.emberAccum = 0;
      },
      detach: (): void => {
        this.emberTarget = null;
      },
    };
  }

  // ── public effects ──

  /** Smoke-and-foxfire transform burst (DESIGN §2 / juice #1). */
  transformBurst(pos: THREE.Vector3): void {
    // Expanding ground rings.
    this.spawnRing(pos, 0.06, 0.3, 2.1, 0.45);
    this.spawnRing(pos, 0.5, 0.15, 1.3, 0.32);

    // 6 kitsunebi wisp-quads spiraling outward.
    for (let i = 0; i < 6; i++) {
      const p = this.take(this.wisps);
      if (!p) break;
      p.spiral = true;
      p.center.copy(pos);
      p.angle = (i / 6) * Math.PI * 2;
      p.angVel = 7;
      p.radius = 0.18;
      p.radVel = 1.7;
      p.lift = 2.1;
      p.life = 0.55;
      p.scale0 = 1.5;
      p.scale1 = 0.45;
      this.arm(p, pos);
    }

    // White smoke puffs.
    for (let i = 0; i < 4; i++) {
      const p = this.take(this.smoke);
      if (!p) break;
      p.vel.set((Math.random() - 0.5) * 1.0, 1.1 + Math.random() * 0.7, (Math.random() - 0.5) * 1.0);
      p.life = 0.6;
      p.scale0 = 0.9;
      p.scale1 = 2.3;
      this.arm(p, pos, 0.35);
    }

    // Brief PointLight flash.
    this.flash.position.copy(pos);
    this.flash.position.y += 0.5;
    this.flashAge = 0;
    this.flashLife = 0.3;
    this.flashPeak = 4;
    this.flash.visible = true;
  }

  /** Landing/launch dust (fox Bound, knockdown thump). */
  dustPoof(pos: THREE.Vector3): void {
    for (let i = 0; i < 6; i++) {
      const p = this.take(this.dust);
      if (!p) break;
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.6;
      const r = 0.8 + Math.random() * 0.6;
      p.vel.set(Math.sin(a) * r, 0.35 + Math.random() * 0.3, Math.cos(a) * r);
      p.life = 0.45;
      p.scale0 = 0.7;
      p.scale1 = 1.7;
      this.arm(p, pos, 0.08);
    }
  }

  /** Ghost-dissolve smoke drawn upward (the reveal beat). */
  ghostSmokePuffs(pos: THREE.Vector3): void {
    for (let i = 0; i < 10; i++) {
      const p = this.take(this.smoke);
      if (!p) break;
      p.vel.set((Math.random() - 0.5) * 0.6, 0.55 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6);
      p.life = 1.5;
      p.scale0 = 1.0;
      p.scale1 = 2.6;
      this.arm(p, pos, 0.2 + Math.random() * 1.0);
    }
  }

  /**
   * A just-cut branch mesh drops, tilts and fades out, then leaves the
   * scene graph. The mesh's materials are cloned before fading so shared
   * kit materials are never mutated.
   */
  branchFallFade(mesh: THREE.Mesh): void {
    const source = mesh.material;
    const mats = Array.isArray(source) ? source.map((m) => m.clone()) : [source.clone()];
    for (const m of mats) {
      m.transparent = true;
      m.depthWrite = false;
    }
    mesh.material = Array.isArray(source) ? mats : (mats[0] as THREE.Material);
    this.branchFades.push({
      mesh,
      mats,
      baseOpacities: mats.map((m) => m.opacity),
      age: 0,
      life: 1.3,
      fallVel: 0.3,
      spin: (Math.random() - 0.5) * 1.1,
    });
  }

  // ── tick ──

  update(dt: number): void {
    this.tickPool(this.wisps, dt);
    this.tickPool(this.smoke, dt);
    this.tickPool(this.embers, dt);
    this.tickPool(this.dust, dt);
    this.tickPool(this.rings, dt);

    // Light flash decay.
    if (this.flashAge < this.flashLife) {
      this.flashAge += dt;
      const k = clamp01(this.flashAge / this.flashLife);
      this.flash.intensity = this.flashPeak * (1 - k);
      if (k >= 1) this.flash.visible = false;
    }

    // Ember trail emitter.
    if (this.emberTarget) {
      this.emberAccum += dt;
      while (this.emberAccum >= EMBER_INTERVAL) {
        this.emberAccum -= EMBER_INTERVAL;
        this.emberTarget.getWorldPosition(this.tmpA);
        this.tmpA.x += (Math.random() - 0.5) * 0.16;
        this.tmpA.y += 0.12 + Math.random() * 0.15;
        this.tmpA.z += (Math.random() - 0.5) * 0.16;
        const p = this.take(this.embers);
        if (!p) break;
        p.vel.set((Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3);
        p.life = 0.5;
        p.scale0 = 1;
        p.scale1 = 0.15;
        this.arm(p, this.tmpA);
      }
    }

    // Branch fall-and-fade.
    for (let i = this.branchFades.length - 1; i >= 0; i--) {
      const f = this.branchFades[i];
      if (!f) continue;
      f.age += dt;
      f.fallVel += 2.6 * dt;
      f.mesh.position.y -= Math.min(f.fallVel, 1.4) * dt;
      f.mesh.rotation.z += f.spin * dt;
      const fade = clamp01((f.age - 0.35) / (f.life - 0.35));
      for (let j = 0; j < f.mats.length; j++) {
        const m = f.mats[j];
        const base = f.baseOpacities[j];
        if (m && base !== undefined) m.opacity = base * (1 - fade);
      }
      if (f.age >= f.life) {
        f.mesh.removeFromParent();
        for (const m of f.mats) m.dispose();
        this.branchFades.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.quadGeo.dispose();
    this.ringGeo.dispose();
    for (const m of this.ownedMats) m.dispose();
    this.ownedMats.length = 0;
  }

  // ── pool internals ──

  private makePool(
    count: number,
    geo: THREE.BufferGeometry,
    proto: THREE.Material,
    size: number,
    tweak?: (m: THREE.Material) => void,
  ): Particle[] {
    const pool: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const mat = proto.clone();
      if (tweak) tweak(mat);
      this.ownedMats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.scale.setScalar(size);
      this.root.add(mesh);
      pool.push({
        mesh,
        mat,
        active: false,
        age: 0,
        life: 1,
        baseOpacity: mat.opacity,
        scale0: size,
        scale1: size,
        vel: new THREE.Vector3(),
        spiral: false,
        center: new THREE.Vector3(),
        angle: 0,
        angVel: 0,
        radius: 0,
        radVel: 0,
        lift: 0,
      });
    }
    return pool;
  }

  /** Grab the first free particle (oldest is recycled if all busy). */
  private take(pool: Particle[]): Particle | null {
    let oldest: Particle | null = null;
    for (const p of pool) {
      if (!p.active) return p;
      if (!oldest || p.age > oldest.age) oldest = p;
    }
    return oldest;
  }

  /** Activate a particle at a position; resets common fields. */
  private arm(p: Particle, pos: THREE.Vector3, yOffset = 0): void {
    p.active = true;
    p.age = 0;
    if (p.spiral) {
      p.mesh.position.set(
        p.center.x + Math.sin(p.angle) * p.radius,
        p.center.y + 0.3,
        p.center.z + Math.cos(p.angle) * p.radius,
      );
    } else {
      p.mesh.position.copy(pos);
      p.mesh.position.y += yOffset;
    }
    p.mesh.visible = true;
    p.mesh.scale.setScalar(p.scale0);
    p.mat.opacity = p.baseOpacity;
    if (p.mesh.geometry === this.ringGeo) {
      // Rings lie flat on the ground.
      p.mesh.rotation.set(-Math.PI / 2, 0, 0);
    } else {
      // Quads billboard toward the fixed iso camera direction.
      this.tmpB.copy(p.mesh.position).add(ISO_CAM_DIR);
      p.mesh.lookAt(this.tmpB);
    }
  }

  private spawnRing(pos: THREE.Vector3, yOffset: number, scale0: number, scale1: number, life: number): void {
    const p = this.take(this.rings);
    if (!p) return;
    p.spiral = false;
    p.vel.set(0, 0, 0);
    p.life = life;
    p.scale0 = scale0;
    p.scale1 = scale1;
    this.arm(p, pos, yOffset);
  }

  private tickPool(pool: Particle[], dt: number): void {
    for (const p of pool) {
      if (!p.active) continue;
      p.age += dt;
      const k = clamp01(p.age / p.life);
      if (k >= 1) {
        p.active = false;
        p.spiral = false;
        p.mesh.visible = false;
        continue;
      }
      // Ease-out growth + linear fade.
      const grow = 1 - (1 - k) * (1 - k);
      p.mesh.scale.setScalar(lerp(p.scale0, p.scale1, grow));
      p.mat.opacity = p.baseOpacity * (1 - k);

      if (p.spiral) {
        p.angle += p.angVel * dt;
        p.radius += p.radVel * dt;
        p.mesh.position.set(
          p.center.x + Math.sin(p.angle) * p.radius,
          p.center.y + 0.3 + p.age * p.lift,
          p.center.z + Math.cos(p.angle) * p.radius,
        );
      } else {
        p.mesh.position.addScaledVector(p.vel, dt);
      }
    }
  }
}
