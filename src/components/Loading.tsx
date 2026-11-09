import type { ReactNode } from 'react'

/**
 * Einheitliche Ladeanzeige für die ganze App: ein kleiner drehender Kreis plus Text.
 * `role="status"` sorgt dafür, dass Bildschirmleser den Text vorlesen.
 */
export function Loading({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return (
    <p className={small ? 'loading small' : 'loading'} role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
