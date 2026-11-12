import { datumText, naechsterLostag, pruefeRegel, regelDesTages, type Kalendertag } from '../lib/bauernregeln'
import type { DaySummary } from '../lib/daily'
import type { Bauernregel, Grundlage } from '../types/bauernregel'
import { LinkedText, Term } from './LexikonLink'

const GRUNDLAGE: Record<Grundlage, string> = {
  ja: 'Meteorologisch begründet',
  teilweise: 'Teilweise begründet',
  nein: 'Reine Überlieferung',
}

interface Props {
  /** heutiger Tag (oder Testdatum aus der Adresse, z. B. ?datum=2026-11-11) */
  heute: Kalendertag
  /** Vorhersage-Tage für „Trifft die Regel heuer zu?“ */
  tage: DaySummary[]
  /** true, wenn ein Testdatum aus der Adresse verwendet wird */
  testdatum: boolean
}

/** Kleine Karte „Bauernregel des Tages“ auf „Lokal“ */
export function BauernregelCard({ heute, tage, testdatum }: Props) {
  const auswahl = regelDesTages(heute)
  const naechster = naechsterLostag(heute, 21)
  if (!auswahl) return null
  const { regel, lostag } = auswahl

  return (
    <section className="card bauernregel">
      <h2 className="bauernregel-title">
        Bauernregel des Tages
        <span className="muted small">
          {' '}
          {lostag ? (
            <>
              · heute ist <Term id="lostag">Lostag</Term>: {regel.lostag} ({datumText(regel)})
            </>
          ) : (
            `· Monatsregel ${datumText(regel)}`
          )}
        </span>
      </h2>
      {testdatum && (
        <p className="notice small">
          Testdatum aus der Adresse: {heute.tag}.{heute.monat}.{heute.jahr}. Die Wettervorhersage darunter bleibt die echte.
        </p>
      )}
      <RegelText regel={regel} />
      <Pruefung regel={regel} tage={tage} />
      <details className="bauernregel-details">
        <summary>Was steckt dahinter?</summary>
        <p className="small">
          <strong>{GRUNDLAGE[regel.grundlage]}.</strong> <LinkedText text={regel.hintergrund} />
        </p>
      </details>
      {naechster && (
        <p className="small muted">
          Nächster Lostag: <strong>{naechster.regel.lostag}</strong> am {naechster.datum.tag}.{naechster.datum.monat}.{' '}
          ({naechster.inTagen === 1 ? 'morgen' : `in ${naechster.inTagen} Tagen`}): „{naechster.regel.text}“
        </p>
      )}
      {naechster && <Pruefung regel={naechster.regel} tage={tage} titel={`Vorschau ${naechster.regel.lostag}`} />}
      <p className="small">
        <Term id="bauernregeln">Alle Bauernregeln im Wetterlexikon</Term>
      </p>
    </section>
  )
}

/** Regeltext mit Mundart, Region, Vermerk „ungeprüft“ und Erklärung */
export function RegelText({ regel }: { regel: Bauernregel }) {
  return (
    <>
      <blockquote className="bauernregel-text">
        „{regel.text}“
        {regel.mundart && <span className="bauernregel-mundart"> Mundart: „{regel.mundart}“</span>}
      </blockquote>
      <p className="small muted">
        {regel.region ? `Region: ${regel.region}` : 'Region: nicht bekannt'}
        {regel.ungeprueft && (
          <span className="badge-ungeprueft" title="Wortlaut, Datum oder Region noch nicht kontrolliert">
            ungeprüft
          </span>
        )}
      </p>
      <p className="small">
        <LinkedText text={regel.erklaerung} />
      </p>
    </>
  )
}

/** „Trifft die Regel heuer zu?“ – nur wenn die Regel prüfbar ist und ihr Tag in der Vorhersage liegt */
export function Pruefung({ regel, tage, titel = 'Trifft die Regel heuer zu?' }: { regel: Bauernregel; tage: DaySummary[]; titel?: string }) {
  const e = pruefeRegel(regel, tage)
  if (!e) return null
  return (
    <div className={e.trifftZu ? 'bauernregel-check ja' : 'bauernregel-check'}>
      <p className="small">
        <strong>{titel}</strong> <span className="muted">(Spielerei, keine Vorhersage)</span>
      </p>
      <p className="small">
        {e.messwerte}. {e.satz}
      </p>
    </div>
  )
}
