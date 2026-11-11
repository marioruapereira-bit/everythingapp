// Google Calendar and Gmail, read-only, using a stored OAuth refresh token.
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CAL_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GMAIL_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages';

export function createGoogleProvider({ clientId, clientSecret, refreshToken }, fetchImpl = fetch, now = () => new Date()) {
  let token = null;
  let tokenExpiresAt = 0;

  async function accessToken() {
    if (token && Date.now() < tokenExpiresAt - 60_000) return token;
    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: HTTP ${res.status}`);
    const data = await res.json();
    token = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return token;
  }

  async function get(url) {
    const res = await fetchImpl(url, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (!res.ok) throw new Error(`Google API ${new URL(url).host} failed: HTTP ${res.status}`);
    return res.json();
  }

  return {
    name: 'google',

    async getEvents({ hours = 48 } = {}) {
      const start = now();
      const end = new Date(start.getTime() + hours * 3_600_000);
      const params = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '50',
      });
      const data = await get(`${CAL_URL}?${params}`);
      return (data.items ?? []).map((ev) => ({
        id: ev.id,
        title: ev.summary ?? '(no title)',
        start: ev.start?.dateTime ?? ev.start?.date,
        end: ev.end?.dateTime ?? ev.end?.date,
        location: ev.location ?? '',
      }));
    },

    async getEmails({ maxResults = 20 } = {}) {
      const list = await get(`${GMAIL_URL}?${new URLSearchParams({ q: 'is:unread newer_than:3d', maxResults: String(maxResults) })}`);
      const details = await Promise.all(
        (list.messages ?? []).map((m) =>
          get(
            `${GMAIL_URL}/${m.id}?${new URLSearchParams([
              ['format', 'metadata'],
              ['metadataHeaders', 'From'],
              ['metadataHeaders', 'Subject'],
              ['metadataHeaders', 'Date'],
            ])}`,
          ),
        ),
      );
      return details.map((msg) => {
        const header = (name) => msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
        return {
          id: msg.id,
          from: header('From'),
          subject: header('Subject') || '(no subject)',
          date: new Date(header('Date') || Date.now()).toISOString(),
          snippet: msg.snippet ?? '',
        };
      });
    },
  };
}
