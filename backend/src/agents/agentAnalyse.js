/**
 * Agent Analyse — analyse les performances des tipsters et génère le classement hebdomadaire
 * Produit un rapport détaillé avec recommandations pour les utilisateurs
 */
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

const prisma = new PrismaClient();

async function runAgentAnalyse() {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Récupérer les tipsters avec leurs stats
  const tipsters = await prisma.user.findMany({
    where: { role: { in: ['TIPSTER', 'ADMIN'] } },
    select: {
      id: true,
      username: true,
      tipsterStats: true,
      predictions: {
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          status: { in: ['WON', 'LOST'] },
        },
        select: { status: true, confidence: true },
      },
    },
    take: 20,
  });

  if (tipsters.length === 0) {
    return { error: 'Aucun tipster trouvé' };
  }

  const tipsterData = tipsters.map((t) => {
    const weekPreds = t.predictions || [];
    const won = weekPreds.filter((p) => p.status === 'WON').length;
    const total = weekPreds.length;
    const weekRate = total > 0 ? Math.round((won / total) * 100) : 0;

    return {
      username: t.username,
      totalPredictions: t.tipsterStats?.totalPredictions || 0,
      successRate: t.tipsterStats?.successRate || 0,
      weeklyWon: won,
      weeklyTotal: total,
      weeklyRate: weekRate,
      avgConfidence: t.tipsterStats?.avgConfidence || 0,
    };
  });

  const dataStr = JSON.stringify(tipsterData, null, 2);

  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Tu es l'analyste de Statistique Foot SN. Voici les données de performance des tipsters cette semaine :

${dataStr}

Génère un rapport hebdomadaire complet incluant :
1. **Classement top 5** de la semaine avec explication succincte de chaque performance
2. **Tipster de la semaine** : qui suivre et pourquoi
3. **Tendances** : quelles observations générales sur la semaine
4. **Message d'encouragement** pour la communauté (2 lignes max)

Le ton doit être enthousiaste, factuel, sans conseil financier.

Réponds en JSON :
{
  "classement": [{ "rang": 1, "username": "", "weeklyRate": 0, "commentaire": "" }],
  "tipsterSemaine": { "username": "", "raison": "" },
  "tendances": "",
  "messageComm": ""
}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === 'text')?.text || '';

  let rapport;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    rapport = JSON.parse(jsonMatch[0]);
  } catch {
    rapport = { tendances: text };
  }

  return {
    semaine: new Date().toISOString().split('T')[0],
    tipstersAnalysés: tipsters.length,
    rapport,
  };
}

module.exports = { runAgentAnalyse };
