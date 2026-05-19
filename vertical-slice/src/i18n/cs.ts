/**
 * Czech translations.
 *
 * Source materials (the author's own narrative-design course outputs):
 *   ../../../_extracted/Kitsune Escape _ Hight Concept.txt    — pitch summary
 *   ../../../_extracted/Kitsune Escape _ Nářek pod vrbou.txt  — Czech quest doc
 *   ../../../_extracted/Kitsune Escape _ Interactive dialog.txt — original Czech dialog
 *
 * Keep keys identical to en.ts. Where the author's Czech wording exists, use
 * it verbatim. Mizumi sounds 15-ish; Yanagi onna is ghostly, sad, tired.
 */

export const cs: Record<string, string> = {
  // ── UI: Title ──
  "ui.title.title": "Kitsune Escape",
  "ui.title.subtitle": "Nářek pod vrbou — Vertical Slice",
  "ui.title.start": "Stiskni MEZERNÍK nebo klikni pro start",
  "ui.title.controls":
    "← → / A D  pohyb    MEZERNÍK  skok / další    E  interakce    F  proměna",
  "ui.title.language": "Jazyk",

  // ── UI: shared ──
  "ui.skip": "[MEZERNÍK] přeskočit",
  "ui.dialog.hint.advance": "[MEZERNÍK]",
  "ui.dialog.hint.choice": "[1-4 / ↑↓ + ENTER]",
  "ui.end.title": "Konec",
  "ui.end.restart": "Stiskni R pro restart · ESC pro titulní obrazovku",
  "ui.lang.toggleHint.en": "[L] EN",
  "ui.lang.toggleHint.cs": "[L] CS",

  // ── Speakers ──
  "speaker.MIZUMI": "MIZUMI",
  "speaker.YANAGI": "YANAGI ONNA",
  "speaker.NARRATOR": "",
  "speaker.PLAYER_CHOICE": "",

  // ── Intro beats ──
  "intro.beat.1": "Mizumi to doma nemá lehké.",
  "intro.beat.2":
    "Rodiče jí věčně něco zakazují a nedopřejí jí to, co ostatní jejím kamarádkám.",
  "intro.beat.3":
    "Nejtěžší je to s tátou. Hádají se kvůli každé maličkosti.",
  "intro.beat.4": "Jedné noci už to nevydrží.",
  "intro.beat.5":
    "Uteče do lesa a usne pod svým oblíbeným stromem.",
  "intro.beat.6":
    "Když se probudí, ten les už není ten, který tak dobře zná…",

  // ── End-scene lines ──
  "end.line.1":
    "Mladá žena se svým synem se rozplynula v bílém kouři.",
  "end.line.2":
    "Pod vrbou nacházíš tělo, už dávno mrtvé.",
  "end.line.3":
    "Větve omotané kolem krku. V rukou prázdný šátek.",
  "end.line.4": "",
  "end.line.5": "Odemčen medailon: Yanagi onna",
  "end.line.6": "",
  "end.line.7":
    "Posloucháním příběhů yokai začíná Mizumi chápat —",
  "end.line.8":
    "je v pořádku být jiná. Rodina vždy zůstane jejím pevným bodem.",
  "end.line.9": "",
  "end.line.10": "— Konec Vertical Slice —",

  // ── Quest: Cry under the Willow ──
  "quest.cryUnderWillow.title": "Nářek pod vrbou",
  "quest.cryUnderWillow.step.1.description":
    "Najdi chaloupku mladé ženy",
  "quest.cryUnderWillow.step.2.description":
    "Dostaň se dovnitř — zkus to jinak",
  "quest.cryUnderWillow.step.3.description":
    "Najdi dýku uvnitř chaloupky",
  "quest.cryUnderWillow.step.4.description":
    "Vrať se k ženě plačící u vrby",
  "quest.cryUnderWillow.step.5.description":
    "Přesekni větve prokleté vrby",
  "quest.cryUnderWillow.step.6.description":
    "Prohledej okolí vrby",

  // ── Hints (floating + interactable) ──
  "hint.findCottage": "Najdi chaloupku na východě →",
  "hint.cutBranches": "Přesekni větve vrby dýkou",
  "hint.transform": "[Stiskni F pro proměnu v lišku.]",
  "hint.daggerPickup": "Vzala jsi dýku",
  "hint.cottageExit": "→ Chaloupka",
  "hint.cottageExterior.tryDoor":
    "Chaloupka. Zkus dveře — stiskni E.",
  "hint.cottageExterior.transform":
    "Stiskni F a proměň se v lišku. Pak proskoč osvětleným oknem.",
  "hint.cottageExterior.leap":
    "Proskoč oknem — stiskni E v liščí podobě.",
  "hint.cottageInterior.search":
    "Prohledej místnost — stiskni E pro prozkoumání.",
  "hint.cottageInterior.hasDagger":
    "Máš dýku. Najdi cestu ven.",
  "hint.cottageInterior.fitThrough":
    "Tudy bych se nikdy neprotáhla… ne takhle.",
  "hint.cottageInterior.notWithout":
    "Ne bez toho, pro co jsem si přišla.",
  "hint.cottageInterior.sandalsBlocking":
    "Sandály blokují cestu.",
  "hint.cottageInterior.sandalsMoved":
    "Odsunula jsi sandály stranou",
  "hint.fallback.doorBlocked":
    "Dveře se nehnou. Možná se dá vlézt otevřeným oknem.",
  "hint.fallback.doorStillBlocked":
    "Pořád to nejde. Cesta vede oknem.",
  "hint.fallback.tableExplore":
    "Talíře pokryté plísní.",
  "hint.fallback.futonExplore":
    "Futon smrdí. Dítě tu spalo samo, hodně dlouho.",
  "hint.fallback.papersExplore":
    "Rozházené papíry — zoufalé, opakující se. Matka prosí za své dítě.",
  "hint.fallback.sandalsExplore":
    "Sandály připravené, jako by někdo čekal návrat. Stojí v cestě dveřím.",

  // ── Dialog: yanagi-intro ──
  // Original Czech opening line from the author's dialog doc:
  "dialog.yanagi-intro":
    "Ššš, neplakej maličký. Vítr brzy snad už přestane foukat. " +
    "A ta prokletá vrba nás snad konečně nechá jít.",
  "dialog.yanagi-intro-help-choice": "Co řekneš?",
  "choice.yanagi-intro.help.1": "Můžu vám nějak pomoci?",
  "choice.yanagi-intro.help.2": "Opatrujte se.",
  "dialog.yanagi-intro-context":
    "Ach áno, prosím. Malý nechtěl v noci usnout, tak jsem jej vzala ven " +
    "na čerstvý vzduch. Ale zastihl nás moc silný vítr, tak jsem se ukryla " +
    "tady pod těmi vrbami.",
  "dialog.yanagi-intro-second-choice": "Co se zeptáš?",
  "choice.yanagi-intro.second.1": "Proč se už nevrátíte domů?",
  "choice.yanagi-intro.second.2": "Podařilo se malému už usnout?",
  "choice.yanagi-intro.second.3": "Opatrujte se.",
  "dialog.yanagi-intro-cant-go-home":
    "Nemůžeme, nejde to. Ta prokletá vrba nás nenechá jít.",
  "dialog.yanagi-intro-trying":
    "Snaží se spinkat, snaží. Ale nejde to. Vrba jej nenechá.",
  "dialog.yanagi-intro-hurt":
    "Ach, jak to bolelo, když foukal ten silný vítr. Moc to bolelo.",
  "dialog.yanagi-intro-hurt-choice": "Co se zeptáš?",
  "choice.yanagi-intro.hurt.1": "Co se stalo?",
  "choice.yanagi-intro.hurt.2": "Pomůžu vám dostat se domů.",
  "dialog.yanagi-intro-branches":
    "Její větve jsou moc dlouhé. Ublížily mi.",
  "dialog.yanagi-intro-what-do-you-mean": "Jak to myslíte?",
  "dialog.yanagi-intro-lashed":
    "To kvůli tomu větru. Větve mě mrskaly. Ach, moje ubohá záda.",
  "dialog.yanagi-intro-i-will-help": "Pomůžu vám dostat se domů.",
  "dialog.yanagi-intro-help-confirm":
    "To bys byla moc hodná maličká. Ale nevím, jestli to zvládneš.",
  "dialog.yanagi-intro-doubt-choice": "Co řekneš?",
  "choice.yanagi-intro.doubt.1": "Proč bych neměla?",
  "choice.yanagi-intro.doubt.2": "Já to zvládnu.",
  "dialog.yanagi-intro-young-fox":
    "Mlaďounká liška jako ty by se neměla potulovat nocí.",
  "dialog.yanagi-intro-i-can-do-it":
    "Já to zvládnu. Nemusíte se o mě bát.",
  "dialog.yanagi-intro-fear-line":
    "Strach je to jediné, co mi už zůstalo. A snad se nebudeš bát ani ty.",
  "dialog.yanagi-intro-what-do-you-need":
    "Nebudu. Co ode mě potřebujete?",
  "dialog.yanagi-intro-dagger-request":
    "Kdybys byla tak hodná a došla do mé chaloupky a přinesla mi dýku po " +
    "mém manželovi, kterou mám schovanou v zásuvce v kuchyni. Zamotala jsem " +
    "se do dlouhých větví té prokleté vrby a nemám čím bych větve přeřízla, " +
    "abych se z nich dostala.",
  "dialog.yanagi-intro-quest-start":
    "Ráda to udělám. Hned budu zpátky.",

  // ── Dialog: yanagi-return ──
  // From the author's quest doc (DIALOG 6):
  "dialog.yanagi-return":
    "Ach, ty ses vrátila. Máš mou dýku? Ššš, neplakej broučku. " +
    "Už půjdeme brzy domů.",
  "dialog.yanagi-return-yes": "Ano. Podařilo se mi ji najít.",
  "dialog.yanagi-return-cut":
    "Jsi naše spása, lištičko. Prosím, přesekni větve té prokleté vrby.",

  // ── Dialog: willow-thanks ──
  // From the author's quest doc (DIALOG 7):
  "dialog.willow-thanks":
    "Děkuji ti má drahá. Konečně můžeme domů. A maličký už bude moci " +
    "v klidu spát.",
  "dialog.willow-thanks-dissipate":
    "Mladá žena se svým synem se promění v bílý kouř a zafoukáním větru " +
    "se pomalu rozplyne.",

  // ── Dialog: willow-body ──
  // Based on the author's quest doc description of ASSET 12:
  "dialog.willow-body":
    "Vysušené tělo omotané větvemi vrby. V rukou prázdný šátek. " +
    "Je pryč už hodně dlouho.",
  "dialog.willow-body-medallion": "Odemčen medailon: Yanagi onna.",

  // ── Dialog: house-door-blocked ──
  // From the author's quest doc (Při pokusu otevřít dveře):
  "dialog.house-door-blocked":
    "Nejde to. Vypadá to, že jsou dveře něčím zablokované.",
  "dialog.house-door-thinking":
    "Možná… bych měla zkusit otevřené okno. Ale jako člověk se tudy nikdy " +
    "neprotáhnu.",
  "dialog.house-door-prompt": "[Stiskni F pro proměnu v lišku.]",

  // ── Dialog: papers-read ──
  // From the author's quest doc (Čitelné jsou stěží jen některé řádky):
  "dialog.papers-read": "Čitelné jsou stěží jen některé řádky:",
  "dialog.papers-read-1":
    "„Už zase nespí… stále pláče a jen pláče…\"",
  "dialog.papers-read-2":
    "„Nevím, co si mám počít… jsem na to… sama…\"",
  "dialog.papers-read-3":
    "„Občas pomáhá, když… studený, čerstvý vzduch…\"",
  "dialog.papers-read-4":
    "„Možná… mohli někdy… procházku.\"",
  "dialog.papers-read-mizumi":
    "Chudák, žena. Má to v životě pěkně těžký. Zajímalo by mě, kam se " +
    "poděl její muž.",

  // ── Dialog: cottage observations ──
  // From the author's quest doc (DIALOG 2 — interakce s jídelním stolem):
  "dialog.table-explore":
    "Fuj, to ale smrdí. Snad tohle nedávala jíst tomu miminku. Dýku tu " +
    "ale nikde nevidím.",
  // From the author's quest doc (DIALOG 3 — interakce s postelí):
  "dialog.futon-explore":
    "Chlapeček se asi v noci často počůrává. Ale vypadá to, že už tu " +
    "dlouho spolu nespali.",
  // From the author's quest doc (DIALOG 5 — sandály):
  "dialog.sandals-explore":
    "Že by je ten silný vítr odfoukl a kvůli tomu nešly otevřít ty dveře?",
};
