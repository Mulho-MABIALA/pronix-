/**
 * Agent Support — répond aux questions fréquentes des utilisateurs sur la plateforme
 * Connait les plans d'abonnement, fonctionnalités, règles tipsters
 */
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

const CONTEXTE_PLATEFORME = `
Tu es l'assistant support de fpronix (fpronix.com), la plateforme de statistiques football et communauté de tipsters pour tous les francophones — Afrique de l'Ouest, Afrique centrale, Maghreb, Europe francophone.

PLANS D'ABONNEMENT :
- FREE (gratuit) : accès limité aux stats, 3 pronostics/jour
- PREMIUM : $8.99/mois — stats complètes, pronostics illimités, suivi tipsters, toutes compétitions

FONCTIONNALITÉS :
- Statistiques en temps réel : Premier League, Ligue 1, Bundesliga, Serie A, La Liga, Champions League, CAN, CAF Champions League, Coupe du Monde 2026
- Communauté tipsters : classements transparents, historique complet, aucune manipulation possible
- Pronostics IA : analyse basée sur la forme des équipes et confrontations directes
- Paiement via GeniusPay (Wave, Orange Money, Airtel, Mobile Money)

RÈGLES IMPORTANTES :
- La plateforme ne donne JAMAIS de conseils de paris
- Les pronostics sont à titre indicatif uniquement
- Jeu responsable — les paris peuvent créer une dépendance

CONTACT : support@fpronix.com

Réponds toujours en français, de manière claire et bienveillante. Si tu ne connais pas la réponse, oriente vers support@fpronix.com.
`;

async function runAgentSupport({ question, userId } = {}) {
  if (!question) {
    return { error: 'Question requise' };
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: CONTEXTE_PLATEFORME,
    messages: [
      {
        role: 'user',
        content: question,
      },
    ],
  });

  const message = await stream.finalMessage();
  const reponse = message.content.find((b) => b.type === 'text')?.text || '';

  return {
    question,
    reponse,
    userId: userId || null,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { runAgentSupport };
