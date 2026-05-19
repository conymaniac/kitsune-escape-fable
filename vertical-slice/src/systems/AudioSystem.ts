/**
 * AudioSystem
 *
 * Thin wrapper around Phaser.Sound for music + SFX management.
 *
 * - Music tracks crossfade when switched
 * - SFX play one-shot
 * - Master mute toggleable via M key (and the on-screen toggle)
 * - Volume preferences stored in localStorage
 *
 * Audio files live in /public/audio/ (see audio/CREDITS.md for sources).
 * Preload happens in BootScene.
 */

import Phaser from "phaser";

const STORAGE_KEY = "kitsune-audio";

interface AudioPrefs {
  muted: boolean;
  musicVolume: number; // 0..1
  sfxVolume: number;
}

function readPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AudioPrefs>;
      return {
        muted: p.muted ?? false,
        musicVolume: p.musicVolume ?? 0.5,
        sfxVolume: p.sfxVolume ?? 0.7,
      };
    }
  } catch {
    // ignore
  }
  return { muted: false, musicVolume: 0.5, sfxVolume: 0.7 };
}

function writePrefs(prefs: AudioPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export class AudioSystem {
  private scene: Phaser.Scene;
  private currentMusic: Phaser.Sound.BaseSound | null = null;
  private currentMusicKey: string | null = null;
  private prefs: AudioPrefs;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.prefs = readPrefs();
    this.applyMute();
  }

  /** Crossfade to a new music track (by key loaded in BootScene). */
  playMusic(key: string, loop = true, fadeMs = 1200): void {
    if (!this.scene.cache.audio.exists(key)) {
      console.warn(`[AudioSystem] Missing music key "${key}"`);
      return;
    }
    if (this.currentMusicKey === key && this.currentMusic && this.currentMusic.isPlaying) {
      return;
    }
    // Fade out current
    if (this.currentMusic && this.currentMusic.isPlaying) {
      const old = this.currentMusic;
      this.scene.tweens.add({
        targets: old,
        volume: 0,
        duration: fadeMs,
        onComplete: () => {
          old.stop();
          old.destroy();
        },
      });
    }
    // Fade in new
    const next = this.scene.sound.add(key, {
      loop,
      volume: 0,
    });
    next.play();
    this.scene.tweens.add({
      targets: next,
      volume: this.effectiveMusicVolume(key),
      duration: fadeMs,
    });
    this.currentMusic = next;
    this.currentMusicKey = key;
  }

  /** Stop current music with optional fade. */
  stopMusic(fadeMs = 600): void {
    if (!this.currentMusic) return;
    const old = this.currentMusic;
    this.currentMusic = null;
    this.currentMusicKey = null;
    if (!old.isPlaying) {
      old.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: old,
      volume: 0,
      duration: fadeMs,
      onComplete: () => {
        old.stop();
        old.destroy();
      },
    });
  }

  /**
   * Play a looping ambient SFX (e.g. wind) and return the sound instance
   * so the caller can stop it on scene shutdown. Respects mute state.
   */
  playAmbient(key: string, volume = 0.2): Phaser.Sound.BaseSound | null {
    if (!this.scene.cache.audio.exists(key)) return null;
    const snd = this.scene.sound.add(key, {
      loop: true,
      volume: this.prefs.muted ? 0 : this.prefs.sfxVolume * volume,
    });
    snd.play();
    return snd;
  }

  /** Play a one-shot SFX. The manifest's per-key volume is multiplied with
   *  the optional runtime `volume` argument and the user's SFX preference. */
  playSfx(key: string, volume = 1): void {
    if (this.prefs.muted) return;
    if (!this.scene.cache.audio.exists(key)) {
      // Silent skip — sfx are non-essential
      return;
    }
    const manifestVol = AudioManifest.find((m) => m.key === key)?.volume ?? 1;
    this.scene.sound.play(key, {
      volume: this.prefs.sfxVolume * volume * manifestVol,
    });
  }

  toggleMute(): boolean {
    this.prefs.muted = !this.prefs.muted;
    writePrefs(this.prefs);
    this.applyMute();
    return this.prefs.muted;
  }

  isMuted(): boolean {
    return this.prefs.muted;
  }

  setMusicVolume(vol: number): void {
    this.prefs.musicVolume = Phaser.Math.Clamp(vol, 0, 1);
    writePrefs(this.prefs);
    if (this.currentMusic && "setVolume" in this.currentMusic) {
      (this.currentMusic as Phaser.Sound.WebAudioSound).setVolume(
        this.effectiveMusicVolume(this.currentMusicKey ?? undefined),
      );
    }
  }

  setSfxVolume(vol: number): void {
    this.prefs.sfxVolume = Phaser.Math.Clamp(vol, 0, 1);
    writePrefs(this.prefs);
  }

  private applyMute(): void {
    this.scene.sound.mute = this.prefs.muted;
  }

  /** Volume to apply to a music track, factoring in the manifest's per-key
   *  scale, the user's music-volume preference, and mute state. */
  private effectiveMusicVolume(key?: string): number {
    if (this.prefs.muted) return 0;
    const manifestVol = key
      ? AudioManifest.find((m) => m.key === key)?.volume ?? 1
      : 1;
    return this.prefs.musicVolume * manifestVol;
  }
}

/**
 * Static audio asset manifest. Populated by the audio subagent when files
 * are downloaded into /public/audio/. Each entry is loaded in BootScene.
 *
 * The keys here are referenced from scenes (e.g. audio.playMusic("music-title"))
 * so they must stay stable even if the file source/credit changes.
 */
export interface AudioManifestEntry {
  key: string;
  path: string;
  type: "music" | "sfx";
  /** Optional volume scaling applied at preload time (Phaser.Sound config). */
  volume?: number;
}

export const AudioManifest: AudioManifestEntry[] = [
  // --- Music (looping background tracks; fade-mixed by AudioSystem) ---------
  { key: "music-title",   path: "audio/music/title.mp3",   type: "music", volume: 0.55 },
  { key: "music-willow",  path: "audio/music/willow.ogg",  type: "music", volume: 0.5 },
  { key: "music-cottage", path: "audio/music/cottage.mp3", type: "music", volume: 0.45 },

  // --- SFX (one-shot) -------------------------------------------------------
  { key: "sfx-wind",        path: "audio/sfx/wind.ogg",        type: "sfx", volume: 0.2 },
  { key: "sfx-footstep",    path: "audio/sfx/footstep.ogg",    type: "sfx", volume: 0.35 },
  { key: "sfx-jump",        path: "audio/sfx/jump.ogg",        type: "sfx", volume: 0.5 },
  { key: "sfx-transform",   path: "audio/sfx/transform.ogg",   type: "sfx", volume: 0.7 },
  { key: "sfx-interact",    path: "audio/sfx/interact.ogg",    type: "sfx", volume: 0.6 },
  { key: "sfx-dialog-blip", path: "audio/sfx/dialog-blip.ogg", type: "sfx", volume: 0.15 },
  { key: "sfx-pickup",      path: "audio/sfx/pickup.ogg",      type: "sfx", volume: 0.7 },
  { key: "sfx-cut",         path: "audio/sfx/cut.ogg",         type: "sfx", volume: 0.7 },
];
