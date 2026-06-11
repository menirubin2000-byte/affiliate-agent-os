const WebSocket = require('ws');

const TAB_ID = '1200624181';
let ws;
let msgId = 1;

function send(method, params) {
  const id = msgId++;
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
  return id;
}

function callTool(name, args, timeout = 15000) {
  return new Promise((resolve) => {
    const id = send('tools/call', { name, arguments: args });
    const timer = setTimeout(() => resolve({ timeout: true }), timeout);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        clearTimeout(timer);
        const result = msg.result || msg.error;
        if (result?.content?.[0]?.text) {
          try { resolve(JSON.parse(result.content[0].text)); } catch { resolve(result); }
        } else {
          resolve(result);
        }
      }
    };
    ws.on('message', handler);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  ws = new WebSocket('ws://localhost:61822/mcp');

  ws.on('open', async () => {
    send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'click-post', version: '1.0' } });
    await sleep(1000);
    send('notifications/initialized', {});
    await sleep(500);

    // Step 1: Find the Post button using JS that returns result via dom tool
    console.log('Finding Post button...');
    const findResult = await callTool('dom', {
      tabId: TAB_ID,
      javascript: `
        var btns = document.querySelectorAll('button');
        var found = null;
        for (var i = 0; i < btns.length; i++) {
          var t = (btns[i].textContent || '').trim();
          var rect = btns[i].getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            if (t === 'פוסט' || t === 'Post' || t.includes('פוסט') || t.includes('Post')) {
              found = {index: i, text: t, x: rect.x, y: rect.y, w: rect.width, h: rect.height, cx: rect.x + rect.width/2, cy: rect.y + rect.height/2};
              break;
            }
          }
        }
        JSON.stringify({found: found, totalButtons: btns.length});
      `
    });

    // Parse the HTML result to find our JSON
    let htmlStr = '';
    if (findResult?.content) {
      for (const c of findResult.content) {
        if (c.text) htmlStr += c.text;
      }
    } else if (typeof findResult === 'string') {
      htmlStr = findResult;
    } else {
      htmlStr = JSON.stringify(findResult);
    }

    // Try to extract the JSON from the result
    // The dom tool returns full HTML, but the JS result might be at the end
    // Actually, let's try the outerHTML approach
    console.log('DOM result type:', typeof findResult);
    console.log('DOM result keys:', findResult ? Object.keys(findResult) : 'null');

    if (findResult?.outerHTML) {
      console.log('Got outerHTML, length:', findResult.outerHTML.length);
    }
    if (findResult?.result) {
      console.log('Got result:', JSON.stringify(findResult.result).substring(0, 200));
    }

    // Step 2: Try alternative - use CDP Input.dispatchMouseEvent directly
    // We need to find the button coordinates first
    // From the screenshot, the Post button is at approximately (574, 700) in viewport coords

    // Let's enumerate buttons with textContent containing Hebrew
    const enumResult = await callTool('dom', {
      tabId: TAB_ID,
      javascript: `
        var results = [];
        var allEls = document.querySelectorAll('*');
        for (var i = 0; i < allEls.length && results.length < 50; i++) {
          var el = allEls[i];
          var tc = (el.textContent || '').trim();
          if (tc === 'פוסט') {
            var r = el.getBoundingClientRect();
            results.push({tag: el.tagName, class: el.className.substring(0,60), text: tc, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), clickable: el.tagName === 'BUTTON' || el.onclick !== null || el.getAttribute('role') === 'button'});
          }
        }
        // Also look for similar texts
        for (var i = 0; i < allEls.length && results.length < 100; i++) {
          var el = allEls[i];
          var tc = (el.textContent || '').trim();
          var r = el.getBoundingClientRect();
          if (r.width > 0 && r.y > 600 && r.y < 750 && r.height > 20 && r.height < 60 && tc.length > 0 && tc.length < 20) {
            results.push({tag: el.tagName, text: tc, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)});
          }
        }
        window.__postBtnInfo = results;
        results.length + ' elements found';
      `
    });

    console.log('Enum result type:', typeof enumResult);

    // Step 3: Use the hover tool to move to the button area, then click
    // Based on screenshots, button is at approximately x=574, y=700
    // Let's try CDP mouse click through the dom tool
    const clickResult = await callTool('dom', {
      tabId: TAB_ID,
      javascript: `
        // Find the exact post button
        var btns = document.querySelectorAll('button');
        var postBtn = null;
        for (var i = 0; i < btns.length; i++) {
          var tc = (btns[i].textContent || '').trim();
          if (tc === 'פוסט' || tc === 'Post') {
            postBtn = btns[i];
            break;
          }
        }

        if (!postBtn) {
          // Try wider search
          var all = document.querySelectorAll('*');
          for (var i = 0; i < all.length; i++) {
            if (all[i].childElementCount === 0) {
              var tc = (all[i].textContent || '').trim();
              if (tc === 'פוסט') {
                postBtn = all[i];
                while (postBtn && postBtn.tagName !== 'BUTTON') {
                  postBtn = postBtn.parentElement;
                }
                break;
              }
            }
          }
        }

        var result = 'NOT_FOUND';
        if (postBtn) {
          var rect = postBtn.getBoundingClientRect();
          result = 'FOUND at ' + Math.round(rect.x) + ',' + Math.round(rect.y) + ' size ' + Math.round(rect.width) + 'x' + Math.round(rect.height);

          // Try React-style click
          var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLButtonElement.prototype, 'disabled');

          // Dispatch pointer events (React listens to these)
          var pointerDown = new PointerEvent('pointerdown', {bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2});
          var pointerUp = new PointerEvent('pointerup', {bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2});
          var mouseDown = new MouseEvent('mousedown', {bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2});
          var mouseUp = new MouseEvent('mouseup', {bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2});
          var click = new MouseEvent('click', {bubbles: true, cancelable: true, view: window, clientX: rect.x + rect.width/2, clientY: rect.y + rect.height/2});

          postBtn.dispatchEvent(pointerDown);
          postBtn.dispatchEvent(mouseDown);
          postBtn.dispatchEvent(pointerUp);
          postBtn.dispatchEvent(mouseUp);
          postBtn.dispatchEvent(click);

          result += ' CLICKED';
        }

        // Write result to a detectable location
        window.__clickResult = result;
        result;
      `
    });

    console.log('Click result:', JSON.stringify(clickResult).substring(0, 500));

    // Wait and check
    await sleep(5000);

    const detail = await callTool('tab_detail', { tabId: TAB_ID });
    console.log('After click - title:', detail?.title, 'domSize:', detail?.domSize, 'pageH:', detail?.fullPageDimensions?.height);

    ws.close();
    process.exit(0);
  });

  ws.on('error', (err) => console.log('WS Error:', err.message));
  setTimeout(() => { console.log('Timeout'); process.exit(1); }, 60000);
}

main();
