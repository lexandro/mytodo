@echo off
rem Portable release build: tests + release exe + portable folder.
rem Output: release\myTODO\ (exe + empty data/ + backup/)
rem Full MSI installer instead: bun run tauri build

echo === 1/4 Typecheck ===
call bun run typecheck
if %ERRORLEVEL% NEQ 0 (
  echo TYPECHECK FAILED
  exit /b 1
)

echo === 2/4 Tests ===
call bun run test
if %ERRORLEVEL% NEQ 0 (
  echo TESTS FAILED
  exit /b 1
)

echo === 3/4 Release build ===
call bun run tauri build --no-bundle
if %ERRORLEVEL% NEQ 0 (
  echo BUILD FAILED
  exit /b 1
)

echo === 4/4 Portable folder ===
rem NEVER wipe the folder: the user may run their live copy from it and
rem data\ + backup\ must survive a rebuild. Only the exe is replaced.
set OUT=release\myTODO
if not exist %OUT% mkdir %OUT%
if not exist %OUT%\data mkdir %OUT%\data
if not exist %OUT%\backup mkdir %OUT%\backup
copy /y target\release\mytodo.exe %OUT%\myTODO.exe >nul
if %ERRORLEVEL% NEQ 0 (
  echo COPY FAILED - is myTODO.exe still running? Close it and re-run.
  exit /b 1
)

echo.
echo Done: %OUT%\myTODO.exe
echo Copy the whole myTODO folder anywhere - data moves with it.



