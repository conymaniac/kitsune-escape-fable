# Kitsune Escape — Vertical Slice

A playable web prototype of the **"Cry under the Willow"** quest from Dominik
Michna's narrative pitch *Kitsune Escape: Tales of a brave fox*.

Built as a narrative side-scroller in **Phaser 3 + TypeScript + Vite**. All art
is procedurally generated from the pitch's color palette — no asset pipeline,
no external dependencies beyond the framework.

## Quick start

```bash
cd vertical-slice
npm install
npm run dev
```

Open <http://localhost:5173>.

## Build

```bash
npm run build      # type-check + produce dist/
npm run preview    # serve the built bundle locally
npm run typecheck  # type-check only
```

## Controls

| Key                | Action                                  |
| ------------------ | --------------------------------------- |
| `← →` or `A D`     | Move                                    |
| `Space`            | Jump / advance dialog                   |
| `E`                | Interact (NPCs, items, doors, windows)  |
| `F`                | Transform between human and fox         |
| `1`–`4`            | Pick a dialog choice                    |
| `↑ ↓` + `Enter`    | Navigate dialog choices                 |
| `Esc`              | (End screen) back to title              |
| `R`                | (End screen) restart slice              |

## The slice

A single questline — *Cry under the Willow* — adapted directly from the design
doc that came out of the narrative-design course. Beats:

1. **Intro** — Mizumi runs from home, falls asleep, wakes in a yokai forest.
2. **Willow Lake** — She meets **Yanagi onna**, a crying woman with a baby. She
   asks Mizumi to fetch her husband's dagger from a nearby cottage.
3. **Cottage exterior** — The door is blocked. Mizumi must **transform into a
   fox** to leap through the open window.
4. **Cottage interior** — Environmental storytelling: moldy food, soiled futon,
   desperate handwritten notes. The cottage has been abandoned for years.
   Mizumi finds the dagger in the kitchen.
5. **Return to the willow** — Mizumi cuts the cursed willow branches. Yanagi
   onna and her baby dissolve into white smoke.
6. **The truth** — Beneath the willow lies a skeleton. The "woman" was a
   *yurei* — the ghost of a mother long since strangled by the tree.
7. **Medallion unlocked**, end of slice.

Roughly **10–15 minutes** of play.

## Architecture

```
src/
├── main.ts                  Phaser game config, scene registration
├── style.css                CSS overlays (quest banner)
│
├── types/index.ts           Shared TypeScript types & event names
├── art/
│   ├── palette.ts           Color tokens from the pitch deck
│   └── sprites.ts           Procedural texture generator
│
├── scenes/
│   ├── BootScene.ts         Bakes textures, initializes registry
│   ├── TitleScene.ts        Branded title screen
│   ├── IntroScene.ts        Auto-advancing prologue
│   ├── WillowLakeScene.ts   Main hub: the cursed willow + Yanagi onna
│   ├── CottageScene.ts      Cottage exterior + interior (single scene)
│   └── EndScene.ts          Outro card
│
├── entities/
│   └── Player.ts            Mizumi: human + fox forms, transform mechanic
│
├── systems/
│   ├── DialogSystem.ts      Typewriter dialog box with branching choices
│   └── QuestSystem.ts       HUD banner + state tracking
│
└── data/
    ├── dialogs.ts           All dialog trees for the slice
    └── quests.ts            Quest objective metadata
```

### Scene flow

```
Boot → Title → Intro → WillowLake ⇄ Cottage → (back to WillowLake) → End
```

### State

A single `GameState` object lives in Phaser's global `registry` and persists
across scenes:

```ts
{
  questProgress: number;    // 0 = no quest, 1–6 = active steps, 7 = done
  hasDagger: boolean;
  questCompleted: boolean;
  hasTransformed: boolean;  // unlocks the transform tutorial hint
  currentForm: "human" | "fox";
}
```

Scenes mutate it directly; the `QuestSystem` reflects changes into the HUD
banner. Cross-scene communication uses Phaser's per-scene event bus with
typed event names from `types/GameEvent`.

## Design choices

- **No external art.** Every sprite is drawn at boot with `Phaser.Graphics`.
  Cheap to iterate, no licensing risk, and the warm orange/ochre palette of
  the pitch stays consistent. To swap in real assets later, replace the
  `bake()` calls in `art/sprites.ts` with `scene.load.image(...)`.
- **Side-scroller, not top-down.** Matches the pitch's stated genre
  ("action-adventure with RPG elements, side-scrolling") and the Ori /
  Child-of-Light references in the secondary research doc.
- **One quest, full vertical.** Better one polished quest than ten stubs. This
  proves the dialog tree, the transform mechanic, the environmental
  storytelling, and the emotional payoff all in one loop.
- **Typewriter dialog with branching.** Authored directly from the course's
  interactive-dialog document, lines preserved.

## What's intentionally not here

- No audio. (Joe Hisaishi reference track playing in your head still applies.)
- No save / load. State resets on page reload.
- Only one of the nine kitsune forms (the base fox). The remaining forms are
  story-gated unlocks and out of scope for the slice.
- No combat. The pitch's RPG combat layer is a separate vertical.

## Next steps

If this slice plays well:

1. **Swap procedural art for hand-drawn assets** — pull from the existing
   Pinterest mood board and AI illustrations already in the pitch.
2. **Add a second yokai quest** to prove the loop scales (e.g. *Tengu* —
   tests the second kitsune form).
3. **Sound design pass** — Hisaishi-style piano + strings ambience, footsteps,
   wind, transformation chime.
4. **Localization** — author dialog data in Czech alongside English (the
   course materials already exist in both).

## Credits

Story, design, and original course work: **Dominik Michna**.
Narrative pitch art (referenced in the pitch PDF): see `Kitsune Escape Pitch.pdf` credits page.
Code scaffolding generated as part of the vertical-slice exercise.
