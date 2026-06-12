# Kitsune Escape — Vertical Slice: Design Decisions

A short note for reviewers on what was invented to turn the canon quest script into a playable
slice, and why. Canon sources: `_extracted/` docs; design of record: `docs/DESIGN.md`.

## Mechanics invented to fill the gaps

The canon docs define the story, dialog tree, and objectives — not moment-to-moment play.
Everything below was designed to make a 10–15 minute quest *fun* while serving the fable.

- **Form duality rule — "fox owns the outside, human owns the inside of things."** The mask is
  the premise, but it needed a grammar: fox is fast, small (size gates: hollow log, fence gap,
  window, reed tunnel), wind-immune, and spirit-sighted; human is slow but has hands (all E
  interactions — doors, drawers, the dagger, reading, cutting). Every objective forces at least
  one shift, so shifting stays the core verb instead of a one-time key. Transform is free,
  instant-feeling (0.45 s burst), and deliberately over-juiced — pillar #1 is "shifting is joy."
- **The wind as antagonist + gust cycle + Brace/Bound.** Canon has no enemy on stage — but the
  wind already *is* the quest's villain (it trapped the woman, slams the shutters). So it became
  the hazard: a readable calm → telegraph → lash cycle that escalates with the story. Human
  Space = **Brace** (kneel, immune, immobile); fox Space = **Bound** (hop, crosses the creek).
  Tension without combat, and the duality gets a second axis: fox outruns the storm, human
  endures it.
- **Knockdown as the only fail state — and no death.** A lashing willow branch tumbles either
  form; mash E to wiggle free, lose ~3 m, lose nothing else. Death would break the fable's tone
  (a gentle story about helping), and any harsher punishment would make players stop exploring.
  The cost is time and dignity — exactly enough to make the telegraph worth respecting.
- **Spirit-sense.** Fox-only: guide wisps drift toward the objective, spirit things shimmer
  violet, sit still 1 s for a sonar ping. It replaces a minimap/compass (none exists), keeps
  navigation diegetic, and gives the fox a *perceptual* identity, not just a faster one.
- **Tutorial corridor.** The first 60 s teach move → interact → (the mask takes *her*) → size
  gates → Bound → transform-back → first scripted gust, one beat at a time, zero text dumps.
  The corridor ends by becoming the quest: the first crying is audible as the tutorial closes.
- **The reveal staging — permanent wind-stop as the payoff.** Canon orders dissolve-then-
  discover. We staged it mechanically: three branch cuts only land in calm windows (the finale
  is a dance with the gust cycle), then Dialog 7 → she stands, bows, tatters away — and the
  wind stops *forever*. Shaders freeze, lake goes to glass, music holds silence. The antagonist
  dying quietly is the emotional climax; the body discovery happens in that silence.

## Key technical decisions

- **Real 3D under a fixed orthographic iso camera** (az 45°, el 30°) — 2D-illustration
  readability with free 3D lighting, shadows, and shader wind; no camera controls to teach.
- **Two `THREE.Scene` instances** (exterior / interior) swapped behind a 0.3 s ink-fade — no
  roof-hiding hacks, each scene gets its own light rig, fog, and camera framing.
- **100 % code-authored art** (toon ramps as generated DataTextures, vertex colors, five custom
  shaders, zero raster assets) — enforced by a CI grep. War story: one `1−y/0` in a lantern
  painter produced NaN vertex colors that bloom smeared into a full white-out; fixed at the
  source and the bloom high-pass now clamps non-finite texels so content can never white the
  frame again.
- **Procedural animation only** — phase-driven sin/lerp on segmented rigs, no AnimationMixer,
  no clips; gait phase accumulates per metre so footsteps sync for free.
- **DOM overlay UI** for all text — serif system stack, CSS animation, crisp at any DPI, free
  localization; the 3D canvas never renders a glyph.
- **Generative insen-scale music** — Tone.js, 72 BPM D-insen loop (FM piano, Karplus-Strong
  koto, drone) with title/exterior/interior/ending states; wind ambience is filtered noise
  tracking the same wind-strength value the shaders read. No audio files.
- **Contracts-first parallel build** — M0 shipped every cross-module API as a working stub;
  five agent streams (style/world/chars/core/ui + audio) then built in parallel, replacing
  internals but never signatures.

## From slice to full game

- More yokai quests on the foldback structure (the quest/dialog/i18n data layer is already
  generic — a new quest is data + a script module).
- Yami no Goshin as an actual presence (pursuit beats between quests, the final confrontation).
- More kitsune tail forms with new traversal/interaction verbs layered on the same duality.
- Save system (flags are already one serializable object), gamepad support, in-memory restart.
- Performance headroom (draw-call merging round 2, shadow tuning) and accessibility (remapping,
  hold-to-mash alternative, text size, reduced-motion mode).

## Known limitations (shipped, from the M4 playtest)

1. **Shore wedge:** a knockdown in the willow-row lash zone can push the player into a corner
   between a willow trunk and the lake collider; steering any other direction frees instantly.
2. **Draw-call hotspot:** ~121 scene draws on the shore view vs the ≤120 budget (occluder-fade
   trees) — accepted at the gate.
3. **Loop fragility:** an exception inside an update function would freeze the game (rAF is not
   rescheduled on throw). The only observed thrower (shared audio synth retrigger) is guarded
   at the source; the kernel was left untouched at the final gate.
4. **One unreproduced control stall** (~2 min, velocity 0 with valid input) after an intro skip
   in one scripted CS boot — suspected test-harness artifact, never seen at human pace.
5. **Finale chaining:** a well-positioned player can cut 2–3 branches in one calm window — the
   intended one-cut-per-window dance is not enforced. Reads as skill, kept.
6. **Restarts are full page reloads** (ending R/Esc, pause Restart) — deterministic and instant
   in an asset-free app; in-memory restart deferred.
