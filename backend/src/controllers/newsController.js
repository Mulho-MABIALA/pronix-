const axios = require('axios');

const RSS_SOURCES = [
  { url: 'https://www.rfi.fr/fr/sports/football/rss', source: 'RFI' },
  { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
  { url: 'https://www.goal.com/fr/rss/accueil', source: 'Goal.com' },
];

function parseRSS(xml, sourceName) {
  const items = [];
  const itemMatches = xml.match(/<item[\s>]([\s\S]*?)<\/item>/g) || [];

  for (const itemXml of itemMatches.slice(0, 8)) {
    const get = (tag) => {
      const cdata = itemXml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`));
      if (cdata) return cdata[1].trim();
      const normal = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return normal ? normal[1].replace(/<[^>]+>/g, '').trim() : '';
    };

    const title = get('title');
    const link = get('link') || itemXml.match(/<link>([^<]+)/)?.[1] || '';
    const description = get('description').slice(0, 200);
    const pubDate = get('pubDate');
    const image =
      itemXml.match(/url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
      itemXml.match(/<media:content[^>]+url="([^"]+)"/i)?.[1] ||
      null;

    if (title && link) {
      items.push({ title, link, description, pubDate, image, source: sourceName });
    }
  }
  return items;
}

async function getNews(req, res, next) {
  try {
    const allArticles = [];

    await Promise.allSettled(
      RSS_SOURCES.map(async ({ url, source }) => {
        try {
          const { data } = await axios.get(url, {
            timeout: 8000,
            headers: { 'User-Agent': 'StatistiqueFoot/1.0 RSS-reader' },
          });
          allArticles.push(...parseRSS(data, source));
        } catch (err) {
          console.error(`[News] Source ${source} inaccessible:`, err.message);
        }
      })
    );

    allArticles.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });

    res.json({ success: true, data: allArticles.slice(0, 24) });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNews };
