#!/bin/bash
# ===================================================================
# Sauvegarde quotidienne de la base fpronix (PostgreSQL)
# ===================================================================
# - Copie complète de la base (pg_dump, format compressé)
# - Chiffrée (GPG, AES-256) : elle contient emails, téléphones, paiements
# - Vérifiée (une sauvegarde illisible est signalée comme un échec)
# - Gardée 14 jours sur le serveur
# - Envoyée HORS du serveur (rclone : Google Drive, Backblaze, Hetzner
#   Storage Box…) — une sauvegarde qui reste sur le même disque ne protège
#   pas d'une panne ou d'une suppression du serveur.
#
# Installation : voir deploy/setup-backups.sh
# Lancement manuel : sudo /var/www/pronix/deploy/backup-db.sh
# ===================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/pronix}"
ENV_FILE="${APP_DIR}/backend/.env"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/pronix}"
PASSPHRASE_FILE="${PASSPHRASE_FILE:-/root/.pronix-backup-passphrase}"   # créé par setup-backups.sh
RCLONE_REMOTE="${RCLONE_REMOTE-pronix-backup:fpronix-backups}"  # vide = pas d'envoi externe
KEEP_DAYS=14
HEALTHCHECK_URL="${HEALTHCHECK_URL:-}"  # optionnel : alerte si la sauvegarde ne passe pas (healthchecks.io)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
fail() {
  log "ÉCHEC : $*"
  [ -n "$HEALTHCHECK_URL" ] && curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}/fail" >/dev/null 2>&1 || true
  exit 1
}

[ -f "$ENV_FILE" ] || fail "fichier $ENV_FILE introuvable"
[ -f "$PASSPHRASE_FILE" ] || fail "phrase de chiffrement $PASSPHRASE_FILE introuvable (lancer setup-backups.sh)"

# DATABASE_URL lue dans le .env du backend (sans l'afficher). Les paramètres
# ajoutés pour Prisma (?schema=public…) ne sont pas compris par pg_dump.
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
[ -n "$DATABASE_URL" ] || fail "DATABASE_URL absente de $ENV_FILE"
PG_URL="${DATABASE_URL%%\?*}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date '+%Y-%m-%d_%H%M')"
DUMP_FILE="${BACKUP_DIR}/fpronix_${STAMP}.dump"
ENC_FILE="${DUMP_FILE}.gpg"
trap 'rm -f "$DUMP_FILE"' EXIT   # la copie NON chiffrée ne reste jamais sur le disque

log "Sauvegarde de la base…"
pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$DUMP_FILE" "$PG_URL" \
  || fail "pg_dump a échoué"

# Vérification : la sauvegarde doit être lisible et contenir les tables clés
pg_restore --list "$DUMP_FILE" > "$BACKUP_DIR/.toc.txt" 2>/dev/null || fail "sauvegarde illisible"
for table in users payments subscriptions matches; do
  grep -qE "TABLE DATA public ${table}( |$)" "$BACKUP_DIR/.toc.txt" || fail "table ${table} absente de la sauvegarde"
done
rm -f "$BACKUP_DIR/.toc.txt"

log "Chiffrement…"
gpg --batch --yes --quiet --symmetric --cipher-algo AES256 \
  --passphrase-file "$PASSPHRASE_FILE" --output "$ENC_FILE" "$DUMP_FILE" \
  || fail "chiffrement GPG échoué"
chmod 600 "$ENC_FILE"
SIZE="$(du -h "$ENC_FILE" | cut -f1)"
log "Sauvegarde locale OK : $ENC_FILE ($SIZE)"

# Copie hors serveur
if [ -n "$RCLONE_REMOTE" ]; then
  if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "^${RCLONE_REMOTE%%:*}:"; then
    log "Envoi hors serveur vers ${RCLONE_REMOTE}…"
    rclone copy "$ENC_FILE" "$RCLONE_REMOTE" --quiet || fail "envoi rclone échoué"
    # Côté stockage externe : 30 jours conservés
    rclone delete "$RCLONE_REMOTE" --min-age 30d --quiet || log "nettoyage distant ignoré"
    log "Copie hors serveur OK"
  else
    log "ATTENTION : rclone non configuré — sauvegarde gardée UNIQUEMENT sur ce serveur"
  fi
fi

# Rotation locale
find "$BACKUP_DIR" -name 'fpronix_*.dump.gpg' -mtime +"$KEEP_DAYS" -delete

[ -n "$HEALTHCHECK_URL" ] && curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" >/dev/null 2>&1 || true
log "Terminé."
