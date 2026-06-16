#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ÉTAPE 4 — Premier déploiement (clone + démarrage initial)
# À exécuter UNE SEULE FOIS, après les étapes 1, 2 et 3
# ═══════════════════════════════════════════════════════════════════
# AVANT : remplace REPO_URL par l'URL de ton repo GitHub
set -e

REPO_URL="https://github.com/TON_COMPTE_GITHUB/statistique_foot.git"
APP_DIR="/var/www/statfoot"

echo "═══════════════════════════════════════"
echo "  StatFoot — Premier déploiement"
echo "═══════════════════════════════════════"

# ── 1. Cloner le dépôt ────────────────────────────────────────────
echo "[1/6] Clonage du dépôt..."
git clone "${REPO_URL}" "${APP_DIR}"
cd "${APP_DIR}"

# ── 2. Créer le fichier .env production ───────────────────────────
echo "[2/6] Création du fichier .env..."
cp backend/.env.production.example backend/.env
echo ""
echo "⚠️  IMPORTANT : édite le fichier .env avant de continuer !"
echo "    nano ${APP_DIR}/backend/.env"
echo ""
echo "Presse ENTRÉE quand tu as fini d'éditer .env..."
read -r

# ── 3. Dossier de logs ────────────────────────────────────────────
echo "[3/6] Création du dossier de logs..."
mkdir -p /var/log/statfoot
chown -R root:root /var/log/statfoot

# ── 4. Installer les dépendances ──────────────────────────────────
echo "[4/6] Installation des dépendances..."
cd backend
npm ci --omit=dev

# ── 5. Prisma : générer + migrer + seeder ─────────────────────────
echo "[5/6] Initialisation de la base de données..."
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js

# ── 6. Démarrer avec PM2 ──────────────────────────────────────────
echo "[6/6] Démarrage de l'application..."
pm2 start "${APP_DIR}/backend/ecosystem.config.js" --env production
pm2 save

echo ""
echo "✅ Premier déploiement terminé !"
echo ""
pm2 status statfoot-api
echo ""
echo "Pour voir les logs en temps réel :"
echo "  pm2 logs statfoot-api"
echo ""
echo "Pour mettre à jour l'app à l'avenir :"
echo "  cd ${APP_DIR} && git pull && bash deploy/deploy.sh"
