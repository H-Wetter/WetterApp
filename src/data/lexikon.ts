import type { LexikonEntry } from '../types/lexikon'

/**
 * Wetterlexikon – alle Texte an einem Ort.
 *
 * So ergänzt du einen Begriff: einen neuen Block { … } in die Liste kopieren und ausfüllen.
 * – id: kurzer Name ohne Leer- und Sonderzeichen (für Links), z. B. 'graupel'
 * – terms: Wörter, die in der App automatisch antippbar werden (Groß-/Kleinschreibung beachten!)
 * – explanation: 2–4 einfache Sätze
 * – inApp: wo man es in der App sieht
 * – example und sketch sind freiwillig
 * Die Reihenfolge hier ist egal – die Seite sortiert alphabetisch.
 */
export const LEXIKON: LexikonEntry[] = [
  {
    id: 'inversion',
    title: 'Inversion',
    terms: ['Inversion'],
    explanation:
      'Normalerweise wird es nach oben hin kälter – etwa 0,65 °C pro 100 Höhenmeter. Bei einer Inversion ist es umgekehrt: Unten liegt kalte Luft, darüber wärmere. Die kalte Luft ist schwerer und bleibt wie in einer Schüssel im Tal liegen. Typisch ist das im Herbst und Winter bei ruhigem Hochdruckwetter.',
    inApp:
      'Auf der Seite „Berg & Tal“: ein oranger Hinweis oben und orange hinterlegte Zeiten im Temperaturdiagramm. Die App erkennt die Inversion am Temperaturprofil der Modelle über deinem Ort.',
    example: 'Im Grazer Becken hat es morgens −2 °C und Nebel, am Schöckl scheint die Sonne bei +6 °C.',
    sketch: 'inversion',
  },
  {
    id: 'hochnebel',
    title: 'Hochnebel und Nebel',
    terms: ['Hochnebel', 'Nebelobergrenze', 'Nebelmeer', 'Nebel'],
    explanation:
      'Nebel ist eine Wolke, die am Boden aufliegt. Hochnebel ist eine graue Wolkendecke, die etwas über dem Boden schwebt – man sieht darunter, aber die Sonne kommt nicht durch. Beides entsteht oft unter einer Inversion: Die feuchte, kalte Luft kann nicht nach oben entweichen. Von einem Berg aus sieht man dann ein „Nebelmeer“.',
    inApp:
      'Bei „Berg & Tal“ steht „Inversion mit Hochnebel“ bzw. „mit Nebel“ samt geschätzter Nebelobergrenze. In den Tageskacheln zeigt das Nebelsymbol trübe Tage.',
    example: 'Nebelobergrenze 900 m: In Graz (360 m) ist es grau, am Schöckl (1445 m) sonnig.',
    sketch: 'hochnebel',
  },
  {
    id: 'nullgradgrenze',
    title: 'Nullgradgrenze',
    terms: ['Nullgradgrenze'],
    explanation:
      'Die Nullgradgrenze ist die Höhe, in der die Luft genau 0 °C hat. Darunter ist es wärmer, darüber friert es. Sie verrät, ob Niederschlag als Regen oder Schnee fällt und wo auf den Bergen Frost herrscht.',
    inApp:
      'Im Diagramm „Wolken nach Höhe“ als hellblaue, gepunktete Linie. Außerdem in der Stundenansicht eines Tages und in den Warnhinweisen.',
    example: 'Nullgradgrenze 1800 m: Im Tal regnet es, auf 2500 m schneit es.',
    sketch: 'nullgrad',
  },
  {
    id: 'schneefallgrenze',
    title: 'Schneefallgrenze',
    terms: ['Schneefallgrenze'],
    explanation:
      'Die Schneefallgrenze ist die Höhe, bis zu der Schnee herunterfällt, ohne vorher zu schmelzen. Sie liegt meist etwa 300 m unter der Nullgradgrenze, weil Schneeflocken eine Weile brauchen, bis sie in wärmerer Luft schmelzen. Bei kräftigem Niederschlag kann sie noch tiefer sinken, weil der fallende Schnee die Luft abkühlt.',
    inApp: 'In der Stundenansicht eines Tages und in den Warnhinweisen (Schneefall). Im Wolkenschnitt liegt sie knapp unter der Linie der Nullgradgrenze.',
    example: 'Nullgradgrenze 1200 m → Schnee meist ab etwa 900 m.',
    sketch: 'nullgrad',
  },
  {
    id: 'foehn',
    title: 'Föhn',
    terms: ['Föhn'],
    explanation:
      'Föhn ist ein warmer, trockener Fallwind auf der windabgewandten Seite eines Gebirges. Die Luft regnet sich beim Aufsteigen auf der einen Seite ab und erwärmt sich beim Herabsinken auf der anderen Seite stark. Dort wird es plötzlich mild, sehr klar und oft stürmisch. In Österreich ist vor allem der Südföhn nördlich der Alpen bekannt.',
    inApp:
      'Die App erkennt Föhn noch nicht automatisch. Hinweise: kräftiger Südwind in der Höhe (Pfeile im Diagramm „Wolken nach Höhe“), starke Böen und ungewöhnlich hohe Temperaturen.',
    example: 'Innsbruck hat bei Südföhn im Winter 18 °C, südlich des Brenners regnet es.',
    sketch: 'foehn',
  },
  {
    id: 'cape',
    title: 'CAPE und Gewitterneigung',
    terms: ['CAPE', 'Gewitterneigung', 'Gewitterrisiko'],
    explanation:
      'CAPE (gesprochen „Kejp“) ist die Energie, die aufsteigende warme, feuchte Luft zur Verfügung hat – gemessen in Joule pro Kilogramm (J/kg). Je mehr CAPE, desto kräftiger können Gewitter werden. Ob wirklich eines entsteht, hängt aber auch davon ab, ob die Luft einen „Anstoß“ bekommt, etwa durch eine Front oder die Sonne über Bergen.',
    inApp:
      'In den Warnhinweisen auf der Seite „Lokal“: ab 500 J/kg leichte, ab 1000 deutliche, ab 2000 kräftige Gewitterneigung – immer zusammen mit dem Wettercode der Modelle.',
    example: 'Sommernachmittag mit 1500 J/kg: Über den Bergen bauen sich mächtige Quellwolken auf.',
    sketch: 'cape',
  },
  {
    id: 'lifted-index',
    title: 'Lifted Index',
    terms: ['Lifted Index'],
    explanation:
      'Der Lifted Index vergleicht, wie warm ein aufsteigendes Luftpaket in etwa 5,5 km Höhe wäre, mit der Luft, die dort tatsächlich ist. Ist der Wert negativ, ist das Paket wärmer als seine Umgebung und steigt von selbst weiter – die Luft ist „labil“. Faustregel: unter −2 Gewitter möglich, unter −6 kräftige Gewitter.',
    inApp: 'Die App zeigt den Lifted Index noch nicht an; für Gewitter nutzt sie CAPE und den Wettercode der Modelle.',
  },
  {
    id: 'boeen',
    title: 'Böen',
    terms: ['Sturmböen', 'Böen', 'Böe'],
    explanation:
      'Böen sind kurze, kräftige Windstöße von wenigen Sekunden. Der „mittlere Wind“ ist der Durchschnitt über 10 Minuten – Böen sind meist deutlich stärker. Für Schäden und fürs Gefühl draußen zählen vor allem die Böen.',
    inApp:
      'Im Wind-Diagramm als gestrichelte Linie, in den Tageskacheln als Höchstwert und in den Warnhinweisen ab Sturmböen (über 60 km/h).',
    example: 'Mittlerer Wind 25 km/h, Böen bis 60 km/h: Schirme klappen um, Äste können brechen.',
  },
  {
    id: 'taupunkt',
    title: 'Taupunkt',
    terms: ['Taupunkt'],
    explanation:
      'Der Taupunkt ist die Temperatur, auf die sich Luft abkühlen müsste, damit ihr Wasserdampf zu Tröpfchen wird. Liegen Temperatur und Taupunkt nah beisammen, ist die Luft fast gesättigt – Nebel oder tiefe Wolken sind dann wahrscheinlich. Ein hoher Taupunkt im Sommer (über 16 °C) fühlt sich schwül an.',
    inApp: 'Die App nutzt den Taupunkt im Hintergrund, um die Wolkenbasis zu schätzen.',
    example: 'Abends 8 °C, Taupunkt 7 °C: In der Nacht bildet sich leicht Nebel.',
  },
  {
    id: 'wolkenbasis',
    title: 'Wolkenbasis',
    terms: ['Wolkenbasis'],
    explanation:
      'Die Wolkenbasis ist die Unterkante der Wolken. Man kann sie grob schätzen: Höhe über Grund ≈ 125 m mal (Temperatur minus Taupunkt). Je trockener die Luft, desto höher liegen die Wolken.',
    inApp: 'Im Diagramm „Wolken nach Höhe“ als orange gestrichelte Linie.',
    example: '20 °C und Taupunkt 12 °C → Wolkenbasis etwa 1000 m über dem Boden.',
    sketch: 'wolkenbasis',
  },
  {
    id: 'wolkenstockwerke',
    title: 'Tiefe, mittlere und hohe Wolken',
    terms: ['tiefe Wolken', 'mittlere Wolken', 'hohe Wolken', 'Wolkenschnitt'],
    explanation:
      'Wolken werden nach ihrer Höhe in drei „Stockwerke“ eingeteilt: tiefe unter etwa 2 km, mittlere zwischen 2 und 6 km, hohe über 6 km. Tiefe Wolken sind dicht und grau und bringen oft Regen. Hohe Wolken bestehen aus Eiskristallen, sind dünn und lassen die Sonne meist durch.',
    inApp: 'Im Diagramm „Wolken nach Höhe“: Je weiter oben eine Wolke gezeichnet ist, desto höher liegt sie.',
    example: 'Schleierwolken (hoch) am Morgen kündigen oft eine Wetteränderung in ein bis zwei Tagen an.',
    sketch: 'wolkenstockwerke',
  },
  {
    id: 'ensemble',
    title: 'Ensemble',
    terms: ['Ensemble'],
    explanation:
      'Ein Ensemble ist eine Gruppe von Rechenläufen desselben Wettermodells mit leicht veränderten Startwerten. Weil kleine Messfehler sich mit der Zeit aufschaukeln, laufen die Ergebnisse nach einigen Tagen auseinander. So sieht man, welches Wetter wahrscheinlich ist – und wie sicher die Vorhersage ist.',
    inApp: 'Auf der Seite „Lokal“ im Bereich „Trend – Tag 8 bis 16“: Linien und Flächen fassen über 100 Läufe zusammen.',
    example: '80 von 100 Läufen bringen am Tag 10 Regen → Regenwahrscheinlichkeit 80 %.',
    sketch: 'streuung',
  },
  {
    id: 'modellstreuung',
    title: 'Modellstreuung',
    terms: ['Modellstreuung', 'Streuband', 'Streuung', 'Unsicherheitsband'],
    explanation:
      'Verschiedene Wettermodelle rechnen mit unterschiedlichen Methoden und kommen darum zu etwas anderen Ergebnissen. Die Streuung zeigt, wie weit sie auseinanderliegen. Kleine Streuung heißt: Die Vorhersage ist ziemlich sicher. Große Streuung heißt: Das Wetter ist noch offen.',
    inApp:
      'In den Verlaufsdiagrammen als graue Fläche um die dicke Mittellinie. Beim Trend Tag 8–16 als „Einigkeit“ (hoch, mittel, gering).',
    sketch: 'streuung',
  },
  {
    id: 'hoch-tief',
    title: 'Hoch- und Tiefdruckgebiet',
    terms: ['Hochdruckgebiet', 'Tiefdruckgebiet', 'Hochdruck', 'Tiefdruck', 'Isobaren'],
    explanation:
      'Ein Hoch ist ein Gebiet mit hohem Luftdruck: Die Luft sinkt dort ab, Wolken lösen sich auf – meist ruhiges, trockenes Wetter. Ein Tief hat niedrigen Luftdruck: Die Luft steigt auf, es bilden sich Wolken und Niederschlag. Der Wind weht vom Hoch zum Tief und wird durch die Erddrehung abgelenkt, sodass er auf unserer Erdhälfte gegen den Uhrzeigersinn um ein Tief kreist.',
    inApp:
      'Auf der Seite „Großwetterlage“: „H“ und „T“ markieren die Zentren, die Linien (Isobaren) verbinden Orte mit gleichem Luftdruck. Liegen sie eng beieinander, weht kräftiger Wind.',
    sketch: 'hochtief',
  },
  {
    id: 'trog',
    title: 'Trog',
    terms: ['Trog', 'Hochkeil'],
    explanation:
      'Ein Trog ist ein Bereich mit kalter Luft in großer Höhe (etwa 5 km), der wie eine Ausbuchtung von Norden nach Süden reicht. Unter einem Trog ist das Wetter oft wechselhaft mit Schauern. Das Gegenstück ist der Hochkeil: warme Luft in der Höhe, meist ruhiges Wetter.',
    inApp: 'Auf der Seite „Großwetterlage“: Blaue Farben zeigen kalte Luft in der Höhe (Trog), rote warme Luft (Hochkeil).',
    sketch: 'trog',
  },
  {
    id: 'kaltfront',
    title: 'Kaltfront',
    terms: ['Kaltfront'],
    explanation:
      'An einer Kaltfront schiebt sich kalte Luft unter wärmere und hebt sie rasch an. Das bringt oft kräftige Schauer oder Gewitter, Windböen und danach einen spürbaren Temperatursturz. Hinter der Front wird die Luft klarer und frischer.',
    inApp:
      'Fronten zeichnet die App nicht ein. Du erkennst eine Kaltfront im Verlaufsdiagramm: Die Temperatur fällt deutlich, gleichzeitig gibt es Regen und Böen.',
    example: 'Nach einem heißen Tag 32 °C → Gewitter am Abend → am nächsten Tag nur 22 °C.',
    sketch: 'kaltfront',
  },
  {
    id: 'warmfront',
    title: 'Warmfront',
    terms: ['Warmfront'],
    explanation:
      'An einer Warmfront gleitet warme Luft langsam auf kältere Luft auf. Davor ziehen zuerst hohe Schleierwolken auf, dann wird die Wolkendecke immer dichter und tiefer. Es folgt meist länger anhaltender, eher gleichmäßiger Regen, danach wird es milder.',
    inApp:
      'Fronten zeichnet die App nicht ein. Hinweise: im Diagramm „Wolken nach Höhe“ zuerst hohe, dann immer tiefere Wolken, danach länger Regen und steigende Temperaturen.',
    sketch: 'warmfront',
  },
  {
    id: 'okklusion',
    title: 'Okklusion',
    terms: ['Okklusion'],
    explanation:
      'Eine Okklusion entsteht, wenn die schnellere Kaltfront die Warmfront eines Tiefs einholt. Die warme Luft wird dabei vom Boden abgehoben. Das Wetter ist eine Mischung aus beiden Fronten: oft länger Regen, manchmal mit Schauern. Für das Tief ist es meist der Anfang vom Ende.',
    inApp: 'Fronten zeichnet die App nicht ein. Auf der „Großwetterlage“ sieht man ein älteres, sich auffüllendes Tief: Der Kerndruck steigt von Tag zu Tag.',
    sketch: 'okklusion',
  },
]
