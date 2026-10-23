#!/usr/bin/env node
/**
 * Catalog Manager CLI
 * Optimized tool for AI agents and developers to manage, add, sync, and validate movies & categories.
 * Strict compliance: Zero emojis, pure vector SVG, verified dubbings, and Letterboxd check.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const PACKS_DIR = path.join(DATA_DIR, 'packs');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const CATALOG_BUNDLE_FILE = path.join(DATA_DIR, 'catalog.js');
const CACHE_FILE = path.resolve(BASE_DIR, '..', 'data', 'letterboxd_cache.json');
const OMDB_API_KEY = '8d5e8777';

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

function updateBundle() {
  const categories = loadJson(CATEGORIES_FILE, []);
  const movies = loadJson(MOVIES_FILE, []);
  const cache = loadJson(CACHE_FILE, {});
  const letterboxdWatched = (cache.films || []).map(f => ({
    name: f.name || f.title || '',
    slug: f.slug || '',
    year: f.year || 0
  }));

  const content = `/**
 * Pre-bundled Catalog Data
 * Serves as immediate fallback if fetch is restricted or offline
 */
window.DEFAULT_CATALOG = {
  categories: ${JSON.stringify(categories, null, 2)},
  movies: ${JSON.stringify(movies, null, 2)},
  letterboxdWatched: ${JSON.stringify(letterboxdWatched, null, 2)}
};
`;
  fs.writeFileSync(CATALOG_BUNDLE_FILE, content, 'utf8');
  console.log(`[Success] Updated ${path.basename(CATALOG_BUNDLE_FILE)} (${categories.length} categories, ${movies.length} movies, ${letterboxdWatched.length} letterboxd watched)`);
}

function fetchOmdb(title, year = null) {
  let url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&apikey=${OMDB_API_KEY}`;
  if (year) url += `&y=${year}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function checkUserHistory(title) {
  const cache = loadJson(CACHE_FILE, {});
  const watched = new Set((cache.films || []).map(f => (f.title || f.name || '').toLowerCase().trim()));
  const watchlist = new Set((cache.watchlist || []).map(f => (f.title || f.name || '').toLowerCase().trim()));

  const lower = title.toLowerCase().trim();
  return {
    isWatched: watched.has(lower),
    inWatchlist: watchlist.has(lower)
  };
}

// Commands
const command = process.argv[2];

switch (command) {
  case 'stats': {
    const categories = loadJson(CATEGORIES_FILE, []);
    const movies = loadJson(MOVIES_FILE, []);
    console.log(`=== Letterboxd Curator Catalog Stats ===`);
    console.log(`Total Movies: ${movies.length}`);
    console.log(`Total Categories: ${categories.length}\n`);
    categories.forEach(cat => {
      const catMovies = movies.filter(m => m.category === cat.id);
      console.log(`- ${cat.name} (${cat.id}): ${catMovies.length} movies [${cat.accentColor}]`);
    });
    break;
  }

  case 'sync-packs': {
    if (!fs.existsSync(PACKS_DIR)) {
      console.error(`[Error] Packs directory not found at ${PACKS_DIR}`);
      process.exit(1);
    }
    const packFiles = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));
    const allMovies = [];
    const seenTitles = new Map();
    let hasOverlap = false;

    packFiles.forEach(file => {
      const cat = file.replace('.json', '');
      const pack = loadJson(path.join(PACKS_DIR, file), []);
      pack.forEach(movie => {
        const norm = movie.title.toLowerCase().trim();
        if (seenTitles.has(norm)) {
          console.error(`[Error] Movie "${movie.title}" exists in multiple packs: "${seenTitles.get(norm)}" and "${cat}"! Um filme não pode pertencer a mais de uma categoria.`);
          hasOverlap = true;
        } else {
          seenTitles.set(norm, cat);
          allMovies.push(movie);
        }
      });
    });

    if (hasOverlap) {
      console.error(`[Fatal] Sync aborted due to cross-category duplication. Please remove duplicates before syncing.`);
      process.exit(1);
    }

    saveJson(MOVIES_FILE, allMovies);
    updateBundle();
    console.log(`[Success] Synced ${packFiles.length} packs into movies.json (${allMovies.length} unique movies total)`);
    break;
  }

  case 'add': {
    const fileArg = process.argv[3];
    if (!fileArg || !fs.existsSync(fileArg)) {
      console.error(`[Usage] node scripts/catalog_manager.js add <path-to-json-file>`);
      process.exit(1);
    }
    const incoming = loadJson(fileArg);
    const moviesToAdd = Array.isArray(incoming) ? incoming : [incoming];
    const currentMovies = loadJson(MOVIES_FILE, []);
    const existingTitles = new Set(currentMovies.map(m => m.title.toLowerCase()));

    let addedCount = 0;
    moviesToAdd.forEach(m => {
      if (!existingTitles.has(m.title.toLowerCase())) {
        const history = checkUserHistory(m.title);
        m.watched = false;
        m.inWatchlist = history.inWatchlist;

        if (history.isWatched) {
          console.warn(`[Warning] User @wender_fl has ALREADY WATCHED "${m.title}". Consider replacing.`);
        }

        currentMovies.push(m);
        existingTitles.add(m.title.toLowerCase());
        addedCount++;

        // Also update individual pack file if category exists
        const packFile = path.join(PACKS_DIR, `${m.category}.json`);
        if (fs.existsSync(packFile)) {
          const packData = loadJson(packFile, []);
          packData.push(m);
          saveJson(packFile, packData);
        }
      } else {
        console.log(`[Skip] Movie already exists: "${m.title}"`);
      }
    });

    saveJson(MOVIES_FILE, currentMovies);
    updateBundle();
    console.log(`[Success] Added ${addedCount} new movies to catalog.`);
    break;
  }

  case 'add-category': {
    // Usage: node scripts/catalog_manager.js add-category --id <id> --name <name> --badge <label> --color <color> --icon <iconSvg>
    const args = process.argv.slice(3);
    const params = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, '');
      params[key] = args[i + 1];
    }

    if (!params.id || !params.name) {
      console.error(`[Usage] node scripts/catalog_manager.js add-category --id <id> --name <name> --badge <label> --color <hex> --icon <svg>`);
      process.exit(1);
    }

    const categories = loadJson(CATEGORIES_FILE, []);
    if (categories.some(c => c.id === params.id)) {
      console.error(`[Error] Category with id "${params.id}" already exists.`);
      process.exit(1);
    }

    const newCat = {
      id: params.id,
      name: params.name,
      badgeLabel: params.badge || params.name,
      accentColor: params.color || '#00d2ff',
      gradient: params.gradient || `linear-gradient(135deg, ${params.color || '#00d2ff'} 0%, #0044aa 100%)`,
      glowColor: params.glow || `rgba(0, 210, 255, 0.35)`,
      iconSvg: params.icon || '<svg class="icon icon-stroke" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>',
      description: params.desc || ''
    };

    categories.push(newCat);
    saveJson(CATEGORIES_FILE, categories);

    // Create empty pack
    const packFile = path.join(PACKS_DIR, `${newCat.id}.json`);
    if (!fs.existsSync(packFile)) {
      saveJson(packFile, []);
    }

    updateBundle();
    console.log(`[Success] Added category "${newCat.name}" (${newCat.id})`);
    break;
  }

  case 'fetch-omdb': {
    const title = process.argv[3];
    const year = process.argv[4] || null;
    if (!title) {
      console.error(`[Usage] node scripts/catalog_manager.js fetch-omdb "Movie Title" [year]`);
      process.exit(1);
    }
    fetchOmdb(title, year).then(omdb => {
      console.log(JSON.stringify(omdb, null, 2));
    }).catch(err => {
      console.error(`[Error]`, err.message);
    });
    break;
  }

  case 'validate': {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F680}-\u{1F6FC}\u{1F7E0}-\u{1F7EB}]/u;
    const categories = loadJson(CATEGORIES_FILE, []);
    const movies = loadJson(MOVIES_FILE, []);
    const catIds = new Set(categories.map(c => c.id));
    const titles = new Set();
    let errors = 0;

    // Check emojis in files
    [CATEGORIES_FILE, MOVIES_FILE].forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (emojiRegex.test(content)) {
        console.error(`[Rule Violation] Found emojis in ${path.basename(file)}! Zero emojis are strictly required.`);
        errors++;
      }
    });

    // Check duplicate movies across category packs (Strict: 1 movie = 1 category)
    const packFiles = fs.existsSync(PACKS_DIR) ? fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json')) : [];
    const packTitleMap = new Map();
    const packImdbMap = new Map();

    packFiles.forEach(pf => {
      const catId = pf.replace('.json', '');
      const pMovies = loadJson(path.join(PACKS_DIR, pf), []);
      pMovies.forEach(m => {
        const normTitle = (m.title || '').toLowerCase().trim();
        if (normTitle) {
          if (!packTitleMap.has(normTitle)) packTitleMap.set(normTitle, []);
          packTitleMap.get(normTitle).push({ cat: catId, title: m.title });
        }
        const imdb = m.omdb?.imdbID;
        if (imdb) {
          if (!packImdbMap.has(imdb)) packImdbMap.set(imdb, []);
          packImdbMap.get(imdb).push({ cat: catId, title: m.title });
        }
      });
    });

    for (const [normTitle, occs] of packTitleMap.entries()) {
      if (occs.length > 1) {
        console.error(`[Rule Violation] Movie "${occs[0].title}" appears in more than one category: ${occs.map(o => o.cat).join(', ')}! A movie cannot belong to multiple categories.`);
        errors++;
      }
    }

    for (const [imdb, occs] of packImdbMap.entries()) {
      if (occs.length > 1) {
        const uniqueCats = new Set(occs.map(o => o.cat));
        if (uniqueCats.size > 1) {
          console.error(`[Rule Violation] IMDb ID ${imdb} ("${occs[0].title}") appears in multiple categories: ${Array.from(uniqueCats).join(', ')}!`);
          errors++;
        }
      }
    }

    movies.forEach((m, idx) => {
      if (!m.title || !m.category) {
        console.error(`[Error] Movie #${idx} is missing title or category`);
        errors++;
      }
      if (!catIds.has(m.category)) {
        console.error(`[Error] Movie "${m.title}" references unknown category "${m.category}"`);
        errors++;
      }
      if (!m.parentCategory || !['terror', 'besteirol', 'art'].includes(m.parentCategory)) {
        console.error(`[Error] Movie "${m.title}" missing or invalid parentCategory: "${m.parentCategory}" (must be 'terror', 'besteirol', or 'art')`);
        errors++;
      }
      if (titles.has(m.title.toLowerCase())) {
        console.error(`[Rule Violation] Duplicate title in catalog: "${m.title}". A movie cannot appear in more than one category.`);
        errors++;
      }
      titles.add(m.title.toLowerCase());
    });

    // Verify all concrete categories have a valid parentCategory
    const validParents = new Set(['terror', 'besteirol', 'art']);
    categories.forEach(c => {
      if (!c.isMegaCategory) {
        if (!c.parentCategory || !validParents.has(c.parentCategory)) {
          console.error(`[Rule Violation] Category "${c.id}" (${c.name}) must be explicitly associated with 'terror', 'besteirol', or 'art'. Found: "${c.parentCategory}"`);
          errors++;
        }
      }
    });

    // Check against Letterboxd watched history
    const cache = loadJson(CACHE_FILE, {});
    const lbWatchedSet = new Set((cache.films || []).map(f => (f.name || f.title || '').toLowerCase().trim()));
    movies.forEach(m => {
      if (lbWatchedSet.has(m.title.toLowerCase().trim())) {
        console.error(`[Rule Violation] Movie "${m.title}" was ALREADY WATCHED by @wender_fl on Letterboxd! It cannot be recommended.`);
        errors++;
      }
    });

    if (errors === 0) {
      console.log(`[Success] Catalog validation passed with ZERO errors! (${movies.length} movies, ${categories.length} categories, 0 emojis, 0 category overlaps, 0 watched collisions)`);
    } else {
      console.error(`[Failed] Validation found ${errors} issues.`);
      process.exit(1);
    }
    break;
  }

  case 'undubbed': {
    const UNDUBBED_FILE = path.join(DATA_DIR, 'undubbed_reports.json');
    const reports = loadJson(UNDUBBED_FILE, []);
    console.log(`=== Filmes Reportados Sem Dublagem (para Verificação IA) ===`);
    console.log(`Total Reportados: ${reports.length}\n`);
    if (reports.length === 0) {
      console.log(`Nenhum filme reportado sem dublagem no momento.`);
    } else {
      reports.forEach((r, idx) => {
        console.log(`${idx + 1}. "${r.title}" ${r.ptTitle ? `(${r.ptTitle})` : ''} [${r.year || 'N/A'}]`);
        console.log(`   Coleção: ${r.category || 'N/A'} | Reportado em: ${r.reportedAt || 'N/A'}`);
      });
    }
    break;
  }

  default:
    console.log(`
Letterboxd Curator - Catalog Manager CLI

Available commands:
  node scripts/catalog_manager.js stats
  node scripts/catalog_manager.js validate
  node scripts/catalog_manager.js sync-packs
  node scripts/catalog_manager.js undubbed
  node scripts/catalog_manager.js add <path-to-movies-json>
  node scripts/catalog_manager.js add-category --id <id> --name <name> --badge <label> --color <hex> --icon <svg>
  node scripts/catalog_manager.js fetch-omdb "Title" [year]
`);
}

