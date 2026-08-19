// Cron : rappels de match (push) — trouvé lors de l'audit : le champ `sent`
// du modèle MatchReminder existait depuis longtemps mais rien ne le passait
// jamais à true. MatchReminderButton.jsx crée bien un enregistrement en base
// via POST /matches/:id/reminder, mais aucun job ne consommait ensuite ces
// rappels pour réellement notifier l'utilisateur — la fonctionnalité était
// entièrement silencieuse en production.
//
// NB : envoi en push (notifyUser), pas par email — un rappel "coup d'envoi
// dans X minutes" est par nature un message temps-réel, l'email est trop
// sujet aux délais de livraison pour ce cas d'usage.
const cron = require('node-cron');
const prisma = require('../config/database');
const { notifyUser } = require('../controllers/pushController');

const MAX_MINUTES_BEFORE = 1440; // borne haute autorisée par setReminder() (24h)

async function sendDueRemindersUnsafe() {
  const now = new Date();
  const horizon = new Date(now.getTime() + MAX_MINUTES_BEFORE * 60000);

  // Candidats : rappels non envoyés dont le match n'a pas encore commencé et
  // est prévu dans les prochaines 24h (borne large — le filtrage précis se
  // fait ensuite en JS car `minutesBefore` varie par utilisateur ; Prisma ne
  // peut pas comparer deux colonnes calculées directement dans un WHERE).
  const candidates = await prisma.matchReminder.findMany({
    where: {
      sent: false,
      match: { scheduledAt: { gt: now, lte: horizon } },
    },
    include: { match: { include: { competition: true } } },
  });

  const due = candidates.filter((r) => {
    const triggerAt = new Date(r.match.scheduledAt.getTime() - r.minutesBefore * 60000);
    return triggerAt <= now;
  });

  for (const reminder of due) {
    try {
      await notifyUser(reminder.userId, {
        title: `⚽ ${reminder.match.homeTeam} vs ${reminder.match.awayTeam}`,
        body:  `Coup d'envoi dans ${reminder.minutesBefore} min${reminder.match.competition?.name ? ` — ${reminder.match.competition.name}` : ''}`,
        url:   `/matchs/${reminder.matchId}`,
        tag:   `match-reminder-${reminder.id}`,
      });
    } catch (err) {
      // On marque quand même sent:true ci-dessous même en cas d'échec d'envoi
      // (ex: utilisateur sans abonnement push) — sinon ce rappel serait
      // retenté indéfiniment à chaque minute jusqu'au coup d'envoi.
      console.error(`[Cron matchReminders] Échec notifyUser pour reminder ${reminder.id}:`, err.message);
    }
  }

  if (due.length > 0) {
    await prisma.matchReminder.updateMany({
      where: { id: { in: due.map((r) => r.id) } },
      data:  { sent: true },
    });
    console.log(`[Cron matchReminders] ${due.length} rappel(s) traité(s)`);
  }
}

async function sendDueReminders() {
  try {
    await sendDueRemindersUnsafe();
  } catch (err) {
    console.error('[Cron matchReminders] Erreur:', err.message);
  }
}

function startMatchRemindersCron() {
  // Toutes les minutes — minutesBefore va de 5 à 1440 (granularité minute),
  // une fréquence plus large ferait rater des fenêtres de rappel.
  cron.schedule('* * * * *', sendDueReminders);
  console.log('[Cron] Rappels de match planifiés (chaque minute)');
}

module.exports = { startMatchRemindersCron };
