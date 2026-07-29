import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { getOdd, isValueBet, formatOdd } from '../../utils/mockOdds';
import MatchReminderButton from './MatchReminderButton';
import api from '../../services/api';

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const FOTMOB_CDN = (id) =>
  id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

// Les logos media.api-sports.io pèsent 20-90 Ko en pleine résolution alors
// qu'ils s'affichent en 26-35px dans les cartes de match (~600 Ko d'économie
// mesurés par PageSpeed). On les fait passer par notre proxy backend qui les
// redimensionne et les met en cache côté serveur (voir routes/imgProxy.js).
function resizedSrc(url, size) {
  if (!url || !url.includes('media.api-sports.io')) return url;
  return `${api.defaults.baseURL}/img-proxy?url=${encodeURIComponent(url)}&w=${Math.round(size)}`;
}

export function TeamLogo({ logo, teamId, name, size = 20 }) {
  const [err, setErr] = useState(false);
  const src = resizedSrc(logo, size) || FOTMOB_CDN(teamId);
  if (src && !err) {
    return (
      <img src={src} alt="" aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className="object-contain shrink-0"
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="rounded-full bg-surface-600 flex items-center justify-center text-gray-300 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

// Couleur de confiance
const CONF_COLOR = { high: 'text-primary-400', medium: 'text-amber-400', low: 'text-gray-300' };
const CONF_BG    = { high: 'bg-primary-500/10', medium: 'bg-amber-500/10', low: 'bg-white/[0.04]' };

export default function MatchCard({ match }) {
  const { t } = useTranslation();
  const isLive     = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const hasScore   = isLive || isFinished;
  const minute     = match.minute === 'HT' ? t('matchCard.htShort') : match.minute;
  const homeWins   = hasScore && match.homeScore > match.awayScore;
  const awayWins   = hasScore && match.awayScore > match.homeScore;
  const isDraw     = hasScore && match.homeScore === match.awayScore;
  const pred       = match.predictions;

  // Couleur des scores — vert pour le vainqueur, ambre en cas de nul,
  // rouge "live" pendant le match, pour attirer l'oeil sur le résultat.
  const scoreColor = (isWinner) => {
    if (isLive) return 'text-live-400';
    if (isDraw) return 'text-amber-400';
    return isWinner ? 'text-primary-400' : 'text-gray-300';
  };

  const shareText = `⚽ ${match.homeTeam} vs ${match.awayTeam}${
    match.competition?.name ? `\n🏆 ${match.competition.name}` : ''
  }\n📅 ${hasScore ? `Score: ${match.homeScore}–${match.awayScore}` : format(new Date(match.scheduledAt), 'HH:mm')}\n\n👉 fpronix.com/matchs/${match.id}`;

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener');
  };

  return (
    <div className="relative group">
    <Link
      to={`/matchs/${match.id}`}
      className={`match-row flex items-center gap-2 px-3 py-3 animate-fade-in pr-8 ${isLive ? 'bg-live-500/[0.04]' : ''}`}
      aria-label={`${match.homeTeam} vs ${match.awayTeam}`}
    >
      {/* Statut / heure */}
      <div className="w-10 shrink-0 text-center">
        {isLive ? (
          <div className="flex flex-col items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-live-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" aria-hidden="true" />
            <span className="text-[10px] font-bold text-live-400 tabular-nums leading-none">
              {minute || 'LIVE'}
            </span>
          </div>
        ) : isFinished ? (
          <span className="text-xs text-gray-400 font-semibold">FT</span>
        ) : (
          <span className="text-xs font-semibold text-gray-400 tabular-nums">
            {format(new Date(match.scheduledAt), 'HH:mm')}
          </span>
        )}
      </div>

      {/* Équipes empilées */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo logo={match.homeTeamLogo} teamId={match.homeTeamId} name={match.homeTeam} />
          <span className={`text-sm font-medium truncate leading-none ${
            isLive ? 'text-white' : homeWins ? 'text-gray-100' : 'text-gray-300'
          }`}>{match.homeTeam}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <TeamLogo logo={match.awayTeamLogo} teamId={match.awayTeamId} name={match.awayTeam} />
          <span className={`text-sm font-medium truncate leading-none ${
            isLive ? 'text-gray-100' : awayWins ? 'text-gray-100' : 'text-gray-400'
          }`}>{match.awayTeam}</span>
        </div>
      </div>

      {/* Scores */}
      <div className="shrink-0 text-right w-5 space-y-2.5">
        {hasScore ? (
          <>
            <span className={`block text-sm font-display font-bold tabular-nums leading-none ${scoreColor(homeWins)}`}>
              {match.homeScore}
            </span>
            <span className={`block text-sm font-display font-bold tabular-nums leading-none ${scoreColor(awayWins)}`}>
              {match.awayScore}
            </span>
          </>
        ) : (
          <>
            <span className="block w-full h-[14px]" />
            <span className="block w-full h-[14px]" />
          </>
        )}
      </div>

      {/* Probabilité, pick & cote simulée — uniquement pour les matchs à venir */}
      {pred && !isFinished && (() => {
        const oddKey = `${match.id}-${pred.bestPick.type}`;
        const odd = getOdd(pred.bestPick.prob, oddKey);
        const value = isValueBet(pred.bestPick.prob, odd);
        return (
          <div className={`shrink-0 text-center rounded-lg px-2.5 py-1.5 min-w-[58px] ${CONF_BG[pred.confidence]}`}>
            <span className={`block text-sm font-bold tabular-nums ${CONF_COLOR[pred.confidence]}`}>
              {pred.bestPick.prob}%
            </span>
            <span className="block text-[11px] text-gray-300 leading-tight whitespace-nowrap mt-0.5 font-semibold uppercase tracking-wide">
              {pred.bestPick.type === 'over25' ? 'O2.5' :
               pred.bestPick.type === 'over15' ? 'O1.5' :
               pred.bestPick.type === 'btts'   ? 'BTTS' :
               pred.bestPick.type}
            </span>
            <span
              className={`mt-1 flex items-center justify-center gap-0.5 font-mono font-semibold tabular-nums text-xs ${value ? 'text-amber-400' : 'text-gray-300'}`}
              title={t('matchCard.simulatedOdd')}
            >
              {value && <Zap size={9} className="shrink-0" aria-hidden="true" />}
              {formatOdd(odd)}
            </span>
          </div>
        );
      })()}
    </Link>

    {/* Actions — visible on hover */}
    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150 focus-within:opacity-100">
      <MatchReminderButton matchId={match.id} scheduledAt={match.scheduledAt} size={13} />
      <button
        onClick={handleShare}
        className="p-1.5 rounded-lg text-green-500/50 hover:text-green-400 hover:bg-green-500/10 transition-colors"
        aria-label={t('matchCard.shareWhatsApp')}
      >
        <WhatsAppIcon className="w-3 h-3" />
      </button>
    </div>
    </div>
  );
}
