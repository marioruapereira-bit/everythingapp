# everythingapp

A personal life manager. It shows what needs your attention today:

- **Alerts**: meetings starting soon, overlapping calendar events, emails from VIP senders, and emails with important keywords.
- **Agenda**: your next 48 hours of calendar events.
- **Inbox**: unread emails from the last 3 days.
- **Newsfeed**: headlines for topics you choose, from Google News.

It has no dependencies and needs Node.js 20 or newer.

## Quick start

```bash
cp .env.example .env   # optional; the defaults work with sample data
npm start              # open http://localhost:3000
npm test
```

With `PROVIDER=mock` (the default) the app shows sample calendar events and emails. Your topics are saved in `data/topics.json`, which is git-ignored.

## Connect Google Calendar and Gmail

1. In Google Cloud Console, create an OAuth client (type "Desktop app" or "Web") and enable the Google Calendar API and Gmail API.
2. Get a refresh token with the scopes `https://www.googleapis.com/auth/calendar.readonly` and `https://www.googleapis.com/auth/gmail.readonly`. The OAuth Playground (https://developers.google.com/oauthplayground) can do this.
3. Set the values in `.env`:

   ```
   PROVIDER=google
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REFRESH_TOKEN=...
   ```

The app only reads your data. It never sends or changes email or events.

## Configuration

| Variable | Purpose |
| --- | --- |
| `ALERT_LEAD_MINUTES` | How long before a meeting to alert (default 30) |
| `VIP_SENDERS` | Comma-separated sender fragments that always alert, e.g. `boss@work.com,ana@` |
| `ALERT_KEYWORDS` | Words in subject or snippet that trigger an alert |
| `NEWS_TOPICS` | Starting topics for the newsfeed |

## Layout

```
src/server.js          HTTP server and API (/api/dashboard, /api/topics)
src/rules.js           Alert logic (pure, unit tested)
src/news.js            RSS fetch and parse (unit tested)
src/topics.js          Saved interest topics
src/providers/         mock.js (sample data) and google.js (Calendar + Gmail)
public/                Dashboard UI
test/                  node:test suites
```

## Limits and next steps

- The Google provider has not yet been tested against a live account. It needs real credentials to verify.
- Alerts are recalculated on each load. Nothing is stored, so there is no "dismiss" yet.
- Notifications are shown only in the page. Push, email, or SMS alerts are a natural next step.
