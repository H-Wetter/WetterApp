import type { PeriodText } from '../lib/tagesverlauf'
import { LinkedText, Term } from './LexikonLink'

interface Props {
  periods: PeriodText[]
  /** aktuelle Ortszeit (wie MultiModelForecast.times) – vergangene Abschnitte werden blasser */
  now: number
  /** Namen für Tal und Berg (nur bei Inversion sichtbar) */
  valleyName?: string
  mountainName?: string
}

function Sentences({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((s) => (
        <p key={s}>
          <LinkedText text={s} />
        </p>
      ))}
    </>
  )
}

/** Textueller Tagesverlauf: Vormittag, Mittag, Nachmittag, Abend in Worten. */
export function DayCourse({ periods, now, valleyName = 'Tal', mountainName = 'Berg' }: Props) {
  return (
    <section className="day-course" aria-label="Tagesverlauf in Worten">
      <h3>Tagesverlauf</h3>
      <div className="course-grid">
        {periods.map((p) => {
          const past = p.end <= now
          return (
            <article key={p.key} className={past ? 'course-period past' : 'course-period'}>
              <h4>
                {p.label} <span className="muted small">{p.hours}</span>
                {past && <span className="muted small"> · vorbei</span>}
                {p.inversion && (
                  <span className="course-tag">
                    <Term id="inversion">Inversion</Term>
                  </span>
                )}
              </h4>
              {p.mountain ? (
                <>
                  <div className="course-place">
                    <strong>
                      <span className="swatch vm-valley" /> {valleyName}
                    </strong>
                    <Sentences lines={p.valley} />
                  </div>
                  <div className="course-place">
                    <strong>
                      <span className="swatch vm-mountain" /> {mountainName}
                    </strong>
                    <Sentences lines={p.mountain} />
                  </div>
                </>
              ) : (
                <Sentences lines={p.valley} />
              )}
            </article>
          )
        })}
      </div>
      <p className="muted small">
        Mittelwert aller Modelle, in Worten gefasst. Sind sich die Modelle uneinig, steht das dabei.
      </p>
    </section>
  )
}
