// Seed — Données initiales (plans + compétitions FotMob + admin)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// IDs FotMob confirmés par tests directs sur l'API
// Domestic leagues : IDs stables sur toute la saison
// CL/Europa : IDs variables par round/saison (897488 = CL 2024-25 knockout)
// IDs FotMob confirmés. Les compétitions non listées ici seront
// créées automatiquement lors de la première synchronisation API.
const COMPETITIONS = [
  // ── Europe — Top 5 ──────────────────────────────────────────────────────────
  { externalId: '47',  name: 'Premier League',         country: 'Angleterre',    season: '2024/2025' },
  { externalId: '53',  name: 'Ligue 1',                country: 'France',        season: '2024/2025' },
  { externalId: '54',  name: 'Bundesliga',              country: 'Allemagne',     season: '2024/2025' },
  { externalId: '55',  name: 'Serie A',                 country: 'Italie',        season: '2024/2025' },
  { externalId: '87',  name: 'La Liga',                 country: 'Espagne',       season: '2024/2025' },
  // ── Europe — Autres ligues majeures ─────────────────────────────────────────
  { externalId: '68',  name: 'Eredivisie',              country: 'Pays-Bas',      season: '2024/2025' },
  { externalId: '60',  name: 'Primeira Liga',           country: 'Portugal',      season: '2024/2025' },
  { externalId: '61',  name: 'Pro League',              country: 'Belgique',      season: '2024/2025' },
  { externalId: '62',  name: 'Süper Lig',               country: 'Turquie',       season: '2024/2025' },
  { externalId: '65',  name: 'Scottish Premiership',    country: 'Écosse',        season: '2024/2025' },
  { externalId: '64',  name: 'Premier League',          country: 'Russie',        season: '2024/2025' },
  { externalId: '96',  name: 'Ukrainian Premier League',country: 'Ukraine',       season: '2024/2025' },
  { externalId: '88',  name: 'Austrian Bundesliga',     country: 'Autriche',      season: '2024/2025' },
  { externalId: '104', name: 'Ekstraklasa',             country: 'Pologne',       season: '2024/2025' },
  { externalId: '127', name: 'Championship',            country: 'Angleterre',    season: '2024/2025' },
  { externalId: '131', name: 'Ligue 2',                 country: 'France',        season: '2024/2025' },
  { externalId: '57',  name: '2. Bundesliga',           country: 'Allemagne',     season: '2024/2025' },
  // ── Europe — Compétitions UEFA ───────────────────────────────────────────────
  { externalId: '42',     name: 'UEFA Champions League',  country: 'Europe',      season: '2024/2025' },
  { externalId: '73',     name: 'UEFA Europa League',     country: 'Europe',      season: '2024/2025' },
  { externalId: '10216',  name: 'UEFA Conference League', country: 'Europe',      season: '2024/2025' },
  { externalId: '897488', name: 'Champions League KO',    country: 'Europe',      season: '2024/2025' },
  // ── Amérique du Sud ──────────────────────────────────────────────────────────
  { externalId: '82',  name: 'Copa Libertadores',       country: 'Amérique du Sud', season: '2025' },
  { externalId: '83',  name: 'Copa Sudamericana',       country: 'Amérique du Sud', season: '2025' },
  { externalId: '84',  name: 'Série A',                 country: 'Brésil',        season: '2025' },
  { externalId: '85',  name: 'Serie B',                 country: 'Brésil',        season: '2025' },
  { externalId: '112', name: 'Primera División',        country: 'Argentine',     season: '2025' },
  { externalId: '239', name: 'Primera División',        country: 'Chili',         season: '2025' },
  { externalId: '240', name: 'Primera División',        country: 'Colombie',      season: '2025' },
  { externalId: '241', name: 'Primera División',        country: 'Pérou',         season: '2025' },
  { externalId: '242', name: 'Primera División',        country: 'Uruguay',       season: '2025' },
  { externalId: '244', name: 'Primera División',        country: 'Équateur',      season: '2025' },
  // ── Amérique du Nord & Centrale ──────────────────────────────────────────────
  { externalId: '130', name: 'MLS',                     country: 'États-Unis',    season: '2025' },
  { externalId: '199', name: 'Liga MX',                 country: 'Mexique',       season: '2024/2025' },
  { externalId: '235', name: 'Leagues Cup',             country: 'Amérique du Nord', season: '2025' },
  { externalId: '329', name: 'CONCACAF Champions Cup',  country: 'CONCACAF',      season: '2025' },
  // ── Asie ─────────────────────────────────────────────────────────────────────
  { externalId: '351', name: 'Saudi Pro League',        country: 'Arabie Saoudite', season: '2024/2025' },
  { externalId: '36',  name: 'J1 League',               country: 'Japon',         season: '2025' },
  { externalId: '348', name: 'K League 1',              country: 'Corée du Sud',  season: '2025' },
  { externalId: '169', name: 'Chinese Super League',    country: 'Chine',         season: '2025' },
  { externalId: '307', name: 'UAE Pro League',          country: 'Émirats Arabes', season: '2024/2025' },
  { externalId: '308', name: 'Qatar Stars League',      country: 'Qatar',         season: '2024/2025' },
  { externalId: '309', name: 'Iran Pro League',         country: 'Iran',          season: '2024/2025' },
  { externalId: '385', name: 'Indian Super League',     country: 'Inde',          season: '2024/2025' },
  { externalId: '330', name: 'AFC Champions League',    country: 'Asie',          season: '2024/2025' },
  // ── Afrique ──────────────────────────────────────────────────────────────────
  { externalId: '289', name: 'Africa Cup of Nations',   country: 'Afrique',       season: '2025' },
  { externalId: '526', name: 'CAF Champions League',    country: 'Afrique',       season: '2024/2025' },
  { externalId: '530', name: 'Botola Pro',              country: 'Maroc',         season: '2024/2025' },
  { externalId: '9066',name: 'Ligi Kuu Tanzania',       country: 'Tanzanie',      season: '2025' },
  { externalId: '569', name: 'Premier League',          country: 'Égypte',        season: '2024/2025' },
  { externalId: '571', name: 'Premiership',             country: 'Afrique du Sud',season: '2024/2025' },
  { externalId: '574', name: 'Ligue Professionnelle',   country: 'Algérie',       season: '2024/2025' },
  { externalId: '576', name: 'Ligue 1 Pro',             country: 'Tunisie',       season: '2024/2025' },
  { externalId: '578', name: 'GFA Premier League',      country: 'Ghana',         season: '2024/2025' },
  { externalId: '580', name: 'NPFL',                    country: 'Nigéria',       season: '2024/2025' },
  { externalId: '581', name: 'Ligue 1',                 country: 'Sénégal',       season: '2024/2025' },
  { externalId: '582', name: 'Ligue 1',                 country: "Côte d'Ivoire", season: '2024/2025' },
  { externalId: '583', name: 'Ligue Nationale',         country: 'Cameroun',      season: '2024/2025' },
  // ── Compétitions mondiales & Tournois ────────────────────────────────────────
  { externalId: '77',     name: 'FIFA World Cup',         country: 'International', season: '2026' },
  { externalId: '894790', name: 'FIFA World Cup 2026',    country: 'International', season: '2026' },
  { externalId: '936945', name: 'FIFA U20 World Cup',     country: 'International', season: '2025' },
  { externalId: '6',      name: 'FIFA Club World Cup',    country: 'International', season: '2025' },
  { externalId: '140',    name: 'Copa America',           country: 'Amérique du Sud', season: '2024' },
  { externalId: '10',     name: 'UEFA Nations League',    country: 'Europe',        season: '2024/2025' },
  // ── Océanie ──────────────────────────────────────────────────────────────────
  { externalId: '371', name: 'A-League Men',             country: 'Australie',     season: '2024/2025' },
];

// anciens externalIds API-Football à remplacer
const OLD_EXTERNAL_IDS = ['61', '140', '39', '135', '78', '2', '892', '529'];

async function main() {
  // ── Plans d'abonnement ───────────────────────────────────────────────────────
  const plans = [
    {
      code: 'FREE', displayName: 'Gratuit', priceMonthly: 0, priceYearly: 0, sortOrder: 0,
      features: [
        'Calendrier et résultats du jour',
        'Scores en direct',
        'Classement des tipsters (aperçu)',
        'Accès limité aux pronostics',
      ],
    },
    {
      code: 'PREMIUM', displayName: 'Premium', priceMonthly: 1500, priceYearly: 15000, sortOrder: 1,
      features: [
        'Tout du plan Gratuit',
        'Historique des confrontations directes',
        'Forme récente (10 derniers matchs)',
        'Compositions probables',
        'Blessures et suspensions',
        'Publication de pronostics',
        'Classement complet des tipsters',
        'Notifications par email',
      ],
    },
    {
      code: 'PRO', displayName: 'Pro', priceMonthly: 3000, priceYearly: 30000, sortOrder: 2,
      features: [
        'Tout du plan Premium',
        'Statistiques avancées (possession, xG, passes)',
        'Alertes matchs en temps réel',
        'Export des données',
        'Badge Pro tipster',
        'Support prioritaire',
        'Accès anticipé aux nouvelles fonctionnalités',
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }
  console.log('✅ Plans créés');

  // ── Migration : suppression des anciennes compétitions API-Football ──────────
  // (les matchs liés seront supprimés d'abord pour respecter les FK)
  const oldComps = await prisma.competition.findMany({
    where: { externalId: { in: OLD_EXTERNAL_IDS } },
    select: { id: true },
  });
  if (oldComps.length > 0) {
    const oldIds = oldComps.map((c) => c.id);
    await prisma.match.deleteMany({ where: { competitionId: { in: oldIds } } });
    await prisma.competition.deleteMany({ where: { id: { in: oldIds } } });
    console.log(`🔄 ${oldComps.length} anciennes compétitions (API-Football IDs) supprimées`);
  }

  // ── Compétitions (IDs FotMob) ────────────────────────────────────────────────
  for (const comp of COMPETITIONS) {
    await prisma.competition.upsert({
      where: { externalId: comp.externalId },
      update: { name: comp.name, country: comp.country, season: comp.season },
      create: comp,
    });
  }
  console.log(`✅ ${COMPETITIONS.length} compétitions créées/mises à jour (IDs FotMob)`);

  // ── Compte admin ─────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@2024!', 12);
  const proPlan = await prisma.plan.findUnique({ where: { code: 'PRO' } });
  await prisma.user.upsert({
    where: { email: 'admin@statistiquefoot.sn' },
    update: {},
    create: {
      email: 'admin@statistiquefoot.sn',
      password: adminPassword,
      username: 'admin',
      role: 'ADMIN',
      profile: { create: { displayName: 'Administrateur' } },
      subscription: { create: { planId: proPlan.id, status: 'ACTIVE' } },
    },
  });
  console.log('✅ Compte admin créé (admin@statistiquefoot.sn / Admin@2024!)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
