#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Sauvegarde automatisée de la base PostgreSQL de production.
#
# Usage (serveur) :
#   chmod +x backend/scripts/backupDatabase.sh
#   ./backend/scripts/backupDatabase.sh
#
# Cron recommandé (tous les jours à 4h du matin, heure creuse) :
#   crontab -e
#   0 4 * * * /var/www/pronix/backend/scripts/backupDatabase.sh >> /var/log/fpronix-backup.log 2>&1
#
# Comportement :
#   - Lit DATABASE_URL depuis backend/.env (même source que l'app)
#   - Dump compressé (pg_dump -Fc) horodaté dans BACKUP_DIR
#   - Rotation : supprime automatiquement les dumps de plus de RETENTION_DAYS
#   - Écrit dans le log de sortie standard — redirigez-le vers un fichier via cron
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$BACKEND_DIR/.env"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/fpronix}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [ ! -f "$ENV_FILE" ]; then
  echo "[backup] ❌ Fichier .env introuvable : $ENV_FILE" >&2
  exit 1
fi

# Extrait DATABASE_URL sans sourcer tout le fichier (évite d'exécuter du code
# arbitraire si .env contient autre chose que des affectations simples)
DATABASE_URL="$(grep -m1 '^DATABASE_URL=' "$ENV_FILE" | cut -d'=' -f2- | tr -d '"'"'"'')"

if [ -z "$DATABASE_URL" ]; then
  echo "[backup] ❌ DATABASE_URL introuvable dans $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/fpronix_${TIMESTAMP}.dump"

echo "[backup] ▶ Démarrage — $(date)"
echo "[backup]   Destination : $DUMP_FILE"

if pg_dump --format=custom --file="$DUMP_FILE" "$DATABASE_URL"; then
  SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
  echo "[backup] ✅ Dump réussi ($SIZE)"
else
  echo "[backup] ❌ Échec de pg_dump" >&2
  rm -f "$DUMP_FILE"
  exit 1
fi

# ─── Rotation : supprime les dumps plus vieux que RETENTION_DAYS ─────────────
DELETED=$(find "$BACKUP_DIR" -name 'fpronix_*.dump' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
echo "[backup] 🧹 Rotation : $DELETED ancien(s) dump(s) supprimé(s) (> ${RETENTION_DAYS}j)"

echo "[backup] ▶ Terminé — $(date)"
