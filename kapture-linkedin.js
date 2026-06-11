const WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

let ws;
let msgId = 1;
const TAB_ID = '1200622302';

function send(method, params) {
  const id = msgId++;
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }));
  return id;
}

function callTool(name, args, timeout = 20000) {
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

function escapeJS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

async function publishOnePost(post) {
  console.log(`\n========================================`);
  console.log(`Publishing: ${post.title}`);
  console.log(`ID: ${post.id}`);
  console.log(`Body: ${post.body?.length || 0} chars`);
  console.log(`========================================`);

  // Step 1: Navigate to LinkedIn feed
  console.log('1. Navigating to LinkedIn feed...');
  await callTool('navigate', { tabId: TAB_ID, url: 'https://www.linkedin.com/feed/' });
  await sleep(4000);

  // Step 2: Click "Start a post" via JS
  console.log('2. Opening post editor...');
  const clickJS = `
    var found = false;
    document.querySelectorAll("button").forEach(function(b) {
      var t = (b.innerText || "").trim();
      if (!found && (t.indexOf("Start a post") >= 0 || t.indexOf("התחל") >= 0)) {
        b.click();
        found = true;
      }
    });
    if (!found) {
      document.querySelectorAll("div[role=button], span[role=button]").forEach(function(d) {
        var t = (d.innerText || "").trim();
        if (!found && (t.indexOf("Start a post") >= 0 || t.indexOf("התחל") >= 0)) {
          d.click();
          found = true;
        }
      });
    }
  `.replace(/\n/g, ' ');

  await callTool('dom', { tabId: TAB_ID, javascript: clickJS });
  await sleep(3000);

  // Step 3: Verify editor opened
  const editorCheck = await callTool('elements', { tabId: TAB_ID, selector: '[contenteditable=true]' });
  const editors = editorCheck?.elements || [];
  console.log(`3. Editors found: ${editors.length}`);

  if (editors.length === 0) {
    console.log('ERROR: Editor did not open');
    return false;
  }

  // Step 4: Set content via JS using document.execCommand or direct innerHTML
  console.log('4. Setting post content...');
  const escapedBody = escapeJS(post.body || '');

  // Method: Focus the editor, select all, then use execCommand insertText
  const fillJS = `
    var editors = document.querySelectorAll("[contenteditable=true]");
    var editor = null;
    editors.forEach(function(e) {
      var r = e.getBoundingClientRect();
      if (r.width > 200 && r.height > 50) editor = e;
    });
    if (!editor && editors.length > 0) editor = editors[0];
    if (editor) {
      editor.focus();
      var lines = "${escapedBody}".split("\\n");
      editor.innerHTML = "";
      lines.forEach(function(line, i) {
        if (i > 0) {
          var br = document.createElement("br");
          editor.appendChild(br);
        }
        var p = document.createElement("p");
        p.textContent = line;
        editor.appendChild(p);
      });
      editor.dispatchEvent(new Event("input", {bubbles: true}));
      editor.dispatchEvent(new Event("change", {bubbles: true}));
    }
  `.replace(/\n/g, ' ');

  await callTool('dom', { tabId: TAB_ID, javascript: fillJS });
  await sleep(2000);

  // Step 5: Click Post button via JS
  console.log('5. Clicking Post button...');
  const postJS = `
    var clicked = false;
    document.querySelectorAll("button").forEach(function(b) {
      var t = (b.innerText || "").trim();
      var span = b.querySelector("span");
      var st = span ? (span.innerText || "").trim() : "";
      if (!clicked && (t === "Post" || t === "פרסום" || t === "פרסם" || st === "Post" || st === "פרסום")) {
        if (!b.disabled) {
          b.click();
          clicked = true;
        }
      }
    });
  `.replace(/\n/g, ' ');

  await callTool('dom', { tabId: TAB_ID, javascript: postJS });
  await sleep(5000);

  // Verify: check if we're back on the feed (modal closed)
  const detail = await callTool('tab_detail', { tabId: TAB_ID });
  console.log(`6. Post-click page: ${detail?.title || 'unknown'}`);

  // Check for success toast or if modal is gone
  const editorCheck2 = await callTool('elements', { tabId: TAB_ID, selector: '[contenteditable=true]' });
  const editors2 = editorCheck2?.elements || [];

  if (editors2.length < editors.length) {
    console.log('SUCCESS: Editor modal closed (post likely published)');
    return true;
  }

  console.log(`Still have ${editors2.length} editors. Post button might be disabled.`);

  // Try alternative: use keypress approach
  console.log('Trying keypress fill approach...');

  // Clear and refill using focus + selectAll + type
  if (editors2.length > 0) {
    await callTool('focus', { tabId: TAB_ID, elementId: editors2[0].id });
    await sleep(300);
    await callTool('keypress', { tabId: TAB_ID, key: 'Control+a' });
    await sleep(200);

    // Type content line by line using keypress
    const lines = (post.body || '').split('\n');
    for (const line of lines.slice(0, 3)) {
      for (const char of line.substring(0, 100)) {
        await callTool('keypress', { tabId: TAB_ID, key: char });
      }
      await callTool('keypress', { tabId: TAB_ID, key: 'Enter' });
    }
    await sleep(1000);

    // Try Post button again
    await callTool('dom', { tabId: TAB_ID, javascript: postJS });
    await sleep(5000);

    const editorCheck3 = await callTool('elements', { tabId: TAB_ID, selector: '[contenteditable=true]' });
    if ((editorCheck3?.elements?.length || 0) < editors.length) {
      console.log('SUCCESS via keypress approach');
      return true;
    }
  }

  console.log('FAILED: Could not publish');
  return false;
}

async function main() {
  const { data: posts, error } = await supabase
    .from('final_copies')
    .select('id, platform, title, body, product_id, language')
    .eq('status', 'operator_approved')
    .eq('platform', 'linkedin')
    .order('id')
    .limit(1);

  if (error) { console.log('DB Error:', error.message); return; }
  if (!posts?.length) { console.log('No posts to publish'); return; }

  ws = new WebSocket('ws://localhost:61822/mcp');

  ws.on('open', async () => {
    send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'linkedin-pub', version: '1.0' } });
    await sleep(1000);
    send('notifications/initialized', {});
    await sleep(500);

    await callTool('show', { tabId: TAB_ID });

    const success = await publishOnePost(posts[0]);

    if (success) {
      const { error: updateError } = await supabase
        .from('final_copies')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', posts[0].id);
      if (updateError) console.log('DB error:', updateError.message);
      else console.log('DB updated: published');
    }

    ws.close();
    process.exit(success ? 0 : 1);
  });

  ws.on('error', (err) => console.log('WS Error:', err.message));
  setTimeout(() => { console.log('Global timeout'); process.exit(1); }, 120000);
}

main();
