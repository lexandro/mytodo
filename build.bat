@echo off
rem Gyors lokalis release build (csak exe, installer nelkul).
rem A kesz exe: target\release\mytodo.exe
rem Teljes MSI-hez: bun run tauri build

bun run tauri build --no-bundle
if %ERRORLEVEL% NEQ 0 (
  echo BUILD HIBA
  exit /b 1
)
echo Kesz: target\release\mytodo.exe

