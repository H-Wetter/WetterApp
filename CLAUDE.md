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
4. die **Großwetterlage** über Europa als Karte darstellt.

## Technik
- React + Vite + TypeScript
- Diagramme: Recharts
- Karte: Leaflet (react-leaflet), Isolinien: d3-contour
- Styling: einfaches CSS, mobilfreundlich
- Keine API-Schlüssel nötig für Open-Meteo. Keine Geheimnisse im Frontend-Code.

## Projektstruktur (Ziel)
```
src/
  api/          # alle API-Aufrufe (openMeteo.ts, ensemble.ts, airQuality.ts, geocoding.ts)
  lib/          # Berechnungen (Statistik, Inversion, Wolkenbasis, Texte)
  components/   # UI-Bausteine (Diagramme, Karten, Kacheln)
  pages/        # Lokal, Berg & Tal, Radar, Großwetterlage, Wetterlexikon
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

### Blitze live (optional, zuletzt)
- Blitzortung.org nur nach Prüfung der Nutzungsbedingungen. Sonst nur Gewitter-Prognose (CAPE, Wettercode 95–99).

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
9. **Großwetterlage:** Europa-Karte, Raster aus `pressure_msl` und `geopotential_height_500hPa`, Isolinien, Zeitschieber. Hinweis: Rasterabfragen sparsam (Tageslimit ca. 10.000 Aufrufe), Punkte bündeln, Ergebnis cachen.
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

## Qualität
- TypeScript streng, keine `any`.
- Fehler (kein Netz, Modell liefert nichts) freundlich anzeigen, App darf nicht abstürzen.
- Vor jedem Abschluss: `npm run build` muss fehlerfrei laufen.
