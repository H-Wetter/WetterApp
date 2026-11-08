import { LocalPage } from './pages/LocalPage'

function App() {
  return (
    <>
      <header className="app-header">
        <span className="brand">⛅ Wetter-App</span>
        <nav>
          {/* Weitere Seiten (Berge, Großwetterlage) kommen in späteren Etappen. */}
          <span className="nav-item active">Lokal</span>
        </nav>
      </header>
      <main>
        <LocalPage />
      </main>
    </>
  )
}

export default App
