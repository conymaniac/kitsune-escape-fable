# BUILD STATE — Kitsune Escape (Fable) vertical slice

Living checklist. Update the moment a unit of work completes, BEFORE starting the next.
On resume: read this file, skip what's done. Specs: `docs/DESIGN.md`, `docs/TECH_SPEC.md`.
Branch: `claude/wonderful-mclean-bad83d`. New app: `game/`. CLEAN-ROOM: never touch `vertical-slice/`.

## Status legend
- [ ] todo · [~] in progress · [x] done

## M0 — Scaffold + contracts + bilingual content
- [ ] game/ Vite+TS scaffold (package.json, tsconfig, vite.config, index.html, .gitignore)
- [ ] core/: types.ts, events.ts, flags.ts, loop.ts, input.ts, director.ts
- [ ] style/palette.ts + materials.ts STUB (Lambert behind final API)
- [ ] audio/ no-op stubs (engine.ts, music.ts, sfx.ts behind final IAudio)
- [ ] ui/ functional unstyled stubs (uiRoot, hud, dialogUi, screens, styles.css)
- [ ] data/dialogs.ts + data/quests.ts — authored fresh from _extracted/ canon docs
- [ ] i18n/index.ts + en.ts + cs.ts — ALL strings EN+CS
- [ ] main.ts renders empty lit iso scene; `npm run build` green
- [ ] COMMIT M0

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
