#!/usr/bin/env bash
# AutoUniverse — VPS Bootstrap (Sesija 1)
# Hetzner CX23, Ubuntu 24.04 LTS, Nürnberg
# Pokretanje: bash vps-bootstrap.sh
set -euo pipefail

echo "=== AutoUniverse VPS Bootstrap ==="

# --- 1. System update ---
apt-get update -qq && apt-get upgrade -y -qq

# --- 2. milan user ---
if ! id -u milan &>/dev/null; then
  useradd -m -s /bin/bash milan
  usermod -aG sudo milan
  echo "milan ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/milan
  chmod 440 /etc/sudoers.d/milan
fi

# Kopiraj SSH ključeve od root do milan
mkdir -p /home/milan/.ssh
if [ -f /root/.ssh/authorized_keys ]; then
  cp /root/.ssh/authorized_keys /home/milan/.ssh/
  chown -R milan:milan /home/milan/.ssh
  chmod 700 /home/milan/.ssh
  chmod 600 /home/milan/.ssh/authorized_keys
fi

# --- 3. Firewall (ufw) ---
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# --- 4. fail2ban ---
apt-get install -y -qq fail2ban
systemctl enable --now fail2ban

# --- 5. Node.js v24 (via NodeSource) ---
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y -qq nodejs
node --version && npm --version

# --- 6. PM2 ---
npm install -g pm2
pm2 startup systemd -u milan --hp /home/milan | tail -1 | bash
mkdir -p /var/log/pm2
chown -R milan:milan /var/log/pm2

# --- 7. NGINX ---
apt-get install -y -qq nginx
systemctl enable nginx

# --- 8. Certbot (Let's Encrypt) ---
apt-get install -y -qq certbot python3-certbot-nginx

# --- 9. Deploy folders ---
mkdir -p /var/www/autouniverse/{aucore,autopijaca,autodelovi,driver,garage,landing}
mkdir -p /var/www/tradesmanplaybook
mkdir -p /var/backups/aucore /var/backups/autopijaca /var/backups/autodelovi
chown -R milan:milan /var/www/autouniverse /var/www/tradesmanplaybook /var/backups

echo ""
echo "=== Bootstrap završen ==="
echo "Sledeći koraci (Sesija 2):"
echo "  1. git clone https://github.com/plocicmilan/AUTOUNIVERSE.git /var/www/autouniverse/repo"
echo "  2. Konfiguriši NGINX (infra/nginx-autouniverse.conf)"
echo "  3. certbot --nginx -d autouniverse.rs -d www.autouniverse.rs -d hub.autouniverse.rs -d autopijaca.autouniverse.rs -d autodelovi.autouniverse.rs -d garage.autouniverse.rs -d driver.autouniverse.rs -d tradesmanplaybook.com -d www.tradesmanplaybook.com"
echo "  4. pm2 start /var/www/autouniverse/repo/ecosystem.config.js --env production"
echo "  5. pm2 save"
