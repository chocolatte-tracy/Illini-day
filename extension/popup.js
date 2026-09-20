const extensionApi = globalThis.browser || globalThis.chrome;
const button = document.querySelector('#readCanvasBtn');
const status = document.querySelector('#status');
const canvasHost = host => host === 'canvas.illinois.edu' || host.endsWith('.instructure.com');
button.onclick = async () => {
  button.disabled = true;
  status.className = 'status';
  status.textContent = 'Reading the visible Canvas page…';
  try {
    const [tab] = await extensionApi.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url || !canvasHost(new URL(tab.url).hostname)) throw new Error('Switch to an official Canvas Modules or Announcements page first.');
    const result = await extensionApi.tabs.sendMessage(tab.id, { type: 'read-canvas-page' });
    if (!result?.ok) throw new Error(result?.error || 'Could not read this Canvas page.');
    status.textContent = `Found ${result.page.items.length} visible item${result.page.items.length === 1 ? '' : 's'} · ${result.page.area}`;
  } catch (error) {
    status.className = 'status error';
    status.textContent = error.message || 'Canvas page could not be read.';
  } finally { button.disabled = false; }
};
