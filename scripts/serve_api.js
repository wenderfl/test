#!/usr/bin/env node
/**
 * Letterboxd Curator Local API & Static Server
 * Provides CORS-enabled endpoints for OpenTV, Android TV sticks, and web browsers.
 * Supports bi-directional synchronization of user state (watched, saved, ignored).
 *
 * Strict compliance: Zero emojis, clean logging, zero dependencies.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateFeed } = require('./generate_opentv_feed');

const PORT = parseInt(process.env.PORT || '8085', 10);
const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const USER_STATE_FILE = path.join(DATA_DIR, 'user_state.json');

const MIME_TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.m3u': 'audio/x-mpegurl; charset=utf-8',
  '.m3u8': 'application/vnd.apple.mpegurl; charset=utf-8'
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, Cache-Control');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // 1. Healthcheck / Ping
  if (pathname === '/api/health' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'LetterboxdCurator-OpenTV-Sync', timestamp: Date.now() }));
    return;
  }

  // 2. Bi-directional User State Sync (POST from OpenTV)
  if (req.method === 'POST' && (pathname === '/api/user-state' || pathname === '/data/user_state.json')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const incomingState = JSON.parse(body);
        let currentState = {};
        if (fs.existsSync(USER_STATE_FILE)) {
          currentState = JSON.parse(fs.readFileSync(USER_STATE_FILE, 'utf8'));
        }

        // Merge incoming state with existing state to avoid data loss
        const mergedState = {
          ...currentState,
          ...incomingState,
          watched: Array.from(new Set([...(currentState.watched || []), ...(incomingState.watched || [])])),
          ignored: Array.from(new Set([...(currentState.ignored || []), ...(incomingState.ignored || [])])),
          undubbed: Array.from(new Set([...(currentState.undubbed || []), ...(incomingState.undubbed || [])])),
          savedMovies: incomingState.savedMovies !== undefined ? incomingState.savedMovies : (currentState.savedMovies || []),
          savedCategories: incomingState.savedCategories !== undefined ? incomingState.savedCategories : (currentState.savedCategories || []),
          comments: { ...(currentState.comments || {}), ...(incomingState.comments || {}) },
          lastSyncedAt: new Date().toISOString()
        };

        fs.writeFileSync(USER_STATE_FILE, JSON.stringify(mergedState, null, 2), 'utf8');
        console.log(`[Sync] Updated user_state.json from OpenTV (${mergedState.watched.length} watched, ${mergedState.savedMovies.length} saved)`);

        // Re-generate atomic feed in background so OpenTV and web have latest state
        runCatchingFeed();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, updated: mergedState.lastSyncedAt }));
      } catch (err) {
        console.error('[Error] Failed to process user state update:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 3. Static File Serving (with clean fallbacks)
  let relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath) relativePath = 'index.html';

  let filePath = path.join(BASE_DIR, relativePath);

  // Security check: ensure path is within BASE_DIR
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for /data/... if requested from root
      if (relativePath.startsWith('web/data/')) {
        const fixedPath = path.join(DATA_DIR, relativePath.replace(/^web\/data\//, ''));
        if (fs.existsSync(fixedPath)) {
          serveFile(fixedPath, res);
          return;
        }
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found', path: pathname }));
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache, must-revalidate',
    'Pragma': 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

function runCatchingFeed() {
  try {
    generateFeed();
  } catch (e) {
    console.error('[Feed] Background feed update error:', e.message);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Letterboxd Curator sync server running on http://0.0.0.0:${PORT}`);
  console.log(`[Server] OpenTV Feed: http://0.0.0.0:${PORT}/data/opentv_feed.json`);
  console.log(`[Server] M3U Playlist: http://0.0.0.0:${PORT}/data/opentv_vod.m3u`);
  console.log(`[Server] User State API: http://0.0.0.0:${PORT}/api/user-state`);
});
