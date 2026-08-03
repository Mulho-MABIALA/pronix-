// Indicatifs téléphoniques proposés pour le numéro de contact du profil.
// Afrique francophone (audience principale de fpronix) en tête, puis reste
// de l'Afrique, puis reste du monde. Triés par longueur de code décroissante
// dans `matchPhoneCode` pour ne jamais confondre par ex. +1 avec +1xxx.
export const PHONE_CODES = [
  // ── Afrique francophone (audience principale) ──────────────────────────
  { code: '+221', flag: '🇸🇳', label: 'Sénégal' },
  { code: '+225', flag: '🇨🇮', label: "Côte d'Ivoire" },
  { code: '+223', flag: '🇲🇱', label: 'Mali' },
  { code: '+226', flag: '🇧🇫', label: 'Burkina Faso' },
  { code: '+224', flag: '🇬🇳', label: 'Guinée' },
  { code: '+229', flag: '🇧🇯', label: 'Bénin' },
  { code: '+228', flag: '🇹🇬', label: 'Togo' },
  { code: '+227', flag: '🇳🇪', label: 'Niger' },
  { code: '+237', flag: '🇨🇲', label: 'Cameroun' },
  { code: '+241', flag: '🇬🇦', label: 'Gabon' },
  { code: '+242', flag: '🇨🇬', label: 'Congo-Brazzaville' },
  { code: '+243', flag: '🇨🇩', label: 'RD Congo' },
  { code: '+235', flag: '🇹🇩', label: 'Tchad' },
  { code: '+236', flag: '🇨🇫', label: 'République centrafricaine' },
  { code: '+261', flag: '🇲🇬', label: 'Madagascar' },
  { code: '+212', flag: '🇲🇦', label: 'Maroc' },
  { code: '+213', flag: '🇩🇿', label: 'Algérie' },
  { code: '+216', flag: '🇹🇳', label: 'Tunisie' },
  { code: '+222', flag: '🇲🇷', label: 'Mauritanie' },
  { code: '+245', flag: '🇬🇼', label: 'Guinée-Bissau' },
  { code: '+240', flag: '🇬🇶', label: 'Guinée équatoriale' },
  { code: '+269', flag: '🇰🇲', label: 'Comores' },
  { code: '+253', flag: '🇩🇯', label: 'Djibouti' },
  { code: '+250', flag: '🇷🇼', label: 'Rwanda' },
  { code: '+257', flag: '🇧🇮', label: 'Burundi' },

  // ── Reste de l'Afrique ───────────────────────────────────────────────────
  { code: '+234', flag: '🇳🇬', label: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', label: 'Ghana' },
  { code: '+27',  flag: '🇿🇦', label: 'Afrique du Sud' },
  { code: '+254', flag: '🇰🇪', label: 'Kenya' },
  { code: '+251', flag: '🇪🇹', label: 'Éthiopie' },
  { code: '+20',  flag: '🇪🇬', label: 'Égypte' },
  { code: '+244', flag: '🇦🇴', label: 'Angola' },
  { code: '+258', flag: '🇲🇿', label: 'Mozambique' },
  { code: '+255', flag: '🇹🇿', label: 'Tanzanie' },
  { code: '+256', flag: '🇺🇬', label: 'Ouganda' },
  { code: '+260', flag: '🇿🇲', label: 'Zambie' },
  { code: '+263', flag: '🇿🇼', label: 'Zimbabwe' },
  { code: '+238', flag: '🇨🇻', label: 'Cap-Vert' },
  { code: '+232', flag: '🇸🇱', label: 'Sierra Leone' },
  { code: '+231', flag: '🇱🇷', label: 'Liberia' },
  { code: '+220', flag: '🇬🇲', label: 'Gambie' },

  // ── Reste du monde ───────────────────────────────────────────────────────
  { code: '+33',  flag: '🇫🇷', label: 'France' },
  { code: '+32',  flag: '🇧🇪', label: 'Belgique' },
  { code: '+41',  flag: '🇨🇭', label: 'Suisse' },
  { code: '+1',   flag: '🇨🇦', label: 'Canada / États-Unis' },
  { code: '+44',  flag: '🇬🇧', label: 'Royaume-Uni' },
  { code: '+49',  flag: '🇩🇪', label: 'Allemagne' },
  { code: '+34',  flag: '🇪🇸', label: 'Espagne' },
  { code: '+39',  flag: '🇮🇹', label: 'Italie' },
  { code: '+351', flag: '🇵🇹', label: 'Portugal' },
  { code: '+31',  flag: '🇳🇱', label: 'Pays-Bas' },
  { code: '+55',  flag: '🇧🇷', label: 'Brésil' },
  { code: '+971', flag: '🇦🇪', label: 'Émirats arabes unis' },
  { code: '+966', flag: '🇸🇦', label: 'Arabie saoudite' },
];

// Retrouve l'indicatif d'un numéro complet stocké en base (ex: "+221771234567")
// en testant du plus long au plus court pour éviter les faux positifs (+1 vs +221 etc.)
export function matchPhoneCode(fullPhone) {
  if (!fullPhone) return null;
  const sorted = [...PHONE_CODES].sort((a, b) => b.code.length - a.code.length);
  return sorted.find((c) => fullPhone.startsWith(c.code)) || null;
}
