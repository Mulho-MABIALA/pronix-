// ─── Mode maintenance ─────────────────────────────────────────────────────────
// Activé / désactivé depuis l'admin. Stocké en base (table app_settings) pour
// que TOUS les processus PM2 le voient ; gardé 5 s en mémoire pour ne pas
// interroger la base à chaque requête.
const prisma = require('../config/database');

const KEY = 'maintenance';
const CACHE_MS = 5000;
const OFF = { enabled: false, message: null, until: null, startedAt: null };

let cache = { value: OFF, expiresAt: 0 };

async function getMaintenance() {
  if (Date.now() < cache.expiresAt) return cache.value;
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: KEY } });
    const value = row?.value && typeof row.value === 'object' ? { ...OFF, ...row.value } : OFF;
    cache = { value, expiresAt: Date.now() + CACHE_MS };
    return value;
  } catch (err) {
    // Base indisponible : on ne bloque pas le site par erreur, on garde la
    // dernière valeur connue.
    console.error('[Maintenance] lecture impossible:', err.message);
    return cache.value;
  }
}

async function setMaintenance({ enabled, message, until }, admin) {
  const value = enabled
    ? {
        enabled: true,
        message: message?.trim() || null,
        until: until || null,
        startedAt: new Date().toISOString(),
      }
    : OFF;
  await prisma.appSetting.upsert({
    where: { key: KEY },
    update: { value, updatedBy: admin?.email || null },
    create: { key: KEY, value, updatedBy: admin?.email || null },
  });
  cache = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

module.exports = { getMaintenance, setMaintenance };
