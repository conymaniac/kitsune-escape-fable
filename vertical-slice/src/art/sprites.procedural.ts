/**
 * Procedural sprite generator.
 *
 * Instead of loading PNG assets, we generate textures programmatically using
 * Phaser's Graphics API at boot time. This keeps the slice self-contained and
 * easy to iterate on without an art pipeline. Each function draws to a
 * Graphics object then exports it to a named texture in the scene's texture
 * manager.
 *
 * Generated texture keys (use these in scenes):
 *   - "mizumi-human"   64x96  girl in dark kimono with long hair
 *   - "mizumi-fox"     64x40  small fox silhouette in orange
 *   - "yanagi-onna"    72x110 ghostly woman in purple kimono with baby
 *   - "willow-tree"    300x420 willow with drooping branches
 *   - "cottage-ext"    420x300 traditional cottage exterior
 *   - "cottage-int-bg" 1280x720 cottage interior background
 *   - "futon"          150x60  futon bed
 *   - "dining-table"   140x70  low table with dishes
 *   - "papers"         80x60   scattered paper sheets
 *   - "dagger"         48x16   small dagger
 *   - "sandals"        70x32   sandals blocking door
 *   - "window-glow"    120x140 open window glow
 *   - "lake-bg"        1920x720 night lake background (parallax-ready)
 *   - "moon"           120x120 full moon
 *   - "lantern"        24x40   hanging paper lantern (small NPC marker)
 *   - "particle"       8x8     soft cream particle for fox fire
 */

import Phaser from "phaser";
import { Palette } from "./palette";

type TM = Phaser.Textures.TextureManager;

/** Helper: draw to graphics, export to texture, destroy graphics. */
function bake(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  drawFn: (g: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics({ x: 0, y: 0 });
  drawFn(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

// ============ CHARACTERS ============

function drawMizumiHuman(g: Phaser.GameObjects.Graphics): void {
  // Body shape - simplified, side-facing
  // Dark hair (large flowing back)
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(14, 6, 28, 70);
  // Hair strands
  g.fillStyle(Palette.dark, 1);
  g.fillRect(10, 26, 8, 56);
  // Head
  g.fillStyle(Palette.cream, 1);
  g.fillCircle(32, 18, 11);
  // Face shadow / hair fringe
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(22, 6, 22, 10);
  // Eye accent (orange)
  g.fillStyle(Palette.orange, 1);
  g.fillRect(36, 16, 2, 2);
  // Kimono top (dark)
  g.fillStyle(Palette.darkSoft, 1);
  g.fillRect(18, 30, 30, 30);
  // Kimono accent (orange sash)
  g.fillStyle(Palette.orange, 1);
  g.fillRect(18, 42, 30, 4);
  // Skirt / hakama
  g.fillStyle(Palette.darkSoft, 1);
  g.fillRect(18, 60, 30, 28);
  // Orange skirt accent (the floating fabric from pitch art)
  g.fillStyle(Palette.orangeDeep, 1);
  g.fillRect(38, 60, 12, 32);
  // Legs / boots
  g.fillStyle(Palette.dark, 1);
  g.fillRect(20, 86, 10, 10);
  g.fillRect(36, 86, 10, 10);
}

function drawMizumiFox(g: Phaser.GameObjects.Graphics): void {
  // Fox body (compact, side-facing, orange)
  g.fillStyle(Palette.foxOrange, 1);
  g.fillRect(10, 18, 36, 14); // body
  g.fillStyle(Palette.foxOrangeLight, 1);
  g.fillRect(10, 22, 36, 6); // belly highlight
  // Head
  g.fillStyle(Palette.foxOrange, 1);
  g.fillTriangle(40, 16, 56, 18, 44, 28);
  g.fillRect(38, 16, 16, 12);
  // Snout
  g.fillStyle(Palette.cream, 1);
  g.fillRect(50, 24, 6, 4);
  // Nose
  g.fillStyle(Palette.dark, 1);
  g.fillRect(55, 24, 2, 2);
  // Ears
  g.fillStyle(Palette.foxOrange, 1);
  g.fillTriangle(40, 16, 44, 8, 47, 16);
  g.fillTriangle(50, 16, 54, 8, 56, 16);
  g.fillStyle(Palette.dark, 1);
  g.fillTriangle(42, 14, 44, 10, 46, 14);
  // Eye
  g.fillStyle(Palette.gold, 1);
  g.fillRect(48, 19, 2, 2);
  // Legs
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(14, 30, 4, 8);
  g.fillRect(22, 30, 4, 8);
  g.fillRect(32, 30, 4, 8);
  g.fillRect(40, 30, 4, 8);
  // Tail (big, curved, the iconic kitsune trait)
  g.fillStyle(Palette.foxOrange, 1);
  g.fillRect(0, 14, 14, 12);
  g.fillTriangle(0, 14, 0, 26, -4, 20);
  // Tail tip - cream
  g.fillStyle(Palette.cream, 1);
  g.fillRect(0, 18, 6, 6);
}

function drawYanagiOnna(g: Phaser.GameObjects.Graphics): void {
  // Long flowing purple kimono
  g.fillStyle(Palette.purple, 1);
  g.fillRect(18, 30, 36, 70);
  // Kimono shading
  g.fillStyle(Palette.purpleDeep, 1);
  g.fillRect(18, 70, 36, 30);
  // Floral pattern accents
  g.fillStyle(Palette.creamSoft, 1);
  g.fillCircle(24, 50, 3);
  g.fillCircle(40, 65, 2);
  g.fillCircle(48, 82, 2);
  // Long black hair flowing down
  g.fillStyle(Palette.dark, 1);
  g.fillRect(20, 8, 30, 64);
  g.fillRect(16, 20, 8, 50);
  g.fillRect(50, 20, 8, 50);
  // Pale ghostly face
  g.fillStyle(0xeae5d4, 1);
  g.fillCircle(36, 18, 10);
  // Sad eye (dark hollow)
  g.fillStyle(Palette.dark, 1);
  g.fillRect(32, 16, 3, 2);
  g.fillRect(38, 16, 3, 2);
  // Crying mouth (small)
  g.fillStyle(Palette.redClay, 1);
  g.fillRect(34, 22, 4, 1);
  // Baby in arms (wrapped bundle)
  g.fillStyle(Palette.creamSoft, 1);
  g.fillRect(8, 50, 22, 18);
  // Bundle wrap detail
  g.fillStyle(Palette.cream, 1);
  g.fillRect(10, 54, 18, 10);
  // Tiny baby face peeking
  g.fillStyle(0xeae5d4, 1);
  g.fillCircle(14, 56, 4);
}

// ============ ENVIRONMENT ============

function drawWillowTree(g: Phaser.GameObjects.Graphics): void {
  // Trunk
  g.fillStyle(Palette.bark, 1);
  g.fillRect(140, 100, 30, 250);
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(140, 100, 8, 250); // bark shadow
  // Trunk knot
  g.fillStyle(Palette.barkDark, 1);
  g.fillCircle(155, 200, 6);
  // Canopy base
  g.fillStyle(Palette.willow, 1);
  g.fillEllipse(150, 90, 280, 80);
  // Drooping branches (the iconic willow trait, AND the murderer in our story)
  g.lineStyle(2, Palette.willow, 1);
  for (let i = 0; i < 24; i++) {
    const x = 20 + i * 11;
    const variance = (i % 3) * 12;
    g.lineBetween(x, 80, x + variance - 6, 80 + 200 + variance);
  }
  // Leaf clusters along branches
  g.fillStyle(Palette.leafLight, 0.8);
  for (let i = 0; i < 18; i++) {
    const x = 30 + i * 14;
    const y = 100 + (i % 4) * 50;
    g.fillCircle(x, y, 3);
  }
}

function drawCottageExt(g: Phaser.GameObjects.Graphics): void {
  // Wall (cream paper / wood)
  g.fillStyle(Palette.paper, 1);
  g.fillRect(40, 140, 340, 130);
  // Wooden framing
  g.fillStyle(Palette.bark, 1);
  g.fillRect(40, 140, 340, 8);
  g.fillRect(40, 262, 340, 8);
  g.fillRect(40, 140, 8, 130);
  g.fillRect(372, 140, 8, 130);
  // Vertical wood beams
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(140, 148, 4, 114);
  g.fillRect(280, 148, 4, 114);
  // Thatched roof
  g.fillStyle(Palette.barkDark, 1);
  g.fillTriangle(20, 140, 400, 140, 210, 30);
  // Roof texture lines
  g.lineStyle(1, Palette.bark, 0.6);
  for (let i = 0; i < 10; i++) {
    g.lineBetween(40 + i * 32, 140 - i * 5, 60 + i * 32, 140 - i * 5);
  }
  // Door (closed, dark)
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(180, 180, 60, 88);
  // Door panels
  g.fillStyle(Palette.bark, 1);
  g.fillRect(184, 184, 26, 80);
  g.fillRect(214, 184, 26, 80);
  // Window (left, open with warm glow)
  g.fillStyle(Palette.gold, 1);
  g.fillRect(70, 170, 50, 56);
  g.fillStyle(Palette.orangeDeep, 0.6);
  g.fillRect(70, 170, 50, 56);
  // Window frame cross
  g.lineStyle(3, Palette.barkDark, 1);
  g.strokeRect(70, 170, 50, 56);
  g.lineBetween(95, 170, 95, 226);
  g.lineBetween(70, 198, 120, 198);
  // Right window (closed, dark)
  g.fillStyle(Palette.dark, 1);
  g.fillRect(300, 170, 50, 56);
  g.lineStyle(3, Palette.barkDark, 1);
  g.strokeRect(300, 170, 50, 56);
}

function drawCottageIntBg(g: Phaser.GameObjects.Graphics): void {
  // Floor (tatami)
  g.fillStyle(Palette.creamSoft, 1);
  g.fillRect(0, 520, 1280, 200);
  // Tatami divisions
  g.lineStyle(2, Palette.bark, 0.4);
  for (let i = 0; i < 7; i++) {
    g.lineBetween(i * 180, 520, i * 180, 720);
  }
  g.lineBetween(0, 600, 1280, 600);
  // Back wall (paper panels)
  g.fillStyle(Palette.paper, 1);
  g.fillRect(0, 100, 1280, 420);
  // Wooden floor beam separating wall and floor
  g.fillStyle(Palette.bark, 1);
  g.fillRect(0, 515, 1280, 8);
  // Paper panel grid (shoji)
  g.lineStyle(2, Palette.bark, 0.5);
  for (let i = 0; i <= 8; i++) {
    g.lineBetween(i * 160, 100, i * 160, 520);
  }
  for (let i = 0; i <= 4; i++) {
    g.lineBetween(0, 100 + i * 105, 1280, 100 + i * 105);
  }
  // Ceiling beams
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(0, 80, 1280, 24);
  // Open window left (broken in by player as fox)
  g.fillStyle(Palette.night, 1);
  g.fillRect(180, 180, 120, 140);
  g.lineStyle(4, Palette.barkDark, 1);
  g.strokeRect(180, 180, 120, 140);
  // Stars through window
  g.fillStyle(Palette.cream, 1);
  g.fillCircle(220, 220, 1);
  g.fillCircle(260, 240, 1.5);
  g.fillCircle(240, 280, 1);
}

function drawFuton(g: Phaser.GameObjects.Graphics): void {
  // Mattress
  g.fillStyle(0x9a8a6a, 1);
  g.fillRect(0, 20, 150, 38);
  // Stains (yellow tint, sadly)
  g.fillStyle(0xb89c5a, 0.6);
  g.fillEllipse(50, 38, 30, 12);
  g.fillEllipse(110, 42, 24, 10);
  // Pillow
  g.fillStyle(Palette.cream, 1);
  g.fillRect(8, 8, 36, 22);
  // Dust speckles
  g.fillStyle(Palette.dark, 0.4);
  for (let i = 0; i < 20; i++) {
    g.fillCircle(Math.random() * 150, 20 + Math.random() * 38, 0.8);
  }
}

function drawDiningTable(g: Phaser.GameObjects.Graphics): void {
  // Low wood table
  g.fillStyle(Palette.bark, 1);
  g.fillRect(0, 20, 140, 14);
  // Legs
  g.fillStyle(Palette.barkDark, 1);
  g.fillRect(4, 34, 10, 36);
  g.fillRect(126, 34, 10, 36);
  // Two plates
  g.fillStyle(Palette.cream, 1);
  g.fillCircle(35, 18, 14);
  g.fillCircle(105, 18, 14);
  // Moldy food (greenish)
  g.fillStyle(0x4a5a30, 0.9);
  g.fillCircle(35, 18, 9);
  g.fillCircle(105, 18, 9);
  g.fillStyle(0x6b7f44, 0.6);
  g.fillCircle(33, 17, 5);
  g.fillCircle(107, 19, 4);
  // Spoons
  g.fillStyle(Palette.gold, 1);
  g.fillRect(46, 16, 12, 2);
  g.fillRect(116, 16, 12, 2);
}

function drawPapers(g: Phaser.GameObjects.Graphics): void {
  // Scattered paper sheets
  g.fillStyle(Palette.cream, 1);
  g.fillRect(0, 10, 32, 42);
  g.fillRect(20, 22, 32, 38);
  g.fillRect(46, 6, 30, 44);
  // Ink lines simulating handwritten text
  g.lineStyle(1, Palette.darkSoft, 0.7);
  for (let i = 0; i < 6; i++) {
    g.lineBetween(2, 14 + i * 5, 28, 14 + i * 5);
  }
  for (let i = 0; i < 5; i++) {
    g.lineBetween(22, 26 + i * 5, 48, 26 + i * 5);
  }
  for (let i = 0; i < 7; i++) {
    g.lineBetween(48, 10 + i * 5, 74, 10 + i * 5);
  }
}

function drawDagger(g: Phaser.GameObjects.Graphics): void {
  // Blade (steel)
  g.fillStyle(0xcfcfd4, 1);
  g.fillTriangle(0, 8, 32, 8, 0, 16);
  g.fillRect(0, 8, 32, 8);
  // Blade highlight
  g.fillStyle(Palette.cream, 1);
  g.fillRect(2, 10, 28, 1);
  // Guard
  g.fillStyle(Palette.gold, 1);
  g.fillRect(32, 4, 4, 16);
  // Handle (wrapped)
  g.fillStyle(Palette.darkSoft, 1);
  g.fillRect(36, 8, 12, 8);
  // Wrapping detail
  g.fillStyle(Palette.bark, 1);
  for (let i = 0; i < 4; i++) {
    g.fillRect(36 + i * 3, 8, 1, 8);
  }
}

function drawSandals(g: Phaser.GameObjects.Graphics): void {
  // Two sandals
  g.fillStyle(Palette.bark, 1);
  g.fillEllipse(18, 18, 28, 12);
  g.fillEllipse(52, 18, 28, 12);
  // Straps
  g.fillStyle(Palette.redClay, 1);
  g.fillRect(16, 8, 4, 14);
  g.fillRect(50, 8, 4, 14);
  // Straps Y
  g.lineStyle(2, Palette.redClay, 1);
  g.lineBetween(10, 18, 18, 12);
  g.lineBetween(26, 18, 18, 12);
  g.lineBetween(44, 18, 52, 12);
  g.lineBetween(60, 18, 52, 12);
}

function drawWindowGlow(g: Phaser.GameObjects.Graphics): void {
  // Soft glowing window outline (interaction marker)
  g.fillStyle(Palette.gold, 0.3);
  g.fillRect(0, 0, 120, 140);
  g.fillStyle(Palette.gold, 0.5);
  g.fillRect(10, 10, 100, 120);
  g.lineStyle(2, Palette.gold, 0.9);
  g.strokeRect(0, 0, 120, 140);
}

function drawLakeBg(g: Phaser.GameObjects.Graphics): void {
  // Night sky gradient (stepped)
  const skyTones = [0x0d0814, 0x16102a, 0x1f1845, 0x2a2055];
  for (let i = 0; i < skyTones.length; i++) {
    g.fillStyle(skyTones[i], 1);
    g.fillRect(0, i * 100, 1920, 100);
  }
  // Far mountains silhouette
  g.fillStyle(0x1a1430, 1);
  for (let i = 0; i < 8; i++) {
    g.fillTriangle(
      i * 240,
      420,
      i * 240 + 120,
      300 + (i % 3) * 30,
      i * 240 + 240,
      420
    );
  }
  // Mid ground hills
  g.fillStyle(0x0f0a1c, 1);
  g.fillRect(0, 420, 1920, 60);
  // Lake water (deep purple-blue, calm)
  g.fillStyle(0x251a40, 1);
  g.fillRect(0, 480, 1920, 100);
  // Lake reflections (subtle horizontal lines)
  g.lineStyle(1, Palette.purple, 0.3);
  for (let i = 0; i < 8; i++) {
    g.lineBetween(0, 490 + i * 12, 1920, 490 + i * 12);
  }
  // Foreground ground (dark earth)
  g.fillStyle(0x1a1208, 1);
  g.fillRect(0, 580, 1920, 140);
  // Tiny stars
  g.fillStyle(Palette.cream, 1);
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 1920;
    const y = Math.random() * 350;
    g.fillCircle(x, y, Math.random() * 1.5);
  }
}

function drawMoon(g: Phaser.GameObjects.Graphics): void {
  // Soft glow halo
  g.fillStyle(Palette.gold, 0.15);
  g.fillCircle(60, 60, 58);
  g.fillStyle(Palette.gold, 0.25);
  g.fillCircle(60, 60, 48);
  // Moon body
  g.fillStyle(0xf5edcf, 1);
  g.fillCircle(60, 60, 36);
  // Craters
  g.fillStyle(0xd8cca0, 0.7);
  g.fillCircle(50, 50, 5);
  g.fillCircle(72, 58, 4);
  g.fillCircle(58, 70, 3);
}

function drawLantern(g: Phaser.GameObjects.Graphics): void {
  // String
  g.lineStyle(1, Palette.darkSoft, 1);
  g.lineBetween(12, 0, 12, 6);
  // Lantern body (warm glow)
  g.fillStyle(Palette.orangeDeep, 1);
  g.fillRect(2, 6, 20, 28);
  g.fillStyle(Palette.gold, 1);
  g.fillRect(4, 8, 16, 24);
  // Top + bottom caps
  g.fillStyle(Palette.dark, 1);
  g.fillRect(0, 4, 24, 4);
  g.fillRect(0, 34, 24, 4);
  // Vertical stripes
  g.lineStyle(1, Palette.redClay, 1);
  g.lineBetween(8, 8, 8, 32);
  g.lineBetween(16, 8, 16, 32);
}

function drawParticle(g: Phaser.GameObjects.Graphics): void {
  // Soft fox-fire particle
  g.fillStyle(Palette.gold, 0.6);
  g.fillCircle(4, 4, 4);
  g.fillStyle(Palette.cream, 1);
  g.fillCircle(4, 4, 2);
}

// ============ PUBLIC API ============

/**
 * Generate all textures into the scene's texture manager.
 * Call this from BootScene.preload or create.
 */
export function generateAllSprites(scene: Phaser.Scene): void {
  bake(scene, "mizumi-human", 64, 96, drawMizumiHuman);
  bake(scene, "mizumi-fox", 64, 40, drawMizumiFox);
  bake(scene, "yanagi-onna", 72, 110, drawYanagiOnna);
  bake(scene, "willow-tree", 300, 420, drawWillowTree);
  bake(scene, "cottage-ext", 420, 300, drawCottageExt);
  bake(scene, "cottage-int-bg", 1280, 720, drawCottageIntBg);
  bake(scene, "futon", 150, 70, drawFuton);
  bake(scene, "dining-table", 140, 70, drawDiningTable);
  bake(scene, "papers", 80, 60, drawPapers);
  bake(scene, "dagger", 48, 24, drawDagger);
  bake(scene, "sandals", 70, 32, drawSandals);
  bake(scene, "window-glow", 120, 140, drawWindowGlow);
  bake(scene, "lake-bg", 1920, 720, drawLakeBg);
  bake(scene, "moon", 120, 120, drawMoon);
  bake(scene, "lantern", 24, 40, drawLantern);
  bake(scene, "particle", 8, 8, drawParticle);
}
