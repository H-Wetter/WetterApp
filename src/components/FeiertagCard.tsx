import type { Feiertag } from '../data/feiertage'
import type { Kalendertag } from '../lib/bauernregeln'
import { KONFESSION_TEXT, abstandText, datumKurz, naechsteFeiertage } from '../lib/feiertage'

/**
 * Karte „Feiertage“ auf „Lokal“: das Fest von heute bzw. das nächste mit Bedeutung zum Aufklappen,
 * darunter die folgenden Termine. Gesetzliche Feiertage in Österreich sind markiert.
 */
export function FeiertagCard({ heute }: { heute: Kalendertag }) {
  const termine = naechsteFeiertage(heute, 4, 60)
  if (termine.length === 0) return null
  const [erster, ...weitere] = termine

  return (
    <section className="card feiertag">
      <h2 className="feiertag-title">
        {erster.inTagen === 0 ? 'Heute' : 'Nächster Feiertag'}
        <span className="muted small">
          {' '}
          · {datumKurz(erster.datum)}
          {erster.inTagen > 0 && ` (${abstandText(erster.inTagen)})`}
        </span>
      </h2>
      {erster.feste.map((f) => (
        <Fest key={f.id} fest={f} />
      ))}
      {weitere.length > 0 && (
        <ul className="feiertag-weitere small">
          {weitere.map((t) => (
            <li key={`${t.datum.monat}-${t.datum.tag}`}>
              <details className="feiertag-mini">
                <summary>
                  <span className="muted">
                    {datumKurz(t.datum)} ({abstandText(t.inTagen)}):
                  </span>{' '}
                  {t.feste.map((f, i) => (
                    <span key={f.id}>
                      {i > 0 && ', '}
                      {f.name}
                      {f.gesetzlich && <span className="feiertag-frei"> (gesetzlicher Feiertag)</span>}
                    </span>
                  ))}
                </summary>
                {t.feste.map((f) => (
                  <p key={f.id}>
                    <strong>{f.name}</strong> <span className="muted">({KONFESSION_TEXT[f.konfession]})</span>: {f.kurz} {f.bedeutung}
                  </p>
                ))}
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Fest({ fest }: { fest: Feiertag }) {
  return (
    <div className="feiertag-fest">
      <p className="feiertag-name">
        <strong>{fest.name}</strong>
        <span className={`feiertag-konf ${fest.konfession}`}>{KONFESSION_TEXT[fest.konfession]}</span>
        {fest.gesetzlich && <span className="feiertag-konf frei">gesetzlicher Feiertag</span>}
      </p>
      <p className="small">{fest.kurz}</p>
      <details className="feiertag-details">
        <summary>Bedeutung</summary>
        <p className="small">{fest.bedeutung}</p>
      </details>
    </div>
  )
}
