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

### Etappe 9 – Großwetterlage
> Setze Etappe 9 um. Mach zuerst einen Plan, wie viele API-Aufrufe das Raster braucht und wie wir cachen, und zeig ihn mir, bevor du baust.

### Etappe 10 – Feinschliff
> Setze Etappe 10 um und prüfe am Ende, dass `npm run build` fehlerfrei läuft.

---

## Testen
**Am PC (einfachste Art):** Doppelklick auf **„Wetter-App starten.bat“** im Projektordner. Die App öffnet sich im Browser, das Fenster dazu liegt minimiert in der Taskleiste. Zum Beenden das Fenster „Wetter-App“ schließen.

Alternativ im Terminal:
```
npm run dev
```
Den angezeigten Link (meist http://localhost:5173) im Browser öffnen. Beenden mit `Strg + C`.

**Am Handy / unterwegs:** die Online-Version öffnen (siehe „Online mit Passwort“): https://h-wetter.github.io/WetterApp/ – nach dem Hochladen dauert es 1–2 Minuten, bis die neue Version da ist. Falls noch die alte erscheint: Seite neu laden.

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

## Tipps
- Lieber kleine, klare Aufträge als einen riesigen.
- Frag ruhig „Warum hast du das so gemacht?“ – so lernst du am meisten.
- Neue Ideen? Claude bitten, sie als neue Etappe in die CLAUDE.md einzutragen.
