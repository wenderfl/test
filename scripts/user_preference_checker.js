/**
 * User Preference & Watched History Verification Engine
 * Strictly enforces guidelines from preferenciasDoUsuario.md and Letterboxd watched history.
 *
 * Requirements:
 * 1. Mandatory check if user has already watched the movie (@wender_fl Letterboxd history + user_state.json).
 * 2. Mandatory evaluation against preferenciasDoUsuario.md:
 *    - Hard Filters (Anti-misogyny, 2003-2009 US commercial penalty, 100% PT-BR dubbing, Evil Dead exclusion).
 *    - Thematic Affinity (Themes A through O: loser comedy, vintage horror, cyberpunk, cosmic horror, etc.).
 *    - Affinity Score calculation with bonuses and penalties. Minimum approval score: 75%.
 *
 * Strict Rule: Zero emojis in code, comments, logs, and outputs.
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const SOURCE_CACHE = path.resolve(BASE_DIR, '..', 'letterboxd-mcp', 'data', 'letterboxd_cache.json');
const LOCAL_CACHE = path.join(DATA_DIR, 'letterboxd_cache.json');
const LOCAL_WATCHED = path.join(DATA_DIR, 'letterboxd_watched.json');
const USER_STATE_FILE = path.join(DATA_DIR, 'user_state.json');
const PACKS_DIR = path.join(DATA_DIR, 'packs');
const UNDUBBED_REPORTS_FILE = path.join(DATA_DIR, 'undubbed_reports.json');

function loadJson(file, defaultVal = null) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    // Return default silently
  }
  return defaultVal;
}

function normalizeTitle(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlug(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Load complete watched and ignored registry
 */
function getWatchedRegistry() {
  const watchedTitles = new Set();
  const watchedSlugs = new Set();
  const watchlistTitles = new Set();
  const watchlistSlugs = new Set();
  const ignoredTitles = new Set();

  // Try source cache first, then local cache
  const cacheFiles = [SOURCE_CACHE, LOCAL_CACHE, LOCAL_WATCHED];
  let cache = null;
  for (const f of cacheFiles) {
    if (fs.existsSync(f)) {
      cache = loadJson(f, null);
      if (cache && Array.isArray(cache.films) && cache.films.length > 0) {
        break;
      }
    }
  }

  if (cache && Array.isArray(cache.films)) {
    cache.films.forEach(film => {
      if (film.name) {
        watchedTitles.add(normalizeTitle(film.name));
        watchedSlugs.add(toSlug(film.name));
      }
      if (film.title) {
        watchedTitles.add(normalizeTitle(film.title));
        watchedSlugs.add(toSlug(film.title));
      }
      if (film.slug) {
        watchedSlugs.add(film.slug.toLowerCase().trim());
      }
    });
  }

  if (cache && Array.isArray(cache.watchlist)) {
    cache.watchlist.forEach(film => {
      if (film.name) {
        watchlistTitles.add(normalizeTitle(film.name));
        watchlistSlugs.add(toSlug(film.name));
      }
      if (film.title) {
        watchlistTitles.add(normalizeTitle(film.title));
        watchlistSlugs.add(toSlug(film.title));
      }
      if (film.slug) {
        watchlistSlugs.add(film.slug.toLowerCase().trim());
      }
    });
  }

  const userState = loadJson(USER_STATE_FILE, {});
  if (Array.isArray(userState.watched)) {
    userState.watched.forEach(title => {
      watchedTitles.add(normalizeTitle(title));
      watchedSlugs.add(toSlug(title));
    });
  }

  if (Array.isArray(userState.ignored)) {
    userState.ignored.forEach(title => {
      ignoredTitles.add(normalizeTitle(title));
      watchedSlugs.add(toSlug(title));
    });
  }

  return {
    watchedTitles,
    watchedSlugs,
    watchlistTitles,
    watchlistSlugs,
    ignoredTitles
  };
}

/**
 * Verifies if the movie has already been watched by @wender_fl
 */
function checkIfWatched(movieOrTitle, year = null) {
  const registry = getWatchedRegistry();

  let title = '';
  let ptTitle = '';
  let movieYear = year;
  let slug = '';

  if (typeof movieOrTitle === 'string') {
    title = movieOrTitle;
    slug = toSlug(movieOrTitle);
  } else if (movieOrTitle && typeof movieOrTitle === 'object') {
    title = movieOrTitle.title || '';
    ptTitle = movieOrTitle.ptTitle || '';
    movieYear = movieOrTitle.year || movieOrTitle.omdb?.year || year;
    slug = toSlug(title);
    if (movieOrTitle.letterboxdUrl) {
      const match = movieOrTitle.letterboxdUrl.match(/film\/([^/]+)/);
      if (match) slug = match[1].toLowerCase().trim();
    }
  }

  const normTitle = normalizeTitle(title);
  const normPtTitle = normalizeTitle(ptTitle);

  const isWatchedByTitle = normTitle && registry.watchedTitles.has(normTitle);
  const isWatchedByPtTitle = normPtTitle && registry.watchedTitles.has(normPtTitle);
  const isWatchedBySlug = slug && registry.watchedSlugs.has(slug);

  const isIgnored = (normTitle && registry.ignoredTitles.has(normTitle)) ||
                    (normPtTitle && registry.ignoredTitles.has(normPtTitle));

  const inWatchlist = (normTitle && registry.watchlistTitles.has(normTitle)) ||
                      (slug && registry.watchlistSlugs.has(slug));

  if (isWatchedByTitle || isWatchedByPtTitle || isWatchedBySlug) {
    return {
      isWatched: true,
      inWatchlist: inWatchlist,
      isIgnored: isIgnored,
      reason: `Filme "${title}" (${movieYear || 'N/A'}) consta no historico de filmes assistidos do usuario @wender_fl no Letterboxd.`
    };
  }

  if (isIgnored) {
    return {
      isWatched: false,
      inWatchlist: inWatchlist,
      isIgnored: true,
      reason: `Filme "${title}" foi marcado como ignorado pelo usuario.`
    };
  }

  return {
    isWatched: false,
    inWatchlist: inWatchlist,
    isIgnored: false,
    reason: 'Filme nao assistido pelo usuario.'
  };
}

/**
 * Evaluates whether a movie complies with preferenciasDoUsuario.md
 */
function evaluateMoviePreferences(movie) {
  const violations = [];
  const bonuses = [];
  const penalties = [];
  const matchedThemes = [];

  const title = movie.title || '';
  const ptTitle = movie.ptTitle || '';
  const year = parseInt(movie.year || movie.omdb?.year || 0, 10);
  const category = (movie.category || '').toLowerCase();
  const parentCategory = (movie.parentCategory || '').toLowerCase();
  const country = (movie.omdb?.country || '').toLowerCase();
  const genre = (movie.omdb?.genre || '').toLowerCase();
  const director = (movie.omdb?.director || '').toLowerCase();
  const plot = (movie.omdb?.plot || movie.curatorNote || movie.curatorReason || '').toLowerCase();

  // 1. HARD FILTER: Evil Dead and Frieren exclusion
  const evilDeadRegex = /\bevil\s*dead\b|\barmy\s*of\s*darkness\b|\ba\s*morte\s*do\s*dem[oô]nio\b/i;
  if (evilDeadRegex.test(title) || evilDeadRegex.test(ptTitle)) {
    violations.push('Exclusao de Franquia: A franquia Evil Dead esta explicitamente excluida nas diretrizes.');
  }
  if (/uma noite alucinante/i.test(ptTitle) && (/evil dead/i.test(title) || /army of darkness/i.test(title) || /raimi/i.test(director))) {
    violations.push('Exclusao de Franquia: A franquia Evil Dead esta explicitamente excluida nas diretrizes.');
  }

  const frierenRegex = /\bfrieren\b|\bsousou\s*no\s*frieren\b/i;
  if (frierenRegex.test(title) || frierenRegex.test(ptTitle)) {
    violations.push('Exclusao Especifica: Frieren (Sousou no Frieren) esta expressamente excluido das recomendacoes pelo usuario.');
  }

  // 2. HARD FILTER: Dubbing in PT-BR
  const undubbedReports = loadJson(UNDUBBED_REPORTS_FILE, []);
  const isReportedUndubbed = undubbedReports.some(r =>
    normalizeTitle(r.title) === normalizeTitle(title) ||
    (ptTitle && normalizeTitle(r.ptTitle) === normalizeTitle(ptTitle))
  );

  if (isReportedUndubbed) {
    violations.push('Dublagem PT-BR: O filme foi reportado como nao dublado / sem audio PT-BR acessivel.');
  } else if (movie.dubbed === false) {
    violations.push('Dublagem PT-BR: O filme esta marcado como nao dublado (dubbed: false). 100% de dublagem e inegociavel.');
  }

  // 3. HARD FILTER: Anti-Sexism & Anti-Misogyny
  const sexistTropes = ['gratuitous nudity comedy', 'raunchy teen sex romp', 'misogynistic', 'male chauvinism'];
  for (const trope of sexistTropes) {
    if (plot.includes(trope)) {
      violations.push('Anti-Sexismo: Obra contem elementos depreciativos ou objetificacao gratuita reprovada pelas diretrizes.');
      break;
    }
  }

  // 4. TEMPORAL CHECK: 2003-2009 US Commercial Studio Movies
  const isUsProduction = country.includes('united states') || country.includes('usa');
  const isLoserComedy = category === 'loser-comedy' ||
                        category === 'baixa-autoestima' ||
                        category === 'misfit' ||
                        category === 'besteirol' ||
                        plot.includes('loser') ||
                        plot.includes('misfit') ||
                        plot.includes('perdedor');

  // Check for auteur / critically acclaimed cinema to distinguish generic studio formulas from masterpieces
  const auteurDirectors = ['david fincher', 'martin scorsese', 'charlie kaufman', 'coen', 'paul thomas anderson', 'kathryn bigelow', 'peter weir', 'spike lee', 'christopher nolan', 'guillermo del toro', 'alfonso cuaron', 'hayao miyazaki', 'denis villeneuve'];
  const isAuteur = auteurDirectors.some(d => director.includes(d));
  const imdbRating = parseFloat(movie.omdb?.imdbRating) || 7.0;
  const metascore = parseInt(movie.omdb?.metascore || 0, 10);
  const isCriticallyAcclaimed = imdbRating >= 7.8 || metascore >= 75;

  if (year >= 2003 && year <= 2009 && isUsProduction) {
    if (!isLoserComedy) {
      if (!isAuteur && !isCriticallyAcclaimed) {
        penalties.push({
          label: 'Filtro Temporal Anos 2000 (2003-2009 Hollywood Comercial)',
          points: -18
        });
        violations.push('Filtro Temporal Anos 2000: Filme comercial americano de 2003-2009 sem perfil de comedia de perdedores ou cinema autoral.');
      } else {
        // Auteur exception receives smaller period calibration penalty
        penalties.push({
          label: 'Calibracao Temporal Anos 2000 (Auteur / Alto Reconhecimento Critico)',
          points: -8
        });
      }
    }
  }

  // 5. AFFINITY SCORING CALCULATION
  // Base score centered at 76
  let baseScore = 76 + (imdbRating - 6.5) * 6;
  baseScore = Math.max(68, Math.min(86, Math.round(baseScore)));

  // Non-US Cinema Bonus (+12%)
  const isOutsideUs = !isUsProduction ||
    country.includes('united kingdom') ||
    country.includes('france') ||
    country.includes('italy') ||
    country.includes('germany') ||
    country.includes('spain') ||
    country.includes('japan') ||
    country.includes('korea') ||
    country.includes('iran') ||
    country.includes('brazil') ||
    country.includes('argentina') ||
    country.includes('mexico') ||
    country.includes('canada');

  if (isOutsideUs && (!isUsProduction || country.includes(','))) {
    bonuses.push({
      label: 'Cinema Fora do Eixo Hollywood Tradicional (+12%)',
      points: 12
    });
  }

  // Vintage Practical Effects Era (+10%) (60s, 70s, 80s, 90s)
  if (year >= 1960 && year <= 1999) {
    bonuses.push({
      label: 'Era Dourada dos Efeitos Praticos / Decadas 60-90 (+10%)',
      points: 10
    });
  }

  // THEMATIC ALIGNMENT (Themes A to O)
  // A. Loser Comedy / Misfits
  if (isLoserComedy) {
    matchedThemes.push('A. Comedia sobre Perdedores / Misfits');
    bonuses.push({ label: 'Tematica Perdedores & Misfits (+12%)', points: 12 });
  }

  // B. Terror Frenetico & Antigo
  if (parentCategory === 'terror' && year < 2000) {
    matchedThemes.push('B. Terror Frenetico & Antigo');
    bonuses.push({ label: 'Terror Vintage Pratico (+10%)', points: 10 });
  }

  // C. Aventura Agil e Nao-Convencional
  if (genre.includes('adventure') && !isUsProduction) {
    matchedThemes.push('C. Aventura Agil e Nao-Convencional');
    bonuses.push({ label: 'Aventura Nao-Convencional (+8%)', points: 8 });
  }

  // D. Animacoes e Cinema de Ficcao Criativo
  if (genre.includes('animation') || category.includes('animacao')) {
    matchedThemes.push('D. Animacoes e Cinema Criativo');
    bonuses.push({ label: 'Animacao Autoral (+8%)', points: 8 });
  }

  // E. Humor Acido & Vidas em Colapso
  if (category.includes('acido') || category.includes('colapso') || plot.includes('dark comedy') || plot.includes('cynical')) {
    matchedThemes.push('E. Humor Acido & Vidas em Colapso');
    bonuses.push({ label: 'Humor Acido & Colapso (+10%)', points: 10 });
  }

  // F. Furia & Foco
  if (category === 'furia-foco' || plot.includes('revenge') || plot.includes('vinganca') || plot.includes('obsession')) {
    matchedThemes.push('F. Furia & Foco');
    bonuses.push({ label: 'Canalizacao de Raiva & Foco (+10%)', points: 10 });
  }

  // G. Cyberpunk & Distopia Tecnologica
  if (category.includes('cyberpunk') || plot.includes('cyberpunk') || plot.includes('dystop')) {
    matchedThemes.push('G. Cyberpunk & Distopia Tecnologica');
    bonuses.push({ label: 'Cyberpunk & Alta Tecnologia (+10%)', points: 10 });
  }

  // H. Odisseia Noturna
  if (category === 'odisseia-noturna' || plot.includes('one night') || plot.includes('night in the city')) {
    matchedThemes.push('H. Odisseia Noturna');
    bonuses.push({ label: 'Sobrevivencia Noturna Urbana (+10%)', points: 10 });
  }

  // I. Terror Cosmico & Loucura
  if (category === 'cosmic-horror' || plot.includes('cosmic') || plot.includes('lovecraft') || plot.includes('madness')) {
    matchedThemes.push('I. Terror Cosmico & Loucura');
    bonuses.push({ label: 'Terror Cosmico & Paranoia (+10%)', points: 10 });
  }

  // J. Golpe Furado & Trapaceiros Amadores
  if (category === 'golpe-furado' || plot.includes('heist') || plot.includes('con artist') || plot.includes('amateur')) {
    matchedThemes.push('J. Golpe Furado & Trapaceiros Amadores');
    bonuses.push({ label: 'Trapaceiros Amadores & Azar (+10%)', points: 10 });
  }

  // K. Guerra Tatica & Estrategia Psicologica
  if (category === 'guerra-tatica' || (genre.includes('war') && !plot.includes('heroic patriot'))) {
    matchedThemes.push('K. Guerra Tatica Sem Ufanismo');
    bonuses.push({ label: 'Guerra Tatica Antibelica (+10%)', points: 10 });
  }

  // L. Cinema Iraniano & Realismo Poetico
  if (category === 'cinema-iraniano' || country.includes('iran')) {
    matchedThemes.push('L. Cinema Iraniano & Realismo Poetico');
    bonuses.push({ label: 'Cinema Iraniano Humanista (+12%)', points: 12 });
  }

  // M. Cinema Poetico & Contemplativo
  if (category === 'cinema-poetico' || category.includes('contemplat') || genre.includes('poetic')) {
    matchedThemes.push('M. Cinema Poetico & Contemplativo');
    bonuses.push({ label: 'Cinema Contemplativo (+12%)', points: 12 });
  }

  // N. Cinema Surrealista & Onirico
  if (category === 'cinema-surrealista' || plot.includes('surreal') || plot.includes('dream')) {
    matchedThemes.push('N. Cinema Surrealista & Onirico');
    bonuses.push({ label: 'Logica Onirica & Surrealismo (+10%)', points: 10 });
  }

  // O. Dilema Moral & Etica Existencial
  if (category === 'dilema-moral' || plot.includes('moral dilemma') || plot.includes('ethical')) {
    matchedThemes.push('O. Dilema Moral & Etica Existencial');
    bonuses.push({ label: 'Dilema Moral Profundo (+10%)', points: 10 });
  }

  // Generic Hollywood Commercial Penalty
  if (isUsProduction && !isOutsideUs && !isLoserComedy && !isAuteur && !isCriticallyAcclaimed && year >= 2000) {
    penalties.push({
      label: 'Formula Comercial Generica de Hollywood (-12%)',
      points: -12
    });
  }

  // Calculate final score
  const totalBonus = bonuses.reduce((acc, b) => acc + b.points, 0);
  const totalPenalties = penalties.reduce((acc, p) => acc + p.points, 0);
  let finalScore = baseScore + totalBonus + totalPenalties;
  finalScore = Math.min(99, Math.max(30, Math.round(finalScore)));

  // Minimum required affinity threshold: 75%
  const MIN_SCORE = 75;
  if (finalScore < MIN_SCORE) {
    violations.push(`Score de afinidade insuficiente: ${finalScore}% (minimo exigido: ${MIN_SCORE}%).`);
  }

  const approved = violations.length === 0 && finalScore >= MIN_SCORE;

  return {
    approved,
    affinityScore: finalScore,
    baseScore,
    bonuses,
    penalties,
    violations,
    matchedThemes,
    summary: approved
      ? `Aprovado com ${finalScore}% de afinidade com o perfil do usuario.`
      : `Reprovado: ${violations.join('; ')}`
  };
}

/**
 * Validates a candidate movie comprehensively:
 * 1. Has user watched it?
 * 2. Can user like it according to preferencesDoUsuario.md?
 * 3. Does it duplicate another category in catalog?
 */
function validateCandidateMovie(movie, existingMovies = null) {
  const result = {
    valid: false,
    watchedCheck: null,
    preferenceCheck: null,
    catalogDuplicate: false,
    errors: []
  };

  if (!movie || !movie.title) {
    result.errors.push('Filme invalido: titulo ausente.');
    return result;
  }

  // 1. Watched Check (Mandatory & Blocking)
  const watched = checkIfWatched(movie);
  result.watchedCheck = watched;
  if (watched.isWatched) {
    result.errors.push(`BLOQUEADO (JA ASSISTIDO): ${watched.reason}`);
  }
  if (watched.isIgnored) {
    result.errors.push(`BLOQUEADO (IGNORADO): ${watched.reason}`);
  }

  // 2. Preferences Check (Mandatory & Blocking)
  const prefs = evaluateMoviePreferences(movie);
  result.preferenceCheck = prefs;
  if (!prefs.approved) {
    prefs.violations.forEach(v => {
      result.errors.push(`PREFERENCIAS REPROVADAS: ${v}`);
    });
  }

  // 3. Duplicate check across catalog
  const moviesList = existingMovies || loadJson(path.join(DATA_DIR, 'movies.json'), []);
  const normTitle = normalizeTitle(movie.title);
  const existing = moviesList.find(m => normalizeTitle(m.title) === normTitle);
  if (existing) {
    result.catalogDuplicate = true;
    result.errors.push(`DUPLICATA: O filme "${movie.title}" ja existe no catalogo na categoria "${existing.category}". Regra de nao-repeticao violada.`);
  }

  result.valid = result.errors.length === 0;
  return result;
}

module.exports = {
  getWatchedRegistry,
  checkIfWatched,
  evaluateMoviePreferences,
  validateCandidateMovie,
  normalizeTitle,
  toSlug
};
