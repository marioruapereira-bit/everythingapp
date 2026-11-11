const list = (value) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT ?? 3000),
    provider: env.PROVIDER ?? 'mock',
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      refreshToken: env.GOOGLE_REFRESH_TOKEN ?? '',
    },
    alerts: {
      leadMinutes: Number(env.ALERT_LEAD_MINUTES ?? 30),
      vipSenders: list(env.VIP_SENDERS).map((s) => s.toLowerCase()),
      keywords: list(env.ALERT_KEYWORDS ?? 'urgent,invoice,deadline,action required').map((s) =>
        s.toLowerCase(),
      ),
    },
    defaultTopics: list(env.NEWS_TOPICS ?? 'artificial intelligence,personal finance'),
    topicsFile: env.TOPICS_FILE ?? new URL('../data/topics.json', import.meta.url).pathname,
  };
}
