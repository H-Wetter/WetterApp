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
  pages/        # Lokal, Berge, Großwetterlage
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

### Ortssuche – `https://geocoding-api.open-meteo.com/v1/search?name=…&language=de`
Plus Browser-Geolocation (`navigator.geolocation`) mit Fallback auf Graz.

### Blitze live (optional, zuletzt)
- Blitzortung.org nur nach Prüfung der Nutzungsbedingungen. Sonst nur Gewitter-Prognose (CAPE, Wettercode 95–99).

## Fachliche Regeln
- **Modellstatistik:** pro Stunde Mittelwert, Median, Min/Max über alle verfügbaren Modelle; `null` ignorieren.
- **Prognosehorizont:** Tag 1–3 hochauflösend (ICON-D2, AROME), Tag 1–7 Modellvergleich, Tag 8–16 nur Ensemble-Trend.
- **Wolkenbasis (Schätzung):** Höhe ≈ 125 m × (T − Td) über Grund.
- **Wolkenschichten:** tief < ca. 2 km, mittel 2–6 km, hoch > 6 km.
- **Inversion:** wenn Temperatur am Bergpunkt höher als im Tal (oder T850 > T2m bei Tallage) → Hinweis „Inversion, Hochnebel/Nebel im Tal möglich, oben sonnig/mild“.
- **Gewitter-Hinweis:** CAPE > 500 J/kg leicht, > 1000 deutlich, > 2000 kräftig; zusammen mit Wettercode prüfen.
- **Wetterbeschreibung:** zuerst regelbasiert (Textbausteine aus Zahlen). Später optional Claude API – dann nur über ein kleines Backend, nie mit API-Schlüssel im Frontend (kostet Geld!).
- **Modellunsicherheit** immer sichtbar machen (Streuung), nie nur eine Zahl.

## Fahrplan (Etappen)
1. **Grundgerüst:** Vite-Projekt, Seite „Lokal“, Standort + Ortssuche.
2. **Modellvergleich:** 7-Tage-Temperatur/Niederschlag/Wind, eine Linie pro Modell + Mittelwert + Streuband.
3. **Wetter-Kacheln:** heute/morgen kompakt (Symbol aus `weather_code`, Max/Min, Regen, Wind, Böen).
4. **Wolkenschnitt:** Höhen-Zeit-Diagramm aus `cloud_cover_…hPa`, Wolkenbasis, Zugrichtung.
5. **Berg & Tal:** zweiter Punkt (Berg), Vergleich, Inversionserkennung, Textbeschreibung für beide Lagen.
6. **Warnungen:** Gewitter (CAPE/Lifted Index), Sturmböen, Schneefall, Nullgradgrenze.
7. **Umwelt:** Pollen, Feinstaub, UV, Saharastaub.
8. **Ensemble 8–16 Tage:** Trend mit Unsicherheitsband.
9. **Großwetterlage:** Europa-Karte, Raster aus `pressure_msl` und `geopotential_height_500hPa`, Isolinien, Zeitschieber. Hinweis: Rasterabfragen sparsam (Tageslimit ca. 10.000 Aufrufe), Punkte bündeln, Ergebnis cachen.
10. **Feinschliff:** Mobil-Layout, Ladeanzeigen, Fehlermeldungen, Caching (z. B. 30 Min).

## Qualität
- TypeScript streng, keine `any`.
- Fehler (kein Netz, Modell liefert nichts) freundlich anzeigen, App darf nicht abstürzen.
- Vor jedem Abschluss: `npm run build` muss fehlerfrei laufen.
