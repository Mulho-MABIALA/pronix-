#!/bin/bash
# ===================================================================
# Installation des sauvegardes automatiques (à lancer UNE fois, en root)
#   sudo bash /var/www/pronix/deploy/setup-backups.sh
# ===================================================================
set -euo pipefail

DEPLOY_DIR="/var/www/pronix/deploy"
PASSPHRASE_FILE="/root/.pronix-backup-passphrase"

echo "[1/4] Outils nécessaires (client PostgreSQL, GPG, rclone)…"
apt-get update -qq
apt-get install -y -qq postgresql-client gnupg rclone >/dev/null

echo "[2/4] Phrase de chiffrement des sauvegardes…"
if [ ! -f "$PASSPHRASE_FILE" ]; then
  openssl rand -base64 48 > "$PASSPHRASE_FILE"
  chmod 600 "$PASSPHRASE_FILE"
  echo ""
  echo "  ============================================================"
  echo "  IMPORTANT — Recopiez cette phrase dans votre gestionnaire de"
  echo "  mots de passe MAINTENANT. Sans elle, les sauvegardes sont"
  echo "  illisibles (y compris si le serveur est perdu) :"
  echo ""
  echo "    $(cat "$PASSPHRASE_FILE")"
  echo "  ============================================================"
  echo ""
  read -r -p "Appuyez sur Entrée une fois la phrase sauvegardée…"
else
  echo "  Phrase déjà présente, conservée."
fi

echo "[3/4] Planification chaque nuit à 3h30…"
chmod 700 "$DEPLOY_DIR/backup-db.sh" "$DEPLOY_DIR/restore-db.sh"
cat > /etc/cron.d/pronix-backup <<CRON
# Sauvegarde quotidienne de la base fpronix (voir deploy/backup-db.sh)
30 3 * * * root ${DEPLOY_DIR}/backup-db.sh >> /var/log/pronix-backup.log 2>&1
CRON
chmod 644 /etc/cron.d/pronix-backup

echo "[4/4] Première sauvegarde de test…"
"$DEPLOY_DIR/backup-db.sh"

echo ""
echo "Sauvegardes installées."
echo "Étape suivante (copie hors serveur) : rclone config  → créer un remote nommé « pronix-backup »"
