import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Zap, TrendingUp, BarChart2 } from 'lucide-react';

const TOOLS = [
  {
    id: 'filtres',
    badge: 'Outil',
    title: 'Filtres avancés',
    description: "Filtrez les matchs par marché, confiance et probabilité pour trouver les meilleures opportunités.",
    cta: 'Essayer',
    to: '/outils/filtres',
    icon: SlidersHorizontal,
    gradient: 'linear-gradient(135deg, #0a1f14 0%, #103322 55%, #09bb57 130%)',
  },
  {
    id: 'machine',
    badge: 'Populaire',
    title: 'Générateur de tickets',
    description: 'Génère un ticket combiné optimisé selon tes critères, prêt à partager en image.',
    cta: 'Générer',
    to: '/outils/machine',
    icon: Zap,
    gradient: 'linear-gradient(135deg, #1a1106 0%, #3a2308 55%, #f97316 130%)',
    accent: true,
  },
  {
    id: 'pronostics',
    badge: 'Communauté',
    title: 'Pronostics tipsters',
    description: 'Suis les pronostics publiés par les meilleurs tipsters et leur taux de réussite réel.',
    cta: 'Découvrir',
    to: '/pronostics',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg, #0a1420 0%, #122538 55%, #2563eb 130%)',
  },
  {
    id: 'stats',
    badge: 'Données',
    title: 'Stats par ligue',
    description: 'Buts moyens, BTTS, Over 2.5 — compare toutes les compétitions du monde en un coup d\'œil.',
    cta: 'Comparer',
    to: '/outils/stats-ligues',
    icon: BarChart2,
    gradient: 'linear-gradient(135deg, #160a20 0%, #2a1238 55%, #a855f7 130%)',
  },
];

export default function ToolsCarousel() {
  const trackRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback((index) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[index];
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
  }, []);

  const handleScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;
    let closest = 0;
    let closestDist = Infinity;
    Array.from(track.children).forEach((card, i) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - center);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => track.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const prev = () => scrollToIndex(Math.max(0, activeIndex - 1));
  const next = () => scrollToIndex(Math.min(TOOLS.length - 1, activeIndex + 1));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-title">Outils Pronix</h2>
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={prev}
            aria-label="Précédent"
            className="w-8 h-8 rounded-full bg-surface-800 border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={next}
            aria-label="Suivant"
            className="w-8 h-8 rounded-full bg-surface-800 border border-white/[0.06] flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide"
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              to={tool.to}
              className="group relative shrink-0 w-[82%] sm:w-[340px] h-[220px] rounded-2xl overflow-hidden snap-start border border-white/[0.06] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ background: tool.gradient }}
            >
              {/* Voile sombre pour la lisibilité du texte */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

              {/* Icône décorative géante en fond */}
              <Icon
                size={140}
                strokeWidth={1}
                className="absolute -right-6 -bottom-6 text-white/[0.08] pointer-events-none"
              />

              <div className="relative h-full flex flex-col justify-between p-5">
                <span
                  className={`inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-sm ${
                    tool.accent
                      ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                      : 'bg-white/10 text-white/90 border border-white/10'
                  }`}
                >
                  <Icon size={12} />
                  {tool.badge}
                </span>

                <div>
                  <h3 className="font-display font-bold text-xl text-white mb-1.5 leading-snug">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed mb-4 line-clamp-2">
                    {tool.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 bg-white text-surface-900 text-sm font-semibold px-4 py-2 rounded-xl group-hover:gap-2.5 transition-all">
                    {tool.cta}
                    <ChevronRight size={15} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {TOOLS.map((tool, i) => (
          <button
            key={tool.id}
            onClick={() => scrollToIndex(i)}
            aria-label={`Aller à ${tool.title}`}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? 'w-6 bg-primary-500' : 'w-1.5 bg-surface-600'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
