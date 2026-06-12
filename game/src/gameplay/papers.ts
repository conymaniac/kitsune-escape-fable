/**
 * PapersSystem — paper flutter sim (TECH_SPEC §1 gameplay/papers.ts,
 * DESIGN juice #12-adjacent; M4 P1).
 *
 * INTERIOR: the 7 scattered diary sheets (world/interior.ts `papers`)
 * get rest-pose springs and a slam impulse hook (the shutter-slam scare —
 * questScript calls `slam()`): lift + tumble while airborne, paper-light
 * terminal fall with a side-slip flutter, then a glide-settle that slerps
 * each sheet flat again on touchdown (drifted XZ persists — the room
 * stays "disturbed"). At rest a barely-there idle stir keeps the sheets
 * alive without reading as wind (DESIGN §3: no gust cycle inside).
 *
 * EXTERIOR: 3 loose leaves near the willow-shore path ride the gust
 * telegraphs (juice #4 support): resting in calm, skittering hops as the
 * telegraph builds, fully airborne streaks downwind during the lash,
 * settling when the gust dies. A leaf blown too far quietly respawns at
 * its home. Cheap: thin kit-material planes, sin-based flutter, no
 * allocations in update.
 */
import * as THREE from 'three';
import type { MaterialKit, WindState } from '@/core/types';
import { noise2 } from '@/world/props/meshUtils';

// ── interior sheets ──
const GRAVITY = 5.0;
const TERMINAL_FALL = 1.15; // paper-light fall speed cap (u/s)
const SETTLE_SEC = 0.45; // touchdown → flat
const DRAG = 1.6; // horizontal air drag (1/s)
const ROOM_X = 4.6; // keep drifted sheets inside the room
const ROOM_Z = 3.5;

// ── exterior leaves ──
const LEAF_HOMES: Array<[number, number]> = [
  [10.1, -4.6], // willow-shore path, between the row trunks
  [12.1, -8.6],
  [13.9, -10.4],
];
const LEAF_MAX_DRIFT = 11; // respawn at home past this distance
const UP = new THREE.Vector3(0, 1, 0);

type SheetMode = 'rest' | 'fly' | 'settle';

interface Sheet {
  mesh: THREE.Mesh;
  restY: number;
  restQuat: THREE.Quaternion;
  mode: SheetMode;
  vx: number;
  vy: number;
  vz: number;
  /** Tumble axis + rate while airborne. */
  axis: THREE.Vector3;
  spin: number;
  settleT: number;
  settleFrom: THREE.Quaternion;
  phase: number;
}

interface Leaf {
  mesh: THREE.Mesh;
  home: THREE.Vector3;
  vx: number;
  vz: number;
  y: number;
  phase: number;
  /** Telegraph skitter timer. */
  hopT: number;
}

export interface PapersSystemOptions {
  /** The interior diary sheets (world/interior.ts `papers`). */
  papers: THREE.Mesh[];
  kit: MaterialKit;
  /** Parent for the exterior leaves (added near the willow shore). */
  exteriorGroup: THREE.Group;
}

export class PapersSystem {
  private readonly sheets: Sheet[] = [];
  private readonly leaves: Leaf[] = [];
  private time = 0;

  private readonly qTmp = new THREE.Quaternion();

  constructor(options: PapersSystemOptions) {
    for (const mesh of options.papers) {
      this.sheets.push({
        mesh,
        restY: mesh.position.y,
        restQuat: mesh.quaternion.clone(),
        mode: 'rest',
        vx: 0,
        vy: 0,
        vz: 0,
        axis: new THREE.Vector3(0, 1, 0),
        spin: 0,
        settleT: 0,
        settleFrom: new THREE.Quaternion(),
        phase: Math.random() * Math.PI * 2,
      });
    }

    // — exterior leaves: small bent planes, one shared kit material —
    const leafMat = options.kit.toon('willowDeep', { doubleSided: true });
    const leafGroup = new THREE.Group();
    leafGroup.name = 'loose-leaves';
    for (let i = 0; i < LEAF_HOMES.length; i += 1) {
      const spot = LEAF_HOMES[i];
      if (!spot) continue;
      const g = new THREE.PlaneGeometry(0.16, 0.24, 1, 2);
      // slight lengthwise curl so the leaf reads in silhouette
      const pos = g.getAttribute('position');
      for (let v = 0; v < pos.count; v += 1) {
        pos.setZ(v, Math.abs(pos.getY(v)) * 0.35);
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, leafMat);
      mesh.name = `loose-leaf-${i}`;
      mesh.rotation.set(-Math.PI / 2 + 0.25, 0, i * 2.1);
      mesh.position.set(spot[0], 0.04, spot[1]);
      leafGroup.add(mesh);
      this.leaves.push({
        mesh,
        home: new THREE.Vector3(spot[0], 0.04, spot[1]),
        vx: 0,
        vz: 0,
        y: 0.04,
        phase: i * 2.39,
        hopT: 0.4 + i * 0.55,
      });
    }
    options.exteriorGroup.add(leafGroup);
  }

  /**
   * Shutter-slam impulse (the scare): every sheet explodes upward and away
   * from the window with a random tumble. `dir` is the XZ blast direction
   * (unit-ish); strength ~1 = the canon slam.
   */
  slam(dirX: number, dirZ: number, strength = 1): void {
    for (const s of this.sheets) {
      const j = 0.6 + Math.random() * 0.8;
      s.mode = 'fly';
      s.vy = (1.9 + Math.random() * 1.3) * strength;
      s.vx = (dirX * 1.1 + (Math.random() - 0.5) * 1.4) * j;
      s.vz = (dirZ * 1.1 + (Math.random() - 0.5) * 1.4) * j;
      s.axis
        .set(Math.random() - 0.5, Math.random() * 0.6 + 0.4, Math.random() - 0.5)
        .normalize();
      s.spin = (4 + Math.random() * 5) * (Math.random() > 0.5 ? 1 : -1);
    }
  }

  /** True while any interior sheet is airborne (screenshot/debug aid). */
  isFluttering(): boolean {
    for (const s of this.sheets) if (s.mode !== 'rest') return true;
    return false;
  }

  update(dt: number, wind: WindState, activeScene: 'exterior' | 'interior'): void {
    this.time += dt;
    if (activeScene === 'interior') this.updateSheets(dt);
    else this.updateLeaves(dt, wind);
  }

  // ── interior sheets ──

  private updateSheets(dt: number): void {
    const t = this.time;
    for (let i = 0; i < this.sheets.length; i += 1) {
      const s = this.sheets[i];
      if (!s) continue;

      if (s.mode === 'rest') {
        // Barely-there idle stir: a slow micro-yaw, one sheet at a time.
        const stir = 0.02 * Math.sin(t * 0.6 + s.phase) * Math.sin(t * 0.013 + s.phase * 3);
        s.mesh.quaternion
          .copy(this.qTmp.setFromAxisAngle(UP, stir))
          .multiply(s.restQuat);
        continue;
      }

      if (s.mode === 'fly') {
        // Lift + gravity with a paper terminal fall and side-slip flutter.
        s.vy -= GRAVITY * dt;
        if (s.vy < -TERMINAL_FALL) s.vy = -TERMINAL_FALL;
        const drag = Math.exp(-DRAG * dt);
        s.vx *= drag;
        s.vz *= drag;
        const slip = s.vy < 0 ? 0.55 : 0.15; // glides once it tips over
        s.mesh.position.x += (s.vx + Math.sin(t * 5.3 + s.phase) * slip) * dt;
        s.mesh.position.z += (s.vz + Math.cos(t * 4.1 + s.phase) * slip) * dt;
        s.mesh.position.y += s.vy * dt;
        // keep the disturbance inside the room
        s.mesh.position.x = Math.min(Math.max(s.mesh.position.x, -ROOM_X), ROOM_X);
        s.mesh.position.z = Math.min(Math.max(s.mesh.position.z, -ROOM_Z), ROOM_Z);
        // tumble
        s.mesh.quaternion.premultiply(
          this.qTmp.setFromAxisAngle(s.axis, s.spin * dt),
        );
        if (s.mesh.position.y <= s.restY && s.vy < 0) {
          s.mesh.position.y = s.restY;
          s.mode = 'settle';
          s.settleT = 0;
          s.settleFrom.copy(s.mesh.quaternion);
        }
        continue;
      }

      // settle: glide flat again over SETTLE_SEC (keeps the drifted XZ)
      s.settleT += dt;
      const k = Math.min(s.settleT / SETTLE_SEC, 1);
      const e = k * k * (3 - 2 * k);
      s.mesh.quaternion.slerpQuaternions(s.settleFrom, s.restQuat, e);
      if (k >= 1) s.mode = 'rest';
    }
  }

  // ── exterior leaves ──

  private updateLeaves(dt: number, wind: WindState): void {
    const t = this.time;
    const stopped = wind.stopped;
    for (let i = 0; i < this.leaves.length; i += 1) {
      const leaf = this.leaves[i];
      if (!leaf) continue;
      const m = leaf.mesh;

      let targetY = 0.04;
      let push = 0;

      if (!stopped && wind.phase === 'lash') {
        // Airborne streak downwind; height rides a flutter wave.
        push = wind.strength * (3.6 + 1.2 * Math.sin(t * 6.1 + leaf.phase));
        targetY = 0.55 + 0.4 * Math.sin(t * 3.7 + leaf.phase) + 0.2 * Math.sin(t * 8.9 + leaf.phase * 2);
      } else if (!stopped && wind.phase === 'telegraph') {
        // Skittering hops — the leaf-streak telegraph cue (DESIGN §3).
        leaf.hopT -= dt;
        if (leaf.hopT <= 0) {
          leaf.hopT = 0.45 + 0.8 * noise2(i * 7.3, t);
          leaf.vx += wind.direction.x * (0.9 + wind.strength * 1.6);
          leaf.vz += wind.direction.y * (0.9 + wind.strength * 1.6);
        }
        targetY = 0.07 + 0.08 * Math.max(Math.sin(t * 9 + leaf.phase), 0) * wind.strength * 2;
      }

      leaf.vx += wind.direction.x * push * dt;
      leaf.vz += wind.direction.y * push * dt;
      const drag = Math.exp(-(wind.phase === 'lash' ? 0.9 : 2.6) * dt);
      leaf.vx *= drag;
      leaf.vz *= drag;

      m.position.x += leaf.vx * dt;
      m.position.z += leaf.vz * dt;
      leaf.y += (targetY - leaf.y) * (1 - Math.exp(-dt * 4));
      m.position.y = leaf.y;

      // spin/tip with motion; lies down in calm
      const speed = Math.hypot(leaf.vx, leaf.vz);
      m.rotation.y += (0.8 + speed * 1.6) * dt * (i % 2 === 0 ? 1 : -1);
      const tip = Math.min(speed * 0.35, 0.9);
      m.rotation.x = -Math.PI / 2 + 0.25 + tip;

      // blown off the stage → quiet respawn at home (during calm only,
      // far from where the action is)
      const dx = m.position.x - leaf.home.x;
      const dz = m.position.z - leaf.home.z;
      if (dx * dx + dz * dz > LEAF_MAX_DRIFT * LEAF_MAX_DRIFT && wind.phase === 'calm') {
        m.position.copy(leaf.home);
        leaf.vx = 0;
        leaf.vz = 0;
        leaf.y = 0.04;
      }
    }
  }
}
