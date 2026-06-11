# Kitsune Escape — Vertical Slice Game Design
## "Cry under the Willow" — Isometric 3D (Three.js)

This is the binding design document for the vertical slice. Canon source scripts live in
`_extracted/` ("Kitsune Escape _ Cry under the Willow.txt" = EN quest script of record,
"Kitsune Escape _ Nářek pod vrbou.txt" = CS quest script, "Kitsune Escape _ Interactive dialog.txt"
= CS branching dialogue structure, "Kitsune Escape _ Hight Concept.txt" = premise/theme EN+CS).
Where this document and the canon scripts disagree, the canon scripts win.

**CLEAN-ROOM RULE: nothing in `vertical-slice/` may be read, referenced, or copied. All content
is authored fresh from `_extracted/` docs. All player-facing text ships in BOTH English and Czech.**

**Design pillars (priority order):**
1. **Shifting is joy.** Transforming must feel so good players do it even when they don't need to.
2. **The wind is the antagonist.** No combat, no death — tension comes from a storm that breathes.
3. **The world tells the truth before the script does.** Every prop in the cottage whispers the ending.

Player fantasy: *a small, quick spirit-fox darting through an indigo night, and a girl with hands
and a heart who can actually help.*

---

## 1. Core Gameplay Loop (30–60 s cycle)

**SENSE → DASH → SHIFT → TOUCH → PAYOFF**

| Phase | Form | Duration | What the player does |
|---|---|---|---|
| SENSE | Fox | 3–8 s | Stand still 1 s — fox sits, ears prick, a teal sonar ring expands ~25 m, pings interactables through walls for 4 s; kitsunebi wisps drift toward the current goal; crying audible at double range |
| DASH | Fox | 15–25 s | Sprint at fox speed, Space-Bound over gaps, thread fox-sized shortcuts, time movement between gusts |
| SHIFT | — | 0.45 s | F to transform in a smoke-and-foxfire burst |
| TOUCH | Human | 10–20 s | E to open/take/read/cut/talk; branching dialogue; Space-Brace against gusts |
| PAYOFF | either | 3–6 s | Objective ticks with brush-stroke banner; new wisps light the next direction |

Form-switching is not a one-time gate — it's the verb the whole game is conjugated in.

## 2. Form Duality

Rule of the slice: **fox owns the outside; human owns the inside of things.**

| Capability | Human Mizumi | Fox |
|---|---|---|
| Move speed | 3.2 m/s | 5.0 m/s |
| Space key | **Brace** — kneel, immune to gust stagger, can't move | **Bound** — 3 m squash-stretch hop, 0.6 s cooldown; crosses creek gaps |
| Size gates | Blocked (hollow log, fence gap, open window, reed tunnel) | Passes all |
| Interactions (E) | ALL: doors, drawers, take/carry dagger, read papers, remove sandals, **cut branches** | Only "nose" interactions: sniff flavor objects, leap through window |
| Gusts in the open | Staggered to 40 % speed unless Bracing or in a wind-shadow | Runs through freely; a lashing willow branch still knocks either form down |
| Spirit sense | None | Passive: wisps guide toward objective; spirit objects shimmer violet. Active: stand still 1 s → sonar ping |
| Hearing | Normal | Double radius, directional |
| Dialogue | Yes | Yes (she calls Mizumi "little fox" either way — canon) |
| Inventory | Persists across forms (the mask holds carried items) | Persists |

**Transformation (tune first, the heart):** 0.45 s total — 0.1 s anticipation crouch → white smoke
burst + 6 kitsunebi flames spiraling out → 0.1 s time-scale dip to 0.85 → new form pops with 1.1×
scale overshoot. 2 % camera punch-zoom. Distinct SFX per direction (low whomp + bell shimmer →fox;
breathy chord + cloth flutter →human). No cooldown, no cost; disabled only mid-dialogue/knockdown.
Momentum preserved. 0.2 s input lock during burst.

**Controls (final):** WASD/Arrows move (camera-relative 8-dir) · E interact/advance · F transform ·
Space form-verb (Bound/Brace) · 1–4 or arrows+E dialogue choices · L language · M mute · Esc pause.
Keyboard-only; mouse works for menus/choices. No click-to-move.

## 3. Tension: The Night Wind

The wind is already the quest's author (it trapped the woman, slams the shutters, blew the sandals)
— so it is the hazard, and its final silence is the emotional payoff.

**Gust cycle:** Calm (10–14 s) → Telegraph (3 s) → Lash (4 s) → Calm…
- **Telegraph (always readable):** directional grass/reed flatten wave sweeps the screen, leaf
  streaks accelerate, audio swells, willow canopies pull back like a winding whip.
- **Lash:** open ground staggers the human (40 % speed) unless Bracing or in a wind-shadow (lee of
  boulders/trunks/dock posts — grass stays calm there). Fox runs free. In **willow zones** (shore
  row + Cursed Willow promontory), branches whip through telegraphed sweep arcs — a hit knocks
  **either** form down.
- **Knockdown (the only "lose"):** tumble, tangled in branches; tap E to wiggle free (≤2 s),
  pushed back ~3 m. No health, no respawn, no progress loss.
- **Escalation:** calm windows shrink 14 s → 12 s (cottage trip) → 8 s (return + finale). NO gust
  cycle inside the cottage — only the scripted shutter-slam (canon Dialog 4).

**Finale (Objective 5) as the mechanical climax:** three branch clusters wrap the woman; each takes
one E-cut in human form with the dagger, only viable during calm windows (during lash the willow's
sweep covers the promontory). Intended dance: wait in wind-shadow → calm → walk in, cut one →
telegraph → either Brace beside her (you hear her hush the baby over the howl) or fox-dart out and
back. Cuts persist after knockdowns. After the third cut: Dialog 7 → dissolve → **the wind stops
permanently**. Silence is the payoff.

## 4. Level — One Night Map

Exterior sized so the quest route ≈ 2.5–3 min mixed-form traversal. South→north = beginning→truth.
1 unit = 1 m. Interior is a separate small scene (10×8) entered via ink-fade.

```
                                 N
 ┌────────────────────────────────────────────────────────────┐
 │ ███ ink-black pine ridge (impassable) ██████████████████   │
 │  ┌──────────┐   creek w/ stepping stones        mist ~~~~  │
 │  │ COTTAGE  │   + HOLLOW LOG (fox shortcut)  ~~~~~~~~~~~~  │
 │  │   [D]    │◄──────────┐                 ~~~  LAKE  ~~~~  │
 │  │ fence w/ │     open field, 3 boulders ~~~~~~~~~~~~~~~~  │
 │  │ fox gap  │     (wind-shadow hopscotch) ~~ promontory ~  │
 │  └──────────┘                          ┌──► CURSED WILLOW  │
 │       ▲ cottage path (40m)             │      [C] woman    │
 │       │                          old dock    + baby        │
 │  FARM GATE [B2]               ~~~~~~~~~~~~~~~~~~~~~~~~~~~  │
 │  (tutorial: human E)        willow row along west shore    │
 │       │                     (gust lash arcs under canopies)│
 │  creek + 2m BOUND GAP [B1]      reed tunnel (fox) ───►     │
 │       │                                                    │
 │  HOLLOW LOG (size gate)                                    │
 │  MASK SHRINE [A] ✦                                         │
 │       │                                                    │
 │  SPAWN GLADE [S] — Mizumi's sleeping tree                  │
 └────────────────────────────────────────────────────────────┘
                                 S
```

Route: [S]→[A] 12 m · [A]→[B1]→[B2] 25 m · [B2]→[C] 45 m along willow shore (crying audible ~30 m
as fox; ambient line auto-triggers at 15 m — canon) · [C]→[D] 50 m across boulder field (cottage's
amber window = the only warm light, visible from the willow) · interior 2.5–3 min · return at peak
storm · finale 90 s. Nothing on the route is >15 m from something touchable (stone lanterns,
offering shrine, fireflies over reeds, rotted rowboat, frogs that plop into the lake).

**Sightlines:** lake's spectral teal glow pulls north from spawn; cottage window pulls from the
willow; willow promontory visible from cottage door (return never disorients). The Cursed Willow
is the tallest silhouette and the only willow with violet kitsunebi motes in its canopy. Tall
geometry sits north/west of paths; occluders between camera and player fade to ~15 % ink outline.

**Interior (separate scene, ink-fade transition, camera tightens, exterior audio low-passed,
gusts paused):**
- Genkan/entry (S): sliding door (blocked), sandals against its rail — readable as "wrong"
  immediately, explorable only after the dagger is found (canon order).
- Main room (4 tatami): low dining table w/ two moldy plates (optional Dialog 2), filthy futon
  (optional Dialog 3 → scripted shutter-slam Dialog 4: papers explode upward, lantern gutters,
  0.3 s shake, "Ah!" … "Stupid wind."), scattered papers around the futon (READABLE diary).
- Kitchen alcove (NW), panel pushed aside: Explore → drawer reveals the **dagger** (Take, human
  only — fox prompt shows crossed-out paw, re-teaching F).
- East wall: open window + crate stack outside making the fox leap arc readable. The leap is a
  contextual E interaction playing a fixed arc hop — no physics jump exists.

## 5. Narrative Delivery (4 strictly tiered channels)

1. **Ambient whispers** — floating bone-white text + spatial audio, no input, no pause (the
   woman's crying loop + her 15 m line). Shimmer violet when heard via fox sense.
2. **Self-talk bubbles** — small brush-stroke bubble above Mizumi for flavor lines (table, futon,
   sandals). Movement stays free; fades after 4 s.
3. **Dialogue panel** — bottom panel with ink portraits for the canon branching tree. Typewriter
   35 chars/s, E completes-then-advances, choices via 1–4/arrows+E/click. Refusal exits Z1/Z2 work
   per canon: leaving without G1 grants no quest; she answers "Shh, child. Someday someone will
   come who helps us." (CS: "Ššš, děťátko. Jednou se objeví někdo, kdo nám pomůže.")
4. **Paper overlay** — the diary: full-screen washi paper, strokes draw themselves line by line
   with ink-bleed, music fully ducked, faint hummed lullaby underneath. Canon fragments verbatim
   (EN + CS). Closing triggers the sad self-talk line.

**The reveal (must land):** Dialog 7 ends → she stands for the first time, bows → unravels into
white smoke drawn up by one last gust → **wind stops globally, permanently** — willows dead still,
lake to glass, no music. A single kitsunebi lights at the willow roots (diegetic Objective 6
marker). Approach → slow camera dolly-tighten → world desaturates to ink-and-bone except the
violet kimono → canon description as paper-overlay over a held shot (mummified body, branches
around her neck, **empty shawl in her hands**) → lone music-box lullaby (the hummed melody, now
sourced) → 4 s held silence → the **Yanagi onna medallion** rises in a warm vermillion ink-stamp
bloom (first warm light since the cottage window) → ending sequence.

## 6. Game States

```
TITLE ─any key─► INTRO (6 beats) ─► PLAY ─quest done─► REVEAL ─► ENDING ─R─► restart
  ▲                (Esc-hold skips)   │ ▲                                └Esc► TITLE
  └───────────────────────────────────┘ └─ PAUSE (Esc): resume/restart/EN-CS/volume
```

- **Title:** DOM over a live 3D diorama (camera slowly orbiting the lake, wisps drifting); brush
  calligraphy title; language select EN/CS; "Press any key". Wind already audible.
- **Intro:** 6 narration beats (authored fresh from the High Concept premise, EN+CS) as ink-wash
  panels w/ slow drift + ember petals; any key advances (auto 6 s); hold Esc 1 s skips. Final
  panel cross-fades into the spawn glade — intro ends *in* the world.
- **Play:** minimal HUD — objective as a brush-stroke line top-left (fades to 20 % when stale),
  in-world context glyphs. No minimap/compass: wisps + sightlines navigate.
- **Ending:** medallion ceremony → ~10 ending prose lines (authored fresh, EN+CS) typewritten over
  a slow drift across the still lake with the first grey-blue hint of dawn ("morning comes" =
  the theme's visual rhyme) → "R to restart · Esc to title".
- **Pause:** paper-scroll overlay, world frozen/desaturated. Resume / Restart / EN-CS / Volume.

## 7. Juice List (ranked by fun-per-effort)

1. Transformation burst (smoke + 6 spiraling kitsunebi + time-dip + scale overshoot + punch-zoom + paired SFX)
2. Interactable shimmer (soft white outline pulse + bob + fading E-glyph)
3. Dialogue typewriter + per-glyph blip + choice hover wiggle
4. Gust telegraph wave (grass/reed flatten sweep + leaf streaks + audio swell)
5. Fox bound squash-stretch + landing dust poof
6. Kitsunebi guide wisps (scatter playfully when touched)
7. Quest banner brush-stroke reveal + suzu bell chime
8. Camera micro-moves (velocity look-ahead, indoor tighten, shutter-slam shake, reveal dolly)
9. Footstep differentiation (human thud+rustle, fox patter, water ripple rings, wet prints on dock)
10. Willow sway hierarchy (idle breath → telegraph pull-back → lash whip)
11. Fox ember trail while sprinting/bounding
12. Paper overlay ink-draw (self-drawing strokes, paper grain, music duck)
13. Smoke dissolve + global wind-stop (silence as the payoff)
14. Knockdown tangle (branch-wrap, E-mash wiggle, elastic snap-free)
15. Ambient micro-life (fireflies, frog plops, lantern flicker, fox ear-twitch idle)
16. Medallion ink-stamp award (stamp slam + vermillion-gold glint)

Build 1–7 before content-complete; 8–12 during; 13–16 polish.

## 8. Tutorial (first 60 s, zero text dumps)

| t | Beat | Teaches |
|---|---|---|
| 0–10 s | Wake under tree; WASD glyph on a stone, fades after first input | Move |
| 10–25 s | Mask shrine (kitsunebi orbit, E-glyph). Taking it = scripted 3 s beat: the mask drifts to her face, first transformation *happens to her* | Interact; she's now a fox |
| 25–35 s | Hollow log blocks path, fox-sized gap | Fox = small |
| 35–45 s | 2 m creek gap, Space glyph ripples on water | Bound |
| 45–60 s | Farm gate: as fox, crossed-out-paw prompt then F-glyph; F → E → gate slides | Transform back + human E |
| ~60 s | Scripted harmless gust with full telegraph; brace glyph if staggered; crying becomes audible | Wind + Brace; tutorial becomes the quest |

## 9. Scope Guardrails

**OUT:** Yami no Goshin entirely (intro text only), day/night cycle, other yokai/quests, combat or
damage, XP/stats, inventory UI beyond a quiet dagger icon by the objective line, the katana, other
tail forms, save system (one sitting; in-memory checkpoints), camera rotate/zoom controls, gamepad,
voice acting (hummed lullaby + baby cry only), click-to-move.

**Canon compliance checklist:** 15 m ambient trigger; full Dialog 1 branch tree incl. Z1/Z2
no-quest exits; six objectives in order; both cottage exits (sandals OR window); optional
table/futon/papers with futon→shutter-slam chain; exact readable fragments (EN+CS); dissolve-then-
discover ordering; the empty shawl; the Yanagi onna medallion.

**Success criteria:** completable in 8–15 min (median ~12); a player who skips all optional cottage
content still understands the reveal; a player who reads everything cries.
