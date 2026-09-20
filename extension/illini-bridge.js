(() => {
  const API_BASE = 'https://illini-day-planner.xdfvvb7ymf.chatgpt.site';
  const isIlliniPage = typeof window !== 'undefined' && window.location?.hostname === 'chocolatte-tracy.github.io';
  const isWorker = typeof window === 'undefined' && typeof chrome !== 'undefined' && !!chrome.runtime?.onMessage;
  const canvasPatterns = ['https://canvas.illinois.edu/*', 'https://*.instructure.com/*'];

  if (isIlliniPage) {
    window.addEventListener('message', async event => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (message?.type !== 'illini-canvas-sync-request' || typeof message.code !== 'string') return;
      try {
        const result = await chrome.runtime.sendMessage({ type: 'bridge-canvas-sync', code: message.code, requestId: message.requestId });
        window.postMessage({ type: 'illini-canvas-page-data', requestId: message.requestId, ...result }, window.location.origin);
      } catch (error) {
        window.postMessage({ type: 'illini-canvas-page-data', requestId: message.requestId, ok: false, error: error.message || 'The browser helper is unavailable.' }, window.location.origin);
      }
    });
    return;
  }

  if (!isWorker) return;

  async function activeCanvasTab() {
    const tabs = await chrome.tabs.query({ url: canvasPatterns });
    return tabs.find(tab => tab.active) || tabs[0] || null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'bridge-canvas-sync') return;
    (async () => {
      const tab = await activeCanvasTab();
      if (!tab?.id) return { ok: false, error: 'Open a Canvas Modules or Announcements page in another tab first.' };
      let pageResponse;
      try { pageResponse = await chrome.tabs.sendMessage(tab.id, { type: 'read-canvas-page' }); }
      catch { return { ok: false, error: 'The Canvas reader is not ready. Refresh the Canvas page and try again.' }; }
      if (!pageResponse?.ok) return { ok: false, error: pageResponse?.error || 'Could not read the visible Canvas page.' };
      const response = await fetch(`${API_BASE}/api/canvas/page-import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: message.code, page: pageResponse.page }) });
      let payload = {}; try { payload = await response.json(); } catch {}
      return response.ok ? { ok: true, payload } : { ok: false, error: payload.error || 'Canvas page import failed.' };
    })().then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message || 'Canvas page import failed.' }));
    return true;
  });
})();
