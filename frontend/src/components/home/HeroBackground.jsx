const ROW_1 = [
  'photo-1522778119026-d647f0596c20',
  'photo-1579952363873-27f3bade9f55',
  'photo-1546608235-3310a2494cdf',
  'photo-1489944440615-453fc2b6a9a9',
  'photo-1431324155629-1a6deb1dec8d',
  'photo-1517747614396-d21a78b850e8',
  'photo-1599158150601-1417ebbaafdd',
];

const ROW_2 = [
  'photo-1629217855633-79a6925d6c47',
  'photo-1434648957308-5e6a859697e8',
  'photo-1459865264687-595d652de67e',
  'photo-1430232324554-8f4aebd06683',
  'photo-1569531955323-33c6b2dca44b',
  'photo-1543351611-58f69d7c1781',
  'photo-1512719994953-eabf50895df7',
];

function imgUrl(id) {
  return `https://images.unsplash.com/${id}?fm=jpg&q=60&w=600&auto=format&fit=crop`;
}

function Row({ ids, direction = 'left', className = '' }) {
  // doublé pour boucler sans coupure
  const track = [...ids, ...ids];
  const anim = direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse';

  return (
    <div className={`flex gap-3 w-max ${anim} ${className}`}>
      {track.map((id, i) => (
        <div
          key={`${id}-${i}`}
          className="w-44 h-28 md:w-56 md:h-36 rounded-xl overflow-hidden shrink-0 border border-white/[0.06]"
        >
          <img
            src={imgUrl(id)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

export default function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 flex flex-col justify-center gap-3 opacity-90">
        <Row ids={ROW_1} direction="left" />
        <Row ids={ROW_2} direction="right" />
      </div>

      {/* Voile léger pour lisibilité, sans masquer les images */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(160deg, rgba(23,24,25,0.55) 0%, rgba(23,24,25,0.3) 45%, rgba(23,24,25,0.6) 100%)' }} />
      {/* Vignette sur les bords pour fondre dans la carte */}
      <div className="absolute inset-0"
        style={{ boxShadow: 'inset 0 0 90px 30px rgba(23,24,25,0.65)' }} />
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 0%, rgba(26,166,86,0.15) 0%, transparent 70%)' }} />
    </div>
  );
}
