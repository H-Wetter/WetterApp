import { useContext, type ReactNode } from 'react'
import { linkTerms } from '../lib/lexikon'
import { LexikonContext } from './lexikonContext'

/** Ein antippbarer Begriff, z. B. <Term id="inversion">Inversion</Term> */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(LexikonContext)
  if (!open) return <>{children}</>
  return (
    <button
      type="button"
      className="term-link"
      onClick={(e) => {
        e.stopPropagation()
        open(id)
      }}
      title="Im Wetterlexikon erklären"
    >
      {children}
    </button>
  )
}

/** Text, in dem Lexikon-Begriffe automatisch antippbar werden. */
export function LinkedText({ text, skipId }: { text: string; skipId?: string }) {
  return (
    <>
      {linkTerms(text, skipId).map((p, i) =>
        p.id ? (
          <Term key={i} id={p.id}>
            {p.text}
          </Term>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}
