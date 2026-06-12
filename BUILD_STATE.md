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
- [x] D-core: engine/renderer.ts, engine/camera.ts, gameplay/player.ts, interactions.ts,
      triggers.ts, sceneDirector.ts, wind.ts (FULL, not skeleton), main.ts wiring
- [x] D-core questScript.ts: the entire scripted experience (tutorial corridor incl.
      mask-shrine beat + F-gate, all six objectives, both cottage exits, branch-cut
      climax, dissolve → wind-stop → body reveal → medallion → ending) — main.ts
      DEV-PROVISIONAL block fully replaced; see D2 notes below
- [x] B-world: world/exterior.ts + interior.ts greybox, colliders.ts, anchors, lash zones,
      wind shadows, props/ greybox stand-ins (FINAL layout/collider/anchor/zone data;
      greybox geometry — M2 swaps prop internals behind the same signatures)
- [x] C-chars: characters/rig.ts, playerAvatar.ts, capsule placeholders (human/fox/yanagi)
      + vfx.ts pooled effects + full procedural anim + ink hulls (M2-scope pulled forward;
      M2 C-chars reduces to geometry polish inside the named groups)
- [x] E-ui: dialog/dialogSystem.ts, questSystem.ts, ui/* functional (typewriter, choices,
      HUD, title/intro/ending/pause, locale toggle) + whisper/bubble channels + styled
      night-storybook theme (M1 scope of M4-P2 styling pulled forward; M4 refines)
- [x] VERIFY: full quest playable start→finish in greybox, EN+CS (2026-06-12,
      scripted browser walkthrough at ~30 fps via rAF pump — background tab;
      every beat passed, zero console errors/warnings; details in D2 notes.
      A human 60 fps feel-pass remains on the M4 PLAYTEST line)
- [x] COMMIT M1

## M2 — Art pass (parallel: A-style, B-world, C-chars)
- [x] A-style: ramps.ts, real materials.ts, shaders/* (water, sway, ghost, wisp, chunks),
      lighting.ts, postfx.ts — finished + browser-verified after interrupted-WIP audit;
      postfx white-out root-caused and fixed (see M2 A-style notes)
- [x] B-world: real props (terrain, water, willow w/ cuttable branches, cottage, vegetation,
      lanterns, interior props, sky/moon/stars, wisps), merge.ts — finished + browser-verified
      after interrupted-WIP audit; exterior scene draws now within the ≤120 budget
      (see M2 B-world notes)
- [x] C-chars: real mizumiHuman/mizumiFox/yanagi meshes + procedural anim, ink hulls, vfx.ts
      — WIP audited, finished + browser-verified (see M2 C-chars notes)
- [x] COMMIT M2

## M3 — Audio pass (parallel with M2)
- [x] audio/engine.ts real (Tone bootstrap, buses, duck, mute)
- [x] audio/music.ts (D insen BGM states + lullaby + wind ambience)
- [x] audio/sfx.ts (~13 recipes)
- [x] COMMIT M3

## M4 — Juice & polish
- [x] P1 gameplay feel: gust/knockdown tuning, papers, camera micro-moves, leap arc,
      cut/dissolve/wind-stop cutscene timing + occluder fade (C-chars issue #2)
      — browser-verified, see M4 P1 notes
- [x] P2 presentation: ghost dissolve erosion, reveal ink-grade hook, medallion
      stamp+bloom, title/intro/ending/pause/paper polish, hold-Esc skip, dagger
      icon, EN+CS proofing in context — browser-verified, see M4 P2 notes
      (ONE optional main.ts one-liner left for P1/playtest: pause volume hook)
- [x] PLAYTEST: full walkthrough incl. Z1/Z2 refusal branches, both cottage exits, both locales
      — done 2026-06-12, see M4 PLAYTEST notes (3 fixes applied incl. one CRITICAL
      freeze fix; checklist all-pass; known issues documented below)
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

- game/src/gameplay/questScript.ts — M1 D2 complete (2026-06-12). THE glue:
  tutorial corridor (move glyph fade, mask-shrine 3 s beat w/ forced first
  transform, creek Bound whisper, gate F-teach, scripted first gust via new
  wind.triggerGustNow()), all six canon objectives (ambient 15 m + Dialog 1
  w/ Z1/Z2 re-offer, door-blocked step, window-leap parabola, 4 interior
  optionals + futon→shutter-slam chain + diary overlay, dagger pickup,
  sandals OR window exits, Dialog 6 + storm escalation, 3 branch cuts gated
  to calm/telegraph, Dialog 7 → stand+bow → dissolve → wind.stopForever()
  → 2 s quiet → body marker → body reveal → medallion → ending), guide
  kitsunebi retargeting, yanagi.fear brace whisper, suzu on quest ticks.
  +3 i18n keys per locale (whisper.mask, cut.1, cut.2). Restart = reload.
  Full scripted browser walkthrough EN + CS-spotcheck passed, zero console
  errors (see D2 notes). main.ts: DEV block removed, QuestScript wired,
  F-gated behind hasMask.

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

### M1 D-core — integrator notes (for the questScript agent)
Files created (2026-06-12): engine/renderer.ts (SRGB+NoToneMapping, pixelRatio ≤1.75,
PCFSoft shadow map, onResize plumbing) · engine/camera.ts (IsoCamera: ortho az 45°/el 30°,
dir (0.6124,0.5,0.6124) dist 60, viewHeight 14/9 tweened, exp follow 1−exp(−dt·6) clamped
0..1, look-ahead = velocity·0.15 s, soft bounds clamp [bounds minus vh/2·aspect × vh/2 —
inverted range locks centre, which is how the interior pins the camera], shake(amp,dur),
punch(0.02) punch-zoom, projectToScreen(world,out) for the bubble projector) ·
gameplay/player.ts (PlayerController: accel 30→3.2/5.0 + exp friction; collide-slide
circleVsStatics vs LIVE collider array; Bound 3 m/0.35 s/0.6 s cd w/ parabolic root arc +
dust+Footstep, skips colliders in a setBoundPassable() set mid-hop; Brace = held Space
human (stagger AND knockdown immune — DESIGN §3 finale "Brace beside her"); lash stagger
×0.4 when human+outdoors+open; applyKnockdown(pushDir Vector2) → 0.45 s push ≈3 m → 3×E or
2 s recover, 0.8 s grace; F→setForm + FormChanged emitted at request; footstep cadence by
stride distance w/ surface from sceneDirector) · gameplay/interactions.ts (registry:
register() returns unregister; nearest-in-range, facing dot>0.25 w/ <0.45 m near-override,
priority ties→distance; humanOnly/foxOnly drive HUD crossed-paw blocked prompt; E fires
onInteract + Interacted; canInteract injected) · gameplay/triggers.ts (TriggerDef =
TriggerVolume + form?: KitsuneForm; once auto-unregisters; disabled-while-inside fires
onExit) · gameplay/sceneDirector.ts (fade 0.3 → re-parent travellers [avatar.root,
vfx.root] + swap colliders + teleport + viewHeight/bounds + wind.setEnabled → fade 0.3;
emits EnterInterior/ExitInterior AFTER fade-in; locks player controls during swap) ·
gameplay/wind.ts (calm 10–14 s [setCalmRange] → telegraph 3 s → lash 4 s; seeded
mulberry32; strength envelope calm ~0.15/telegraph→0.55/lash 0.9; dir NW→SE (0.707,0.707)
±10° wander per gust — uniforms.uWindDir.value ALIASES state.direction; GustStart
('telegraph'|'lash')/GustEnd/WindStopped; lash-zone check calls player.applyKnockdown
(away-from-centre) via setPlayer/setLashZones; setEnabled(false) cancels in-flight gust;
stopForever() emits WindStopped immediately, eases strength→0) · main.ts (full composition
root; update order input→wind→player→triggers→interactions→world/chars→vfx→camera→audio,
render at order 100 runWhenPaused, input.lateUpdate at 1000).
- Core touches (additive, documented): input.ts `clearPressed()` (drops pending
  just-pressed; called on PhaseChanged, DialogEnded, PaperOverlayClosed and pause-resume —
  fixes the stale-Esc/E leak from the E-ui note + an instant pause-reopen bug found in
  browser); loop.ts dt clamp is now 0..MAX_DT (negative dt from a non-monotonic timestamp
  source diverges exponential damping — found via test harness, one-word guard).
- main.ts exterior light rig is a D-core placeholder until A-style lighting.ts: hemi fill
  + moon key (1024² shadow, 40×40 ortho frustum that FOLLOWS the player) + warm rim;
  shadows enabled by traversal (transparent materials never cast). Interior keeps
  B-world's in-group lights.
- boundPassable: the creek-narrows water collider [B1] is picked out of
  exterior.colliders BY VALUE (aabb x −10..−6, z 4..6) in main.ts — if B-world retunes
  the creek in M2, update that match (or tag the collider properly).
- **DEV-PROVISIONAL registrations in main.ts (ids `dev-*`) — DONE: all replaced by
  questScript.ts on 2026-06-12 (D2 notes below)** (single block, clearly marked):
  `dev-gate` (gate E-opens, humanOnly —
  replace w/ tutorial F-beat), `dev-door-exterior` (door bubble dlg.m.doorBlocked — no
  flags set; replace w/ step-2 logic + door.blocked dialog), `dev-window-leap` (fox E →
  enterInterior(windowLanding) — no leap parabola/cutscene yet), `dev-int-door` +
  `dev-int-sandals` (both exit → exterior door anchor; no canon sandals gating),
  `dev-int-window` (fox leap back out), `dev-ambient` trigger (15 m whisper, sets
  ambientHeard, once) and `dev-ghost` (E → dialogSystem.start(DialogRoot.main) — build
  order said placeholder bubble; upgraded to the real tree to integration-test the
  runner: full A1→G1 walk verified, QuestStarted → banner works). Mask shrine, dagger
  drawer, papers, table/futon, branch cutting, body mound: NOT registered — all
  questScript's. Form switching is currently enabled unconditionally (mask not gated;
  questScript gates F behind hasMask + scripts the shrine beat).
- Handoff surface questScript needs from main.ts scope: dialogSystem, questSystem,
  interactions, triggers, sceneDir, wind, vfx, exterior/interior builds, player,
  flagStore, screens, hud, isoCam, audio — suggest constructing QuestScript in main.ts
  with exactly these (everything is already instantiated there). A DEV-only
  `window.__kitsune` debug handle {player, sceneDir, wind, director, isoCam, getFlags}
  exists behind import.meta.env.DEV for scripted browser verification — keep it.
- Pause volume slider still placeholder (M3); restart is full location.reload() (per
  build order fallback; in-memory reset is M4 polish if wanted).
- Verified in browser (vite dev, screenshots: title diorama / spawn glade / gate /
  interior / promontory): build + tsc green, zero console errors; walk + tree/fence/
  water collision; human funnel-blocked at hollow-log gap (stops ~0.18 u into the gap
  mouth — reads fine in greybox), fox passes; Bound crosses creek narrows, water blocks
  walking; gate fox=crossed-paw / human E-opens (collider spliced live); lash stagger
  measured exactly 1.28 u/s; Brace speed 0 + applyKnockdown rejected while bracing;
  lash-zone knockdown + push + "Mash E" hint + auto-recover (2 s) verified, 3×E mash
  path code-reviewed (browser timer throttling made it unmeasurable); transform burst +
  punch-zoom + time-dip + HUD form pop; window-leap → interior (camera tightens to vh 9,
  locks centre) and door/sandals exit back; title→intro→play, pause open/resume (incl.
  the stale-Esc fix), locale L toggle EN↔CS live, Esc correctly blocked while dialog
  open; full Dialog 1 tree A1→…→G1 → QuestStarted → objective-1 banner. NOTE: the
  preview tab was background-throttled (rAF 0–6 fps) — all timing-sensitive checks were
  done via teleports/state reads; a human playtest at 60 fps is still wanted in M1
  VERIFY.

### M1 D2 questScript — notes (2026-06-12)
Files: NEW gameplay/questScript.ts · main.ts (DEV block removed; QuestScript
constructed + update(dt) wired after interactions; F-gated behind hasMask; debug
handle extended) · wind.ts (ONE additive method `triggerGustNow()` — fires a full
telegraph→lash cycle if calm/enabled; the scripted first gust past the gate) ·
i18n/en.ts + cs.ts (+3 keys each, parity kept: `whisper.mask`, `cut.1`, `cut.2`
— 134 keys per locale now).
- **F-gate (main.ts):** pre-mask, a just-pressed `transform` swallows the whole
  just-pressed set for that frame via input.clearPressed() (no per-action API;
  same-frame F+E collision is the only casualty and is unreachable in practice).
- **Mask beat:** cutscene phase 3 s — burst VFX at 'shrine-mask' (mesh hidden) →
  hasMask + FORCED avatar.setForm('fox') + FormChanged emitted by questScript →
  violet `whisper.mask` → back to play. hasTransformed flips false→true inside
  the beat.
- **Dialog auto-offer:** ghost r 3 trigger re-fires after dialogs because
  disabled-while-inside fires onExit — guarded with a suppression flag set on
  DialogEnded(main.* with questProgress 0) and cleared only once the player is
  >4.5 u from the ghost (canon "re-approach re-offers"). Manual Talk interactable
  bypasses suppression. Same pattern guards Dialog 6.
- **Interior optionals use the bubble channel** (DESIGN §5 channel 2), not the
  dialog panel: table/futon/scare/papersAfter/sandals/doorBlocked go through
  screens.showBubble with flags set by questScript. The M0 dialog nodes int.*/
  door.blocked stay in data/dialogs.ts unused (harmless; M4 may delete).
- **Scare (Dialog 4):** futon Explore → 1.5 s → GustStart('lash')+GustEnd
  emitted as audio-only events (wind itself stays disabled inside), paperRustle,
  0.3 s camera shake, papers tossed ballistically by questScript (settle keeps
  drifted XZ), "Ah!" then "Stupid wind." One-shot; skipped (still marked done)
  if the player flees the interior within the delay.
- **Window leap:** scripted 0.6 s parabola on the avatar root, fade-swap fires
  at 45 % of the arc; teleport+idle on landing comes free from sceneDirector.
- **Branch cuts:** positions from cuttableBranches world transforms; enabled
  only exterior + step 5 + hasDagger + human + wind.phase !== 'lash' (+ a busyT
  anim lock so E can't double-fire during the 0.5 s cut). Cuts persist across
  knockdowns. After the 3rd cut wind.setPlayer(null) — she's freed, so no
  knockdowns during thanks/bow/dissolve (wind stops forever moments later).
- **THE SEQUENCE:** DialogEnded('thanks') → cutscene → standAndBow (3.6 s) →
  dissolve 3 s (setDissolve lerp + 3 ghostSmokePuffs + ghostDissolved SFX) →
  GhostDissolved + wind.stopForever() (WindStopped) → 2 s held quiet → body
  marker wisp visible + phase play. Body Explore → paper overlay (canon body
  text) → close → questProgress 7 + QuestStepCompleted(6) → QuestSystem emits
  QuestCompleted → 1.5 s hold → ending screen (medallion card + prose).
- **Guide kitsunebi:** 2 extra wisps (createWisps, homes mutated live) ease
  toward the current objective (shrine → willow → door → window → willow →
  body mound), hidden while interior or quest done; + 1 dedicated marker wisp
  at the body mound lit after the dissolve.
- **RESTART = full window.location.reload()** (pause Restart, ending R AND
  ending Esc-to-title — reload boots to title anyway). Chosen because
  wind.stopForever() is one-way and branchFallFade disposes the cut meshes;
  reload is deterministic and instant in an asset-free app. In-memory restart
  (straight back to PLAY) is M4 polish if wanted.
- **Deviations / M2+ notes:** dagger HUD icon by the objective line (DESIGN §9
  "quiet dagger icon") NOT added — hud.ts is E-ui-owned; the banner refresh to
  Objective 4 carries the information for M1. yanagi.fear brace-whisper near
  her during a post-step-5 lash IS implemented (once per gust) but was only
  code-reviewed, not browser-verified (timing-fiddly headless). The
  hint.move glyph can be cleared early by main's GustEnd hint handler if a
  gust cycles during the title screen (cosmetic, pre-existing handler).
- **VERIFY (scripted browser run, vite dev, EN then CS, zero console
  errors/warnings):** move glyph + F dormant pre-mask ✓ shrine beat (cutscene
  → forced fox → whisper → unlock, mask hidden) ✓ F toggles after ✓ creek
  Bound whisper + Bound across narrows + water blocks walking ✓ gate fox
  crossed-paw + "F — transform" hint → F → E opens ✓ scripted first gust
  trigger fired (telegraph on field entry) + brace hint at lash + stagger
  1.28 u/s + brace immunity ✓ ambient whisper at 15 m (canon line) ✓ Dialog 1
  auto at 3 m → Z1 refusal (no quest, questRefused, no banner, no re-offer
  loop while standing inside) → walk away → re-approach re-offers → full
  A1→B1→C3→D2→E2→F1→G1 → QuestStarted + Objective 1 banner ✓ door bubble +
  step 1→2 ✓ fox window leap → interior + step 2→3 ✓ table/futon bubbles +
  shutter-slam scare ("Ah!"/"Stupid wind.", shake, papers) ✓ diary overlay
  (4 canon fragments) → sad bubble ✓ drawer Explore as fox → dagger Take
  crossed-paw → F → Take (hasDagger, step 3→4, mesh hidden) ✓ sandals
  Explore→Remove → door exit → exterior ✓ door re-entry + window leap-out
  (BOTH exits) ✓ Dialog 6 auto at willow → step 4→5 + calm 8–10 ✓ branch
  prompts disabled during lash + lash-zone knockdown + E-mash recover ✓ cuts
  1/2 with counter bubbles in calm windows, fox E correctly refused ✓ 3rd cut
  → Dialog 7 → bow → dissolve → wind stopped (strength 0, world still) → 2 s
  quiet → marker wisp + Objective 6 ✓ body overlay → progress 7 + "Quest
  completed" + medallion card + ending prose ✓ R → reload → title → fresh
  flags → shrine beat + Dialog 1 re-offer work again ✓ CS: live L-toggle
  mid-dialog re-renders choices, Dialog 1 CS lines verbatim, title "Nářek pod
  vrbou" ✓. tsc + vite build green; purity grep clean.

### M2 A-style — notes (2026-06-12)
A first A-style agent was interrupted mid-work; its WIP (ramps, materials,
shaders, lighting, postfx) was AUDITED, fixed and browser-verified by a second
agent. Audit verdict: structurally complete and spec-shaped (bloom .85/.35/.4,
half-res mips, MSAA half-float target, grade=vignette+grain+indigo lift,
5-light exterior rig w/ one 1024² PCF map, shared uniform holders, opacity
proxies on ghost/wisp) — but it shipped with the postfx white-out.
- **WHITE-OUT ROOT CAUSE (not postfx config):** NaN vertex data feeding the
  bloom chain. (1) `lanterns.ts paintStone` divided by `mossTo = 0` for the
  firebox posts (`1 − y/0` → −Inf → NaN vertex colors on 12 verts × 8
  lanterns); (2) `meshUtils.noisyLathe` finial profile returns radius 0 at
  t=0 → degenerate ring → zero-length normals → `normalize(0)` = NaN in GLSL.
  NaN is immune to the bloom threshold (`smoothstep(NaN)=NaN`) and the mip
  blur smears it into a screen-covering white blob; the direct render path
  clamps to the canvas and shows nothing. Diagnosed by pass/threshold/object
  bisection in the browser + CPU-side attribute scan. Fixed at the source
  (guarded moss lerp; lathe radius clamped ≥4 mm) — two surgical lines in
  B-world files, flagged here for B-world review.
- **Postfx hardened (style-owned):** bloom high-pass now zeroes non-finite
  texels and caps radiance at 8.0 — content bugs can never white the frame
  again. Grain 0.02→0.015.
- **Second color bug:** `renderer.setClearColor` converts for the SCREEN at
  call time, so the composer's linear buffer received sRGB-encoded clear
  values → OutputPass re-encoded them (washed-lavender void past map edges).
  Fixed by setting `scene.background` in both light rigs (WebGLBackground
  converts per bound render target). Sky dome below-horizon now also melts
  to zenith-deep (it held the horizon band and read lavender at iso angles).
- **Lighting (physical falloff, r165+):** window PointLight 14→4.5, moved
  1.7 u clear of the wall (was 0.58 u → ~40× radiance → bloom fireball);
  lantern 7→5, decay 2; rim 0.32→0.24. Water grade deepened (centre stays
  lakeDeep; shore ring 1.3×/0.55 → 1.12×/0.38).
- **Sway hookup completed:** B-world authors aSwayWeight but never passed
  `sway: true` — willowGreen toon materials now default to sway injection
  (inert without the attribute). 9 exterior meshes sway (curtains, reeds,
  grass heads); `faceted()` no longer spams toNonIndexed warnings.
- **VERIFY (vite dev, browser screenshots, zero console errors):** title
  diorama ✓ spawn glade ✓ willow shore + teal wisps + ghost ✓ cottage w/
  gentle shoji bloom ✓ interior warm rig ✓ postfx enabled everywhere;
  deep-indigo night, no white-out, no grey wash. tsc + vite build green;
  purity grep clean.
- **Perf (exterior willow view, pixelRatio 1.75):** 165 draw calls total
  incl. ~16 composer fullscreen passes → ~148 scene draws vs ≤120 budget
  (mostly the 8 un-merged stone-lantern groups — B-world merge scope);
  interior ~86 vs ≤60 (C-chars avatar part count). Tris 71.9k / 2.3k —
  far under 150k. Flagged for the M5 perf audit, not fixed here.

### M2 C-chars — notes (2026-06-12)
A first C-chars M2 agent left uncommitted WIP (new geo.ts + reskinned human/
fox/yanagi + vfx smoke tweak); it was AUDITED, finished and browser-verified
by a second agent (same pattern as A-style/F-audio). Audit verdict: complete
and contract-clean — all named groups/pivots/APIs/anim code intact, palette
keys valid, ghost-clone dissolve path untouched. Two art fixes + one polish
were applied on top (below). All public APIs and the rig contract unchanged.
- **NEW characters/geo.ts** — mesh-crafting helpers: xf (bake TRS), warp,
  paint/paintFlat (vertex colors over pre-bake coords), mulFor (palette-key
  multiplier vs toon base color — vertex colors MULTIPLY in MeshToonMaterial),
  fuse (merge + dispose), lathe (radii clamped ≥4 mm), remapUvY (dodge ghost
  hem erosion). NaN-guards baked in per the A-style white-out lesson; runtime
  attribute scan of all three rigs: 0 NaN, 0 zero-length normals.
- **mizumiHuman** (498 tris, 10 meshes + 10 ink hulls = 20 draws, same draw
  count as the M1 placeholder): ~5-head teenage girl — indigo kimono lathe
  top + cream collar V + vermillion obi/knot, dark indigo-black bob + side
  flaps + low twin-tails, kitsune mask worn OFF-face on the head's right
  (cream plate, vermillion brow + ear tips), flared knee-length skirt panels
  w/ cream under-robe hem on the 4 existing springs, bare legs + wooden
  sandals. One vertex-colored toon material (paperBone base). NOTE: ~42 %
  over the ~350 spec budget — kept for head/mask/sleeve readability; tris
  are perf-noise vs the 150k frame budget and draw count didn't grow.
- **mizumiFox** (358 tris, 11+11 hulls): slender kitsune — vermillion-orange
  coat melting to cream belly/chest ruff (normal-based paint), white face
  mask-markings + dark nose, BIG dark-tipped ear blades, dark sock legs,
  3-seg brush tail. smokeWhite toon base so whites stay faintly spectral.
- **yanagi** (368 tris, 7 draws, no hulls — ghost shader IS the outline):
  bell-lathe purple kimono w/ hem floating above ground (uv.y 0 at hem →
  shader erosion tatters it to nothing, no legs), bowed head + long loose
  black hair (cap/fall/strands), cradling sleeves, cream shawl baby bundle
  pushed proud of the sleeves so it silhouettes at iso distance, 6 pale-
  violet petal quads riding the robe (uv.y remapped up past the erosion
  band) = floral pattern hint. 5 owned ghost-material clones tinted via
  uBase (kimonoPurple/bone/ink-hair/aged-shawl/petal); setDissolve →
  opacity → shader uDissolve proxy verified 0.85→0.425→0→restore.
- **vfx.ts**: smoke pool billboards quad → CircleGeometry(0.55, 8) — the
  ghost shader's hem erosion tatters a soft octagon instead of flashing
  hard box corners. Burst ring/wisps/embers/poof untouched.
- **Anim constant changes** (proportions demanded): human arm splay
  armLZ/armRZ ±0.12 in locomotion (wide kimono sleeves clear the obi);
  fox tail SEG_SCALE/SEG_PIVOT retuned twice so the 3 chained segments
  overlap ~50 % and read as ONE brush (root 0.06/sz1.7 → belly 0.085/sz1.5
  → tip 0.068/sz1.8 w/ white blend, pivots −0.28/−0.13/−0.13, mesh z −0.1).
  Everything else (strides, bobs, springs, crossfades, one-shots) M1-exact.
- **VERIFY (vite dev :5184, scripted browser, zero console errors/warnings):**
  human idle/walk closeups (mask + obi read both sides) ✓ numeric walk
  sampling: exact arm/leg counter-swing, bob 0.665–0.72, skirtB spring lag ✓
  F both directions; frame-frozen mid-burst shot (octagon smoke + violet
  spiral wisps + flash; swap hidden) ✓ fox closeup + sit (spirit-sense:
  haunches down, ears pricked, tail curled w/ white tip) ✓ numeric trot:
  FL=BR/FR=BL diagonal pairs, tail0→1→2 follow-through, random ear flick
  0.53 rad observed ✓ yanagi: hover sine + sway, cradle pose w/ readable
  bundle, floral petals, hem tatter; standAndBow timeline sampled
  (hunch→rise→bow 0.55→straighten, callback fired); dissolve+restore ✓
  silhouettes read at gameplay vh 14 (ghost = small glowing bowed figure,
  human's vermillion obi visible) ✓ ink hulls clean, no z-fight halos ✓
  NaN scan 0 / no white-out ✓ tsc + vite build green; purity + raw-hex
  greps clean. Tab-sharing note: 5173 was being driven by the parallel
  B-world agent — added `.claude/launch.json` config `game-dev-c` (:5184)
  for an isolated session.
- **Open issues / handoffs:** (1) human 498 vs ~350 tri budget (noted above,
  recommend accept). (2) The Cursed Willow canopy fully occludes Yanagi AND
  the player at iso angle from the S/SE approach — DESIGN §4's occluder-fade
  (to ~15 % ink) is the planned M4 fix; flagging that it's REQUIRED for the
  finale staging readability, not just polish. (3) Moon-shadow map reads
  chunky/blocky in closeups (1024² over 40×40 — fine at gameplay zoom;
  A-style/M5 call). (4) HUD form glyph goes stale only via the DEV-only
  debug `setFormInstant` path (no FormChanged emit) — not a player-reachable
  bug, no action needed.

### M2 B-world — notes (2026-06-12)
A first B-world M2 agent was interrupted mid-work. Its WIP was AUDITED by a
second agent: committed props (terrain, water, willow, vegetation, lanterns,
meshUtils) were already done; the UNCOMMITTED worktree WIP (cottage.ts,
propsInterior.ts, sky.ts, wisps.ts, interior.ts, exterior.ts, water.ts)
turned out essentially COMPLETE and spec-shaped — all frozen signatures/
anchors/extras intact (door/window anchors + crate stack, papers[7], drawer/
dagger/setDrawerOpen/setDoorOpen, cuttableBranches/setGateOpen/update),
palette-ratio vertex colors via tone()/toneLerp() (no raw hex), thatch =
5 stacked jittered slope-grid courses w/ straw striations + flared eave +
ridge/uma-nori, shoji = lattice over warm emissive plane, tatami = beveled
two-tone alternating-weave w/ heri borders, sky = dome + moon disc w/ maria
+ wisp halo + 2 star Points layers + 2 frayed cloud bands, wisps =
kit.wisp(colorKey) additive shader w/ spectralViolet cursed-canopy motes,
Lissajous drift + WindState nudge. The flagged draw-call fix was ALSO
already in the WIP: 8 stone-lantern bodies + cottage + willows + dock +
terrain/water dressing all routed through mergeStatic (noMerge identity
passthrough for cores/named meshes); interior dressing merged likewise.
- **Audit fixes (this agent):** (1) water.ts — the A-style water shader's
  shore term is radial in UV space (built for the lake disc); on the short
  north-creek strip it stamped a bright ELLIPSE mid-stream. Fixed by pinning
  the long-axis UV at 0.5 per creek piece → creeks now lighten at their
  BANKS only. (2) interior.ts — kitchen divider repainted as a slid-open
  shoji panel (cell shadow lines + rails, thinned 0.3→0.12) — it read as a
  bright white monolith next to the andon; added the mood-board kitchen
  wall rack over the counter (rail + ladle + clay pot + cleaver, all in the
  merged dressing → ~0 extra draws).
- **VERIFY (vite dev, browser screenshots, zero console errors/warnings):**
  spawn corridor (shrine w/ vermillion roof + mask, hollow log, creek,
  fences) ✓ willow shore + promontory closeup (cursed willow w/ violet
  canopy motes, ghost, warm stone lantern, dock, stepping stones) ✓
  field-to-cottage distance shot — the amber shoji window IS the only warm
  light and pulls from across the boulder field (DESIGN §4 sightline) ✓
  cottage closeup (thatch courses + flared eave, post-and-beam walls,
  engawa, glowing lattice window, crate stack, yard fence + path) ✓
  interior overview (tatami island, low table w/ 2 moldy plates +
  chopsticks, unmade futon w/ subtle stain + thrown blanket, 7 scattered
  diary sheets, andon hearth-light, shrine nook, genkan + sliding door +
  sandals) ✓ kitchen corner (counter + jar/bowls, hanging utensils, drawer
  visually slides open w/ dagger on the tray, divider reads as shoji) ✓
  sky documentation shot at debug vh 150 (moon + soft halo bloom, star
  field + bright sparks, 2 cloud bands, horizon band melt) ✓ NO white-out
  anywhere (NaN guards held; no new degenerate geometry). tsc + vite build
  green; purity + raw-hex greps clean.
- **Draw calls (total per frame incl. ~16 composer passes, pixelRatio
  1.75):** willow-shore view 123 total ≈ ~107 scene draws (was 165/~148 at
  the A-style audit — Δ ≈ −41); cottage view 105 ≈ ~89; interior 69 ≈ ~53.
  Budgets met: exterior ≤120 ✓, interior ≤60 ✓. Tris ~82k exterior / ~9.5k
  interior (≤150k ✓).
- **Notes / handoffs:** (1) The moon disc can NEVER enter the gameplay
  frustum (iso ortho at vh 14 — any upper-dome feature projects v≈70 u;
  the dome contributes the horizon-band melt + low stars; the moon exists
  for the water-shader glint axis + title/debug framings). Not a bug —
  geometry of the camera. (2) Interior camera is bounds-pinned to the room
  centre, so the kitchen alcove always reads at overview distance — drawer
  open/close is visible but small; M4 may want a brief camera nudge on
  setDrawerOpen. (3) wisps flicker per-mesh via scale (shader uPhase is
  per-material and kit.wisp() caches per colorKey — scale flicker keeps the
  cache shared). (4) Exterior `update(dt, wind)` drives wisps + lantern
  flicker — already wired in main.ts.

### M3 F-audio — notes (2026-06-12)
A first F-audio agent was interrupted mid-work; its WIP (engine.ts buses,
music.ts insen score, sfx.ts recipes) was AUDITED, finished and browser-
verified by a second agent. Audit verdict: the WIP was structurally complete
and correct — every spec item present (unlock-on-gesture, master→{music,sfx,
ambience} buses, −6 dB dialog duck + ≈−23 dB diary duck, persisted M-mute,
shared 2.8 s reverb send, 72 BPM 26-bar D-insen loop with FM-piano motif/
seeded graces, Karplus-Strong koto, pad, root–fifth drone, title/exterior/
interior/ending states w/ 1.8 s crossfades, WindStopped holdSilence, music-box
lullaby + diary hum, pink-noise→dual-bandpass wind ambience, all 13 SfxName
recipes + playSlam + per-direction transform). main.ts wiring was already
complete — NOT touched.
- **Audit fixes (all in audio/, stream-F-owned):** (1) MIX — isolated
  Tone.Meter metering showed dialogBlip (−24 dB) louder than the hero
  transform (−27 dB) and suzuBell nearly inaudible (−42 dB): blip −18→−23
  (deliberate deviation from spec's −18 — bare 1.2 kHz sine reads hot),
  gliss FM −10→−6, sweep −14→−11, ping −16→−8 (+3rd suzu partial), wood
  noise −15→−13 + hotter thump, whoosh −12→−7, plucks −12→−9, music box
  −10→−7. (2) RECIPE GAP — the →fox transform had no "low whomp" (DESIGN §2):
  added MembraneSynth D2 at burst start; →fox now meters at parity with
  →human (−24.7 vs −24). (3) DEV taps — music.debug() (state/voice gains/
  wind values) + __kitsuneAudio.nodes() for scripted meter taps (DEV-only).
- **VERIFY (vite dev + scripted browser, zero console errors, zero
  AudioContext warnings):** first keypress unlocks (context running,
  transport started, 72 BPM, title gains up; uiConfirm from the unlock
  keypress flushes via the pendingSfx buffer) ✓ intro→play crossfades to
  exterior ✓ EnterInterior → interior gains (piano 0, kotoMotif .85) +
  ambience muffle (gain .4 / LP 900 Hz); ExitInterior restores ✓ indoor
  GustStart('lash') = shutter-slam one-shot, −13 dB the hottest moment ✓
  gust telegraph→lash ambience swell metered (calm .034 → telegraph .10 →
  lash .47 @ ~800 Hz + howl band, decay back to .02) ✓ footsteps: 8 grass
  steps / 7.9 m cadence wired via Footstep(surface) ✓ transform F both
  directions ✓ dialog duck .5 on DialogStarted, 1.0 on DialogEnded; diary
  duck .07 + faint hum; restore on close ✓ 12 rapid dialogBlips — throttled,
  no errors ✓ M mute: master→0, kitsune.muted='1', persists across reload
  (HUD "Ztlumeno" pre-gesture), M unmutes ✓ wind.stopForever(): strength→0,
  all voice gains→0, ambience→0, master floor −299 dBFS (digital silence,
  the payoff); setState while held correctly refused ✓ PaperOverlayOpened
  post-WindStopped → music-box lullaby cue ✓ setState('ending') → loop parts
  muted, transport paused, through-composed D-minor→D-major resolve plays ✓
  26-bar loop wrapped at accelerated BPM with zero scheduling errors (clean
  seam — voices ring across the boundary) ✓. Mix: worst-case master peak
  −13 dB (slam), bed ~−27, ambience floor −55 calm — no clipping anywhere.
  tsc + vite build green; purity grep clean (zero audio files, full
  synthesis).
- **Open issues / handoffs:** pause-menu volume slider still a visual
  placeholder — screens.ts (E-ui-owned) exposes no hook; AudioHandle.
  setMasterVolume(v01) is ready and waiting (M4-P2). Ambience continues at
  its last level while the loop is paused (Transport keeps running under
  the pause scroll — acceptable, M4 may duck it). Headless-tab note for
  scripted verification: rAF parks between bursts — patch rAF to setTimeout
  AND force one frame (screenshot) before timing-sensitive checks; loop-
  driven key handling (M, F) queues until frames tick.

### M4 P1 gameplay-feel — notes (2026-06-12)
Files: NEW gameplay/occluderFade.ts + gameplay/papers.ts · engine/camera.ts
(speed-zoom breathing + setRumble) · gameplay/wind.ts (once-per-gust knock +
shader-clock wind-down) · gameplay/player.ts (knockdown cost + guards) ·
gameplay/questScript.ts (leap/scare/finale/dolly/first-gust) · main.ts
(wiring, hint guard, lash rumble) · SURGICAL world touches: willow.ts
(canopy mesh named+tagged occluder/noMerge) + exterior.ts (tagCanopyOccluder
on the 6 field-tree singles). All browser-verified on :5173 (scripted
foreground-frame runs via rAF→setTimeout pump; NOTE: every tab wake makes
the vite client full-reload the page — patch rAF, force one frame via
screenshot, THEN drive, all in one eval).
- **Occluder fade (C-chars open issue #2 — REQUIRED, now fixed):** meshes
  tagged `userData.occluder` (4 willow leaf-curtain canopies + 6 field-tree
  crowns; 10 total) are collected once with world bounding spheres; per
  frame each is tested against the fixed player→camera ray (one dot product
  + perp distance vs sphere radius +0.4 m margin — NO raycast). Opacity
  eases to 0.15 (rate 9/s in, 3.5/s out, transparent flips back off when
  restored). Materials clone-on-first-fade per mesh (kit mats are shared)
  and re-inject the sway patch (Material.clone() drops onBeforeCompile —
  faded curtains keep swaying). The bark skeleton stays opaque → faded
  canopy reads as the DESIGN §4 "ink outline". VERIFIED: S/SE finale
  approach — Yanagi + player fully readable under the cursed willow
  (screenshot); row willows fade while walking the shore path; full
  restore when clear. Cost: +10 potential draws (frustum-culled); shore
  hotspot measured ~121 scene draws/frame (~137 incl. composer) — right at
  the ≤120 budget line, flagged for the M5 audit (cheapest trim: untag
  some field trees or accept).
- **papers.ts:** interior 7 sheets — rest-pose springs, slam(dir) impulse
  (lift 1.9–3.2, tumble axis+spin, paper terminal fall 1.15 u/s w/ side-
  slip glide), touchdown slerps flat over 0.45 s keeping drifted XZ
  (room-clamped ±4.6/±3.5), barely-there idle micro-yaw stir at rest.
  Scare now calls papers.slam(-0.9,0.25) (blast in from the EAST window) +
  camera shake 0.22→0.32 amp/0.3→0.4 s. 3 loose LEAVES on the willow-shore
  path: rest in calm → skitter hops on telegraph (the leaf-streak cue) →
  airborne downwind streaks during lash → settle; quiet respawn at home
  past 11 u during calm; lie flat forever after WindStopped.
- **Camera micro-moves (juice #8):** speed-zoom breathing — frustum eases
  to ×1.02 at full sprint, back at rest (measured 1.0→1.0199→1.0);
  setRumble(amp) continuous sin-based micro-shake wired in main to lash
  proximity (0.055·prox²·strength near lash zones, ≈0.017–0.03 u measured,
  0 in calm); reveal dolly — approaching the body mound (<5.5 u) post-
  dissolve eases viewHeight 14→12.9 (~8 %) over 2.6 s, releases >8 u
  (hysteresis latch; verified both ways); interior tighten 14→9 re-verified
  (=9.0 after leap); transform punch-zoom + 0.2 s lock + time-dip chain
  re-verified firing in order.
- **Knockdown/gust (DESIGN §3 + juice #14):** auto bail-out 2.0→2.6 s
  (3×E mash still ≈1–1.5 s — mashing now actually pays), push time 0.45→
  0.5 s, +0.25 s snap-free control lock + dust poof on recovery. Measured:
  4-press escape, 1.8 s down. NEW fairness rules: (1) a lash zone knocks
  down at most ONCE per gust — was a knock-LOCK loop when recovering deep
  inside a zone (re-knock on grace expiry, E-mash could never win); only a
  LANDED knock arms the rule, so dropping brace mid-lash stays punishable
  (verified: 0 re-knocks standing in-zone through a whole lash). (2) no
  knockdowns while !canPlayerAct() — the ghost STANDS inside the cursed
  lash zone, so Dialog 1/6/7 could be interrupted by a tumble under the
  panel. Fox knockdown in lash zones re-verified (both forms per design);
  brace stagger/knock immunity unchanged.
- **Leap arc:** 0.6→0.7 s (TECH_SPEC), height 1.35→1.55 (crate stack tops
  1.4 — visible clearance). Measured peak y 1.54, land+fade 0.93 s total,
  interior swap mid-arc clean.
- **Finale timing (the silence):** bow → +0.45 s held breath → 3.0 s
  dissolve → WindStopped → 3.0 s quiet (was 2.0) → marker + control.
  stopForever now ALSO winds the shared shader clock down to a halt
  (strength drains in ~1 s at rate 3.2, uTime rate eases 1→0 in ~3 s) —
  the sway shader keeps an idle breath at strength 0 and water keeps
  scrolling, so freezing uTime is what actually delivers "willows dead
  still, lake to glass". Verified trace: cuts 0.6/1.4/2.2 s → Dialog 7 at
  +0.9 → DialogEnded → bow → GhostDissolved+WindStopped at +7.0 →
  CutsceneEnd exactly +3.0 later; strength 0.185→0 in ~2 s; clock frozen
  by control return; ≥2 s of true stillness before the marker lights.
- **Tutorial (DESIGN §8):** full corridor re-walked fresh — move glyph
  clears on first input ✓ shrine beat (cutscene, mask hidden, forced fox,
  whisper) ✓ gate crossed-paw + "F — transform" hint → F → E opens ✓
  scripted first gust now has TWO wide volumes (field r 8 at (-15,-4.5)
  gated on gateOpened + shore r 6 at (7,-3) for the reed-tunnel fox route,
  shared one-shot guard) — fires reliably on field entry ✓. main.ts GustEnd
  hint-clear now only clears the brace glyph it owns (a gust cycling can
  no longer eat the move/transform tutorial glyphs).
- **VERIFY:** tsc + vite build green; purity + raw-hex greps clean; zero
  console errors/warnings across the whole scripted session; screenshots
  taken: finale-approach occluder fade, papers mid-flutter post-slam,
  reveal-dolly held shot at the marker.
- **Open issues / handoffs (playtest):** (1) shore-hotspot draw calls ~121
  vs ≤120 — M5 audit call. (2) Knockdown push distance varies with terrain
  (3 m nominal, less when slid into the lake-shore collider) — feels fine,
  watch in human playtest. (3) The synthetic walk can't judge SFX mix of
  the new beats (slam punch-up, silence drain) — human ears wanted at the
  M4 PLAYTEST line. (4) Pause-menu volume slider still placeholder (P2).
  (5) The guide-wisp pair + marker wisp keep drifting after WindStopped
  (intended — spirit lights, not foliage); flag if it reads wrong.

### M4 P2 presentation — notes (2026-06-12)
Files: style/postfx.ts (grade system) · style/shaders/ghost.ts (erosion-led
dissolve + up-bias + setGhostDissolve helper) · characters/yanagi.ts
(setDissolve → erosion path; ease-in draw-up 0.85 u) · characters/vfx.ts
(ghostSmokePuffs richer/longer; POOL_SMOKE 16→28) · ui/screens.ts ·
ui/hud.ts · ui/dialogUi.ts · ui/styles.css · i18n/en.ts (1 proofing fix).
Browser-verified on :5184 (preview MCP; MessageChannel rAF pump — the
setTimeout patch throttles to 1 Hz in background tabs, MessageChannel
doesn't; force one frame via screenshot so the parked loop re-arms into
the patched rAF).
- **GRADE HOOK (the reveal, DESIGN §5) — WIRED, no main.ts changes
  needed:** postfx.ts now has `setGrade(name, tweenSec)` on the PostFx
  instance + a module-level `setGlobalGrade()` proxy. Grades: 'normal' ·
  'inkReveal' (selective desat to ink-and-bone — violet hues exempt via a
  chroma test, vignette 0.56) · 'pauseDim' · 'dawn'. screens.ts (which
  owns the cinematic moments AND has the bus) drives it event-side:
  GhostDissolved arms the reveal → the NEXT showPaper (the body text, by
  canon order) tweens to 'inkReveal' over 1.8 s and the paper backdrop
  goes see-through (`.ke-paper.is-reveal` — overlay floats low over the
  HELD SHOT); showEnding eases to 'dawn' over 7 s; pause ↔ 'pauseDim'.
  P1/questScript may ALSO call setGlobalGrade()/postfx.setGrade() directly
  for extra beats — it tweens from current values, last call wins.
- **Ghost dissolve (juice #13):** the shader's uDissolve cutoff is now
  driven DIRECTLY (new exported setGhostDissolve(mat, t); yanagi falls
  back to the old opacity fade on stub kits). Body opacity holds ~full
  until t≈0.75 then fades — she visibly TATTERS instead of cross-fading.
  Cutoff biased +vUv.y·0.55 → erodes bottom-up ("drawn up by one last
  gust"); violet edge band widened (smoothstep 0.22) at 2.6× — blooms
  gently, capped by the hardened high-pass. The vfx smoke `.opacity`
  proxy path is untouched (puffs still fade-and-tatter). Verified at
  dissolve 0.32/0.55 closeups: bottom-up erosion + violet edges read.
- **Medallion ink-stamp (juice #16):** ending card hidden until
  `.is-stamped` (+700 ms) → hanko slam (scale 2.1→0.93→1.03→1, blur-in,
  gold drop-shadow pulse) + `.ke-medallion-bloom` vermillion radial flash
  behind the coin. Prose starts +2.4 s, then one line / 2.6 s, each line
  ink-WRITES itself L→R (clip-path wipe + blur dry). Ending backdrop is
  now a translucent vignette — prose paces over the LIVE still-lake shot
  with the dawn grade (DESIGN §6). Any key fast-forwards; R/Esc reload.
- **Intro:** hold-Esc-1 s skip implemented (DESIGN §6; M0 deviation
  resolved) w/ vermillion fill meter next to the skip label (interval-
  driven — rAF throttling immune); tap does nothing. 7 drifting ember
  petals per beat panel (pure CSS).
- **Title:** ensō now brush-draws itself (stroke-dash) + slow breathe;
  calligraphy blur-in + 11 s float drift. BUG FIXED: L on the title
  screen toggled the locale TWICE (screens' own toggle + main loop's
  input handler) — net no-op at 60 fps. Title now swallows L/M (so they
  don't "press any key"-start the game) and lets main's handler own the
  toggle; the title re-renders via the existing onLocaleChange hook.
- **Pause:** paper scroll got wooden rollers + unroll animation + lined-
  washi grain; world behind drains via 'pauseDim' (DESIGN §6 "frozen/
  desaturated" — render keeps running while updates pause, so the tween
  shows). Volume slider now CALLS `screens.setAudioHooks({
  setMasterVolume })` if wired — **HANDOFF (one line, main.ts, P1 or
  playtest):** `screens.setAudioHooks({ setMasterVolume: (v) =>
  audio.setMasterVolume(v) });` (AudioHandle.setMasterVolume has been
  ready since M3). Without it the slider stays visual-only.
- **Paper overlay (juice #12):** lines now ink-DRAW (clip-path wipe +
  blur-bleed dry, 1.05 s stagger) over an extra paper-fiber gradient
  layer. Reveal variant documented above.
- **HUD/dialog (juice #2/3/7):** interact prompt fades-up + settles on
  appear, [E] keycap bobs (display-flip restarts CSS anim; interactions
  only calls setPrompt on change — verified). Quiet dagger icon (DESIGN
  §9): inline tantō SVG by the objective title, shown by KEY INFERENCE
  (obj4/5/6 titles ⇔ hasDagger true by quest construction) — zero event
  wiring needed, fades/rotates in on banner reveal. Typewriter now
  breathes at punctuation (setTimeout chain: 260 ms after .!?…, 120 ms
  after ,;:—; blips skip punctuation/quotes); choices brush-in staggered
  80 ms. Banner/brush-stroke + wiggle kept from M1.
- **Grading final pass:** 'normal' grade values unchanged from the M2
  audit (bloom .85/.35/.4, vignette .42, grain 0.015 ≤ cap). New ink ramp
  tuned in-browser: shadows → inkCharcoal·0.55 (indigo-charcoal, never
  black), bone ramp smoothstep(0.015,0.55) so the held shot reads as an
  ink-wash page, not murk. Checked beats: title diorama, willow shore,
  cottage window pull, interior andon, reveal, ending — deep indigo
  everywhere, no wash-out.
- **EN+CS proofing (in context, both locales):** canon lines verified
  VERBATIM against _extracted/ ("Ach áno", "Ublížili mi", "But it can't.",
  "Yes. I managed to find her.", paper fragments, "Přeseknout větve vrby"
  objective — all canon, kept). ONE fix in OUR authored text: EN end.6
  "dad's forbiddings" → "dad's rules" (CS untouched). Played in browser:
  title/intro/pause/controls CS ✓ full Dialog 1 tree walked in CS (10
  nodes incl. C1/D1/E1 + C3/D2/E2/F1/G1, all diacritics correct) ✓ diary
  overlay CS ✓ Dialog 6 EN ✓ body text EN ✓ ending EN + CS (medallion
  card, lore, 10 prose lines — no overflow) ✓ pause buttons fit ✓.
  i18n parity intact (compile-enforced; build green).
- **VERIFY:** tsc + vite build green ×3 during the pass; purity grep
  clean; zero console ERRORS across the whole scripted session.
  Screenshots taken: title EN + CS, intro beat w/ embers + skip meter,
  obj4 banner w/ dagger icon, Dialog 6 panel, dissolve mid-erosion
  closeup (0.32), body reveal w/ ink grade over held shot, ending EN
  (stamp + prose over lake), ending CS, pause scroll CS w/ pauseDim.
- **Open issues / handoffs (playtest):** (1) the pause-volume one-liner
  above. (2) Tone.js "Max polyphony exceeded. Note dropped." warnings
  appeared ONLY under the accelerated scripted run (compressed cut/blip
  bursts) — audio/ is F-owned; if a human 60 fps run reproduces it, raise
  polyphony or throttle dialogBlip. (3) Optional P1 polish: a slow camera
  drift toward the lake during phase 'ending' would sell DESIGN §6's
  "drift across the still lake" (the lake already sits in frame from the
  willow shore, so this is a nice-to-have). (4) Locale persists in
  localStorage — a CS playtest follows EN unless cleared (kitsune.locale).

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

### M4 PLAYTEST — notes (2026-06-12)
Full quality-gate playtest: one complete EN run at real-time pacing (scripted
browser on :5173, MessageChannel rAF pump = true 1x wall-clock; synthetic
keys through the real Input path, walking the real colliders — no teleports
on the critical path), one full CS run (well beyond the planned spot-run:
title→intro→Dialog 1 (B1 branch)→diary→dagger→D6→cuts→D7→ending), plus
targeted audio/pause/mute/persistence sessions. Files touched (3, surgical):
main.ts (1 line) · audio/sfx.ts · gameplay/questScript.ts (1 flag).

**FIXES APPLIED**
1. main.ts — the P2 pause-volume one-liner: `screens.setAudioHooks({
   setMasterVolume: (v) => audio.setMasterVolume(v) })`. VERIFIED live:
   slider 100→30 ramps master gain 0.5→0.15; restored on release.
2. audio/sfx.ts — **CRITICAL freeze fix**: recipes share mono synths
   (thump: windowLeap + footstepWood; boom: transform/knockdown/branchCut)
   and two triggers ≤0.4 s apart throw a Tone Timeline error ("time must be
   greater than or equal to the last scheduled time") INSIDE the loop tick —
   and GameLoop.tick never reschedules after a throw, so the whole game
   freezes permanently (render/UI keep running; gameplay dead). Hit
   organically in the CS run: window leap-out while still moving on the wood
   floor → wood footstep at leap+0.06 s → hard freeze. Reproduced on demand
   (2-line repro), fixed by wrapping play()/playSlam() recipe bodies in
   try/catch (worst case under the guard: one quiet layer of one SFX is
   skipped). RE-VERIFIED in situ: moving window leap → no errors, leap
   completes, wind/gameplay alive.
3. audio/sfx.ts — Tone "Max polyphony exceeded" warnings DID reproduce at 1x
   (8 organic drops in the EN run; deliberate tests confirmed transform
   gliss + suzu ping overflow at F-spam density — and F-spam is a design
   pillar). maxPolyphony 6→12 on glissFm/ping/sines. After: 0 drops across
   7×F-spam, the previously-failing burst, both endings, and ~80 s of
   exterior/interior crossfading music. (The large historical warning count
   in the console buffer is attributable to pre-fix runs + the frozen-loop
   incident where the Transport kept scheduling with no update ticks.)
4. gameplay/questScript.ts — q-papers (diary) was readable in FOX form;
   DESIGN §2 reserves "read papers" for human (fox = nose-only). Added
   `humanOnly: true` — crossed-paw re-teaches F, mirroring the adjacent
   dagger. (Mechanism verified 3× this session on gate/door/dagger.)

**CANON CHECKLIST (DESIGN §9) — all PASS**
- 15 m ambient trigger ✓ (ambientHeard + whisper event on the shore walk)
- Full Dialog 1 branch tree ✓ — EN: A1→B3→C2→D1→E1→C3→D2→E2→F1→G1 walked
  verbatim incl. the E1→C3 loop; CS: A1→B1→C1→D1→E1→C3→D2→E2→F1→G1 +
  B3 path choices. Z1 refusal fully exercised (canon "Shh, child…" line,
  no quest granted, no re-offer while standing in the trigger, re-approach
  re-offers); Z2 choices present at E1/E2/F1 and share the verified
  zExit/refuseQuest path (pass by code-path equivalence).
- Six objectives in order ✓ (questProgress 1→7, both runs)
- Both cottage exits ✓ (sandals→door EN; window leap-out EN + CS)
- table/futon/papers optionals + futon→shutter-slam chain ✓ (slam fires
  1.4 s after futon E as audio-only GustStart('lash') pair + camera shake +
  papers tossed/settled; "Ah!"/"Stupid wind." bubbles; sandals examine is
  dagger-gated by canon order — confirmed not offered pre-dagger, offered +
  Remove after)
- Exact readable fragments EN+CS ✓ (diary 4 fragments + body text verbatim
  both locales, diacritics clean, no overflow)
- Dissolve-then-discover ordering ✓ (bow+0.45 → 3.0 s dissolve →
  GhostDissolved+WindStopped → 3.0 s held quiet → marker → body overlay)
- The empty shawl ✓ ("In her hands she holds an empty shawl." / "V rukou
  drží prázdný šátek.")
- Yanagi onna medallion ✓ (stamp + bloom + 柳女 lore card + 10 prose lines +
  R/Esc footer, EN + CS)
Tutorial §8: all 6 beats ✓ (move glyph clears on input; shrine 3 s cutscene
forces fox + violet whisper; log gap fox-passes/human-blocks; creek Bound
(water blocks walking); gate crossed-paw → F-hint → F → E opens; scripted
first gust full telegraph→lash cycle on field entry). Hold-Esc intro skip ✓
(1 s hold, meter, no stale-Esc pause leak). R restart → fresh boot → title →
NEW RUN shrine beat re-verified ✓. Esc on ending → title ✓. Pause ✓ (scroll,
pauseDim, resume, restart=reload). Mute M + persistence across reload ✓.
CS locale persistence across reload ✓ (kitsune.locale; title boots Čeština).

**AUDIO (human-pace checks)**
Music states title→exterior→interior→ending all observed live (+ interior
muffle gain .4/LP, dialog duck .5, diary duck .07 + hum, lullaby cue path on
the body overlay post-WindStopped, ending through-composed resolve clean).
Gust swell↔telegraph sync is structural (one wind.state.strength value
drives shaders AND audio.update) and was metered in M3. Footstep surfaces
wired per-surface (grass/wood observed via events; mix metered in M3).
Transform pair fired both directions dozens of times (incl. the →fox whomp).
wind.stopForever → digital silence verified in RUN1 (strength 0, world
still). Zero console ERRORS across the entire multi-hour session.

**PLAYTIME / PACING**
Wall-clock for the full EN run was bot-inflated (~33 min incl. agent
latency, navigation retries, deliberate double-tests). Subtracting measured
harness overhead, a first-time human reading everything lands ≈15–18 min;
skipping some optionals ≈10–13 min — consistent with the 8–15 min target,
median ~12. Nothing drags: the longest forced wait anywhere is one gust
cycle (~17–20 s). Finale cutting took ~15 s of waiting total (cut 1 in a
telegraph window, cuts 2+3 chained in the next calm) — far under the 2.5 min
ceiling, so NO calm-window tuning was needed (wind.ts untouched).

**Known issues (shipped)**
1. Shore wedge: a knockdown in the willow-row lash zone can push the player
   into the corner between willow trunk #2 (12.4,−7.4, r 0.4 collider) and
   the lake collider; holding SE there yields zero movement until the player
   steers any other direction (instant self-recovery). Annoying at worst;
   left untouched at the gate rather than retune shore colliders blind.
2. Shore draw-call hotspot ~121 scene draws vs ≤120 budget (pre-existing
   P1 flag) — M5 perf-audit call (cheapest trim: untag 1–2 field-tree
   occluders).
3. GameLoop.tick does not reschedule rAF if an update fn throws — any
   in-loop exception freezes the game permanently. The only observed thrower
   (audio recipes) is now guarded at the source; the kernel was deliberately
   left untouched at the final gate. M5 may consider a try/catch around
   entry.fn as cheap insurance.
4. One unexplained ~2 min control stall after an intro hold-Esc skip in one
   scripted CS boot (velocity stayed 0 with valid input/axis while wind,
   render and UI ran; self-resolved; not reproduced across 3 other
   boot/skip cycles incl. the full EN run). Suspected harness artifact
   (synthetic keys + background-tab pump); watch in any human pass.
5. Finale chaining: branch clusters are close enough that a pre-positioned
   player can cut 2–3 branches inside ONE calm window — the "intended dance"
   (one cut per window) is not enforced. Reads as player skill, not a bug;
   flagged for design awareness.
6. Ending screen R/Esc + pause Restart remain full page reloads (M1
   decision, unchanged).
