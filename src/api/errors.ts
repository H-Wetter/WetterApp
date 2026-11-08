/**
 * Macht aus einer Fehlerantwort von Open-Meteo einen verständlichen deutschen Satz.
 * Open-Meteo schickt den Grund als JSON mit, z. B. {"reason":"Daily API request limit exceeded. …"}.
 * Wichtig: Beim Tageslimit hilft „in einer Minute erneut versuchen“ nicht – darum unterscheiden wir.
 * @param what Satzanfang, z. B. „Wetterdaten konnten nicht geladen werden“
 */
export async function openMeteoError(response: Response, what: string): Promise<Error> {
  let reason = ''
  try {
    const body = (await response.json()) as { reason?: string }
    reason = body.reason ?? ''
  } catch {
    // Antwort war kein JSON – dann bleibt es beim HTTP-Status.
  }
  if (/daily/i.test(reason)) {
    return new Error(`${what}: Das Tageslimit von Open-Meteo (10.000 Abrufe) ist für heute erreicht. Morgen geht es wieder.`)
  }
  if (/hourly/i.test(reason)) {
    return new Error(`${what}: Das Stundenlimit von Open-Meteo (5.000 Abrufe) ist erreicht. Bitte in einer Stunde erneut versuchen.`)
  }
  if (/minutely/i.test(reason) || response.status === 429) {
    return new Error(`${what}: Zu viele Abrufe in kurzer Zeit. Bitte in einer Minute erneut versuchen.`)
  }
  return new Error(`${what} (${reason || `HTTP ${response.status}`}).`)
}
