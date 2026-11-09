import { useMemo } from 'react'
import { buildCloudSection } from '../lib/clouds'
import type { CloudProfileRaw } from '../types/clouds'
import { CloudSectionChart } from './CloudSectionChart'
import { Loading } from './Loading'

interface Props {
  /** `null` = wird noch geladen (oder Fehler, siehe `error`) */
  profile: CloudProfileRaw | null
  error: string | null
  /** Modelle für die Statistik (wie in den anderen Diagrammen) */
  modelIds: string[]
  /** Stundenbereich (Index), z. B. 0 bis 168 für 7 Tage oder ein einzelner Tag */
  from: number
  to: number
  ticks: number[]
  tickFormatter?: (t: number) => string
  arrowStep: number
  now: number
  compact?: boolean
}

/** Wolkenschnitt mit Lade-, Fehler- und „keine Daten“-Anzeige. */
export function CloudSectionBlock({ profile, error, modelIds, from, to, ...chart }: Props) {
  const section = useMemo(
    () => (profile ? buildCloudSection(profile, modelIds, from, to) : null),
    [profile, modelIds, from, to],
  )

  if (error) {
    return (
      <section className="card">
        <h3>Wolken nach Höhe</h3>
        <p className="error small">{error}</p>
      </section>
    )
  }
  if (!profile || !section) {
    return (
      <section className="card">
        <h3>Wolken nach Höhe</h3>
        <Loading small>Höhendaten werden geladen …</Loading>
      </section>
    )
  }
  if (section.columns.length === 0 || section.modelCount === 0) {
    return (
      <section className="card">
        <h3>Wolken nach Höhe</h3>
        <p className="muted small">
          {from >= profile.times.length
            ? 'Den Wolkenschnitt gibt es nur für die nächsten 7 Tage.'
            : 'Für diesen Ort bzw. die gewählten Modelle gibt es keine Höhendaten.'}
        </p>
      </section>
    )
  }
  return <CloudSectionChart section={section} {...chart} />
}
