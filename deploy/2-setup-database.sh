#!/bin/bash
# ===================================================================
# ETAPE 2 - Creation de la base de donnees PostgreSQL
# A executer UNE SEULE FOIS apres le setup serveur
# ===================================================================
set -e

DB_NAME="pronix_prod"
DB_USER="pronix"
DB_PASS="CHANGE_MOI_MOT_DE_PASSE_FORT"  # voir IDENTIFIANTS-HETZNER.md pour la vraie valeur en production

echo "==========================================="
echo "  Pronix - Setup base de donnees"
echo "==========================================="

echo "[1/2] Creation de l'utilisateur et de la base..."
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

echo "[2/2] Verification de la connexion..."
PGPASSWORD="${DB_PASS}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT version();" | head -3

echo ""
echo "Base de donnees creee avec succes !"
echo ""
echo "Chaine de connexion :"
echo "  DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}\""
