#!/bin/bash
set -e

echo "🚀 Starting Retro Stellar deployment..."

cd /var/www/retro-stellar-console

echo "📦 Building Next.js production bundle..."
npm run build

echo "📁 Copying standalone static assets..."
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/

echo "🔄 Restarting PM2 process..."
pm2 restart retro-stellar-console --update-env

echo "⏳ Waiting for service to come online..."
sleep 2

echo "🩺 Running health check..."
curl -I http://localhost:3007

echo "✅ Retro Stellar deployment complete."
