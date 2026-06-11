/**
 * English strings — ALL player-facing text.
 * Dialogue and quest lines are VERBATIM from the canon EN script
 * "Kitsune Escape _ Cry under the Willow"; branch-only variants
 * (B1/B2, E2, Z exits…) are faithful translations of the canon CS
 * branching doc in the same voice. Intro/ending prose authored fresh
 * from the High Concept premise.
 *
 * `en` is the key source of truth: cs.ts is compile-checked against
 * `keyof typeof en`, so the two locales can never drift apart.
 */
export const en = {
  // ── UI chrome ──
  'ui.title': 'Kitsune Escape',
  'ui.subtitle': 'Cry under the Willow',
  'ui.pressAnyKey': 'Press any key',
  'ui.loading': 'Loading…',
  'ui.menu.language': 'Language',
  'ui.lang.en': 'English',
  'ui.lang.cs': 'Čeština',
  'ui.pause.title': 'Paused',
  'ui.pause.resume': 'Resume',
  'ui.pause.restart': 'Restart',
  'ui.pause.sound': 'Sound',
  'ui.sound.on': 'On',
  'ui.sound.off': 'Off',
  'ui.intro.skip': 'Hold Esc to skip',
  'ui.ending.restartHint': 'R — restart · Esc — title',

  // ── controls / help ──
  'controls.title': 'Controls',
  'controls.move': 'WASD / Arrows — move',
  'controls.interact': 'E — interact / advance dialogue',
  'controls.transform': 'F — put on the mask: shift between girl and fox',
  'controls.bound': 'Space (fox) — Bound: a quick hop that crosses creek gaps',
  'controls.brace': 'Space (human) — Brace: kneel and hold fast against gusts',
  'controls.choices': '1–4 — dialogue choices',
  'controls.language': 'L — language EN/CS',
  'controls.mute': 'M — sound on/off',
  'controls.pause': 'Esc — pause',

  // ── HUD ──
  'hud.form.human': 'Human',
  'hud.form.fox': 'Fox',
  'hud.muted': 'Muted',
  'hud.hints': 'L language · M sound · Esc pause',

  // ── tutorial glyphs & contextual hints ──
  'hint.move': 'WASD — move',
  'hint.interact': 'E — interact',
  'hint.transform': 'F — transform',
  'hint.bound': 'Space — Bound',
  'hint.brace': 'Space — Brace',
  'hint.wiggleFree': 'Mash E to wiggle free!',
  'hint.foxCannot': "A fox can't do that — press F to change back",

  // ── interact prompts (canon verbs) ──
  'prompt.open': 'Open',
  'prompt.take': 'Take',
  'prompt.explore': 'Explore',
  'prompt.cut': 'Cut through',
  'prompt.remove': 'Remove',
  'prompt.talk': 'Talk',
  'prompt.read': 'Read',

  // ── speakers ──
  'speaker.mizumi': 'MIZUMI',
  'speaker.yanagi': 'YOUNG WOMAN',
  'speaker.yanagiRevealed': 'YANAGI ONNA',

  // ── quest ──
  'quest.title': 'Cry under the Willow',
  'quest.description':
    'A young woman and her young son need you to bring her a dagger from her cottage. She got tangled in the willow branches and can’t get away.',
  'quest.started': 'New quest',
  'quest.completed': 'Quest completed',
  'quest.obj1.title': "Find the young woman's cottage",
  'quest.obj1.hint': 'Cross the night field to the cottage — look for the warm light in the window.',
  'quest.obj2.title': 'Get to the cottage in a different way',
  'quest.obj2.hint': 'The door is blocked. A fox could leap through the open window.',
  'quest.obj3.title': 'Find the dagger',
  'quest.obj3.hint': "Her husband's dagger is hidden in the kitchen drawer.",
  'quest.obj4.title': 'Return to the woman crying by the willow tree',
  'quest.obj4.hint': 'Bring the dagger back to the woman under the willow.',
  'quest.obj5.title': 'Cut the willow branches',
  'quest.obj5.hint': 'Cut the branches of the cursed willow — wait for the calm between gusts.',
  'quest.obj6.title': 'Search the willow area',
  'quest.obj6.hint': "Something glimmers among the willow's roots.",

  // ── the woman's ambient line (15 m, no input) ──
  'dlg.ambient.yanagi':
    "Shh, don't cry, little one. The wind might stop soon. And hopefully, that cursed willow will finally let us go.",

  // ── main branching dialog — player choices ──
  'dlg.c.a1': 'Can I help you in any way?',
  'dlg.c.z1': 'Take care.',
  'dlg.c.b1': "Why don't you return home?",
  'dlg.c.b2': 'How far is your home?',
  'dlg.c.b3': 'Has the little one managed to fall asleep yet?',
  'dlg.c.c1': 'How so?',
  'dlg.c.c2': "What's wrong with the willow?",
  'dlg.c.c3': "I'll help you get home.",
  'dlg.c.d1': 'What happened?',
  'dlg.c.d2': "Why shouldn't I?",
  'dlg.c.e1': 'What do you mean?',
  'dlg.c.e2': "I can do it. You don't have to worry about me.",
  'dlg.c.f1': "I won't. What do you need from me?",
  'dlg.c.g1': "I'll be happy to do it. I'll be right back.",
  'dlg.c.z2': "I'm afraid I must go.",

  // ── main branching dialog — her answers ──
  'dlg.y.a1':
    "Oh yes please. The little one didn't want to sleep at night, so I took him outside for fresh air. But a very strong wind caught us, so I hid here under the willows.",
  'dlg.y.b1': "We can't, it's not possible. That cursed willow won't let us go.",
  'dlg.y.b2': 'Just a little way. We live nearby. But oh, that cursed willow.',
  'dlg.y.b3': "He's trying to sleep, he's trying. But it can't. The willow will not let him.",
  'dlg.y.c12': 'Those branches of hers. Oh, how it hurt when that strong wind blew. It hurt a lot.',
  'dlg.y.c3': "You'd be very kind, dear. But I'm not sure if you can manage it.",
  'dlg.y.d1': 'Her branches are too long. They hurt me.',
  'dlg.y.d2': "A young fox like you shouldn't be roaming the night.",
  'dlg.y.e1': "That's because of the wind. The branches lashed out at me. Oh, my poor back.",
  'dlg.y.e2': "I'm not afraid anymore. And hopefully you won't be afraid either.",
  'dlg.y.f1':
    "If you would be so kind as to come to my cottage and bring me my husband's dagger, hidden in the kitchen drawer. I got tangled in the long branches of that cursed willow, and I have nothing to cut them with to free myself.",
  'dlg.y.z': 'Shh, child. Someday someone will come who helps us.',
  'dlg.y.fear':
    'Fear is all I have left. Oh my little one, shhh, hopefully it will be over soon, dear.',

  // ── return with the dagger (Dialog 6) ──
  'dlg.y.return1':
    "Oh, you're back. Do you have my dagger? Shh, don't cry, little one. We'll go home soon.",
  'dlg.m.return2': 'Yes. I managed to find her.',
  'dlg.y.return3': "You're our savior, little fox. Please, cut the branches of that cursed willow.",

  // ── after the third cut (Dialog 7) ──
  'dlg.y.thanks':
    'Thank you my dear. Finally, we can go home. And the little one will be able to sleep peacefully.',

  // ── Mizumi's self-talk ──
  'dlg.m.doorBlocked': "It won't budge. Looks like the door's blocked by something.",
  'dlg.m.table':
    "Yuck, that stinks. Hopefully, she didn't feed this to the baby. But I don't see a knife or a dagger here.",
  'dlg.m.futon':
    "The little one seems to wet the bed often at night. But it looks like they haven't slept together here for a long time.",
  'dlg.m.scare1': 'Ah!',
  'dlg.m.scare2': 'Stupid wind.',
  'dlg.m.papersAfter':
    "Poor woman. She's having a really tough time in life. I wonder where her husband went.",
  'dlg.m.sandals': 'Could the strong wind have blown these and caused the doors not to open?',

  // ── quest-script beats (M1 D2: shrine whisper + branch-cut counter) ──
  'whisper.mask': 'The mask is cold against her face — and the night opens its eyes.',
  'cut.1': 'One branch cut. Two still hold her.',
  'cut.2': 'Two branches cut. One still holds.',

  // ── readable diary (paper overlay) — canon fragments verbatim ──
  'paper.title': 'Scattered pages',
  'paper.line1': "He's not sleeping again .. he's still crying and just crying ..",
  'paper.line2': "I don't know what to do .. I'm up to it .. .. alone ..",
  'paper.line3': '.. sometimes helps when .. … cold, fresh air .. ..',
  'paper.line4': 'Maybe .. they could sometime .. walk',
  'paper.closeHint': 'E — close',

  // ── body reveal (paper overlay over the held shot) ──
  'body.title': 'Beneath the cursed willow',
  'body.text':
    'The woman strangled herself on the willow’s branches long ago. The state of the body says it did not happen recently — it has been a much, much longer time. The skin is dry and wrinkled. Willow branches are tangled around her neck. In her hands she holds an empty shawl.',

  // ── medallion ──
  'medallion.award': 'Medallion unlocked: Yanagi onna',
  'medallion.title': 'Yanagi onna (柳女) — willow woman',
  'medallion.lore':
    'A spirit that appears beneath willow trees late at night — a young woman, sometimes carrying a child in her arms, begging passersby for help. A motherly spirit who seeks her child’s wellbeing even in death.',

  // ── the kitsune mask (shrine pickup) ──
  'mask.name': "Kyūbi's dream",
  'mask.desc': "From the twilight's wood tanned by foxfire's dance. Holds the whispered words.",

  // ── intro narration (6 beats, authored from the High Concept) ──
  'intro.1':
    "Life isn't easy for Mizumi at home. Her parents don't understand her — and with her father, every little thing turns into an argument.",
  'intro.2':
    "She wishes so much that her dad would understand her. That she wouldn't have to be angry with him all the time.",
  'intro.3':
    "One night she can't take it anymore and runs away from home. She falls asleep in the nearby forest, under her favorite tree.",
  'intro.4':
    'When she wakes, she is not in the forest she knows so well. This forest is full of yokai — spirits, goblins, demons and other strange beings.',
  'intro.5':
    'At the roots of the tree lies an ancient kitsune mask. Through it, Mizumi can take the form of an ancient and powerful fox — and to find her way home, she must help the spirits of the forest and fulfill their wishes.',
  'intro.6':
    'But she must be careful — they say the dark lord of the forest already knows about her, and wants to capture her… And somewhere by the lake, under the willows, someone is crying.',

  // ── ending reflection (authored fresh; the theme must land) ──
  'end.1': "The medallion is cool in Mizumi's palm. Yanagi onna — the willow woman.",
  'end.2':
    'Night after night she sat beneath the willow, begging every passerby for the same small kindness.',
  'end.3': 'Not for herself. For the little one in the empty shawl.',
  'end.4':
    'A mother holds on. Even when the wind is stronger than she is. Even when nothing is left of her but the holding.',
  'end.5':
    'Mizumi thinks of her own home. Of the door she slammed. Of words that whipped like branches in the wind.',
  'end.6': "Maybe her dad's forbiddings are a kind of holding on too. Clumsy. Too tight. But holding.",
  'end.7':
    "It's okay to be different. And the ones closest to you stay your stable point — even when you run from them into the night.",
  'end.8':
    'The willows stand still. The lake has turned to glass. For the first time tonight, the forest is quiet.',
  'end.9':
    'Across the water, the dark thins into the first grey-blue breath of dawn. Morning comes.',
  'end.10':
    'Somewhere beyond the trees waits the road home. Mizumi closes her hand around the medallion and walks toward it — thinking of her father.',
} as const;

/** Every translatable key — cs.ts is compile-checked against this. */
export type TranslationKey = keyof typeof en;
