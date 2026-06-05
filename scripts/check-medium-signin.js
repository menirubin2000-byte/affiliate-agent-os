// Check if logged into Medium in the debug Chrome (port 9222)
const WebSocket = require('ws');

async function getTabs() {
  const r = await fetch('http://localhost:9222/json');
  return await r.json();
}

async function callCDP(ws, id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const msg = JSON.stringify({ id, method, params });
    const listener = (data) => {
      const obj = JSON.parse(data);
      if (obj.id === id) {
        ws.off('message', listener);
        if (obj.error) reject(new Error(obj.error.message));
        else resolve(obj.result);
      }
    };
    ws.on('message', listener);
    ws.send(msg);
  });
}

async function main() {
  const tabs = await getTabs();
  const mediumTab = tabs.find(t => t.url.includes('medium.com') && t.type === 'page');

  if (!mediumTab) {
    console.log('No Medium tab found');
    console.log('Tabs:', tabs.map(t => ({title: t.title, url: t.url, type: t.type})));
    return;
  }

  console.log('Medium tab:', mediumTab.url);

  // Navigate to medium.com to check sign in state
  const ws = new WebSocket(mediumTab.webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));

  // Navigate to medium.com
  await callCDP(ws, 1, 'Page.navigate', { url: 'https://medium.com/me/stories/drafts' });

  // Wait for navigation
  await new Promise(r => setTimeout(r, 5000));

  // Get current URL
  const evalResult = await callCDP(ws, 2, 'Runtime.evaluate', {
    expression: 'JSON.stringify({url: location.href, title: document.title, signedIn: !!document.querySelector("[data-testid=\'user-avatar\'], [aria-label*=\'profile\' i], img[alt*=\'profile\' i]")})',
    returnByValue: true
  });

  console.log('State:', evalResult.result.value);
  ws.close();
}

main().catch(e => console.error(e.message));
