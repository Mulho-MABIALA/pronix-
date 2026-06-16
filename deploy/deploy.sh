#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SCRIPT DE DÉPLOIEMENT — À utiliser à chaque mise à jour du code
# Exécuter depuis le serveur dans le dossier /var/www/statfoot/backend
# ═══════════════════════════════════════════════════════════════════
# Usage (depuis le serveur) :
#   cd /var/www/statfoot
#   git pull origin main
#   bash deploy/deploy.sh
set -e

APP_DIR="/var/www/statfoot"
BACKEND_DIR="${APP_DIR}/backend"

echo "═══════════════════════════════════════"
echo "  StatFoot — Déploiement"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"

# ── 1. Récupérer la dernière version du code ───────────────────────
echo "[1/5] Pull des dernières modifications..."
cd "${APP_DIR}"
git pull origin main

# ── 2. Installer les dépendances backend ──────────────────────────
echo "[2/5] Installation des dépendances..."
cd "${BACKEND_DIR}"
npm ci --omit=dev

# ── 3. Générer le client Prisma ────────────────────────────────────
echo "[3/5] Génération du client Prisma..."
npx prisma generate

# ── 4. Migrations base de données ─────────────────────────────────
echo "[4/5] Application des migrations..."
npx prisma migrate deploy

# ── 5. Redémarrer le backend via PM2 ──────────────────────────────
echo "[5/5] Redémarrage du backend..."
if pm2 list | grep -q "statfoot-api"; then
    pm2 reload statfoot-api --update-env
else
    pm2 start "${APP_DIR}/backend/ecosystem.config.js"
fi
pm2 save

echo ""
echo "✅ Déploiement terminé !"
pm2 status statfoot-api
