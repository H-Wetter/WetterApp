/** Kleine Skizzen, die zu einem Lexikon-Eintrag gezeichnet werden können (siehe components/LexikonSketch.tsx). */
export type SketchId =
  | 'inversion'
  | 'hochnebel'
  | 'nullgrad'
  | 'foehn'
  | 'cape'
  | 'wolkenstockwerke'
  | 'wolkenbasis'
  | 'streuung'
  | 'hochtief'
  | 'trog'
  | 'kaltfront'
  | 'warmfront'
  | 'okklusion'

/** Ein Begriff im Wetterlexikon. */
export interface LexikonEntry {
  /** Kurzname für Links, nur Kleinbuchstaben und Bindestriche, z. B. „inversion“ */
  id: string
  /** Überschrift, z. B. „Inversion“ */
  title: string
  /**
   * Wörter, die in Texten der App automatisch antippbar werden (Groß-/Kleinschreibung zählt)
   * und die auch die Suche findet. Längere Wörter mit gleichem Anfang werden mit erkannt,
   * z. B. „Inversion“ findet auch „Inversionen“.
   */
  terms: string[]
  /** Die Erklärung – 2 bis 4 einfache Sätze */
  explanation: string
  /** Woran man es in der App erkennt */
  inApp: string
  /** Ein Beispiel aus dem Alltag (optional) */
  example?: string
  /** Kleine Skizze (optional) */
  sketch?: SketchId
}
