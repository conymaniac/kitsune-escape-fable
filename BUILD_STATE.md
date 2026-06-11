# BUILD STATE — Kitsune Escape (Fable) vertical slice

Living checklist. Update the moment a unit of work completes, BEFORE starting the next.
On resume: read this file, skip what's done. Specs: `docs/DESIGN.md`, `docs/TECH_SPEC.md`.
Branch: `claude/wonderful-mclean-bad83d`. New app: `game/`. CLEAN-ROOM: never touch `vertical-slice/`.

## Status legend
- [ ] todo · [~] in progress · [x] done

## M0 — Scaffold + contracts + bilingual content
- [x] game/ Vite+TS scaffold (package.json, tsconfig, vite.config, index.html, .gitignore)
- [x] core/: types.ts, events.ts, flags.ts, loop.ts, input.ts, director.ts
- [x] style/palette.ts + materials.ts STUB (Lambert behind final API)
- [x] audio/ no-op stubs (engine.ts, music.ts, sfx.ts behind final IAudio)
- [x] ui/ functional unstyled stubs (uiRoot, hud, dialogUi, screens, styles.css)
- [x] data/dialogs.ts + data/quests.ts — authored fresh from _extracted/ canon docs
- [x] i18n/index.ts + en.ts + cs.ts — ALL strings EN+CS
- [x] main.ts renders empty lit iso scene; `npm run build` green
- [x] COMMIT M0

## M1 — Grey-box playable loop (parallel: D-core, B-world, C-chars, E-ui)
- [ ] D-core: engine/renderer.ts, engine/camera.ts, gameplay/player.ts, interactions.ts,
      triggers.ts, sceneDirector.ts, wind.ts (skeleton), questScript.ts, main.ts wiring
- [x] B-world: world/exterior.ts + interior.ts greybox, colliders.ts, anchors, lash zones,
      wind shadows, props/ greybox stand-ins (FINAL layout/collider/anchor/zone data;
      greybox geometry — M2 swaps prop internals behind the same signatures)
- [x] C-chars: characters/rig.ts, playerAvatar.ts, capsule placeholders (human/fox/yanagi)
      + vfx.ts pooled effects + full procedural anim + ink hulls (M2-scope pulled forward;
      M2 C-chars reduces to geometry polish inside the named groups)
- [x] E-ui: dialog/dialogSystem.ts, questSystem.ts, ui/* functional (typewriter, choices,
      HUD, title/intro/ending/pause, locale toggle) + whisper/bubble channels + styled
      night-storybook theme (M1 scope of M4-P2 styling pulled forward; M4 refines)
- [ ] VERIFY: full quest playable start→finish in greybox, EN+CS
- [ ] COMMIT M1

## M2 — Art pass (parallel: A-style, B-world, C-chars)
- [ ] A-style: ramps.ts, real materials.ts, shaders/* (water, sway, ghost, wisp, chunks),
      lighting.ts, postfx.ts
- [ ] B-world: real props (terrain, water, willow w/ cuttable branches, cottage, vegetation,
      lanterns, interior props, sky/moon/stars, wisps), merge.ts
- [ ] C-chars: real mizumiHuman/mizumiFox/yanagi meshes + procedural anim, ink hulls, vfx.ts
- [ ] COMMIT M2

## M3 — Audio pass (parallel with M2)
- [ ] audio/engine.ts real (Tone bootstrap, buses, duck, mute)
- [ ] audio/music.ts (D insen BGM states + lullaby + wind ambience)
- [ ] audio/sfx.ts (~13 recipes)
- [ ] COMMIT M3

## M4 — Juice & polish
- [ ] P1 gameplay feel: gust/knockdown tuning, papers, camera micro-moves, leap arc,
      cut/dissolve/wind-stop cutscene timing
- [ ] P2 presentation: ghost dissolve, title diorama, screen transitions, medallion,
      bloom/fog grading, EN+CS proofing in context
- [ ] PLAYTEST: full walkthrough incl. Z1/Z2 refusal branches, both cottage exits, both locales
- [ ] COMMIT M4

## M5 — Ship
- [ ] Perf audit vs budgets; asset-purity grep clean
- [ ] game/README.md (how to play, controls EN+CS, slice scope) + docs/DECISIONS.md
- [ ] gh repo create conymaniac/kitsune-escape-fable + push branch as main
- [ ] Vercel: rename project-adq26 → kitsune-escape-fable; cd game && npx vercel link &&
      npx vercel --prod
- [ ] Verify https://kitsune-escape-fable.vercel.app playable
- [ ] FINAL COMMIT + report

## Produced artifacts log
- docs/DESIGN.md — game design of record
- docs/TECH_SPEC.md — technical spec of record
- BUILD_STATE.md — this file
- game/ — M0 complete (2026-06-11). Scaffold + core kernel (types/events/flags/loop/
  input/director) + palette (27 named colors) + MaterialKit Lambert stub + IAudio
  no-op stubs (SfxName ×13) + functional plain ui/ (IHud/IDialogUi/IScreens, fade +
  paper layers) + i18n (131 keys EN, 131 keys CS, parity compile-enforced via
  `Record<keyof typeof en, string>`) + data/dialogs.ts (26 nodes: ambient, full
  branching tree A1/B1–B3/C1–C3/D1–D2/E1–E2/F1/G1 + Z1/Z2 no-quest exits, door-
  blocked, interior optionals w/ futon→scare chain, Dialog 6/7) + data/quests.ts
  (6 objectives + helpers). main.ts smoke scene: iso ortho cam (az 45° / el 30° /
  viewHeight 14), hemi+dir lights, palette boxes, wisps, title→intro→play flow,
  locale toggle verified in browser (EN+CS, zero console errors).
- .claude/launch.json — dev-server launch config (game-dev → vite :5173).
- game/src/characters/ — M1 C-chars complete (2026-06-12). rig.ts (FINAL rig
  conventions: named-Group builders, limb pivots, CharacterBase w/ distance-driven
  phase accumulator, eased action-crossfade scalar, heading smoothing, one-shot
  auto-revert, mixPose/AngleSpring helpers, addInkHull) · mizumiHuman.ts (idle
  breathe 0.4 Hz + head drift, walk counter-rotate + |sin|·0.06 bob, 4 skirt panels
  on inertia springs, cut 0.5 s arc, pickup crouch, brace kneel, knockdown tumble,
  sit seiza) · mizumiFox.ts (trot diagonal pairs w/ spine/head counterphase bob,
  3-seg tail follow-through sin(t·2−i·0.6), random ear-flick timer, leap tuck,
  sit spirit-sense, knockdown) · yanagi.ts (hover sine, cradled baby bundle, no
  legs below hem, per-instance cloned kit.ghost(), setDissolve(t) opacity fade,
  setWindSway(s), standAndBow(onComplete?) ~3.6 s one-shot) · playerAvatar.ts
  (owns both forms; 0.45 s transform: 0.1 s squash → hidden swap → 1.1× overshoot
  settle; onSwapVisual hooks 'anticipation'/'burst'/'settle'; collisionRadius
  0.35/0.25; emits no events) · vfx.ts (pooled: transformBurst ring+6 spiral
  wisps+PointLight flash, dustPoof, emberTrail.attach/detach, ghostSmokePuffs,
  branchFallFade; all mats are owned clones of kit mats — only Material-base
  props mutated). Verified: tsc + vite build green; headless runtime smoke test
  (31 checks: swap phase order, NaN-free matrices, one-shot revert, dissolve
  isolation from shared kit cache, pool recycling, dispose) all passed; purity
  greps clean (no raster/audio refs, no raw hex — palette keys only).
- game/src/dialog/ + game/src/ui/ — M1 E-ui complete (2026-06-12). dialogSystem.ts
  (runner: start/advance/choose/close, complete-then-advance, onEnter/onExit/onSelect
  via DialogContext, t() resolution, choice enabled() filtering, DialogStarted/Ended,
  60 ms advance debounce, locale rerender mid-dialog) · questSystem.ts (QuestStarted/
  QuestStepCompleted → objective banner via IHud keys; defensively advances
  flags.questProgress to step+1; emits QuestCompleted once when progress reaches 7;
  refresh() for restart) · dialogUi.ts (bone-paper ink panel, typewriter 35 c/s +
  DialogBlip every 3rd non-space glyph, inline-SVG ink portraits per SpeakerId,
  choices 1–4/numpad + ↑↓/←→ select + Enter/E/Space pick + click/hover, panel
  click-or-key advance via requestAdvance hook) · hud.ts (brush-stroke banner reveal
  re-trigger + stale dim, [E] prompt / crossed-paw SVG when blocked, fox/girl SVG
  form glyphs w/ pop, mute+lang corner) · screens.ts (calligraphy title over
  transparent vignette + ensō SVG, intro ink-wash beats, ending medallion coin SVG
  + sequential prose reveal 2.2 s/line + any-key fast-forward, pause paper scroll
  w/ placeholder volume slider, washi paper overlay line-by-line ink reveal,
  fadeToBlack/fadeFromBlack promises, showWhisper/showBubble/setProjector extras) ·
  styles.css (night-storybook theme: indigo/bone/vermillion, serif stack, all
  animations CSS). Verified in browser (dev server, EN+CS): title→intro→play, full
  branch walk A1→B1→C3→D2→E2→F1→G1 → QuestStarted → obj-1 banner; Dialog 6 linear
  walk → obj-5 banner; paper overlay; whisper (violet) + bubble; pause; ending.
  Zero console errors. tsc + npm run build green; purity grep clean.

- game/src/world/ — M1 B-world complete (2026-06-12). exterior.ts (the One Night
  Map 80×64, X -40..40 / Z -32..32, NORTH = -Z; full DESIGN §4 route: spawn glade
  (-8,27) w/ sleeping tree → mask shrine (-8.8,15) → hollow-log size-gate (-8,9)
  w/ 0.6 u fox gap → south creek Z 3..7 w/ 2 m Bound narrows [B1] (-8,5) → farm
  gate [B2] (-16,0) in full fence line → reed tunnel (6.5,0.5) fox gap 0.6 →
  willow row (10.8,-3.2 / 12.4,-7.4 / 14.6,-10.8) → promontory w/ Cursed Willow
  [C] (21,-12.5) + ghostSpot/bodyMound + 3 cuttable clusters → boulder field →
  cottage [D] (-25,-21) w/ yard fences, path opening, fox gap (-18,-20.6), east
  shoji window + crate stack; old dock, north creek w/ stepping stones, rowboat
  pocket, ink ridge + treelines, 8 stone lanterns, 11 wisps in 3 clusters,
  56 colliders, 4 lashZones, 6 windShadows; static dressing merged per material)
  · interior.ts (10×8 at origin: genkan + blocked sliding door + sandals, 4-tatami
  room w/ low table + 2 moldy plates, futon + 7 scattered paper sheets, NW kitchen
  alcove w/ dagger drawer, east window + windowLanding; 7 colliders; S/E walls are
  knee-height camera cutaways — colliders full; placeholder warm PointLight +
  dim hemisphere INSIDE the returned group) · colliders.ts (circleVsStatics
  pure resolver, 3-pass relaxation, allocation-free + ColliderStore + aabb/circle/
  offsetColliders helpers) · merge.ts (mergeStatic per material×attribute-layout,
  userData.noMerge opt-out, world-transform bake, null-merge fallback) · props/
  (terrain w/ vertex-color jitter + route ribbons, water, willow w/ FINAL
  {group, cuttableBranches, canopyCenter} signature, cottage, vegetation
  (seeded PRNG), lanterns, propsInterior, sky w/ moon+halo+star Points, wisps
  w/ Lissajous update(dt, wind)). Verified: tsc + npm run build green; purity
  grep clean (no raster/audio, no raw hex — palette keys only); visual eyeball
  via TEMPORARY standalone /world-preview.html page (main.ts untouched — it was
  being rewritten in parallel; preview files deleted after screenshots: full map,
  spawn corridor, promontory, cottage yard, interior all read correctly at
  viewHeight 14–22).

### M1 E-ui integrator notes (contract surface)
- `new DialogSystem({ ui, bus, getFlags, setDialogActive, getNode? })` — ui:
  `DialogUiPort` = `IDialogUi & Partial<DialogUiExtras>` (pass createDialogUi's
  return); getFlags: `() => GameFlags` (live accessor — restart-safe);
  setDialogActive: `(active: boolean) => void` (wire to director.dialogActive);
  getNode defaults to data/dialogs.getDialogNode. Public: start(rootId), advance(),
  choose(i), close(), isActive(), currentNodeId, dispose().
- `new QuestSystem({ bus, hud, getFlags })` — subscribes on construction; public:
  refresh() (call after restart w/ fresh flags), dispose(). Emits
  QuestCompleted(QUEST_ID) when questProgress reaches 7 (i.e. after
  QuestStepCompleted(6)); questScript only needs to set progress 7 + emit step 6
  on body-examine. Shows 'quest.completed' banner on completion.
- `createDialogUi(layer, bus)` returns `DialogUiHandle` (IDialogUi + extras:
  setRequestAdvance(fn|null), setSpeakerId(SpeakerId)). dialogUi OWNS all dialog
  input while open (E/Space/Enter/click advance; 1–4/arrows/Enter/click choices).
  Integrator must NOT also wire input actions to advance()/choose() (both are
  idempotent/debounced if accidentally double-wired). E on a choice list picks the
  highlighted choice (DESIGN §5 "arrows+E").
- `createScreens(screensLayer, fadeLayer, paperLayer, bus)` returns `ScreensHandle`
  (IScreens + extras): showWhisper(textKey, screenAnchor?: {x,y} 0..1, opts?:
  {durationSec?=6, violet?}), showBubble(textKey, durationSec=4),
  setProjector(fn: (() => {x,y}|null) | null) — projector returns the PLAYER's
  head in normalized screen coords; while set, the self-talk bubble tracks it per
  frame (rAF); without it bubbles sit fixed bottom-center (M1-acceptable). Whisper
  anchors are caller-provided per call (project the ghost spot at call time).
  Live whispers/bubbles re-localize on LocaleChanged.
- Pause volume slider is a visual placeholder (value persists in-session, nothing
  wired) — M3/M4 hooks it to IAudio.
- Known integration gap (D-core): a stale Escape in Input.pressed can leak across
  the intro→play transition when rAF was throttled (background tab) and instantly
  open pause; consider clearing input just-pressed state on PhaseChanged. Also the
  M0 main.ts pause handler doesn't check director.dialogActive.

### M1 C-chars — integrator notes (contract gaps for D-core/questScript)
- PlayerAvatar emits NO events. Wire avatar.onSwapVisual: on 'burst' fire
  vfx.transformBurst(pos) + sfx 'transform' + 0.85 time-dip + 2 % punch-zoom;
  'anticipation' = start 0.2 s input lock; 'settle' = sequence done. Emit
  FormChanged from gameplay (form switch request), not from the avatar.
- avatar.form/collisionRadius flip to the TARGET form immediately on setForm()
  (fox→human radius grows mid-burst; collision wall-clip is gameplay's concern).
- Locomotion is speed-driven: rigs blend idle↔walk from motion.speed, so
  setAction('walk') is optional. 'cut' (0.5 s) and 'pickup' (0.7 s) auto-revert
  to 'idle'; brace/sit/knockdown/leap are HELD until the action changes.
- Footstep sync: gait phase accumulates per metre (stride 3.8 human / 4.6 fox
  rad/m); gameplay keeps its own cadence from speed as planned.
- VfxSystem: add vfx.root to the ACTIVE scene and vfx.update(dt) to the loop
  (after characters). transformBurst uses 1 pooled PointLight (~0.3 s flash) —
  counts against the ≤5-lights budget while flashing. Particle quads billboard
  the fixed iso direction (0.6124, 0.5, 0.6124).
- vfx.branchFallFade(mesh) clones the mesh's materials and REMOVES the mesh
  from its parent ~1.3 s later — questScript must treat the branch as gone
  (disable its collider/interactable itself).
- Yanagi.setDissolve is an M1 opacity fade (M2 swaps in shader uDissolve behind
  the same signature); call vfx.ghostSmokePuffs alongside it for the beat.
  standAndBow(onComplete) covers rise→bow→rise (~3.6 s); trigger dissolve from
  its onComplete or during the hold.
- M1 visual eyeball in dev server was SKIPPED deliberately: main.ts was being
  rewritten in parallel by D-core/E-ui (scratch-wiring + git checkout would have
  destroyed their uncommitted work). Verified headlessly instead (see above);
  first in-browser look happens at M1 integration.

### M1 B-world — integrator notes (contract surface for D-core)
- `buildExterior(kit)` returns `ExteriorBuild extends ExteriorBuildResult` with
  EXTRAS: `cuttableBranches: Mesh[]` (named cuttable-0..2, userData.cuttable),
  `setGateOpen(open)` (swings the gate panel AND splices the gate collider in/out
  of the returned `colliders` array IN PLACE — keep the array reference live, or
  use ColliderStore.setAll once and re-set after gate changes), `update(dt, wind?)`
  (wisp drift + lantern flicker — add to the loop while exterior is active).
- `buildInterior(kit)` returns `InteriorBuild extends InteriorBuildResult` with
  EXTRAS: `papers: Mesh[]` (7 sheets for the M4 flutter sim), `dagger: Mesh`
  (hide on pickup), `setDrawerOpen(open)`, `setDoorOpen(open)`.
- Size gates are pure collider data (no logic): hollow log gap 0.6 u at
  x -8.3..-7.7 (z 8.4..9.6), reed tunnel gap 0.6 u at x 6.2..6.8 (z -1..2.5),
  yard fence fox gap 0.6 u at z -20.9..-20.3 (x ±0.2 around -18). Fox r 0.25
  passes (needs 0.5+), human r 0.35 blocked (needs 0.7+). Creek Bound gap [B1]:
  water collider is exactly 2 m (z 4..6 at x -10..-6) — Bound (3 m) must ignore
  statics mid-hop or teleport-land; walking is blocked by the same collider.
- Wind convention assumed: prevailing NW→SE, i.e. WindState.direction ≈
  (+0.707,+0.707) — windShadows sit SE (lee) of their obstacles. If WindSystem
  picks another prevailing direction, shadow centers need mirroring (zone radii
  fine). Promontory wind-shadow (18.4,-11.4) is the finale staging cover.
- Anchors are ground-level (y=0). `door` (-25,-17.4) / `window` (-19.6,-20.5)
  are STANDING spots outside the colliders, not mesh positions. Window-leap fox
  trigger ≈ window anchor r 1.2; crate stack tops out at y 1.4 for the arc.
- Shrine mask mesh is named 'shrine-mask' (hide after the mask beat); cottage
  meshes 'cottage-door'/'cottage-window' are named for shimmer/glow hooks.
- Exterior group contains NO lights (scene rig is D-core/A-style); interior
  group DOES contain its placeholder warm PointLight + dim HemisphereLight —
  drop them when stream A's interior rig lands.
- Wisps are spectral-teal kit.wisp() for all clusters (M0 stub has one material);
  canon wants the Cursed Willow motes VIOLET — needs kit.wisp() variant or
  per-cluster material in M2 (A-style). Flagged, not solvable without touching
  style/ or types.
- Interior S/E walls are knee-height (0.55) camera cutaways; colliders are full
  walls. If M4 wants fade-occluders instead, only interior.ts visuals change.
- merge.ts works and exterior already uses it for static dressing (~600 dressing
  meshes → ~6 draw calls). Don't merge groups containing animated/named meshes
  without setting userData.noMerge on them.

### M0 notes / deviations
- EN quest title authored as "Cry under the Willow" per build order; canon EN doc's
  quest Title field reads "Cry under the willow tree" (objective titles kept verbatim).
- Branching doc vs linear script conflicts resolved per canon-precedence: E2 answer
  uses branching doc line ("Já se už nebojím…" — required for F1 "Nebudu…" to
  connect); F1 answer uses fuller linear line (husband's dagger + kitchen drawer);
  C1/C2 answer uses fuller linear line ("To ty její větve…").
- Linear-script line "Strach je to jediný, co mi už zůstalo…" kept as extra node
  `yanagi.fear` (her waiting/brace-beside-her whisper; DESIGN §3 finale beat).
- dialogs.ts hooks set questProgress 1 (G1), 5 (return.3), 6 (thanks) per spec;
  steps 2/3/4 + body-explore completion (7 + QuestCompleted) belong to M1 questScript.
- M0 intro: Esc skips immediately (hold-1s skip is M4 polish); typewriter/choices
  functional in dialogUi but unwired until M1 dialogSystem.
- GameLoop.add gained optional `runWhenPaused` 3rd param (superset of spec API).
