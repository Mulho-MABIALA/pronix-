/**
 * Service météo — prévision au stade à l'heure du coup d'envoi
 * ─────────────────────────────────────────────────────────────────────────────
 * Source : Open-Meteo (https://open-meteo.com) — gratuit, sans clé API.
 *  1. Géocodage de la ville du stade (match.venueCity, fournie par API-Football)
 *  2. Prévision horaire → on garde l'heure la plus proche du coup d'envoi
 *
 * Fenêtre : uniquement pour les matchs dans les WEATHER_MAX_DAYS prochains
 * jours (au-delà, la prévision n'est pas assez fiable pour être affichée ou
 * donnée à l'IA) — et jusqu'à 3h après le coup d'envoi (match en cours).
 *
 * Toute erreur (réseau, ville introuvable...) renvoie null : la météo est un
 * bonus, elle ne doit jamais faire échouer une page match ou une prédiction.
 */
const axios = require('axios');

const GEOCODE_URL  = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_MAX_DAYS = 5;
const HOUR_MS = 60 * 60 * 1000;

// ─── Caches mémoire ────────────────────────────────────────────────────────────
// Géocodage : une ville ne bouge pas → cache illimité (taille bornée).
// Prévision : 3h (Open-Meteo met ses modèles à jour plusieurs fois par jour).
const geoCache = new Map();
const weatherCache = new Map();
const WEATHER_TTL = 3 * HOUR_MS;
const MAX_CACHE = 2000;

function boundedSet(map, key, value) {
  if (map.size >= MAX_CACHE) map.delete(map.keys().next().value);
  map.set(key, value);
}

async function geocodeCity(city) {
  const key = city.trim().toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);

  // API-Football renvoie parfois "Paris, Île-de-France" ou "Manchester, Greater
  // Manchester" — seule la première partie est utile au géocodage.
  const name = city.split(',')[0].trim();
  const { data } = await axios.get(GEOCODE_URL, {
    params: { name, count: 1, language: 'fr', format: 'json' },
    timeout: 5000,
  });
  const r = data?.results?.[0];
  const coords = r ? { lat: r.latitude, lon: r.longitude } : null;
  boundedSet(geoCache, key, coords); // null aussi mis en cache : évite de re-tenter une ville inconnue
  return coords;
}

// Codes météo WMO (utilisés par Open-Meteo) → catégorie simple
function conditionFromCode(code) {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  return 'cloudy';
}

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Prévision météo au stade pour un match.
 * @param {Object} match — { id, venueCity, scheduledAt }
 * @returns {Promise<Object|null>} { city, temperature, precipitationProbability,
 *   precipitation, windSpeed, condition, flags: { rain, wind, heat, cold } }
 */
async function getMatchWeather(match) {
  try {
    if (!match?.venueCity || !match.scheduledAt) return null;

    const kickoff = new Date(match.scheduledAt);
    const diff = kickoff.getTime() - Date.now();
    if (diff > WEATHER_MAX_DAYS * 24 * HOUR_MS || diff < -3 * HOUR_MS) return null;

    const cacheKey = `${match.venueCity}|${kickoff.toISOString()}`;
    const hit = weatherCache.get(cacheKey);
    if (hit && Date.now() < hit.expiresAt) return hit.value;

    const coords = await geocodeCity(match.venueCity);
    if (!coords) return null;

    const { data } = await axios.get(FORECAST_URL, {
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        hourly: 'temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code',
        timezone: 'GMT',
        start_date: toDateStr(kickoff),
        end_date: toDateStr(kickoff),
      },
      timeout: 5000,
    });

    const h = data?.hourly;
    if (!h?.time?.length) return null;

    // Heure la plus proche du coup d'envoi (times en UTC, format "YYYY-MM-DDTHH:00")
    let best = 0;
    let bestDiff = Infinity;
    h.time.forEach((t, i) => {
      const d = Math.abs(new Date(`${t}:00Z`).getTime() - kickoff.getTime());
      if (d < bestDiff) { bestDiff = d; best = i; }
    });

    const temperature = h.temperature_2m?.[best];
    if (temperature == null) return null;

    const precipitationProbability = h.precipitation_probability?.[best] ?? null;
    const precipitation = h.precipitation?.[best] ?? 0;
    const windSpeed = h.wind_speed_10m?.[best] ?? 0;
    const condition = conditionFromCode(h.weather_code?.[best]);

    const weather = {
      city: match.venueCity.split(',')[0].trim(),
      temperature: Math.round(temperature),
      precipitationProbability,
      precipitation: Math.round(precipitation * 10) / 10,
      windSpeed: Math.round(windSpeed),
      condition,
      // Seuils volontairement simples — ce qui influence réellement le jeu
      flags: {
        rain: precipitation >= 1 || ['rain', 'storm', 'snow'].includes(condition),
        wind: windSpeed >= 30,
        heat: temperature >= 30,
        cold: temperature <= 2,
      },
    };

    boundedSet(weatherCache, cacheKey, { value: weather, expiresAt: Date.now() + WEATHER_TTL });
    return weather;
  } catch (err) {
    console.warn(`[Météo] Indisponible pour ${match?.venueCity}:`, err.message);
    return null;
  }
}

// Résumé texte pour les prompts IA
function formatWeatherForPrompt(weather) {
  if (!weather) return null;
  const parts = [
    `${weather.temperature}°C`,
    weather.precipitationProbability != null ? `pluie ${weather.precipitationProbability}%` : null,
    weather.precipitation > 0 ? `${weather.precipitation} mm/h` : null,
    `vent ${weather.windSpeed} km/h`,
  ].filter(Boolean);
  const notes = [];
  if (weather.flags.rain) notes.push('terrain potentiellement lourd/glissant');
  if (weather.flags.wind) notes.push('vent fort gênant le jeu long');
  if (weather.flags.heat) notes.push('forte chaleur, fatigue en fin de match');
  if (weather.flags.cold) notes.push('grand froid');
  return `Météo prévue au coup d'envoi (${weather.city}) : ${parts.join(', ')}${notes.length ? ` — ${notes.join(', ')}` : ''}. Facteur secondaire : à pondérer faiblement.`;
}

module.exports = { getMatchWeather, formatWeatherForPrompt };
