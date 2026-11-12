import { describe, expect, it } from 'vitest'
import { BUNDESLAENDER, MAP_HEIGHT, MAP_WIDTH, buildAustriaMap } from './austriaMap'

describe('Österreich-Karte', () => {
  const map = buildAustriaMap()

  it('enthält die 9 Bundesländer mit Namen und Landeshauptstadt', () => {
    expect(map.lands.map((l) => l.name).sort()).toEqual(
      ['Burgenland', 'Kärnten', 'Niederösterreich', 'Oberösterreich', 'Salzburg', 'Steiermark', 'Tirol', 'Vorarlberg', 'Wien'].sort(),
    )
    expect(map.lands.find((l) => l.id === 'St')?.hauptstadt).toBe('Graz')
    for (const l of map.lands) expect(l.d.length).toBeGreaterThan(50)
  })

  it('hat die Quellenangabe für die Lizenz', () => {
    expect(BUNDESLAENDER.quelle).toContain('Statistik Austria')
    expect(BUNDESLAENDER.quelle).toContain('CC BY 4.0')
  })

  it('legt Bregenz links, Wien rechts und alle Landeshauptstädte in die Zeichenfläche', () => {
    const bregenz = map.project(9.747, 47.503)
    const wien = map.project(16.373, 48.208)
    const graz = map.project(15.439, 47.071)
    expect(bregenz && wien && graz).toBeTruthy()
    if (!bregenz || !wien || !graz) return
    expect(bregenz[0]).toBeLessThan(wien[0])
    // Graz liegt südlich von Wien → weiter unten im Bild
    expect(graz[1]).toBeGreaterThan(wien[1])
    for (const [x, y] of [bregenz, wien, graz]) {
      expect(x).toBeGreaterThan(0)
      expect(x).toBeLessThan(MAP_WIDTH)
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThan(MAP_HEIGHT)
    }
  })
})
