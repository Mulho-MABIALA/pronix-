import { format } from 'date-fns';
import { loadLogo, loadBrandLogo, drawTeamLogo, fitText, roundRect } from './ticketCanvas';

// Image de partage d'un pronostic de match (format 4:5, lisible en statut /
// groupe WhatsApp). Mêmes codes visuels que le ticket de la Machine.
const W = 540;
const H = 675;
const GREEN = '#1aa656';
const CONF_COLOR = { high: '#2ec16a', medium: '#fbbf24', low: '#9a9fa6' };

// Un pronostic n'est mis en avant que s'il vient réellement du modèle
// statistique (sampleSize > 0) ou de l'IA — jamais le repli neutre aléatoire
// (generateFallbackPrediction côté backend), qu'on ne veut pas diffuser.
export function hasShareablePrediction(match) {
  const p = match?.predictions;
  if (!p?.bestPick || match.locked) return false;
  if (typeof p.bestPick.prob !== 'number' || p.bestPick.prob <= 0) return false;
  return p.sampleSize > 0 || p.aiGenerated === true;
}

function centerText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, y);
}

/**
 * @param {Object} match — match complet (MatchDetail) : équipes, logos,
 *   competition, scheduledAt, predictions, weather
 * @param {Function} t — i18next
 * @param {Object} opts — { dateLocale }
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function drawPredictionCanvas(match, t, { dateLocale } = {}) {
  const [homeLogo, awayLogo, brandLogo] = await Promise.all([
    loadLogo(match.homeTeamLogo),
    loadLogo(match.awayTeamLogo),
    loadBrandLogo(),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = W * 2; // retina
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);

  // Fond + halo vert discret
  ctx.fillStyle = '#171819';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 0, 20, W / 2, 0, 420);
  glow.addColorStop(0, 'rgba(26,166,86,0.22)');
  glow.addColorStop(1, 'rgba(26,166,86,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, 5);

  // ── En-tête : logo fpronix + compétition ─────────────────────────────────
  if (brandLogo) {
    ctx.drawImage(brandLogo, 24, 24, 36, 36);
  } else {
    ctx.fillStyle = GREEN;
    roundRect(ctx, 24, 24, 36, 36, 9);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui';
  ctx.fillText('fpronix', 70, 48);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9a9fa6';
  ctx.font = '12px system-ui';
  ctx.fillText(fitText(ctx, match.competition?.name || '', 250), W - 24, 47);

  // ── Équipes ──────────────────────────────────────────────────────────────
  const LOGO = 84;
  const teamY = 150;
  const colX = [W * 0.25, W * 0.75];
  drawTeamLogo(ctx, homeLogo, match.homeTeam, colX[0] - LOGO / 2, teamY, LOGO);
  drawTeamLogo(ctx, awayLogo, match.awayTeam, colX[1] - LOGO / 2, teamY, LOGO);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e5e7eb';
  ctx.font = 'bold 16px system-ui';
  ctx.fillText(fitText(ctx, match.homeTeam, 180), colX[0], teamY + 72);
  ctx.fillText(fitText(ctx, match.awayTeam, 180), colX[1], teamY + 72);

  centerText(ctx, 'VS', teamY + 8, 'bold 22px system-ui', '#5a5f66');
  if (match.scheduledAt) {
    const d = new Date(match.scheduledAt);
    centerText(ctx, format(d, 'HH:mm'), teamY + 44, 'bold 18px system-ui', '#ffffff');
    centerText(ctx, format(d, 'dd MMM yyyy', { locale: dateLocale }), teamY + 62, '11px system-ui', '#9a9fa6');
  }

  // ── Carte pronostic ──────────────────────────────────────────────────────
  const p = match.predictions;
  const shareable = hasShareablePrediction(match);
  const cardX = 24;
  const cardY = 268;
  const cardW = W - 48;
  const cardH = 250;

  ctx.fillStyle = '#212224';
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(26,166,86,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, cardY, cardW, cardH, 18);
  ctx.stroke();

  centerText(ctx, t('matchDetail.shareImage.pickTitle').toUpperCase(), cardY + 32, 'bold 12px system-ui', '#9a9fa6');

  if (shareable) {
    const pick = p.bestPick;
    const pickLabel = t(`matchDetail.shareImage.picks.${pick.type}`, {
      home: match.homeTeam,
      away: match.awayTeam,
      defaultValue: pick.label,
    });
    ctx.font = 'bold 24px system-ui';
    centerText(ctx, fitText(ctx, pickLabel, cardW - 40), cardY + 70, 'bold 24px system-ui', '#ffffff');
    centerText(ctx, `${pick.prob}%`, cardY + 118, 'bold 44px system-ui', CONF_COLOR[p.confidence] || GREEN);
    centerText(
      ctx,
      t(`matchDetail.shareImage.confidence.${p.confidence || 'low'}`),
      cardY + 140,
      '12px system-ui',
      '#9a9fa6',
    );

    // Barre 1X2
    if ([p.home, p.draw, p.away].every((v) => typeof v === 'number')) {
      const barX = cardX + 28;
      const barW = cardW - 56;
      const barY = cardY + 170;
      const total = p.home + p.draw + p.away || 100;
      const segs = [
        { v: p.home, c: GREEN, label: `1 · ${p.home}%` },
        { v: p.draw, c: '#5a5f66', label: `X · ${p.draw}%` },
        { v: p.away, c: 'rgba(46,193,106,0.5)', label: `2 · ${p.away}%` },
      ];
      let x = barX;
      ctx.save();
      roundRect(ctx, barX, barY, barW, 10, 5);
      ctx.clip();
      segs.forEach((s) => {
        const w = (s.v / total) * barW;
        ctx.fillStyle = s.c;
        ctx.fillRect(x, barY, w, 10);
        x += w;
      });
      ctx.restore();

      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = '#cfd3d8';
      ctx.textAlign = 'left';
      ctx.fillText(segs[0].label, barX, barY + 30);
      ctx.textAlign = 'center';
      ctx.fillText(segs[1].label, barX + barW / 2, barY + 30);
      ctx.textAlign = 'right';
      ctx.fillText(segs[2].label, barX + barW, barY + 30);
    }

    // Score le plus probable
    const top = p.scorelines?.[0];
    if (top?.score) {
      centerText(
        ctx,
        t('matchDetail.shareImage.likelyScore', { score: top.score, prob: top.prob }),
        cardY + cardH - 18,
        '12px system-ui',
        '#9a9fa6',
      );
    }
  } else {
    // Pas de pronostic fiable à diffuser → invitation à voir l'analyse
    centerText(ctx, t('matchDetail.shareImage.noPick'), cardY + 120, 'bold 20px system-ui', '#ffffff');
    centerText(ctx, t('matchDetail.shareImage.noPickSub'), cardY + 148, '13px system-ui', '#9a9fa6');
  }

  // ── Météo (si disponible) ────────────────────────────────────────────────
  let y = cardY + cardH + 36;
  const w = match.weather;
  if (w) {
    const parts = [`${w.temperature}°C`, t(`matchDetail.weather.conditions.${w.condition}`)];
    if (w.precipitationProbability != null) parts.push(`${t('matchDetail.weather.rain')} ${w.precipitationProbability}%`);
    centerText(ctx, `🌤  ${w.city} · ${parts.join(' · ')}`, y, '12px system-ui', '#9a9fa6');
    y += 26;
  }

  // ── Pied : appel à l'action + jeu responsable ────────────────────────────
  ctx.fillStyle = GREEN;
  roundRect(ctx, W / 2 - 150, H - 96, 300, 40, 20);
  ctx.fill();
  centerText(ctx, t('matchDetail.shareImage.cta'), H - 70, 'bold 15px system-ui', '#ffffff');
  centerText(ctx, t('matchDetail.shareImage.disclaimer'), H - 26, '10px system-ui', '#5a5f66');

  return canvas;
}

/**
 * Génère l'image et ouvre la feuille de partage native (WhatsApp y apparaît
 * sur mobile). Repli : téléchargement de l'image + partage du lien en texte.
 */
export async function sharePredictionImage(match, t, { dateLocale, url } = {}) {
  const canvas = await drawPredictionCanvas(match, t, { dateLocale });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('canvas_export_failed');

  const file = new File([blob], `pronostic-fpronix-${match.id}.png`, { type: 'image/png' });
  const text = t('matchDetail.shareImage.shareText', {
    home: match.homeTeam,
    away: match.awayTeam,
    url,
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
    } catch (err) {
      if (err?.name !== 'AbortError') throw err; // annulation utilisateur = pas une erreur
    }
    return 'shared';
  }

  // PC / navigateur sans partage de fichiers : télécharge l'image puis ouvre
  // WhatsApp avec le lien, l'utilisateur joint l'image lui-même.
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(objectUrl);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  return 'downloaded';
}
