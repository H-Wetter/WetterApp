import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  // viteSingleFile: packt beim Bauen JavaScript und CSS direkt in die index.html.
  // So entsteht EINE Datei, die StatiCrypt danach mit dem Passwort verschlüsseln kann.
  plugins: [react(), viteSingleFile()],
  // Relative Pfade: So funktioniert die App auch unter einer Unteradresse
  // wie https://deinname.github.io/wetter-app/ (GitHub Pages), egal wie das Repo heißt.
  base: './',
})
