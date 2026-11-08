@echo off
rem Sich selbst einmal minimiert neu starten, damit das Fenster nicht stoert
if not "%~1"=="min" (
  start "Wetter-App" /min "%~f0" min
  exit /b
)

title Wetter-App
rem In den Ordner wechseln, in dem diese Datei liegt
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Node.js wurde nicht gefunden. Bitte Node.js LTS von https://nodejs.org installieren.', 'Wetter-App')" >nul
  exit /b 1
)

rem Beim ersten Start (oder wenn node_modules fehlt) die Pakete installieren
if not exist "node_modules" (
  echo Pakete werden installiert, das dauert beim ersten Mal kurz ...
  call npm install
)

echo.
echo Wetter-App laeuft. Der Browser oeffnet sich gleich.
echo Zum Beenden dieses Fenster schliessen oder Strg + C druecken.
echo.
call npm run dev -- --open
