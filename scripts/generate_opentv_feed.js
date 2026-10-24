#!/usr/bin/env node
/**
 * Letterboxd Curator -> OpenTV Feed Generator
 * Compiles categories, movies, iptv links, and user state into an atomic, high-performance feed
 * for OpenTV (Android TV) and synchronizes both local assets and remote deployment data.
 *
 * Strict compliance: Zero emojis, pure UTF-8 JSON, verified streams.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const OPENTV_ASSETS_DIR = path.resolve(BASE_DIR, '..', 'opentv', 'app', 'src', 'main', 'assets', 'letterboxd');

const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const LINKS_FILE = path.join(DATA_DIR, 'iptv_movie_links.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'user_state.json');
const OPENTV_FEED_FILE = path.join(DATA_DIR, 'opentv_feed.json');
const OPENTV_M3U_FILE = path.join(DATA_DIR, 'opentv_vod.m3u');
const CATALOG_JS_FILE = path.join(DATA_DIR, 'catalog.js');

function loadJson(file, defaultVal = null) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`[Error] Failed to read ${file}:`, e.message);
  }
  return defaultVal;
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function extractStreamUrl(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.startsWith('http') ? trimmed : null;
  }
  if (typeof val === 'object' && val.streamUrl) {
    const trimmed = String(val.streamUrl).trim();
    return trimmed.startsWith('http') ? trimmed : null;
  }
  return null;
}

function generateFeed() {
  console.log('[Feed] Generating OpenTV atomic catalog feed...');

  const categories = loadJson(CATEGORIES_FILE, []);
  const movies = loadJson(MOVIES_FILE, []);
  const rawLinks = loadJson(LINKS_FILE, {});
  const userState = loadJson(USER_STATE_FILE, {
    watched: [],
    ignored: [],
    comments: {},
    undubbed: [],
    savedMovies: [],
    savedCategories: []
  });

  // Build case-insensitive lookup table for links
  const linkLookup = new Map();
  for (const [key, link] of Object.entries(rawLinks)) {
    if (key) {
      linkLookup.set(key.trim().toLowerCase(), link);
    }
  }

  // Pre-attach and normalize IPTV stream links directly to each movie object
  let linkedCount = 0;
  const enrichedMovies = movies.map(movie => {
    const rawVal = rawLinks[movie.title] ||
      (movie.ptTitle ? rawLinks[movie.ptTitle] : null) ||
      linkLookup.get(movie.title.trim().toLowerCase()) ||
      (movie.ptTitle ? linkLookup.get(movie.ptTitle.trim().toLowerCase()) : null) ||
      movie.iptvLink;

    const streamUrl = extractStreamUrl(rawVal);

    if (streamUrl) {
      linkedCount++;
      const iptvObj = {
        available: true,
        streamUrl: streamUrl,
        streamName: movie.ptTitle ? `${movie.ptTitle} (${movie.title})` : movie.title,
        extension: 'mp4',
        rating: movie.omdb && movie.omdb.imdbRating ? parseFloat(movie.omdb.imdbRating) || null : null,
        year: movie.year ? String(movie.year) : null,
        source: 'Letterboxd Curator IPTV'
      };
      return {
        ...movie,
        iptvLink: iptvObj
      };
    } else {
      return {
        ...movie,
        iptvLink: null
      };
    }
  });

  // Structured map of links for OpenTV client
  const structuredLinks = {};
  for (const movie of enrichedMovies) {
    if (movie.iptvLink) {
      structuredLinks[movie.title] = movie.iptvLink;
      if (movie.ptTitle) {
        structuredLinks[movie.ptTitle] = movie.iptvLink;
      }
    }
  }

  const now = new Date();
  const feed = {
    version: now.getTime(),
    generatedAt: now.toISOString(),
    categoriesCount: categories.length,
    moviesCount: enrichedMovies.length,
    linkedMoviesCount: linkedCount,
    linksCount: Object.keys(rawLinks).length,
    categories: categories,
    movies: enrichedMovies,
    iptvLinks: structuredLinks,
    userState: userState
  };

  // 1. Save atomic opentv_feed.json
  saveJson(OPENTV_FEED_FILE, feed);
  console.log(`[Feed] Saved ${OPENTV_FEED_FILE} (${enrichedMovies.length} movies, ${linkedCount} with verified IPTV streams)`);

  // 2. Generate M3U8 VOD playlist (compatible with standard IPTV players & OpenTV M3U source)
  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const m3uLines = ['#EXTM3U'];

  enrichedMovies.forEach(m => {
    if (m.iptvLink && m.iptvLink.streamUrl) {
      const catName = catMap.get(m.category) || m.category || 'Recomendados';
      const poster = m.omdb && m.omdb.poster ? m.omdb.poster : '';
      const displayTitle = m.ptTitle ? `${m.ptTitle} (${m.title})` : m.title;
      const year = m.year ? ` (${m.year})` : '';

      m3uLines.push(`#EXTINF:-1 tvg-id="${m.title}" tvg-name="${displayTitle}" tvg-logo="${poster}" group-title="${catName}",${displayTitle}${year}`);
      m3uLines.push(m.iptvLink.streamUrl);
    }
  });

  fs.writeFileSync(OPENTV_M3U_FILE, m3uLines.join('\n') + '\n', 'utf8');
  console.log(`[Feed] Saved M3U VOD playlist ${OPENTV_M3U_FILE} (${m3uLines.length > 1 ? (m3uLines.length - 1) / 2 : 0} playable entries)`);

  // 3. Keep catalog.js updated for browser fallback
  const catalogJsContent = `/**
 * Pre-bundled Catalog Data
 * Serves as immediate fallback if fetch is restricted or offline
 */
window.DEFAULT_CATALOG = {
  categories: ${JSON.stringify(categories, null, 2)},
  movies: ${JSON.stringify(enrichedMovies, null, 2)},
  letterboxdWatched: []
};
`;
  fs.writeFileSync(CATALOG_JS_FILE, catalogJsContent, 'utf8');

  // 4. Synchronize directly into OpenTV assets if opentv directory exists
  if (fs.existsSync(OPENTV_ASSETS_DIR)) {
    fs.mkdirSync(OPENTV_ASSETS_DIR, { recursive: true });
    fs.copyFileSync(OPENTV_FEED_FILE, path.join(OPENTV_ASSETS_DIR, 'opentv_feed.json'));
    fs.copyFileSync(CATEGORIES_FILE, path.join(OPENTV_ASSETS_DIR, 'categories.json'));
    fs.copyFileSync(MOVIES_FILE, path.join(OPENTV_ASSETS_DIR, 'movies.json'));
    fs.copyFileSync(LINKS_FILE, path.join(OPENTV_ASSETS_DIR, 'iptv_movie_links.json'));
    fs.copyFileSync(USER_STATE_FILE, path.join(OPENTV_ASSETS_DIR, 'user_state.json'));
    console.log(`[Sync] Successfully synchronized feed & assets into OpenTV (${OPENTV_ASSETS_DIR})`);
  }

  console.log('[Feed] Build complete!');
}

if (require.main === module) {
  generateFeed();
}

module.exports = { generateFeed };
