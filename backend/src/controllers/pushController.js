const webpush = require('web-push');
const prisma = require('../config/database');

function configureWebPush() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) {
    webpush.setVapidDetails('mailto:support@fpronix.com', pub, priv);
    return true;
  }
  return false;
}

const vapidReady = configureWebPush();

async function subscribe(req, res, next) {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ success: false, message: 'Souscription invalide' });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: req.user?.id || null,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: req.user?.id || null,
      },
    });

    res.json({ success: true, message: 'Souscription enregistrée' });
  } catch (err) {
    next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ success: false, message: 'Endpoint manquant' });

    // Aucune authentification n'était requise ici auparavant — n'importe qui
    // connaissant (ou devinant) un endpoint pouvait désabonner un autre
    // utilisateur de ses notifications. L'endpoint push est en pratique un
    // secret non-devinable (URL longue générée par le service push du
    // navigateur), donc le match sur `endpoint` seul reste la garde
    // principale ; on ajoute en défense en profondeur un filtre sur userId
    // quand la requête est authentifiée, pour ne jamais supprimer la
    // souscription d'un autre compte par erreur.
    await prisma.pushSubscription.deleteMany({
      where: req.user ? { endpoint, userId: req.user.id } : { endpoint },
    });

    res.json({ success: true, message: 'Souscription supprimée' });
  } catch (err) {
    next(err);
  }
}

function getPublicKey(req, res) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return res.status(503).json({ success: false, message: 'Push non configuré' });
  }
  res.json({ success: true, data: { publicKey: key } });
}

async function broadcastNotification(payload) {
  if (!vapidReady) return;

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );

  // Supprimer les souscriptions expirées (404/410)
  const expiredEndpoints = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
      expiredEndpoints.push(subs[i].endpoint);
    }
  });

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }
}

async function adminBroadcast(req, res, next) {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title et body sont requis' });
    }

    const count = await prisma.pushSubscription.count();
    if (count === 0) {
      return res.json({ success: true, message: 'Aucun abonné aux notifications', sent: 0 });
    }

    await broadcastNotification({ title, body, url: url || '/', icon: '/logo192.png' });
    res.json({ success: true, message: `Notification envoyée à ${count} abonné(s)`, sent: count });
  } catch (err) {
    next(err);
  }
}

async function getPushStats(req, res, next) {
  try {
    const total = await prisma.pushSubscription.count();
    const withUser = await prisma.pushSubscription.count({ where: { userId: { not: null } } });
    res.json({ success: true, data: { total, withUser, anonymous: total - withUser } });
  } catch (err) {
    next(err);
  }
}

// ─── Notification ciblée : un seul utilisateur ────────────────────────────────
async function notifyUser(userId, payload) {
  if (!vapidReady || !userId) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ icon: '/logo192.png', ...payload })
      )
    )
  );

  const expiredEndpoints = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
      expiredEndpoints.push(subs[i].endpoint);
    }
  });

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }
}

module.exports = { subscribe, unsubscribe, getPublicKey, broadcastNotification, adminBroadcast, getPushStats, notifyUser };
