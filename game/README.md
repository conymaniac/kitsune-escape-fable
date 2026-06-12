# Kitsune Escape — Vertical Slice: Cry under the Willow

Mizumi ran away from home and woke in a forest that is no longer hers — a night-side wood full
of yokai. An ancient kitsune mask lets her shift between her own two hands and the body of a
quick spirit-fox, and the only way home is to help the spirits with what they ask. This slice
is one complete quest from that journey: a woman's crying drifts from a cursed willow by the
lake, a storm wind refuses to let her go, and Mizumi — fox and girl both — sets out to free
her. A melancholic Japanese-folklore fable about the **Yanagi onna**, built around one theme:
*"It's ok to be different. Your family and the closest ones will always be your stable point."*

## Play it

- **Online:** https://kitsune-escape-fable.vercel.app
- **Locally:** `cd game && npm install && npm run dev` (Node 18+)

Desktop browser + keyboard required. No mouse needed (mouse works for menus and dialog
choices). Fully bilingual — English and Czech, switchable any time with **L**. One sitting,
roughly **10–15 minutes**.

## How to play

You are Mizumi. Press **F** to shift forms once you have the mask — the fox is fast, small,
and senses spirits; the girl has hands that can open, take, read, and cut. The wind is the
antagonist: it gusts in readable cycles (grass flattens, leaves streak, audio swells — then
the lash). As the fox you run through it; as the girl you Brace or get staggered, and under
the willows a whipping branch can knock either form down. There is no combat and no death —
follow the wisps, listen for the crying, and shift often. Shifting is the point.

### Controls

| Key | Action |
|---|---|
| **WASD / Arrows** | Move (camera-relative) |
| **E** | Interact · advance dialog |
| **F** | Transform (girl ↔ fox) |
| **Space** | Form verb — **Bound** as fox (3 m hop, crosses gaps) / **Brace** as human (kneel, immune to gusts) |
| **1–4** | Dialog choices (or arrows + E, or click) |
| **L** | Language EN ↔ CS |
| **M** | Mute |
| **Esc** | Pause (hold during intro to skip) |
| **R** | Restart (at the ending) |

If you get knocked down, mash **E** to wiggle free.

## What this slice is

In the full game, Mizumi works her way home through many yokai quests on a foldback story
structure, watched by Yami no Goshin, the dark lord of the forest. This slice is **one such
quest, complete end-to-end**: the full branching dialog tree (including refusing the quest),
six objectives, an explorable cottage where every prop whispers the ending, and a finale where
the storm itself is the boss — and its permanent silence is the reward.

What it demonstrates of the full design:

- the **fox/human duality** as the core verb — fox owns the outside, human owns the inside of things;
- the **wind as antagonist** — tension without combat, damage, or death;
- environmental storytelling and a branching, refusable dialog system;
- the melancholy tone: you cannot save everyone, but you can still help.

Intentionally **out of scope**: Yami no Goshin (intro text only), other yokai quests, other
kitsune tail forms, combat, day/night cycle, inventory UI, save system, gamepad.

## Tech

**Three.js + TypeScript + Vite**, with **Tone.js** for audio.

- **100 % code-authored art.** Real-time orthographic isometric 3D, toon gradient ramps,
  custom shaders (water, ghost, wisps, wind-sway), procedural animation on segmented rigs,
  inverted-hull ink outlines — and **zero raster textures or image files** anywhere.
- **100 % in-engine synthesized audio.** The generative D-insen score, the wind, the lullaby,
  and all ~13 sound effects are synthesized live with Tone.js — **no audio files**.
- DOM overlay UI (dialog, HUD, screens), two-scene world (exterior night map + cottage
  interior) swapped behind an ink-fade.

All quest text, dialog, and lore were authored clean-room from the original canon design
documents, in both English and Czech, with compile-enforced locale parity.

## Credits

- **Original game design & writing** — Dominik Michna
- **Vertical-slice implementation** — built with Claude
