#!/usr/bin/env bash
# AutoUniverse — Deploy skripte (pokretati na VPS kao milan)
# Pretpostavka: repo je kloniran u /var/www/autouniverse/repo
set -euo pipefail

REPO=/var/www/autouniverse/repo
WEB=/var/www/autouniverse

echo "=== Povlačim najnoviji kod ==="
git -C "$REPO" pull --ff-only

echo "=== Kopiram PWA fajlove ==="
rsync -a --delete "$REPO/garage/"  "$WEB/garage/"
rsync -a --delete "$REPO/driver/"  "$WEB/driver/"
rsync -a --delete "$REPO/landing/" "$WEB/landing/"
rsync -a --delete "$REPO/core/"    "$WEB/garage/core/"
rsync -a --delete "$REPO/core/"    "$WEB/driver/core/"

echo "=== Instaliram server zavisnosti ==="
for SRV in aucore autopijaca autodelovi; do
    SRC="$REPO/$SRV"
    DST="$WEB/$SRV"
    rsync -a --delete --exclude=node_modules --exclude=data "$SRC/" "$DST/"
    cd "$DST" && npm ci --omit=dev
done

echo "=== Restartujem PM2 procese ==="
pm2 restart all || pm2 start "$REPO/ecosystem.config.js" --env production

echo ""
echo "=== Deploy završen. Status: ==="
pm2 list
