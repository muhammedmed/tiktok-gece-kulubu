#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null || ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major>22||(major===22&&minor>=9)?0:1)'; then
  echo 'Node.js 22.9.0 veya üzerini kurup yeniden açın.'
  read -r '?Kapatmak için Enter…'
  exit 1
fi
if [ ! -d node_modules/three ]; then
  npm ci || exit 1
fi
npm start
