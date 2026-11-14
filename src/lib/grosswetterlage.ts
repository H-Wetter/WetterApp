/**
 * Typische Alpen-Wetterlagen erkennen (Etappe 18c).
 *
 * Ablauf:
 * 1. `kennzahlen` rechnet aus den Daten der Alpenpunkte ein paar Zahlen für den Tag aus
 *    (Luftdruck, Regen nördlich und südlich des Alpenhauptkamms, Föhn-Druckdifferenz, Wind, Temperaturänderung).
 * 2. `findeItalientief` sucht im Europa-Raster ein Tief über Oberitalien oder der Adria und verfolgt,
 *    wohin es in den nächsten zwei Tagen zieht (Vb-Lage).
 * 3. `erkenneWetterlagen` prüft für jede Wetterlage eine Regel. Es können mehrere Lagen gleichzeitig
 *    zutreffen (z. B. Südstau und Südföhn). Trifft keine zu, bleibt die Liste leer:
 *    Dann schreibt die App „keine eindeutige Wetterlage“, statt eine Lage zu erzwingen.
 *
 * Alle Schwellenwerte stehen in SCHWELLEN und lassen sich dort anpassen.
 */
import type { Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable, EuropeGrid, PressureCenter } from '../types/grosswetterlage'
import { distanceKm, findPressureCenters } from './druckgebilde'
import { analyseLuftmasse, analyseStroemung, richtungName, type Richtung } from './stroemung'

export const SCHWELLEN = {
  // ----- Hochdrucklage -----
  /** Mittlerer Luftdruck über Österreich (hPa), ab dem wir von Hochdruck sprechen */
  hochDruckHpa: 1022,
  /** Tagesniederschlag (mm), unter dem eine Seite der Alpen als trocken gilt */
  trockenMm: 1,
  /** Ein Hochkern in diesem Umkreis (km) wird als Ursache genannt */
  hochUmkreisKm: 1500,
  /** Monate mit Inversion und Hochnebel bei Hochdruck (1 = Jänner): Oktober bis März */
  nebelMonate: [10, 11, 12, 1, 2, 3],

  // ----- Nordstau und Südstau -----
  /** Tagesniederschlag (mm) auf der Stauseite, ab dem wir von Stau sprechen */
  stauRegenMm: 3,
  /** Die Stauseite muss so viel Mal mehr Regen bekommen als die andere Seite */
  stauFaktor: 3,
  /** Mindestwind in 700 hPa (km/h), damit die Luft wirklich gegen die Alpen gedrückt wird */
  stauWindKmh: 25,
  /** Windrichtung in 700 hPa für Nordstau: von Westnordwest über Nord bis Nordnordost (Grad, woher) */
  nordSektor: [290, 30] as [number, number],
  /** Windrichtung in 700 hPa für Südstau und Südföhn: von Südost bis Südwest */
  suedSektor: [135, 245] as [number, number],

  // ----- Südföhn -----
  /** Luftdruck in Bozen minus Innsbruck (hPa), ab dem Föhn wahrscheinlich ist */
  foehnDruckHpa: 4,
  /** Mindestwind aus Süd in 700 hPa (km/h) */
  foehnWindKmh: 30,

  // ----- Westlage und Ostlage -----
  /** Höhenströmung (500 hPa) für die Westlage: Richtung und Mindeststärke */
  westSektor: [245, 295] as [number, number],
  westKmh: 40,
  /** Wind in 700 hPa für die Ostlage: Richtung und Mindeststärke */
  ostSektor: [45, 135] as [number, number],
  ostKmh: 15,

  // ----- Tief über Oberitalien oder der Adria, Vb-Lage -----
  /** Gebiet, in dem der Tiefkern liegen muss: Breite von/bis, Länge von/bis */
  italienBox: { latMin: 41, latMax: 46.5, lonMin: 6, lonMax: 16.5 },
  /** Westlich dieser Länge heißt es Genuatief, östlich Adriatief */
  genuaGrenzeLon: 12,
  /** So viele Stunden verfolgen wir den Tiefkern weiter */
  vbStunden: 48,
  /** So weit (km) darf der Kern zwischen zwei Rasterzeiten (6 Stunden) höchstens springen */
  vbSprungKm: 500,
  /** Vb-Lage: Der Kern erreicht ein Gebiet nordöstlich der Alpen (ab dieser Breite und Länge) … */
  vbZielLatMin: 46.5,
  vbZielLonMin: 14,
  /** … und ist dabei mindestens so weit nach Norden und Osten gewandert (Grad) */
  vbMinNord: 1.5,
  vbMinOst: 3,

  // ----- Kaltluftausbruch aus Norden -----
  /** Temperatur in 850 hPa liegt mindestens so viele Grad unter den Vortagen */
  kaltluftDiffGrad: 6,
  /** Strömung dabei aus Nordwest bis Nordost */
  kaltluftSektor: [300, 60] as [number, number],
}

const HOUR = 3600 * 1000

export type WetterlageId = 'hochdruck' | 'nordstau' | 'suedstau' | 'suedfoehn' | 'westlage' | 'ostlage' | 'italientief' | 'kaltluftausbruch'

export interface Wetterlage {
  id: WetterlageId
  /** Name als Stichwort, z. B. „Südföhn“ */
  name: string
  /** Woran die App die Lage erkannt hat (ganze Sätze ohne Punkt am Ende) */
  gruende: string[]
  /** Zusätzlicher Hinweis, z. B. Hochnebel im Winterhalbjahr oder Vb-Warnung */
  hinweis?: string
  /** true = Warnhinweis (Vb-Lage) */
  warnung?: boolean
}

/** Zahlen für einen Tag, aus denen die Regeln die Wetterlage ableiten */
export interface LageKennzahlen {
  /** Monat des Tages (1–12) */
  monat: number
  /** Luftdruck auf Meereshöhe, Tagesmittel über Österreich (hPa) */
  druck: number | null
  /** Tagesniederschlag nördlich des Alpenhauptkamms (mm, Mittel der Orte) */
  regenNord: number | null
  /** Tagesniederschlag südlich des Alpenhauptkamms (mm) */
  regenSued: number | null
  /** Größte Druckdifferenz Bozen minus Innsbruck am Tag (hPa) */
  foehnDiff: number | null
  /** Wind in 700 hPa (rund 3000 m) um 12 Uhr UTC */
  wind700: Richtung | null
  /** Höhenströmung in 500 hPa um 12 Uhr UTC */
  hoehe: Richtung | null
  /** Temperatur in 850 hPa gegenüber den zwei Vortagen (Grad) */
  luftmasseDiff: number | null
}

export interface Italientief {
  center: PressureCenter
  /** Zeitpunkt, zu dem der Kern über Italien liegt (ms, UTC) */
  zeit: number
  /** Der Kern zieht in den folgenden Stunden nach Nordosten (mögliche Vb-Lage) */
  vb: boolean
  /** Wo der Kern am Ende der Zugbahn liegt, z. B. „über Ungarn“ */
  vbZiel?: string
}

// ---------- Hilfen ----------

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

/** Liegt die Richtung im Sektor [von, bis]? Der Sektor darf über Nord gehen, z. B. [290, 30]. */
export function imSektor(grad: number, [von, bis]: [number, number]): boolean {
  const g = ((grad % 360) + 360) % 360
  return von <= bis ? g >= von && g <= bis : g >= von || g <= bis
}

function modelMean(data: AlpenDaten, punktId: string, variable: AlpenVariable, ti: number, models: string[]): number | null {
  return mean(models.map((m) => data.werte[punktId]?.[m]?.[variable]?.[ti] ?? null))
}

function mm(value: number): string {
  return value < 0.95 ? value.toFixed(1).replace('.', ',') : String(Math.round(value))
}

// ---------- 1. Kennzahlen ----------

export function kennzahlen(data: AlpenDaten, punkte: Alpenpunkt[], dayStart: number, models: string[] = data.models): LageKennzahlen | null {
  // Zeitpunkte des Tages. Regen ist die Summe der 3 Stunden DAVOR, darum zählt der Wert um Mitternacht zum Vortag.
  const dayIdx = data.times.map((t, i) => (t >= dayStart && t < dayStart + 24 * HOUR ? i : -1)).filter((i) => i >= 0)
  const rainIdx = data.times.map((t, i) => (t > dayStart && t <= dayStart + 24 * HOUR ? i : -1)).filter((i) => i >= 0)
  if (dayIdx.length === 0) return null

  /** Tagessumme des Regens, gemittelt über die Orte einer Seite */
  const regen = (seite: Alpenpunkt['seite']) =>
    mean(
      punkte
        .filter((p) => p.seite === seite)
        .map((p) => {
          const steps = rainIdx.map((ti) => modelMean(data, p.id, 'precipitation', ti, models))
          return steps.some((v) => v !== null) ? steps.reduce<number>((sum, v) => sum + (v ?? 0), 0) : null
        }),
    )

  const foehnSteps = dayIdx
    .map((ti) => {
      const bozen = modelMean(data, 'bozen', 'pressure_msl', ti, models)
      const innsbruck = modelMean(data, 'innsbruck', 'pressure_msl', ti, models)
      return bozen === null || innsbruck === null ? null : bozen - innsbruck
    })
    .filter((v): v is number => v !== null)

  const stroemung = analyseStroemung(data, punkte, dayStart, models)
  return {
    monat: new Date(dayStart).getUTCMonth() + 1,
    druck: mean(dayIdx.flatMap((ti) => punkte.filter((p) => p.inOesterreich).map((p) => modelMean(data, p.id, 'pressure_msl', ti, models)))),
    regenNord: regen('nord'),
    regenSued: regen('sued'),
    foehnDiff: foehnSteps.length ? Math.max(...foehnSteps) : null,
    wind700: stroemung?.wind700 ?? null,
    hoehe: stroemung?.hoehe ?? null,
    luftmasseDiff: analyseLuftmasse(data, punkte, dayStart, models)?.diff ?? null,
  }
}

// ---------- 2. Tief über Oberitalien oder der Adria ----------

/**
 * Sucht am gewählten Tag ein Tief über Oberitalien oder der Adria (das tiefste, falls es mehrere Zeitpunkte gibt)
 * und verfolgt den Kern von Rasterzeit zu Rasterzeit. Zieht er nach Nordosten (Richtung Ungarn, Slowakei, Polen),
 * ist das die Zugbahn „Vb“: Feuchte Mittelmeerluft wird um das Tief herum gegen die Alpen und ins Vorland gelenkt.
 */
export function findeItalientief(grid: EuropeGrid, dayStart: number): Italientief | null {
  const { italienBox: box } = SCHWELLEN
  let start: { center: PressureCenter; ti: number } | null = null
  for (let ti = 0; ti < grid.times.length; ti++) {
    const t = grid.times[ti]
    if (t < dayStart || t >= dayStart + 24 * HOUR) continue
    for (const c of findPressureCenters(grid, ti)) {
      if (c.kind !== 'T' || c.lat < box.latMin || c.lat > box.latMax || c.lon < box.lonMin || c.lon > box.lonMax) continue
      if (!start || c.hPa < start.center.hPa) start = { center: c, ti }
    }
  }
  if (!start) return null
  const found = start

  // Zugbahn: zu jeder folgenden Rasterzeit das nächstgelegene Tief nehmen
  let pos = found.center
  let vbZiel: string | undefined
  for (let ti = found.ti + 1; ti < grid.times.length && grid.times[ti] - grid.times[found.ti] <= SCHWELLEN.vbStunden * HOUR; ti++) {
    let next: PressureCenter | null = null
    let nextDist = Infinity
    for (const c of findPressureCenters(grid, ti)) {
      if (c.kind !== 'T') continue
      const d = distanceKm(pos.lat, pos.lon, c.lat, c.lon)
      if (d <= SCHWELLEN.vbSprungKm && d < nextDist) {
        next = c
        nextDist = d
      }
    }
    if (!next) break
    pos = next
    const imZiel = pos.lat >= SCHWELLEN.vbZielLatMin && pos.lon >= SCHWELLEN.vbZielLonMin
    const gewandert = pos.lat - found.center.lat >= SCHWELLEN.vbMinNord && pos.lon - found.center.lon >= SCHWELLEN.vbMinOst
    if (imZiel && gewandert) vbZiel = pos.lage
  }
  return { center: found.center, zeit: grid.times[found.ti], vb: vbZiel !== undefined, vbZiel }
}

// ---------- 3. Regeln ----------

/**
 * Prüft alle Wetterlagen. Ergebnis in fester Reihenfolge: die folgenreichste Lage zuerst
 * (Italientief, Kaltluftausbruch, Föhn und Stau, Hochdruck). Ost- und Westlage nur, wenn sonst nichts zutrifft.
 * @param centers Hochs und Tiefs zur Mittagszeit des Tages (für die Begründung der Hochdrucklage)
 */
export function erkenneWetterlagen(k: LageKennzahlen, centers: PressureCenter[] = [], italientief: Italientief | null = null): Wetterlage[] {
  const S = SCHWELLEN
  const lagen: Wetterlage[] = []
  const windText = k.wind700 ? `Wind in 3000 m aus ${richtungName(k.wind700.grad)} mit rund ${Math.round(k.wind700.kmh / 5) * 5} km/h` : null

  // --- Tief über Oberitalien oder der Adria ---
  if (italientief) {
    const c = italientief.center
    lagen.push({
      id: 'italientief',
      name: c.lon <= S.genuaGrenzeLon ? 'Genuatief' : 'Adriatief',
      gruende: [`Tiefkern ${c.lage} mit ${c.hPa} hPa`],
      hinweis: italientief.vb
        ? `Mögliche Vb-Lage: Das Tief zieht in den folgenden zwei Tagen nach Nordosten (${italientief.vbZiel}). Dabei kann es vor allem im Osten und Norden Österreichs lange und stark regnen oder schneien.`
        : undefined,
      warnung: italientief.vb || undefined,
    })
  }

  // --- Kaltluftausbruch aus Norden ---
  const ausNorden = (k.wind700 && imSektor(k.wind700.grad, S.kaltluftSektor)) || (k.hoehe && imSektor(k.hoehe.grad, S.kaltluftSektor))
  if (k.luftmasseDiff !== null && k.luftmasseDiff <= -S.kaltluftDiffGrad && ausNorden) {
    lagen.push({
      id: 'kaltluftausbruch',
      name: 'Kaltluftausbruch aus Norden',
      gruende: [`in 1500 m um ${Math.round(-k.luftmasseDiff)} Grad kälter als an den Vortagen`, ...(windText ? [windText] : [])],
    })
  }

  // --- Südföhn ---
  const suedwind = k.wind700 !== null && imSektor(k.wind700.grad, S.suedSektor)
  if (k.foehnDiff !== null && k.foehnDiff >= S.foehnDruckHpa && suedwind && k.wind700 && k.wind700.kmh >= S.foehnWindKmh) {
    lagen.push({
      id: 'suedfoehn',
      name: 'Südföhn',
      gruende: [`Luftdruck in Bozen um ${Math.round(k.foehnDiff)} hPa höher als in Innsbruck`, ...(windText ? [windText] : [])],
      hinweis: 'An der Alpennordseite sind föhnige Aufhellungen, milde Luft und in den Föhntälern stürmischer Südwind möglich.',
    })
  }

  // --- Südstau ---
  if (
    k.regenSued !== null &&
    k.regenNord !== null &&
    k.regenSued >= S.stauRegenMm &&
    k.regenSued >= S.stauFaktor * k.regenNord &&
    suedwind &&
    k.wind700 &&
    k.wind700.kmh >= S.stauWindKmh
  ) {
    lagen.push({
      id: 'suedstau',
      name: 'Südstau',
      gruende: [`südlich des Alpenhauptkamms rund ${mm(k.regenSued)} mm Niederschlag, nördlich nur ${mm(k.regenNord)} mm`, ...(windText ? [windText] : [])],
    })
  }

  // --- Nordstau ---
  if (
    k.regenSued !== null &&
    k.regenNord !== null &&
    k.regenNord >= S.stauRegenMm &&
    k.regenNord >= S.stauFaktor * k.regenSued &&
    k.wind700 &&
    imSektor(k.wind700.grad, S.nordSektor) &&
    k.wind700.kmh >= S.stauWindKmh
  ) {
    lagen.push({
      id: 'nordstau',
      name: 'Nordstau',
      gruende: [`nördlich des Alpenhauptkamms rund ${mm(k.regenNord)} mm Niederschlag, südlich nur ${mm(k.regenSued)} mm`, ...(windText ? [windText] : [])],
    })
  }

  // --- Hochdrucklage ---
  const trocken = k.regenNord !== null && k.regenSued !== null && k.regenNord < S.trockenMm && k.regenSued < S.trockenMm
  if (k.druck !== null && k.druck >= S.hochDruckHpa && trocken) {
    const hoch = centers.find((c) => c.kind === 'H' && c.distanzKm <= S.hochUmkreisKm)
    lagen.push({
      id: 'hochdruck',
      name: 'Hochdrucklage',
      gruende: [
        `Luftdruck über Österreich im Mittel ${Math.round(k.druck)} hPa`,
        'kaum Niederschlag auf beiden Seiten der Alpen',
        ...(hoch ? [`Hoch ${hoch.lage} mit ${hoch.hPa} hPa`] : []),
      ],
      hinweis: S.nebelMonate.includes(k.monat)
        ? 'Im Winterhalbjahr sammelt sich dabei in Becken und Tälern oft kalte Luft: Nebel oder Hochnebel unten, Sonne und mildere Luft auf den Bergen (Inversion).'
        : undefined,
    })
  }

  // Ost- und Westlage beschreiben nur die Strömung. Sie werden nur genannt, wenn keine der Lagen oben zutrifft,
  // sonst stünde z. B. „Westlage“ neben „Kaltluftausbruch aus Norden“.
  if (lagen.length > 0) return lagen

  // --- Ostlage ---
  if (k.wind700 && imSektor(k.wind700.grad, S.ostSektor) && k.wind700.kmh >= S.ostKmh) {
    lagen.push({ id: 'ostlage', name: 'Ostlage', gruende: windText ? [windText] : [] })
  }

  // --- Westlage ---
  if (k.hoehe && imSektor(k.hoehe.grad, S.westSektor) && k.hoehe.kmh >= S.westKmh) {
    lagen.push({
      id: 'westlage',
      name: 'Westlage',
      gruende: [`Höhenströmung aus ${richtungName(k.hoehe.grad)} mit rund ${Math.round(k.hoehe.kmh / 5) * 5} km/h`],
    })
  }

  return lagen
}

// ---------- 4. Lexikon und Sicherheit (Etappe 18e) ----------

/** Zu welchem Eintrag im Wetterlexikon (src/data/lexikon.ts) führt das Stichwort einer Wetterlage? */
export const LAGE_LEXIKON: Record<WetterlageId, string> = {
  hochdruck: 'hoch-tief',
  nordstau: 'nordstau',
  suedstau: 'suedstau',
  suedfoehn: 'foehn',
  westlage: 'west-ostlage',
  ostlage: 'west-ostlage',
  italientief: 'genuatief',
  kaltluftausbruch: 'luftmassenzufuhr',
}

/** Kurze Namen der Modelle für den Sicherheitshinweis */
const MODELL_NAMEN: Record<string, string> = { ecmwf_ifs025: 'ECMWF', dwd_icon_seamless: 'ICON', gfs_seamless: 'GFS' }

export interface Sicherheit {
  stufe: 'sicher' | 'eher sicher' | 'unsicher'
  /** So viele Modelle kommen einzeln zur selben Wetterlage wie das Mittel … */
  gleich: number
  /** … von so vielen Modellen mit Daten */
  gesamt: number
  text: string
}

/**
 * Wie sicher ist die erkannte Wetterlage? Die Regeln laufen für jedes Modell einzeln.
 * Kommen alle zur selben Lage wie das Mittel der Modelle, ist die Einschätzung sicher,
 * weicht ein Modell ab, eher sicher, sonst unsicher.
 *
 * Verglichen wird nur, was aus den Alpenpunkten kommt. Das Tief über Italien stammt aus dem
 * Europa-Raster, und das gibt es nur von einem Modell (ECMWF): Es bleibt beim Vergleich außen vor.
 * @param tageVoraus 0 = heute. Ab dem 6. Tag kommt ein allgemeiner Hinweis dazu.
 */
export function einschaetzungSicherheit(
  data: AlpenDaten,
  punkte: Alpenpunkt[],
  dayStart: number,
  centers: PressureCenter[] = [],
  tageVoraus = 0,
): Sicherheit | null {
  const hauptlage = (models: string[]): string | null => {
    const k = kennzahlen(data, punkte, dayStart, models)
    if (!k || (k.druck === null && k.wind700 === null)) return null
    return erkenneWetterlagen(k, centers)[0]?.name ?? 'keine eindeutige Lage'
  }
  const mittel = hauptlage(data.models)
  if (mittel === null) return null
  const einzeln = data.models.map((m) => ({ name: MODELL_NAMEN[m] ?? m, lage: hauptlage([m]) })).filter((e): e is { name: string; lage: string } => e.lage !== null)
  if (einzeln.length < 2) return null

  const gleich = einzeln.filter((e) => e.lage === mittel).length
  const abweichend = einzeln.filter((e) => e.lage !== mittel)
  const stufe: Sicherheit['stufe'] = abweichend.length === 0 ? 'sicher' : abweichend.length === 1 ? 'eher sicher' : 'unsicher'
  const namen = einzeln.map((e) => e.name)
  const alle = namen.length > 1 ? `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}` : namen[0]

  let text: string
  if (stufe === 'sicher') {
    text = `Recht sicher: ${alle} kommen einzeln zum selben Ergebnis.`
  } else if (stufe === 'eher sicher') {
    text = `Eher sicher: ${gleich} von ${einzeln.length} Modellen kommen zum selben Ergebnis, ${abweichend[0].name} sieht stattdessen: ${abweichend[0].lage}.`
  } else {
    text = `Unsicher: Die Modelle kommen zu unterschiedlichen Ergebnissen (${einzeln.map((e) => `${e.name}: ${e.lage}`).join(', ')}).`
  }
  if (tageVoraus >= 5) text += ' So weit im Voraus können sich Lage und Zeitpunkt noch deutlich verschieben.'
  return { stufe, gleich, gesamt: einzeln.length, text }
}
