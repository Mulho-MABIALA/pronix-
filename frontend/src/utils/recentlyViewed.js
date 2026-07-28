// ─── Historique des matchs consultés récemment ────────────────────────────────
// Stocké côté client (localStorage) — pas besoin de compte, fonctionne offline (PWA).
const KEY = 'fpronix_recently_viewed';
const MAX = 10;

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(match) {
  if (!match?.id) return;
  try {
    let list = getRecentlyViewed().filter((m) => m.id !== match.id);
    list.unshift({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeTeamLogo: match.homeTeamLogo,
      awayTeamLogo: match.awayTeamLogo,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      competitionName: match.competition?.name,
      scheduledAt: match.scheduledAt,
      viewedAt: Date.now(),
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // localStorage indisponible (mode privé, quota...) — on ignore silencieusement
  }
}

export function clearRecentlyViewed() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}
