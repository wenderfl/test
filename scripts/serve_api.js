#!/usr/bin/env node
/**
 * Letterboxd Curator Local API & Static Server
 * Provides CORS-enabled endpoints for OpenTV, Android TV sticks, and web browsers.
 * Guarantees persistent direct disk storage for user state, reports, and feeds.
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
const UNDUBBED_FILE = path.join(DATA_DIR, 'undubbed_reports.json');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range, Cache-Control, Pragma, Expires');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(JSON.stringify(data, null, 2));
}

function loadJsonSafe(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`[Disk] Error reading JSON from ${filePath}:`, err.message);
  }
  return fallback;
}

function saveJsonSafe(filePath, data) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function syncUndubbedFile(undubbedTitles) {
  try {
    const currentReports = loadJsonSafe(UNDUBBED_FILE, []);
    const titleSet = new Set(undubbedTitles.map(t => String(t).toLowerCase().trim()));
    
    // Filter existing reports that are still in undubbed
    const updatedReports = currentReports.filter(r => titleSet.has(String(r.title).toLowerCase().trim()));
    
    // Check if any title is missing from reports
    const existingTitles = new Set(updatedReports.map(r => String(r.title).toLowerCase().trim()));
    undubbedTitles.forEach(t => {
      const normalized = String(t).toLowerCase().trim();
      if (!existingTitles.has(normalized)) {
        updatedReports.push({
          title: t,
          reportedAt: new Date().toISOString()
        });
      }
    });

    saveJsonSafe(UNDUBBED_FILE, updatedReports);
  } catch (err) {
    console.error('[Undubbed] Failed to synchronize undubbed_reports.json:', err.message);
  }
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
    sendJson(res, 200, {
      status: 'ok',
      server: 'LetterboxdCurator-OpenTV-Sync',
      diskPaths: {
        userState: USER_STATE_FILE,
        undubbedReports: UNDUBBED_FILE
      },
      timestamp: Date.now()
    });
    return;
  }

  // 2. GET User State from Disk
  if (req.method === 'GET' && (pathname === '/api/user-state' || pathname === '/data/user_state.json')) {
    const userState = loadJsonSafe(USER_STATE_FILE, {
      watched: [],
      ignored: [],
      undubbed: [],
      comments: {},
      savedMovies: [],
      savedCategories: []
    });
    sendJson(res, 200, userState);
    return;
  }

  // 3. POST User State to Disk
  if (req.method === 'POST' && (pathname === '/api/user-state' || pathname === '/data/user_state.json')) {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) {
        sendJson(res, 413, { error: 'Payload too large' });
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const incomingState = JSON.parse(body);
        const currentState = loadJsonSafe(USER_STATE_FILE, {});

        const mergedState = {
          ...currentState,
          ...incomingState,
          watched: Array.isArray(incomingState.watched) ? incomingState.watched : (currentState.watched || []),
          ignored: Array.isArray(incomingState.ignored) ? incomingState.ignored : (currentState.ignored || []),
          undubbed: Array.isArray(incomingState.undubbed) ? incomingState.undubbed : (currentState.undubbed || []),
          savedMovies: Array.isArray(incomingState.savedMovies) ? incomingState.savedMovies : (currentState.savedMovies || []),
          savedCategories: Array.isArray(incomingState.savedCategories) ? incomingState.savedCategories : (currentState.savedCategories || []),
          comments: incomingState.comments !== undefined ? incomingState.comments : (currentState.comments || {}),
          playbackProgress: incomingState.playbackProgress !== undefined ? incomingState.playbackProgress : (currentState.playbackProgress || {}),
          dspSettings: incomingState.dspSettings !== undefined ? incomingState.dspSettings : (currentState.dspSettings || {}),
          videoSettings: incomingState.videoSettings !== undefined ? incomingState.videoSettings : (currentState.videoSettings || {}),
          streamOverrides: incomingState.streamOverrides !== undefined ? incomingState.streamOverrides : (currentState.streamOverrides || {}),
          iptvUrl: incomingState.iptvUrl !== undefined ? incomingState.iptvUrl : (currentState.iptvUrl || ''),
          iptvName: incomingState.iptvName !== undefined ? incomingState.iptvName : (currentState.iptvName || ''),
          googleUser: incomingState.googleUser !== undefined ? incomingState.googleUser : (currentState.googleUser || null),
          lastSyncedAt: new Date().toISOString()
        };

        saveJsonSafe(USER_STATE_FILE, mergedState);
        console.log(`[Disk] Saved user_state.json (${mergedState.watched.length} watched, ${mergedState.ignored.length} ignored, ${mergedState.undubbed.length} undubbed, ${mergedState.savedMovies.length} saved)`);

        // Synchronize undubbed reports list
        if (Array.isArray(mergedState.undubbed)) {
          syncUndubbedFile(mergedState.undubbed);
        }

        // Re-generate atomic feed in background
        runCatchingFeed();

        sendJson(res, 200, {
          success: true,
          savedToDisk: true,
          filePath: USER_STATE_FILE,
          updated: mergedState.lastSyncedAt
        });
      } catch (err) {
        console.error('[Error] Failed to process user state update:', err.message);
        sendJson(res, 400, { error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  // 4. GET Undubbed Reports from Disk
  if (req.method === 'GET' && (pathname === '/api/undubbed' || pathname === '/data/undubbed_reports.json')) {
    const reports = loadJsonSafe(UNDUBBED_FILE, []);
    sendJson(res, 200, reports);
    return;
  }

  // 5. POST Undubbed Report to Disk
  if (req.method === 'POST' && pathname === '/api/undubbed') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1 * 1024 * 1024) {
        sendJson(res, 413, { error: 'Payload too large' });
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const action = payload.action || 'add';
        const title = payload.title;

        if (!title) {
          sendJson(res, 400, { error: 'Movie title is required' });
          return;
        }

        let reports = loadJsonSafe(UNDUBBED_FILE, []);
        const normTarget = String(title).toLowerCase().trim();

        if (action === 'remove') {
          reports = reports.filter(r => String(r.title).toLowerCase().trim() !== normTarget);
        } else {
          const existingIdx = reports.findIndex(r => String(r.title).toLowerCase().trim() === normTarget);
          const newEntry = {
            title: payload.title,
            ptTitle: payload.ptTitle || null,
            year: payload.year || null,
            category: payload.category || null,
            reportedAt: new Date().toISOString()
          };
          if (existingIdx >= 0) {
            reports[existingIdx] = { ...reports[existingIdx], ...newEntry };
          } else {
            reports.push(newEntry);
          }
        }

        saveJsonSafe(UNDUBBED_FILE, reports);
        console.log(`[Disk] Updated undubbed_reports.json (${action} "${title}", total: ${reports.length})`);

        // Also update undubbed array in user_state.json
        const userState = loadJsonSafe(USER_STATE_FILE, {});
        let undubbedSet = new Set(userState.undubbed || []);
        if (action === 'remove') {
          undubbedSet.delete(title);
          if (payload.ptTitle) undubbedSet.delete(payload.ptTitle);
        } else {
          undubbedSet.add(title);
        }
        userState.undubbed = Array.from(undubbedSet);
        userState.lastSyncedAt = new Date().toISOString();
        saveJsonSafe(USER_STATE_FILE, userState);

        sendJson(res, 200, {
          success: true,
          action,
          title,
          totalReports: reports.length,
          savedToDisk: true
        });
      } catch (err) {
        console.error('[Error] Failed to process undubbed report:', err.message);
        sendJson(res, 400, { error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  // 6. Static File Serving (with clean fallbacks and strict no-cache for json)
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
      if (relativePath.startsWith('web/data/')) {
        const fixedPath = path.join(DATA_DIR, relativePath.replace(/^web\/data\//, ''));
        if (fs.existsSync(fixedPath)) {
          serveFile(fixedPath, res);
          return;
        }
      }

      sendJson(res, 404, { error: 'Not found', path: pathname });
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
    'Cache-Control': ext === '.json' ? 'no-store, no-cache, must-revalidate' : 'no-cache, must-revalidate',
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
  console.log(`[Server] Undubbed Reports API: http://0.0.0.0:${PORT}/api/undubbed`);
});
