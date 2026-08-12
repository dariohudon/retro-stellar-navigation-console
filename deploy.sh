#!/bin/bash
# Build and deploy the standalone Next.js bundle, then restart PM2.
set -e
cd "$(dirname "$0")"
npm run build
cp -r .next/static .next/standalone/.next/
mkdir -p .next/standalone/public
cp -r public/* .next/standalone/public/
pm2 restart retro-stellar-console
