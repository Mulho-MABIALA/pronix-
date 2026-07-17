// ─── Chatbot Support — répond aux questions sur la plateforme fpronix ─────────
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

const SYSTEM_PROMPT = `Tu es l'assistant de fpronix, une plateforme de statistiques et pronostics football.

Ce que tu peux faire :
- Expliquer les fonctionnalités de la plateforme (matchs, pronostics, tipsters, combinés, portefeuille virtuel, BetTracker)
- Aider à utiliser les outils (Machine IA, Filtres, Stats Ligues)
- Expliquer les abonnements (Gratuit, Premium)
- Répondre aux questions sur les tipsters et comment les suivre
- Expliquer comment fonctionnent les combinés et le portefeuille virtuel
- Aider à comprendre les statistiques et les cotes

Ce que tu ne peux PAS faire :
- Donner des conseils financiers personnalisés
- Garantir des résultats de paris
- Accéder aux données privées d'un utilisateur

Règles de réponse :
- Réponds en français, sois concis et amical
- Si la question ne concerne pas la plateforme, oriente gentiment l'utilisateur
- N'invente jamais des fonctionnalités qui n'existent pas
- Max 150 mots par réponse`;

async function answerSupportQuestion(message, history = []) {
  if (!client) {
    return {
      answer: 'Le service d\'assistance est temporairement indisponible. Réessayez dans quelques instants.',
      error: true,
    };
  }

  if (!message || message.trim().length === 0) {
    return { answer: 'Posez-moi une question sur fpronix !', error: false };
  }

  // Limite l'historique aux 6 derniers messages (3 échanges)
  const recentHistory = history.slice(-6).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: String(msg.content).slice(0, 300),
  }));

  const messages = [
    ...recentHistory,
    { role: 'user', content: message.slice(0, 500) },
  ];

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system: SYSTEM_PROMPT,
      messages,
    });

    return {
      answer: resp.content[0]?.text || 'Je n\'ai pas pu générer de réponse.',
      error: false,
    };
  } catch (err) {
    console.error('[SupportChat] Erreur Claude:', err.message);
    return {
      answer: 'Une erreur est survenue. Réessayez dans quelques instants.',
      error: true,
    };
  }
}

module.exports = { answerSupportQuestion };
