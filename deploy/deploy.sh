#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# SCRIPT DE DÉPLOIEMENT — À utiliser à chaque mise à jour du code
# Exécuter depuis le serveur dans le dossier /var/www/pronix/backend
# ═══════════════════════════════════════════════════════════════════
# Usage (depuis le serveur) :
#   cd /var/www/pronix
#   git pull origin main
#   bash deploy/deploy.sh
set -e

APP_DIR="/var/www/pronix"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"

echo "═══════════════════════════════════════"
echo "  Pronix — Déploiement"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"

# ── 1. Récupérer la dernière version du code ───────────────────────
echo "[1/6] Pull des dernières modifications..."
cd "${APP_DIR}"
git pull origin main

# ── 2. Installer les dépendances backend ──────────────────────────
echo "[2/6] Installation des dépendances..."
cd "${BACKEND_DIR}"
npm ci --omit=dev

# ── 3. Générer le client Prisma ────────────────────────────────────
echo "[3/6] Génération du client Prisma..."
npx prisma generate

# ── 4. Migrations base de données ─────────────────────────────────
echo "[4/6] Application des migrations..."
npx prisma migrate deploy

# ── 5. Build frontend — ATOMIQUE (jamais de dossier dist vide servi) ─
# Vite vide tout le dossier "dist" avant de le reconstruire. Si on
# construisait directement dans "dist" (servi en direct par nginx),
# n'importe qui chargeant le site pendant ces quelques secondes verrait
# des 404 sur tous les fichiers → écran noir. On construit donc dans
# un dossier à part puis on bascule en un seul "mv" quasi instantané.
echo "[5/6] Build du frontend (atomique)..."
cd "${FRONTEND_DIR}"
npm ci
rm -rf dist_new
npm run build -- --outDir dist_new
rm -rf dist_old
if [ -d dist ]; then mv dist dist_old; fi
mv dist_new dist
rm -rf dist_old

# ── 6. Redémarrer le backend via PM2 ──────────────────────────────
echo "[6/6] Redémarrage du backend..."
if pm2 list | grep -q "pronix-api"; then
    pm2 reload pronix-api --update-env
else
    pm2 start "${APP_DIR}/backend/ecosystem.config.js"
fi
pm2 save

echo ""
echo "✅ Déploiement terminé !"
pm2 status pronix-api
