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
    terms: ['Südföhn', 'Föhn'],
    explanation:
      'Föhn ist ein warmer, trockener Fallwind auf der windabgewandten Seite eines Gebirges. Die Luft regnet sich beim Aufsteigen auf der einen Seite ab und erwärmt sich beim Herabsinken auf der anderen Seite stark. Dort wird es plötzlich mild, sehr klar und oft stürmisch. In Österreich ist vor allem der Südföhn nördlich der Alpen bekannt.',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“ steht das Stichwort „Südföhn“, wenn der Luftdruck in Bozen mindestens 4 hPa höher ist als in Innsbruck und in 3000 m kräftiger Südwind weht. Weitere Hinweise: Pfeile aus Süd im Diagramm „Wolken nach Höhe“, starke Böen und ungewöhnlich hohe Temperaturen.',
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
      'Im Reiter „Österreich“ unter „Großwetterlage“: Die Skizze von Europa zeigt die erkannten Hochs (H) und Tiefs (T) mit ihrem Kerndruck, der Text nennt ihre Lage. Liegt hoher Druck über Österreich und bleibt es trocken, steht dort das Stichwort „Hochdrucklage“. Linien gleichen Luftdrucks (Isobaren) zeigt windy.com (Reiter „Radar“ → „Groß bei Windy öffnen“): Liegen sie eng beieinander, weht kräftiger Wind.',
    sketch: 'hochtief',
  },
  {
    id: 'trog',
    title: 'Trog',
    terms: ['Trog', 'Hochkeil'],
    explanation:
      'Ein Trog ist ein Bereich mit kalter Luft in großer Höhe (etwa 5 km), der wie eine Ausbuchtung von Norden nach Süden reicht. Unter einem Trog ist das Wetter oft wechselhaft mit Schauern. Das Gegenstück ist der Hochkeil: warme Luft in der Höhe, meist ruhiges Wetter.',
    inApp:
      'Die App zeigt das nicht direkt. Auf windy.com (Reiter „Radar“ → „Groß bei Windy öffnen“) die Temperatur in großer Höhe (z. B. 500 hPa, ca. 5,5 km) wählen: Ein Keil kalter Farben von Norden ist ein Trog.',
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
    inApp: 'Fronten zeichnet die App nicht ein. Auf einer Druckkarte (z. B. bei windy.com) erkennt man ein älteres, sich auffüllendes Tief: Der Kerndruck steigt von Tag zu Tag.',
    sketch: 'okklusion',
  },
  {
    id: 'messstation',
    title: 'Messstation',
    terms: ['Messstation', 'Talstation', 'Bergstation'],
    explanation:
      'Eine Messstation misst das Wetter wirklich – Temperatur, Luftfeuchte, Wind, Niederschlag und mehr, in Österreich bei GeoSphere Austria alle 10 Minuten. Vorhersagemodelle rechnen dagegen mit Gitterfeldern von mehreren Kilometern und glätten dabei Täler und Berge. Darum liegen Messung und Modell oft ein paar Grad auseinander, besonders bei Nebel und Inversion.',
    inApp:
      'Auf „Lokal“ in der Karte „Jetzt gemessen“ (nächste Station mit ähnlicher Höhe, daneben der Mittelwert der Modelle) und auf „Berg & Tal“ mit einer Tal- und einer Bergstation. Ist es oben wärmer, steht dort „Inversion gemessen“; ab 95 % gemessener Feuchte im Tal meldet die App Nebel und berücksichtigt ihn im Tagesverlauf. Nur in Österreich.',
    example: 'Am 9.11.2026 maß Graz-Thalerhof −1,7 °C bei 98 % Feuchte (Nebel), der Schöckl +4,3 °C – die Modelle rechneten im Tal nur mit 86–93 % Feuchte.',
  },
  {
    id: 'lostag',
    title: 'Lostag',
    terms: ['Lostag', 'Lostage', 'Lostagen'],
    explanation:
      'Ein Lostag ist ein Tag im Jahr, an dessen Wetter man nach alter Überlieferung das kommende Wetter ablesen kann („Los“ wie Schicksal). Meist sind es Namenstage von Heiligen wie Martini, Lichtmess oder Siebenschläfer. Die meisten Lostag-Regeln sind reine Überlieferung, einige haben einen wahren Kern.',
    inApp:
      'Auf „Lokal“ in der Karte „Bauernregel des Tages“ und als kleines Zeichen mit dem Namen in der Tagesliste der Vorhersage. Alle Regeln stehen unten im Lexikon im Abschnitt „Bauernregeln“.',
    example: 'Martini (11.11.): „Ist’s um Martini trüb, wird der Winter auch nicht lieb.“',
  },
  {
    id: 'eisheilige',
    title: 'Eisheilige',
    terms: ['Eisheiligen', 'Eisheilige', 'Kalte Sophie'],
    explanation:
      'Die Eisheiligen sind die Namenstage Pankratius (12.5.), Servatius (13.5.), Bonifatius (14.5.) und die „Kalte Sophie“ (15.5.); in Norddeutschland zählt auch Mamertus (11.5.) dazu. Erst danach gilt Nachtfrost als vorbei, darum pflanzt man Empfindliches erst nach den Eisheiligen aus. Kälteeinbrüche im Mai gibt es tatsächlich häufig, sie halten sich aber nicht an diese Tage.',
    inApp: 'Als Lostag in der Tagesliste und in der Bauernregel des Tages. Ob es in diesen Tagen Frost gibt, zeigt die Prüfung „Trifft die Regel heuer zu?“, sobald die Tage in der Vorhersage liegen.',
    example: '„Pankraz, Servaz, Bonifaz machen erst dem Sommer Platz.“',
  },
  {
    id: 'schafskaelte',
    title: 'Schafskälte',
    terms: ['Schafskälte'],
    explanation:
      'Die Schafskälte ist ein Kälterückfall um Mitte Juni. Das Festland ist dann schon warm, das Meer noch kühl; dadurch strömt häufig kühle Meeresluft nach Mitteleuropa. Der Name kommt von den frisch geschorenen Schafen, die in diesen Tagen frieren.',
    inApp: 'In der Vorhersage als spürbarer Temperaturrückgang Mitte Juni, wenn sie eintritt. Sie hat keinen festen Tag und ist darum kein Lostag.',
  },
  {
    id: 'altweibersommer',
    title: 'Altweibersommer',
    terms: ['Altweibersommer'],
    explanation:
      'Altweibersommer heißt eine Schönwetterzeit im Frühherbst (Ende September, Oktober): sonnige, warme Nachmittage, kühle Nächte, morgens oft Nebel. Ursache ist ein ruhiges Hoch über Mitteleuropa. Der Name kommt wohl von den Spinnfäden, die dann durch die Luft treiben und an graue Haare erinnern.',
    inApp: 'In der Vorhersage als mehrere sonnige, trockene Tage mit großem Unterschied zwischen Tag und Nacht. Am Morgen zeigt „Berg & Tal“ dann oft Nebel im Tal.',
  },
  {
    id: 'siebenschlaefer',
    title: 'Siebenschläfer',
    terms: ['Siebenschläfer', 'Siebenschläfertag'],
    explanation:
      'Der Siebenschläfertag (27.6.) erinnert an eine Legende von sieben jungen Männern, die in einer Höhle fast 200 Jahre geschlafen haben sollen. Die Regel dazu sagt, das Wetter dieses Tages halte sieben Wochen. Sie hat einen wahren Kern: Ende Juni / Anfang Juli stellt sich die Wetterlage oft für längere Zeit ein. Wegen der Kalenderreform 1582 ist der „richtige“ Zeitraum heute eher Anfang Juli, und man muss mehrere Tage betrachten.',
    inApp: 'Als Lostag in der Tagesliste und in der Bauernregel des Tages; ab Mitte Juni mit der Prüfung „Trifft die Regel heuer zu?“.',
  },
  // ---------- Großwetterlage (Etappe 18) ----------
  {
    id: 'nordstau',
    title: 'Nordstau',
    terms: ['Nordstau'],
    explanation:
      'Bei Nordstau strömt feuchte Luft aus Nordwest bis Nord gegen die Alpen. Sie muss aufsteigen, kühlt dabei ab und regnet oder schneit sich an der Alpennordseite aus, oft stundenlang. Südlich des Alpenhauptkamms kommt die Luft trocken an, dort ist es häufig sonnig und windig (Nordföhn).',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“ als Stichwort. Die App erkennt Nordstau, wenn der Wind in 3000 m aus Nordwest bis Nord weht und nördlich des Alpenhauptkamms deutlich mehr Niederschlag fällt als südlich.',
    example: 'In Salzburg und im Salzkammergut schneit es den ganzen Tag, in Klagenfurt scheint die Sonne.',
  },
  {
    id: 'suedstau',
    title: 'Südstau',
    terms: ['Südstau'],
    explanation:
      'Südstau ist das Gegenstück zum Nordstau: Feuchte Luft vom Mittelmeer strömt aus Süd bis Südwest gegen die Alpen und regnet sich an der Alpensüdseite aus. Betroffen sind vor allem Osttirol, Kärnten und Südtirol. Nördlich des Alpenhauptkamms bleibt es oft trocken, dort weht dann häufig Föhn.',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“ als Stichwort, oft zusammen mit „Südföhn“. Die App erkennt Südstau, wenn der Wind in 3000 m aus Süd weht und südlich des Alpenhauptkamms deutlich mehr Niederschlag fällt als nördlich.',
    example: 'In Lienz und im Gailtal regnet es kräftig, in Innsbruck ist es bei Föhn mild und trocken.',
  },
  {
    id: 'genuatief',
    title: 'Genuatief und Adriatief',
    terms: ['Genuatief', 'Adriatief', 'Italientief'],
    explanation:
      'Ein Genuatief ist ein Tief, das über dem Golf von Genua oder über Oberitalien entsteht, häufig wenn kalte Luft aus Nordwesten über die Alpen oder durch das Rhonetal ins Mittelmeer fließt. Es bringt der Alpensüdseite viel Regen oder Schnee. Liegt der Kern weiter östlich, spricht man vom Adriatief. Wohin das Tief danach zieht, entscheidet, welche Teile Österreichs den meisten Niederschlag bekommen.',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“ als Stichwort, wenn die App einen Tiefkern über Oberitalien oder der Adria findet. In der Europa-Skizze steht dort ein rotes T.',
  },
  {
    id: 'vb-lage',
    title: 'Vb-Lage',
    terms: ['Vb-Lage', 'Vb-Tief', 'Vb-Wetterlage'],
    explanation:
      'Vb (gesprochen „fünf b“) ist der Name einer Zugbahn von Tiefs: von Oberitalien oder der Adria nach Nordosten, über Ungarn und die Slowakei Richtung Polen. Der Name stammt aus einer Einteilung der Zugbahnen, die der Meteorologe Wilhelm Jacob van Bebber im 19. Jahrhundert aufgestellt hat. Das Tief führt sehr feuchte Mittelmeerluft um die Alpen herum nach Norden. Dort gleitet sie auf kältere Luft auf und es regnet lange und ergiebig, was zu Hochwasser führen kann.',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“ als rot markierter Warnhinweis. Die App verfolgt einen Tiefkern über Italien zwei Tage lang. Zieht er nach Nordosten, weist sie auf eine mögliche Vb-Lage hin.',
    example: 'Die Hochwasser im August 2002 und im September 2024 entstanden bei Vb-Lagen.',
  },
  {
    id: 'luftmassenzufuhr',
    title: 'Warmluft- und Kaltluftzufuhr',
    terms: ['Warmluftzufuhr', 'Kaltluftzufuhr', 'Kaltluftausbruch'],
    explanation:
      'Die Strömung bringt Luft aus anderen Gegenden heran. Kommt sie aus Süden oder Südwesten, wird es wärmer (Warmluftzufuhr), kommt sie aus Norden, wird es kälter (Kaltluftzufuhr). Man misst das am besten in rund 1500 m Höhe, weil dort Sonne, Nebel und Nacht die Temperatur kaum verfälschen. Stößt in kurzer Zeit sehr kalte Luft aus dem Norden bis zu den Alpen vor, spricht man von einem Kaltluftausbruch.',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“: Die App vergleicht die Temperatur in 1500 m mit den zwei Vortagen. Ab 4 Grad Unterschied schreibt sie „Es strömt Warmluft ein“ oder „Es strömt Kaltluft ein“. Ab 6 Grad Abkühlung bei Strömung aus Norden steht das Stichwort „Kaltluftausbruch aus Norden“.',
  },
  {
    id: 'west-ostlage',
    title: 'Westlage und Ostlage',
    terms: ['Westlage', 'Ostlage'],
    explanation:
      'Bei einer Westlage strömt die Luft in der Höhe vom Atlantik her von West nach Ost über Europa. Tiefs und ihre Fronten ziehen in rascher Folge durch, das Wetter wechselt oft und ist für die Jahreszeit meist mild. Bei einer Ostlage kommt die Luft vom Kontinent im Osten: im Winter trocken und kalt, im Sommer trocken und warm.',
    inApp:
      'Im Reiter „Österreich“ unter „Großwetterlage“ als Stichwort. Die App nennt West- oder Ostlage nur, wenn keine andere typische Alpen-Wetterlage zutrifft.',
  },
]
