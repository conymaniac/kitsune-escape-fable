/**
 * Hand-drawn sprite variant.
 *
 * Produces the same texture keys at the same dimensions as
 * sprites.procedural.ts, but using sketchy multi-stroke outlines,
 * watercolor washes, paper-grain noise, sumi-e ink silhouettes and
 * hatching to fake a hand-illustrated, slightly grungy folkloric look.
 *
 * All techniques use only Phaser's Graphics API + Phaser.Math RNG.
 */

import Phaser from "phaser";
import { Palette } from "./palette";

// ============ DRAW UTILITIES ============

const rnd = Phaser.Math.Between;
const rndf = Phaser.Math.FloatBetween;

/** Bake helper. Mirrors procedural version. */
function bake(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics({ x: 0, y: 0 });
  draw(g);
  g.generateTexture(key, width, height);
  g.destroy();
}

/**
 * Draw a "sketchy" line: same segment drawn 2-3 times with small endpoint
 * jitter and varying alpha. Mimics a hand pencil/ink line.
 */
function sketchLine(
  g: Phaser.GameObjects.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width = 1,
  passes = 2,
  jitter = 1
): void {
  for (let i = 0; i < passes; i++) {
    g.lineStyle(width, color, rndf(0.55, 0.95));
    g.lineBetween(
      x1 + rndf(-jitter, jitter),
      y1 + rndf(-jitter, jitter),
      x2 + rndf(-jitter, jitter),
      y2 + rndf(-jitter, jitter)
    );
  }
}

/**
 * Sketchy rectangle outline. Draws four sketchLines.
 */
function sketchRect(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  width = 1,
  passes = 2,
  jitter = 1
): void {
  sketchLine(g, x, y, x + w, y, color, width, passes, jitter);
  sketchLine(g, x + w, y, x + w, y + h, color, width, passes, jitter);
  sketchLine(g, x + w, y + h, x, y + h, color, width, passes, jitter);
  sketchLine(g, x, y + h, x, y, color, width, passes, jitter);
}

/**
 * Watercolor wash: many overlapping low-alpha circles in palette-nearby tones.
 * Cheaply mimics wet pigment pooling.
 */
function watercolorBlob(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  colors: number[],
  count = 14,
  alphaMin = 0.18,
  alphaMax = 0.45
): void {
  for (let i = 0; i < count; i++) {
    const c = colors[rnd(0, colors.length - 1)];
    g.fillStyle(c, rndf(alphaMin, alphaMax));
    g.fillCircle(
      cx + rndf(-rx * 0.6, rx * 0.6),
      cy + rndf(-ry * 0.6, ry * 0.6),
      rndf(Math.min(rx, ry) * 0.35, Math.min(rx, ry) * 0.85)
    );
  }
}

/**
 * Soft edge bleed: a slightly larger, lower-alpha ellipse under the main shape.
 */
function softBleed(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  alpha = 0.3
): void {
  g.fillStyle(color, alpha);
  g.fillEllipse(cx, cy, rx * 2.2, ry * 2.2);
}

/**
 * Paper-grain noise: scatter tiny dots inside the given AABB to fake paper.
 */
function paperGrain(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  count = 60,
  light: number = Palette.cream,
  dark: number = Palette.darkSoft
): void {
  for (let i = 0; i < count; i++) {
    const c = Math.random() < 0.5 ? light : dark;
    g.fillStyle(c, rndf(0.08, 0.28));
    const size = rndf(0.5, 1.6);
    g.fillRect(x + Math.random() * w, y + Math.random() * h, size, size);
  }
}

/**
 * Hatching: diagonal short strokes packed in a rect. Cross-hatched if dense=true.
 */
function hatch(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
  spacing = 4,
  alpha = 0.35,
  cross = false
): void {
  g.lineStyle(1, color, alpha);
  for (let d = -h; d < w; d += spacing) {
    const x1 = Math.max(x + d, x);
    const y1 = Math.max(y - d + (d < 0 ? -d : 0), y);
    const x2 = Math.min(x + d + h, x + w);
    const y2 = y + Math.min(h, x + w - (x + d));
    g.lineBetween(
      x + d + rndf(-0.5, 0.5),
      y + rndf(-0.5, 0.5),
      x + d + h + rndf(-0.5, 0.5),
      y + h + rndf(-0.5, 0.5)
    );
  }
  if (cross) {
    for (let d = 0; d < w + h; d += spacing) {
      g.lineBetween(
        x + d + rndf(-0.5, 0.5),
        y + h + rndf(-0.5, 0.5),
        x + d - h + rndf(-0.5, 0.5),
        y + rndf(-0.5, 0.5)
      );
    }
  }
}

/**
 * Sumi-e ink silhouette with ragged jittered edges.
 * Given a list of [x,y] points along the silhouette top edge, fills down to baseY.
 */
function inkSilhouette(
  g: Phaser.GameObjects.Graphics,
  points: Array<[number, number]>,
  baseY: number,
  color: number,
  alpha = 1
): void {
  if (points.length < 2) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(points[0][0], baseY);
  for (const p of points) {
    g.lineTo(p[0] + rndf(-1.5, 1.5), p[1] + rndf(-2, 2));
  }
  g.lineTo(points[points.length - 1][0], baseY);
  g.closePath();
  g.fillPath();
}

// ============ CHARACTERS ============

function drawMizumiHuman(g: Phaser.GameObjects.Graphics): void {
  // ---- Soft bleed under whole figure ----
  softBleed(g, 32, 70, 18, 24, Palette.darkSoft, 0.22);

  // ---- Hair backdrop (solid silhouette, behind body) ----
  g.fillStyle(Palette.dark, 0.98);
  g.fillEllipse(30, 18, 22, 20);            // head/hair top
  g.fillRect(20, 16, 22, 50);               // long hair body flowing back
  g.fillTriangle(20, 60, 16, 78, 26, 64);   // hair tail flaring left

  // ---- Face (solid cream, side-facing) ----
  g.fillStyle(Palette.cream, 0.98);
  g.fillEllipse(34, 20, 16, 18);
  // cheek warmth
  g.fillStyle(Palette.orange, 0.22);
  g.fillCircle(38, 23, 2.5);

  // ---- Kimono body (solid dark silhouette) ----
  g.fillStyle(Palette.dark, 0.97);
  g.fillRect(20, 30, 28, 50);
  // shoulder taper
  g.fillTriangle(20, 30, 26, 28, 20, 34);
  g.fillTriangle(48, 30, 42, 28, 48, 34);
  // skirt flare
  g.fillTriangle(20, 78, 16, 90, 24, 80);
  g.fillTriangle(48, 78, 52, 90, 44, 80);
  g.fillRect(18, 78, 32, 12);

  // ---- Orange sash (the signature accent — solid, bold) ----
  g.fillStyle(Palette.orange, 0.98);
  g.fillRect(20, 52, 28, 8);
  // sash trailing fold
  g.fillStyle(Palette.orangeDeep, 0.95);
  g.fillTriangle(48, 52, 54, 64, 48, 60);
  // soft bleed under sash for warmth
  softBleed(g, 34, 56, 14, 3, Palette.orange, 0.25);

  // ---- Hair fringe (3 short ink strokes over forehead) ----
  sketchLine(g, 28, 12, 30, 18, Palette.dark, 1, 2, 0.6);
  sketchLine(g, 32, 11, 33, 17, Palette.dark, 1, 2, 0.6);
  sketchLine(g, 36, 12, 38, 17, Palette.dark, 1, 2, 0.6);

  // ---- Face details (crisp) ----
  g.fillStyle(Palette.dark, 0.95);
  g.fillRect(37, 19, 2, 2);                 // eye
  sketchLine(g, 37, 25, 40, 25, Palette.redClay, 1, 1, 0.3); // mouth

  // ---- Sketchy ink outline along silhouette ----
  sketchLine(g, 20, 30, 20, 78, Palette.barkDark, 1, 2, 1);  // left body
  sketchLine(g, 48, 30, 48, 78, Palette.barkDark, 1, 2, 1);  // right body
  sketchLine(g, 18, 90, 50, 90, Palette.barkDark, 1, 2, 1);  // hem
  sketchLine(g, 26, 28, 42, 28, Palette.barkDark, 1, 2, 1);  // shoulders
  // sash outline
  sketchLine(g, 20, 52, 48, 52, Palette.barkDark, 1, 2, 0.6);
  sketchLine(g, 20, 60, 48, 60, Palette.barkDark, 1, 2, 0.6);

  // ---- Feet ----
  g.fillStyle(Palette.barkDark, 0.95);
  g.fillRect(22, 90, 8, 4);
  g.fillRect(38, 90, 8, 4);

  // ---- Light paper grain ----
  paperGrain(g, 8, 0, 56, 96, 28, Palette.cream, Palette.dark);
}

function drawMizumiFox(g: Phaser.GameObjects.Graphics): void {
  // ---- Soft warm bleed under whole shape ----
  softBleed(g, 32, 28, 22, 6, Palette.foxOrangeLight, 0.25);

  // ---- Tail (big sweeping shape to the LEFT, solid orange) ----
  g.fillStyle(Palette.foxOrange, 0.98);
  g.fillTriangle(2, 22, 22, 18, 22, 28);
  g.fillEllipse(8, 22, 14, 10);
  // cream tail tip (solid)
  g.fillStyle(Palette.cream, 0.95);
  g.fillEllipse(3, 22, 7, 6);

  // ---- Body (solid orange ellipse, compact, right) ----
  g.fillStyle(Palette.foxOrange, 0.98);
  g.fillEllipse(34, 24, 28, 12);
  // cream belly
  g.fillStyle(Palette.cream, 0.95);
  g.fillEllipse(34, 29, 22, 5);

  // ---- Head (solid orange) ----
  g.fillStyle(Palette.foxOrange, 0.98);
  g.fillEllipse(50, 22, 14, 12);
  // snout cream
  g.fillStyle(Palette.cream, 0.95);
  g.fillEllipse(55, 25, 8, 5);
  // nose
  g.fillStyle(Palette.dark, 1);
  g.fillCircle(57, 24, 1);

  // ---- Ears (solid triangles up top) ----
  g.fillStyle(Palette.foxOrange, 0.98);
  g.fillTriangle(44, 16, 46, 8, 49, 16);
  g.fillTriangle(52, 16, 54, 8, 57, 16);
  // ear inner dark
  g.fillStyle(Palette.barkDark, 0.85);
  g.fillTriangle(45, 14, 46, 10, 48, 14);
  g.fillTriangle(53, 14, 54, 10, 56, 14);

  // ---- Eye (gold pupil dot) ----
  g.fillStyle(Palette.gold, 1);
  g.fillRect(48, 20, 2, 2);
  g.fillStyle(Palette.dark, 1);
  g.fillRect(49, 21, 1, 1);

  // ---- Legs (short solid) ----
  g.fillStyle(Palette.foxOrange, 0.98);
  for (const lx of [24, 32, 40]) {
    g.fillRect(lx, 28, 3, 8);
  }
  // leg tips dark
  g.fillStyle(Palette.barkDark, 0.9);
  for (const lx of [24, 32, 40]) {
    g.fillRect(lx, 34, 3, 2);
  }

  // ---- Sketchy ink outline (2 passes) ----
  sketchLine(g, 22, 18, 44, 17, Palette.barkDark, 1, 2, 0.8);  // back
  sketchLine(g, 22, 30, 44, 30, Palette.barkDark, 1, 2, 0.8);  // belly
  sketchLine(g, 44, 17, 57, 16, Palette.barkDark, 1, 2, 0.8);  // head top
  sketchLine(g, 57, 16, 58, 24, Palette.darkSoft, 1, 2, 0.6);  // head front
  sketchLine(g, 22, 18, 8, 18, Palette.barkDark, 1, 2, 1);     // tail top
  sketchLine(g, 22, 28, 8, 26, Palette.barkDark, 1, 2, 1);     // tail bottom
  // tail fur strokes
  for (let i = 0; i < 4; i++) {
    sketchLine(g, 4 + i * 4, 18 + rndf(-1, 1), 14 + i * 2, 22 + rndf(-2, 2),
      Palette.orangeDeep, 1, 1, 0.4);
  }

  paperGrain(g, 0, 0, 64, 40, 22, Palette.cream, Palette.darkSoft);
}

function drawYanagiOnna(g: Phaser.GameObjects.Graphics): void {
  // ---- Ghostly bleed under whole figure ----
  softBleed(g, 36, 70, 24, 36, Palette.purple, 0.2);

  // ---- Hair backdrop (solid dark, long and flowing) ----
  g.fillStyle(Palette.dark, 0.97);
  g.fillEllipse(36, 14, 24, 16);                  // crown
  g.fillRect(20, 14, 32, 60);                     // long hair frame
  // hair flowing down past shoulders, ragged ends
  g.fillTriangle(20, 70, 16, 96, 26, 80);
  g.fillTriangle(52, 70, 56, 96, 46, 80);
  g.fillTriangle(28, 80, 24, 100, 34, 90);
  g.fillTriangle(44, 80, 48, 100, 38, 90);

  // ---- Pale ghostly face (solid cream) ----
  g.fillStyle(0xeae5d4, 0.98);
  g.fillEllipse(36, 20, 18, 20);
  // pale purple cheek tint
  g.fillStyle(Palette.purple, 0.18);
  g.fillCircle(40, 23, 2.5);

  // ---- Kimono (SOLID purple silhouette) ----
  g.fillStyle(Palette.purple, 0.97);
  g.fillRect(18, 34, 36, 70);
  // shoulder taper
  g.fillTriangle(18, 34, 24, 32, 18, 38);
  g.fillTriangle(54, 34, 48, 32, 54, 38);
  // hem flare
  g.fillTriangle(18, 100, 14, 108, 22, 104);
  g.fillTriangle(54, 100, 58, 108, 50, 104);
  // darker hem band
  g.fillStyle(Palette.purpleDeep, 0.95);
  g.fillRect(16, 100, 40, 8);

  // ---- Floral accents (2 small dots) ----
  g.fillStyle(Palette.creamSoft, 0.85);
  g.fillCircle(46, 70, 2);
  g.fillCircle(26, 86, 1.8);
  g.fillStyle(Palette.gold, 0.5);
  g.fillCircle(46, 70, 1);
  g.fillCircle(26, 86, 0.8);

  // ---- Face details: closed eyes, downturned mouth ----
  sketchLine(g, 30, 19, 34, 20, Palette.dark, 1, 2, 0.3);  // left eye slit
  sketchLine(g, 38, 20, 42, 19, Palette.dark, 1, 2, 0.3);  // right eye slit
  // single tear
  g.fillStyle(Palette.purple, 0.7);
  g.fillCircle(31, 24, 0.8);
  // downturned mouth
  sketchLine(g, 34, 26, 38, 26, Palette.redClay, 1, 1, 0.3);
  sketchLine(g, 34, 26, 33, 27, Palette.redClay, 1, 1, 0.3);
  sketchLine(g, 38, 26, 39, 27, Palette.redClay, 1, 1, 0.3);

  // ---- Hair fringe (4 short strokes) ----
  for (let i = 0; i < 4; i++) {
    sketchLine(g, 30 + i * 3, 11, 31 + i * 3, 18, Palette.dark, 1, 2, 0.5);
  }

  // ---- Baby bundle (solid cream, held in arms) ----
  g.fillStyle(Palette.creamSoft, 0.98);
  g.fillRoundedRect(8, 50, 22, 18, 4);
  // wrap fold lines
  sketchLine(g, 12, 56, 28, 60, Palette.bark, 1, 1, 0.6);
  sketchLine(g, 12, 62, 28, 58, Palette.bark, 1, 1, 0.6);
  // tiny baby face peeking
  g.fillStyle(0xeae5d4, 0.98);
  g.fillCircle(14, 58, 3.5);
  g.fillStyle(Palette.dark, 0.85);
  g.fillRect(12, 58, 1, 1);
  g.fillRect(15, 58, 1, 1);
  // bundle outline
  sketchRect(g, 8, 50, 22, 18, Palette.darkSoft, 1, 2, 0.8);

  // ---- Sketchy kimono outline ----
  sketchLine(g, 18, 34, 18, 100, Palette.purpleDeep, 1, 2, 1);
  sketchLine(g, 54, 34, 54, 100, Palette.purpleDeep, 1, 2, 1);
  sketchLine(g, 18, 34, 24, 32, Palette.purpleDeep, 1, 2, 1);
  sketchLine(g, 54, 34, 48, 32, Palette.purpleDeep, 1, 2, 1);
  // collar V
  sketchLine(g, 28, 32, 36, 38, Palette.dark, 1, 2, 0.6);
  sketchLine(g, 44, 32, 36, 38, Palette.dark, 1, 2, 0.6);

  paperGrain(g, 0, 0, 72, 110, 30, Palette.cream, Palette.purpleDeep);
}

// ============ ENVIRONMENT ============

function drawWillowTree(g: Phaser.GameObjects.Graphics): void {
  // ---- Trunk: several rough vertical ink strokes ----
  // base wash
  watercolorBlob(
    g,
    155,
    220,
    22,
    120,
    [Palette.bark, Palette.barkDark],
    24,
    0.4,
    0.85
  );
  // overlapping trunk strokes (slightly twisted)
  for (let i = 0; i < 12; i++) {
    const x = 138 + i * 2.6 + rndf(-1, 1);
    const yTop = 100 + rndf(-4, 4);
    const yBot = 350 + rndf(-4, 4);
    const xMid = x + Math.sin(i * 0.4) * 4;
    sketchLine(g, x, yTop, xMid, (yTop + yBot) / 2, Palette.barkDark, 1, 1, 1);
    sketchLine(
      g,
      xMid,
      (yTop + yBot) / 2,
      x + rndf(-2, 2),
      yBot,
      Palette.barkDark,
      1,
      1,
      1
    );
  }
  // trunk knot (menacing eye-like)
  g.fillStyle(Palette.darkSoft, 0.9);
  g.fillCircle(155, 200, 6);
  g.fillStyle(Palette.dark, 1);
  g.fillCircle(155, 200, 3);
  // bark texture hatching
  hatch(g, 138, 130, 30, 200, Palette.barkDark, 6, 0.25, false);

  // ---- Canopy: green watercolor wash with darker hatching ----
  watercolorBlob(
    g,
    150,
    90,
    140,
    50,
    [Palette.willow, Palette.leaf, Palette.leafLight],
    36,
    0.35,
    0.7
  );
  watercolorBlob(
    g,
    150,
    90,
    100,
    40,
    [Palette.willow, Palette.bark],
    20,
    0.3,
    0.6
  );
  // darker hatching for shadow under canopy
  hatch(g, 30, 100, 240, 40, Palette.barkDark, 8, 0.2, true);

  // ---- Hanging branches (~28 thin curved lines, with leaf clusters) ----
  for (let i = 0; i < 28; i++) {
    const startX = 28 + i * 9 + rndf(-2, 2);
    const startY = 100 + rndf(-10, 10);
    const len = 180 + rndf(-30, 60);
    const sway = rndf(-12, 12);
    // 3 segments to give curve
    const midX = startX + sway * 0.4;
    const midY = startY + len * 0.4;
    const endX = startX + sway;
    const endY = startY + len;
    sketchLine(g, startX, startY, midX, midY, Palette.willow, 1, 1, 0.6);
    sketchLine(g, midX, midY, endX, endY, Palette.willow, 1, 1, 0.6);
    // leaf clusters along
    for (let l = 0; l < 4; l++) {
      const t = (l + 1) / 5;
      const lx = startX + sway * t + rndf(-2, 2);
      const ly = startY + len * t + rndf(-3, 3);
      g.fillStyle(
        Math.random() < 0.5 ? Palette.leafLight : Palette.leaf,
        rndf(0.55, 0.85)
      );
      g.fillEllipse(lx, ly, rndf(3, 5), rndf(1.5, 3));
    }
  }

  // ---- A few extra menacing "reaching" branches ----
  for (let i = 0; i < 6; i++) {
    const sx = 100 + i * 20;
    const sy = 85;
    sketchLine(
      g,
      sx,
      sy,
      sx + rndf(-30, 30),
      sy + 30 + rndf(-10, 10),
      Palette.barkDark,
      1,
      2,
      1.5
    );
  }

  paperGrain(g, 0, 0, 300, 420, 200, Palette.cream, Palette.barkDark);
}

function drawCottageExt(g: Phaser.GameObjects.Graphics): void {
  // ---- Ground bleed ----
  softBleed(g, 210, 272, 180, 10, Palette.barkDark, 0.3);

  // ---- Walls (SOLID cream paper fill) ----
  g.fillStyle(Palette.paper, 0.98);
  g.fillRect(40, 140, 340, 130);
  // subtle interior shadow hatching at base (inside walls)
  hatch(g, 40, 240, 340, 30, Palette.barkDark, 10, 0.12, false);

  // ---- Base wood beam (solid) ----
  g.fillStyle(Palette.barkDark, 0.95);
  g.fillRect(40, 262, 340, 10);

  // ---- Vertical wood beams (3 thin sketchy lines) ----
  for (const bx of [80, 215, 350]) {
    sketchLine(g, bx, 140, bx + rndf(-1, 1), 262, Palette.barkDark, 1, 2, 1);
  }

  // ---- Thatched roof: solid dark triangle ----
  g.fillStyle(Palette.barkDark, 0.98);
  g.beginPath();
  g.moveTo(20, 140);
  g.lineTo(210, 30);
  g.lineTo(400, 140);
  g.closePath();
  g.fillPath();
  // accent shadow blob under ridge (small watercolor)
  watercolorBlob(g, 210, 60, 80, 20, [Palette.dark, Palette.nightDeep], 6, 0.25, 0.4);

  // ---- Thatch texture: ~10 carefully-placed angled ink strokes ----
  // left slope
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    const x = 20 + t * 190;
    const y = 140 - t * 110;
    sketchLine(g, x, y, x + 12, y + 6, Palette.bark, 1, 2, 0.6);
  }
  // right slope
  for (let i = 0; i < 5; i++) {
    const t = (i + 0.5) / 5;
    const x = 210 + t * 190;
    const y = 30 + t * 110;
    sketchLine(g, x, y, x + 12, y - 6, Palette.bark, 1, 2, 0.6);
  }
  // ridge line
  sketchLine(g, 20, 140, 210, 30, Palette.dark, 1, 2, 1);
  sketchLine(g, 210, 30, 400, 140, Palette.dark, 1, 2, 1);
  // eaves underline (separating roof from walls)
  sketchLine(g, 20, 140, 400, 140, Palette.dark, 2, 2, 0.6);

  // ---- Wall outline (sketchy, on top of solid fill) ----
  sketchRect(g, 40, 140, 340, 130, Palette.barkDark, 1, 2, 1.2);

  // ---- Door (solid dark wood, slightly off-center) ----
  g.fillStyle(Palette.barkDark, 0.98);
  g.fillRect(180, 180, 60, 88);
  // door panel split
  sketchLine(g, 210, 180, 210, 268, Palette.dark, 1, 2, 0.8);
  // door outline
  sketchRect(g, 180, 180, 60, 88, Palette.dark, 1, 2, 1);
  // gold handles
  g.fillStyle(Palette.gold, 0.95);
  g.fillCircle(204, 224, 1.8);
  g.fillCircle(216, 224, 1.8);

  // ---- Lit window LEFT (warm gold) ----
  // halo (1-2 soft ellipses)
  softBleed(g, 95, 198, 28, 28, Palette.gold, 0.22);
  softBleed(g, 95, 198, 20, 20, Palette.orange, 0.18);
  // solid gold fill
  g.fillStyle(Palette.gold, 0.98);
  g.fillRect(70, 170, 50, 56);
  // inner warmth
  g.fillStyle(Palette.orange, 0.6);
  g.fillRect(76, 176, 38, 44);
  // window cross-frame
  sketchLine(g, 95, 170, 95, 226, Palette.barkDark, 1, 2, 0.8);
  sketchLine(g, 70, 198, 120, 198, Palette.barkDark, 1, 2, 0.8);
  // outer frame
  sketchRect(g, 70, 170, 50, 56, Palette.barkDark, 1, 2, 1);

  // ---- Dark window RIGHT ----
  g.fillStyle(Palette.nightDeep, 0.98);
  g.fillRect(300, 170, 50, 56);
  // window cross-frame
  sketchLine(g, 325, 170, 325, 226, Palette.barkDark, 1, 2, 0.8);
  sketchLine(g, 300, 198, 350, 198, Palette.barkDark, 1, 2, 0.8);
  // outer frame
  sketchRect(g, 300, 170, 50, 56, Palette.barkDark, 1, 2, 1);

  // ---- Light paper grain (less than before) ----
  paperGrain(g, 0, 0, 420, 300, 80, Palette.cream, Palette.barkDark);
}

function drawCottageIntBg(g: Phaser.GameObjects.Graphics): void {
  // ---- Back wall: pale cream wash with shoji grid ----
  watercolorBlob(
    g,
    640,
    310,
    640,
    220,
    [Palette.paper, Palette.cream, Palette.creamSoft],
    36,
    0.45,
    0.8
  );
  // base flat fill underneath in case the blob doesn't fully cover
  g.fillStyle(Palette.paper, 0.5);
  g.fillRect(0, 100, 1280, 420);

  // shoji grid (slightly wonky)
  for (let i = 0; i <= 8; i++) {
    const x = i * 160;
    sketchLine(g, x, 100, x + rndf(-3, 3), 520, Palette.barkDark, 1, 1, 1);
  }
  for (let i = 0; i <= 4; i++) {
    const y = 100 + i * 105;
    sketchLine(g, 0, y, 1280, y + rndf(-2, 2), Palette.barkDark, 1, 1, 1);
  }
  // ceiling beam
  watercolorBlob(
    g,
    640,
    92,
    640,
    12,
    [Palette.barkDark, Palette.dark],
    18,
    0.65,
    0.95
  );
  sketchLine(g, 0, 80, 1280, 80, Palette.dark, 1, 2, 1);
  sketchLine(g, 0, 104, 1280, 104, Palette.dark, 1, 2, 1);

  // ---- Broken window upper-left (dark night-blue + stars) ----
  watercolorBlob(
    g,
    240,
    250,
    62,
    72,
    [Palette.night, Palette.nightDeep],
    18,
    0.7,
    0.95
  );
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 180, 180, 120, 140, Palette.barkDark, 1, 2, 2);
  }
  // broken glass shards (jagged lines)
  for (let i = 0; i < 5; i++) {
    sketchLine(
      g,
      180 + rnd(10, 110),
      180 + rnd(20, 120),
      180 + rnd(10, 110),
      180 + rnd(20, 120),
      Palette.cream,
      1,
      1,
      0.5
    );
  }
  // stars
  for (const [sx, sy, sr] of [
    [220, 220, 1.4],
    [260, 240, 1.8],
    [240, 280, 1.2],
    [275, 210, 1],
  ] as Array<[number, number, number]>) {
    g.fillStyle(Palette.cream, 0.9);
    g.fillCircle(sx, sy, sr);
    g.fillStyle(Palette.gold, 0.3);
    g.fillCircle(sx, sy, sr * 2);
  }

  // ---- Floor: tatami horizontal cream bands with thin ink dividers ----
  // base floor wash
  watercolorBlob(
    g,
    640,
    620,
    640,
    100,
    [Palette.creamSoft, Palette.paper, Palette.cream],
    32,
    0.45,
    0.8
  );
  g.fillStyle(Palette.creamSoft, 0.5);
  g.fillRect(0, 520, 1280, 200);
  // wood beam separating wall and floor
  watercolorBlob(
    g,
    640,
    518,
    640,
    5,
    [Palette.bark, Palette.barkDark],
    16,
    0.65,
    0.95
  );
  // tatami vertical dividers (wonky)
  for (let i = 0; i < 8; i++) {
    sketchLine(
      g,
      i * 180 + rndf(-2, 2),
      525,
      i * 180 + rndf(-2, 2),
      720,
      Palette.bark,
      1,
      1,
      1.2
    );
  }
  // horizontal mid-divider
  sketchLine(g, 0, 600, 1280, 600 + rndf(-2, 2), Palette.bark, 1, 2, 1);
  // tatami subtle weave hatching
  for (let i = 0; i < 6; i++) {
    hatch(
      g,
      i * 200,
      540 + (i % 2) * 60,
      180,
      40,
      Palette.bark,
      8,
      0.12,
      false
    );
  }

  // ---- Oppressive shadow gradient at edges ----
  for (let i = 0; i < 60; i++) {
    g.fillStyle(Palette.dark, rndf(0.02, 0.05));
    g.fillRect(0, 100 + i * 10, 1280, 12);
  }
  // corner shadows
  hatch(g, 0, 100, 200, 200, Palette.dark, 6, 0.12, true);
  hatch(g, 1080, 100, 200, 200, Palette.dark, 6, 0.12, true);

  // ---- Dust particles (scattered cream/dark dots) ----
  for (let i = 0; i < 120; i++) {
    g.fillStyle(
      Math.random() < 0.5 ? Palette.cream : Palette.dark,
      rndf(0.1, 0.3)
    );
    g.fillCircle(rnd(0, 1280), rnd(100, 720), rndf(0.5, 1.4));
  }
}

function drawFuton(g: Phaser.GameObjects.Graphics): void {
  // bleed below
  softBleed(g, 75, 55, 70, 12, Palette.barkDark, 0.25);

  // ---- Mattress watercolor ----
  watercolorBlob(
    g,
    75,
    40,
    70,
    16,
    [0x9a8a6a, Palette.bark, Palette.creamSoft],
    22,
    0.5,
    0.85
  );
  // base under-fill for coverage
  g.fillStyle(0x9a8a6a, 0.6);
  g.fillRect(0, 20, 150, 38);

  // ---- Stains (yellow/brown low-alpha watercolor) ----
  watercolorBlob(g, 50, 40, 18, 7, [0xb89c5a, 0x8a6f3a], 10, 0.4, 0.7);
  watercolorBlob(g, 108, 44, 14, 6, [0xb89c5a, 0x8a6f3a], 10, 0.4, 0.65);
  watercolorBlob(g, 85, 50, 10, 4, [0x7a5a30], 6, 0.3, 0.5);

  // ---- Uneven edges (sketchy outline) ----
  for (let i = 0; i < 2; i++) {
    sketchLine(g, 2, 22, 148, 21, Palette.barkDark, 1, 1, 2);
    sketchLine(g, 148, 21, 148, 57, Palette.barkDark, 1, 1, 2);
    sketchLine(g, 148, 57, 2, 58, Palette.barkDark, 1, 1, 2);
    sketchLine(g, 2, 58, 2, 22, Palette.barkDark, 1, 1, 2);
  }

  // ---- Pillow ----
  watercolorBlob(g, 26, 19, 18, 12, [Palette.cream, Palette.creamSoft], 12, 0.55, 0.9);
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 8, 8, 36, 22, Palette.bark, 1, 1, 1.2);
  }
  // crinkle lines
  sketchLine(g, 14, 14, 38, 14, Palette.bark, 1, 1, 0.5);
  sketchLine(g, 14, 20, 38, 20, Palette.bark, 1, 1, 0.5);
  sketchLine(g, 14, 26, 38, 26, Palette.bark, 1, 1, 0.5);

  // ---- Dust speckles ----
  for (let i = 0; i < 30; i++) {
    g.fillStyle(Palette.dark, rndf(0.2, 0.45));
    g.fillCircle(rnd(0, 150), 20 + rnd(0, 38), rndf(0.4, 1));
  }
  paperGrain(g, 0, 0, 150, 70, 50, Palette.cream, Palette.darkSoft);
}

function drawDiningTable(g: Phaser.GameObjects.Graphics): void {
  softBleed(g, 70, 50, 65, 12, Palette.barkDark, 0.25);

  // ---- Tabletop: wood with ink grain ----
  watercolorBlob(
    g,
    70,
    27,
    70,
    8,
    [Palette.bark, Palette.barkDark],
    18,
    0.5,
    0.9
  );
  g.fillStyle(Palette.bark, 0.7);
  g.fillRect(0, 20, 140, 14);
  // ink grain strokes
  for (let i = 0; i < 8; i++) {
    sketchLine(
      g,
      4 + rndf(-2, 2),
      22 + i * 1.4,
      136 + rndf(-2, 2),
      22 + i * 1.4 + rndf(-1, 1),
      Palette.barkDark,
      1,
      1,
      0.4
    );
  }
  // table edge sketchy outline
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 0, 20, 140, 14, Palette.dark, 1, 1, 1.5);
  }

  // ---- Legs ----
  watercolorBlob(g, 9, 52, 5, 18, [Palette.barkDark, Palette.dark], 8, 0.6, 0.9);
  watercolorBlob(g, 131, 52, 5, 18, [Palette.barkDark, Palette.dark], 8, 0.6, 0.9);
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 4, 34, 10, 36, Palette.dark, 1, 1, 1.2);
    sketchRect(g, 126, 34, 10, 36, Palette.dark, 1, 1, 1.2);
  }

  // ---- Plates ----
  for (const [px, py] of [
    [35, 18],
    [105, 18],
  ] as Array<[number, number]>) {
    softBleed(g, px, py, 14, 4, Palette.cream, 0.4);
    watercolorBlob(g, px, py, 13, 5, [Palette.cream, Palette.creamSoft], 10, 0.7, 0.95);
    // plate rim
    g.lineStyle(1, Palette.bark, 0.7);
    g.strokeEllipse(px, py, 28, 10);
    g.lineStyle(1, Palette.bark, 0.5);
    g.strokeEllipse(px + rndf(-0.5, 0.5), py + rndf(-0.5, 0.5), 26, 9);
    // moldy food (green blob)
    watercolorBlob(g, px, py, 7, 3, [0x4a5a30, 0x6b7f44, Palette.willow], 10, 0.6, 0.95);
    // darker green dots
    for (let d = 0; d < 6; d++) {
      g.fillStyle(0x3a4a20, rndf(0.6, 0.9));
      g.fillCircle(px + rndf(-5, 5), py + rndf(-2, 2), rndf(0.6, 1.2));
    }
  }

  // ---- Spoons ----
  for (const sx of [46, 116]) {
    sketchLine(g, sx, 17, sx + 12, 17, Palette.gold, 1, 2, 0.6);
    g.fillStyle(Palette.gold, 0.85);
    g.fillCircle(sx + 12, 17, 1.5);
  }

  paperGrain(g, 0, 0, 140, 70, 60, Palette.cream, Palette.darkSoft);
}

function drawPapers(g: Phaser.GameObjects.Graphics): void {
  softBleed(g, 40, 30, 35, 22, Palette.darkSoft, 0.2);

  // Three overlapping paper sheets with rough edges
  const sheets: Array<[number, number, number, number]> = [
    [0, 10, 32, 42],
    [20, 22, 32, 38],
    [46, 6, 30, 44],
  ];
  for (const [sx, sy, sw, sh] of sheets) {
    // wash
    watercolorBlob(
      g,
      sx + sw / 2,
      sy + sh / 2,
      sw / 2,
      sh / 2,
      [Palette.cream, Palette.creamSoft, Palette.paper],
      12,
      0.55,
      0.9
    );
    // base fill for coverage
    g.fillStyle(Palette.cream, 0.5);
    g.fillRect(sx, sy, sw, sh);
    // rough edges
    for (let i = 0; i < 2; i++) {
      sketchRect(g, sx, sy, sw, sh, Palette.darkSoft, 1, 1, 1.5);
    }
    // handwriting lines (many short horizontal ink strokes)
    for (let row = 0; row < Math.floor(sh / 5); row++) {
      const y = sy + 4 + row * 5;
      // break each line into a couple of segments to look like script
      let cx = sx + 2;
      while (cx < sx + sw - 4) {
        const seg = rnd(4, 10);
        sketchLine(
          g,
          cx,
          y + rndf(-0.5, 0.5),
          cx + seg,
          y + rndf(-0.5, 0.5),
          Palette.darkSoft,
          1,
          1,
          0.4
        );
        cx += seg + rnd(1, 3);
      }
    }
    // smudges
    g.fillStyle(Palette.dark, rndf(0.2, 0.4));
    g.fillCircle(sx + rnd(4, sw - 4), sy + rnd(4, sh - 4), rndf(1, 2.5));
  }

  paperGrain(g, 0, 0, 80, 60, 70, Palette.cream, Palette.darkSoft);
}

function drawDagger(g: Phaser.GameObjects.Graphics): void {
  softBleed(g, 24, 12, 24, 6, Palette.dark, 0.25);

  // ---- Blade (silver-grey with gradient via overlapping blobs) ----
  watercolorBlob(
    g,
    16,
    12,
    16,
    4,
    [0xcfcfd4, 0xb0b0b8, 0xeaeaef],
    14,
    0.55,
    0.95
  );
  // base solid for shape
  g.fillStyle(0xcfcfd4, 0.85);
  g.fillTriangle(0, 8, 32, 8, 0, 16);
  g.fillRect(0, 8, 32, 8);
  // blade highlight ridge
  sketchLine(g, 2, 11, 30, 11, Palette.cream, 1, 1, 0.4);
  // blade outline
  for (let i = 0; i < 2; i++) {
    sketchLine(g, 0, 8, 32, 8, Palette.dark, 1, 1, 0.6);
    sketchLine(g, 0, 16, 32, 16, Palette.dark, 1, 1, 0.6);
    sketchLine(g, 0, 8, 0, 16, Palette.dark, 1, 1, 0.6);
  }
  // tip taper
  sketchLine(g, 32, 8, 36, 12, Palette.dark, 1, 2, 0.5);
  sketchLine(g, 32, 16, 36, 12, Palette.dark, 1, 2, 0.5);

  // ---- Gold guard ----
  watercolorBlob(
    g,
    34,
    12,
    3,
    8,
    [Palette.gold, Palette.orange, 0xfde18c],
    10,
    0.65,
    0.95
  );
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 32, 4, 4, 16, Palette.barkDark, 1, 1, 0.8);
  }
  // gold highlight
  g.fillStyle(Palette.cream, 0.5);
  g.fillRect(33, 6, 1, 12);

  // ---- Handle (dark wood with cross-hatch wrapping) ----
  watercolorBlob(
    g,
    42,
    12,
    6,
    4,
    [Palette.darkSoft, Palette.barkDark],
    8,
    0.7,
    0.95
  );
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 36, 8, 12, 8, Palette.dark, 1, 1, 0.8);
  }
  // cross-hatch wrapping
  for (let i = 0; i < 5; i++) {
    sketchLine(
      g,
      36 + i * 3,
      8,
      37 + i * 3,
      16,
      Palette.bark,
      1,
      1,
      0.4
    );
  }
  for (let i = 0; i < 3; i++) {
    sketchLine(g, 36, 10 + i * 2, 48, 11 + i * 2, Palette.bark, 1, 1, 0.3);
  }

  paperGrain(g, 0, 0, 48, 24, 30, Palette.cream, Palette.darkSoft);
}

function drawSandals(g: Phaser.GameObjects.Graphics): void {
  softBleed(g, 35, 22, 32, 6, Palette.barkDark, 0.25);

  // Two sandals (slight irregularity)
  for (const cx of [18, 52]) {
    // wood sole watercolor
    watercolorBlob(
      g,
      cx,
      20,
      15,
      6,
      [Palette.bark, Palette.barkDark],
      12,
      0.55,
      0.9
    );
    g.fillStyle(Palette.bark, 0.7);
    g.fillEllipse(cx, 20, 28, 12);
    // sole outline
    for (let i = 0; i < 2; i++) {
      g.lineStyle(1, Palette.dark, rndf(0.6, 0.85));
      g.strokeEllipse(cx + rndf(-0.5, 0.5), 20 + rndf(-0.5, 0.5), 28, 12);
    }
    // wood grain
    sketchLine(g, cx - 12, 20, cx + 12, 20, Palette.barkDark, 1, 1, 0.5);
    sketchLine(g, cx - 10, 22, cx + 10, 22, Palette.barkDark, 1, 1, 0.4);
  }

  // Red straps Y-shape, sketched
  for (const cx of [18, 52]) {
    // central post
    watercolorBlob(g, cx, 16, 2, 6, [Palette.redClay, Palette.orangeDeep], 6, 0.7, 0.95);
    for (let i = 0; i < 2; i++) {
      sketchLine(g, cx - 8, 20, cx, 12 + rndf(-0.5, 0.5), Palette.redClay, 1, 1, 0.8);
      sketchLine(g, cx + 8, 20, cx, 12 + rndf(-0.5, 0.5), Palette.redClay, 1, 1, 0.8);
      sketchLine(g, cx, 12, cx + rndf(-0.5, 0.5), 22, Palette.redClay, 1, 1, 0.8);
    }
  }

  paperGrain(g, 0, 0, 70, 32, 40, Palette.cream, Palette.darkSoft);
}

function drawWindowGlow(g: Phaser.GameObjects.Graphics): void {
  // halo layers (low-alpha concentric)
  for (let r = 78; r >= 30; r -= 8) {
    g.fillStyle(Palette.gold, rndf(0.05, 0.1));
    g.fillCircle(60, 70, r);
  }
  // soft rect glow (layered, slightly rotated illusion via offsets)
  for (let i = 0; i < 5; i++) {
    const inset = i * 4;
    g.fillStyle(Palette.gold, 0.12 + i * 0.06);
    g.fillRect(
      inset + rndf(-1, 1),
      inset + rndf(-1, 1),
      120 - inset * 2,
      140 - inset * 2
    );
  }
  // sketchy frame
  for (let i = 0; i < 3; i++) {
    g.lineStyle(1, Palette.gold, rndf(0.6, 0.95));
    g.strokeRect(
      rndf(-1, 1),
      rndf(-1, 1),
      120 + rndf(-1, 1),
      140 + rndf(-1, 1)
    );
  }
  // sparkles
  for (let i = 0; i < 25; i++) {
    g.fillStyle(Palette.cream, rndf(0.3, 0.8));
    g.fillCircle(rnd(4, 116), rnd(4, 136), rndf(0.4, 1.2));
  }
}

function drawLakeBg(g: Phaser.GameObjects.Graphics): void {
  // ---- Stepped sky gradient (4 night tones) ----
  const skyTones = [
    Palette.nightDeep,
    0x16102a,
    Palette.night,
    0x2a2055,
  ];
  for (let i = 0; i < skyTones.length; i++) {
    g.fillStyle(skyTones[i], 1);
    g.fillRect(0, i * 100, 1920, 100);
  }
  // sky blending overlap blobs to soften band edges
  for (let i = 0; i < skyTones.length - 1; i++) {
    for (let j = 0; j < 8; j++) {
      g.fillStyle(skyTones[i + 1], rndf(0.15, 0.35));
      g.fillEllipse(rnd(0, 1920), (i + 1) * 100 + rndf(-12, 12), rndf(200, 400), rndf(20, 60));
    }
  }

  // ---- Stars (cream dots, varied) ----
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 1920;
    const y = Math.random() * 360;
    const r = rndf(0.4, 1.6);
    g.fillStyle(Palette.cream, rndf(0.6, 1));
    g.fillCircle(x, y, r);
    if (Math.random() < 0.18) {
      g.fillStyle(Palette.gold, 0.3);
      g.fillCircle(x, y, r * 2.5);
    }
  }

  // ---- Far mountains: sumi-e ink wash with ragged tops ----
  // back range
  const backPts: Array<[number, number]> = [];
  for (let x = -20; x <= 1940; x += 40) {
    backPts.push([x, 360 - rnd(20, 70) - Math.sin(x * 0.005) * 20]);
  }
  inkSilhouette(g, backPts, 480, 0x1a1430, 0.85);

  // front range (closer, darker)
  const frontPts: Array<[number, number]> = [];
  for (let x = -20; x <= 1940; x += 30) {
    frontPts.push([
      x,
      400 - rnd(10, 50) - Math.sin(x * 0.007 + 1) * 25,
    ]);
  }
  inkSilhouette(g, frontPts, 480, Palette.nightDeep, 0.92);

  // ---- Mid ground band (thin dark strip) ----
  watercolorBlob(
    g,
    960,
    450,
    960,
    18,
    [0x0f0a1c, Palette.nightDeep],
    24,
    0.5,
    0.9
  );

  // ---- Lake water ----
  // base
  g.fillStyle(0x251a40, 1);
  g.fillRect(0, 480, 1920, 100);
  // watercolor variations
  watercolorBlob(
    g,
    960,
    530,
    960,
    50,
    [0x251a40, 0x32285a, Palette.purpleDeep],
    30,
    0.25,
    0.5
  );
  // mountain reflection (faint)
  for (let i = 0; i < 8; i++) {
    g.fillStyle(0x1a1430, rndf(0.1, 0.25));
    g.fillRect(rnd(0, 1920), 480 + rnd(0, 30), rnd(80, 240), rnd(4, 12));
  }
  // horizontal sketch lines simulating reflections
  for (let i = 0; i < 14; i++) {
    const y = 488 + i * 6;
    const segs = rnd(3, 7);
    for (let s = 0; s < segs; s++) {
      const sx = rnd(0, 1920);
      const sw = rnd(40, 200);
      sketchLine(
        g,
        sx,
        y + rndf(-1, 1),
        sx + sw,
        y + rndf(-1, 1),
        Palette.purple,
        1,
        1,
        0.4
      );
    }
  }
  // moon glimmer on water (cream highlight band)
  for (let i = 0; i < 6; i++) {
    g.fillStyle(Palette.cream, rndf(0.15, 0.3));
    g.fillRect(900 + rnd(-30, 30), 488 + i * 8, rnd(60, 120), rnd(1, 2));
  }

  // ---- Foreground ground ----
  watercolorBlob(
    g,
    960,
    650,
    960,
    70,
    [0x1a1208, Palette.dark, Palette.barkDark],
    36,
    0.55,
    0.9
  );
  g.fillStyle(0x1a1208, 0.6);
  g.fillRect(0, 580, 1920, 140);
  // grass/rock dots
  for (let i = 0; i < 200; i++) {
    g.fillStyle(
      Math.random() < 0.3 ? Palette.willow : Palette.barkDark,
      rndf(0.3, 0.7)
    );
    g.fillCircle(rnd(0, 1920), 585 + rnd(0, 130), rndf(0.6, 2));
  }
  // tall grass strokes
  for (let i = 0; i < 60; i++) {
    const gx = rnd(0, 1920);
    const gy = 590 + rnd(0, 120);
    sketchLine(
      g,
      gx,
      gy + rnd(4, 10),
      gx + rndf(-2, 2),
      gy,
      Palette.willow,
      1,
      1,
      0.5
    );
  }
}

function drawMoon(g: Phaser.GameObjects.Graphics): void {
  // ---- Halo (3 nested low-alpha circles) ----
  g.fillStyle(Palette.gold, 0.1);
  g.fillCircle(60, 60, 58);
  g.fillStyle(Palette.gold, 0.18);
  g.fillCircle(60, 60, 48);
  g.fillStyle(Palette.cream, 0.22);
  g.fillCircle(60, 60, 40);

  // ---- Moon body (slightly imperfect circle) ----
  // wash
  watercolorBlob(
    g,
    60,
    60,
    32,
    32,
    [0xf5edcf, Palette.cream, Palette.creamSoft],
    18,
    0.7,
    0.98
  );
  // base body
  g.fillStyle(0xf5edcf, 0.95);
  g.fillCircle(60, 60, 35);
  // edge irregularity (small inward bumps)
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const r = 35 + rndf(-1.5, 1);
    const x = 60 + Math.cos(a) * r;
    const y = 60 + Math.sin(a) * r;
    g.fillStyle(Palette.creamSoft, rndf(0.3, 0.7));
    g.fillCircle(x, y, rndf(1, 2.5));
  }
  // sketchy outline
  for (let i = 0; i < 2; i++) {
    g.lineStyle(1, Palette.darkSoft, rndf(0.25, 0.45));
    g.strokeCircle(60 + rndf(-0.5, 0.5), 60 + rndf(-0.5, 0.5), 35);
  }

  // ---- Crater specks ----
  for (const [cx, cy, cr] of [
    [50, 50, 5],
    [72, 58, 4],
    [58, 70, 3],
    [66, 48, 2],
    [48, 64, 2.5],
  ] as Array<[number, number, number]>) {
    g.fillStyle(0xd8cca0, 0.6);
    g.fillCircle(cx, cy, cr);
    g.fillStyle(0xc4b48a, 0.4);
    g.fillCircle(cx + rndf(-0.5, 0.5), cy + rndf(-0.5, 0.5), cr * 0.6);
  }

  // tiny grain
  for (let i = 0; i < 25; i++) {
    g.fillStyle(0xd8cca0, rndf(0.15, 0.35));
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 32;
    g.fillCircle(60 + Math.cos(a) * r, 60 + Math.sin(a) * r, rndf(0.3, 1));
  }
}

function drawLantern(g: Phaser.GameObjects.Graphics): void {
  // slight overall tilt simulated by drawing slightly off-center

  // String
  sketchLine(g, 12, 0, 12 + rndf(-0.5, 0.5), 6, Palette.darkSoft, 1, 2, 0.4);

  // ---- Soft halo behind ----
  g.fillStyle(Palette.gold, 0.18);
  g.fillCircle(12, 20, 16);
  g.fillStyle(Palette.orange, 0.12);
  g.fillCircle(12, 20, 20);

  // ---- Body (warm gold with red stripes) ----
  watercolorBlob(
    g,
    12,
    20,
    10,
    13,
    [Palette.gold, Palette.orange, Palette.orangeDeep],
    14,
    0.6,
    0.95
  );
  g.fillStyle(Palette.gold, 0.8);
  g.fillRect(3, 8, 18, 24);
  // inner glow
  g.fillStyle(Palette.cream, 0.4);
  g.fillRect(6, 11, 12, 18);

  // sketchy body outline
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 2, 6, 20, 28, Palette.orangeDeep, 1, 1, 1);
  }

  // ---- Vertical red stripes (slightly tilted) ----
  sketchLine(g, 8, 8, 8 + rndf(-0.5, 0.5), 32, Palette.redClay, 1, 2, 0.5);
  sketchLine(g, 16, 8, 16 + rndf(-0.5, 0.5), 32, Palette.redClay, 1, 2, 0.5);

  // ---- Top + bottom dark caps ----
  watercolorBlob(g, 12, 5, 12, 2, [Palette.dark, Palette.barkDark], 8, 0.7, 0.95);
  watercolorBlob(g, 12, 35, 12, 2, [Palette.dark, Palette.barkDark], 8, 0.7, 0.95);
  for (let i = 0; i < 2; i++) {
    sketchRect(g, 0, 3, 24, 4, Palette.dark, 1, 1, 0.5);
    sketchRect(g, 0, 33, 24, 4, Palette.dark, 1, 1, 0.5);
  }

  paperGrain(g, 0, 0, 24, 40, 18, Palette.cream, Palette.darkSoft);
}

function drawParticle(g: Phaser.GameObjects.Graphics): void {
  // soft cream-gold blob, layered alphas
  g.fillStyle(Palette.gold, 0.18);
  g.fillCircle(4, 4, 4);
  g.fillStyle(Palette.gold, 0.4);
  g.fillCircle(4, 4, 3);
  g.fillStyle(Palette.cream, 0.65);
  g.fillCircle(4, 4, 2);
  g.fillStyle(Palette.white, 0.85);
  g.fillCircle(4, 4, 1);
}

// ============ PUBLIC API ============

/**
 * Generate all hand-drawn textures into the scene's texture manager.
 * Keys + dimensions mirror sprites.procedural.ts so scenes can swap freely.
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
