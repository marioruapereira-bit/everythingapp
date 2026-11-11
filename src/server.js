import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { createMockProvider } from './providers/mock.js';
import { createGoogleProvider } from './providers/google.js';
import { evaluateAlerts } from './rules.js';
import { fetchNewsfeed } from './news.js';
import { createTopicStore } from './topics.js';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');
const NEWS_TTL_MS = 15 * 60_000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

export function createApp(config = loadConfig(), deps = {}) {
  const provider =
    deps.provider ??
    (config.provider === 'google'
      ? createGoogleProvider(config.google)
      : createMockProvider());
  const topics = deps.topics ?? createTopicStore(config.topicsFile, config.defaultTopics);
  const newsCache = { key: '', at: 0, items: [] };

  async function news(topicList) {
    const key = topicList.join('|');
    if (newsCache.key === key && Date.now() - newsCache.at < NEWS_TTL_MS) return newsCache.items;
    const items = await fetchNewsfeed(topicList, { fetchImpl: deps.fetchImpl });
    Object.assign(newsCache, { key, at: Date.now(), items });
    return items;
  }

  async function dashboard() {
    const now = new Date();
    const errors = {};
    const [events, emails, topicList] = await Promise.all([
      provider.getEvents().catch((e) => ((errors.calendar = e.message), [])),
      provider.getEmails().catch((e) => ((errors.email = e.message), [])),
      topics.load(),
    ]);
    const newsItems = await news(topicList).catch((e) => ((errors.news = e.message), []));
    const alerts = evaluateAlerts({ events, emails, now, config: config.alerts });
    return {
      provider: provider.name,
      generatedAt: now.toISOString(),
      alerts,
      events: [...events].sort((a, b) => String(a.start).localeCompare(String(b.start))),
      emails,
      news: newsItems,
      topics: topicList,
      errors,
    };
  }

  async function readJson(req) {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 10_000) throw Object.assign(new Error('Body too large'), { status: 413 });
    }
    return body ? JSON.parse(body) : {};
  }

  function send(res, status, payload) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(payload));
  }

  async function serveStatic(res, pathname) {
    const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
    const file = normalize(join(publicDir, rel));
    if (!file.startsWith(publicDir)) return send(res, 403, { error: 'Forbidden' });
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      send(res, 404, { error: 'Not found' });
    }
  }

  return createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && pathname === '/api/dashboard') return send(res, 200, await dashboard());
      if (pathname === '/api/topics' && req.method === 'GET') return send(res, 200, { topics: await topics.load() });
      if (pathname === '/api/topics' && req.method === 'PUT') {
        const body = await readJson(req);
        if (!Array.isArray(body.topics)) return send(res, 400, { error: 'topics must be an array' });
        return send(res, 200, { topics: await topics.save(body.topics) });
      }
      if (req.method === 'GET' && !pathname.startsWith('/api/')) return serveStatic(res, pathname);
      send(res, 404, { error: 'Not found' });
    } catch (e) {
      send(res, e.status ?? 500, { error: e.message });
    }
  });
}

// Start the server only when run directly, not when imported by tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = loadConfig();
  if (config.provider === 'google' && !(config.google.clientId && config.google.clientSecret && config.google.refreshToken)) {
    console.error('PROVIDER=google needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN');
    process.exit(1);
  }
  createApp(config).listen(config.port, () => {
    console.log(`everythingapp running on http://localhost:${config.port} (provider: ${config.provider})`);
  });
}
