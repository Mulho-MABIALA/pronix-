# Stratégie Marketing 12 mois — Pronix
Version 1.1 — Juin 2026

---

## 1. Résumé exécutif

**3 grands paris :**

1. Devenir la référence foot mondiale francophone — le seul site avec données temps réel + communauté tipsters transparente, avant la Coupe du Monde 2026.
2. Convertir l'audience gratuite en abonnés — objectif 200 abonnés payants à 12 mois, autofinançant les coûts serveur et API.
3. Construire la marque sur WhatsApp et Facebook — les deux canaux où vivent les 18-35 ans francophones qui parlent foot.

**Priorités 90 jours :**

- Lancer les réseaux sociaux (Facebook + WhatsApp broadcast)
- Configurer FedaPay pour accepter les premiers abonnés (Wave, Orange Money, MTN, Visa/MC)
- Publier du contenu quotidien autour du Mondial 2026 (jackpot d'audience)

**Objectif 12 mois :**

- 5 000 visiteurs/mois organiques
- 200 abonnés payants (~1 798 USD MRR)
- 15+ tipsters actifs vérifiés sur la plateforme

---

## 2. Cadre stratégique

### Positionnement
"Les stats pour décider, la communauté pour confirmer" — pas un site de pronostics qui promet des gains, mais l'outil de référence pour les fans de foot qui veulent analyser avec de vraies données.

### ICP (client idéal)

| Profil | Détail |
|---|---|
| Âge | 18–35 ans, urbain, francophone (Afrique de l'Ouest, France, Canada francophone) |
| Comportement | Suit la Premier League, CL, CAN — discute foot sur WhatsApp quotidiennement |
| Douleur | Sites européens peu accessibles, pas de communauté locale fiable, contenu peu personnalisé |
| Motivation premium | Accéder aux stats avancées + voir les pronostics des tipsters avant le match |

### Voix de marque
- **Ton** : Directe, passionnée, honnête — parle comme un ami qui s'y connaît
- **Jamais** : Promesses de gains, langage bookmaker, jargon financier
- **Toujours** : Mention légale discrète (pas de conseil financier, jeu responsable)

---

## 3. État actuel (scored)

| Dimension | Score /5 | Commentaire |
|---|---|---|
| Produit | 4/5 | V1 opérationnelle, données réelles, auth + FedaPay à finaliser |
| Acquisition | 1/5 | Aucune présence sociale, aucun SEO en place |
| Activation | 2/5 | Onboarding basique, pas d'email de bienvenue |
| Rétention | 1/5 | Pas de lifecycle email, pas de push |
| Référral | 1/5 | Aucun mécanisme en place |
| Revenu | 2/5 | Plan Premium défini, FedaPay non encore activé |
| Ops marketing | 1/5 | Pas d'analytics, pas d'outil email |

**Contrainte principale :** budget bootstrappé (quasi zéro cash marketing), 1 fondateur, pas d'équipe dédiée. Toute la stratégie doit être exécutable seul, gratuitement ou quasi-gratuitement.

---

## 4. Acquisition — Comment les inconnus deviennent visiteurs

### Canaux retenus

#### A. Contenu WhatsApp (Now — semaine 1)
**Pourquoi :** Canal numéro 1 en Afrique de l'Ouest pour partager le foot. Coût zéro. Viral naturel.

**Tactique :**
- Créer un groupe WhatsApp broadcast "Pronix — Stats du Jour" (250 membres max par groupe)
- Publier chaque soir : score + 3 stats clés du match du jour (tiré de la plateforme)
- Lien vers la plateforme en bas de chaque message
- Viser 3 groupes broadcast en 90 jours → 750 abonnés WhatsApp

**Format de contenu :**
```
⚽ PSG 2 - 1 Real Madrid
📊 Stats clés :
• Possession : 58% PSG
• Tirs cadrés : 6 vs 3
• xG : 1.8 vs 0.9
🔗 Analyse complète sur pronix.com
```

#### B. Facebook Page (Now — semaine 1)
**Pourquoi :** Facebook reste dominant chez les 25-35 ans en Afrique de l'Ouest et diaspora francophone.

**Tactique :**
- Page "Pronix" — publier 1x/jour
- 3 types de posts : Stats avant-match (veille), Résumé stats post-match, "Tip du tipster" (teaser — résultat visible sur la plateforme)
- Rejoindre et participer activement dans 5+ groupes foot francophones — partager les analyses sans spammer
- Objectif 1 000 abonnés page à 3 mois

#### C. SEO (Mois 2–3)
**Pourquoi :** Recherches comme "score Premier League aujourd'hui", "classement Ligue 1", "statistiques CAN" — personne ne les couvre en français depuis l'Afrique.

**Tactique :**
- Créer des pages statiques optimisées par compétition : `/ligue1`, `/premier-league`, `/can-2025`
- Balises title : "Classement Premier League 2025-26 | Pronix"
- Inscription Google Search Console dès semaine 2
- 1 article blog/semaine autour du Mondial 2026 (Juin–Juillet 2026 = momentum maximal)

#### D. Mondial 2026 — Fenêtre d'acquisition exceptionnelle (Juin–Juillet 2026)
**C'est maintenant.** Le Mondial démarre en juin 2026. C'est l'opportunité d'acquisition la plus large de la décennie pour ce projet.

**Tactique spéciale Mondial :**
- Page dédiée `/coupe-du-monde-2026` avec tous les matchs + stats en temps réel (ID FotMob 894790 confirmé)
- Post Facebook/WhatsApp avant chaque match avec les stats des adversaires
- Hashtags : `#Mondial2026`, `#Pronix`, `#LionsDeLaTeranga`
- Viser 500 nouveaux visiteurs/semaine pendant la phase de groupes

#### E. Canaux à activer à 6 mois (si traction confirmée)
- TikTok — courtes vidéos "3 stats qui expliquent ce match" (Canva)
- YouTube Shorts — même format
- Partenariats avec micro-influenceurs foot francophones (5K–50K abonnés)

### Canaux skippés (et pourquoi)

| Canal | Raison |
|---|---|
| Google Ads / Meta Ads | Budget zéro — pas avant 6 mois avec premiers revenus |
| LinkedIn | Hors cible |
| Podcast | Ressources de production trop lourdes au stade 1 |
| PR presse écrite | Pas de newsroom pour une appli early-stage |

---

## 5. Activation — De visiteur à utilisateur engagé

### Problèmes à corriger en priorité

**1. Email de bienvenue (Mois 1)**
Dès inscription, envoyer un email automatique :
- Outil : Brevo (gratuit jusqu'à 300 emails/jour) ou Resend (déjà dans la stack)
- Contenu : "Voici les 3 choses à faire sur Pronix" + lien vers les tipsters

**2. Onboarding in-app (Mois 2)**
- Ajouter une modale de bienvenue : "Choisis tes compétitions favorites" → personnalise le feed
- Objectif : réduire le taux de rebond des nouveaux inscrits

**3. Paywall clair (Mois 1 — priorité absolue)**
- Le bouton "S'abonner Premium" doit être visible avant que FedaPay soit finalisé
- Page `/premium` expliquant les avantages concrets (accès tipsters, stats avancées, alertes)
- CTA : **"Rejoindre — $8.99/mois"**

### Tunnel d'activation cible
```
Visiteur → Inscription gratuite → Email bienvenue →
Explore 3 jours → Voit le contenu premium bloqué →
Page abonnement → Paiement FedaPay (Wave / Orange Money / Visa)
```

---

## 6. Rétention — Garder les utilisateurs actifs

### Lifecycle email (Mois 2)

| Trigger | Email | Contenu |
|---|---|---|
| J+3 sans retour | Re-engagement | "Match ce soir — voici les stats" |
| J+7 | Tip hebdomadaire | "Le tipster le mieux classé cette semaine" |
| J+28 | Récapitulatif mensuel | "Tes 5 matchs les plus analysés" |
| Avant fin abonnement | Renouvellement | "Ton abonnement expire dans 3 jours" |

Outil recommandé : **Brevo** (plan gratuit suffisant au stade 1)

### Contenu de rétention (hebdomadaire)
- "Stats de la semaine" — infographie partageable (Canva)
- Classement tipsters — mis à jour chaque lundi, moteur d'engagement fort
- Alerte match Lions de la Teranga — push/email avant chaque match du Sénégal

---

## 7. Référral — Les utilisateurs amènent d'autres utilisateurs

**Mécanique 1 — Partage viral organique (Mois 1)**
Bouton "Partager sur WhatsApp" sur chaque fiche match → génère un message pré-rempli avec les stats et le lien Pronix. C'est la mécanique la plus puissante dans le contexte francophone.

**Mécanique 2 — Programme tipster (Mois 3)**
Les tipsters ont intérêt à promouvoir leur profil public → ils ramènent leur audience.
- Donner un lien personnel `/tipster/nom` à partager
- Les meilleurs tipsters = ambassadeurs naturels (ils veulent montrer leur classement)

**Mécanique 3 — "Invite un ami" (Mois 6)**
- Offrir 1 semaine gratuite à l'inviteur et à l'invité
- À activer seulement quand la base atteint ~100 abonnés

---

## 8. Revenu — Monétisation

### Plan actuel

| Plan | Prix mensuel |
|---|---|
| FREE | Gratuit |
| PREMIUM | **$8.99/mois** |

Un seul plan payant, simple et universel. Accessible via **FedaPay** : Wave, Orange Money, MTN, Carte Visa/Mastercard.

### Objectifs revenus

| Mois | Abonnés | MRR estimé |
|---|---|---|
| M3 | 20 | ~$180 |
| M6 | 80 | ~$720 |
| M9 | 150 | ~$1 350 |
| M12 | 200 | ~$1 798 |

**Action bloquante — à faire cette semaine :** Finaliser l'activation du compte FedaPay (upload passeport + RIB). Sans paiement, il n'y a pas de revenu. C'est la priorité numéro 1.

### Upsell futur (M6+)
- Pack "Analyse avant-match" — rapport PDF hebdomadaire (génération automatisée)
- Extension Côte d'Ivoire / Togo — nouveau marché, même stack

---

## 9. Roadmap 90 jours

### Semaines 1–2 : Débloquer

| Action | AARRR | Owner |
|---|---|---|
| Finaliser activation FedaPay | Revenu | Fondateur |
| Créer page Facebook Pronix + 1er post | Acquisition | Fondateur |
| Créer 3 groupes WhatsApp broadcast | Acquisition | Fondateur |
| Configurer Brevo + email bienvenue | Activation | Fondateur |
| Inscrire sur Google Search Console | Acquisition | Fondateur |

### Semaines 3–4 : Fondations

| Action | AARRR | Owner |
|---|---|---|
| Page /premium convaincante avec CTA $8.99 | Activation/Revenu | Fondateur |
| Rejoindre 5+ groupes Facebook foot francophones | Acquisition | Fondateur |
| 1er article blog Mondial 2026 | Acquisition | Fondateur |
| Bouton "Partager sur WhatsApp" in-app | Référral | Fondateur |
| Recruter 3 premiers tipsters (contacts directs) | Rétention | Fondateur |

### Semaines 5–8 : Vélocité

| Action | AARRR | Owner |
|---|---|---|
| Contenu quotidien pendant Mondial 2026 | Acquisition | Fondateur |
| Page dédiée /coupe-du-monde-2026 | Acquisition/SEO | Fondateur |
| Email hebdomadaire "Stats de la semaine" | Rétention | Fondateur |
| Premiers 20 abonnés payants | Revenu | Fondateur |
| Classement tipsters publié chaque lundi | Rétention | Fondateur |

### Semaines 9–12 : Composer

| Action | AARRR | Owner |
|---|---|---|
| Analyse des premiers retours (Google Analytics) | Tous | Fondateur |
| Test TikTok (1 vidéo/semaine) | Acquisition | Fondateur |
| Email de re-engagement pour inactifs | Rétention | Fondateur |
| Page /ligue1 + contenu compétitions | Acquisition | Fondateur |

---

## 10. Outlook 12 mois

| Trimestre | Milestone clé | Débloqué par |
|---|---|---|
| Q3 2026 | 50 abonnés payants, FedaPay actif | Mondial 2026 + paiement actif |
| Q4 2026 | 120 abonnés, 10 tipsters actifs | Communauté + CAN momentum |
| Q1 2027 | 200 abonnés, SEO organique visible | Contenu blog + Google Search Console |
| Q2 2027 | Extension CI/Togo, 300 abonnés | Si MRR > $1 500 = autofinancement |

---

## 11. Stack opérationnel marketing

| Outil | Usage | Coût |
|---|---|---|
| Brevo | Emails lifecycle + transactionnel | Gratuit (300/j) |
| Google Analytics 4 | Trafic, conversion, sources | Gratuit |
| Google Search Console | SEO, indexation | Gratuit |
| Canva | Visuels Facebook/WhatsApp | Gratuit |
| WhatsApp Business | Broadcast + lien bio | Gratuit |
| Facebook Pages | Acquisition organique | Gratuit |
| **FedaPay** | Paiement abonnements (Wave, OM, MTN, Visa) | Commission % |

**Budget marketing mois 1–6 :** quasi zéro (temps fondateur + outils gratuits)

**Budget marketing mois 7–12 :** Si MRR > $1 000 → allouer 20% (~$200/mois) pour tester Meta Ads ciblé francophones, 18-35 ans, football.

---

## 12. Banque d'idées tactiques

| Idée | AARRR | Statut |
|---|---|---|
| WhatsApp broadcast quotidien | Acquisition | Now |
| Page Facebook Pronix | Acquisition | Now |
| SEO pages compétitions | Acquisition | Now |
| Contenu Mondial 2026 | Acquisition | Now — urgent |
| Email de bienvenue | Activation | Now |
| Page premium $8.99 convaincante | Activation | Now |
| Bouton "Partager WhatsApp" | Référral | Now |
| Classement tipsters hebdo | Rétention | M2 |
| Email hebdo "stats de la semaine" | Rétention | M2 |
| TikTok courtes vidéos stats | Acquisition | M3 |
| Partenariat micro-influenceurs | Acquisition | M4 |
| Programme "Invite un ami" | Référral | M6 |
| Extension CI/Togo | Acquisition | M9+ |
| Pack "Rapport PDF hebdo" | Revenu | M6+ |
| Meta Ads francophones foot | Acquisition | M7+ si budget |
| YouTube Shorts | Acquisition | M4 |
| Google Ads "stats foot" | Acquisition | Skip (budget) |
| PR presse écrite | Acquisition | Skip (stade 1) |
| Podcast | Acquisition | Skip (ressources) |

---

## 13. Mesure, décisions ouvertes, RACI

### Métrique Nord-Étoile
**Abonnés payants actifs** — tout le reste est un indicateur avancé.

### Indicateurs par stade

| Stage | Indicateur | Cible M3 | Cible M12 |
|---|---|---|---|
| Acquisition | Visiteurs uniques/mois | 500 | 5 000 |
| Activation | Taux inscription (visiteurs → compte) | 5% | 10% |
| Rétention | Taux retour J+7 | 20% | 40% |
| Référral | Partages WhatsApp/semaine | 50 | 500 |
| Revenu | Abonnés payants | 20 | 200 |

### Décisions ouvertes (bloquantes)
1. **FedaPay** — compte non encore activé → zéro revenu possible. Priorité 1 cette semaine.
2. **SMTP configuré ?** — Emails lifecycle impossibles sans SMTP prod
3. **Nom de domaine** — SEO et crédibilité impossibles sans domaine + HTTPS
4. **Cloudflare Tunnel** — solution temporaire pour connecter frontend Vercel au backend Hetzner sans domaine

### RACI (contexte solo fondateur)
Tout est R=Fondateur, A=Fondateur. À mesure que les revenus arrivent :
- **Premier soutien à recruter :** community manager part-time pour le contenu quotidien (~$50/mois)
- **Deuxième :** développeur freelance pour accélérer les features si traction confirmée
