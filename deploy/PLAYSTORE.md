# Publier fpronix sur le Play Store

L'app Android = le site fpronix.com affiché par Chrome en plein écran (TWA).
Aucune réécriture : chaque mise à jour du site met l'app à jour automatiquement.

**Prérequis :** le site doit être en ligne (Hetzner réactivé, dernière version déployée).

---

## 1. Fabriquer l'app (sur votre PC Windows, une seule fois)

Bubblewrap installe tout seul Java et le SDK Android au premier lancement.

```
npm install -g @bubblewrap/cli
mkdir C:\fpronix-android
cd C:\fpronix-android
bubblewrap init --manifest https://fpronix.com/manifest.webmanifest
```

Réponses à donner :

| Question | Réponse |
|---|---|
| Domain | `fpronix.com` |
| URL path (start URL) | `/?source=twa` ← important, masque l'achat dans l'app |
| Application name | `fpronix — Pronostics Football IA` |
| Short name | `fpronix` |
| Application ID (package) | `com.fpronix.app` ← ne plus jamais changer |
| Version | `1` / `1.0.0` |
| Display mode | `standalone` |
| Status bar color / Splash color | `#111315` |
| Icon URL | `https://fpronix.com/icon-512.png` |
| Maskable icon URL | `https://fpronix.com/icon-512-maskable.png` |
| Notifications (notification delegation) | `Yes` |
| Location delegation | `No` |
| Play Billing | `No` |
| Key store | créer une nouvelle clé (mot de passe solide) |

Puis :

```
bubblewrap build
```

→ produit `app-release-bundle.aab` (à envoyer à Google).

⚠️ **Sauvegardez `android.keystore` + son mot de passe** (clé USB + Google Drive).
Perdus = plus aucune mise à jour possible de l'app.

---

## 2. Relier l'app au site (assetlinks.json)

Sans ça, l'app s'affiche avec une barre d'adresse Chrome en haut.

1. Play Console → votre app → **Tester et publier → Intégrité de l'app → Signature de l'app**.
2. Copier l'**empreinte SHA-256** de la « clé de signature d'application ».
3. La coller dans `frontend/public/.well-known/assetlinks.json` à la place de
   `REMPLACER_PAR_EMPREINTE_SHA256_PLAY_CONSOLE` (garder les guillemets).
4. Push + déploiement habituel, puis recharger Nginx :
   `sudo cp deploy/nginx-fpronix.conf /etc/nginx/sites-available/fpronix && sudo nginx -t && sudo systemctl reload nginx`
   (adapter le nom du fichier si différent sur le serveur).
5. Vérifier : https://fpronix.com/.well-known/assetlinks.json doit afficher le JSON.

---

## 3. Play Console : fiche de l'app

**Nom :** `fpronix – Pronostics foot IA`

**Description courte (80 car. max) :**
`Pronostics foot par l'IA : analyses, stats, buteurs, corners et tickets.`

**Description longue :**

```
fpronix analyse chaque match de football avec l'intelligence artificielle et les données en temps réel : forme des équipes, confrontations directes, blessures, compositions, météo.

CE QUE VOUS TROUVEZ DANS FPRONIX
• Pronostics IA sur plus de 60 championnats : Premier League, Ligue 1, Liga, Serie A, Bundesliga, Ligue des champions, CAN, championnats africains…
• Tous les marchés : 1X2, double chance, plus/moins de buts, les deux équipes marquent, score exact, mi-temps / fin de match
• Statistiques avancées : corners, cartons, tirs cadrés, fautes, hors-jeu
• Buteurs probables et tirs cadrés par joueur
• Générateur de tickets selon votre niveau de risque
• Suivi de vos paris et bilan
• Bilan public et vérifiable de tous nos pronostics (page Transparence)
• Notifications avant vos matchs favoris
• Disponible en français, anglais, espagnol et portugais

IMPORTANT
fpronix est un service d'information et d'analyse. Ce n'est pas un site de paris : aucun pari n'est pris dans l'application et aucun gain n'est garanti. Réservé aux plus de 18 ans. Jouez de manière responsable.
```

**Catégorie :** Sports · **Email de contact :** support@fpronix.com · **Site :** https://fpronix.com

**Visuels** (dossier `marketing/playstore/`) :
- Icône 512 × 512 : `icone-play-512.png`
- Bannière 1024 × 500 : `banniere-1024x500.png`
- Captures d'écran : 4 à 8 captures de téléphone à faire vous-même dans l'app
  (accueil, page match, pronostics, générateur de tickets, transparence).

---

## 4. Play Console : contenu de l'app (« Règles relatives aux applications »)

**Politique de confidentialité :** `https://fpronix.com/politique-confidentialite`

**Suppression du compte :** `https://fpronix.com/suppression-compte`
(possible dans l'app : Profil → Compte → Supprimer mon compte).

**Accès à l'app :** « Certaines fonctionnalités sont restreintes » → fournir un compte de test
Premium (créez un compte dédié, ex. `google-review@…`, et passez-le Premium depuis l'admin).
Ne pas réutiliser votre propre mot de passe.

**Annonces :** Non, l'app ne contient pas de publicité.

**Public cible :** 18 ans et plus uniquement.

**Classification du contenu (questionnaire IARC) :** répondre honnêtement :
- Catégorie : « Référence, actualités ou éducation » (ou « Autre »)
- Jeux d'argent : l'app **n'offre pas** de jeux d'argent réel ni de paris ; elle **contient des informations/contenus liés aux paris sportifs** → répondre Oui à cette question si elle est posée.

**Applications d'actualités :** Non.

**Santé / Finance / Gouvernement :** Non.

---

## 5. Play Console : sécurité des données

| Question | Réponse |
|---|---|
| L'app collecte-t-elle des données ? | Oui |
| Données chiffrées en transit ? | Oui (HTTPS) |
| Les utilisateurs peuvent demander la suppression ? | Oui |

Données collectées (toutes : **collectées**, **non partagées**, **non facultatives sauf indiqué**) :

| Type | Donnée | Finalité |
|---|---|---|
| Informations personnelles | Adresse email | Gestion du compte, communications |
| Informations personnelles | Nom (pseudo) | Gestion du compte |
| Informations personnelles | Numéro de téléphone — *facultatif* | Gestion du compte |
| Informations financières | Historique d'achats | Gestion du compte (abonnement) |
| Activité dans l'app | Interactions avec l'app | Statistiques (Google Analytics) |
| Infos et performances de l'app | Journaux de plantage, diagnostics | Statistiques / correction des bugs (Sentry) |
| Identifiants de l'appareil | Identifiant de l'appareil ou autre | Statistiques, notifications |

« Partagées » = Non : Google Analytics, Sentry et l'hébergeur sont des prestataires
qui traitent les données pour vous, ce n'est pas un partage au sens de Google.

---

## 6. Test fermé (compte personnel) puis production

1. **Tester et publier → Tests → Test fermé** → créer un canal, envoyer le `.aab`.
2. Ajouter au moins **12 testeurs** (leurs adresses Gmail) et leur envoyer le lien d'inscription.
3. Ils doivent **rester inscrits 14 jours d'affilée** et ouvrir l'app de temps en temps.
4. Après 14 jours : **Tableau de bord → Demander l'accès à la production** (questionnaire sur le test).
5. Validation Google : en général quelques jours.

---

## 7. Mises à jour

- **Modification du site** (99 % des cas) : rien à faire côté Play Store, l'app affiche le site à jour.
- **Changement de l'app elle-même** (icône, nom, couleur) : augmenter la version dans
  `twa-manifest.json`, `bubblewrap update` puis `bubblewrap build`, et envoyer le nouveau `.aab`.

## Rappel : paiement

Dans l'app (lancée via `/?source=twa`), la page Abonnement n'affiche **aucun prix,
aucun bouton d'achat, aucun lien pour payer ailleurs** — règle Google Play. Les
utilisateurs déjà abonnés se connectent et retrouvent leur accès. Ne jamais
ajouter dans l'app de message du type « abonnez-vous sur fpronix.com ».
