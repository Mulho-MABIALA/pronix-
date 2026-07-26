import { format } from 'date-fns';
import api from '../services/api';
import { formatOdd } from './mockOdds';

// Passe une URL de logo externe (media.api-sports.io) par notre proxy same-origin
// pour éviter de "tainted" le canvas (sinon canvas.toBlob() plante silencieusement
// et le partage/téléchargement du ticket ne fonctionne plus du tout).
function proxiedLogoUrl(url) {
  if (!url) return null;
  return `${api.defaults.baseURL}/img-proxy?url=${encodeURIComponent(url)}`;
}

// Précharge un logo (via le proxy) en HTMLImageElement. Résout `null` en cas
// d'échec (image manquante, timeout...) plutôt que de rejeter — un logo absent
// ne doit jamais empêcher la génération du ticket.
function loadLogo(url) {
  const proxied = proxiedLogoUrl(url);
  if (!proxied) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    setTimeout(() => resolve(null), 5000);
    img.src = proxied;
  });
}

// Dessine un petit cercle avec les initiales de l'équipe (fallback si le logo
// n'a pas pu être chargé).
function drawTeamFallback(ctx, name, cx, cy, r) {
  ctx.fillStyle = '#2a2b2d';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a8f96';
  ctx.font = `bold ${Math.round(r)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = (name || '?').trim().slice(0, 2).toUpperCase();
  ctx.fillText(initials, cx, cy + 1);
  ctx.textBaseline = 'alphabetic';
}

function drawTeamLogo(ctx, img, name, x, sizeCenterY, size) {
  const r = size / 2;
  const cx = x + r;
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, sizeCenterY, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, sizeCenterY - r, size, size);
    ctx.restore();
  } else {
    drawTeamFallback(ctx, name, cx, sizeCenterY, r);
  }
}

// Précharge tous les logos (uniques) nécessaires au ticket avant de dessiner.
// Retourne une Map url -> HTMLImageElement|null déjà résolue (consommable
// de façon synchrone pendant le dessin du canvas).
async function preloadTicketLogos(rows) {
  const urls = new Set();
  rows.forEach((row) => {
    if (row.match.homeTeamLogo) urls.add(row.match.homeTeamLogo);
    if (row.match.awayTeamLogo) urls.add(row.match.awayTeamLogo);
  });
  const entries = await Promise.all([...urls].map(async (u) => [u, await loadLogo(u)]));
  return new Map(entries);
}

// Tronque un texte avec "…" pour qu'il tienne dans maxWidth (évite le
// chevauchement avec le badge de pick à droite sur les noms d'équipe longs).
function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const CONF_BG   = { high: '#1aa65622', medium: '#f59e0b22', low: '#3a3a3a' };
const CONF_TEXT = { high: '#2ec16a',   medium: '#fbbf24',   low: '#9a9fa6' };
const RESULT_BG   = { WIN: '#1aa65622', LOSS: '#ef444422', VOID: '#6b728022' };
const RESULT_TEXT = { WIN: '#2ec16a',   LOSS: '#f87171',   VOID: '#9ca3af' };

/**
 * Dessine un ticket (généré ou sauvegardé) en canvas, prêt à être partagé/téléchargé.
 * Chaque `row` doit contenir : { match, pick: { type, prob? }, odd, value?, conf?, legResult? }
 * - Si `pick.prob` est fourni (ticket fraîchement généré) : affiche le % de confiance.
 * - Sinon (ticket de l'historique, sans probabilité stockée) : affiche le statut
 *   du pick (Gagné/Perdu/Remboursé/En attente) via `legResult`.
 */
export async function drawTicketCanvas(rows, totalOdds, t) {
  const logoMap = await preloadTicketLogos(rows);
  const getLogo = (url) => (url ? logoMap.get(url) || null : null);

  const W = 640;
  const ROW_H = 92;
  const HEADER_H = 92;
  const FOOTER_H = 56;
  const H = HEADER_H + rows.length * ROW_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width  = W * 2; // retina
  canvas.height = H * 2;
  canvas.style.width  = `${W}px`;
  canvas.style.height = `${H}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Fond
  ctx.fillStyle = '#171819';
  ctx.fillRect(0, 0, W, H);

  // Bande verte en haut
  ctx.fillStyle = '#1aa656';
  ctx.fillRect(0, 0, W, 4);

  // Logo + titre
  ctx.fillStyle = '#1aa656';
  roundRect(ctx, 16, 16, 32, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('SF', 32, 37);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText('fpronix — Mon Ticket', 58, 30);

  ctx.fillStyle = '#9a9fa6';
  ctx.font = '11px system-ui';
  ctx.fillText(`${t('machine.canvasGeneratedAt', { date: format(new Date(), 'dd/MM/yyyy à HH:mm') })} · ${t('machine.selectionsGenerated', { count: rows.length })}`, 58, 46);

  // Cote totale
  ctx.fillStyle = '#f97316';
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText(`${t('machine.totalOdd')} × ${totalOdds}`, W - 16, 30);

  // Ligne séparatrice
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, HEADER_H - 10);
  ctx.lineTo(W - 16, HEADER_H - 10);
  ctx.stroke();

  const LOGO_SIZE = 22;

  rows.forEach((row, i) => {
    const y = HEADER_H + i * ROW_H;
    const hasProb = row.pick.prob != null;

    // Fond alterné léger — aide à distinguer chaque ligne d'un coup d'œil
    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0, y, W, ROW_H);
    }

    // Séparateur
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(W - 16, y);
      ctx.stroke();
    }

    // Numéro
    ctx.fillStyle = '#5a5f66';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}`, 16, y + 26);

    const textX = 34 + LOGO_SIZE + 10;
    const badgeW = 84;
    const maxNameWidth = (W - 16 - badgeW - 8) - textX;

    // Équipe domicile — logo + nom
    drawTeamLogo(ctx, getLogo(row.match.homeTeamLogo), row.match.homeTeam, 34, y + 24, LOGO_SIZE);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(fitText(ctx, row.match.homeTeam, maxNameWidth), textX, y + 28);

    // Équipe extérieure — logo + nom
    drawTeamLogo(ctx, getLogo(row.match.awayTeamLogo), row.match.awayTeam, 34, y + 52, LOGO_SIZE);
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 13px system-ui';
    ctx.fillText(fitText(ctx, row.match.awayTeam, maxNameWidth), textX, y + 56);

    // Compétition + heure
    ctx.fillStyle = '#7a7f86';
    ctx.font = '10px system-ui';
    ctx.fillText(
      `${row.match.competition?.name || ''} · ${format(new Date(row.match.scheduledAt), 'dd/MM HH:mm')}`,
      34, y + 78
    );

    // Badge pick
    const badgeH = 62;
    const badgeX = W - 16 - badgeW;
    const badgeY = y + (ROW_H - badgeH) / 2;
    const bg   = hasProb ? CONF_BG[row.conf]   : (RESULT_BG[row.legResult]   || '#3a3a3a');
    const text = hasProb ? CONF_TEXT[row.conf] : (RESULT_TEXT[row.legResult] || '#9a9fa6');

    ctx.fillStyle = bg;
    roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 10);
    ctx.fill();

    ctx.fillStyle = text;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(t(`machine.pickLabels.${row.pick.type}`, { defaultValue: row.pick.type }), badgeX + badgeW / 2, badgeY + 20);

    ctx.font = 'bold 16px system-ui';
    ctx.fillText(hasProb ? `${row.pick.prob}%` : formatOdd(row.odd), badgeX + badgeW / 2, badgeY + 39);

    if (hasProb) {
      ctx.fillStyle = row.value ? '#fbbf24' : '#9a9fa6';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`cote ${formatOdd(row.odd)}${row.value ? ' ⚡' : ''}`, badgeX + badgeW / 2, badgeY + 54);
    } else {
      const legLabel = row.legResult === 'WIN' ? t('machine.legWin')
        : row.legResult === 'LOSS' ? t('machine.legLoss')
        : row.legResult === 'VOID' ? t('machine.legVoid')
        : t('machine.legPending');
      ctx.fillStyle = text;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(legLabel, badgeX + badgeW / 2, badgeY + 54);
    }
  });

  // Footer
  const fy = HEADER_H + rows.length * ROW_H + 10;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(16, fy);
  ctx.lineTo(W - 16, fy);
  ctx.stroke();

  ctx.fillStyle = '#5a5f66';
  ctx.font = '10px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(t('machine.canvasFooter'), W / 2, fy + 24);

  return canvas;
}
