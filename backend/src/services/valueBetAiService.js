// ─── Agent Value Bet Avancé — explication IA d'une opportunité value bet ────────
const Anthropic = require('@anthropic-ai/sdk');
const env = require('../config/env');
const prisma = require('../config/database');

let client = null;
try {
  if (env.ANTHROPIC_API_KEY) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
} catch { /* SDK absent */ }

// Cache en mémoire : matchId → { explanation, generatedAt }
const valueBetCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Génère une explication IA d'un value bet pour un match donné.
 * @param {string} matchId
 * @param {{ market: string, bookOdds: number, trueProb: number }} params
 * @returns {{ explanation: string, confidence: string, edge: string, reasoning: string[] } | null}
 */
async function explainValueBet(matchId, { market, bookOdds, trueProb }) {
  if (!client) return null;

  const cacheKey = `${matchId}:${market}`;
  const cached = valueBetCache.get(cacheKey);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { competition: true },
  });

  if (!match) return null;

  const impliedProb = (1 / bookOdds) * 100;
  const edge = ((trueProb - impliedProb) / impliedProb * 100).toFixed(1);

  const MARKET_FR = {
    '1': 'Victoire domicile (1)',
    'X': 'Match nul (X)',
    '2': 'Victoire extérieur (2)',
    'over25': 'Plus de 2.5 buts',
    'over15': 'Plus de 1.5 buts',
    'btts': 'Les deux équipes marquent',
    '1X': 'Double chance 1X',
    'X2': 'Double chance X2',
  };

  const prompt = `Tu es un expert en paris sportifs value betting.

Match : ${match.homeTeam} vs ${match.awayTeam}
Compétition : ${match.competition?.name || 'Inconnue'}
Marché : ${MARKET_FR[market] || market}
Cote bookmaker : ${bookOdds}
Probabilité implicite bookmaker : ${impliedProb.toFixed(1)}%
Probabilité réelle estimée : ${trueProb.toFixed(1)}%
Edge value : +${edge}%

Explique pourquoi c'est un value bet intéressant. Réponds avec ce JSON :
{
  "explanation": "Explication principale en 2 phrases claires (pourquoi c'est une value)",
  "confidence": "ÉLEVÉE|MODÉRÉE|FAIBLE",
  "edge": "description courte de l'avantage (+X% edge)",
  "reasoning": ["raison 1 courte", "raison 2 courte", "raison 3 courte"]
}

En français, style analyste sportif professionnel. Sois concis et factuel.`;

  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (resp.content[0]?.text || '').trim();
    const json = text.match(/\{[\s\S]*\}/);
    if (!json) return null;

    const data = {
      ...JSON.parse(json[0]),
      market: MARKET_FR[market] || market,
      bookOdds,
      trueProb: trueProb.toFixed(1),
      impliedProb: impliedProb.toFixed(1),
      generatedAt: new Date().toISOString(),
    };

    valueBetCache.set(cacheKey, { data, generatedAt: Date.now() });
    return data;
  } catch (err) {
    console.error('[ValueBetAI] Erreur Claude:', err.message);
    return null;
  }
}

module.exports = { explainValueBet };
