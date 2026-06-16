#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ÉTAPE 3 — Configuration Nginx + SSL (Let's Encrypt)
# À exécuter UNE SEULE FOIS, après avoir pointé ton domaine vers le VPS
# ═══════════════════════════════════════════════════════════════════
# AVANT : pointe api.VOTRE_DOMAINE.com → IP de ton VPS (dans Cloudflare)
# !! MODIFIER CES VALEURS AVANT D'EXÉCUTER !!
set -e

DOMAIN="VOTRE_DOMAINE.com"          # ex: statfoot.com
API_SUBDOMAIN="api.${DOMAIN}"       # ex: api.statfoot.com
EMAIL="VOTRE_EMAIL@gmail.com"       # email pour Let's Encrypt (alertes expiration)
BACKEND_PORT=5000

echo "═══════════════════════════════════════"
echo "  StatFoot — Setup Nginx + SSL"
echo "  API : https://${API_SUBDOMAIN}"
echo "═══════════════════════════════════════"

# ── 1. Config Nginx pour l'API ─────────────────────────────────────
echo "[1/3] Création de la config Nginx..."
cat > /etc/nginx/sites-available/statfoot-api <<NGINX
server {
    listen 80;
    server_name ${API_SUBDOMAIN};

    # Limite la taille des requêtes (protection)
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 30s;
    }

    # Health check sans log
    location /api/health {
        proxy_pass http://127.0.0.1:${BACKEND_PORT}/api/health;
        access_log off;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/statfoot-api /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ── 2. Certificat SSL via Certbot ─────────────────────────────────
echo "[2/3] Génération du certificat SSL..."
certbot --nginx -d "${API_SUBDOMAIN}" --non-interactive --agree-tos -m "${EMAIL}"

# ── 3. Renouvellement automatique ─────────────────────────────────
echo "[3/3] Activation du renouvellement automatique..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "✅ Nginx + SSL configurés !"
echo ""
echo "Ton API est accessible sur : https://${API_SUBDOMAIN}"
echo ""
echo "Prochaine étape : bash deploy.sh  (pour déployer le code)"
