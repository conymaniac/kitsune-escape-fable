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
- [ ] B-world: world/exterior.ts + interior.ts greybox, colliders.ts, anchors, lash zones,
      wind shadows, props/ greybox stand-ins
- [ ] C-chars: characters/rig.ts, playerAvatar.ts, capsule placeholders (human/fox/yanagi)
- [ ] E-ui: dialog/dialogSystem.ts, questSystem.ts, ui/* functional (typewriter, choices,
      HUD, title/intro/ending/pause, locale toggle)
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
