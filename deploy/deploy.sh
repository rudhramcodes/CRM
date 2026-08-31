#!/bin/bash
set -e

echo "Starting deployment..."

cd /root/crm

# Pull latest
echo "Pulling latest code..."
git pull origin main

# Server deps
echo "Installing server dependencies..."
cd server
npm install --omit=dev

# Build client
echo "Building client..."
npm run build

# Restart PM2
echo "Restarting server..."
pm2 restart crm || pm2 start ecosystem.config.cjs

echo "Deployment complete!"
