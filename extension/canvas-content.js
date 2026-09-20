(() => {
  const extensionApi = globalThis.browser || globalThis.chrome;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const MONTHS = new Map(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].map((name, index) => [name, index]));
  const isCanvasHost = host => host === 'canvas.illinois.edu' || host.endsWith('.instructure.com');
  const absoluteUrl = value => { try { return new URL(value, location.href).href; } catch { return ''; } };
  const localDateTime = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  function parseDeadline(value) {
    const text = clean(value);
    const monthMatch = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?(?:\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?/i);
    const numericMatch = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\b/);
    const match = monthMatch || numericMatch;
    if (!match) return null;
    const now = new Date();
    let year, month, day, hour = 23, minute = 59, meridiem;
    if (monthMatch) {
      month = MONTHS.get(match[1].slice(0, 3).toLowerCase());
      day = Number(match[2]);
      year = Number(match[3] || now.getFullYear());
      if (match[4]) { hour = Number(match[4]); minute = Number(match[5] || 0); meridiem = match[6]?.toLowerCase(); }
    } else {
      month = Number(match[1]) - 1;
      day = Number(match[2]);
      year = Number(match[3] || now.getFullYear());
      if (year < 100) year += 2000;
      if (match[4]) { hour = Number(match[4]); minute = Number(match[5] || 0); meridiem = match[6]?.toLowerCase(); }
    }
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    let date = new Date(year, month, day, hour, minute);
    if (!match[3] && !numericMatch?.[3] && date < now) date = new Date(year + 1, month, day, hour, minute);
    return Number.isFinite(date.getTime()) ? localDateTime(date) : null;
  }

  function pageArea() {
    const path = location.pathname.toLowerCase();
    return /announcements|discussion_topics/.test(path) ? 'Announcement' : 'Module';
  }

  function courseName() {
    const links = [...document.querySelectorAll('#breadcrumbs a[href*="/courses/"], [data-testid*="course"] a, a[href*="/courses/"]')];
    const value = links.map(link => clean(link.textContent)).filter(Boolean).at(-1);
    return value || clean(document.querySelector('[data-testid="course-name"], .course-title')?.textContent);
  }

  function pageTitle() {
    return clean(document.querySelector('#breadcrumbs li:last-child, h1, [data-testid="page-title"]')?.textContent) || document.title;
  }

  function moduleName(row, fallback) {
    return clean(row.querySelector('.ig-header-title, .context_module_item_context, [data-testid*="module"] h2, h2')?.textContent) || fallback || '';
  }

  function rowCandidates(main) {
    const selectors = ['.context_module_item', '.ig-row', 'li.module-item', '.discussion-topic', '.discussion-entries li', '[data-testid*="announcement"]'];
    const found = selectors.flatMap(selector => [...main.querySelectorAll(selector)]);
    const anchors = [...main.querySelectorAll('a[href*="/assignments/"], a[href*="/quizzes/"], a[href*="/discussion_topics/"], a[href*="/pages/"], a[href*="/modules/items/"]')];
    const rows = found.length ? found : anchors.map(anchor => anchor.closest('li, article, .ig-row, .discussion-topic') || anchor.parentElement || anchor);
    return [...new Set(rows)].filter(row => clean(row.textContent).length > 3);
  }

  function extractCanvasPage() {
    if (!isCanvasHost(location.hostname)) throw new Error('Open a Canvas Modules or Announcements page first.');
    const area = pageArea(), main = document.querySelector('#content, main, [role="main"]') || document.body, course = courseName(), fallbackModule = area === 'Module' ? pageTitle() : '';
    const rows = rowCandidates(main), items = [];
    rows.slice(0, 200).forEach((row, index) => {
      const anchor = row.matches('a') ? row : row.querySelector('a[href*="/assignments/"], a[href*="/quizzes/"], a[href*="/discussion_topics/"], a[href*="/pages/"], a[href*="/modules/items/"]') || row.querySelector('a[href]');
      const title = clean(row.querySelector('.ig-title, .ig-title a, .discussion-title, h3, h4, [data-testid*="title"]')?.textContent || anchor?.textContent || row.textContent).slice(0, 240);
      if (!title || /^(modules?|announcements?)$/i.test(title)) return;
      const note = clean(row.textContent).slice(0, 1000), url = absoluteUrl(anchor?.getAttribute('href') || location.href);
      items.push({ sourceId: `browser:${course || 'canvas'}:${moduleName(row, fallbackModule)}:${url || title}`.replace(/[^a-z0-9:_-]+/gi, '-').slice(0, 220), title, course, module: moduleName(row, fallbackModule), note, deadline: parseDeadline(note), url, canvasArea: area });
    });
    if (!items.length) {
      const title = pageTitle(), note = clean(main.textContent).slice(0, 1000);
      if (title || note) items.push({ sourceId: `browser:${course || 'canvas'}:${location.pathname}`, title: title || `${area} page`, course, module: fallbackModule, note, deadline: parseDeadline(note), url: location.href, canvasArea: area });
    }
    const unique = [...new Map(items.map(item => [item.sourceId, item])).values()];
    return { url: location.href, title: pageTitle(), area, course, module: fallbackModule, items: unique };
  }

  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'read-canvas-page') return;
    try { sendResponse({ ok: true, page: extractCanvasPage() }); }
    catch (error) { sendResponse({ ok: false, error: error.message || 'Could not read this Canvas page.' }); }
    return true;
  });
})();
