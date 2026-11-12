import type { Bauernregel } from '../types/bauernregel'

/**
 * Bauernregeln – überlieferte Wetterregeln, nach Monaten.
 *
 * So ergänzt du eine Regel: einen Block { … } kopieren und ausfüllen.
 * – id: kurzer Name ohne Leer- und Sonderzeichen, muss eindeutig sein
 * – text: die Regel auf Hochdeutsch; mundart: nur, wenn du die Mundart-Fassung sicher kennst
 * – monat (1–12) und bei Lostagen tag (und bei Zeiträumen bisTag) sowie lostag (Name)
 * – region: nur wenn bekannt
 * – erklaerung: was gemeint ist (1–2 Sätze); hintergrund: „Was steckt dahinter?“
 * – grundlage: 'ja' (meteorologisch begründet), 'teilweise' oder 'nein' (reine Überlieferung)
 * – pruefung: nur, wenn sich die Regel klar mit der Prognose eines Tages vergleichen lässt
 * – ungeprueft: true, solange Wortlaut, Datum oder Region nicht kontrolliert sind
 *
 * WICHTIG: keine Regeln erfinden. Nur überlieferte Regeln aufnehmen.
 * Die Termine sind die heutigen (gregorianischen) Kalendertage. Viele Regeln sind älter als die
 * Kalenderreform von 1582, damals lagen dieselben Namenstage rund 10 Tage später im Jahreslauf.
 */
export const BAUERNREGELN: Bauernregel[] = [
  // ---------- Jänner ----------
  {
    id: 'fabian-sebastian',
    text: 'An Fabian und Sebastian fängt der rechte Winter an.',
    monat: 1,
    tag: 20,
    lostag: 'Fabian und Sebastian',
    erklaerung: 'Um den 20. Jänner beginne erst der eigentliche, harte Teil des Winters.',
    hintergrund:
      'Passt grob zum Klima: Die kältesten Wochen im Alpenraum liegen im Mittel zwischen Mitte Jänner und Anfang Februar. Ein fester Termin ist das aber nicht.',
    grundlage: 'teilweise',
  },
  {
    id: 'pauli-bekehrung',
    text: 'St. Paulus klar bringt gutes Jahr.',
    monat: 1,
    tag: 25,
    lostag: 'Pauli Bekehrung',
    erklaerung: 'Ist es am 25. Jänner klar, soll das ganze Jahr gut werden.',
    hintergrund: 'Reine Überlieferung. Das Wetter eines einzelnen Wintertags sagt nichts über das ganze Jahr aus.',
    grundlage: 'nein',
    pruefung: { art: 'heiter', dann: 'soll das Jahr gut werden' },
    ungeprueft: true,
  },
  {
    id: 'januar-hell-weiss',
    text: 'Ist der Jänner hell und weiß, wird der Sommer sicher heiß.',
    monat: 1,
    erklaerung: 'Ein klarer, schneereicher Jänner kündige einen heißen Sommer an.',
    hintergrund: 'Dafür gibt es keinen belegten Zusammenhang. Winter- und Sommerwetter hängen kaum voneinander ab.',
    grundlage: 'nein',
  },
  {
    id: 'januar-gras',
    text: 'Wächst das Gras im Jänner, ist’s im Sommer in Gefahr.',
    monat: 1,
    erklaerung: 'Ein zu milder Jänner, in dem schon Gras wächst, gilt als schlechtes Zeichen für die Ernte.',
    hintergrund:
      'Die Sorge hat einen wahren Kern: Treiben Pflanzen in einem milden Winter zu früh aus, können spätere Fröste sie schädigen. Eine Aussage über den Sommer ist das aber nicht.',
    grundlage: 'teilweise',
    ungeprueft: true,
  },

  // ---------- Februar ----------
  {
    id: 'lichtmess-stuermt',
    text: 'Wenn’s an Lichtmess stürmt und schneit, ist der Frühling nicht mehr weit; ist es aber klar und hell, kommt der Lenz wohl nicht so schnell.',
    monat: 2,
    tag: 2,
    lostag: 'Mariä Lichtmess',
    erklaerung:
      'Stürmisches Wetter Anfang Februar bedeute einen frühen Frühling, klares Wetter einen späten. Klar heißt im Winter oft: Hochdruck mit Frost.',
    hintergrund:
      'Teilweise nachvollziehbar: Ein kaltes Hoch Anfang Februar hält sich manchmal lange, stürmisches Westwetter bringt milde Luft. Eine verlässliche Vorhersage für Wochen ist das nicht.',
    grundlage: 'teilweise',
    pruefung: { art: 'heiter', dann: 'kommt der Frühling spät' },
  },
  {
    id: 'lichtmess-klee',
    text: 'Lichtmess im Klee, Ostern im Schnee.',
    monat: 2,
    tag: 2,
    lostag: 'Mariä Lichtmess',
    erklaerung: 'Ist es zu Lichtmess so mild, dass es grünt, soll es zu Ostern noch einmal schneien.',
    hintergrund: 'Nachwinter nach milden Phasen kommen vor, aber nicht deshalb, weil es Anfang Februar mild war.',
    grundlage: 'nein',
    pruefung: { art: 'mild', dann: 'soll es zu Ostern schneien' },
  },
  {
    id: 'petri-stuhlfeier',
    text: 'Friert’s an Petri Stuhlfeier, friert’s noch vierzehnmal heuer.',
    monat: 2,
    tag: 22,
    lostag: 'Petri Stuhlfeier',
    erklaerung: 'Ist es am 22. Februar frostig, folgen noch viele Frostnächte.',
    hintergrund: 'Ende Februar sind weitere Frostnächte im Alpenraum ohnehin die Regel. Die Regel trifft deshalb oft zu, ohne etwas vorherzusagen.',
    grundlage: 'teilweise',
    pruefung: { art: 'frost', dann: 'friert es heuer noch vierzehnmal' },
  },
  {
    id: 'matthias-eis',
    text: 'Matthias bricht’s Eis; hat er keins, so macht er eins.',
    monat: 2,
    tag: 24,
    lostag: 'Matthias',
    erklaerung: 'Um den 24. Februar kippt das Wetter: Entweder taut es, oder es kommt noch einmal Frost.',
    hintergrund: 'Beschreibt das wechselhafte Spätwinterwetter. Eine echte Vorhersage steckt nicht darin.',
    grundlage: 'nein',
  },
  {
    id: 'februar-warm',
    text: 'Ist’s im Februar zu warm, friert man zu Ostern bis in den Darm.',
    monat: 2,
    erklaerung: 'Ein zu milder Februar kündige ein kaltes Osterfest an.',
    hintergrund: 'Kein belegter Zusammenhang. Späte Kälterückfälle gibt es nach milden wie nach kalten Februarmonaten.',
    grundlage: 'nein',
    ungeprueft: true,
  },

  // ---------- März ----------
  {
    id: 'maerzenschnee',
    text: 'Märzenschnee tut Saaten weh.',
    monat: 3,
    erklaerung: 'Schnee im März schadet den schon keimenden Saaten.',
    hintergrund: 'Landwirtschaftliche Erfahrung: Späte Kälte mit Schnee kann junge Pflanzen schädigen. Keine Vorhersage, eher eine Feststellung.',
    grundlage: 'teilweise',
  },
  {
    id: 'maerz-nebel',
    text: 'So viele Nebel im März, so viele Wetter im Sommer.',
    monat: 3,
    erklaerung: '„Wetter“ meint hier Gewitter: Jeder Nebeltag im März stehe für ein Gewitter im Sommer.',
    hintergrund: 'Reine Überlieferung, es gibt keinen Zusammenhang zwischen Märznebel und Sommergewittern.',
    grundlage: 'nein',
    ungeprueft: true,
  },
  {
    id: 'josefi',
    text: 'Ist’s am Josefitag schön, kann’s nur gut weitergehen.',
    monat: 3,
    tag: 19,
    lostag: 'Josefi',
    region: 'Österreich, Bayern',
    erklaerung: 'Schönes Wetter am 19. März (Josefitag, in Teilen Österreichs Landesfeiertag) verspreche ein gutes Frühjahr.',
    hintergrund: 'Reine Überlieferung. Der Josefitag war ein wichtiger Termin im bäuerlichen Jahr.',
    grundlage: 'nein',
    pruefung: { art: 'heiter', dann: 'soll das Frühjahr gut weitergehen' },
    ungeprueft: true,
  },

  // ---------- April ----------
  {
    id: 'april-weiss-nicht',
    text: 'April, April, der weiß nicht, was er will.',
    monat: 4,
    erklaerung: 'Im April wechselt das Wetter rasch zwischen Sonne, Regen, Graupel und Schnee.',
    hintergrund:
      'Stimmt: Im Frühjahr ist die Höhenluft noch kalt, der Boden erwärmt sich schon. Das macht die Luft labil, es entstehen schnell Schauer, dazwischen scheint die Sonne.',
    grundlage: 'ja',
  },
  {
    id: 'april-schoen-rein',
    text: 'Ist der April schön und rein, wird der Mai umso wilder sein.',
    monat: 4,
    erklaerung: 'Auf einen schönen April folge ein unbeständiger Mai.',
    hintergrund: 'Kein belegter Zusammenhang zwischen den beiden Monaten.',
    grundlage: 'nein',
    ungeprueft: true,
  },
  {
    id: 'georgi',
    text: 'Georgi bringt grüne Schuh.',
    monat: 4,
    tag: 23,
    lostag: 'Georgi',
    erklaerung: 'Um den 23. April ist die Natur so weit, dass man durch grünes Gras geht.',
    hintergrund: 'Eine Beobachtung zum Jahreslauf, keine Wetterregel im engeren Sinn. In höheren Lagen ist es um Georgi oft noch nicht so weit.',
    grundlage: 'teilweise',
    ungeprueft: true,
  },

  // ---------- Mai ----------
  {
    id: 'eisheilige',
    text: 'Pankraz, Servaz, Bonifaz machen erst dem Sommer Platz.',
    monat: 5,
    tag: 12,
    bisTag: 15,
    lostag: 'Eisheilige',
    region: 'Österreich, Süddeutschland (12.–15. Mai; in Norddeutschland ab Mamertus, 11. Mai)',
    erklaerung: 'Erst nach den Eisheiligen Mitte Mai sei die Gefahr von Nachtfrost vorbei, vorher pflanzt man nichts Frostempfindliches aus.',
    hintergrund:
      'Kaltlufteinbrüche im Mai gibt es tatsächlich häufig, sie halten sich aber nicht an diese Tage. Durch die Kalenderreform 1582 lagen die Namenstage früher rund 10 Tage später im Jahr, also eher Ende Mai.',
    grundlage: 'teilweise',
    pruefung: { art: 'frost', dann: 'lässt der Sommer noch auf sich warten' },
  },
  {
    id: 'kalte-sophie',
    text: 'Vor Bonifaz kein Sommer, nach der Sophie kein Frost.',
    monat: 5,
    tag: 15,
    lostag: 'Kalte Sophie',
    erklaerung: 'Nach dem 15. Mai, dem letzten Tag der Eisheiligen, sei kein Frost mehr zu erwarten.',
    hintergrund:
      'Als Faustregel für Gärten brauchbar: Danach wird Frost im Tal deutlich seltener. In den Bergen und in kalten Becken gibt es aber auch später noch Frostnächte.',
    grundlage: 'teilweise',
  },
  {
    id: 'mai-kuehl-nass',
    text: 'Mai kühl und nass füllt dem Bauern Scheun’ und Fass.',
    monat: 5,
    erklaerung: 'Ein kühler, feuchter Mai sei gut für die Ernte.',
    hintergrund: 'Landwirtschaftliche Erfahrung: Ausreichend Regen im Frühjahr ist für das Wachstum wichtig. Eine Vorhersage ist es nicht.',
    grundlage: 'teilweise',
  },

  // ---------- Juni ----------
  {
    id: 'medardus',
    text: 'Was St. Medardus für Wetter hält, solch Wetter auch in die Ernte fällt.',
    monat: 6,
    tag: 8,
    lostag: 'Medardus',
    erklaerung: 'Wie das Wetter am 8. Juni ist, so werde es zur Erntezeit.',
    hintergrund: 'Gehört zu den Regeln über die Beständigkeit des Frühsommerwetters (siehe Siebenschläfer), ist aber für einen einzelnen Tag nicht belegt.',
    grundlage: 'nein',
    pruefung: { art: 'nass', dann: 'wird es auch zur Ernte nass' },
    ungeprueft: true,
  },
  {
    id: 'johanni-regen',
    text: 'Vor Johanni bitt’ um Regen, nachher kommt er ungelegen.',
    monat: 6,
    tag: 24,
    lostag: 'Johanni',
    erklaerung: 'Bis zum 24. Juni ist Regen gut fürs Wachstum, danach stört er bei der Heu- und Getreideernte.',
    hintergrund: 'Landwirtschaftliche Erfahrung zum richtigen Zeitpunkt von Regen, keine Vorhersage.',
    grundlage: 'teilweise',
  },
  {
    id: 'siebenschlaefer',
    text: 'Das Wetter am Siebenschläfertag sieben Wochen bleiben mag.',
    monat: 6,
    tag: 27,
    lostag: 'Siebenschläfer',
    erklaerung: 'Wie das Wetter um den 27. Juni ist, so soll es die nächsten sieben Wochen bleiben.',
    hintergrund:
      'Die bekannteste Regel mit echtem Kern: Ende Juni / Anfang Juli stellt sich die Großwetterlage über Europa oft für längere Zeit ein (Erhaltungsneigung). Wegen der Kalenderreform 1582 entspricht der alte Termin heute etwa dem 7. Juli, und man sollte die Wetterlage über mehrere Tage betrachten, nicht nur einen Tag. Für Süddeutschland und den Alpenraum trifft sie so betrachtet in vielen Jahren zu.',
    grundlage: 'ja',
    pruefung: { art: 'nass', dann: 'bleibt es sieben Wochen lang oft nass' },
  },

  // ---------- Juli ----------
  {
    id: 'maria-heimsuchung',
    text: 'Wie’s Wetter an Mariä Heimsuchung war, so bleibt’s vierzig Tage lang.',
    monat: 7,
    tag: 2,
    lostag: 'Mariä Heimsuchung',
    erklaerung: 'Das Wetter am 2. Juli soll sich vierzig Tage halten.',
    hintergrund: 'Gleicher Gedanke wie beim Siebenschläfer: Anfang Juli halten sich Wetterlagen oft lange. Für einen einzelnen Tag gilt das aber nicht.',
    grundlage: 'teilweise',
    pruefung: { art: 'nass', dann: 'bleibt es vierzig Tage lang oft nass' },
    ungeprueft: true,
  },
  {
    id: 'hundstage',
    text: 'Hundstage hell und klar, zeigen an ein gutes Jahr.',
    monat: 7,
    tag: 23,
    lostag: 'Beginn der Hundstage',
    erklaerung: 'Die Hundstage (etwa 23. Juli bis 23. August) sind die heißeste Zeit des Jahres; sind sie sonnig, sei das ein gutes Zeichen für die Ernte.',
    hintergrund:
      'Der Name kommt vom Sternbild Großer Hund (Sirius), das im Altertum in dieser Zeit wieder am Morgenhimmel auftauchte. Dass es um diese Zeit am heißesten ist, stimmt im Mittel.',
    grundlage: 'teilweise',
  },
  {
    id: 'juli-august-kochen',
    text: 'Was Juli und August nicht kochen, kann der September nicht braten.',
    monat: 7,
    erklaerung: 'Was im Hochsommer nicht reif wird, holt der September nicht mehr nach.',
    hintergrund: 'Erfahrung aus Obst- und Weinbau: Die Sommerwärme bestimmt die Reife. Keine Vorhersage.',
    grundlage: 'teilweise',
    ungeprueft: true,
  },

  // ---------- August ----------
  {
    id: 'laurentius',
    text: 'Laurentius heiter und gut, einen schönen Herbst verheißen tut.',
    monat: 8,
    tag: 10,
    lostag: 'Laurentius',
    erklaerung: 'Schönes Wetter am 10. August verspreche einen schönen Herbst.',
    hintergrund: 'Reine Überlieferung. Um Laurentius sind übrigens die Sternschnuppen der Perseiden zu sehen („Laurentiustränen“).',
    grundlage: 'nein',
    pruefung: { art: 'heiter', dann: 'wird der Herbst schön' },
    ungeprueft: true,
  },
  {
    id: 'bartholomae',
    text: 'Wie das Wetter an Bartholomä, so bleibt es den ganzen Herbst.',
    monat: 8,
    tag: 24,
    lostag: 'Bartholomäus',
    erklaerung: 'Das Wetter am 24. August soll den ganzen Herbst prägen.',
    hintergrund: 'Für einen ganzen Herbst ist das nicht belegt; Spätsommerwetter wechselt oft.',
    grundlage: 'nein',
    ungeprueft: true,
  },
  {
    id: 'august-erste-woche',
    text: 'Ist’s in der ersten Augustwoche heiß, bleibt der Winter lange weiß.',
    monat: 8,
    erklaerung: 'Eine heiße erste Augustwoche kündige einen langen, schneereichen Winter an.',
    hintergrund: 'Kein belegter Zusammenhang zwischen Sommerhitze und dem folgenden Winter.',
    grundlage: 'nein',
    ungeprueft: true,
  },

  // ---------- September ----------
  {
    id: 'aegidi',
    text: 'Wie das Wetter an Ägidi, so bleibt’s vier Wochen lang.',
    monat: 9,
    tag: 1,
    lostag: 'Ägidius',
    erklaerung: 'Das Wetter am 1. September soll vier Wochen anhalten.',
    hintergrund: 'Im September stellen sich oft beständige Hochdrucklagen ein (Altweibersommer), aber nicht verlässlich ab einem bestimmten Tag.',
    grundlage: 'teilweise',
    ungeprueft: true,
  },
  {
    id: 'september-lind',
    text: 'Ist der September lind, wird der Winter ein Kind.',
    monat: 9,
    erklaerung: 'Ein milder September kündige einen milden Winter an („ein Kind“ = harmlos).',
    hintergrund: 'Kein belegter Zusammenhang.',
    grundlage: 'nein',
    ungeprueft: true,
  },
  {
    id: 'septemberregen',
    text: 'Septemberregen für Saat und Reben, dem Bauern ist er gelegen.',
    monat: 9,
    erklaerung: 'Regen im September ist gut für die Herbstaussaat und die Weintrauben.',
    hintergrund: 'Landwirtschaftliche Erfahrung, keine Vorhersage. Für die Weinlese ist zu viel Regen allerdings eher schlecht.',
    grundlage: 'teilweise',
    ungeprueft: true,
  },

  // ---------- Oktober ----------
  {
    id: 'gallus',
    text: 'Auf St. Gall bleibt die Kuh im Stall.',
    monat: 10,
    tag: 16,
    lostag: 'Gallus',
    erklaerung: 'Ab dem 16. Oktober ist die Weidezeit vorbei, das Vieh bleibt im Stall.',
    hintergrund: 'Ein Termin im bäuerlichen Jahr, keine Wettervorhersage. In den Bergen ist der Almabtrieb schon früher.',
    grundlage: 'teilweise',
  },
  {
    id: 'oktober-warm-fein',
    text: 'Ist der Oktober warm und fein, kommt ein scharfer Winter drein.',
    monat: 10,
    erklaerung: 'Auf einen warmen, schönen Oktober folge ein strenger Winter.',
    hintergrund: 'Kein belegter Zusammenhang.',
    grundlage: 'nein',
    ungeprueft: true,
  },
  {
    id: 'oktoberhimmel',
    text: 'Oktoberhimmel voller Sterne hat warme Öfen gerne.',
    monat: 10,
    erklaerung: 'Klare Oktobernächte sind kalt, man heizt ein.',
    hintergrund:
      'Stimmt als Beobachtung: Bei klarem Himmel strahlt der Boden nachts viel Wärme ab, es wird deutlich kälter als in bewölkten Nächten. Eine Vorhersage ist es nicht.',
    grundlage: 'ja',
    ungeprueft: true,
  },

  // ---------- November ----------
  {
    id: 'martini-trueb',
    text: 'Ist’s um Martini trüb, wird der Winter auch nicht lieb.',
    monat: 11,
    tag: 11,
    lostag: 'Martini',
    erklaerung: 'Ist es um den 11. November grau und trüb, werde auch der Winter unfreundlich.',
    hintergrund:
      'Reine Überlieferung. Trübes Novemberwetter ist im Alpenvorland und in den Becken ohnehin häufig (Hochnebel unter einer Inversion) und sagt nichts über den Winter.',
    grundlage: 'nein',
    pruefung: { art: 'trueb', dann: 'wird der Winter nicht lieb' },
    ungeprueft: true,
  },
  {
    id: 'kathrein-tanz',
    text: 'Kathrein stellt den Tanz ein.',
    monat: 11,
    tag: 25,
    lostag: 'Kathrein',
    region: 'Österreich, Bayern',
    erklaerung: 'Mit dem Kathreintag (25. November) endete die Zeit der Tanzveranstaltungen vor dem Advent.',
    hintergrund: 'Ein Brauch, keine Wetterregel. Der Kathreintanz ist in Österreich vielerorts der letzte Ball vor dem Advent.',
    grundlage: 'nein',
  },
  {
    id: 'andreasschnee',
    text: 'Andreasschnee tut dem Korn weh.',
    monat: 11,
    tag: 30,
    lostag: 'Andreas',
    erklaerung: 'Schnee am 30. November schade der Wintersaat.',
    hintergrund: 'Überlieferung. Eine geschlossene Schneedecke schützt die Saat eher vor Frost, als dass sie schadet.',
    grundlage: 'nein',
    pruefung: { art: 'schnee', dann: 'tut es dem Korn weh' },
    ungeprueft: true,
  },

  // ---------- Dezember ----------
  {
    id: 'barbara-klee',
    text: 'Geht Barbara im Klee, kommt’s Christkind im Schnee.',
    monat: 12,
    tag: 4,
    lostag: 'Barbara',
    erklaerung: 'Ist es am 4. Dezember mild und grün, gebe es weiße Weihnachten.',
    hintergrund: 'Kein belegter Zusammenhang. Am 4. Dezember schneidet man übrigens die Barbarazweige, die bis Weihnachten blühen sollen.',
    grundlage: 'nein',
    pruefung: { art: 'mild', dann: 'kommt das Christkind im Schnee' },
  },
  {
    id: 'lucia',
    text: 'St. Luzen macht den Tag stutzen.',
    monat: 12,
    tag: 13,
    lostag: 'Lucia',
    erklaerung: 'Um Lucia (13. Dezember) seien die Tage am kürzesten.',
    hintergrund:
      'Ein schönes Beispiel für die Kalenderreform: Vor 1582 fiel der Luciatag fast auf die Wintersonnenwende. Heute ist der kürzeste Tag um den 21. Dezember.',
    grundlage: 'teilweise',
  },
  {
    id: 'gruene-weihnachten',
    text: 'Grüne Weihnachten, weiße Ostern.',
    monat: 12,
    tag: 24,
    lostag: 'Weihnachten',
    erklaerung: 'Ist Weihnachten ohne Schnee, liege zu Ostern Schnee.',
    hintergrund:
      'Kein belegter Zusammenhang. Im Tal sind grüne Weihnachten ohnehin häufig: Mitte bis Ende Dezember stellt sich oft milde Westwetterlage ein („Weihnachtstauwetter“).',
    grundlage: 'nein',
  },
]
