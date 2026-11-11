import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRss, decodeEntities, fetchNewsfeed, buildFeedUrl } from '../src/news.js';

const xml = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title><![CDATA[Chips &amp; chip makers rally - Reuters]]></title>
    <link>https://example.com/a</link>
    <pubDate>Tue, 10 Nov 2026 09:00:00 GMT</pubDate>
    <source url="https://reuters.com">Reuters</source>
  </item>
  <item>
    <title>Budgeting &#39;tips&#39; for 2027</title>
    <link>https://example.com/b</link>
    <pubDate>not a date</pubDate>
  </item>
  <item>
    <title>Missing link</title>
  </item>
</channel></rss>`;

test('decodeEntities handles CDATA, named and numeric entities', () => {
  assert.equal(decodeEntities('<![CDATA[A &amp; B]]>'), 'A & B');
  assert.equal(decodeEntities('&#39;x&#39; &#x27;y&#x27;'), "'x' 'y'");
});

test('parseRss extracts items and skips ones without a link', () => {
  const items = parseRss(xml, 'chips');
  assert.equal(items.length, 2);
  assert.equal(items[0].title, 'Chips & chip makers rally - Reuters');
  assert.equal(items[0].source, 'Reuters');
  assert.equal(items[0].published, '2026-11-10T09:00:00.000Z');
  assert.equal(items[0].topic, 'chips');
  assert.equal(items[1].title, "Budgeting 'tips' for 2027");
  assert.equal(items[1].published, null);
});

test('buildFeedUrl encodes the topic', () => {
  assert.match(buildFeedUrl('personal finance'), /q=personal%20finance/);
});

test('fetchNewsfeed merges topics, dedupes links and survives failures', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('bad')) throw new Error('network down');
    return { ok: true, text: async () => xml };
  };
  const items = await fetchNewsfeed(['good', 'bad'], { fetchImpl: fakeFetch });
  assert.equal(items.length, 2);
  assert.equal(items[0].published, '2026-11-10T09:00:00.000Z');
});
