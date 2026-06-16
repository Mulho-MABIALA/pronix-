#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ÉTAPE 2 — Création de la base de données PostgreSQL
# À exécuter UNE SEULE FOIS après le setup serveur
# ═══════════════════════════════════════════════════════════════════
# AVANT d'exécuter : modifie DB_PASS ci-dessous avec un mot de passe fort
set -e

# ── !! MODIFIER CES VALEURS AVANT D'EXÉCUTER !! ──────────────────
DB_NAME="statfoot_prod"
DB_USER="statfoot"
DB_PASS="CHANGE_MOI_MOT_DE_PASSE_FORT"  # ← remplace ici
# ──────────────────────────────────────────────────────────────────

echo "═══════════════════════════════════════"
echo "  StatFoot — Setup base de données"
echo "═══════════════════════════════════════"

echo "[1/2] Création de l'utilisateur et de la base..."
sudo -u postgres psql <<SQL
-- Crée l'utilisateur
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

-- Crée la base
CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "[2/2] Vérification de la connexion..."
PGPASSWORD="${DB_PASS}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT version();" | head -3

echo ""
echo "✅ Base de données créée avec succès !"
echo ""
echo "Chaîne de connexion à mettre dans .env :"
echo "  DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}\""
echo ""
echo "Prochaine étape : bash 3-setup-nginx.sh"
