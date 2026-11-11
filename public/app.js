const $ = (id) => document.getElementById(id);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'href') node.href = v;
    else node.textContent = v;
  }
  for (const child of children) node.append(child);
  return node;
}

const fmtTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

function empty(text) {
  return el('li', { class: 'empty', text });
}

function renderAlerts(alerts) {
  $('alerts').replaceChildren(
    ...(alerts.length
      ? alerts.map((a) =>
          el('li', { class: `alert ${a.severity}` }, [
            el('strong', { text: a.title }),
            a.detail ? el('span', { class: 'detail', text: a.detail }) : null,
          ].filter(Boolean)),
        )
      : [empty('Nothing needs your attention right now.')]),
  );
}

function renderEvents(events) {
  $('events').replaceChildren(
    ...(events.length
      ? events.map((e) =>
          el('li', {}, [
            el('strong', { text: `${fmtTime(e.start)} · ${e.title}` }),
            e.location ? el('span', { class: 'detail', text: e.location }) : null,
          ].filter(Boolean)),
        )
      : [empty('No events in the next 48 hours.')]),
  );
}

function renderEmails(emails) {
  $('emails').replaceChildren(
    ...(emails.length
      ? emails.map((m) =>
          el('li', {}, [
            el('strong', { text: m.subject }),
            el('span', { class: 'detail', text: `${m.from} — ${m.snippet}` }),
          ]),
        )
      : [empty('Inbox is clear.')]),
  );
}

function renderNews(items) {
  $('news').replaceChildren(
    ...(items.length
      ? items.map((n) =>
          el('li', {}, [
            el('a', { href: n.link, text: n.title, target: '_blank', rel: 'noopener' }),
            el('span', { class: 'detail', text: `${n.source || 'Unknown source'} · ${n.topic}${n.published ? ' · ' + fmtTime(n.published) : ''}` }),
          ]),
        )
      : [empty('No news yet. Add a topic above.')]),
  );
}

function renderTopics(topics) {
  $('topics-input').value = topics.join(', ');
  $('topic-chips').replaceChildren(...topics.map((t) => el('span', { class: 'chip', text: t })));
}

function renderErrors(errors) {
  const messages = Object.entries(errors ?? {});
  $('errors').replaceChildren(
    ...messages.map(([source, msg]) => el('div', { class: 'error', text: `${source}: ${msg}` })),
  );
}

async function load() {
  const res = await fetch('/api/dashboard');
  const data = await res.json();
  $('provider').textContent = `Source: ${data.provider}`;
  $('updated').textContent = fmtTime(data.generatedAt);
  renderErrors(data.errors);
  renderAlerts(data.alerts);
  renderEvents(data.events);
  renderEmails(data.emails);
  renderTopics(data.topics);
  renderNews(data.news);
}

$('topics-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const topics = $('topics-input').value.split(',');
  await fetch('/api/topics', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ topics }),
  });
  load();
});

$('refresh').addEventListener('click', load);
load();
setInterval(load, 5 * 60_000);
