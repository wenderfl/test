#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const CATALOG_BUNDLE_FILE = path.join(DATA_DIR, 'catalog.js');
const CACHE_FILE = path.resolve(BASE_DIR, '..', 'data', 'letterboxd_cache.json');

const PARENT_MAP = {
  // TERROR
  "horror": "terror",
  "action-horror": "terror",
  "body-horror": "terror",
  "suspense": "terror",
  "silent-mystery": "terror",
  "hatred": "terror",
  "nocturnal": "terror",

  // BESTEIROL
  "comedy": "besteirol",
  "loser-comedy": "besteirol",
  "dark-losers": "besteirol",
  "inner-power": "besteirol",
  "adventure": "besteirol",

  // ARTE
  "world-cinema": "arte",
  "study": "arte",
  "misfit": "arte",
  "cyberpunk": "arte",
  "anime": "arte",
  "animation": "arte",
  "fury": "arte"
};

const MEGA_CATEGORIES = [
  {
    id: "fortemente-recomendados",
    name: "Fortemente Recomendados",
    badgeLabel: "Top Curadoria",
    accentColor: "#E50914",
    gradient: "linear-gradient(135deg, #E50914 0%, #800000 100%)",
    glowColor: "rgba(229, 9, 20, 0.45)",
    iconSvg: `<svg class="icon icon-stroke" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    description: "Filmes indispensáveis, altamente aclamados e imperdíveis com as maiores notas e impacto da curadoria.",
    isMegaCategory: true
  },
  {
    id: "terror",
    name: "Terror",
    badgeLabel: "Horror & Suspense",
    accentColor: "#ff2a5f",
    gradient: "linear-gradient(135deg, #ff2a5f 0%, #b30030 100%)",
    glowColor: "rgba(255, 42, 95, 0.4)",
    iconSvg: `<svg class="icon icon-stroke" viewBox="0 0 24 24"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M10 20v-3h4v3"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>`,
    description: "Universo completo do horror: clássicos, slasher, body horror, suspense psicológico e adrenalina visceral.",
    isMegaCategory: true,
    subcategories: ["horror", "action-horror", "body-horror", "suspense", "silent-mystery", "hatred", "nocturnal"]
  },
  {
    id: "besteirol",
    name: "Besteirol",
    badgeLabel: "Comédia & Slackers",
    accentColor: "#ffb800",
    gradient: "linear-gradient(135deg, #ffb800 0%, #ff6f00 100%)",
    glowColor: "rgba(255, 184, 0, 0.4)",
    iconSvg: `<svg class="icon icon-stroke" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>`,
    description: "Comédias clássicas, slackers hilários, azarões carismáticos, humor ácido e aventuras caóticas despretensiosas.",
    isMegaCategory: true,
    subcategories: ["comedy", "loser-comedy", "dark-losers", "inner-power", "adventure"]
  },
  {
    id: "arte",
    name: "Arte",
    badgeLabel: "Cinema Cult & Autoral",
    accentColor: "#00d2ff",
    gradient: "linear-gradient(135deg, #00d2ff 0%, #0066ff 100%)",
    glowColor: "rgba(0, 210, 255, 0.4)",
    iconSvg: `<svg class="icon icon-stroke" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" x2="22" y1="12" y2="12"/></svg>`,
    description: "Obras-primas autorais, cinema mundial independente, dramas intimistas, ficção cyberpunk e animes conceituais.",
    isMegaCategory: true,
    subcategories: ["world-cinema", "study", "misfit", "cyberpunk", "anime", "animation", "fury"]
  }
];

// 1. Process Categories
let categories = JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf8'));

// Filter out existing mega categories if script is re-run
categories = categories.filter(c => !["fortemente-recomendados", "terror", "besteirol", "arte"].includes(c.id));

// Add parentCategory to each subcategory and adjust names if needed
categories = categories.map(cat => {
  let updatedName = cat.name;
  if (cat.id === "horror") updatedName = "Terror Clássico";
  return {
    ...cat,
    name: updatedName,
    parentCategory: PARENT_MAP[cat.id] || "arte"
  };
});

// Combine mega categories at top, followed by subcategories
const allCategories = [...MEGA_CATEGORIES, ...categories];
fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(allCategories, null, 2), 'utf8');
console.log(`[Success] Updated ${CATEGORIES_FILE}: 4 mega categories + ${categories.length} subcategories.`);

// Also copy to OpenTV assets
const OPENTV_ASSETS_DIR = path.resolve(BASE_DIR, '..', '..', 'opentv', 'app', 'src', 'main', 'assets', 'letterboxd');
if (fs.existsSync(OPENTV_ASSETS_DIR)) {
  fs.writeFileSync(path.join(OPENTV_ASSETS_DIR, 'categories.json'), JSON.stringify(allCategories, null, 2), 'utf8');
}

// 2. Process Movies
let movies = JSON.parse(fs.readFileSync(MOVIES_FILE, 'utf8'));

const WONDER_BLOCKED_ACTORS = [
  "jacob tremblay",
  "owen wilson",
  "izabela vidovic",
  "julia roberts"
];

function hasWonderActors(m) {
  if (m.title === "Wonder" || m.ptTitle === "Extraordinario") return true;
  const actors = (m.omdb?.actors || "").toLowerCase();
  return WONDER_BLOCKED_ACTORS.some(a => actors.includes(a));
}

movies = movies.map(m => {
  const parent = PARENT_MAP[m.category] || "arte";
  const imdb = parseFloat(m.omdb?.imdbRating || '0');
  const blocked = hasWonderActors(m);
  const isRec = imdb >= 7.6 && !blocked;
  return {
    ...m,
    parentCategory: parent,
    isRecommended: isRec,
    blockedByCastRule: blocked ? "wonder_cast" : undefined
  };
});

fs.writeFileSync(MOVIES_FILE, JSON.stringify(movies, null, 2), 'utf8');
console.log(`[Success] Updated ${MOVIES_FILE}: ${movies.length} movies updated with parentCategory and isRecommended.`);

if (fs.existsSync(OPENTV_ASSETS_DIR)) {
  fs.writeFileSync(path.join(OPENTV_ASSETS_DIR, 'movies.json'), JSON.stringify(movies, null, 2), 'utf8');
  console.log(`[Success] Synced movies and categories to ${OPENTV_ASSETS_DIR}`);
}

// 3. Update catalog.js bundle
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
const letterboxdWatched = (cache.films || []).map(f => ({
  name: f.name || f.title || '',
  slug: f.slug || '',
  year: f.year || 0
}));

const bundleContent = `/**
 * Pre-bundled Catalog Data
 * Serves as immediate fallback if fetch is restricted or offline
 */
window.DEFAULT_CATALOG = {
  categories: ${JSON.stringify(allCategories, null, 2)},
  movies: ${JSON.stringify(movies, null, 2)},
  letterboxdWatched: ${JSON.stringify(letterboxdWatched, null, 2)}
};
`;
fs.writeFileSync(CATALOG_BUNDLE_FILE, bundleContent, 'utf8');
console.log(`[Success] Rebuilt ${CATALOG_BUNDLE_FILE}`);
