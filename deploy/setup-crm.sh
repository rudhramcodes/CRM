#!/usr/bin/env bash
set -euo pipefail

# Deploy Rudhram CRM on a Hostinger VPS (Ubuntu 24.04, Caddy already present).
# SAFE: this does NOT touch the existing Caddy server or the site on :8000.
# Database: uses your existing MongoDB Atlas by default (just set MONGODB_URI).
# For a LOCAL MongoDB instead, see the "Local MongoDB (optional)" block at the bottom.

# 1) System packages
apt update && apt upgrade -y
apt-get install -y curl build-essential python3 make g++

# 2) Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3) Chromium system libraries (required by Puppeteer for invoice PDFs)
apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
  libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libxshmfence1

# 4) App code  (replace <YOUR_REPO_URL> with your GitHub repo URL)
cd ~
git clone https://github.com/rudhramcodes/CRM crm && cd crm/server
npm install
npm run build
mkdir -p logs

# 5) Environment file (then edit it!)
cp server/.env.example server/.env
echo ">>> EDIT server/.env NOW:"
echo "    - MONGODB_URI  (your Atlas URI, or local Mongo URI)"
echo "    - JWT_SECRET / JWT_REFRESH_SECRET (openssl rand -hex 32)"
echo "    - CORS_ORIGIN / CLIENT_URL / APP_URL = https://rudhramgroup.com"
echo "    - SEED_EMAIL / SEED_PASSWORD (your admin login)"
echo "    - copy RESEND_*, CLOUDINARY_*, ZOHO_* from your dev .env if you use them"
echo "    nano server/.env"

# 6) Run under PM2
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup

echo ">>> Test:  curl http://localhost:3000/api/health"
echo ">>> Then append deploy/caddy.rudhramgroup.com.txt to /etc/caddy/Caddyfile and run:  systemctl reload caddy"

# ============================================================
# Local MongoDB (OPTIONAL — only if you do NOT use Atlas)
# Uncomment the block below BEFORE running the script, or run manually.
# ============================================================
# curl -fsSL https://pgp.mongodb.com/server-8.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-8.0.gpg
# echo "deb [ arch=amd64, signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list
# apt-get update && apt-get install -y mongodb-org
# systemctl enable --now mongod
# mongosh crm
#   > db.createUser({ user: "crmuser", pwd: "STRONG_PASSWORD", roles: ["readWrite"] })
#   > quit()
# # Then set MONGODB_URI=mongodb://crmuser:STRONG_PASSWORD@127.0.0.1:27017/crm in server/.env
