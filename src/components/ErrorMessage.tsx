/**
 * Einheitliche Fehlermeldung für die ganze App: rot markierter Kasten mit Text
 * und – wenn sinnvoll – einem Knopf „Erneut versuchen“.
 * `role="alert"` sorgt dafür, dass Bildschirmleser die Meldung sofort vorlesen.
 * Den Text vorher mit `friendlyError()` (src/api/errors.ts) verständlich machen.
 */
export function ErrorMessage({ message, onRetry, small = false }: { message: string; onRetry?: () => void; small?: boolean }) {
  return (
    <div className={small ? 'error-box small' : 'error-box'} role="alert">
      <p>
        <span aria-hidden="true">⚠️ </span>
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  )
}
