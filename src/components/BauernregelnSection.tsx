import { useMemo, useState } from 'react'
import { datumText, monatsname, sucheRegeln } from '../lib/bauernregeln'
import type { Grundlage } from '../types/bauernregel'
import { LinkedText } from './LexikonLink'

const GRUNDLAGE: Record<Grundlage, string> = {
  ja: 'meteorologisch begründet',
  teilweise: 'teilweise begründet',
  nein: 'reine Überlieferung',
}

/** Abschnitt „Bauernregeln“ im Wetterlexikon: alle Regeln nach Monaten, mit Suchfeld */
export function BauernregelnSection({ highlight }: { highlight: boolean }) {
  const [suche, setSuche] = useState('')
  const gruppen = useMemo(() => sucheRegeln(suche), [suche])
  const anzahl = gruppen.reduce((n, g) => n + g.regeln.length, 0)

  return (
    <section id="lex-bauernregeln" className={highlight ? 'card lex-entry lex-highlight' : 'card lex-entry'}>
      <h2>Bauernregeln</h2>
      <p>
        <LinkedText text="Überlieferte Wetterregeln aus dem Alpenraum, nach Monaten. Viele hängen an einem Lostag. Ob eine Regel eine meteorologische Grundlage hat, steht jeweils dabei. Regeln mit dem Vermerk „ungeprüft“ sind noch nicht mit einer Quelle kontrolliert." />
      </p>
      <input
        type="search"
        className="lex-regel-suche"
        placeholder="Regel suchen, z. B. Martini, Schnee oder Österreich"
        value={suche}
        onChange={(e) => setSuche(e.target.value)}
        aria-label="Bauernregel suchen"
      />
      {suche && <p className="small muted">{anzahl === 0 ? 'Keine Regel gefunden.' : `${anzahl} Regeln`}</p>}
      {gruppen.map((g) => (
        <div key={g.monat} className="regel-monat">
          <h3>{monatsname(g.monat)}</h3>
          <ul className="regel-liste">
            {g.regeln.map((r) => (
              <li key={r.id}>
                <div className="regel-kopf">
                  <strong>„{r.text}“</strong>
                  {r.ungeprueft && <span className="badge-ungeprueft">ungeprüft</span>}
                </div>
                {r.mundart && <p className="small muted">Mundart: „{r.mundart}“</p>}
                <p className="small muted">
                  {r.lostag ? `${r.lostag}, ${datumText(r)}` : `Monatsregel ${datumText(r)}`}
                  {r.region && ` · ${r.region}`} · {GRUNDLAGE[r.grundlage]}
                </p>
                <p className="small">
                  <LinkedText text={r.erklaerung} />
                </p>
                <details className="bauernregel-details">
                  <summary>Was steckt dahinter?</summary>
                  <p className="small">
                    <LinkedText text={r.hintergrund} />
                  </p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
