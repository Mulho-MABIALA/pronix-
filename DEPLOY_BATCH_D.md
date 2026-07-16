# Déploiement BATCH D — Nouvelles fonctionnalités

## Contexte
Ce batch ajoute 10 nouvelles fonctionnalités :
- Combinés (coupons multi-matchs)
- Follow/Unfollow tipsters
- Commentaires sur pronostics
- Analytics / EventLog
- Portefeuille virtuel + paris simulés
- Alertes de cotes
- Stats ROI hebdomadaires
- ROI chart dans TipsterProfile
- Page /portefeuille-virtuel
- Hook useAnalytics

---

## 1. Mettre à jour le code sur le serveur

```bash
# Sur votre serveur (SSH)
cd /var/www/fpronix   # ou votre dossier de déploiement

git pull origin main
```

---

## 2. Exécuter la migration BATCH D

```bash
# Option A — Prisma migrate (recommandé en dev/staging)
cd backend
npx prisma migrate dev --name batch_d_new_features

# Option B — SQL direct (production sans downtime)
psql $DATABASE_URL -f prisma/migrations/batch_d_new_features.sql
```

> ⚠️ Si la commande `psql` donne "already exists" pour certaines tables, c'est normal grâce aux `IF NOT EXISTS`. La migration est idempotente.

---

## 3. Installer les dépendances backend (si besoin)

```bash
cd backend
npm install
```

---

## 4. Redémarrer l'API

```bash
pm2 restart pronix-api
pm2 logs pronix-api --lines 30   # vérifier qu'il n'y a pas d'erreur
```

---

## 5. Builder et déployer le frontend

```bash
cd frontend
npm install
npm run build

# Copier le build vers le dossier servi par Nginx / Apache
cp -r dist/* /var/www/fpronix/public/
# ou si vous utilisez pm2 serve :
pm2 restart pronix-front
```

---

## 6. Vérifications post-déploiement

### API Health
```bash
curl https://api.fpronix.com/api/health
# Attendu : { "success": true }
```

### Nouvelles routes
```bash
# Follow status (public)
curl https://api.fpronix.com/api/follows/<userId>/count

# Analytics log (public)
curl -X POST https://api.fpronix.com/api/analytics/log \
  -H "Content-Type: application/json" \
  -d '{"event":"match_view","entityId":"test"}'

# Wallet (auth requis)
curl https://api.fpronix.com/api/wallet/leaderboard
```

### Frontend
- `/portefeuille-virtuel` → page Wallet (simulation de paris)
- `/tipsters/:id` → bouton Follow + graphe ROI + commentaires sur les tips

---

## 7. Migration groupée (BATCH A + B + C + D ensemble)

Si vous n'avez pas encore appliqué les migrations précédentes, voici l'ordre :

```bash
# 1. BATCH A/B/C (schema Blog, News, Teams, TipsterPlan)
psql $DATABASE_URL -f prisma/migrations/batch_abc_features.sql   # si ce fichier existe
# OU via Prisma
npx prisma migrate deploy

# 2. BATCH D
psql $DATABASE_URL -f prisma/migrations/batch_d_new_features.sql
```

---

## 8. Variables d'environnement (vérification)

Assurez-vous que ces variables sont définies dans `/etc/environment` ou `.env` :

```
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<min 32 caractères>
JWT_REFRESH_SECRET=<min 32 caractères>
CLAUDE_API_KEY=sk-ant-...
FRONTEND_URL=https://fpronix.com
```

> Le serveur fait un `process.exit(1)` si `JWT_ACCESS_SECRET` est absent ou trop court — c'est la cause #1 des "erreur serveur" au login.

---

## 9. Diagnostic rapide si l'API plante

```bash
pm2 logs pronix-api --lines 50 --err
```

Erreurs fréquentes :
| Erreur | Cause | Fix |
|--------|-------|-----|
| `Cannot read properties of null (reading 'id')` | Plan FREE absent en DB | `INSERT INTO "Plan" (id, code, name, price) VALUES (gen_random_uuid(), 'FREE', 'Gratuit', 0)` |
| `JWT_ACCESS_SECRET must be at least 32 characters` | Secret trop court | Mettre une vraie clé dans `.env` |
| `relation "TipCombo" does not exist` | Migration BATCH D non appliquée | Relancer le SQL ci-dessus |
