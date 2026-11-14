import { useEffect, useMemo, useState } from 'react'
import { friendlyError } from '../api/errors'
import { fetchAlpenDaten, fetchStaubDaten, loadEuropeGrid } from '../api/grosswetterlage'
import { ALPENPUNKTE } from '../data/alpenpunkte'
import { centerText, findPressureCenters, timeIndexForDay } from '../lib/druckgebilde'
import { analyseGewitter, analyseHoehengrenze, analyseStaub, analyseSturm, gewitterText, hoehengrenzeText, staubText, sturmText } from '../lib/einfluesse'
import { LAGE_LEXIKON, einschaetzungSicherheit, erkenneWetterlagen, findeItalientief, kennzahlen } from '../lib/grosswetterlage'
import { grosswetterlageAbsatz } from '../lib/grosswetterlageText'
import { analyseLuftmasse, analyseStroemung, findeFront, frontText, luftmasseText, stroemungText } from '../lib/stroemung'
import type { AlpenDaten, EuropeGrid, StaubDaten } from '../types/grosswetterlage'
import { ErrorMessage } from './ErrorMessage'
import { EuropaSkizze } from './EuropaSkizze'
import { LinkedText, Term } from './LexikonLink'
import { Loading } from './Loading'

/** Orte in Österreich (ohne Bozen): für den Saharastaub */
const INLAND = ALPENPUNKTE.filter((p) => p.inOesterreich)

type Loaded<T> = { key: number; data?: T; error?: string; /** Zeitpunkt des Ladens (ms) */ at?: number }

/** Echte UTC-Zeit als Uhrzeit in Österreich, z. B. „Fr., 13.11., 13 Uhr“ */
function formatViennaTime(ms: number): string {
  const text = new Intl.DateTimeFormat('de-AT', { timeZone: 'Europe/Vienna', weekday: 'short', day: 'numeric', month: 'numeric', hour: 'numeric' }).format(ms)
  return text.includes('Uhr') ? text : `${text} Uhr`
}

/**
 * Großwetterlage im Reiter „Österreich“ (Etappe 18): ein Absatz in Worten, die erkannte Wetterlage als
 * Stichwort mit Link ins Lexikon, ein Hinweis zur Sicherheit und eine Europa-Skizze mit Hochs und Tiefs.
 * Unter „Einzelheiten und Zahlen“ steht, woraus die App das abgeleitet hat.
 *
 * Drei Abrufe (alle 1 Stunde gemerkt): Europa-Raster, Alpenpunkte, Saharastaub. Fehlt einer, zeigt die Karte den Rest.
 * @param dayStart Mitternacht des gewählten Tages (wie in der Tagesauswahl)
 * @param tageVoraus 0 = heute
 */
export function GrosswetterlageCard({ dayStart, tageVoraus }: { dayStart: number; tageVoraus: number }) {
  const [reload, setReload] = useState(0)
  const [gridResult, setGridResult] = useState<Loaded<EuropeGrid> | null>(null)
  const [alpenResult, setAlpenResult] = useState<Loaded<AlpenDaten> | null>(null)
  const [staub, setStaub] = useState<StaubDaten | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const alive = () => !controller.signal.aborted
    loadEuropeGrid()
      .then((data) => alive() && setGridResult({ key: reload, data }))
      .catch((err: unknown) => alive() && setGridResult({ key: reload, error: friendlyError(err) }))
    fetchAlpenDaten(ALPENPUNKTE, controller.signal)
      .then((data) => alive() && setAlpenResult({ key: reload, data, at: Date.now() }))
      .catch((err: unknown) => alive() && setAlpenResult({ key: reload, error: friendlyError(err) }))
    // Scheitert der Staub-Abruf, fehlt nur der Staub-Satz: keine eigene Fehlermeldung.
    fetchStaubDaten(INLAND, controller.signal)
      .then((data) => alive() && setStaub(data))
      .catch(() => undefined)
    return () => controller.abort()
  }, [reload])

  const gridNow = gridResult && gridResult.key === reload ? gridResult : null
  const alpenNow = alpenResult && alpenResult.key === reload ? alpenResult : null
  const grid = gridNow?.data ?? null
  const alpen = alpenNow?.data ?? null
  const loading = !gridNow || !alpenNow
  const errors = [gridNow?.error, alpenNow?.error].filter((e): e is string => !!e)

  const timeIndex = grid ? timeIndexForDay(grid.times, dayStart) : -1
  const centers = useMemo(() => (grid && timeIndex >= 0 ? findPressureCenters(grid, timeIndex) : []), [grid, timeIndex])

  // Alles, was aus den Daten folgt, an einer Stelle berechnen
  const lage = useMemo(() => {
    const k = alpen ? kennzahlen(alpen, ALPENPUNKTE, dayStart) : null
    return {
      lagen: k ? erkenneWetterlagen(k, centers, grid ? findeItalientief(grid, dayStart) : null) : null,
      sicherheit: alpen ? einschaetzungSicherheit(alpen, ALPENPUNKTE, dayStart, centers, tageVoraus) : null,
      stroemung: alpen ? analyseStroemung(alpen, ALPENPUNKTE, dayStart) : null,
      luftmasse: alpen ? analyseLuftmasse(alpen, ALPENPUNKTE, dayStart) : null,
      front: alpen ? findeFront(alpen, ALPENPUNKTE, dayStart) : null,
      sturm: grid ? analyseSturm(grid, dayStart) : null,
      grenzeNord: alpen ? analyseHoehengrenze(alpen, ALPENPUNKTE, 'nord', dayStart) : null,
      grenzeSued: alpen ? analyseHoehengrenze(alpen, ALPENPUNKTE, 'sued', dayStart) : null,
      gewitter: alpen ? analyseGewitter(alpen, dayStart) : null,
      staub: staub ? analyseStaub(staub, INLAND, dayStart) : null,
    }
  }, [alpen, grid, staub, centers, dayStart, tageVoraus])

  // Uhrzeit des Ladens: Fronten davor stehen im Text in der Vergangenheit („ist durchgezogen“)
  const now = alpenNow?.at
  const hasData = (grid && timeIndex >= 0) || lage.lagen !== null
  const absatz = useMemo(() => (hasData ? grosswetterlageAbsatz({ centers, ...lage, now }) : []), [hasData, centers, lage, now])
  const vbWarnung = lage.lagen?.some((l) => l.warnung) ?? false
  const grenze = hoehengrenzeText(lage.grenzeNord, lage.grenzeSued)

  return (
    <section className="card gwl">
      <h2>Großwetterlage</h2>
      {loading && <Loading small>Luftdruck, Höhenwind und Temperatur über Europa werden geladen …</Loading>}
      {errors.map((message) => (
        <ErrorMessage key={message} message={message} onRetry={() => setReload((r) => r + 1)} />
      ))}
      {!loading && !hasData && errors.length === 0 && <p className="muted">Für diesen Tag gibt es keine Daten zur Großwetterlage.</p>}

      {hasData && (
        <div className="gwl-haupt">
          <div>
            <p className="gwl-absatz">
              <LinkedText text={absatz.join(' ')} />
            </p>
            {lage.lagen && (
              <p className="gwl-stichwort">
                <span className="muted">Wetterlage:</span>{' '}
                {lage.lagen.length === 0 && <span>keine eindeutige</span>}
                {lage.lagen.map((l) => (
                  <span key={l.id} className="gwl-chip">
                    <Term id={LAGE_LEXIKON[l.id]}>{l.name}</Term>
                  </span>
                ))}
                {vbWarnung && (
                  <span className="gwl-chip warnung">
                    <Term id="vb-lage">Vb-Lage möglich</Term>
                  </span>
                )}
              </p>
            )}
            {lage.sicherheit && <p className="small gwl-sicherheit">{lage.sicherheit.text}</p>}
          </div>
          {grid && timeIndex >= 0 && <EuropaSkizze centers={centers} />}
        </div>
      )}

      {hasData && (
        <details className="gwl-details">
          <summary>Einzelheiten und Zahlen</summary>
          {lage.lagen && lage.lagen.length > 0 && (
            <>
              <h3>Woran die Wetterlage erkannt wurde</h3>
              <ul className="gwl-gruende">
                {lage.lagen.map((l) => (
                  <li key={l.id}>
                    <strong>{l.name}:</strong> {l.gruende.join(', ')}
                  </li>
                ))}
              </ul>
            </>
          )}
          {(lage.stroemung || lage.luftmasse) && (
            <>
              <h3>Strömung und Luftmasse über Österreich</h3>
              {lage.stroemung && <p>{stroemungText(lage.stroemung)}</p>}
              {lage.luftmasse && <p>{luftmasseText(lage.luftmasse)}</p>}
              {lage.front && <p>{frontText(lage.front, now)}</p>}
            </>
          )}
          <h3>Weitere Einflüsse</h3>
          {lage.sturm && <p>{sturmText(lage.sturm)}</p>}
          {grenze && <p>{grenze}</p>}
          {lage.gewitter && <p>{gewitterText(lage.gewitter)}</p>}
          <p>
            {lage.staub
              ? staubText(lage.staub)
              : staub
                ? 'Zum Saharastaub gibt es für diesen Tag noch keine Vorhersage (sie reicht etwa 5 Tage).'
                : 'Zum Saharastaub liegen gerade keine Daten vor.'}
          </p>
          {grid && timeIndex >= 0 && (
            <>
              <h3>Hochs und Tiefs über Europa</h3>
              <p className="muted small">{formatViennaTime(grid.times[timeIndex])}. Das Nächstgelegene steht zuerst.</p>
              {centers.length === 0 ? (
                <p>Kein ausgeprägtes Hoch oder Tief über Europa, der Luftdruck ist überall ähnlich.</p>
              ) : (
                <ul className="gwl-list">
                  {centers.map((c) => (
                    <li key={`${c.kind}-${c.lat}-${c.lon}`}>
                      <span className={c.kind === 'T' ? 'gwl-mark tief' : 'gwl-mark hoch'} aria-hidden="true">
                        {c.kind}
                      </span>
                      <span>
                        {centerText(c)}
                        {c.amRand && <span className="muted small"> (am Rand des Ausschnitts, der Kern kann weiter draußen liegen)</span>}
                      </span>
                      <span className="muted small gwl-dist">{Math.round(c.distanzKm / 50) * 50} km</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="muted small">
            Hochs, Tiefs und Sturm: Luftdruck auf Meereshöhe aus dem Modell ECMWF (Raster alle 2,5°, der Kerndruck ist ein Richtwert). Strömung,
            Luftmasse, Wetterlage, Nullgradgrenze und Gewitter: Mittel aus ECMWF, ICON und GFS an 8 Orten im Alpenraum. Saharastaub: Copernicus
            CAMS. Alle Daten über Open-Meteo. Die Namen der Hochs und Tiefs (FU Berlin) sind nicht frei nutzbar und fehlen deshalb.
          </p>
        </details>
      )}
    </section>
  )
}
