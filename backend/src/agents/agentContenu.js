/**
 * Agent Contenu — génère des posts WhatsApp/Facebook à partir des matchs du jour
 * Utilise claude-opus-4-8 avec adaptive thinking pour un contenu accrocheur
 */
const Anthropic = require('@anthropic-ai/sdk');
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

const prisma = new PrismaClient();

async function runAgentContenu() {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: today, lt: tomorrow },
      status: { in: ['SCHEDULED', 'LIVE'] },
    },
    include: { competition: true },
    take: 10,
    orderBy: { scheduledAt: 'asc' },
  });

  if (matches.length === 0) {
    return { posts: [], message: 'Aucun match prévu aujourd\'hui' };
  }

  const matchList = matches.map((m) => {
    const heure = new Date(m.scheduledAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dakar' });
    return `- ${heure} | ${m.homeTeam} vs ${m.awayTeam} (${m.competition?.name || 'Compétition'})`;
  }).join('\n');

  const stream = await client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 1500,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Tu es le community manager de Pronix (pronix.app), plateforme de stats football pour tous les francophones.

Voici les matchs du jour :
${matchList}

Génère 2 posts de réseaux sociaux en français (langage dynamique, proche des fans) :
1. Un post WhatsApp court (200 mots max) avec les affches du jour + emoji
2. Un post Facebook plus développé (400 mots max) avec contexte + appel à rejoindre la plateforme

Inclus toujours : "pronix.app" et le hashtag "#Pronix"
Jamais de conseil de paris ni promesse de gain.

Réponds en JSON :
{
  "whatsapp": "texte du post WhatsApp",
  "facebook": "texte du post Facebook",
  "meilleurMatch": "nom du match le plus attendu"
}`,
      },
    ],
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b) => b.type === 'text')?.text || '';

  let result;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch[0]);
  } catch {
    result = { whatsapp: text, facebook: text, meilleurMatch: matches[0]?.homeTeam };
  }

  return { posts: result, matchesCount: matches.length, date: today.toISOString().split('T')[0] };
}

module.exports = { runAgentContenu };
