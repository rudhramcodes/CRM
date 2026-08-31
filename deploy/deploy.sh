#!/bin/bash
set -e

echo "CRM Deployment Script"
echo "========================"

cd /root/crm

echo "Pulling latest code..."
git fetch origin main
git reset --hard origin/main

echo "Installing server dependencies..."
cd /root/crm/server
npm install --omit=dev

echo "Building client..."
npm run build

echo "Restarting PM2 process..."
pm2 restart crm --update-env

echo ""
echo "Deploy complete at $(date)"
echo "PM2 Status:"
pm2 status crm
echo ""
echo "Test: curl -s https://rudhramgroup.com/api/health | head -c 100"
