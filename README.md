# Illini Day

Illini Day is a responsive UIUC calendar, task planner, Canvas calendar importer, walking-time planner, and schedule-aware assistant.

## Deployment

- The static browser app is published from `public/` with GitHub Pages.
- The existing server remains responsible for secure sign-in, per-user schedule storage, Canvas feed retrieval, walking estimates, and live searches.
- GitHub Pages talks only to the allowlisted API origin. Account exchange tokens are random, stored only as hashes on the server, expire after 30 days, and can be revoked by signing out.

## Local checks

```bash
npm run build
node test-core.js
node test-live.mjs
npm run validate
```

The production Pages address is intended to be `https://chocolatte-tracy.github.io/Illini-day/`.
