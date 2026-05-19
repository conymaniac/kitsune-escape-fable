/**
 * English translations.
 *
 * Naming convention:
 *   ui.<screen>.<element>         — fixed UI labels
 *   intro.beat.<n>                — intro narration beats
 *   end.line.<n>                  — end-scene lines
 *   quest.<id>.<step>             — quest objective labels (title, description)
 *   dialog.<tree>.<node>          — dialog node body text
 *   choice.<tree>.<node>.<n>      — branching choice options
 *   hint.<context>                — floating hint texts
 *   speaker.<id>                  — speaker labels in dialog box
 *
 * Keep keys stable; lay translations against them in cs.ts.
 */

export const en: Record<string, string> = {
  // ── UI: Title ──
  "ui.title.title": "Kitsune Escape",
  "ui.title.subtitle": "Cry under the Willow — Vertical Slice",
  "ui.title.start": "Press SPACE or click to begin",
  "ui.title.controls":
    "← → / A D  move    SPACE  jump / advance    E  interact    F  transform",
  "ui.title.language": "Language",

  // ── UI: shared ──
  "ui.skip": "[SPACE] skip",
  "ui.dialog.hint.advance": "[SPACE]",
  "ui.dialog.hint.choice": "[1-4 / ↑↓ + ENTER]",
  "ui.end.title": "The End",
  "ui.end.restart": "Press R to restart · ESC to title",
  "ui.lang.toggleHint.en": "[L] EN",
  "ui.lang.toggleHint.cs": "[L] CS",

  // ── Speakers ──
  "speaker.MIZUMI": "MIZUMI",
  "speaker.YANAGI": "YANAGI ONNA",
  "speaker.NARRATOR": "",
  "speaker.PLAYER_CHOICE": "",

  // ── Intro beats ──
  "intro.beat.1": "Life isn't easy for Mizumi at home.",
  "intro.beat.2":
    "Her parents never let her do the stuff her friends are allowed to.",
  "intro.beat.3":
    "The toughest one is her father. They argue over every little thing.",
  "intro.beat.4": "One night, she can't take it anymore.",
  "intro.beat.5":
    "She runs into the forest and falls asleep under her favourite tree.",
  "intro.beat.6":
    "When she wakes, the forest is no longer the one she knows…",

  // ── End-scene lines ──
  "end.line.1": "The young woman and her child dissolved into white smoke.",
  "end.line.2": "Beneath the willow you find a body, long since dead.",
  "end.line.3":
    "Branches wrapped around her neck. An empty shawl in her hands.",
  "end.line.4": "",
  "end.line.5": "Medallion unlocked: Yanagi onna",
  "end.line.6": "",
  "end.line.7": "By listening to the yokai's tales, Mizumi begins to understand —",
  "end.line.8": "it's okay to be different. Family will always be her stable point.",
  "end.line.9": "",
  "end.line.10": "— End of Vertical Slice —",

  // ── Quest: Cry under the Willow ──
  "quest.cryUnderWillow.title": "Cry under the Willow",
  "quest.cryUnderWillow.step.1.description": "Find the young woman's cottage",
  "quest.cryUnderWillow.step.2.description": "Get inside — try a different way",
  "quest.cryUnderWillow.step.3.description":
    "Find the dagger inside the cottage",
  "quest.cryUnderWillow.step.4.description":
    "Return to the woman by the willow",
  "quest.cryUnderWillow.step.5.description": "Cut the cursed willow branches",
  "quest.cryUnderWillow.step.6.description": "Investigate the willow area",

  // ── Hints (floating + interactable) ──
  "hint.findCottage": "Find the cottage to the east →",
  "hint.cutBranches": "Cut the willow branches with the dagger",
  "hint.transform": "[Press F to transform into a fox.]",
  "hint.daggerPickup": "Picked up the dagger",
  "hint.cottageExit": "→ Cottage",
  "hint.cottageExterior.tryDoor": "The cottage. Try the door — press E.",
  "hint.cottageExterior.transform":
    "Press F to take fox form. Then leap through the lit window.",
  "hint.cottageExterior.leap":
    "Leap through the window — press E while in fox form.",
  "hint.cottageInterior.search":
    "Search the room — press E to inspect things.",
  "hint.cottageInterior.hasDagger": "You have the dagger. Find a way out.",
  "hint.cottageInterior.fitThrough": "I'd never fit through there… not like this.",
  "hint.cottageInterior.notWithout": "Not without what I came for.",
  "hint.cottageInterior.sandalsBlocking": "The sandals are blocking the way.",
  "hint.cottageInterior.sandalsMoved": "Moved the sandals aside",
  "hint.fallback.doorBlocked":
    "The door won't budge. Maybe you can climb through the open window.",
  "hint.fallback.doorStillBlocked": "It still won't budge. The window's your way in.",
  "hint.fallback.tableExplore": "The dishes are crusted with mold.",
  "hint.fallback.futonExplore":
    "The futon reeks. A child slept here, alone, for a long time.",
  "hint.fallback.papersExplore":
    "Scattered notes — desperate, repetitive. A mother begging for her child.",
  "hint.fallback.sandalsExplore":
    "Sandals laid out as if waiting for someone to return. They're in the way of the door.",

  // ── Dialog: yanagi-intro ──
  "dialog.yanagi-intro":
    "Shh, don't cry, little one. The wind will hopefully stop blowing soon. " +
    "And that cursed willow tree might finally let us go.",
  "dialog.yanagi-intro-help-choice": "What do you say?",
  "choice.yanagi-intro.help.1": "Can I help you in any way?",
  "choice.yanagi-intro.help.2": "Take care.",
  "dialog.yanagi-intro-context":
    "Oh, yes, please. The little one couldn't sleep at night, so I took him " +
    "outside for some fresh air. However, we got caught in a strong wind, so " +
    "I sought shelter here under those willows.",
  "dialog.yanagi-intro-second-choice": "What do you ask?",
  "choice.yanagi-intro.second.1": "Why don't you go home?",
  "choice.yanagi-intro.second.2": "Is the little one sleeping?",
  "choice.yanagi-intro.second.3": "Take care.",
  "dialog.yanagi-intro-cant-go-home":
    "We can't. The cursed willow won't let us go.",
  "dialog.yanagi-intro-trying":
    "He's trying, trying. But still, he can't. The willow won't let him.",
  "dialog.yanagi-intro-hurt":
    "Oh, how it hurt when that strong wind blew. It hurt so much.",
  "dialog.yanagi-intro-hurt-choice": "What do you ask?",
  "choice.yanagi-intro.hurt.1": "What happened?",
  "choice.yanagi-intro.hurt.2": "I'll help you get home.",
  "dialog.yanagi-intro-branches": "Her branches are too long. They hurt me.",
  "dialog.yanagi-intro-what-do-you-mean": "What do you mean?",
  "dialog.yanagi-intro-lashed":
    "That's because of the wind. The branches lashed at me. Oh, my poor back.",
  "dialog.yanagi-intro-i-will-help": "I'll help you get home.",
  "dialog.yanagi-intro-help-confirm":
    "You'd be very kind, little one. But I'm not sure if you can manage it.",
  "dialog.yanagi-intro-doubt-choice": "What do you say?",
  "choice.yanagi-intro.doubt.1": "Why shouldn't I?",
  "choice.yanagi-intro.doubt.2": "I'll be fine.",
  "dialog.yanagi-intro-young-fox":
    "A young fox like you shouldn't be roaming the night.",
  "dialog.yanagi-intro-i-can-do-it":
    "I can do it. You don't have to worry about me.",
  "dialog.yanagi-intro-fear-line":
    "Fear is all I have left. But hopefully you won't be afraid.",
  "dialog.yanagi-intro-what-do-you-need":
    "I won't. What do you need from me?",
  "dialog.yanagi-intro-dagger-request":
    "If you would be so kind as to come to my cottage and bring me my " +
    "husband's dagger, hidden in the kitchen drawer. I got tangled in the " +
    "long branches of that cursed willow, and I have nothing to cut them " +
    "with to free myself.",
  "dialog.yanagi-intro-quest-start":
    "I'll be happy to do it. I'll be right back.",

  // ── Dialog: yanagi-return ──
  "dialog.yanagi-return":
    "Oh, you're back. Do you have my dagger? Shh, don't cry, little one. " +
    "We'll go home soon.",
  "dialog.yanagi-return-yes": "Yes. I managed to find it.",
  "dialog.yanagi-return-cut":
    "You're our saviour, little fox. Please — cut the branches of that " +
    "cursed willow.",

  // ── Dialog: willow-thanks ──
  "dialog.willow-thanks":
    "Thank you, my dear. Finally we can go home. And the little one will " +
    "be able to sleep peacefully.",
  "dialog.willow-thanks-dissipate":
    "The young woman and her child turn into white smoke and dissipate " +
    "into the wind.",

  // ── Dialog: willow-body ──
  "dialog.willow-body":
    "A skeleton bound in willow branches. An empty shawl in her hands. " +
    "She has been gone for a very long time.",
  "dialog.willow-body-medallion": "Medallion unlocked: Yanagi onna.",

  // ── Dialog: house-door-blocked ──
  "dialog.house-door-blocked":
    "It won't budge. Looks like the door's blocked by something.",
  "dialog.house-door-thinking":
    "Maybe… I should try the open window. But I'd never fit through as a " +
    "human.",
  "dialog.house-door-prompt": "[Press F to transform into a fox.]",

  // ── Dialog: papers-read ──
  "dialog.papers-read": "Only some lines are legible:",
  "dialog.papers-read-1":
    "\"He's not sleeping again… he's still crying, just crying…\"",
  "dialog.papers-read-2":
    "\"I don't know what to do… I'm exhausted… alone…\"",
  "dialog.papers-read-3": "\"Sometimes helps when… cold, fresh air…\"",
  "dialog.papers-read-4": "\"Maybe… they could sometime… walk.\"",
  "dialog.papers-read-mizumi":
    "Poor woman. She's having a really tough time. I wonder where her " +
    "husband went.",

  // ── Dialog: cottage observations ──
  "dialog.table-explore":
    "Yuck, this stinks. Hopefully she didn't feed this to the baby. No " +
    "dagger here, though.",
  "dialog.futon-explore":
    "The little one seems to wet the bed often. But it looks like they " +
    "haven't slept together here for a long time.",
  "dialog.sandals-explore":
    "Could the strong wind have blown these and caused the doors not to " +
    "open?",
};
