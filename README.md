# fpronix — Plateforme Football & Pronostics

> Statistiques football en temps réel, pronostics algorithmiques + IA, communauté de tipsters.  
> Cible : francophones — Afrique de l'Ouest, Afrique centrale, Maghreb, Europe francophone.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Base de données | PostgreSQL + Prisma ORM |
| Auth | JWT + Google OAuth |
| IA | Anthropic Claude (Haiku 4.5) |
| Data football | API-Football (api-sports.io) |
| Paiements | PayTech (Wave, Orange Money, Mtn Money, Moov Money, Wizall, Free Money, Carte Bancaire) |
| Serveur | Hetzner VPS (Ubuntu, 8GB RAM, 80GB) — IP : 167.233.132.85 |
| Domaine | fpronix.com (LWS) |
| Process manager | PM2 (prévu) |
| Reverse proxy | Nginx + Let's Encrypt SSL (prévu) |

---

## Lancer le projet en local

**Backend**
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Comptes de test

| Rôle  | Email | Mot de passe |
|-------|-------|--------------|
| Admin | admin@statistiquefoot.sn | Admin@2024! |

> Créé automatiquement par `npx prisma db seed`.

---


cd /var/www/pronix/backend && npm audit fix
cd /var/www/pronix/frontend && npm audit fix

## Variables d'environnement (`backend/.env`)

```env
# Base de données
DATABASE_URL="postgresql://postgres:passer@localhost:5432/statistique_foot"

# JWT
JWT_ACCESS_SECRET="..."
JWT_REFRESH_SECRET="..."
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="30d"

# Serveur
PORT=5000
NODE_ENV="development"                # → "production" en prod
FRONTEND_URL="http://localhost:3000"  # → "https://fpronix.com" en prod

# API Football (FREE: 100 req/jour | PRO $19/mois: 7500 req/jour)
FOOTBALL_API_KEY="a9bde182b31104414a3ca745fd23b148"
FOOTBALL_API_HOST="v3.football.api-sports.io"
FOOTBALL_API_BASE_URL="https://v3.football.api-sports.io"

# Claude / Anthropic (Haiku 4.5 — ~$0.002/analyse)
ANTHROPIC_API_KEY="sk-ant-..."

# The Odds API (cotes bookmakers réelles — gratuit 500 req/mois → https://the-odds-api.com)
ODDS_API_KEY="..."

# Google OAuth
GOOGLE_CLIENT_ID="362490521978-mv57n5..."

# PayTech (Wave, Orange Money, Mtn Money, Moov Money, Wizall, Free Money, Carte Bancaire)
# — clés test → production après validation manuelle (email à contact@paytech.sn)
PAYTECH_API_KEY=""
PAYTECH_API_SECRET=""
PAYTECH_BASE_URL="https://paytech.sn/api"
PAYTECH_ENV="test"

# Email transactionnel (configurer Resend.com — gratuit 3000 mails/mois)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="fpronix <noreply@fpronix.com>"

# Web Push (VAPID)
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
```

---

## Architecture

```
fpronix.com  ──►  Nginx (Hetzner 167.233.132.85)
                    ├── /api/*  ──►  Node.js :5000 (PM2)
                    └── /*      ──►  React build (static)
```

---

## Fonctionnalités implémentées

### Données & Matchs
- [x] Sync automatique via API-Football (cron 12h + démarrage)
- [x] Sync live toutes les 30 minutes
- [x] Création dynamique des compétitions
- [x] 284+ matchs/jour (toutes compétitions mondiales)
- [x] Enrichissement lazy : lineups, H2H, blessures (premium)

### Pronostics
- [x] Algorithme statistique 1X2, Over/Under, BTTS
- [x] Fallback neutre quand DB fraîche (s'améliore avec l'historique)
- [x] Page Pronostics groupée par confiance (élevée / moyenne / faible)
- [x] Générateur de ticket optimisé (filtre marché, confiance, journée)
- [x] Export ticket PNG + texte copiable
- [x] Cotes simulées (mockOdds)

### Intelligence Artificielle (Claude Haiku 4.5)
- [x] Analyse IA par match (forme, H2H, blessures) — 5/jour/user
- [x] Agent Contenu : posts WhatsApp + Facebook (cron 7h)
- [x] Agent SEO : title/meta/intro pour pages matchs (cron 6h)
- [x] Agent Analyse : rapport hebdomadaire tipsters (cron lundi 8h)
- [x] Agent Support : questions utilisateurs

### Auth & Utilisateurs
- [x] Inscription / Connexion JWT (access 15min + refresh 30j)
- [x] Google OAuth
- [x] Rôles : USER, ADMIN
- [x] Email de bienvenue
- [x] Reset mot de passe

### Abonnements & Paiements
- [x] Plans FREE / PREMIUM ($8.99/mois)
- [x] PayTech (Wave, Orange Money, Mtn Money, Moov Money, Wizall, Free Money, Carte Bancaire)
- [x] Mode simulation pour tests dev
- [x] Webhooks paiement

### Communauté
- [x] Tips manuels des utilisateurs
- [x] Classement tipsters (taux de réussite vérifié)
- [x] Profil tipster avec historique

### Admin
- [x] Dashboard (utilisateurs, paiements, matchs, compétitions)
- [x] Console Agents IA
- [x] Gestion signalements

### Autres
- [x] SEO dynamique (title + meta par page)
- [x] Push notifications (VAPID)
- [x] Page Coupe du Monde 2026
- [x] Partage WhatsApp
- [x] Mode sombre
- [x] Design responsive mobile

---

## Reste à faire

### Haute priorité
- [x] Déploiement production Nginx + PM2 + SSL sur Hetzner (`https://fpronix.com` live)
- [x] Boîte mail `support@fpronix.com` créée sur LWS + forwarding → Gmail + Send-as Gmail
- [ ] Clés PayTech production (validation manuelle en attente — email à contact@paytech.sn)
- [ ] Email transactionnel — configurer Resend.com
- [ ] Crédits Claude — recharger console.anthropic.com
- [x] Google OAuth production — `https://fpronix.com` ajouté dans Google Console
- [x] Cotes bookmakers réelles — The Odds API intégrée (500 req/mois gratuit) — ajouter `ODDS_API_KEY` dans `.env`

### Moyenne priorité
- [ ] API-Football PRO ($19/mois) pour production

### Basse priorité
- [ ] PWA / Application mobile
- [ ] Système de parrainage
- [ ] xG, heatmaps, stats avancées

---

## Déploiement production (checklist)

```bash
# 1. Hetzner — dépendances
sudo apt update && sudo apt install nginx certbot python3-certbot-nginx nodejs npm postgresql -y
npm install -g pm2

# 2. Projet
git clone <repo> /var/www/fpronix
cd /var/www/fpronix/backend && npm install
npx prisma migrate deploy
pm2 start src/app.js --name fpronix-backend && pm2 save && pm2 startup

# 3. Frontend
cd ../frontend && npm install && npm run build
# dist/ → /var/www/fpronix/public/

# 4. SSL
sudo certbot --nginx -d fpronix.com -d www.fpronix.com
```

### Config Nginx

```nginx
server {
    listen 80;
    server_name fpronix.com www.fpronix.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name fpronix.com www.fpronix.com;

    ssl_certificate /etc/letsencrypt/live/fpronix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fpronix.com/privkey.pem;

    root /var/www/fpronix/public;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## DNS fpronix.com (LWS)

| Type | Enregistrement | Valeur |
|------|----------------|--------|
| A | @ | 167.233.132.85 (Hetzner) |
| CNAME | www | @ |
| A | mail | 213.255.195.66 (LWS mail) |
| MX | @ | 10 mail.fpronix.com |
| TXT | @ | SPF (LWS) |
| TXT | dkim._domainkey | DKIM (LWS) |

---

## Modèle économique

| Plan | Prix | Accès |
|------|------|-------|
| FREE | Gratuit | Stats de base, 2 pronostics/mois |
| PREMIUM | $8.99/mois | Tout débloqué |

Projection an 1 : 500 abonnés × $8.99 × 12 = ~$53 940

---

## Contact

- Site : https://fpronix.com
- Email : support@fpronix.com
- PayTech : paytech.sn (validation production en attente)
