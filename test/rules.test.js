import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAlerts } from '../src/rules.js';

const config = { leadMinutes: 30, vipSenders: ['ana@example.com'], keywords: ['invoice', 'urgent'] };
const now = new Date('2026-11-11T10:00:00Z');
const ev = (id, startMin, durMin) => ({
  id,
  title: `Event ${id}`,
  start: new Date(now.getTime() + startMin * 60_000).toISOString(),
  end: new Date(now.getTime() + (startMin + durMin) * 60_000).toISOString(),
  location: '',
});

test('alerts for meetings starting within the lead time', () => {
  const alerts = evaluateAlerts({ events: [ev('a', 20, 30), ev('b', 90, 30)], now, config });
  const soon = alerts.filter((a) => a.kind === 'meeting-soon');
  assert.equal(soon.length, 1);
  assert.equal(soon[0].id, 'soon:a');
  assert.equal(soon[0].severity, 'medium');
});

test('meeting within 10 minutes is high severity', () => {
  const [alert] = evaluateAlerts({ events: [ev('a', 5, 30)], now, config });
  assert.equal(alert.severity, 'high');
  assert.match(alert.title, /starts in 5 min/);
});

test('past or already-started events do not alert as soon', () => {
  const alerts = evaluateAlerts({ events: [ev('a', -10, 30)], now, config });
  assert.equal(alerts.length, 0);
});

test('overlapping events raise a conflict alert', () => {
  const alerts = evaluateAlerts({ events: [ev('a', 120, 60), ev('b', 150, 60), ev('c', 300, 30)], now, config });
  const conflicts = alerts.filter((a) => a.kind === 'conflict');
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].id, 'conflict:a:b');
});

test('VIP sender email is high severity, keyword email is medium', () => {
  const emails = [
    { id: 'm1', from: 'Ana <ana@example.com>', subject: 'Hi', snippet: '' },
    { id: 'm2', from: 'billing@x.example', subject: 'Your invoice', snippet: '' },
    { id: 'm3', from: 'news@x.example', subject: 'Sale', snippet: 'nothing here' },
  ];
  const alerts = evaluateAlerts({ emails, now, config });
  assert.deepEqual(
    alerts.map((a) => [a.kind, a.severity]),
    [
      ['vip-email', 'high'],
      ['keyword-email', 'medium'],
    ],
  );
});

test('alerts are sorted by severity', () => {
  const alerts = evaluateAlerts({
    events: [ev('a', 25, 30)],
    emails: [{ id: 'm', from: 'ana@example.com', subject: 'x', snippet: '' }],
    now,
    config,
  });
  assert.equal(alerts[0].severity, 'high');
});
