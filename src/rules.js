// Pure alert logic: takes events and emails, returns a sorted list of alerts.
const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

export function evaluateAlerts({ events = [], emails = [], now = new Date(), config }) {
  const alerts = [];
  const nowMs = now.getTime();
  const leadMs = config.leadMinutes * 60_000;

  const timed = events
    .map((e) => ({ ...e, startMs: Date.parse(e.start), endMs: Date.parse(e.end) }))
    .filter((e) => Number.isFinite(e.startMs) && Number.isFinite(e.endMs))
    .sort((a, b) => a.startMs - b.startMs);

  for (const e of timed) {
    const untilStart = e.startMs - nowMs;
    if (untilStart >= 0 && untilStart <= leadMs) {
      const minutes = Math.max(0, Math.round(untilStart / 60_000));
      alerts.push({
        id: `soon:${e.id}`,
        kind: 'meeting-soon',
        severity: minutes <= 10 ? 'high' : 'medium',
        title: `${e.title} starts in ${minutes} min`,
        detail: e.location || '',
        at: e.start,
      });
    }
  }

  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length && timed[j].startMs < timed[i].endMs; j++) {
      alerts.push({
        id: `conflict:${timed[i].id}:${timed[j].id}`,
        kind: 'conflict',
        severity: 'high',
        title: `Overlap: "${timed[i].title}" and "${timed[j].title}"`,
        detail: '',
        at: timed[j].start,
      });
    }
  }

  for (const m of emails) {
    const from = (m.from ?? '').toLowerCase();
    const text = `${m.subject ?? ''} ${m.snippet ?? ''}`.toLowerCase();
    if (config.vipSenders.some((v) => from.includes(v))) {
      alerts.push({
        id: `vip:${m.id}`,
        kind: 'vip-email',
        severity: 'high',
        title: `Email from ${m.from}: ${m.subject}`,
        detail: m.snippet ?? '',
        at: m.date,
      });
    } else if (config.keywords.some((k) => text.includes(k))) {
      alerts.push({
        id: `keyword:${m.id}`,
        kind: 'keyword-email',
        severity: 'medium',
        title: `Important email: ${m.subject}`,
        detail: m.snippet ?? '',
        at: m.date,
      });
    }
  }

  return alerts.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || String(a.at).localeCompare(String(b.at)),
  );
}
