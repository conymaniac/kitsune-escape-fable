# Kitsune Escape — 3D Vertical Slice: Technical Spec

Stack: **Three.js + TypeScript (strict) + Vite + Tone.js**. App lives in **`game/`** at repo root.
Companion document: `docs/DESIGN.md` (gameplay design of record). Canon text sources: `_extracted/`.

**CLEAN-ROOM RULE: never read, import, or copy anything from `vertical-slice/`. All content data
(dialogs, quests, i18n EN+CS) is authored fresh from `_extracted/` docs. No raster textures, no
image loading, no audio files anywhere: CI-grep guard
`TextureLoader|ImageLoader|\.png|\.jpe?g|\.ogg|\.mp3|\.wav|data:image` must find nothing under `game/src`.**

## 0. Architectural pillars

1. **Two `THREE.Scene` instances** (exterior, interior), each with its own light rig + fog;
   `SceneDirector` swaps them behind a 0.3 s DOM ink-fade. No roof-hiding.
2. **Stub-implements-final-interface.** M0 ships every cross-stream module as a working stub that
   already implements the final public API. Later milestones replace internals, never signatures.
3. **Procedural animation only** (phase-driven sin/lerp on segmented rigs). No AnimationMixer.
4. **DOM overlay UI** for all text (dialog, HUD, screens). Serif system stack, no webfonts.
5. **Toon shading via runtime-generated 4×1 `DataTexture` gradient ramps** (code-built lookup
   tables — procedural, allowed). Vertex colors for intra-mesh variation. Custom `ShaderMaterial`
   only for water/ghost/wisps/sky/sway-injection.
6. **No full-screen outline pass.** Inverted-hull ink outlines on the 3 characters only + rim
   light + palette discipline.
7. **rAF clamped delta** (`dt = min(elapsed, 0.05)`), single ordered update list. No fixed timestep.
8. **No physics lib.** Player = circle vs static AABB/circle list, axis-separated move-and-slide.

## 1. Project skeleton (file = single responsibility; module boundaries = agent ownership)

```
game/
├── index.html              Canvas + #ui root, loads /src/main.ts
├── package.json            deps: three, tone; dev: typescript, vite, @types/three if needed.
│                           scripts: dev / build ("tsc --noEmit && vite build") / preview
├── tsconfig.json           strict, noUncheckedIndexedAccess, paths @/* -> src/*
├── vite.config.ts          alias @ -> /src, build.target es2020
├── .gitignore              node_modules, dist, .vercel
└── src/
    ├── main.ts             Composition root only (~100 lines): builds renderer/scenes/systems/UI,
    │                       wires GameDirector, starts loop.
    ├── core/                                  ── CONTRACTS + KERNEL (M0) ──
    │   ├── types.ts        ALL shared types: GamePhase, KitsuneForm, GameFlags, DialogNode/Choice/
    │   │                   DialogContext, QuestObjective, Interactable, TriggerVolume, ICharacter,
    │   │                   CharacterAction, IAudio, IHud, IScreens, IDialogUi, WindState,
    │   │                   ColliderShape, MaterialKit, WindUniforms. Only `import type` from three.
    │   ├── events.ts       Typed EventBus (on/off/emit over GameEventMap) + GameEvent constants:
    │   │                   QuestStarted, QuestStepCompleted, QuestCompleted, DialogStarted,
    │   │                   DialogEnded, DialogBlip, FormChanged, GustStart, GustEnd, Knockdown,
    │   │                   KnockdownRecovered, EnterInterior, ExitInterior, Footstep, Interacted,
    │   │                   ItemPickedUp, BranchCut, GhostDissolved, CutsceneStart, CutsceneEnd,
    │   │                   LocaleChanged, PhaseChanged, PaperOverlayOpened/Closed, WindStopped.
    │   ├── flags.ts        GameFlags store: questProgress (0..7), hasDagger, hasMask, currentForm,
    │   │                   hasTransformed, sandalsExamined, questCompleted, paperRead, futonSeen…
    │   │                   + initialFlags(). Reset = fresh object.
    │   ├── loop.ts         GameLoop: rAF driver, clamped dt, ordered update fns, pause flag.
    │   │                   API: add(fn, order), start(), stop(), setPaused(b).
    │   ├── input.ts        Action-mapped keyboard/mouse: axis():Vector2, justPressed(action),
    │   │                   actions: Interact(E), Transform(F), FormVerb(Space), Advance(Space/
    │   │                   Enter/click), Choice1..4, Lang(L), Mute(M), Pause(Esc), Restart(R).
    │   │                   anyGesture promise for audio unlock.
    │   └── director.ts     GameDirector FSM: phase = boot|title|intro|play|cutscene|ending +
    │                       dialogActive overlay flag. API: phase, setPhase, canPlayerAct().
    ├── style/                                 ── STREAM A ──
    │   ├── palette.ts      THE palette, ~24 named hex constants (single source of color truth).
    │   ├── ramps.ts        makeToonRamp(steps, lift): DataTexture grayscale gradientMaps.
    │   ├── materials.ts    MaterialKit factory: toon(colorKey, opts), emissive(colorKey, i),
    │   │                   water(), ghost(), wisp(), sky(), ink(). Caches instances.
    │   │                   M0 stub: MeshLambertMaterial behind identical signatures.
    │   ├── shaders/chunks.ts   GLSL snippets: valueNoise2/3, fbm2, fresnel, fog injector.
    │   ├── shaders/water.ts    Lake shader (depth gradient, scrolling noise normal → stepped
    │   │                       highlight bands, moon glint streak, shore ring, vertex bob).
    │   ├── shaders/sway.ts     onBeforeCompile injector adding wind sway to toon materials
    │   │                       (aSwayWeight attribute + shared WindUniforms).
    │   ├── shaders/ghost.ts    Fresnel rim, scrolling noise alpha erosion, uDissolve 0..1.
    │   ├── shaders/wisp.ts     Additive radial-falloff quad (in-shader gradient), uPhase flicker.
    │   ├── lighting.ts     makeExteriorRig()/makeInteriorRig(): key+fill+rim (see §8); lantern
    │   │                   flicker handles.
    │   └── postfx.ts       PostFX: EffectComposer RenderPass→UnrealBloom(half-res)→Vignette
    │                       (cheap ShaderPass)→Output. API: setScene, render(dt), resize.
    ├── engine/                                ── STREAM D ──
    │   ├── renderer.ts     WebGLRenderer: SRGBColorSpace, NoToneMapping, pixelRatio ≤1.75, resize.
    │   └── camera.ts       IsoCamera: OrthographicCamera, azimuth 45°, elevation 30°,
    │                       dir=(0.6124,0.5,0.6124), dist 60, near 0.1 far 200. Frustum from
    │                       viewHeight (exterior 14, interior 9): top/bottom=±vh/2,
    │                       left/right=±vh/2*aspect. Exponential follow (1−exp(−dt·6)), world-
    │                       bounds clamp, look-ahead, shake(amp), setViewHeight(h, tweenSec).
    ├── world/                                 ── STREAM B ──
    │   ├── exterior.ts     buildExterior(kit): {group, colliders[], anchors{spawn, shrine, log,
    │   │                   creekGap, gate, willow, ghostSpot, dock, boulders[], window, door,
    │   │                   bodyMound, reedTunnel, fenceGap}, lashZones[], windShadows[]}.
    │   ├── interior.ts     buildInterior(kit): {group, colliders[], anchors{windowLanding,
    │   │                   doorSpawn, table, futon, papers, drawer, sandals, door}}.
    │   ├── colliders.ts    Static collider store + circleVsStatics(pos, r) → corrected pos.
    │   ├── merge.ts        mergeStatic(group) via BufferGeometryUtils, per-material.
    │   └── props/          terrain.ts (vertex-colored ground, path band), water.ts, willow.ts
    │                       (hero prop: lathe trunk + CatmullRom branch tubes + ribbon leaf
    │                       curtains w/ aSwayWeight; named cuttable branch meshes), cottage.ts
    │                       (walls/engawa/thatch=stacked jittered prisms/shoji emissive/door/
    │                       step), vegetation.ts (grass tufts, reeds, trees, rocks — merged),
    │                       lanterns.ts (lathe + emissive core), propsInterior.ts (table, futon,
    │                       papers=thin planes, kitchen+drawer, sandals, tatami), sky.ts (gradient
    │                       dome, code-built moon disc + halo, star Points), wisps.ts (Lissajous
    │                       drift, update(dt, windState)).
    ├── characters/                            ── STREAM C ──
    │   ├── rig.ts          Segmented-rig helpers: named Group tree, limb pivots, ICharacter base
    │   │                   with phase accumulator + action crossfade. addInkHull(mesh).
    │   ├── mizumiHuman.ts  ~350 tris. Idle breathe, walk arm/leg counter-rotate + bob, kimono
    │   │                   panels w/ inertia, cut/pickup action lerps.
    │   ├── mizumiFox.ts    ~300 tris. Trot diagonal pairs, spine/head bob, 3-seg tail follow-
    │   │                   through, ear flick, leap pose, sit (spirit-sense).
    │   ├── yanagi.ts       Ghost woman + baby bundle: hover sine, kit.ghost(), setDissolve(t),
    │   │                   sway ties to wind. Stands+bows for finale.
    │   ├── playerAvatar.ts Owns both forms; setForm(f) with burst VFX; update(dt, motionState);
    │   │                   radius human 0.35 / fox 0.25.
    │   └── vfx.ts          Transform burst (ring + wisp puffs + PointLight flash), ghost smoke,
    │                       branch-fall fade, dust poof, ember trail. Pooled, shader/geometry only.
    ├── gameplay/                              ── STREAM D ──
    │   ├── player.ts       PlayerController: accel 30 u/s², human 3.2 u/s fox 5.0 u/s, heading,
    │   │                   collide-slide, Bound (3 m hop, 0.6 s cd), Brace state, knockdown state
    │   │                   (E-mash recover ≤2 s), footstep cadence events, form switch requests.
    │   ├── interactions.ts Interactable registry {pos, radius, promptKey, enabled(), priority,
    │   │                   humanOnly?, foxOnly?, onInteract}. Nearest in-range + facing (dot>.25);
    │   │                   drives HUD prompt; fires on E.
    │   ├── triggers.ts     TriggerVolume registry (circle enter/exit): ghost ambient radius 15,
    │   │                   dialog radius 3, window leap point (fox-only), willow return zone,
    │   │                   tutorial beats.
    │   ├── sceneDirector.ts Owns active scene; enterInterior(spawn)/exitToExterior(spawn):
    │   │                   DOM fade 0.3 s → swap scene+colliders+camera viewHeight → fade in.
    │   ├── wind.ts         WindSystem: base oscillation ~0.15 + seeded gust scheduler (calm 8–14 s
    │   │                   per design escalation, telegraph 3 s, lash 4 s envelope). Owns shared
    │   │                   WindUniforms {uTime, uWindStrength, uWindDir}; emits GustStart/End w/
    │   │                   phase; lash-zone hazard checks; windStopped flag for finale.
    │   ├── papers.ts       Paper flutter sim: spring pos/rot, gust lift+tumble, settle.
    │   └── questScript.ts  THE glue: subscribes to bus; registers interactables/triggers per
    │                       quest step; sets steps 2 (door blocked), 3 (interior entered),
    │                       4 (dagger pickup); scripts mask-shrine tutorial beat, window-leap
    │                       parabola, shutter-slam scare, branch-cut sequence (3 clusters),
    │                       ghost dissolve, wind-stop, body reveal, medallion, ending handoff.
    ├── dialog/                                ── STREAM E ──
    │   ├── dialogSystem.ts Runner: start(rootId), advance(), choose(i), close(); resolves i18n
    │   │                   keys; onEnter/onSelect side-effects with DialogContext {flags, emit};
    │   │                   drives IDialogUi; sets director.dialogActive.
    │   └── questSystem.ts  Listens QuestStepCompleted/Started; objective from flags.questProgress;
    │                       HUD banner updates; QuestCompleted past step 6.
    ├── data/                                  ── authored fresh in M0 ──
    │   ├── dialogs.ts      Canon branching tree from "Interactive dialog" doc: nodes A1, B1–B3,
    │   │                   C1–C3, D1–D2, E1–E2, F1, G1 + Z1/Z2 refusal exits (no quest granted);
    │   │                   linear Dialog 6/7 (return + thanks); optional interior dialogs (table,
    │   │                   futon→shutter chain, papers, sandals); body-reveal text. All text via
    │   │                   i18n keys. onEnter/onSelect hooks set quest steps 1/5/6/7.
    │   └── quests.ts       Quest "cryUnderWillow": 6 steps (find cottage / enter another way /
    │                       find dagger / return / cut branches / search the willow area).
    ├── i18n/
    │   ├── index.ts        t(key), setLocale('en'|'cs'), getLocale(), onLocaleChange(cb);
    │   │                   localStorage persistence of locale only.
    │   ├── en.ts           Flat Record<string,string>. ALL EN text (authored from canon EN docs).
    │   └── cs.ts           ALL CS text (authored from canon CS docs — Czech is source-canonical
    │                       for dialogue; keep diacritics exact).
    ├── ui/                                    ── STREAM E ──
    │   ├── uiRoot.ts       #ui DOM layers (hud, dialog, screens, fade, paper), injects styles.
    │   ├── styles.css      All UI styling: storybook serif, dialog panel, banner, prompts,
    │   │                   paper overlay, fade, medallion card, pause scroll.
    │   ├── hud.ts          IHud: quest banner (brush-stroke reveal), interact prompt, form
    │   │                   indicator (inline SVG glyphs — vector, allowed), mute/lang hints.
    │   ├── dialogUi.ts     IDialogUi: speaker label, typewriter 35 c/s + blip events (throttled),
    │   │                   E completes-then-advances, choices 1–4/arrows/click, ink portrait
    │   │                   silhouettes (CSS/SVG).
    │   └── screens.ts      IScreens: Title (DOM over live diorama; lang select; press-any-key),
    │                       Intro (6 beats, hold-Esc skip), Ending (prose lines + medallion +
    │                       R restart), Pause (resume/restart/lang/volume), paper overlay.
    └── audio/                                 ── STREAM F ──
        ├── engine.ts       IAudio impl + Tone bootstrap: unlock on first gesture; buses master→
        │                   {music, sfx, ambience}; duck music −6 dB while dialogActive; mute (M)
        │                   persisted; shared Reverb send (~2.8 s).
        ├── music.ts        Transport 72 BPM, D insen scale (D,E♭,G,A,C). Voices: FM-piano sparse
        │                   falling motif w/ seeded grace notes, PluckSynth koto answers, slow-
        │                   attack pad, sine root/fifth drone. States: title|exterior|interior|
        │                   ending (D minor → D-major-ish resolve); music-box lullaby cue for the
        │                   reveal; clean Transport loop. Wind ambience: pink noise → bandpass
        │                   (center 250–900 Hz + gain track WindState.strength).
        └── sfx.ts          play(name): footstepGrass (filtered noise tick ±10% pitch),
                            footstepWood (+90 Hz thump), transform (FM gliss D-G-A-D' + swept
                            noise), interact blip (40 ms triangle 880), pickup (2 plucks a 5th +
                            metal ping), paperRustle (LFO-wobbled bandpass noise), windowLeap
                            (descending whoosh + landing), branchCut (noise snap + thud + koto
                            accent), ghostDissolve (3 detuned sines → long reverb + breath),
                            dialogBlip (25 ms sine ~1200 ±50, −18 dB), uiConfirm (2 rising blips),
                            knockdown thud, suzu bell (quest tick).
```

### Contracts written FIRST (M0)
1. `core/types.ts`, `core/events.ts`, `core/flags.ts`, `style/palette.ts`
2. Stubs honoring final APIs: `style/materials.ts` (Lambert), `audio/*` (no-op), `ui/*`
   (functional unstyled DOM)
3. Fresh-authored `data/dialogs.ts`, `data/quests.ts`, `i18n/en.ts`, `i18n/cs.ts`

DialogContext contract:
```ts
export interface DialogContext {
  flags: GameFlags;
  emit: <K extends GameEventName>(event: K, ...args: GameEventMap[K]) => void;
}
```

## 2. Iso camera & world model
Ground = XZ, +Y up, 1 unit = 1 m. Exterior ~80×64 sized to DESIGN.md route timing; interior 10×8
separate scene at origin. Camera as in `engine/camera.ts` above. Movement is camera-relative:
screen-up = world (−0.707, 0, −0.707).

## 3. Art techniques (see file notes above for per-prop recipes)
Silhouette rules (style-guide header in materials.ts): every prop reads at 64 px height;
exaggerate proportions 10–20 %; no face >~1.5 u without vertex-color variation; single light-
direction assumption; ink outlines on characters only. Merged static per material. Wisps/ghost/
water are the only transparent materials; additive wisps depthWrite:false.

## 4. Characters
ICharacter: { root: Group; update(dt, motion:{speed,heading,grounded}): void;
setAction('idle'|'walk'|'leap'|'cut'|'pickup'|'sit'|'brace'|'knockdown'|'none'); dispose() }.
Walk phase accumulates with distance (`phase += speed*dt*stride`) → footstep events sync free.
Form switch hides swap inside the 0.45 s burst flash; FormChanged event for HUD/audio.

## 5. Gameplay systems
Update order: input → wind → player → triggers → interactions → characters/world anims →
papers/wisps → camera → audio tick → postfx render. Quest wiring per DESIGN.md §4-5 and data
notes above. Window leap: fox-only trigger → input lock → 0.7 s parabola → fade-swap mid-arc.

## 6. Audio
Tone.js. Autoplay: `Tone.start()` on first gesture (title press doubles as unlock). All synthesis,
zero files.

## 7. Performance budget
60 fps @1080p on Intel Iris Xe. Draw calls ≤120 exterior / ≤60 interior; tris ≤150 k. Lights ≤5
per scene: moon key directional #bfd4ff 1.2 with ONE 1024² shadow map (tight 40×40 frustum over
playable spine), hemisphere fill (#2a3560/#1a1228, 0.6), warm rim 0.35 no-shadow, 2 PointLights
(window, lantern) no-shadow. Bloom half-res threshold .85 strength .35 radius .4; vignette trivial;
MSAA 4×; pixelRatio ≤1.75; NoToneMapping+sRGB. No per-frame allocations in update paths.

## 8. Build / verify / ship
- `npm run build` = `tsc --noEmit && vite build`; deps three + tone only.
- Per milestone: build green; dev-server browser screenshot (render sanity, zero console errors).
- M1+M4: scripted full quest walkthrough (6 objectives, both cottage exits, Z1/Z2 refusals, EN+CS,
  mute, restart).
- Asset-purity grep (see top) must be clean.
- Ship: `gh repo create conymaniac/kitsune-escape-fable --public -d "Kitsune Escape (Fable)"`,
  push branch as main. Vercel: rename project `project-adq26` → `kitsune-escape-fable` (scope
  `kitsune-escape`), `cd game && npx vercel link && npx vercel --prod` (Vite auto-detect → dist).
  Verify https://kitsune-escape-fable.vercel.app playable.

## 9. Milestones & ownership (no file owned by two agents in one milestone)
- **M0** (serial): scaffold, core/*, palette, stubs, data+i18n. Empty lit iso scene renders.
- **M1** (parallel): D-core (engine/, gameplay/, main.ts) · B-world (world/* greybox via stub kit)
  · C-chars (characters/* capsule placeholders) · E-ui (dialog/, ui/). Exit: full quest greybox-
  playable, both locales.
- **M2** (parallel): A-style (style/*) · B-world (world/props/* real) · C-chars (real meshes+anim
  +vfx).
- **M3** (parallel w/ M2): F-audio (audio/*).
- **M4**: P1 gameplay feel (gameplay/ tuning, camera, cutscenes) · P2 presentation (dissolve,
  title diorama, transitions, medallion, grading, locale proofing).
- **M5**: perf audit, purity grep, README, ship.
