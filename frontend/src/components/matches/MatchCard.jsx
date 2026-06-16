import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const FOTMOB_CDN = (id) =>
  id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png` : null;

function TeamLogo({ logo, teamId, name, size = 20 }) {
  const [err, setErr] = useState(false);
  const src = logo || FOTMOB_CDN(teamId);
  if (src && !err) {
    return (
      <img src={src} alt="" aria-hidden="true"
        style={{ width: size, height: size }}
        className="object-contain shrink-0"
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="rounded-full bg-surface-600 flex items-center justify-center text-gray-500 font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

// Couleur de confiance
const CONF_COLOR = { high: 'text-primary-400', medium: 'text-amber-400', low: 'text-gray-500' };

export default function MatchCard({ match }) {
  const isLive     = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const hasScore   = isLive || isFinished;
  const minute     = match.minute === 'HT' ? 'MT' : match.minute;
  const homeWins   = hasScore && match.homeScore > match.awayScore;
  const awayWins   = hasScore && match.awayScore > match.homeScore;
  const pred       = match.predictions;

  return (
    <Link
      to={`/matchs/${match.id}`}
      className="match-row flex items-center gap-2 px-3 py-3 animate-fade-in"
      aria-label={`${match.homeTeam} vs ${match.awayTeam}`}
    >
      {/* Statut / heure */}
      <div className="w-10 shrink-0 text-center">
        {isLive ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
            <span className="text-[10px] font-bold text-red-400 tabular-nums leading-none">
              {minute || 'LIVE'}
            </span>
          </div>
        ) : isFinished ? (
          <span className="text-[10px] text-gray-600 font-semibold">FT</span>
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
            <span className={`block text-sm font-display font-bold tabular-nums leading-none ${homeWins ? 'text-white' : 'text-gray-500'}`}>
              {match.homeScore}
            </span>
            <span className={`block text-sm font-display font-bold tabular-nums leading-none ${awayWins ? 'text-white' : 'text-gray-500'}`}>
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

      {/* Probabilité & pick — uniquement pour les matchs à venir */}
      {pred && !isFinished && (
        <div className="shrink-0 text-right pl-2 border-l border-white/[0.05] min-w-[60px]">
          <span className={`block text-sm font-bold tabular-nums ${CONF_COLOR[pred.confidence]}`}>
            {pred.bestPick.prob}%
          </span>
          <span className="block text-[9px] text-gray-600 leading-tight whitespace-nowrap mt-0.5">
            {pred.bestPick.type === 'over25' ? 'O2.5' :
             pred.bestPick.type === 'over15' ? 'O1.5' :
             pred.bestPick.type === 'btts'   ? 'BTTS' :
             pred.bestPick.type}
          </span>
        </div>
      )}
    </Link>
  );
}
