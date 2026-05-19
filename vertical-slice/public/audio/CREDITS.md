# Audio Credits

All tracks in this folder are licensed for free redistribution in a game
prototype. Most are CC0 (public domain — no attribution required). One track
(`willow.ogg`) is CC-BY 4.0 and is credited below.

Files are loaded by `src/systems/AudioSystem.ts` via the `AudioManifest`
array. Replace any track by overwriting the file with the same key/extension,
or update the manifest path.

> Total combined audio size: ~11 MB.

## Music

### `music/title.mp3` — Title + End scene
- **Title:** "What is Left" (Sad Scene Music)
- **Author:** SeKa
- **License:** CC0 (Public Domain) — no attribution required
- **Source:** https://opengameart.org/content/sad-scene-music-what-is-left
- **Direct URL:** https://opengameart.org/sites/default/files/WhatIsLeft_0.mp3
- **Notes:** A short, melancholy piano-driven theme. Loops well as title music.

### `music/willow.ogg` — WillowLake hub
- **Title:** "Kawarayu"
- **Author:** Yubatake
- **License:** **CC-BY 4.0** — attribution required (see below)
- **Source:** https://opengameart.org/content/kawarayu
- **Direct URL:** https://opengameart.org/sites/default/files/Kawarayu.ogg
- **Style:** Japanese enka-style traditional folk ballad, shamisen lead.
  Replaces the originally-requested Hisaishi-style piano because no
  comparable CC0 piano track was available; the shamisen leans into the
  Japanese-folklore vibe instead.
- **Required attribution string** (also displayed in-game ideally):
  > "Kawarayu" by Yubatake (CC-BY 4.0) — https://opengameart.org/content/kawarayu

### `music/cottage.mp3` — Cottage interior
- **Title:** "Haunting Piano"
- **Author:** Emma_MA
- **License:** CC0 (Public Domain) — no attribution required
- **Source:** https://opengameart.org/content/haunting-piano
- **Direct URL:** https://opengameart.org/sites/default/files/haunting%20piano_0.mp3
- **Notes:** Sparse, ghostly piano. Fits the "oppressive, abandoned home" beat.

## Sound effects

All seven SFX files come from two CC0 packs on OpenGameArt:

### Pack 1: "80 CC0 RPG SFX" by Phyrnna
- **License:** CC0 (Public Domain) — no attribution required
- **Source:** https://opengameart.org/content/80-cc0-rpg-sfx
- **Direct URL:** https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip
- **Files extracted from this pack:**
  - `sfx/cut.ogg`      ← `blade_02.ogg` (sharp slice, 0.3s)
  - `sfx/interact.ogg` ← `book_01.ogg` (paper / page turn, 0.7s)
  - `sfx/transform.ogg`← `spell_01.ogg` (magic chime / sparkle, 0.6s)
  - `sfx/pickup.ogg`   ← `metal_02.ogg` (metallic ring, 0.6s — for the dagger)
  - `sfx/dialog-blip.ogg` ← `item_gem_02.ogg` (tiny gem-tick, 0.2s)

### Pack 2: "100 CC0 SFX #2" by rubberduck
- **License:** CC0 (Public Domain) — no attribution required
- **Source:** https://opengameart.org/content/100-cc0-sfx-2
- **Direct URL:** https://opengameart.org/sites/default/files/sfx_100_v2.zip
- **Files extracted from this pack:**
  - `sfx/jump.ogg`     ← `sfx100v2_air_02.ogg` (short air whoosh, 1.1s)
  - `sfx/wind.ogg`     ← `sfx100v2_loop_ambient_01.ogg` (10s seamless ambience loop)

### Pack 3: "Fantozzi's Footsteps (Grass/Sand & Stone)" by Fantozzi
- **License:** CC0 (Public Domain) — no attribution required
- **Source:** https://opengameart.org/content/fantozzis-footsteps-grasssand-stone
- **Direct URL:** https://opengameart.org/sites/default/files/Fantozzi-footsteps.7z
- **Files extracted from this pack:**
  - `sfx/footstep.ogg` ← `Fantozzi-SandR1.ogg` (soft sand/dirt step, ~0.3s)

## Sources we tried and skipped

- **Pixabay Music** — search results were promising, but the site returns
  HTTP 403 to bots, so no direct CDN URLs could be fetched without a real
  browser session. If you want a true Hisaishi-style piano + strings track,
  manually browse https://pixabay.com/music/search/japan%20style%20piano/
  and drop the file in as `music/willow.mp3` (overwrite the OGG and update
  the manifest path).
- **FreeSound.org** — direct downloads require an account/JS session, so
  files couldn't be fetched non-interactively.
- **Sonniss GDC packs** — gated behind 1+ GB downloads with email signup;
  unfeasible to fetch automatically.
- **Original "First Light Particles" (CC0 piano/ambient track)** — the only
  format on OGA was a 25 MB WAV, far over the budget.

## Replacing tracks

To swap any track for one you prefer:
1. Download the new file (must be CC0 or CC-BY with attribution added here).
2. Drop it at the same `music/<name>.mp3` or `sfx/<name>.ogg` path.
3. If the extension changes, also update the `path` in
   `src/systems/AudioSystem.ts` → `AudioManifest`.

## Per-track licence summary

| File                  | Licence  | Attribution required? |
|-----------------------|----------|------------------------|
| music/title.mp3       | CC0      | No                     |
| music/willow.ogg      | CC-BY 4.0| **Yes** — Yubatake     |
| music/cottage.mp3     | CC0      | No                     |
| sfx/cut.ogg           | CC0      | No                     |
| sfx/interact.ogg      | CC0      | No                     |
| sfx/transform.ogg     | CC0      | No                     |
| sfx/pickup.ogg        | CC0      | No                     |
| sfx/dialog-blip.ogg   | CC0      | No                     |
| sfx/jump.ogg          | CC0      | No                     |
| sfx/wind.ogg          | CC0      | No                     |
| sfx/footstep.ogg      | CC0      | No                     |
