@echo off
REM Re-optimize faction logos: converts public\logos\<slug>.png (new art) to webp
REM and updates references. No site rebuild needed - takes effect immediately.
cd /d "%~dp0"
set "PATH=%~dp0tools\node;%PATH%"
node scripts\optimize-logos.mjs
echo.
echo Done. Refresh the site in your browser (Ctrl+F5) to see the new logos.
pause
