/**
 * Gemeinsamer Zwischenspeicher (Cache) für Open-Meteo-Abrufe.
 *
 * Warum? Jeder Abruf zählt gegen das Tageslimit von Open-Meteo. Wer die Seite neu lädt,
 * zwischen Reitern wechselt oder zweimal denselben Ort sucht, bekommt die Daten der
 * letzten 30 Minuten aus dem Speicher – die Vorhersage ändert sich so schnell ohnehin kaum.
 *
 * So funktioniert es:
 * 1. Arbeitsspeicher (Map): schnell, gilt bis zum Neuladen der Seite.
 * 2. localStorage: überlebt das Neuladen. Ist er voll, werden die ältesten Einträge gelöscht.
 * 3. Laufende Abrufe werden geteilt: Fragen zwei Teile der App gleichzeitig dieselbe Adresse an,
 *    geht nur EIN Abruf ins Netz.
 * Fehlerantworten werden nie gespeichert – „Erneut versuchen“ fragt also wirklich neu an.
 */
import { openMeteoError } from './errors'

/** Wie lange Daten gültig bleiben: 30 Minuten */
export const CACHE_MAX_AGE_MS = 30 * 60 * 1000
/** Alle Einträge im localStorage beginnen damit – so finden wir sie zum Aufräumen. */
const STORAGE_PREFIX = 'wetterapp-cache:'
/** Sehr große Antworten nur im Arbeitsspeicher halten (localStorage fasst nur ca. 5 MB). */
const MAX_STORED_CHARS = 1_500_000

interface Entry {
  time: number
  data: unknown
}

const memory = new Map<string, Entry>()
const inFlight = new Map<string, Promise<unknown>>()

function isFresh(entry: Entry | undefined): entry is Entry {
  return !!entry && Date.now() - entry.time < CACHE_MAX_AGE_MS
}

/** Alle eigenen Schlüssel im localStorage, älteste zuerst */
function storedKeysOldestFirst(): { key: string; time: number }[] {
  const result: { key: string; time: number }[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(STORAGE_PREFIX)) continue
      // Die Zeit steht vorne im gespeicherten Text: „1731150000000|{…}“
      const text = localStorage.getItem(key) ?? ''
      result.push({ key, time: Number(text.slice(0, text.indexOf('|'))) || 0 })
    }
  } catch {
    // localStorage gesperrt (z. B. privater Modus) – dann gibt es nichts aufzuräumen.
  }
  return result.sort((a, b) => a.time - b.time)
}

/** Abgelaufene Einträge löschen, damit der Speicher nicht vollläuft. */
function removeExpired() {
  for (const { key, time } of storedKeysOldestFirst()) {
    if (Date.now() - time >= CACHE_MAX_AGE_MS) {
      try {
        localStorage.removeItem(key)
      } catch {
        // egal
      }
    }
  }
}
removeExpired()

function readStored(url: string): Entry | undefined {
  try {
    const text = localStorage.getItem(STORAGE_PREFIX + url)
    if (!text) return undefined
    const bar = text.indexOf('|')
    return { time: Number(text.slice(0, bar)), data: JSON.parse(text.slice(bar + 1)) as unknown }
  } catch {
    return undefined
  }
}

function writeStored(url: string, entry: Entry, json: string) {
  if (json.length > MAX_STORED_CHARS) return
  const text = `${entry.time}|${json}`
  // Ist der Speicher voll, löschen wir die ältesten eigenen Einträge und versuchen es noch einmal.
  const candidates = storedKeysOldestFirst()
  for (let attempt = 0; attempt <= candidates.length; attempt++) {
    try {
      localStorage.setItem(STORAGE_PREFIX + url, text)
      return
    } catch {
      const oldest = candidates[attempt]
      if (!oldest) return
      try {
        localStorage.removeItem(oldest.key)
      } catch {
        return
      }
    }
  }
}

/** Wartet auf `promise`, bricht aber für DIESEN Aufrufer ab, wenn `signal` ausgelöst wird. */
function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(new DOMException('Abgebrochen', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Abgebrochen', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (v) => {
        signal.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(e instanceof Error ? e : new Error(String(e)))
      },
    )
  })
}

/**
 * Holt JSON von einer Open-Meteo-Adresse – aus dem Cache, wenn es jünger als 30 Minuten ist.
 * @param url vollständige Adresse samt Parametern (sie ist gleichzeitig der Schlüssel im Cache)
 * @param what Satzanfang für Fehlermeldungen, z. B. „Wetterdaten konnten nicht geladen werden“
 * @param signal Abbruch, wenn der Aufrufer die Daten nicht mehr braucht (der geteilte Abruf läuft weiter)
 */
export async function fetchJsonCached<T>(url: string, what: string, signal?: AbortSignal): Promise<T> {
  const inMemory = memory.get(url)
  if (isFresh(inMemory)) return inMemory.data as T

  const stored = readStored(url)
  if (isFresh(stored)) {
    memory.set(url, stored)
    return stored.data as T
  }

  let running = inFlight.get(url)
  if (!running) {
    // Bewusst ohne `signal`: Andere Teile der App warten vielleicht auf denselben Abruf.
    running = (async () => {
      const response = await fetch(url)
      if (!response.ok) throw await openMeteoError(response, what)
      const json = await response.text()
      const entry: Entry = { time: Date.now(), data: JSON.parse(json) as unknown }
      memory.set(url, entry)
      writeStored(url, entry, json)
      return entry.data
    })().finally(() => inFlight.delete(url))
    inFlight.set(url, running)
  }
  return (await withAbort(running, signal)) as T
}
