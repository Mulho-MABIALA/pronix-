#!/bin/bash
# ===================================================================
# Restauration d'une sauvegarde fpronix
# ===================================================================
# Par défaut, restaure dans une base de TEST séparée (pronix_restore_test),
# sans toucher à la production : sert à vérifier qu'une sauvegarde est
# vraiment utilisable (à faire une fois par mois).
#
#   sudo /var/www/pronix/deploy/restore-db.sh                      → dernière sauvegarde, base de test
#   sudo /var/www/pronix/deploy/restore-db.sh fichier.dump.gpg     → fichier précis, base de test
#   sudo /var/www/pronix/deploy/restore-db.sh fichier.dump.gpg --production
#        → ÉCRASE la base de production (après une perte de données).
#          Arrêter l'API avant : pm2 stop pronix-api
# ===================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/pronix"
PASSPHRASE_FILE="/root/.pronix-backup-passphrase"
ENV_FILE="/var/www/pronix/backend/.env"
TEST_DB="pronix_restore_test"

FILE="${1:-$(ls -1t "$BACKUP_DIR"/fpronix_*.dump.gpg 2>/dev/null | head -1)}"
MODE="${2:-test}"
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "Aucune sauvegarde trouvée (${FILE:-vide})"; exit 1; }

TMP_DUMP="$(mktemp /tmp/pronix_restore_XXXX.dump)"
trap 'rm -f "$TMP_DUMP"' EXIT

echo "Déchiffrement de $FILE…"
gpg --batch --yes --quiet --decrypt --passphrase-file "$PASSPHRASE_FILE" --output "$TMP_DUMP" "$FILE"

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
PROD_URL="${DATABASE_URL%%\?*}"
PROD_DB="${PROD_URL##*/}"

if [ "$MODE" = "--production" ]; then
  echo "⚠️  Vous allez ÉCRASER la base de production « ${PROD_DB} » avec cette sauvegarde."
  read -r -p "Tapez RESTAURER pour confirmer : " CONFIRM
  [ "$CONFIRM" = "RESTAURER" ] || { echo "Annulé."; exit 1; }
  pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$PROD_URL" "$TMP_DUMP"
  echo "Production restaurée. Relancez l'API : pm2 restart pronix-api"
else
  echo "Restauration dans la base de test « ${TEST_DB} »…"
  sudo -u postgres dropdb --if-exists "$TEST_DB"
  sudo -u postgres createdb "$TEST_DB"
  sudo -u postgres pg_restore --no-owner --no-privileges --dbname="$TEST_DB" "$TMP_DUMP"
  echo "Contrôle :"
  sudo -u postgres psql -d "$TEST_DB" -t -c "SELECT 'utilisateurs : ' || count(*) FROM users UNION ALL SELECT 'paiements : ' || count(*) FROM payments UNION ALL SELECT 'matchs : ' || count(*) FROM matches;"
  sudo -u postgres dropdb "$TEST_DB"
  echo "Sauvegarde valide ✔ (base de test supprimée)"
fi
