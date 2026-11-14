/**
 * Der Absatz „Großwetterlage“ (Etappe 18e): setzt die Ergebnisse aus 18a bis 18d zu 4–8 Sätzen zusammen.
 *
 * Reihenfolge: Hochs und Tiefs über Europa, Wetterlage für Österreich, Strömung, Luftmasse und Fronten,
 * dann die weiteren Einflüsse. Wird der Absatz länger als MAX_SAETZE, fallen die unwichtigsten Teile weg
 * (jeder Teil hat dafür eine Wichtigkeit von 1 bis 10).
 */
import type { PressureCenter } from '../types/grosswetterlage'
import { gewitterText, hoehengrenzeText, staubText, sturmText, type Gewitterneigung, type Hoehengrenze, type Staub, type Sturm } from './einfluesse'
import type { Wetterlage } from './grosswetterlage'
import { frontText, luftmasseText, stroemungText, type Front, type Luftmasse, type Stroemung } from './stroemung'

/** Höchstzahl der Sätze im Absatz */
export const MAX_SAETZE = 8
/** Ein weiter entferntes Tief wird zusätzlich genannt, wenn sein Kerndruck höchstens so hoch ist (hPa). */
export const KRAEFTIGES_TIEF_HPA = 990

export interface AbsatzEingabe {
  /** Hochs und Tiefs zur Mittagszeit, das Nächstgelegene zuerst */
  centers: PressureCenter[]
  /** erkannte Wetterlagen, `null` = Daten fehlen */
  lagen: Wetterlage[] | null
  stroemung?: Stroemung | null
  luftmasse?: Luftmasse | null
  front?: Front | null
  sturm?: Sturm | null
  grenzeNord?: Hoehengrenze | null
  grenzeSued?: Hoehengrenze | null
  gewitter?: Gewitterneigung | null
  staub?: Staub | null
  /** aktuelle Zeit (ms): Fronten, die schon durch sind, stehen in der Vergangenheit */
  now?: number
}

interface Teil {
  text: string
  wichtig: number
}

function kern(c: PressureCenter): string {
  return `${c.kind === 'T' ? 'ein Tief' : 'ein Hoch'} ${c.lage} (${c.hPa} hPa)`
}

function und(items: string[]): string {
  return items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`
}

/** Zählt die Sätze eines Textes (Satzende = Punkt, Ruf- oder Fragezeichen vor Leerzeichen oder am Schluss). */
export function satzZahl(text: string): number {
  return text.split(/[.!?](?:\s+|$)/).filter((s) => s.trim().length > 0).length
}

/** Satz über die Hochs und Tiefs, die Österreich am nächsten liegen. */
export function druckSatz(centers: PressureCenter[]): string {
  const tief = centers.find((c) => c.kind === 'T')
  const hoch = centers.find((c) => c.kind === 'H')
  if (!tief && !hoch) return 'Über Europa gibt es kein ausgeprägtes Hoch oder Tief, der Luftdruck ist überall ähnlich.'
  // das Nähere zuerst nennen
  const beide = [tief, hoch].filter((c): c is PressureCenter => c !== undefined).sort((a, b) => a.distanzKm - b.distanzKm)
  return beide.length === 2
    ? `Am nächsten zu Österreich liegen ${kern(beide[0])} und ${kern(beide[1])}.`
    : `Am nächsten zu Österreich liegt ${kern(beide[0])}.`
}

/** Die Teile des Absatzes in Lesereihenfolge, schon auf MAX_SAETZE gekürzt. */
export function grosswetterlageAbsatz(e: AbsatzEingabe): string[] {
  const teile: Teil[] = [{ text: druckSatz(e.centers), wichtig: 10 }]

  // ein kräftiges Tief weiter weg, falls es nicht ohnehin das nächste ist
  const naechstesTief = e.centers.find((c) => c.kind === 'T')
  const tiefstes = e.centers.filter((c) => c.kind === 'T').sort((a, b) => a.hPa - b.hPa)[0]
  if (tiefstes && tiefstes !== naechstesTief && tiefstes.hPa <= KRAEFTIGES_TIEF_HPA) {
    teile.push({ text: `Das kräftigste Tief liegt ${tiefstes.lage} (${tiefstes.hPa} hPa).`, wichtig: 3 })
  }

  if (e.lagen) {
    teile.push({
      text:
        e.lagen.length === 0
          ? 'Für Österreich ist keine der typischen Alpen-Wetterlagen deutlich ausgeprägt.'
          : `Wetterlage für Österreich: ${und(e.lagen.map((l) => l.name))}.`,
      wichtig: 10,
    })
    for (const lage of e.lagen) {
      if (lage.hinweis) teile.push({ text: lage.hinweis, wichtig: lage.warnung ? 10 : 5 })
    }
  }

  if (e.stroemung) teile.push({ text: stroemungText(e.stroemung), wichtig: 9 })
  // Beim Kaltluftausbruch steht die Abkühlung schon im Namen der Lage
  const kaltluftGenannt = e.lagen?.some((l) => l.id === 'kaltluftausbruch') ?? false
  if (e.luftmasse && e.luftmasse.art !== 'gleich' && !kaltluftGenannt) teile.push({ text: luftmasseText(e.luftmasse), wichtig: 6 })
  if (e.front) teile.push({ text: frontText(e.front, e.now), wichtig: 8 })

  if (e.sturm && e.sturm.stufe > 0) teile.push({ text: sturmText(e.sturm), wichtig: 8 })
  const grenze = hoehengrenzeText(e.grenzeNord ?? null, e.grenzeSued ?? null)
  if (grenze) teile.push({ text: grenze, wichtig: 7 })
  if (e.gewitter && e.gewitter.stufe > 0) teile.push({ text: gewitterText(e.gewitter), wichtig: 7 })
  if (e.staub && e.staub.stufe > 0) teile.push({ text: staubText(e.staub), wichtig: 6 })

  // Kürzen: so lange den unwichtigsten Teil streichen (bei Gleichstand den hinteren), bis es passt
  const anzahl = () => teile.reduce((sum, t) => sum + satzZahl(t.text), 0)
  while (anzahl() > MAX_SAETZE && teile.length > 1) {
    let weg = 0
    teile.forEach((t, i) => {
      if (t.wichtig <= teile[weg].wichtig) weg = i
    })
    teile.splice(weg, 1)
  }
  return teile.map((t) => t.text)
}
