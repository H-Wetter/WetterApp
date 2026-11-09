/// <reference types="vite/client" />

/**
 * Werte aus der Datei `.env` (nicht im Git!). Nur Namen mit `VITE_` kommen in die App –
 * und landen damit im fertigen JavaScript, sind also im Browser sichtbar.
 */
interface ImportMetaEnv {
  /** Kostenloser Schlüssel der Windy Webcams API (https://api.windy.com/keys) */
  readonly VITE_WINDY_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
