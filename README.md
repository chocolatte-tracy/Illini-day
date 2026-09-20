# Illini Day

Illini Day is a responsive UIUC calendar, task planner, Canvas calendar importer, walking-time planner, and schedule-aware assistant. The optional browser helper reads the visible Canvas Modules or Announcements page without requesting a Canvas token, password, or cookie. The same source works in Chrome and Safari Web Extensions.

## Deployment

- The static browser app is published from `public/` with GitHub Pages.
- The existing server remains responsible for secure sign-in, per-user schedule storage, Canvas feed retrieval, walking estimates, and live searches.
- GitHub Pages talks only to the allowlisted API origin. Account exchange tokens are random, stored only as hashes on the server, expire after 30 days, and can be revoked by signing out.
- Canvas browser imports use a five-minute, one-use connection code. The helper sends only sanitized page items to `/api/canvas/page-import`; the user reviews the preview before anything is saved to Canvas Tasks or scheduled.

## Browser Canvas helper

1. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
2. Select the repository root (the folder containing `manifest.json`) or select its `extension/` folder.
3. Sign in to Illini Day, open Canvas Modules or Announcements in another tab, and choose `C Canvas` → `Read current Canvas page`.
4. Review the detected items and select **Add selected to Canvas Tasks**. Items without a clear date remain flexible tasks.

### Safari Web Extension

The browser source is kept in `extension/` so Chrome and Safari do not drift apart. With the full Xcode command-line tools installed, run:

```bash
npm run build:safari
```

Open the generated `safari/IlliniDaySafari/` Xcode project, select a development signing team, build the macOS app, and enable **Illini Day Canvas Reader** in Safari → Settings → Extensions. For a long-term release, archive the app in Xcode and distribute it through TestFlight/App Store Connect rather than relying on a temporary unpacked extension.

## Local checks

```bash
npm run build
node test-core.js
node test-live.mjs
npm run validate
```

The production Pages address is intended to be `https://chocolatte-tracy.github.io/Illini-day/`.
