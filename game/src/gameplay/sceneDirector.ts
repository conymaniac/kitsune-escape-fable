/**
 * SceneDirector — owns which build (exterior/interior) is live
 * (TECH_SPEC §1 gameplay/sceneDirector.ts, pillar 1: two THREE.Scene
 * instances, swapped behind a 0.3 s DOM ink-fade — no roof-hiding).
 *
 * enterInterior(spawn) / exitToExterior(spawn):
 *   fadeToBlack(0.3) → re-parent the player avatar root + vfx root into
 *   the other scene, swap the player collider set, teleport to the spawn
 *   anchor, tween camera viewHeight (14 ↔ 9) + swap camera bounds, pause/
 *   resume gusts (DESIGN §3: no gust cycle in the cottage), emit
 *   EnterInterior/ExitInterior → fadeFromBlack(0.3).
 */
import type * as THREE from 'three';
import type { ColliderShape } from '@/core/types';
import type { EventBus } from '@/core/events';
import type { IScreens } from '@/core/types';
import type { CameraBounds, IsoCamera } from '@/engine/camera';
import { VIEW_HEIGHT_EXTERIOR, VIEW_HEIGHT_INTERIOR } from '@/engine/camera';
import type { PlayerController } from '@/gameplay/player';
import type { WindSystem } from '@/gameplay/wind';

const FADE_SEC = 0.3;
const VIEW_TWEEN_SEC = 0.45;

export type ActiveSceneName = 'exterior' | 'interior';

export interface SceneSlot {
  scene: THREE.Scene;
  /** LIVE collider array reference (the gate splices in place). */
  colliders: readonly ColliderShape[];
  bounds: CameraBounds | null;
}

export interface SceneDirectorOptions {
  bus: EventBus;
  screens: IScreens;
  camera: IsoCamera;
  player: PlayerController;
  /** Objects that travel with the player between scene graphs. */
  travellers: THREE.Object3D[];
  wind: WindSystem;
  exterior: SceneSlot;
  interior: SceneSlot;
}

export class SceneDirector {
  private readonly opts: SceneDirectorOptions;
  private activeName: ActiveSceneName = 'exterior';
  private swapping = false;

  constructor(opts: SceneDirectorOptions) {
    this.opts = opts;
    // Boot state: everything lives in the exterior.
    for (const obj of opts.travellers) opts.exterior.scene.add(obj);
    opts.player.setColliders(opts.exterior.colliders);
    opts.camera.setBounds(opts.exterior.bounds);
    opts.camera.setViewHeight(VIEW_HEIGHT_EXTERIOR);
  }

  get active(): ActiveSceneName {
    return this.activeName;
  }

  get activeScene(): THREE.Scene {
    return this.activeName === 'exterior' ? this.opts.exterior.scene : this.opts.interior.scene;
  }

  isSwapping(): boolean {
    return this.swapping;
  }

  /** Fox window-leap / (later) sandals path — into the cottage. */
  async enterInterior(spawnAnchor: THREE.Vector3): Promise<void> {
    if (this.activeName === 'interior' || this.swapping) return;
    await this.swap('interior', spawnAnchor);
    this.opts.bus.emit('EnterInterior');
  }

  /** Door/sandals/window — back out into the night. */
  async exitToExterior(spawnAnchor: THREE.Vector3): Promise<void> {
    if (this.activeName === 'exterior' || this.swapping) return;
    await this.swap('exterior', spawnAnchor);
    this.opts.bus.emit('ExitInterior');
  }

  // ── internals ──

  private async swap(to: ActiveSceneName, spawnAnchor: THREE.Vector3): Promise<void> {
    const opts = this.opts;
    this.swapping = true;
    opts.player.lockControls(FADE_SEC * 2 + 0.1);

    await opts.screens.fadeToBlack(FADE_SEC);

    const target = to === 'interior' ? opts.interior : opts.exterior;
    for (const obj of opts.travellers) target.scene.add(obj); // re-parents
    opts.player.setColliders(target.colliders);
    opts.player.teleport(spawnAnchor);
    opts.camera.setBounds(target.bounds);
    opts.camera.setViewHeight(
      to === 'interior' ? VIEW_HEIGHT_INTERIOR : VIEW_HEIGHT_EXTERIOR,
      VIEW_TWEEN_SEC,
    );
    opts.camera.snapTo(spawnAnchor);
    opts.wind.setEnabled(to === 'exterior');
    this.activeName = to;

    await opts.screens.fadeFromBlack(FADE_SEC);
    this.swapping = false;
  }
}
