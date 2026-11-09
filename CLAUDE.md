# Wetter-App – Projektleitfaden für Claude Code

## Über mich & Arbeitsweise
- Ich bin Anfänger in der Programmierung. Erkläre kurz, was du tust und warum, in einfachem Deutsch.
- Arbeite in kleinen Schritten. Nach jedem Schritt muss die App lauffähig sein (`npm run dev`).
- Frag mich, bevor du neue Abhängigkeiten installierst oder größere Umbauten machst.
- Nach jeder fertigen Etappe: kurze Zusammenfassung + Vorschlag für einen Git-Commit.
- Standort-Standard für Tests: Graz (47.07, 15.44, ca. 350 m). Bergpunkt: Schöckl (47.20, 15.47, 1445 m).

## Ziel
Eine Web-App, die
1. das lokale Wetter am Standort aus **möglichst vielen Wettermodellen** vergleicht,
2. Wolken nach Höhe, Niederschlag/Schnee, Wind, Gewitter und Umweltdaten (Pollen, Feinstaub, UV) zeigt,
3. den Tag **in Tallagen und in den Bergen** in Worten beschreibt (inkl. Inversions-/Hochnebel-Erkennung),
4. ~~die Großwetterlage über Europa als Karte darstellt~~ – am 09.11.2026 wieder entfernt; Radar und Karten kommen von der eingebetteten Windy-Karte.

## Technik
- React + Vite + TypeScript
- Diagramme: Recharts
- Karte: Leaflet (react-leaflet) für Gelände/Webcams; Radar & Wetterkarten über die eingebettete Windy-Karte
- Styling: einfaches CSS, mobilfreundlich
- Keine API-Schlüssel nötig für Open-Meteo. Keine Geheimnisse im Frontend-Code.
- Ausnahme Windy-Webcams: Schlüssel nur über `.env` (nicht im Git); er ist im fertigen Frontend trotzdem sichtbar (siehe Datenquellen).

## Projektstruktur (Ziel)
```
src/
  api/          # alle API-Aufrufe (openMeteo.ts, ensemble.ts, airQuality.ts, geocoding.ts, webcams.ts)
  lib/          # Berechnungen (Statistik, Inversion, Wolkenbasis, Texte)
  components/   # UI-Bausteine (Diagramme, Karten, Kacheln)
  pages/        # Lokal, Berg & Tal, Webcams, Radar (Windy), Wetterlexikon
  data/         # feste Texte, z. B. lexikon.ts (Wetterlexikon)
  types/        # TypeScript-Typen
```
API-Aufrufe nur in `src/api/`, Berechnungen nur in `src/lib/` – nie direkt in Komponenten.

## Datenquellen (alle kostenlos, nichtkommerziell)
**Wichtig:** Parameter- und Modellnamen vor Verwendung in der offiziellen Doku prüfen (https://open-meteo.com/en/docs), da sie sich ändern können.

### Vorhersage – `https://api.open-meteo.com/v1/forecast`
- Multi-Modell über `models=` (kommagetrennt). Bei mehreren Modellen bekommen die Felder ein Suffix, z. B. `temperature_2m_icon_seamless`.
- Kandidaten: `icon_seamless, icon_d2, ecmwf_ifs025, ecmwf_aifs025, gfs_seamless, gem_seamless, meteofrance_seamless, ukmo_seamless, knmi_seamless, dmi_seamless, metno_seamless, jma_seamless`
- `forecast_days` max. 16. Modelle mit kürzerer Reichweite liefern danach `null` → im Diagramm sauber auslaufen lassen.
- `timezone=auto`
- Stündliche Variablen:
  - Basis: `temperature_2m, dew_point_2m, relative_humidity_2m, weather_code, visibility`
  - Niederschlag: `precipitation, rain, showers, snowfall, snow_depth, freezing_level_height`
  - Wolken: `cloud_cover, cloud_cover_low, cloud_cover_mid, cloud_cover_high`
  - Wolken/Wind nach Höhe: `cloud_cover_{1000,925,850,700,500,300}hPa`, `wind_speed_…hPa`, `wind_direction_…hPa`, `temperature_…hPa`
  - Wind: `wind_speed_10m, wind_direction_10m, wind_gusts_10m`
  - Gewitter: `cape, lifted_index`, ggf. `lightning_potential` (nur ICON-D2)
- Höhenkorrektur: Parameter `elevation` (für Bergpunkte).

### Ensemble – `https://ensemble-api.open-meteo.com/v1/ensemble`
- Für Tag 8–16: Mittelwert, Min/Max bzw. 10./90. Perzentil über alle Member.

### Luftqualität & Pollen – `https://air-quality-api.open-meteo.com/v1/air-quality`
- `pm10, pm2_5, ozone, dust, uv_index, alder_pollen, birch_pollen, grass_pollen, mugwort_pollen, olive_pollen, ragweed_pollen` (Pollen nur Europa, saisonal).

### Geländehöhe – `https://api.open-meteo.com/v1/elevation?latitude=…&longitude=…`
- Höhenmodell mit 90 m Auflösung, bis 100 Punkte pro Anfrage. **Jeder Punkt zählt als ein Aufruf** (Minutenlimit 600!) → Raster grob anlegen, Ergebnis dauerhaft cachen (Gelände ändert sich nicht).

### Ortssuche – `https://geocoding-api.open-meteo.com/v1/search?name=…&language=de`
Plus Browser-Geolocation (`navigator.geolocation`) mit Fallback auf Graz.

### Webcams – Windy Webcams API v3 `https://api.windy.com/webcams/api/v3/webcams`
- Suche: `nearby=lat,lon,radius_km`, `limit` (max. 50), `include=images,location,urls,player`, `lang=de`.
- API-Schlüssel nötig (kostenlos, https://api.windy.com/keys), Header `x-windy-api-key`. Nur über `.env` (`VITE_WINDY_API_KEY`), `.env` nie ins Git.
- Achtung: Alles mit `VITE_` landet im öffentlichen JavaScript → Schlüssel ist im Browser sichtbar.
- Bildlinks verfallen (Free: ca. 10–15 Min.) → nicht dauerhaft speichern, Cache max. 10 Min.
- Bedingungen: Quellenangabe „Webcams provided by Windy.com“ mit Link, Bilder nur Originalgröße oder kleiner, jedes Bild verlinkt auf die Webcam-Seite (`urls.detail`) oder den Player.
- Liefert **keine Höhe** → Höhe über die Open-Meteo Elevation API ergänzen (dauerhaft cachen).

### Windy-Karte (eingebettet) – `https://embed.windy.com/embed.html`
- Kostenlos, ohne Schlüssel, als iframe im Reiter „Radar“ – seit 09.11.2026 der einzige Inhalt dort (das eigene RainViewer-Radar wurde entfernt). Windy-Logo muss sichtbar bleiben, nur private Nutzung.
- Ebenen (`overlay`/`product`): `radar/radar`, `satellite/satellite`, sonst Modell `ecmwf`: `rain, wind, gust, temp, clouds, snowAccu, cape` (am 09.11.2026 getestet).
- Liste und Adresse in `src/lib/windyMap.ts`.

### Messwerte – GeoSphere Austria Data Hub `https://dataset.api.hub.geosphere.at/v1`
- Stationsmessungen (TAWES) alle 10 Min.: `/station/current/tawes-v1-10min?parameters=TL,RF,…&station_ids=11240,11241` (mehrere Stationen in EINEM Abruf, Antwort GeoJSON).
- Stationsliste mit Koordinaten/Höhe: `/station/current/tawes-v1-10min/metadata` (≈ 290 Stationen, nur Österreich).
- Kein Schlüssel, CORS erlaubt. Limit **5 Abrufe/Sekunde, 240/Stunde** → Messwerte 10 Min., Stationsliste 7 Tage cachen.
- Wichtige Parameter: `TL` Temperatur °C, `RF` Feuchte %, `TP` Taupunkt, `FF`/`FFX` Wind/Spitze **m/s**, `DD` Richtung, `RR` Niederschlag 10 Min. mm, `SO` Sonne s, `SCHNEE` cm, `P` Luftdruck.
- Stationen liefern manchmal keine Daten (fehlen dann in der Antwort) → nächste Station nehmen.
- Lizenz CC BY 4.0 → Quellenangabe „Datenquelle: GeoSphere Austria“ sichtbar.
- Beispiel-IDs: Graz-Thalerhof 11240 (340 m), Graz/Straßgang 11238, Graz Universität 11290, Schöckl 11241 (1443 m).
- Aufruf in `src/api/geosphere.ts`, Stationswahl in `src/lib/stations.ts`.

### Blitze live (optional, zuletzt)
- Blitzortung.org nur nach Prüfung der Nutzungsbedingungen. Sonst nur Gewitter-Prognose (CAPE, Wettercode 95–99).
- **Geprüft am 09.11.2026:** Keine offene Schnittstelle für fremde Apps; Rohdaten nur für Stationsbetreiber oder nach Einzelfreigabe durch das Projekt. → Keine Live-Blitzdaten in der App, nur ein Link zur öffentlichen Karte `https://map.blitzortung.org/#Zoom/Breite/Länge` im Reiter „Radar“ (`src/lib/radar.ts`).

## Fachliche Regeln
- **Modellstatistik:** pro Stunde Mittelwert, Median, Min/Max über alle verfügbaren Modelle; `null` ignorieren.
- **Prognosehorizont:** Tag 1–3 hochauflösend (ICON-D2, AROME), Tag 1–7 Modellvergleich, Tag 8–16 nur Ensemble-Trend.
- **Wolkenbasis (Schätzung):** Höhe ≈ 125 m × (T − Td) über Grund.
- **Wolkenschichten:** tief < ca. 2 km, mittel 2–6 km, hoch > 6 km.
- **Inversion:** wenn die Temperatur im Profil der Druckniveaus 1000–850 hPa am Standort nach oben zunimmt (oben wärmer als unten) → Hinweis „Inversion, Hochnebel/Nebel im Tal möglich, oben sonnig/mild“, mit geschätzter Nebelobergrenze (siehe Etappe 5).
- **Gewitter-Hinweis:** CAPE > 500 J/kg leicht, > 1000 deutlich, > 2000 kräftig; zusammen mit Wettercode prüfen.
- **Wetterbeschreibung:** zuerst regelbasiert (Textbausteine aus Zahlen). Später optional Claude API – dann nur über ein kleines Backend, nie mit API-Schlüssel im Frontend (kostet Geld!).
- **Modellunsicherheit** immer sichtbar machen (Streuung), nie nur eine Zahl.

## Fahrplan (Etappen)
1. **Grundgerüst:** Vite-Projekt, Seite „Lokal“, Standort + Ortssuche.
2. **Modellvergleich:** 7-Tage-Temperatur/Niederschlag/Wind, eine Linie pro Modell + Mittelwert + Streuband.
3. **Wetter-Kacheln:** heute/morgen kompakt (Symbol aus `weather_code`, Max/Min, Regen, Wind, Böen).
4. **Wolkenschnitt:** Höhen-Zeit-Diagramm aus `cloud_cover_…hPa`, Wolkenbasis, Zugrichtung.
5. **Berg & Tal:** Berg und Tal automatisch finden, Vergleich, Inversionserkennung, Textbeschreibung für beide Lagen.
   - **Berg:** höchster Punkt im Umkreis des Standorts, ermittelt über die Open-Meteo Elevation API (Raster im Umkreis). Umkreis Standard 15 km, einstellbar 5–30 km. Mindest-Höhendifferenz zum Tal 300 m – sonst Hinweis „kein Berg im Umkreis“.
   - **Tal:** der Standort selbst bzw. der tiefste Punkt im Umkreis von 5 km.
   - **Inversionserkennung NICHT über den `elevation`-Parameter** (der rechnet nur mit Standard-Temperaturabnahme um), sondern über das Temperaturprofil der Druckniveaus 1000–850 hPa am Standort.
   - **Nebelobergrenze:** aus der Luftfeuchte der Druckniveaus abschätzen (feuchte Schicht unter der Inversion).
6. **Warnungen:** Gewitter (CAPE/Lifted Index), Sturmböen, Schneefall, Nullgradgrenze.
7. **Umwelt:** Pollen, Feinstaub, UV, Saharastaub.
8. **Ensemble 8–16 Tage:** Trend mit Unsicherheitsband.
9. ~~**Großwetterlage:** Europa-Karte mit Isobaren und 500-hPa-Höhe~~ – gebaut (Tag `etappe-9`), am 09.11.2026 auf Wunsch wieder entfernt, ebenso das eigene RainViewer-Radar. Der Code ist über den Tag `etappe-9` bzw. die Git-Geschichte wiederherstellbar.
10. **Wetterlexikon:** eigener Reiter „Wetterlexikon“, gleichrangig mit „Lokal“ und „Berg & Tal“.
    - Erklärt Wetterbegriffe einfach und verständlich für Laien. Je Begriff: kurze Erklärung (2–4 Sätze), woran man es in der App erkennt, wenn sinnvoll eine kleine Skizze oder ein Beispiel.
    - Begriffe zum Start: Inversion, Hochnebel, Nullgradgrenze, Schneefallgrenze, Föhn, CAPE / Gewitterneigung, Lifted Index, Böen, Taupunkt, Wolkenbasis, tiefe/mittlere/hohe Wolken, Ensemble, Modellstreuung, Hoch- und Tiefdruckgebiet, Trog, Kaltfront, Warmfront, Okklusion.
    - Mit Suchfeld.
    - Verknüpfung: Wo ein Begriff in der App vorkommt (z. B. „Inversion“ bei Berg & Tal), ist er antippbar und springt direkt zur Erklärung im Lexikon.
    - Texte in einer eigenen Datei `src/data/lexikon.ts`, damit sie leicht ergänzt werden können.
11. **Textueller Tagesverlauf:** für den gewählten Tag eine Beschreibung in vier Abschnitten: Vormittag (6–11 Uhr), Mittag (11–14 Uhr), Nachmittag (14–18 Uhr), Abend (18–22 Uhr).
    - Je Abschnitt 1–3 Sätze: Bewölkung, Niederschlag (Regen/Schnee), Temperatur, Wind/Böen, Gewitterrisiko, Nebel/Hochnebel.
    - Grundlage ist der Mittelwert aller Modelle. Bei großer Streuung steht das im Text, z. B. „Die Modelle sind sich beim Regen am Nachmittag uneinig.“
    - Bei erkannter Inversion Tal und Berg getrennt beschreiben.
    - Regelbasiert aus Textbausteinen, ohne Claude API.
    - Regeln und Schwellenwerte in `src/lib/tagesverlauf.ts`, verständlich kommentiert.
    - Abwechslungsreiche Formulierungen, damit sich die Texte nicht jeden Tag gleich lesen.
12. **Feinschliff:** Mobil-Layout, Ladeanzeigen, Fehlermeldungen, Caching (z. B. 30 Min).
13. **Webcams:** Webcams zum aktuellen bzw. gesuchten Standort.
    - Eigener Reiter „Webcams“ (gleichrangig mit „Lokal“ und „Berg & Tal“).
    - Umkreis Standard 15 km, einstellbar 5–50 km, sortiert nach Entfernung.
    - Je Webcam: Name, Ort, Höhe (falls verfügbar), Entfernung, Vorschaubild (nur wie erlaubt eingebunden) und Link, der in einem neuen Tab öffnet.
    - Getrennt nach **Tallage** und **Berglage** (Berglage = mind. 300 m über dem Tal, wie bei Etappe 5), damit man z. B. Hochnebel unten und Sonne oben direkt vergleichen kann. Bei erkannter Inversion ein Hinweis dazu.
    - Datenquelle Windy Webcams API (siehe Datenquellen), Aufruf in `src/api/webcams.ts`, Ergebnis ca. 10 Minuten cachen. Entfernung/Einteilung in `src/lib/webcams.ts`.
    - Fallback, wenn die API nichts liefert oder kein Schlüssel da ist: feste Such-Links mit dem Ortsnamen zu foto-webcam.eu, bergfex und panomax.
    - Keine fremden Bilder speichern oder kopieren – nur einbinden bzw. verlinken. Quellenangabe Windy sichtbar.
    - Freundliche Meldung, wenn keine Webcams gefunden werden.
    - Zusatz: Im Reiter „Radar“ eine eingebettete Windy-Karte mit Knöpfen für Radar, Satellit, Regen, Wind, Böen, Temperatur, Wolken, Neuschnee und Gewitter (CAPE).
14. **Jetzt gemessen (GeoSphere Austria):** echte Stationswerte als „Ist-Zustand“ neben der Vorhersage (nur Österreich).
    - **14a:** Karte „Jetzt gemessen“ auf „Lokal“: nächste Station (ähnliche Höhe, Ersatz falls eine schweigt), Temperatur, Feuchte, Taupunkt, Wind/Böen, Niederschlag, Schnee, Uhrzeit; daneben der Modell-Mittelwert dieser Stunde. Keine Station im Umkreis von ca. 25 km → freundlicher Hinweis.
    - **14b:** Berg & Tal: Tal- und Bergstation (nahe beim gefundenen Berg, mind. 300 m höher) nebeneinander, „Inversion gemessen“, wenn oben wärmer.
    - **14c:** Nebel aus Messwerten: misst **eine der nahen Talstationen** (bis 15 km, ähnliche Höhe) ≥ 95 % Feuchte → „Nebel wahrscheinlich“ mit Stationsname in Hinweis und Tagesverlauf (nächste 3 Stunden), Lexikon-Eintrag „Messstation“. Grund: Nebel liegt oft nur in Teilen eines Beckens (09.11.2026: Thalerhof 98 %, Straßgang 90 %).

## Qualität
- TypeScript streng, keine `any`.
- Fehler (kein Netz, Modell liefert nichts) freundlich anzeigen, App darf nicht abstürzen.
- Vor jedem Abschluss: `npm run build` muss fehlerfrei laufen.
