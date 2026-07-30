import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Trophy, Users, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function HighlightMatch({ text, query }) {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-primary-500/25 text-primary-300 rounded">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function SearchBar({ onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Debounced search
  const doSearch = useCallback(
    debounce(async (q) => {
      if (!q || q.length < 2) { setResults(null); setLoading(false); return; }
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`);
        setResults(data.data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (v.length >= 2) setLoading(true);
    doSearch(v);
  };

  const go = (path) => { navigate(path); onClose(); };

  const hasResults = results && (
    results.matches?.length > 0 ||
    results.tipsters?.length > 0 ||
    results.competitions?.length > 0
  );

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 right-0 z-[501] mx-auto max-w-xl w-full"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div
          className="mx-4 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: 'rgb(var(--surface-900-rgb) / 0.99)', border: '1px solid rgb(var(--overlay-rgb) / 0.1)' }}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-overlay/[0.07]">
            <Search size={18} className="text-ink-3 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              placeholder={t('search.placeholder', 'Rechercher matchs, tipsters...')}
              className="flex-1 bg-transparent text-ink-1 placeholder-ph-b text-[15px] outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults(null); inputRef.current?.focus(); }}
                className="p-1 rounded-lg text-ink-3 hover:text-ink-2 transition-colors">
                <X size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-[12px] text-ink-3 hover:text-ink-2 border border-overlay/[0.08] rounded px-2 py-0.5 transition-colors shrink-0"
            >
              Esc
            </button>
          </div>

          {/* Results */}
          {loading && (
            <div className="px-4 py-6 text-center">
              <div className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-400 rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <p className="px-4 py-6 text-center text-ink-3 text-sm">
              {t('search.noResults', 'Aucun résultat pour')} <strong className="text-ink-3">"{query}"</strong>
            </p>
          )}

          {!loading && hasResults && (
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain">

              {/* Matchs */}
              {results.matches?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Calendar size={12} className="text-ink-4" />
                    <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">
                      {t('search.matches', 'Matchs')}
                    </span>
                  </div>
                  {results.matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => go(`/matchs/${m.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.04] transition-colors text-left"
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: m.status === 'LIVE' ? '#ef4444' : '#4b5563' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-2 truncate">
                          <HighlightMatch text={`${m.homeTeam} vs ${m.awayTeam}`} query={query} />
                        </p>
                        <p className="text-[11px] text-ink-4 truncate">
                          {m.competition?.name}
                          {m.status === 'LIVE' && <span className="ml-2 text-live-400 font-semibold">LIVE</span>}
                        </p>
                      </div>
                      {(m.status === 'LIVE' || m.status === 'FINISHED') && (
                        <span className="text-[13px] font-bold text-ink-3 shrink-0">
                          {m.homeScore}–{m.awayScore}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Tipsters */}
              {results.tipsters?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-t border-overlay/[0.04]">
                    <Users size={12} className="text-ink-4" />
                    <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">
                      {t('search.tipsters', 'Tipsters')}
                    </span>
                  </div>
                  {results.tipsters.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => go(`/tipsters/${u.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.04] transition-colors text-left"
                    >
                      {u.profile?.avatar ? (
                        <img src={u.profile.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-[11px] font-bold flex items-center justify-center shrink-0">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-2 truncate">
                          <HighlightMatch text={u.profile?.displayName || u.username} query={query} />
                        </p>
                        <p className="text-[11px] text-ink-4">@{u.username}</p>
                      </div>
                      {u.tipsterStats && (
                        <span className="text-[11px] text-primary-400 font-semibold shrink-0">
                          {Math.round(u.tipsterStats.successRate)}%
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Compétitions */}
              {results.competitions?.length > 0 && (
                <div className="pb-2">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-1 border-t border-overlay/[0.04]">
                    <Trophy size={12} className="text-ink-4" />
                    <span className="text-[11px] font-semibold text-ink-4 uppercase tracking-wider">
                      {t('search.competitions', 'Compétitions')}
                    </span>
                  </div>
                  {results.competitions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go(`/matchs?competitionId=${c.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-overlay/[0.04] transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-overlay/[0.04] flex items-center justify-center shrink-0">
                        {c.logo ? (
                          <img src={c.logo} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <Trophy size={13} className="text-ink-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-ink-2 truncate">
                          <HighlightMatch text={c.name} query={query} />
                        </p>
                        <p className="text-[11px] text-ink-4">{c.country}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hint */}
          {!query && (
            <div className="px-4 py-4 text-center">
              <p className="text-[12px] text-ink-4">
                {t('search.hint', 'Tapez pour rechercher des matchs, tipsters ou compétitions')}
              </p>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
