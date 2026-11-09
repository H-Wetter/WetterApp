import { LEXIKON } from '../data/lexikon'
import type { LexikonEntry } from '../types/lexikon'

/** Ein Stück Text: entweder normaler Text oder ein Begriff mit Verweis ins Lexikon. */
export type TextPart = { text: string; id?: string }

/** Für die Suche: klein, ohne Akzente/Umlaut-Punkte („Föhn“ → „fohn“), damit auch „fohn“ gefunden wird. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
}

/** Lexikon alphabetisch nach Überschrift */
export const LEXIKON_SORTED: LexikonEntry[] = [...LEXIKON].sort((a, b) => a.title.localeCompare(b.title, 'de'))

export function findEntry(id: string): LexikonEntry | undefined {
  return LEXIKON.find((e) => e.id === id)
}

/** Einträge, die zur Suche passen (Überschrift und Begriffe zählen mehr als der Erklärungstext). */
export function searchLexikon(query: string): LexikonEntry[] {
  const q = normalize(query.trim())
  if (!q) return LEXIKON_SORTED
  const score = (e: LexikonEntry) => {
    if (normalize(e.title).includes(q) || e.terms.some((t) => normalize(t).includes(q))) return 2
    if (normalize(`${e.explanation} ${e.inApp} ${e.example ?? ''}`).includes(q)) return 1
    return 0
  }
  return LEXIKON_SORTED.map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e)
}

// ---------- Begriffe in Texten automatisch verlinken ----------

/** Begriff → Eintrag. Längere Begriffe zuerst, damit „Hochnebel“ vor „Nebel“ geprüft wird. */
const TERM_TO_ID = new Map(LEXIKON.flatMap((e) => e.terms.map((t) => [t, e.id] as const)))
const TERMS = [...TERM_TO_ID.keys()].sort((a, b) => b.length - a.length)

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sucht Begriffe als ganze Wörter: davor kein Buchstabe („Hochnebel“ ist nicht „Nebel“),
 * danach dürfen Buchstaben folgen („Inversionen“, „Hochdruckeinfluss“).
 */
const TERM_REGEX = new RegExp(`(?<!\\p{L})(${TERMS.map(escapeRegex).join('|')})\\p{L}*`, 'gu')

/**
 * Zerlegt einen Text in normale Stücke und Begriffe mit Lexikon-Verweis.
 * Jeder Begriff wird pro Text nur beim ersten Vorkommen verlinkt (sonst wird es unruhig).
 * @param skipId diesen Eintrag nicht verlinken (z. B. im eigenen Lexikon-Eintrag)
 */
export function linkTerms(text: string, skipId?: string): TextPart[] {
  const parts: TextPart[] = []
  const seen = new Set<string>()
  let last = 0
  for (const m of text.matchAll(TERM_REGEX)) {
    const id = TERM_TO_ID.get(m[1])
    if (!id || id === skipId || seen.has(id) || m.index === undefined) continue
    seen.add(id)
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ text: m[0], id })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
