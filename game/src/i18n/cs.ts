/**
 * Czech strings — source-canonical for dialogue.
 * Lines are VERBATIM (exact diacritics) from the canon CS docs
 * "Kitsune Escape _ Nářek pod vrbou" (linear quest script) and
 * "Kitsune Escape _ Interactive dialog" (branching structure).
 * Intro/ending prose authored fresh from the High Concept (CS section).
 *
 * Typed against `keyof typeof en` — the key sets can never drift.
 */
import type { TranslationKey } from './en';

export const cs: Record<TranslationKey, string> = {
  // ── UI chrome ──
  'ui.title': 'Kitsune Escape',
  'ui.subtitle': 'Nářek pod vrbou',
  'ui.pressAnyKey': 'Stiskni libovolnou klávesu',
  'ui.loading': 'Načítání…',
  'ui.menu.language': 'Jazyk',
  'ui.lang.en': 'English',
  'ui.lang.cs': 'Čeština',
  'ui.pause.title': 'Pauza',
  'ui.pause.resume': 'Pokračovat',
  'ui.pause.restart': 'Restartovat',
  'ui.pause.sound': 'Zvuk',
  'ui.sound.on': 'Zapnuto',
  'ui.sound.off': 'Vypnuto',
  'ui.intro.skip': 'Podržením Esc přeskočíš',
  'ui.ending.restartHint': 'R — restart · Esc — titulní obrazovka',

  // ── controls / help ──
  'controls.title': 'Ovládání',
  'controls.move': 'WASD / šipky — pohyb',
  'controls.interact': 'E — interakce / pokračování dialogu',
  'controls.transform': 'F — nasadit masku: proměna mezi dívkou a liškou',
  'controls.bound': 'Mezerník (liška) — skok: rychlý odraz, přeskočí potok',
  'controls.brace': 'Mezerník (člověk) — zapřít se: klekni a odolej poryvům větru',
  'controls.choices': '1–4 — volby v dialogu',
  'controls.language': 'L — jazyk EN/CS',
  'controls.mute': 'M — zvuk zap/vyp',
  'controls.pause': 'Esc — pauza',

  // ── HUD ──
  'hud.form.human': 'Člověk',
  'hud.form.fox': 'Liška',
  'hud.muted': 'Ztlumeno',
  'hud.hints': 'L jazyk · M zvuk · Esc pauza',

  // ── tutorial glyphs & contextual hints ──
  'hint.move': 'WASD — pohyb',
  'hint.interact': 'E — interakce',
  'hint.transform': 'F — proměna',
  'hint.bound': 'Mezerník — skok',
  'hint.brace': 'Mezerník — zapřít se',
  'hint.wiggleFree': 'Rychle mačkej E a vyprosti se!',
  'hint.foxCannot': 'Liška tohle nedokáže — stiskni F a proměň se zpět',

  // ── interact prompts (canon verbs) ──
  'prompt.open': 'Otevřít',
  'prompt.take': 'Vzít',
  'prompt.explore': 'Prozkoumat',
  'prompt.cut': 'Přeseknout',
  'prompt.remove': 'Oddělat',
  'prompt.talk': 'Promluvit',
  'prompt.read': 'Přečíst',

  // ── speakers ──
  'speaker.mizumi': 'MIZUMI',
  'speaker.yanagi': 'MLADÁ ŽENA',
  'speaker.yanagiRevealed': 'YANAGI ONNA',

  // ── quest ──
  'quest.title': 'Nářek pod vrbou',
  'quest.description':
    'Mladá žena se svým malým synem potřebují od tebe, abys jí přinesla dýku z její chaloupky. Zapletla se do větví vrby a nemůže se dostat pryč.',
  'quest.started': 'Nový úkol',
  'quest.completed': 'Úkol splněn',
  'quest.obj1.title': 'Najdi chaloupku mladé ženy',
  'quest.obj1.hint': 'Přejdi nočním polem k chaloupce — hledej teplé světlo v okně.',
  'quest.obj2.title': 'Dostaň se do chaloupky jiným způsobem',
  'quest.obj2.hint': 'Dveře jsou zablokované. Liška by mohla proskočit otevřeným oknem.',
  'quest.obj3.title': 'Najdi dýku',
  'quest.obj3.hint': 'Dýka jejího manžela je schovaná v zásuvce v kuchyni.',
  'quest.obj4.title': 'Vrať se k ženě plačící u vrby',
  'quest.obj4.hint': 'Přines dýku zpátky ženě pod vrbou.',
  'quest.obj5.title': 'Přeseknout větve vrby',
  'quest.obj5.hint': 'Přesekni větve prokleté vrby — počkej na klid mezi poryvy.',
  'quest.obj6.title': 'Prohledej okolí vrby',
  'quest.obj6.hint': 'Něco se třpytí mezi kořeny vrby.',

  // ── ambientní replika ženy (15 m, bez vstupu) ──
  'dlg.ambient.yanagi':
    'Ššš, neplakej maličký. Vítr brzy snad už přestane foukat. A ta prokletá vrba nás snad konečně nechá jít.',

  // ── hlavní větvený dialog — volby hráče ──
  'dlg.c.a1': 'Můžu vám nějak pomoci?',
  'dlg.c.z1': 'Opatrujte se.',
  'dlg.c.b1': 'Proč se už nevrátíte domů?',
  'dlg.c.b2': 'Jak daleko to máte domů?',
  'dlg.c.b3': 'Podařilo se malému už usnout?',
  'dlg.c.c1': 'Jak to?',
  'dlg.c.c2': 'Co je špatně s tou vrbou?',
  'dlg.c.c3': 'Pomůžu vám dostat se domů.',
  'dlg.c.d1': 'Co se stalo?',
  'dlg.c.d2': 'Proč bych neměla?',
  'dlg.c.e1': 'Jak to myslíte?',
  'dlg.c.e2': 'Já to zvládnu. Nemusíte se o mě bát.',
  'dlg.c.f1': 'Nebudu. Co ode mě potřebujete?',
  'dlg.c.g1': 'Ráda to udělám. Hned budu zpátky.',
  'dlg.c.z2': 'Už musím bohužel jít.',

  // ── hlavní větvený dialog — její odpovědi ──
  'dlg.y.a1':
    'Ach áno, prosím. Malý nechtěl v noci usnout, tak jsem jej vzala ven na čerstvý vzduch. Ale zastihl nás moc silný vítr, tak jsem se ukryla tady pod těmi vrbami.',
  'dlg.y.b1': 'Nemůžeme, nejde to. Ta prokletá vrba nás nenechá jít.',
  'dlg.y.b2': 'Kousíček. Bydlíme nedaleko. Ale ach ta prokletá vrba.',
  'dlg.y.b3': 'Snaží se spinkat, snaží. Ale nejde to. Vrba jej nenechá.',
  'dlg.y.c12': 'To ty její větve. Ach, jak to bolelo, když foukal ten silný vítr. Moc to bolelo.',
  'dlg.y.c3': 'To bys byla moc hodná maličká. Ale nevím, jestli to zvládneš.',
  'dlg.y.d1': 'Její větve jsou moc dlouhé. Ublížili mi.',
  'dlg.y.d2': 'Mlaďounká liška jako ty by se neměla potulovat nocí.',
  'dlg.y.e1': 'To kvůli tomu větru. Větve mě mrskaly. Ach, moje ubohá záda.',
  'dlg.y.e2': 'Já se už nebojím. A snad se nebudeš bát ani ty.',
  'dlg.y.f1':
    'Kdybys byla tak hodná a došla do mé chaloupky a přinesla mi dýku po mém manželovi, kterou mám schovanou v zásuvce v kuchyni. Zamotala jsem se do dlouhých větví té prokleté vrby a nemám čím bych větve přeřízla, abych se z nich dostala.',
  'dlg.y.z': 'Ššš, děťátko. Jednou se objeví někdo, kdo nám pomůže.',
  'dlg.y.fear':
    'Strach je to jediný, co mi už zůstalo. Ach můj maličký, ššš, brzy už to snad skončí, drahoušku.',

  // ── návrat s dýkou (Dialog 6) ──
  'dlg.y.return1':
    'Ach, ty ses vrátila. Máš mou dýku? Ššš, neplakej broučku. Už půjdeme brzo domů.',
  'dlg.m.return2': 'Ano. Podařilo se mi ji najít.',
  'dlg.y.return3': 'Jsi naše spása, lištičko. Prosím, přesekni větve té prokleté vrby.',

  // ── po přeseknutí větví (Dialog 7) ──
  'dlg.y.thanks':
    'Děkuji ti má drahá. Konečně můžeme domů. A maličký už bude moci v klidu spát.',

  // ── samomluva Mizumi ──
  'dlg.m.doorBlocked': 'Nejde to. Vypadá to, že jsou dveře něčím zablokované.',
  'dlg.m.table':
    'Fuj, to ale smrdí. Snad tohle nedávala jíst tomu miminku. Nůž ani dýku tu ale nevidím.',
  'dlg.m.futon':
    'Chlapeček se asi v noci často počůrává. Ale vypadá to, že už tu dlouho spolu nespali ..',
  'dlg.m.scare1': 'Ach!',
  'dlg.m.scare2': 'Pitomej vítr.',
  'dlg.m.papersAfter':
    'Chudák, žena. Má to v životě pěkně těžký. Zajímalo by mě, kam se poděl její muž.',
  'dlg.m.sandals': 'Že by je ten silný vítr odfoukl a kvůli tomu nešly otevřít ty dveře?',

  // ── quest-script beats (M1 D2: shrine whisper + branch-cut counter) ──
  'whisper.mask': 'Maska jí chladně přilne k tváři — a noc otevře oči.',
  'cut.1': 'Jedna větev přeťatá. Dvě ji ještě drží.',
  'cut.2': 'Druhá větev přeťatá. Už ji drží jen jedna.',

  // ── čitelný deník (papírový overlay) — kanonické útržky doslovně ──
  'paper.title': 'Rozházené papíry',
  'paper.line1': 'Už zase nespí .. stále pláče a jen pláče ..',
  'paper.line2': 'Nevím, co si mám počít .. jsem na to .. .. sama ..',
  'paper.line3': '.. občas pomáhá, když .. … studený, čerstvý vzduch .. ..',
  'paper.line4': 'Možná .. mohli někdy .. procházku',
  'paper.closeHint': 'E — zavřít',

  // ── odhalení těla (papírový overlay nad drženým záběrem) ──
  'body.title': 'Pod prokletou vrbou',
  'body.text':
    'Žena se na větvích vrby uškrtila už dávno. Stav těla napovídá, že se tak nestalo nedávno — bude to už podstatně delší doba. Kůže na těle je vysušená a svrasklá. Kolem krku má zamotané větve vrby. V rukou drží prázdný šátek.',

  // ── medailon ──
  'medallion.award': 'Získala jsi medailon: Yanagi onna',
  'medallion.title': 'Yanagi onna (柳女) — vrbová žena',
  'medallion.lore':
    'Duch, který se pozdě v noci zjevuje pod vrbami — mladá žena, někdy s dítětem v náručí, prosící kolemjdoucí o pomoc. Mateřský duch, který i po smrti dbá o blaho svého dítěte.',

  // ── maska kitsune (svatyňka) ──
  'mask.name': 'Kyūbiho sen',
  'mask.desc': 'Ze dřeva soumraku, ošlehaného tancem liščího ohně. Uchovává šeptaná slova.',

  // ── úvodní vyprávění (6 obrazů, dle High Conceptu) ──
  'intro.1':
    'Mizumi to doma nemá lehké. Rodiče jí nerozumí — a s tátou se pohádá kvůli každé maličkosti.',
  'intro.2':
    'Tolik by si přála, aby jí táta rozuměl. Aby na něj nemusela být pořád naštvaná.',
  'intro.3':
    'Jedné noci to už nevydrží a uteče z domu. Usne v nedalekém lese pod svým oblíbeným stromem.',
  'intro.4':
    'Když se probudí, není v lese, který tak dobře zná. Tenhle les je plný yokai — duchů, skřítků, démonů a dalších podivných bytostí.',
  'intro.5':
    'U kořenů stromu leží starodávná maska kitsune. Díky ní na sebe Mizumi dokáže vzít podobu starobylé a mocné lišky — a aby našla cestu domů, musí duchům lesa pomáhat a plnit jejich přání.',
  'intro.6':
    'Musí si ale dát pozor — říká se, že temný pán lesa o ní už ví a chce ji dostat… A někde u jezera, pod vrbami, někdo pláče.',

  // ── závěrečné rozjímání (autorské; téma musí dosednout) ──
  'end.1': 'Medailon chladí Mizumi v dlani. Yanagi onna — vrbová žena.',
  'end.2':
    'Noc co noc seděla pod vrbou a prosila každého kolemjdoucího o tu samou drobnou laskavost.',
  'end.3': 'Ne kvůli sobě. Kvůli maličkému v prázdném šátku.',
  'end.4':
    'Matka drží dál. I když je vítr silnější než ona. I když z ní nezbude nic než to držení.',
  'end.5':
    'Mizumi myslí na svůj domov. Na dveře, kterými praštila. Na slova, která švihala jako větve ve větru.',
  'end.6': 'Možná jsou i tátovy zákazy svým způsobem držení. Neohrabané. Moc pevné. Ale drží.',
  'end.7':
    'Je v pořádku být jiná. A ti nejbližší ti zůstávají pevným bodem — i když před nimi utečeš do noci.',
  'end.8':
    'Vrby stojí bez hnutí. Jezero se proměnilo ve sklo. Poprvé za tuhle noc je les tichý.',
  'end.9': 'Nad hladinou tma řídne do prvního šedomodrého nádechu svítání. Přichází ráno.',
  'end.10':
    'Někde za stromy čeká cesta domů. Mizumi sevře medailon v dlani a vykročí k ní — s myšlenkou na tátu.',
};
