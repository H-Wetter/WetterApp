import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Misst die Breite eines Elements: sofort beim Einhängen und danach bei jeder Größenänderung.
 * (Nur auf die Meldung des Browsers zu warten reicht nicht – in Hintergrund-Tabs kommt die oft verzögert.)
 *
 * Verwendung: `const { ref, width } = useElementWidth<HTMLDivElement>()` und `<div ref={ref}>`.
 */
export function useElementWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: T | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node) return
    setWidth(Math.round(node.clientWidth))
    observer.current = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? node.clientWidth))
    })
    observer.current.observe(node)
  }, [])

  // Beim Verlassen der Seite aufräumen
  useEffect(() => () => observer.current?.disconnect(), [])

  return { ref, width }
}
