// Newsfeed built from Google News RSS search results, one query per topic.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", '#x27': "'" };

export function decodeEntities(text = '') {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, name) => {
      const key = name.toLowerCase();
      if (key in ENTITIES) return ENTITIES[key];
      if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
      if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10));
      return m;
    })
    .trim();
}

export function buildFeedUrl(topic) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
}

export function parseRss(xml, topic) {
  const items = [];
  for (const [, body] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const tag = (name) => {
      const m = body.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`));
      return m ? decodeEntities(m[1]) : '';
    };
    const title = tag('title');
    const link = tag('link');
    if (!title || !link) continue;
    const published = Date.parse(tag('pubDate'));
    items.push({
      title,
      link,
      source: tag('source') || '',
      published: Number.isFinite(published) ? new Date(published).toISOString() : null,
      topic,
    });
  }
  return items;
}

export async function fetchNewsfeed(topics, { fetchImpl = fetch, perTopic = 8 } = {}) {
  const results = await Promise.all(
    topics.map(async (topic) => {
      try {
        const res = await fetchImpl(buildFeedUrl(topic), { headers: { 'user-agent': 'everythingapp/0.1' } });
        if (!res.ok) return [];
        return parseRss(await res.text(), topic).slice(0, perTopic);
      } catch {
        return [];
      }
    }),
  );

  const seen = new Set();
  return results
    .flat()
    .filter((item) => (seen.has(item.link) ? false : seen.add(item.link)))
    .sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''));
}
