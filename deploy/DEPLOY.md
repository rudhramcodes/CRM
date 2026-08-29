# Deploy Rudhram CRM on Hostinger VPS (Caddy) → https://rudhramgroup.com

------------------------------------------------------------
PART 0 — What you need
------------------------------------------------------------
- VPS IP: 194.238.19.57  (SSH: ssh root@194.238.19.57)
- Domain: rudhramgroup.com (DNS you can edit)
- Your GitHub repo URL for the CRM
- Your existing server/.env values (MONGODB_URI Atlas, RESEND_*, CLOUDINARY_*, ZOHO_*)

------------------------------------------------------------
PART 1 — DNS (point rudhramgroup.com at the VPS)
------------------------------------------------------------
At your domain registrar / DNS host, add:
    Type: A
    Name: @            (root)
    Value: 194.238.19.57
    TTL: 300 (or default)

Wait for propagation (can take minutes–hours):
    ping rudhramgroup.com        # should return 194.238.19.57
    # or:  dig +short rudhramgroup.com

(The Hostinger firewall already allows 80/443 because shriambikaniketantrust.org
 works, so no firewall change is needed.)

------------------------------------------------------------
PART 2 — SSH into the VPS
------------------------------------------------------------
    ssh root@194.238.19.57

------------------------------------------------------------
PART 3 — System prep (Node 20 + Chromium libs)
------------------------------------------------------------
Option A — run the prepared script (edit the repo URL inside first):
    # on your laptop, push the deploy/ folder to GitHub, then on the VPS:
    nano deploy/setup-crm.sh      # replace <YOUR_REPO_URL> with your repo
    bash deploy/setup-crm.sh

Option B — manual:
    apt update && apt upgrade -y
    apt-get install -y curl build-essential python3 make g++
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
      libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 libxshmfence1

------------------------------------------------------------
PART 4 — Get the code
------------------------------------------------------------
    cd ~
    git clone <YOUR_REPO_URL> crm
    cd crm/server

------------------------------------------------------------
PART 5 — Install & build
------------------------------------------------------------
    npm install                 # installs server deps (downloads Chromium for Puppeteer)
    npm run build               # builds the React client into client/dist
    mkdir -p logs

------------------------------------------------------------
PART 6 — Configure server/.env  (IMPORTANT)
------------------------------------------------------------
    cp server/.env.example server/.env
    nano server/.env

Fill it. Easiest: copy values from your LOCAL server/.env, then change ONLY:
    NODE_ENV=development   ->  NODE_ENV=production
    CORS_ORIGIN=http://localhost:5173   ->  CORS_ORIGIN=https://rudhramgroup.com
    CLIENT_URL=http://localhost:5173     ->  CLIENT_URL=https://rudhramgroup.com
    APP_URL  (unset)                    ->  APP_URL=https://rudhramgroup.com

Keep these from your local .env (they already work):
    MONGODB_URI=   (your Atlas URI — but see Atlas note below)
    RESEND_API_KEY / RESEND_FROM_EMAIL / RESEND_FROM_NAME
    CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
    ZOHO_* (only if you use Zoho)

Generate fresh secrets:
    openssl rand -hex 32     # use for JWT_SECRET
    openssl rand -hex 32     # use for JWT_REFRESH_SECRET

Set your admin login:
    SEED_EMAIL=admin@rudhramgroup.com
    SEED_PASSWORD=StrongAdminPassword123

ATLAS NOTE: if MONGODB_URI points to MongoDB Atlas, allow the VPS IP:
    MongoDB Atlas → Network Access → Add IP: 194.238.19.57 (or 0.0.0.0/0).
    Without this the app crashes on connect (process.exit(1)).

------------------------------------------------------------
PART 7 — Run with PM2
------------------------------------------------------------
    npm install -g pm2
    pm2 start ecosystem.config.cjs
    pm2 save
    pm2 startup          # copy & run the printed command to enable auto-start

Test locally (before Caddy):
    curl http://localhost:3000/api/health
    # -> {"success":true,"message":"CRM API is running", ...}

If it errors, check logs:  pm2 logs crm

------------------------------------------------------------
PART 8 — Caddy reverse proxy (add ONLY a new block)
------------------------------------------------------------
Find the Caddyfile:
    cat /etc/caddy/Caddyfile
    # If empty/missing, find the config path:  systemctl cat caddy

Append the contents of deploy/caddy.rudhramgroup.com.txt to the END of the
Caddyfile (do NOT edit the existing shriambikaniketantrust.org block):

    rudhramgroup.com {
        reverse_proxy 127.0.0.1:3000
    }

Example:
    nano /etc/caddy/Caddyfile     # paste the block at the very end, save

Graceful reload (existing site keeps running, zero downtime):
    systemctl reload caddy
    # If that errors:  caddy reload --config /etc/caddy/Caddyfile

Caddy auto-gets the TLS certificate for rudhramgroup.com (ACME over port 80).
If you see a cert warning right after reload, wait a few minutes for DNS + issuance.

------------------------------------------------------------
PART 9 — Verify
------------------------------------------------------------
- https://rudhramgroup.com/api/health  → JSON
- https://rudhramgroup.com             → CRM login page
- Log in with SEED_EMAIL / SEED_PASSWORD
- shriambikaniketantrust.org           → still works (untouched)
- pm2 logs crm                         → watch for errors

------------------------------------------------------------
PART 10 — Future code updates (redeploy)
------------------------------------------------------------
On the VPS:
    cd ~/crm && git pull
    cd server && npm install && npm run build
    pm2 restart crm

------------------------------------------------------------
PART 11 — Troubleshooting
------------------------------------------------------------
- 502 Bad Gateway on rudhramgroup.com: CRM not running → `pm2 status`, `pm2 logs crm`.
- App crashes / 530: check `pm2 logs crm`. Usual cause: missing JWT_SECRET,
  bad MONGODB_URI, or Atlas IP not whitelisted.
- Cert warning: wait for DNS propagation + Caddy ACME (a few min). Ensure
  rudhramgroup.com A record points to 194.238.19.57 and port 80 is reachable.
- Existing site broken: you edited the wrong Caddy block — restore the
  shriambikaniketantrust.org block and `systemctl reload caddy`.

------------------------------------------------------------
SAFETY CHECKLIST (do NOT do these)
------------------------------------------------------------
- Do NOT edit/delete the shriambikaniketantrust.org Caddy block.
- Do NOT stop/restart the node process on :8000.
- Do NOT run `systemctl restart caddy` — use `reload` (graceful).
- Do NOT install nginx or Apache (Caddy is already the web server).

------------------------------------------------------------
Full environment-variable reference
------------------------------------------------------------
REQUIRED:
  MONGODB_URI        Atlas or local Mongo connection string
  JWT_SECRET         random 32-byte hex
  JWT_REFRESH_SECRET random 32-byte hex (different)

SET FOR PRODUCTION:
  NODE_ENV=production
  PORT=3000
  CORS_ORIGIN=https://rudhramgroup.com
  CLIENT_URL=https://rudhramgroup.com
  APP_URL=https://rudhramgroup.com

OPTIONAL (copy from dev .env if used):
  RESEND_API_KEY / RESEND_FROM_EMAIL / RESEND_FROM_NAME   (email; console fallback if empty)
  CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET  (uploads)
  ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN / ZOHO_ORG_NAME /
  ZOHO_ORG_ID / ZOHO_USER_ID / ZOHO_ACCOUNTS_URL / ZOHO_MEETING_API /
  ZOHO_OAUTH_CALLBACK_URL / ZOHO_CLIQ_WEBHOOK_URL  (Zoho Meeting/Cliq)

UNUSED BY CURRENT CODE (safe to omit):
  SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS   (legacy)
  IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY / IMAGEKIT_URL_ENDPOINT  (Cloudinary used instead)
