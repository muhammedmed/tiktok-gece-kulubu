@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22.9.0 veya uzerini kurup yeniden acin.
  pause
  exit /b 1
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22||(major===22&&minor>=9)?0:1)"
if errorlevel 1 (
  echo Node.js 22.9.0 veya uzerini kurup yeniden acin.
  pause
  exit /b 1
)
if not exist node_modules\three (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm start
pause
