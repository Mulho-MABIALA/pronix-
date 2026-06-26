/**
 * Agent SEO — génère du contenu optimisé SEO pour les pages matchs/compétitions
 * Cible : mots-clés football sénégal + grandes compétitions
 */
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

const prisma = new PrismaClient();

async function runAgentSEO({ matchId } = {}) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  // Prendre un match terminé récent ou celui spécifié
  const match = matchId
    ? await prisma.match.findUnique({ where: { id: matchId }, include: { competition: true } })
    : await prisma.match.findFirst({
        where: { status: 'FINISHED' },
        include: { competition: true },
        orderBy: { scheduledAt: 'desc' },
      });

  if (!match) {
    return { error: 'Aucun match disponible pour le contenu SEO' };
  }

  const scoreInfo = match.homeScore !== null
    ? `Score final : ${match.homeScore}-${match.awayScore}`
    : 'Match à venir';

  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Tu es un expert SEO francophone spécialisé football (marché francophone mondial).

Match : ${match.homeTeam} vs ${match.awayTeam}
Compétition : ${match.competition?.name || 'Football'}
${scoreInfo}
Date : ${new Date(match.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

Génère le contenu SEO pour la page de ce match sur pronix.app :

1. **Title tag** (60 chars max) : accrocheur + mot-clé principal
2. **Meta description** (160 chars max) : inclut les équipes + compétition + action
3. **H1** : titre naturel pour la page
4. **Introduction** (150 mots) : contexte du match, sans spoiler si pas encore joué
5. **Mots-clés cibles** (liste de 8 expressions longue traîne)

Réponds en JSON :
{
  "title": "",
  "metaDescription": "",
  "h1": "",
  "introduction": "",
  "keywords": []
}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === 'text')?.text || '';

  let seoContent;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    seoContent = JSON.parse(jsonMatch[0]);
  } catch {
    seoContent = { introduction: text };
  }

  return {
    matchId: match.id,
    match: `${match.homeTeam} vs ${match.awayTeam}`,
    competition: match.competition?.name,
    seo: seoContent,
  };
}

module.exports = { runAgentSEO };
