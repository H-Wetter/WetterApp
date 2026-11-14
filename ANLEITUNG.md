# Schritt-für-Schritt: Wetter-App mit Claude Code

## Teil A – Vorbereitung (einmalig)

**1. Node.js prüfen**
Terminal öffnen und eingeben:
```
node -v
```
Wird eine Version ab 18 angezeigt, passt es. Sonst Node.js (LTS) von https://nodejs.org installieren.

**2. Git prüfen**
```
git --version
```
Falls nicht vorhanden: https://git-scm.com installieren. Git ist deine „Rückgängig-Taste“ für das ganze Projekt.

**3. Projektordner anlegen**
```
mkdir wetter-app
cd wetter-app
```

**4. CLAUDE.md hineinlegen**
Die Datei `CLAUDE.md` in den Ordner `wetter-app` kopieren. Claude Code liest sie automatisch bei jedem Start – dort stehen Ziel, Datenquellen und Regeln.

**5. Claude Code starten**
Im Ordner `wetter-app`:
```
claude
```

---

## Teil B – Etappen bauen

Bei jeder Etappe gleich vorgehen:
1. Prompt in Claude Code einfügen.
2. Claude arbeiten lassen, Rückfragen beantworten.
3. Ergebnis ansehen – Claude testet selbst im Browser, du kannst zusätzlich selbst testen (siehe „Testen“ unten).
4. Passt es → am Ende auf **„Ja, hochladen“** klicken (siehe „Sichern“). Sonst sagen, was noch geändert werden soll.
5. Erst dann zur nächsten Etappe.

### Etappe 1 – Grundgerüst
> Lies CLAUDE.md. Setze Etappe 1 um: Vite-Projekt mit React und TypeScript in diesem Ordner, Seite „Lokal“, Standort per Geolocation mit Fallback Graz, Ortssuche über die Open-Meteo Geocoding API. Initialisiere auch Git. Erkläre mir danach, wie ich die App starte.

### Etappe 2 – Modellvergleich
> Setze Etappe 2 aus CLAUDE.md um. Prüfe zuerst in der Open-Meteo-Doku, welche Modellnamen aktuell gültig sind. Zeige Temperatur, Niederschlag und Wind für 7 Tage: eine Linie pro Modell, dazu Mittelwert und Streuband. Mit Legende, in der ich Modelle ein- und ausblenden kann.

### Etappe 3 – Wetter-Kacheln
> Setze Etappe 3 um: kompakte Kacheln für heute und morgen.

### Etappe 4 – Wolkenschnitt
> Setze Etappe 4 um: Höhen-Zeit-Diagramm der Bewölkung aus den Druckniveaus, geschätzte Wolkenbasis und Zugrichtung der Wolken. Erkläre mir kurz, wie ich das Diagramm lese.

### Etappe 5 – Berg & Tal
> Setze Etappe 5 um: Vergleich Tal (Standort) und Berg (Standard Schöckl, später wählbar), Inversionserkennung und je eine kurze Tagesbeschreibung in Worten für Tal und Berg.

### Etappe 6 – Warnungen
> Setze Etappe 6 um: Hinweise zu Gewitter, Sturmböen, Schneefall und Nullgradgrenze, farblich nach Stärke.

### Etappe 7 – Umwelt
> Setze Etappe 7 um: Pollen, Feinstaub, UV und Saharastaub aus der Air-Quality-API.

### Etappe 8 – 16-Tage-Trend
> Setze Etappe 8 um: Ensemble-Trend für Tag 8 bis 16 mit Unsicherheitsband.

### Etappe 9 – Großwetterlage *(am 09.11.2026 wieder entfernt)*
> Setze Etappe 9 um. Mach zuerst einen Plan, wie viele API-Aufrufe das Raster braucht und wie wir cachen, und zeig ihn mir, bevor du baust.

Die Seite gibt es nicht mehr – Wetterkarten zeigt jetzt die Windy-Karte im Reiter „Radar“. Wer sie zurück will: „Hol die Großwetterlage aus etappe-9 zurück.“

### Etappe 10 – Wetterlexikon
Eigener Reiter mit einfachen Erklärungen (Inversion, Föhn, CAPE, Fronten …), Suchfeld und Skizzen. Begriffe in der App sind antippbar und springen direkt zur Erklärung. Texte in `src/data/lexikon.ts` – neue Begriffe einfach dort ergänzen lassen.

### Etappe 11 – Tagesverlauf in Worten
Für jeden Tag Vormittag, Mittag, Nachmittag und Abend in 1–3 Sätzen: Wolken, Regen/Schnee, Temperatur, Wind, Gewitter, Nebel. Sind sich die Modelle uneinig, steht das dabei; bei Inversion getrennt für Tal und Berg. Regeln in `src/lib/tagesverlauf.ts`.

### Etappe 12 – Feinschliff
Daten werden gemerkt (Vorhersage 30 Min., spart Abrufe), der zuletzt gewählte Ort bleibt nach dem Neuladen, einheitliche Ladeanzeigen und Fehlermeldungen, Handy-Layout (Reiter als 3 × 2 Knöpfe), Ortssuche hinter „Ort ändern“ eingeklappt.

### Etappe 13 – Webcams und Radar
Reiter „Webcams“: Webcams im Umkreis, getrennt nach Tal und Berg (Windy Webcams API, Schlüssel siehe unten). Reiter „Radar“: eingebettete Windy-Karte (Radar, Satellit, Regen, Wind …) und Link zur Live-Blitzkarte von Blitzortung.org.

### Etappe 14 – Jetzt gemessen (GeoSphere Austria)
Echte Messwerte der nächsten Station neben der Vorhersage („Lokal“), Tal- und Bergstation mit „Inversion gemessen“ („Berg & Tal“) und Nebel aus den Messwerten (≥ 95 % Feuchte an einer nahen Talstation). Nur in Österreich.

### Etappe 15 – Verbesserungen
Automatische Tests (`npm test`), amtliche Warnungen von GeoSphere, App aufs Handy (siehe unten), Modell-Check „Welches Modell lag zuletzt richtig?“ schönere Verlaufsdiagramme (Farbe je Größe, Regen als Säulen, Nacht grau, Höchst-/Tiefstwerte) und die Vorhersage als Liste: oben „Heute“ Stunde für Stunde zum Wischen, darunter je Tag eine Zeile; Tippen auf einen Tag zeigt jede Stunde in einer eigenen Zeile.

### Etappe 16 – Bauernregeln
Auf „Lokal“ die Karte „Bauernregel des Tages“: an einem Lostag dessen Regel, sonst eine Regel des Monats, dazu „Was steckt dahinter?“ und der nächste Lostag. Lostage sind in der Tagesliste markiert. Im Wetterlexikon ganz unten alle Regeln nach Monaten mit eigener Suche, dazu die Begriffe Lostag, Eisheilige, Schafskälte, Altweibersommer und Siebenschläfer.

Regeln ergänzen: in `src/data/bauernregeln.ts` einen Block kopieren und ausfüllen (Anleitung steht oben in der Datei). Regeln mit `ungeprueft: true` zeigen den Vermerk „ungeprüft“. Hast du eine Regel kontrolliert, die Zeile `ungeprueft: true` löschen.

Ausprobieren mit einem anderen Datum, ohne die Uhr zu verstellen: an die Adresse `?datum=JJJJ-MM-TT` anhängen, z. B.
- http://localhost:5173/?datum=2026-11-11 (Martini)
- http://localhost:5173/?datum=2026-06-27 (Siebenschläfer)
- http://localhost:5173/?datum=2026-05-13 (Eisheilige)

Das Testdatum gilt nur für die Karte „Bauernregel des Tages“. Die Vorhersage und die Lostag-Zeichen in der Tagesliste bleiben echt. „Trifft die Regel heuer zu?“ erscheint nur, wenn der Lostag in den nächsten 14 Tagen liegt und die Regel prüfbar ist.

### Etappe 17 – Österreich-Karte
Eigener Reiter „Österreich“: Karte der 9 Bundesländer mit Wettersymbol und Höchst-/Tiefstwert für die Landeshauptstädte und Ramsau am Dachstein. Oben 7 Tage zur Auswahl. Klick auf ein Bundesland zeigt die Landeshauptstadt, Klick auf einen Marker den Ort: Werte, Nullgradgrenze, Tagesverlauf und „Mehr Details“ (öffnet den Ort in „Lokal“).

Gut zu wissen:
- Die Karte nutzt 6 Modelle und lädt alle 10 Orte mit einem Abruf (30 Minuten gemerkt).
- Die Grenzen liegen als Datei im Projekt (`src/data/bundeslaender.geo.json`). Neu holen mit `node scripts/make-austria-map.mjs`.
- Weitere Orte: in `src/data/orte-oesterreich.ts` ergänzen (Koordinaten und Höhe aus der Open-Meteo-Ortssuche).

Testen am Computer (`npm run dev`, Reiter „Österreich“):
1. Über die Bundesländer fahren: Das Land färbt sich blau, unten steht der Name.
2. Einen anderen Tag oben anklicken: Symbole und Temperaturen wechseln.
3. Auf die Steiermark klicken: Rechts öffnet sich Graz. Auf den Marker bei Ramsau klicken: Ramsau (1123 m).
4. Mit ✕ oder der Esc-Taste schließen. „Mehr Details“ öffnet den Ort in „Lokal“.

Testen am Handy (Online-Version oder im Browser mit Handy-Ansicht):
1. Tageszeile seitlich wischen, einen Tag antippen.
2. Prüfen, dass sich keine Marker überlappen. Wo es eng ist, steht der Marker neben dem Ort (blauer Punkt).
3. Ein Bundesland antippen: Der Bereich fährt von unten herein. Antippen des grauen Hintergrunds schließt ihn.

### Etappe 18 – Großwetterlage in Worten
Im Reiter „Österreich“ unter der Karte: ein Absatz, der für den gewählten Tag beschreibt, wie die Wetterlage über Europa auf Österreich einwirkt. Darunter die erkannte Wetterlage als Stichwort (antippen öffnet das Lexikon), ein Satz zur Sicherheit und rechts eine Europa-Skizze mit Hochs (H) und Tiefs (T). „Einzelheiten und Zahlen“ zeigt, woraus die App das ableitet.

Gut zu wissen:
- Die App erkennt Hochdrucklage, Nordstau, Südstau, Südföhn, Genua- und Adriatief (mit Warnung bei möglicher Vb-Lage), Kaltluftausbruch aus Norden, Westlage und Ostlage. Passt nichts, steht dort „keine eindeutige“.
- Ein Laden kostet rund 300 Aufrufe bei Open-Meteo (273 für das Europa-Raster). Das Ergebnis bleibt 1 Stunde gemerkt, der Tageswechsel kostet nichts.
- Die Namen der Hochs und Tiefs (FU Berlin) fehlen, weil es dafür keine frei nutzbare Quelle gibt.
- Saharastaub reicht nur etwa 5 Tage voraus.

Wo du etwas anpasst:
- Schwellen der Wetterlagen: Block `SCHWELLEN` oben in `src/lib/grosswetterlage.ts`.
- Hochs und Tiefs: oben in `src/lib/druckgebilde.ts`. Strömung, Luftmasse, Fronten: oben in `src/lib/stroemung.ts`. Staub, Gewitter, Nullgradgrenze, Sturm: oben in `src/lib/einfluesse.ts`.
- Gebietsnamen („über der Biskaya“): `src/data/europa-regionen.ts`. Orte im Alpenraum: `src/data/alpenpunkte.ts`.
- Küstenlinien der Skizze neu holen: `node scripts/make-europa-kueste.mjs`.

Testen (`npm run dev`, Reiter „Österreich“, nach unten scrollen):
1. Der Absatz hat 4–8 Sätze. In der Skizze stehen H und T dort, wo der Text sie nennt.
2. Andere Tage antippen: Text, Stichwort und Skizze wechseln sofort, ohne neues Laden.
3. Das Stichwort antippen: Das Lexikon öffnet sich beim passenden Begriff.
4. „Einzelheiten und Zahlen“ aufklappen: Begründung der Wetterlage, Strömung, weitere Einflüsse, Liste aller Hochs und Tiefs.
5. Am Handy: Die Skizze steht unter dem Text, nichts ragt seitlich hinaus.
6. Vergleich: im Reiter „Radar“ bei Windy den Luftdruck einblenden. Die Tiefs und Hochs sollten ungefähr an denselben Stellen liegen.

### Neue Ideen
Einfach beschreiben, z. B.: „Trag als Etappe 18 in die CLAUDE.md ein: …, und mach zuerst einen Plan.“ Jede Etappe bekommt am Ende einen Tag (`etappe-18`), zu dem man jederzeit zurück kann.

---

## Testen
**Am PC (einfachste Art):** Doppelklick auf **„Wetter-App starten.bat“** im Projektordner. Die App öffnet sich im Browser, das Fenster dazu liegt minimiert in der Taskleiste. Zum Beenden das Fenster „Wetter-App“ schließen.

Alternativ im Terminal:
```
npm run dev
```
Den angezeigten Link (meist http://localhost:5173) im Browser öffnen. Beenden mit `Strg + C`.

**Am Handy / unterwegs:** die Online-Version öffnen (siehe „Online mit Passwort“): https://h-wetter.github.io/WetterApp/ – nach dem Hochladen dauert es 1–2 Minuten, bis die neue Version da ist. Falls noch die alte erscheint: Seite neu laden.

**Automatische Tests:** `npm test` prüft die Rechenregeln (Inversion, Nebel, Stationswahl, Tagesverlauf, Warnungen, Modell-Check) in einer Sekunde. Sie laufen auch bei jedem Hochladen auf GitHub – schlägt einer fehl, bleibt die alte Online-Version stehen. Unter *Actions* sieht man dann ein rotes ✗.

## App aufs Handy legen
Die Online-Version lässt sich wie eine App auf den Startbildschirm legen – mit eigenem Symbol (Sonne und Wolke) und ohne Browserleiste:
- **iPhone (Safari):** Seite öffnen → Teilen-Knopf (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“**.
- **Android (Chrome):** Seite öffnen → Menü ⋮ → **„App installieren“** bzw. **„Zum Startbildschirm hinzufügen“**.

Beim ersten Öffnen über das Symbol fragt die App einmal nach dem Passwort („Angemeldet bleiben“ ankreuzen). Ein Neustart ist nicht nötig, neue Versionen kommen automatisch. Das Symbol selbst: `public/icon.svg`; nach einer Änderung `npm run icons` aufrufen (erzeugt die PNG-Bilder).

## Sichern (nach jeder funktionierenden Etappe)
Am Ende jeder Etappe fragt Claude, ob hochgeladen werden soll. Ein Klick auf **„Ja, hochladen“** erledigt alles in einem Schritt:
1. **Commit** mit passender Beschreibung (die Sicherung auf deinem PC),
2. **Markierung** der Etappe, z. B. `etappe-7` – ein Lesezeichen, zu dem man jederzeit zurück kann,
3. **Hochladen** zu GitHub – dadurch wird automatisch auch die Online-Version (mit Passwort) neu gebaut,
4. **Prüfung**, ob die Online-Version erfolgreich veröffentlicht wurde.

Ein zusätzliches „Mach einen Git-Commit“ ist danach **nicht nötig**. Sagst du es trotzdem, prüft Claude nur, ob noch etwas ungespeichert ist.

Alle Markierungen siehst du auf GitHub unter https://github.com/H-Wetter/WetterApp/tags.

## Wenn etwas nicht klappt
- **Fehlermeldung:** komplett kopieren und an Claude geben: „Dieser Fehler erscheint: …“
- **Sieht falsch aus:** beschreiben, was du siehst und was du erwartest. Screenshots helfen.
- **Ein Bereich zeigt „… konnte nicht angezeigt werden“:** Der Rest der App läuft weiter. „Erneut versuchen“ drücken; hilft das nicht, die technische Info an Claude geben.
- **Alles kaputt:** „Setze auf den letzten Commit zurück.“ oder „Geh zurück auf etappe-6.“ – genau dafür sind Commits und Markierungen da.
- **Claude verliert den Faden:** `/clear` eingeben und mit „Lies CLAUDE.md, wir sind bei Etappe X“ neu starten.

## Online mit Passwort (GitHub Pages + StatiCrypt)
Bei jedem Hochladen auf `main` baut GitHub die App als **eine** Datei, verschlüsselt sie mit dem Passwort und veröffentlicht nur die verschlüsselte Version.

**Passwort einmalig hinterlegen:** GitHub → dein Repository → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*
- Name: `STATICRYPT_PASSWORD`
- Wert: dein Passwort (mind. 16 Zeichen, z. B. 4–5 zufällige Wörter mit Bindestrichen)

**Pages einmalig einschalten:** *Settings* → *Pages* → *Source*: **GitHub Actions**

**Passwort ändern:** Secret überschreiben, dann unter *Actions* → „Veröffentlichen auf GitHub Pages“ → *Run workflow*.

**Lokal testen (optional):** In PowerShell `$env:STATICRYPT_PASSWORD = "dein-test-passwort"`, dann `npm run build` und `npm run encrypt`. Ergebnis liegt in `dist-encrypted/`.

Die Datei `.staticrypt.json` ist **nicht geheim** und gehört ins Repository (sonst funktioniert „Angemeldet bleiben“ nach jedem Hochladen nicht mehr).

## Windy-Schlüssel für die Webcams
Der Reiter **„Webcams“** sucht Webcams über die Windy Webcams API. Dafür braucht es einen kostenlosen Schlüssel. Ohne Schlüssel läuft die App trotzdem – der Reiter zeigt dann nur Such-Links zu foto-webcam.eu, bergfex und panomax. Die **Windy-Karte im Reiter „Radar“ braucht keinen Schlüssel.**

**Schlüssel anlegen:** https://api.windy.com/keys → anmelden → neuen Schlüssel für **„Webcams API“** erstellen. Andere Schlüsselarten (Map Forecast, Point Forecast, Plugins) braucht die App nicht.

Der Schlüssel muss an **zwei** Stellen hinterlegt werden:

**1. Auf deinem PC – Datei `.env`** (für `npm run dev` und „Wetter-App starten.bat“)
- Liegt im Projektordner neben `package.json`. Falls sie fehlt: `.env.example` kopieren und die Kopie in `.env` umbenennen.
- Zeile ausfüllen: `VITE_WINDY_API_KEY=dein-schlüssel` (ohne Anführungszeichen, ohne Leerzeichen).
- Danach die App neu starten – Vite liest `.env` nur beim Start.
- Die `.env` steht in `.gitignore` und kommt **nie** zu GitHub. In derselben Datei steht auch `STATICRYPT_PASSWORD` für das lokale Testen der Verschlüsselung.

**2. Für die Online-Version – GitHub-Secret `WINDY_API_KEY`**
- GitHub → dein Repository → *Settings* → *Secrets and variables* → *Actions* → *New repository secret* (bzw. bestehendes Secret bearbeiten)
- Name: `WINDY_API_KEY` (genau so, **ohne** `VITE_` davor – das ergänzt der Bau-Ablauf in `.github/workflows/deploy.yml` selbst)
- Wert: dein Schlüssel
- Damit es wirkt: unter *Actions* → „Veröffentlichen auf GitHub Pages“ → *Run workflow* (oder einfach beim nächsten Hochladen).

**Neuer Schlüssel nötig?** (z. B. abgelaufen oder versehentlich veröffentlicht) Auf api.windy.com einen neuen erstellen, an **beiden** Stellen eintragen und den alten dort löschen.

**Gut zu wissen:**
- Alles, was mit `VITE_` beginnt, landet im fertigen JavaScript. Der Schlüssel ist also im Browser sichtbar – auch in der Online-Version hinter dem Passwort, für alle, die das Passwort kennen. Er kostet nichts, darum ist das hier vertretbar.
- Bildlinks von Windy verfallen nach ca. 10–15 Minuten; die App fragt darum höchstens alle 10 Minuten neu.

## Tipps
- Lieber kleine, klare Aufträge als einen riesigen.
- Frag ruhig „Warum hast du das so gemacht?“ – so lernst du am meisten.
- Neue Ideen? Claude bitten, sie als neue Etappe in die CLAUDE.md einzutragen.
