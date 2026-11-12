import { describe, expect, it } from 'vitest'
import { WMO_CODES, wmoParts } from './wmo'

describe('wmoParts', () => {
  it('hat für jeden WMO-Code einen deutschen Namen und sichtbaren Inhalt', () => {
    for (const code of WMO_CODES) {
      const p = wmoParts(code)
      expect(p.label.length, `Code ${code}`).toBeGreaterThan(3)
      expect(p.sun || p.cloud !== 'none' || p.fog, `Code ${code} ist leer`).toBe(true)
    }
  })

  it('ordnet typische Codes richtig zu', () => {
    expect(wmoParts(0)).toMatchObject({ sun: true, cloud: 'none' })
    expect(wmoParts(65)).toMatchObject({ precip: 'rain', amount: 3 })
    expect(wmoParts(73)).toMatchObject({ precip: 'snow', amount: 2 })
    expect(wmoParts(80)).toMatchObject({ sun: true, precip: 'rain' })
    expect(wmoParts(95)).toMatchObject({ thunder: true })
    expect(wmoParts(45)).toMatchObject({ fog: true })
    expect(wmoParts(67)).toMatchObject({ freezing: true })
  })

  it('zeigt unbekannte Codes als bewölkt statt abzustürzen', () => {
    expect(wmoParts(42).cloud).toBe('gray')
  })
})
