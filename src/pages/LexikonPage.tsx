import { useEffect, useMemo, useState } from 'react'
import { LinkedText } from '../components/LexikonLink'
import { LexikonSketch } from '../components/LexikonSketch'
import { BauernregelnSection } from '../components/BauernregelnSection'
import { LEXIKON_SORTED, searchLexikon } from '../lib/lexikon'

interface Props {
  /** Eintrag, zu dem gesprungen werden soll (aus einem Link in der App); nonce ändert sich bei jedem Klick */
  target: { id: string; nonce: number } | null
  /** Name der Seite, von der man kam – für „Zurück“ */
  backLabel: string | null
  onBack: () => void
}

/** Seite „Wetterlexikon“: Begriffe einfach erklärt, mit Suche und Sprungmarken. */
export function LexikonPage({ target, backLabel, onBack }: Props) {
  const [query, setQuery] = useState('')
  // Öffnet ein Begriff das Lexikon zum ersten Mal, gleich diesen Eintrag hervorheben
  const [highlight, setHighlight] = useState<string | null>(target?.id ?? null)
  const results = useMemo(() => searchLexikon(query), [query])

  // Neues Sprungziel? Dann gleich beim Zeichnen die Suche leeren (sie könnte den Eintrag ausblenden)
  // und den Eintrag hervorheben – so empfiehlt es React statt eines Effekts.
  const [seenTarget, setSeenTarget] = useState(target)
  if (target !== seenTarget) {
    setSeenTarget(target)
    setQuery('')
    setHighlight(target?.id ?? null)
  }

  // Hinscrollen geht erst, wenn der Eintrag auf dem Bildschirm steht – darum hier im Effekt
  useEffect(() => {
    if (!target) return
    document.getElementById(`lex-${target.id}`)?.scrollIntoView({ block: 'start' })
    const timer = window.setTimeout(() => setHighlight(null), 2500)
    return () => window.clearTimeout(timer)
  }, [target])

  function jump(id: string) {
    setHighlight(id)
    document.getElementById(`lex-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => setHighlight(null), 2500)
  }

  return (
    <div className="page">
      {backLabel && (
        <button type="button" className="link-button lex-back" onClick={onBack}>
          ← zurück zu „{backLabel}“
        </button>
      )}
      <h1>Wetterlexikon</h1>
      <p className="muted">
        Wetterbegriffe einfach erklärt. Tipp: Unterstrichene Begriffe in der App führen direkt hierher.
      </p>

      <div className="card lex-search">
        <input
          type="search"
          placeholder="Begriff suchen, z. B. Föhn oder Nebel"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Begriff suchen"
        />
        {!query && (
          <div className="lex-index" aria-label="Alle Begriffe">
            {LEXIKON_SORTED.map((e) => (
              <button key={e.id} type="button" onClick={() => jump(e.id)}>
                {e.title}
              </button>
            ))}
            <button type="button" className="lex-index-regeln" onClick={() => jump('bauernregeln')}>
              Bauernregeln
            </button>
          </div>
        )}
        {query && (
          <p className="small muted">
            {results.length === 0 ? 'Nichts gefunden – versuch ein anderes Wort.' : `${results.length} Treffer`}
          </p>
        )}
      </div>

      {results.map((e) => (
        <article key={e.id} id={`lex-${e.id}`} className={highlight === e.id ? 'card lex-entry lex-highlight' : 'card lex-entry'}>
          <h2>{e.title}</h2>
          <div className="lex-body">
            <div>
              <p>
                <LinkedText text={e.explanation} skipId={e.id} />
              </p>
              <p className="lex-inapp">
                <strong>In der App: </strong>
                <LinkedText text={e.inApp} skipId={e.id} />
              </p>
              {e.example && (
                <p className="lex-example">
                  <strong>Beispiel: </strong>
                  {e.example}
                </p>
              )}
            </div>
            {e.sketch && <LexikonSketch id={e.sketch} />}
          </div>
        </article>
      ))}

      {/* Bauernregeln: eigener Abschnitt mit eigener Suche (Etappe 16) */}
      {!query && <BauernregelnSection highlight={highlight === 'bauernregeln'} />}
    </div>
  )
}
