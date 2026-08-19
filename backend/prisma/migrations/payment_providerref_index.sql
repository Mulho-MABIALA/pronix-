-- À exécuter sur le serveur : psql $DATABASE_URL -f payment_providerref_index.sql
-- Index manquant sur Payment.providerRef — c'est le champ de lookup utilisé par
-- TOUS les webhooks paiement (PayTech/Wave/FedaPay/Flutterwave) et par le
-- polling client GET /payments/verify. Sans index, chaque appel scanne toute
-- la table payments — dégradation progressive sur le chemin critique de
-- confirmation d'achat à mesure que le volume de paiements grandit.
CREATE INDEX IF NOT EXISTS "payments_providerRef_idx" ON "payments"("providerRef");
