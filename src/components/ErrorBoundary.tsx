import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  /** Name des Bereichs für die Meldung, z. B. „Wolken nach Höhe“ */
  label: string
  /** Ändert sich dieser Wert (z. B. neuer Ort), wird automatisch ein neuer Versuch gestartet. */
  resetKey?: string | number
  children: ReactNode
}

interface State {
  error: Error | null
  /** zuletzt gesehener resetKey – ändert er sich, starten wir neu */
  resetKey: Props['resetKey']
}

/**
 * Fehlergrenze („Error Boundary“): Geht beim Anzeigen eines Bereichs etwas schief,
 * zeigt sie stattdessen eine freundliche Meldung – der Rest der App läuft weiter.
 *
 * Hinweis: React verlangt dafür (noch) eine „Klassen-Komponente“ statt einer Funktion.
 * Sie fängt Fehler beim Anzeigen ab, nicht bei Anfragen ans Internet – die behandeln
 * die Bereiche selbst (z. B. „Erneut versuchen“).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  /** Neuer Ort / neue Daten (anderer resetKey) → Fehler vergessen und nochmal versuchen */
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Für die Fehlersuche in der Browser-Konsole festhalten
    console.error(`Fehler im Bereich „${this.props.label}“:`, error, info.componentStack)
  }

  private retry = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <section className="card error-card" role="alert">
        <p>
          <strong>{this.props.label}</strong> konnte nicht angezeigt werden.
        </p>
        <p className="muted small">
          Der Rest der App funktioniert weiter. Technische Info: {this.state.error.message}
        </p>
        <button type="button" onClick={this.retry}>
          Erneut versuchen
        </button>
      </section>
    )
  }
}
