@echo off
setlocal enabledelayedexpansion

:: Find the first subdirectory
for /d %%D in (*) do (
    set "SUBDIR=%%D"
    goto :found
)

echo No subdirectory found.
exit /b 1

:found
cd /d "%~dp0!SUBDIR!"
npm run dev
