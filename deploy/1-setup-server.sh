#!/bin/bash
# ===================================================================
# ETAPE 1 - Configuration initiale du serveur Hetzner (Ubuntu 24.04+)
# A executer UNE SEULE FOIS en tant que root apres la creation du VPS
# ===================================================================
# Usage : bash 1-setup-server.sh
set -e

echo "==========================================="
echo "  Pronix - Setup serveur Hetzner"
echo "==========================================="

# -- 1. Mise a jour systeme --------------------------------------------
echo "[1/8] Mise a jour du systeme..."
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common ufw fail2ban

# -- 2. Node.js 20 LTS ---------------------------------------------------
echo "[2/8] Installation de Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
echo "  Node: $(node -v)  |  npm: $(npm -v)"

# -- 3. PM2 (gestionnaire de processus) ----------------------------------
echo "[3/8] Installation de PM2..."
npm install -g pm2
pm2 startup systemd -u root --hp /root || true

# -- 4. PostgreSQL 16 -----------------------------------------------------
echo "[4/8] Installation de PostgreSQL 16..."
apt install -y postgresql postgresql-contrib

# -- 5. Nginx --------------------------------------------------------------
echo "[5/8] Installation de Nginx..."
apt install -y nginx
systemctl enable nginx

# -- 6. Certbot (SSL Let's Encrypt) ----------------------------------------
echo "[6/8] Installation de Certbot..."
apt install -y certbot python3-certbot-nginx

# -- 7. Firewall (UFW) ------------------------------------------------------
echo "[7/8] Configuration du pare-feu..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# -- 8. Dossier de l'application ---------------------------------------------
echo "[8/8] Creation du dossier /var/www/pronix..."
mkdir -p /var/www/pronix
echo ""
echo "Serveur configure avec succes !"
echo ""
echo "Prochaine etape : bash 2-setup-database.sh"
