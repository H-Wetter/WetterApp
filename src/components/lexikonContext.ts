import { createContext } from 'react'

/** Funktion zum Öffnen eines Lexikon-Eintrags – kommt aus App.tsx, damit jede Komponente sie nutzen kann. */
export const LexikonContext = createContext<((id: string) => void) | null>(null)
