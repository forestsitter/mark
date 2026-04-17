/**
 * Mark — Email Capture Worker
 * Cloudflare Worker that:
 *   1. Receives forwarded emails → extracts URLs → saves to KV
 *   2. Exposes a REST API so the Mark webapp can sync bookmarks
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Pull clean http(s) URLs out of raw email text */
function extractUrls(text) {
  const raw = text.match(/https?:\/\/[^\s<>"{}|\\^`[\]\r\n]+/g) || [];
  const SKIP = [
    'unsubscribe', 'mailgun', 'sendgrid', 'mandrillapp',
    'click.', 'track.', 'open.', 'email.', 'links.',
    'googleusercontent', 'list-manage', 'mailchimp',
  ];
  return raw
    .map(u => u.replace(/[.,;!?)]+$/, '')) // strip trailing punctuation
    .filter(u => !SKIP.some(p => u.toLowerCase().includes(p)));
}

/** Parse "Subject: …" from raw RFC-822 email text */
function parseSubject(raw) {
  const m = raw.match(/^subject:\s*(.+)$/im);
  return m ? m[1].trim().replace(/^(Fwd?:\s*|Re:\s*)+/i, '').trim() : '';
}

/** Parse "From: …" */
function parseFrom(raw) {
  const m = raw.match(/^from:\s*(.+)$/im);
  return m ? m[1].trim() : 'unknown';
}

// ── HTTP handler ───────────────────────────────────────────────────────────

async function handleHttp(request, env) {
  const url = new URL(request.url);

  // Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  // GET /bookmarks — return all remote bookmarks
  if (url.pathname === '/bookmarks' && request.method === 'GET') {
    const { keys } = await env.BOOKMARKS.list();
    const items = await Promise.all(
      keys.map(async k => {
        try { return JSON.parse(await env.BOOKMARKS.get(k.name)); } catch { return null; }
      })
    );
    return json(items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt));
  }

  // POST /bookmarks — add bookmark (from bookmarklet or app direct-save)
  if (url.pathname === '/bookmarks' && request.method === 'POST') {
    let data;
    try { data = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
    if (!data.url) return json({ error: 'url required' }, 400);

    const id = data.id || uid();
    const bookmark = {
      id,
      url: data.url,
      title: data.title || new URL(data.url).hostname,
      notes: data.notes || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      starred: Boolean(data.starred),
      unread: data.unread !== false,
      createdAt: data.createdAt || Date.now(),
      source: data.source || 'api',
    };
    await env.BOOKMARKS.put(id, JSON.stringify(bookmark));
    return json(bookmark, 201);
  }

  // DELETE /bookmarks/:id
  if (url.pathname.startsWith('/bookmarks/') && request.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    await env.BOOKMARKS.delete(id);
    return json({ ok: true });
  }

  // Health check
  if (url.pathname === '/') {
    return new Response('Mark Worker running ✓', { headers: CORS });
  }

  return json({ error: 'Not found' }, 404);
}

// ── Email handler ──────────────────────────────────────────────────────────

async function handleEmail(message, env) {
  // Read raw email (max 1 MB)
  const raw = await new Response(message.raw).text();

  const urls = extractUrls(raw);
  if (urls.length === 0) {
    console.log('Mark: no URLs found in email from', message.from);
    return;
  }

  const subject = parseSubject(raw);
  const from = parseFrom(raw);

  // Save every URL found (deduplicated by URL)
  const { keys } = await env.BOOKMARKS.list();
  const existing = await Promise.all(keys.map(k => env.BOOKMARKS.get(k.name)));
  const existingUrls = new Set(
    existing.map(v => { try { return JSON.parse(v).url; } catch { return ''; } })
  );

  let saved = 0;
  for (const capturedUrl of urls) {
    if (existingUrls.has(capturedUrl)) continue; // skip duplicates

    const id = uid();
    const title = saved === 0 && subject ? subject : new URL(capturedUrl).hostname;

    const bookmark = {
      id,
      url: capturedUrl,
      title,
      notes: `Captured from email by ${from}`,
      tags: ['email'],
      starred: false,
      unread: true,
      createdAt: Date.now(),
      source: 'email',
    };

    await env.BOOKMARKS.put(id, JSON.stringify(bookmark));
    existingUrls.add(capturedUrl);
    saved++;
    console.log('Mark: saved', capturedUrl);
  }

  console.log(`Mark: processed email, saved ${saved} bookmark(s)`);
}

// ── Entry point ────────────────────────────────────────────────────────────

export default {
  fetch: handleHttp,
  email: handleEmail,
};
