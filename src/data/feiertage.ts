/**
 * Feiertage und kirchliche Feste für die Karte auf „Lokal“ und die Markierung in der Tagesliste.
 * Texte selbst geschrieben, kurz und für Laien. Neue Einträge einfach unten anfügen.
 *
 * Datum:
 *   - fest: jedes Jahr am selben Tag (monat, tag)
 *   - ostern: Tage vor (−) bzw. nach (+) dem Ostersonntag
 *   - advent: Tage vor (−) bzw. nach (+) dem 1. Adventsonntag
 *
 * Konfession:
 *   - beide: katholische und evangelische Kirche feiern den Tag
 *   - katholisch / evangelisch: nur bzw. vor allem diese Kirche
 *   - staatlich: kein kirchliches Fest
 *
 * gesetzlich: gesetzlicher Feiertag in ganz Österreich (13 Tage, Stand 2026).
 */

export type Konfession = 'beide' | 'katholisch' | 'evangelisch' | 'staatlich'

export type FeiertagDatum = { art: 'fest'; monat: number; tag: number } | { art: 'ostern'; tage: number } | { art: 'advent'; tage: number }

export interface Feiertag {
  id: string
  name: string
  datum: FeiertagDatum
  konfession: Konfession
  gesetzlich: boolean
  /** ein Satz: was wird gefeiert */
  kurz: string
  /** Bedeutung und Brauchtum, 2–4 Sätze */
  bedeutung: string
}

const fest = (monat: number, tag: number): FeiertagDatum => ({ art: 'fest', monat, tag })
const ostern = (tage: number): FeiertagDatum => ({ art: 'ostern', tage })
const advent = (tage: number): FeiertagDatum => ({ art: 'advent', tage })

export const FEIERTAGE: Feiertag[] = [
  // ---------- Weihnachtsfestkreis (Jahresbeginn) ----------
  {
    id: 'neujahr',
    name: 'Neujahr',
    datum: fest(1, 1),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Beginn des Kalenderjahres.',
    bedeutung:
      'Kirchlich ist der 1. Jänner der achte Tag nach Weihnachten. Die katholische Kirche feiert das Hochfest der Gottesmutter Maria, ' +
      'die evangelische Kirche die Namengebung Jesu.',
  },
  {
    id: 'dreikoenig',
    name: 'Heilige Drei Könige',
    datum: fest(1, 6),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Erscheinung des Herrn (evangelisch: Epiphanias).',
    bedeutung:
      'Erinnert an die Sterndeuter aus dem Osten, die dem Kind in Betlehem Gold, Weihrauch und Myrrhe brachten. ' +
      'Rund um den Tag ziehen die Sternsinger von Haus zu Haus, sammeln Spenden und schreiben den Segen „C+M+B“ an die Tür ' +
      '(Christus mansionem benedicat, „Christus segne dieses Haus“).',
  },
  {
    id: 'lichtmess',
    name: 'Mariä Lichtmess',
    datum: fest(2, 2),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Darstellung des Herrn im Tempel, 40 Tage nach Weihnachten.',
    bedeutung:
      'Maria und Josef bringen das Kind in den Tempel von Jerusalem. In der Messe werden Kerzen geweiht, daher der Name. ' +
      'Früher endete an Lichtmess die Weihnachtszeit, und auf den Bauernhöfen wechselten die Dienstboten. Lichtmess ist auch ein Lostag der Bauernregeln.',
  },
  {
    id: 'josef',
    name: 'Josefitag',
    datum: fest(3, 19),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Fest des heiligen Josef, des Ziehvaters Jesu.',
    bedeutung: 'Josef ist Landespatron der Steiermark, Kärntens, Tirols und Vorarlbergs. Ein gesetzlicher Feiertag ist der Tag nicht.',
  },

  // ---------- Osterfestkreis ----------
  {
    id: 'aschermittwoch',
    name: 'Aschermittwoch',
    datum: ostern(-46),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Beginn der 40-tägigen Fastenzeit vor Ostern.',
    bedeutung:
      'Gezählt werden 40 Tage ohne die Sonntage. In der Messe zeichnet der Priester ein Aschenkreuz auf die Stirn, die Asche stammt von verbrannten Palmzweigen ' +
      'des Vorjahres. Auch in der evangelischen Kirche beginnt an diesem Tag die Passionszeit.',
  },
  {
    id: 'palmsonntag',
    name: 'Palmsonntag',
    datum: ostern(-7),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Einzug Jesu in Jerusalem, Beginn der Karwoche.',
    bedeutung:
      'Die Menschen begrüßten Jesus mit Palmzweigen. In Österreich werden Palmbuschen aus Palmkätzchen, Buchs und anderen Zweigen geweiht ' +
      'und danach zu Hause oder auf dem Feld aufgestellt.',
  },
  {
    id: 'gruendonnerstag',
    name: 'Gründonnerstag',
    datum: ostern(-3),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Letztes Abendmahl Jesu mit seinen Jüngern.',
    bedeutung:
      'Nach der Abendmesse schweigen in katholischen Kirchen die Glocken bis zur Osternacht („die Glocken fliegen nach Rom“). ' +
      'Statt der Glocken ziehen in vielen Orten Kinder mit hölzernen Ratschen herum. Woher das „Grün“ im Namen kommt, ist nicht sicher geklärt.',
  },
  {
    id: 'karfreitag',
    name: 'Karfreitag',
    datum: ostern(-2),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Tag der Kreuzigung Jesu, für evangelische Christen der höchste Feiertag.',
    bedeutung:
      'Für Katholiken ist er ein strenger Fasttag. Bis 2018 war der Karfreitag in Österreich für Evangelische, Altkatholiken und Methodisten arbeitsfrei. ' +
      'Seit 2019 gibt es stattdessen den „persönlichen Feiertag“: Jeder Arbeitnehmer darf einen Urlaubstag im Jahr selbst festlegen.',
  },
  {
    id: 'karsamstag',
    name: 'Karsamstag',
    datum: ostern(-1),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Tag der Grabesruhe Jesu.',
    bedeutung:
      'Tagsüber gibt es keine Messe. In Österreich werden Osterspeisen wie Schinken, Eier, Kren und Brot gesegnet (Speisensegnung). ' +
      'Am Abend beginnt mit dem Osterfeuer und der Osternacht das Osterfest.',
  },
  {
    id: 'ostersonntag',
    name: 'Ostersonntag',
    datum: ostern(0),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Auferstehung Jesu, das wichtigste Fest des Christentums.',
    bedeutung:
      'Ostern ist der erste Sonntag nach dem ersten Vollmond im Frühling (ab 21. März) und fällt deshalb immer auf einen Tag zwischen 22. März und 25. April. ' +
      'Nach Ostern richten sich viele andere Feste: Aschermittwoch, Christi Himmelfahrt, Pfingsten und Fronleichnam. ' +
      'Als Sonntag braucht Ostern keinen eigenen gesetzlichen Feiertag.',
  },
  {
    id: 'ostermontag',
    name: 'Ostermontag',
    datum: ostern(1),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Zweiter Ostertag.',
    bedeutung: 'Das Evangelium des Tages erzählt von zwei Jüngern, denen der auferstandene Jesus auf dem Weg nach Emmaus begegnet. Daher gehen viele an diesem Tag spazieren („Emmausgang“).',
  },
  {
    id: 'himmelfahrt',
    name: 'Christi Himmelfahrt',
    datum: ostern(39),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Jesus kehrt zu Gott zurück, 40 Tage nach Ostern (Ostersonntag mitgezählt).',
    bedeutung: 'Der Tag fällt immer auf einen Donnerstag. In vielen Pfarren gibt es in den Tagen davor Bittprozessionen für eine gute Ernte und gutes Wetter.',
  },
  {
    id: 'pfingstsonntag',
    name: 'Pfingstsonntag',
    datum: ostern(49),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Der Heilige Geist kommt auf die Jünger herab, „Geburtstag der Kirche“.',
    bedeutung: 'Pfingsten kommt vom griechischen „pentekoste“, der fünfzigste Tag nach Ostern. Mit Pfingsten endet die Osterzeit.',
  },
  {
    id: 'pfingstmontag',
    name: 'Pfingstmontag',
    datum: ostern(50),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Zweiter Pfingsttag.',
    bedeutung: 'Wie bei Ostern und Weihnachten ist der zweite Festtag in Österreich arbeitsfrei.',
  },
  {
    id: 'fronleichnam',
    name: 'Fronleichnam',
    datum: ostern(60),
    konfession: 'katholisch',
    gesetzlich: true,
    kurz: 'Fest des Leibes und Blutes Christi, immer an einem Donnerstag.',
    bedeutung:
      'Der Name kommt aus dem Mittelhochdeutschen: „vron“ heißt Herr, „lichnam“ der lebendige Leib. ' +
      'Typisch sind Prozessionen, bei denen die geweihte Hostie unter einem Baldachin durch den Ort getragen wird, mit Halt an geschmückten Altären.',
  },

  // ---------- Frühling bis Herbst ----------
  {
    id: 'florian',
    name: 'Florianitag',
    datum: fest(5, 4),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Fest des heiligen Florian, Schutzpatron der Feuerwehr.',
    bedeutung: 'Florian war ein römischer Beamter und starb um 304 in der Enns. Er ist Landespatron von Oberösterreich. Viele Feuerwehren feiern an diesem Tag.',
  },
  {
    id: 'staatsfeiertag',
    name: 'Staatsfeiertag',
    datum: fest(5, 1),
    konfession: 'staatlich',
    gesetzlich: true,
    kurz: 'Tag der Arbeit.',
    bedeutung: 'In Österreich seit 1919 gesetzlicher Feiertag. Die katholische Kirche feiert am selben Tag den heiligen Josef als Patron der Arbeiter.',
  },
  {
    id: 'mariae-himmelfahrt',
    name: 'Mariä Himmelfahrt',
    datum: fest(8, 15),
    konfession: 'katholisch',
    gesetzlich: true,
    kurz: 'Maria wird mit Leib und Seele in den Himmel aufgenommen.',
    bedeutung:
      'Papst Pius XII. hat diese Lehre 1950 als Glaubenssatz verkündet; die evangelische Kirche teilt sie nicht. ' +
      'In vielen Gegenden werden an diesem Tag Kräuterbuschen gesegnet.',
  },
  {
    id: 'rupert',
    name: 'Rupertitag',
    datum: fest(9, 24),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Fest des heiligen Rupert, erster Bischof von Salzburg.',
    bedeutung: 'Rupert ist Landespatron von Salzburg. In der Stadt Salzburg findet um diesen Tag der Rupertikirtag statt.',
  },
  {
    id: 'nationalfeiertag',
    name: 'Nationalfeiertag',
    datum: fest(10, 26),
    konfession: 'staatlich',
    gesetzlich: true,
    kurz: 'Erinnert an den Beschluss der immerwährenden Neutralität am 26. Oktober 1955.',
    bedeutung: 'Seit 1965 ist der Tag Nationalfeiertag. Das Bundesheer zeigt sich in Wien auf dem Heldenplatz, viele Ministerien und das Parlament sind offen zugänglich.',
  },
  {
    id: 'reformationstag',
    name: 'Reformationstag',
    datum: fest(10, 31),
    konfession: 'evangelisch',
    gesetzlich: false,
    kurz: 'Erinnert an den Beginn der Reformation 1517.',
    bedeutung:
      'Am 31. Oktober 1517 veröffentlichte Martin Luther in Wittenberg seine 95 Thesen gegen den Ablasshandel. ' +
      'Daraus entstanden die evangelischen Kirchen. In Österreich ist der Tag kein gesetzlicher Feiertag.',
  },
  {
    id: 'allerheiligen',
    name: 'Allerheiligen',
    datum: fest(11, 1),
    konfession: 'katholisch',
    gesetzlich: true,
    kurz: 'Gedenken an alle Heiligen, auch die, die keinen eigenen Festtag haben.',
    bedeutung:
      'Weil der Tag arbeitsfrei ist, besuchen die meisten Familien schon an Allerheiligen die Gräber, die am Nachmittag gesegnet werden. ' +
      'Gedacht ist dafür eigentlich Allerseelen am Tag danach. Zu Allerheiligen schenken Paten ihren Patenkindern einen Allerheiligenstriezel.',
  },
  {
    id: 'allerseelen',
    name: 'Allerseelen',
    datum: fest(11, 2),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Gedenken an alle Verstorbenen.',
    bedeutung: 'Auf den Gräbern brennen Grablichter. Die evangelische Kirche gedenkt der Verstorbenen am Ewigkeitssonntag Ende November.',
  },
  {
    id: 'martini',
    name: 'Martini',
    datum: fest(11, 11),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Fest des heiligen Martin von Tours.',
    bedeutung:
      'Martin teilte der Legende nach seinen Mantel mit einem frierenden Bettler. Er ist Landespatron des Burgenlands. ' +
      'Bekannt sind das Martinigansl und die Laternenumzüge der Kinder. Martini ist auch ein Lostag der Bauernregeln.',
  },
  {
    id: 'leopold',
    name: 'Leopolditag',
    datum: fest(11, 15),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Fest des heiligen Leopold III., Markgraf von Österreich.',
    bedeutung: 'Leopold ist Landespatron von Niederösterreich und Wien. Er gründete das Stift Klosterneuburg, wo am Leopolditag das Fasslrutschen stattfindet.',
  },

  // ---------- Ende und Beginn des Kirchenjahres ----------
  {
    id: 'christkoenig',
    name: 'Christkönigssonntag',
    datum: advent(-7),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Letzter Sonntag des katholischen Kirchenjahres.',
    bedeutung: 'Das Fest stellt Christus als König der Welt in den Mittelpunkt. Papst Pius XI. hat es 1925 eingeführt. Eine Woche später beginnt mit dem Advent das neue Kirchenjahr.',
  },
  {
    id: 'ewigkeitssonntag',
    name: 'Ewigkeitssonntag',
    datum: advent(-7),
    konfession: 'evangelisch',
    gesetzlich: false,
    kurz: 'Letzter Sonntag des evangelischen Kirchenjahres, auch Totensonntag genannt.',
    bedeutung: 'Evangelische Gemeinden gedenken an diesem Tag der Verstorbenen des vergangenen Jahres, ihre Namen werden im Gottesdienst verlesen.',
  },
  {
    id: 'advent1',
    name: '1. Adventsonntag',
    datum: advent(0),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Beginn des Advents und des neuen Kirchenjahres.',
    bedeutung:
      'Advent heißt „Ankunft“: Die vier Sonntage vor Weihnachten bereiten auf die Geburt Jesu vor. ' +
      'Den Adventkranz hat der evangelische Theologe Johann Hinrich Wichern 1839 in Hamburg erfunden; heute brennt an jedem Adventsonntag eine Kerze mehr.',
  },
  {
    id: 'advent2',
    name: '2. Adventsonntag',
    datum: advent(7),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Am Adventkranz brennen zwei Kerzen.',
    bedeutung: 'Die Lesungen des Tages handeln von Johannes dem Täufer, der das Kommen Jesu ankündigt.',
  },
  {
    id: 'nikolaus',
    name: 'Nikolaus',
    datum: fest(12, 6),
    konfession: 'katholisch',
    gesetzlich: false,
    kurz: 'Fest des heiligen Nikolaus, Bischof von Myra im 4. Jahrhundert.',
    bedeutung:
      'Nikolaus soll heimlich armen Familien geholfen haben, daher bringt er den Kindern Nüsse, Mandarinen und Süßes. ' +
      'Im Alpenraum ziehen am Vorabend (5. Dezember) die Krampusse durch die Orte.',
  },
  {
    id: 'mariae-empfaengnis',
    name: 'Mariä Empfängnis',
    datum: fest(12, 8),
    konfession: 'katholisch',
    gesetzlich: true,
    kurz: 'Maria wurde ohne Erbsünde empfangen.',
    bedeutung:
      'Oft verwechselt: Es geht um die Empfängnis Marias im Leib ihrer Mutter Anna, nicht um die Empfängnis Jesu. Der Glaubenssatz stammt von 1854. ' +
      'Seit 1995 dürfen in Österreich an diesem Feiertag die meisten Geschäfte offen halten.',
  },
  {
    id: 'advent3',
    name: '3. Adventsonntag',
    datum: advent(14),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Sonntag „Gaudete“ („Freut euch“), Weihnachten ist nahe.',
    bedeutung: 'Am katholischen Adventkranz ist die dritte Kerze oft rosa, als Zeichen der Vorfreude.',
  },
  {
    id: 'advent4',
    name: '4. Adventsonntag',
    datum: advent(21),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Letzter Sonntag vor Weihnachten, alle vier Kerzen brennen.',
    bedeutung: 'Fällt der 24. Dezember auf einen Sonntag, ist der 4. Advent zugleich der Heilige Abend.',
  },
  {
    id: 'heiligabend',
    name: 'Heiliger Abend',
    datum: fest(12, 24),
    konfession: 'beide',
    gesetzlich: false,
    kurz: 'Vorabend von Weihnachten.',
    bedeutung:
      'In Österreich bringt das Christkind am Abend die Geschenke. Viele gehen in die Christmette um Mitternacht. ' +
      'Ein gesetzlicher Feiertag ist der Tag nicht, die Geschäfte schließen aber spätestens um 14 Uhr.',
  },
  {
    id: 'christtag',
    name: 'Christtag',
    datum: fest(12, 25),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Weihnachten: Geburt Jesu.',
    bedeutung: 'Nach Ostern das zweitwichtigste Fest des Christentums. Das Datum 25. Dezember ist in Rom seit dem 4. Jahrhundert belegt.',
  },
  {
    id: 'stefanitag',
    name: 'Stefanitag',
    datum: fest(12, 26),
    konfession: 'beide',
    gesetzlich: true,
    kurz: 'Fest des heiligen Stephanus, des ersten christlichen Märtyrers (evangelisch: 2. Weihnachtsfeiertag).',
    bedeutung: 'Stephanus wurde in Jerusalem gesteinigt. Er ist Patron des Wiener Stephansdoms und der Pferde; mancherorts gibt es Stefaniritte.',
  },
]
