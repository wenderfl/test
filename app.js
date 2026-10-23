/**
 * Letterboxd Curator - Netflix TV Web Application
 * Authentic Netflix interface with expandable navigation rail,
 * cinematic hero banner, Bebas Neue Top 10 row, and horizontal shelves.
 * 
 * Strict rules: Zero emojis, pure vector SVG only, verified PT-BR dubbings.
 */

// ==========================================================================
// User State & Persistence (Disk & Google Account)
// ==========================================================================
const userWatched = new Set();
const userIgnored = new Set();
const userUndubbed = new Set();
const userComments = {};
const userSavedMovies = new Map(); // title -> object
const userSavedCategories = new Set();

let userIptvUrl = "";
let userIptvName = "";
let iptvParsedChannels = [];

let currentGoogleUser = null;
try {
  const cachedUser = localStorage.getItem("lb_curator_google_user");
  if (cachedUser) currentGoogleUser = JSON.parse(cachedUser);
} catch (e) {}

// Catalog Data
let categories = [];
let movies = [];
let activeHeroMovie = null;
let activeModalMovie = null;

// Filter & Sort State
let currentSearch = "";
let currentSort = "affinity-desc";
let currentSelectedCat = "all";
let currentNavHub = "home"; // "home", "terror", "besteirol", "art", "movies", "saved"

// ==========================================================================
// Initialization
// ==========================================================================
async function init() {
  await loadCatalogData();
  await loadUserStateFromDisk();
  initGoogleAuth();
  initIptvAutoLoad();

  renderCategoryPills();
  
  // Choose initial Hero Movie (Highest rated curated title)
  const initialHero = getInitialHeroMovie();
  renderHero(initialHero);

  renderContentRows();
  setupUIEventListeners();
  setupTVRemoteListeners();
  updateUserStatsUI();

  // Initial focus for Android TV controller (Mi TV Stick)
  setTimeout(() => {
    const heroPlay = document.getElementById("heroPlayBtn");
    if (heroPlay) {
      heroPlay.focus();
      heroPlay.classList.add("tv-focused");
    }
  }, 400);
}

async function loadCatalogData() {
  if (window.DEFAULT_CATALOG && window.DEFAULT_CATALOG.movies) {
    categories = window.DEFAULT_CATALOG.categories || [];
    movies = window.DEFAULT_CATALOG.movies || [];
  }

  if (!movies.length) {
    try {
      const [catsRes, movsRes] = await Promise.all([
        fetch("data/categories.json"),
        fetch("data/movies.json")
      ]);
      categories = await catsRes.json();
      movies = await movsRes.json();
    } catch (e) {
      console.error("[Catalog] Falha ao carregar catalog.js / movies.json:", e);
    }
  }
}

async function loadUserStateFromDisk() {
  try {
    const apiBase = window.location.origin.includes(":8085") ? "" : "http://127.0.0.1:8085";
    const res = await fetch(`${apiBase}/api/user-state`);
    if (res.ok) {
      const data = await res.json();
      applyUserStateData(data);
      return;
    }
  } catch (err) {
    console.warn("[UserState] Erro ao carregar da API:", err.message);
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem("lb_curator_user_state_v2");
    if (raw) applyUserStateData(JSON.parse(raw));
  } catch (e) {}
}

function applyUserStateData(data) {
  if (!data) return;
  if (Array.isArray(data.watched)) data.watched.forEach(t => userWatched.add(t));
  if (Array.isArray(data.ignored)) data.ignored.forEach(t => userIgnored.add(t));
  if (Array.isArray(data.undubbed)) data.undubbed.forEach(t => userUndubbed.add(t));
  if (data.comments) Object.assign(userComments, data.comments);
  if (Array.isArray(data.savedMovies)) {
    data.savedMovies.forEach(m => userSavedMovies.set(m.title, m));
  }
  if (Array.isArray(data.savedCategories)) {
    data.savedCategories.forEach(c => userSavedCategories.add(c));
  }
  if (data.iptvUrl) userIptvUrl = data.iptvUrl;
  if (data.iptvName) userIptvName = data.iptvName;
  if (data.googleUser && !currentGoogleUser) currentGoogleUser = data.googleUser;
}

async function saveUserStateToDisk() {
  const savedMoviesList = Array.from(userSavedMovies.values());
  const savedCategoriesList = Array.from(userSavedCategories);

  const payload = {
    watched: Array.from(userWatched),
    ignored: Array.from(userIgnored),
    undubbed: Array.from(userUndubbed),
    comments: userComments,
    savedMovies: savedMoviesList,
    savedCategories: savedCategoriesList,
    iptvUrl: userIptvUrl,
    iptvName: userIptvName,
    googleUser: currentGoogleUser
  };

  try {
    localStorage.setItem("lb_curator_user_state_v2", JSON.stringify(payload));
    if (currentGoogleUser) {
      localStorage.setItem("lb_curator_google_user", JSON.stringify(currentGoogleUser));
    }
  } catch (e) {}

  try {
    const apiBase = window.location.origin.includes(":8085") ? "" : "http://127.0.0.1:8085";
    await fetch(`${apiBase}/api/user-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("[UserState] Falha ao persistir no arquivo em disco:", err.message);
  }

  updateUserStatsUI();
}

function getInitialHeroMovie() {
  const unignored = movies.filter(m => !userIgnored.has(m.title));
  if (!unignored.length) return movies[0] || null;
  
  // Return a top-rated movie that is not yet watched
  const unwatched = unignored.filter(m => !userWatched.has(m.title));
  const pool = unwatched.length ? unwatched : unignored;

  return pool.slice().sort((a, b) => {
    const rA = parseFloat(a.omdb?.imdbRating) || 0;
    const rB = parseFloat(b.omdb?.imdbRating) || 0;
    return rB - rA;
  })[0] || pool[0];
}

// ==========================================================================
// Recommendation & Affinity Engine
// ==========================================================================
function getDecade(year) {
  const y = parseInt(year, 10);
  if (isNaN(y)) return "outros";
  if (y < 1960) return "50";
  if (y < 1970) return "60";
  if (y < 1980) return "70";
  if (y < 1990) return "80";
  if (y < 2000) return "90";
  return "2000+";
}

function buildUserProfile() {
  const genreWeights = {};
  const directorWeights = {};
  const categoryWeights = {};
  const decadeWeights = {};
  const commentKeywordsBoost = {};

  userWatched.forEach(title => {
    const m = movies.find(x => x.title === title);
    if (!m) return;
    const genres = (m.omdb?.genre || "").split(",").map(g => g.trim().toLowerCase());
    genres.forEach(g => { if (g) genreWeights[g] = (genreWeights[g] || 0) + 3; });
    const directors = (m.omdb?.director || "").split(",").map(d => d.trim().toLowerCase());
    directors.forEach(d => { if (d) directorWeights[d] = (directorWeights[d] || 0) + 4; });
    if (m.category) categoryWeights[m.category] = (categoryWeights[m.category] || 0) + 2;
    const dec = getDecade(m.year);
    decadeWeights[dec] = (decadeWeights[dec] || 0) + 2;
  });

  Object.entries(userComments).forEach(([title, comm]) => {
    const m = movies.find(x => x.title === title);
    if (!m) return;
    const multiplier = comm.sentiment === "positive" ? 5 : comm.sentiment === "negative" ? -5 : 1;
    const genres = (m.omdb?.genre || "").split(",").map(g => g.trim().toLowerCase());
    genres.forEach(g => { if (g) genreWeights[g] = (genreWeights[g] || 0) + multiplier; });
    const directors = (m.omdb?.director || "").split(",").map(d => d.trim().toLowerCase());
    directors.forEach(d => { if (d) directorWeights[d] = (directorWeights[d] || 0) + (multiplier * 1.5); });

    const text = (comm.text || "").toLowerCase();
    const words = text.match(/\b[a-zA-Z\u00C0-\u00FF]{4,}\b/g) || [];
    words.forEach(w => {
      commentKeywordsBoost[w] = (commentKeywordsBoost[w] || 0) + (multiplier > 0 ? 1 : -1);
    });
  });

  userIgnored.forEach(title => {
    const m = movies.find(x => x.title === title);
    if (!m) return;
    const genres = (m.omdb?.genre || "").split(",").map(g => g.trim().toLowerCase());
    genres.forEach(g => { if (g) genreWeights[g] = (genreWeights[g] || 0) - 3; });
    const directors = (m.omdb?.director || "").split(",").map(d => d.trim().toLowerCase());
    directors.forEach(d => { if (d) directorWeights[d] = (directorWeights[d] || 0) - 5; });
    if (m.category) categoryWeights[m.category] = (categoryWeights[m.category] || 0) - 3;
  });

  return { genreWeights, directorWeights, categoryWeights, decadeWeights, commentKeywordsBoost };
}

function calculateMovieAffinity(movie, profile) {
  const imdbVal = parseFloat(movie.omdb?.imdbRating) || 7.0;
  let score = 76 + (imdbVal - 7.0) * 10;
  if (userSavedMovies.has(movie.title)) score += 6;

  const genres = (movie.omdb?.genre || "").split(",").map(g => g.trim().toLowerCase());
  const directors = (movie.omdb?.director || "").split(",").map(d => d.trim().toLowerCase());
  const dec = getDecade(movie.year);

  let bonus = 0;
  genres.forEach(g => {
    const w = profile.genreWeights[g] || 0;
    if (w > 0) bonus += Math.min(w * 1.1, 9);
    else if (w < 0) bonus += Math.max(w * 1.0, -10);
  });

  directors.forEach(d => {
    const w = profile.directorWeights[d] || 0;
    if (w > 0) bonus += Math.min(w * 1.4, 12);
    else if (w < 0) bonus += Math.max(w * 1.2, -12);
  });

  const catW = profile.categoryWeights[movie.category] || 0;
  if (catW > 0) bonus += Math.min(catW * 1.0, 8);
  else if (catW < 0) bonus += Math.max(catW * 0.9, -8);

  const decW = profile.decadeWeights[dec] || 0;
  if (decW > 0) bonus += Math.min(decW * 0.7, 4);

  // Preferred cinema attributes (practical effects decades & misfits)
  if (dec === "70" || dec === "80") bonus += 4;
  if (movie.category === "loser-comedy") bonus += 5;

  score += bonus;
  if (userWatched.has(movie.title)) score -= 14; // already seen deprioritization
  if (userIgnored.has(movie.title)) score = 20;

  return Math.min(Math.max(Math.round(score), 45), 99);
}

// ==========================================================================
// Rendering: Netflix Cinematic Hero
// ==========================================================================
function renderHero(movie) {
  if (!movie) return;
  activeHeroMovie = movie;

  const cat = categories.find(c => c.id === movie.category);
  const poster = movie.omdb?.poster && movie.omdb.poster !== "N/A"
    ? movie.omdb.poster
    : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200";

  const backdropEl = document.getElementById("heroBackdrop");
  if (backdropEl) backdropEl.src = poster;

  const catTagEl = document.getElementById("heroCategoryTag");
  if (catTagEl) {
    if (cat && cat.parentCategory) {
      const parentName = cat.parentCategory === "art" ? "ART" : cat.parentCategory.toUpperCase();
      catTagEl.textContent = `${parentName} • ${(cat.badgeLabel || cat.name).toUpperCase()}`;
    } else {
      catTagEl.textContent = cat ? (cat.badgeLabel || cat.name).toUpperCase() : "CURADORIA LETTERBOXD";
    }
  }

  const titleEl = document.getElementById("heroTitle");
  if (titleEl) {
    titleEl.textContent = movie.ptTitle || movie.title;
  }

  const profile = buildUserProfile();
  const matchScore = calculateMovieAffinity(movie, profile);
  const matchEl = document.getElementById("heroMatch");
  if (matchEl) matchEl.textContent = `${matchScore}% relevante`;

  const yearEl = document.getElementById("heroYear");
  if (yearEl) yearEl.textContent = movie.year || "2021";

  const ratedEl = document.getElementById("heroRated");
  if (ratedEl) ratedEl.textContent = movie.omdb?.rated && movie.omdb.rated !== "N/A" ? movie.omdb.rated : "16+";

  const runtimeEl = document.getElementById("heroRuntime");
  if (runtimeEl) runtimeEl.textContent = movie.omdb?.runtime && movie.omdb.runtime !== "N/A" ? movie.omdb.runtime : "110 min";

  const ratingEl = document.getElementById("heroRating");
  const imdb = movie.omdb?.imdbRating;
  if (ratingEl) {
    if (imdb && imdb !== "N/A") {
      ratingEl.textContent = `★ ${imdb}`;
      ratingEl.style.display = "inline-flex";
    } else {
      ratingEl.style.display = "none";
    }
  }

  const dubEl = document.getElementById("heroDub");
  if (dubEl) {
    if (movie.dubbed) {
      dubEl.style.display = "inline-block";
      dubEl.textContent = movie.dubbingStudio ? `DUB (${movie.dubbingStudio})` : "DUBLADO";
    } else {
      dubEl.style.display = "none";
    }
  }

  const synopsisEl = document.getElementById("heroSynopsis");
  if (synopsisEl) {
    const synText = movie.curatorNote || movie.curatorReason || movie.omdb?.plot || "Obra-prima curada do cinema.";
    synopsisEl.textContent = synText;
  }

  // Update Hero circle buttons state
  const heroSaveBtn = document.getElementById("heroSaveBtn");
  if (heroSaveBtn) {
    heroSaveBtn.classList.toggle("active", userSavedMovies.has(movie.title));
  }

  const heroWatchedBtn = document.getElementById("heroWatchedBtn");
  if (heroWatchedBtn) {
    heroWatchedBtn.classList.toggle("active", userWatched.has(movie.title));
  }

  // Automatic Video Trailer Playback (Muted, Video Only)
  startHeroTrailer(movie);
}

// ==========================================================================
// Automatic Video Trailer Controller (Muted Background Previews)
// ==========================================================================
let heroTrailerDebounce = null;
let modalTrailerDebounce = null;
let isHeroTrailerMuted = true;

function startHeroTrailer(movie) {
  const trailerVideo = document.getElementById("heroTrailerVideo");
  if (!trailerVideo) return;

  if (heroTrailerDebounce) clearTimeout(heroTrailerDebounce);
  trailerVideo.classList.remove("trailer-playing");
  trailerVideo.pause();

  heroTrailerDebounce = setTimeout(() => {
    // Only play if full player and modal are closed
    const netflixOverlay = document.getElementById("netflixPlayerOverlay");
    const detailModal = document.getElementById("detailModal");
    if (netflixOverlay && netflixOverlay.style.display !== "none") return;
    if (detailModal && detailModal.classList.contains("open")) return;

    const streamUrl = resolveMovieStreamUrl(movie);
    if (!streamUrl) return;

    trailerVideo.muted = isHeroTrailerMuted;
    trailerVideo.src = streamUrl;
    trailerVideo.load();

    trailerVideo.play().then(() => {
      if (trailerVideo.duration > 120) {
        trailerVideo.currentTime = 40;
      }
      trailerVideo.classList.add("trailer-playing");
    }).catch(e => {
      // Autoplay silently handled
    });
  }, 500);
}

function stopHeroTrailer() {
  if (heroTrailerDebounce) clearTimeout(heroTrailerDebounce);
  const trailerVideo = document.getElementById("heroTrailerVideo");
  if (trailerVideo) {
    trailerVideo.pause();
    trailerVideo.classList.remove("trailer-playing");
  }
}

function toggleHeroTrailerSound() {
  const trailerVideo = document.getElementById("heroTrailerVideo");
  const iconMute = document.getElementById("heroTrailerIconMute");
  const iconVol = document.getElementById("heroTrailerIconVol");
  const soundBtn = document.getElementById("heroTrailerSoundBtn");
  if (!trailerVideo) return;

  isHeroTrailerMuted = !isHeroTrailerMuted;
  trailerVideo.muted = isHeroTrailerMuted;

  if (iconMute && iconVol) {
    if (isHeroTrailerMuted) {
      iconMute.style.display = "inline";
      iconVol.style.display = "none";
      if (soundBtn) soundBtn.title = "Ativar Som";
    } else {
      iconMute.style.display = "none";
      iconVol.style.display = "inline";
      if (soundBtn) soundBtn.title = "Desativar Som";
    }
  }
}

function startModalTrailer(movie) {
  const trailerVideo = document.getElementById("modalTrailerVideo");
  if (!trailerVideo) return;

  if (modalTrailerDebounce) clearTimeout(modalTrailerDebounce);
  trailerVideo.classList.remove("trailer-playing");
  try {
    trailerVideo.pause();
  } catch (e) {}

  modalTrailerDebounce = setTimeout(() => {
    const streamUrl = resolveMovieStreamUrl(movie);
    if (!streamUrl) return;

    trailerVideo.muted = true; // Strictly without audio
    trailerVideo.src = streamUrl;
    trailerVideo.load();

    const onPlaying = () => {
      trailerVideo.classList.add("trailer-playing");
      trailerVideo.removeEventListener("playing", onPlaying);
    };
    trailerVideo.addEventListener("playing", onPlaying);

    trailerVideo.play().then(() => {
      trailerVideo.classList.add("trailer-playing");
      try {
        if (trailerVideo.duration > 120) {
          trailerVideo.currentTime = 45;
        }
      } catch (err) {}
    }).catch(() => {});
  }, 350);
}

function stopModalTrailer() {
  if (modalTrailerDebounce) clearTimeout(modalTrailerDebounce);
  const trailerVideo = document.getElementById("modalTrailerVideo");
  if (trailerVideo) {
    try {
      trailerVideo.pause();
    } catch (e) {}
    trailerVideo.removeAttribute("src");
    trailerVideo.load();
    trailerVideo.classList.remove("trailer-playing");
  }
}

// ==========================================================================
// Hub Navigation: Início, Terror, Besteirol, Art, Filmes, Minha Lista
// ==========================================================================
function setNavHub(hub, scrollToTop = true) {
  currentNavHub = hub;
  currentSelectedCat = "all";

  // Update active states in navigation rail
  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".nav-item-group").forEach(g => g.classList.remove("active", "open"));
  document.querySelectorAll(".nav-sub-item").forEach(s => s.classList.remove("active"));

  if (hub === "home") {
    document.getElementById("navHome")?.classList.add("active");
  } else if (hub === "terror") {
    document.getElementById("navTerror")?.classList.add("active");
    document.querySelector('.nav-item-group[data-group="terror"]')?.classList.add("active", "open");
  } else if (hub === "besteirol") {
    document.getElementById("navBesteirol")?.classList.add("active");
    document.querySelector('.nav-item-group[data-group="besteirol"]')?.classList.add("active", "open");
  } else if (hub === "art") {
    document.getElementById("navArt")?.classList.add("active");
    document.querySelector('.nav-item-group[data-group="art"]')?.classList.add("active", "open");
  } else if (hub === "movies") {
    document.getElementById("navMovies")?.classList.add("active");
  } else if (hub === "saved") {
    document.getElementById("btnOpenSavedMovies")?.classList.add("active");
  }

  // Update hero to top title in this category hub
  const heroMovie = getHeroMovieForHub(hub);
  renderHero(heroMovie);

  // Render category pills and shelves matching this hub
  renderCategoryPills();
  renderContentRows();

  if (scrollToTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function getHeroMovieForHub(hub) {
  const profile = buildUserProfile();
  let pool = movies.filter(m => !userIgnored.has(m.title));
  if (hub === "terror" || hub === "besteirol" || hub === "art") {
    pool = pool.filter(m => {
      const c = categories.find(cat => cat.id === m.category);
      return c && c.parentCategory === hub;
    });
  } else if (hub === "saved") {
    pool = Array.from(userSavedMovies.values());
  }
  if (!pool.length) pool = movies;
  const unwatched = pool.filter(m => !userWatched.has(m.title));
  const finalPool = unwatched.length ? unwatched : pool;
  return finalPool.slice().sort((a, b) => calculateMovieAffinity(b, profile) - calculateMovieAffinity(a, profile))[0] || pool[0];
}

// ==========================================================================
// Rendering: Category Pills (Fast Jump within Active Hub)
// ==========================================================================
function renderCategoryPills() {
  const container = document.getElementById("categoryPills");
  if (!container) return;
  container.innerHTML = "";

  let visibleCats = categories.filter(c => !c.isMegaCategory && movies.some(m => m.category === c.id));
  let allLabel = "Todos os Filmes";

  if (currentNavHub === "terror") {
    visibleCats = visibleCats.filter(c => c.parentCategory === "terror");
    allLabel = "Todos de Terror";
  } else if (currentNavHub === "besteirol") {
    visibleCats = visibleCats.filter(c => c.parentCategory === "besteirol");
    allLabel = "Todos de Besteirol";
  } else if (currentNavHub === "art") {
    visibleCats = visibleCats.filter(c => c.parentCategory === "art");
    allLabel = "Todos de Art";
  } else if (currentNavHub === "saved") {
    allLabel = "Minha Lista Completa";
  }

  const allBtn = document.createElement("button");
  allBtn.className = "cat-pill" + (currentSelectedCat === "all" ? " active" : "");
  allBtn.dataset.category = "all";
  allBtn.textContent = allLabel;
  allBtn.onclick = () => {
    currentSelectedCat = "all";
    document.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
    allBtn.classList.add("active");
    window.scrollTo({ top: 380, behavior: "smooth" });
  };
  container.appendChild(allBtn);

  visibleCats.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "cat-pill" + (currentSelectedCat === cat.id ? " active" : "");
    btn.dataset.category = cat.id;
    btn.textContent = cat.name;
    btn.onclick = () => {
      currentSelectedCat = cat.id;
      document.querySelectorAll(".cat-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const shelf = document.getElementById("shelf-" + cat.id);
      if (shelf) shelf.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    container.appendChild(btn);
  });
}

// ==========================================================================
// Rendering: Content Shelves (Filtered by Active Hub)
// ==========================================================================
function renderContentRows() {
  const container = document.getElementById("contentRows");
  if (!container) return;
  container.innerHTML = "";

  const profile = buildUserProfile();

  // 1. Minha Lista (Exclusivo quando o hub 'saved' estiver ativo)
  if (currentNavHub === "saved") {
    renderSavedShelf(container);
    bindCardHoverAndClick();
    return;
  }

  // 2. PRATELEIRAS INTELIGENTES DA NETFLIX NA PÁGINA INICIAL
  if (currentNavHub === "home" && !currentSearch) {
    // A. Continuar Assistindo (Filmes com reprodução iniciada e progresso salvo)
    renderContinueWatchingShelf(container);

    // B. Minha Lista (Favoritos salvos pelo usuário)
    if (userSavedMovies.size > 0) {
      renderSavedShelf(container);
    }

    // C. Top 10 Hoje no Letterboxd Curator
    renderTop10Row(container);

    // D. Alta Afinidade com Seu Perfil (Recomendações IA com Match > 90%)
    renderHighAffinityShelf(container, profile);

    // E. Porque Você Assistiu / Curtiu (Similaridade Temática baseada no Histórico)
    renderBecauseYouWatchedShelf(container, profile);

    // F. Cinema Global • Fora do Eixo Hollywood (Bônus +12% Afinidade)
    renderGlobalCinemaShelf(container, profile);

    // G. Obras com Efeitos Práticos • Anos 70, 80 e 90 (Bônus +10% Afinidade)
    renderVintagePracticalsShelf(container, profile);
  }

  // 3. TARGET CATEGORY SHELVES FOR ACTIVE HUB
  let targetCategories = categories.filter(c => !c.isMegaCategory);
  if (currentNavHub === "terror") {
    targetCategories = targetCategories.filter(c => c.parentCategory === "terror");
  } else if (currentNavHub === "besteirol") {
    targetCategories = targetCategories.filter(c => c.parentCategory === "besteirol");
  } else if (currentNavHub === "art") {
    targetCategories = targetCategories.filter(c => c.parentCategory === "art");
  }

  targetCategories.forEach(cat => {
    let catMovies = movies.filter(m => m.category === cat.id);

    // Search filter
    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      catMovies = catMovies.filter(m => {
        return (m.title && m.title.toLowerCase().includes(q)) ||
               (m.ptTitle && m.ptTitle.toLowerCase().includes(q)) ||
               (m.omdb?.director && m.omdb.director.toLowerCase().includes(q)) ||
               (m.curatorNote && m.curatorNote.toLowerCase().includes(q));
      });
    }

    if (!catMovies.length) return;

    // Apply sorting
    catMovies = sortMovieList(catMovies, currentSort, profile);

    const section = document.createElement("div");
    section.className = "shelf-section";
    section.id = "shelf-" + cat.id;

    const parentTag = cat.parentCategory ? (cat.parentCategory === "art" ? "ART" : cat.parentCategory.toUpperCase()) : "";

    section.innerHTML = `
      <div class="shelf-header">
        <div class="shelf-title">
          <span>${escapeHtml(cat.name)}</span>
          ${parentTag ? `<span style="font-size: 11px; font-weight: 700; color: #a3a3a3; background: rgba(255,255,255,0.08); padding: 2px 7px; border-radius: 3px; letter-spacing: 0.5px;">${parentTag}</span>` : ""}
          <span class="explore-arrow">Explorar todos &gt;</span>
        </div>
        <span class="shelf-count">${catMovies.length} títulos</span>
      </div>
      <div class="shelf-carousel-wrapper">
        <button class="shelf-nav-btn prev" aria-label="Voltar" title="Rolar para esquerda">
          <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div class="shelf-carousel" id="carousel-${cat.id}">
          ${catMovies.map(m => createPosterCardHtml(m)).join("")}
        </div>
        <button class="shelf-nav-btn next" aria-label="Avançar" title="Rolar para direita">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    `;

    container.appendChild(section);

    // Setup chevron scroll buttons
    const carouselEl = section.querySelector(".shelf-carousel");
    const prevBtn = section.querySelector(".shelf-nav-btn.prev");
    const nextBtn = section.querySelector(".shelf-nav-btn.next");

    if (prevBtn && carouselEl) {
      prevBtn.onclick = () => {
        carouselEl.scrollBy({ left: -480, behavior: "smooth" });
      };
    }
    if (nextBtn && carouselEl) {
      nextBtn.onclick = () => {
        carouselEl.scrollBy({ left: 480, behavior: "smooth" });
      };
    }
  });

  bindCardHoverAndClick();
}

// ==========================================================================
// Intelligent Recommendation Engine (Netflix-Grade AI & Content Similarity)
// ==========================================================================

function getContinueWatchingList() {
  const items = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("progress_")) {
        const title = key.replace("progress_", "");
        const movie = movies.find(m => m.title === title) || userSavedMovies.get(title);
        if (movie && !userIgnored.has(movie.title)) {
          const currentTime = parseFloat(localStorage.getItem(key) || "0");
          const durMinutes = parseInt(movie.omdb?.runtime, 10) || 105;
          const totalDuration = durMinutes * 60;
          if (currentTime > 25 && currentTime < totalDuration * 0.95) {
            const progressPct = Math.min(96, Math.max(5, Math.round((currentTime / totalDuration) * 100)));
            items.push({ movie, currentTime, progressPct });
          }
        }
      }
    }
  } catch (e) {}

  items.sort((a, b) => b.currentTime - a.currentTime);
  return items;
}

function getSimilarMovies(baseMovie, limit = 15) {
  if (!baseMovie) return [];
  const baseGenres = (baseMovie.omdb?.genre || "").toLowerCase().split(",").map(g => g.trim()).filter(Boolean);
  const baseDirector = (baseMovie.omdb?.director || "").toLowerCase().trim();
  const baseDecade = getDecade(baseMovie.year);
  const baseCategory = baseMovie.category;
  const baseParent = baseMovie.parentCategory;

  const candidates = movies.filter(m => m.title !== baseMovie.title && !userWatched.has(m.title) && !userIgnored.has(m.title));

  const scored = candidates.map(m => {
    let sim = 0;
    const mGenres = (m.omdb?.genre || "").toLowerCase().split(",").map(g => g.trim()).filter(Boolean);
    const mDirector = (m.omdb?.director || "").toLowerCase().trim();
    const mDecade = getDecade(m.year);

    const sharedGenres = mGenres.filter(g => baseGenres.includes(g)).length;
    sim += sharedGenres * 3.5;

    if (baseDirector && mDirector && (baseDirector.includes(mDirector) || mDirector.includes(baseDirector))) {
      sim += 6.0;
    }

    if (m.category === baseCategory) sim += 3.5;
    if (m.parentCategory === baseParent) sim += 2.0;
    if (mDecade === baseDecade) sim += 2.0;

    const imdb = parseFloat(m.omdb?.imdbRating) || 7.0;
    sim += (imdb - 6.0) * 0.8;

    return { movie: m, similarity: sim };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit).map(s => s.movie);
}

function renderContinueWatchingShelf(container) {
  const list = getContinueWatchingList();
  if (!list.length) return;

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-continue-watching";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span>Continuar Assistindo</span>
        <span class="shelf-ai-badge">Progresso Salvo</span>
      </div>
      <span class="shelf-count">${list.length} títulos em andamento</span>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="shelf-carousel">
        ${list.map(item => createPosterCardHtml(item.movie, { progressPct: item.progressPct })).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".shelf-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function renderHighAffinityShelf(container, profile) {
  const unwatched = movies.filter(m => !userWatched.has(m.title) && !userIgnored.has(m.title));
  const scored = unwatched.map(m => ({ movie: m, affinity: calculateMovieAffinity(m, profile) }));
  scored.sort((a, b) => b.affinity - a.affinity);
  const topPicks = scored.slice(0, 16).map(s => s.movie);

  if (!topPicks.length) return;

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-high-affinity";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span>Alta Afinidade com Seu Perfil</span>
        <span class="shelf-ai-badge">Recomendação IA</span>
      </div>
      <span class="shelf-count">Match acima de 90%</span>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="shelf-carousel">
        ${topPicks.map(m => createPosterCardHtml(m, { showMatch: true })).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".shelf-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function renderBecauseYouWatchedShelf(container, profile) {
  let seedMovie = null;

  const positiveTitle = Object.keys(userComments).find(t => userComments[t]?.sentiment === "positive");
  if (positiveTitle) seedMovie = movies.find(m => m.title === positiveTitle);

  if (!seedMovie && userSavedMovies.size > 0) {
    seedMovie = Array.from(userSavedMovies.values())[0];
  }

  if (!seedMovie && userWatched.size > 0) {
    const wTitle = Array.from(userWatched)[userWatched.size - 1];
    seedMovie = movies.find(m => m.title === wTitle);
  }

  if (!seedMovie) {
    seedMovie = movies.find(m => m.title === "Heat" || m.title === "The Thing" || m.title === "Tucker and Dale vs Evil");
  }

  if (!seedMovie) return;

  const similar = getSimilarMovies(seedMovie, 14);
  if (!similar.length) return;

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-because-you-watched";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span>Porque você curtiu "${escapeHtml(seedMovie.ptTitle || seedMovie.title)}"</span>
        <span class="shelf-ai-badge">Similaridade Temática</span>
      </div>
      <span class="shelf-count">${similar.length} sugestões</span>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="shelf-carousel">
        ${similar.map(m => createPosterCardHtml(m, { showMatch: true })).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".shelf-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function renderGlobalCinemaShelf(container, profile) {
  const globalMovies = movies.filter(m => {
    if (userWatched.has(m.title) || userIgnored.has(m.title)) return false;
    const country = (m.omdb?.country || "").toLowerCase();
    const isUsOnly = country.includes("united states") && !country.includes("united kingdom") && !country.includes("france") && !country.includes("japan") && !country.includes("italy");
    const isGlobalCat = m.category === "world-cinema" || m.category === "anime-notable";
    return isGlobalCat || !isUsOnly || country.includes("france") || country.includes("japan") || country.includes("united kingdom") || country.includes("spain") || country.includes("italy") || country.includes("south korea") || country.includes("germany");
  });

  if (!globalMovies.length) return;
  const sorted = sortMovieList(globalMovies, "affinity-desc", profile).slice(0, 15);

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-global-cinema";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span>Cinema Global • Fora do Eixo Tradicional</span>
        <span class="shelf-tag-global">Bônus +12% Afinidade</span>
      </div>
      <span class="shelf-count">Europa, Ásia & América Latina</span>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="shelf-carousel">
        ${sorted.map(m => createPosterCardHtml(m, { showMatch: true })).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".shelf-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function renderVintagePracticalsShelf(container, profile) {
  const vintage = movies.filter(m => {
    if (userWatched.has(m.title) || userIgnored.has(m.title)) return false;
    const dec = getDecade(m.year);
    return dec === "70" || dec === "80" || dec === "90";
  });

  if (!vintage.length) return;
  const sorted = sortMovieList(vintage, "affinity-desc", profile).slice(0, 15);

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-vintage-practicals";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span>Obras com Efeitos Práticos • Anos 70, 80 e 90</span>
        <span class="shelf-tag-vintage">Bônus +10% Afinidade</span>
      </div>
      <span class="shelf-count">Animatrônicos, Dublês & Ação Real</span>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button>
      <div class="shelf-carousel">
        ${sorted.map(m => createPosterCardHtml(m, { showMatch: true })).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".shelf-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function renderSavedShelf(container) {
  const savedList = Array.from(userSavedMovies.values());
  const savedMovieObjects = savedList.map(s => movies.find(m => m.title === s.title) || s);

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-saved";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span style="color: var(--accent-green);">★</span> Minha Lista
        <span style="font-size: 13px; font-weight: 600; color: #a3a3a3; background: rgba(70,211,105,0.15); padding: 2px 8px; border-radius: 4px; margin-left: 6px;">Seus Favoritos</span>
      </div>
      <span class="shelf-count">${savedMovieObjects.length} títulos</span>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar">
        <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="shelf-carousel">
        ${savedMovieObjects.map(m => createPosterCardHtml(m)).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar">
        <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".shelf-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function renderTop10Row(container) {
  // Top 10 highly-rated unignored movies
  const top10 = movies
    .filter(m => !userIgnored.has(m.title) && m.omdb?.imdbRating && m.omdb.imdbRating !== "N/A")
    .sort((a, b) => parseFloat(b.omdb.imdbRating) - parseFloat(a.omdb.imdbRating))
    .slice(0, 10);

  const section = document.createElement("div");
  section.className = "shelf-section";
  section.id = "shelf-top10";
  section.innerHTML = `
    <div class="shelf-header">
      <div class="shelf-title">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--netflix-red);">★</span> Fortemente Recomendados
          <span style="font-size: 13px; font-weight: 600; color: #a3a3a3; background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 4px; margin-left: 6px;">Top 10 Hoje</span>
        </span>
      </div>
    </div>
    <div class="shelf-carousel-wrapper">
      <button class="shelf-nav-btn prev" aria-label="Voltar">
        <svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>
      </button>
      <div class="top10-carousel">
        ${top10.map((m, index) => `
          <div class="top10-item" tabindex="0" data-title="${encodeURIComponent(m.title)}">
            <span class="top10-number">${index + 1}</span>
            <div class="top10-poster-wrap">
              <img src="${m.omdb?.poster || ''}" alt="${escapeHtml(m.title)}" loading="lazy">
              ${m.omdb?.imdbRating ? `<div class="card-rating-badge">★ ${m.omdb.imdbRating}</div>` : ''}
              ${m.dubbed ? `<div class="card-dub-badge">DUB</div>` : ''}
              ${userWatched.has(m.title) ? `
                <div class="card-watched-overlay">
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>` : ''}
            </div>
          </div>
        `).join("")}
      </div>
      <button class="shelf-nav-btn next" aria-label="Avançar">
        <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  `;
  container.appendChild(section);

  const carouselEl = section.querySelector(".top10-carousel");
  const prevBtn = section.querySelector(".shelf-nav-btn.prev");
  const nextBtn = section.querySelector(".shelf-nav-btn.next");
  if (prevBtn && carouselEl) prevBtn.onclick = () => carouselEl.scrollBy({ left: -480, behavior: "smooth" });
  if (nextBtn && carouselEl) nextBtn.onclick = () => carouselEl.scrollBy({ left: 480, behavior: "smooth" });
}

function createPosterCardHtml(m, options = {}) {
  const poster = m.omdb?.poster || "";
  const rating = m.omdb?.imdbRating;
  const isWatched = userWatched.has(m.title);
  const matchScore = options.matchScore || (options.showMatch ? calculateMovieAffinity(m, buildUserProfile()) : null);
  const progressPct = options.progressPct || null;

  return `
    <div class="poster-card" tabindex="0" data-title="${encodeURIComponent(m.title)}">
      <img src="${poster}" alt="${escapeHtml(m.title)}" loading="lazy">
      ${matchScore && matchScore >= 80 ? `<div class="card-match-badge">${matchScore}% Relevante</div>` : (rating && rating !== "N/A" ? `<div class="card-rating-badge">★ ${rating}</div>` : "")}
      ${m.dubbed ? `<div class="card-dub-badge">DUB</div>` : ""}
      <button class="card-quick-play-btn" title="Assistir Agora no Player Netflix" aria-label="Assistir ${escapeHtml(m.title)}">
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>
      ${progressPct ? `
        <div class="card-progress-track">
          <div class="card-progress-fill" style="width: ${progressPct}%"></div>
        </div>
      ` : ""}
      ${isWatched ? `
        <div class="card-watched-overlay">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </div>` : ""}
    </div>
  `;
}

function sortMovieList(list, sortType, profile) {
  const arr = list.slice();
  if (sortType === "imdb-desc") {
    return arr.sort((a, b) => (parseFloat(b.omdb?.imdbRating) || 0) - (parseFloat(a.omdb?.imdbRating) || 0));
  } else if (sortType === "year-desc") {
    return arr.sort((a, b) => (parseInt(b.year, 10) || 0) - (parseInt(a.year, 10) || 0));
  } else if (sortType === "year-asc") {
    return arr.sort((a, b) => (parseInt(a.year, 10) || 0) - (parseInt(b.year, 10) || 0));
  } else if (sortType === "title-asc") {
    return arr.sort((a, b) => (a.ptTitle || a.title || "").localeCompare(b.ptTitle || b.title || ""));
  } else {
    // affinity-desc default
    return arr.sort((a, b) => calculateMovieAffinity(b, profile) - calculateMovieAffinity(a, profile));
  }
}

// ==========================================================================
// Card Hover & Click Binding: Live Hero Synchronization
// ==========================================================================
function bindCardHoverAndClick() {
  const allCards = document.querySelectorAll(".poster-card, .top10-item");

  allCards.forEach(card => {
    const rawTitle = decodeURIComponent(card.dataset.title);
    const movie = movies.find(m => m.title === rawTitle) || userSavedMovies.get(rawTitle);
    if (!movie) return;

    // Quick Play button handler
    const quickPlay = card.querySelector(".card-quick-play-btn");
    if (quickPlay) {
      quickPlay.addEventListener("click", (e) => {
        e.stopPropagation();
        openNetflixPlayer(movie);
      });
    }

    // On Hover or Focus -> Instant Hero update & TV focus memory
    card.addEventListener("mouseenter", () => renderHero(movie));
    card.addEventListener("focus", () => {
      lastFocusedCard = card;
      card.classList.add("tv-focused");
      renderHero(movie);
    });
    card.addEventListener("blur", () => {
      card.classList.remove("tv-focused");
    });

    // On Click or Enter -> Open Netflix Detail Modal
    card.addEventListener("click", () => openDetailModal(movie));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23) {
        e.preventDefault();
        openDetailModal(movie);
      }
    });
  });
}

// ==========================================================================
// Portuguese Genre Translations Dictionary
// ==========================================================================
const GENRE_TRANSLATIONS = {
  "Action": "Ação",
  "Adventure": "Aventura",
  "Animation": "Animação",
  "Biography": "Biografia",
  "Comedy": "Comédia",
  "Crime": "Crime",
  "Documentary": "Documentário",
  "Drama": "Drama",
  "Family": "Família",
  "Fantasy": "Fantasia",
  "History": "História",
  "Horror": "Terror",
  "Music": "Música",
  "Musical": "Musical",
  "Mystery": "Mistério",
  "Romance": "Romance",
  "Sci-Fi": "Ficção Científica",
  "Short": "Curta-metragem",
  "Sport": "Esporte",
  "Thriller": "Suspense",
  "War": "Guerra",
  "Western": "Faroeste"
};

function formatGenresPt(genres) {
  if (!genres) return "Cinema";
  return genres.split(",")
    .map(g => g.trim())
    .map(g => GENRE_TRANSLATIONS[g] || g)
    .join(", ");
}

function getMovieProgressPercent(movie) {
  if (!movie) return 0;
  const savedTime = parseFloat(localStorage.getItem(`progress_${movie.title}`) || "0");
  const savedDur = parseFloat(localStorage.getItem(`duration_${movie.title}`) || "0");
  if (savedTime > 30 && savedDur > 60) {
    return Math.min(100, Math.round((savedTime / savedDur) * 100));
  }
  return 0;
}

// ==========================================================================
// Netflix Detail Modal
// ==========================================================================
function openDetailModal(movie) {
  if (!movie) return;
  activeModalMovie = movie;
  const modal = document.getElementById("detailModal");
  if (!modal) return;

  const modalCard = modal.querySelector(".modal-card");
  if (modalCard) {
    modalCard.scrollTop = 0;
  }

  const poster = movie.omdb?.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba";
  const modalImg = document.getElementById("modalImg");
  if (modalImg) {
    modalImg.onerror = () => {
      modalImg.src = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba";
    };
    modalImg.src = poster;
    modalImg.alt = movie.title || "Poster";
  }

  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) {
    modalTitle.textContent = movie.ptTitle || movie.title;
  }

  // Technical Specs & Metadata Bar
  const profile = buildUserProfile();
  const affScore = calculateMovieAffinity(movie, profile);
  const specMatch = document.getElementById("modalSpecMatch");
  if (specMatch) specMatch.textContent = `${affScore}% Relevante`;

  const specYear = document.getElementById("modalSpecYear");
  if (specYear) specYear.textContent = movie.year || movie.omdb?.year || "";

  const specRated = document.getElementById("modalSpecRated");
  if (specRated) {
    let rating = movie.omdb?.rated || "14";
    if (rating === "R") rating = "16";
    if (rating === "PG-13") rating = "14";
    if (rating === "PG") rating = "10";
    if (rating === "G") rating = "L";
    specRated.textContent = rating;
  }

  const specDuration = document.getElementById("modalSpecDuration");
  if (specDuration) specDuration.textContent = movie.omdb?.runtime || "1h 50m";

  const specAudio = document.getElementById("modalSpecAudio");
  if (specAudio) {
    specAudio.textContent = movie.dubbed ? "Dublado PT-BR" : "Legendado";
  }

  // Primary Watch Button Text (Assistir vs Continuar Assistindo)
  const watchBtnText = document.getElementById("modalWatchBtnText");
  const storedProg = getMovieProgressPercent(movie);
  if (watchBtnText) {
    if (storedProg > 0 && storedProg < 95) {
      watchBtnText.textContent = `Continuar Assistindo (${storedProg}%)`;
    } else {
      watchBtnText.textContent = "Assistir";
    }
  }

  // Synopsis in fluent Portuguese (curatorNote takes priority over English plot)
  const modalSynopsis = document.getElementById("modalSynopsis");
  if (modalSynopsis) {
    modalSynopsis.textContent = movie.curatorNote || movie.omdb?.plot || "Sem sinopse disponível.";
  }

  // Curated Justification Box
  const curatorText = movie.curatorReason;
  const curatorBox = document.getElementById("modalCuratorBox");
  const curatorTextEl = document.getElementById("modalCuratorText");
  if (curatorBox && curatorTextEl) {
    if (curatorText && curatorText !== movie.curatorNote) {
      curatorBox.style.display = "block";
      curatorTextEl.textContent = curatorText;
    } else {
      curatorBox.style.display = "none";
    }
  }

  // Metadata Details (Cast, Director, Portuguese Genres, Ratings)
  const directorEl = document.getElementById("modalDirector");
  if (directorEl) directorEl.textContent = movie.omdb?.director || "Desconhecido";

  const castEl = document.getElementById("modalCast");
  if (castEl) castEl.textContent = movie.omdb?.actors || "Desconhecido";

  const genreEl = document.getElementById("modalGenre");
  if (genreEl) genreEl.textContent = formatGenresPt(movie.omdb?.genre);

  const dubEl = document.getElementById("modalDubStudio");
  if (dubEl) {
    dubEl.textContent = movie.dubbed ? (movie.dubbingStudio ? `Dublagem Oficial (${movie.dubbingStudio})` : "Dublagem em Português") : "Legendado";
  }

  const imdbEl = document.getElementById("modalImdb");
  if (imdbEl) {
    const imdb = movie.omdb?.imdbRating ? `IMDb ${movie.omdb.imdbRating}` : "";
    const rt = movie.omdb?.rottenTomatoes ? ` | RT ${movie.omdb.rottenTomatoes}` : "";
    imdbEl.textContent = `${imdb}${rt}` || "Aclamado";
  }

  const affEl = document.getElementById("modalAffinityScore");
  if (affEl) affEl.textContent = `${affScore}% compatível`;

  // Letterboxd Button
  const lbBtn = document.getElementById("modalLetterboxdBtn");
  if (lbBtn) {
    lbBtn.onclick = () => {
      if (movie.letterboxdUrl) window.open(movie.letterboxdUrl, "_blank");
    };
  }

  // Primary Play Button (Cinema Player)
  const watchBtn = document.getElementById("modalWatchBtn");
  if (watchBtn) {
    watchBtn.onclick = () => {
      modal.classList.remove("open");
      openNetflixPlayer(movie);
    };
  }

  // Modal Trailer Sound Button Toggle
  const soundBtn = document.getElementById("modalSoundBtn");
  const iconSoundMuted = document.getElementById("modalIconSoundMuted");
  const iconSoundOn = document.getElementById("modalIconSoundOn");
  if (soundBtn) {
    soundBtn.onclick = (e) => {
      e.stopPropagation();
      const trailerVideo = document.getElementById("modalTrailerVideo");
      if (trailerVideo) {
        trailerVideo.muted = !trailerVideo.muted;
        if (iconSoundMuted) iconSoundMuted.style.display = trailerVideo.muted ? "inline" : "none";
        if (iconSoundOn) iconSoundOn.style.display = trailerVideo.muted ? "none" : "inline";
        soundBtn.title = trailerVideo.muted ? "Ativar Som do Trailer" : "Desativar Som";
      }
    };
  }

  // Comments / Reviews
  const commentInput = document.getElementById("modalCommentInput");
  const deleteCommentBtn = document.getElementById("modalBtnDeleteComment");
  const existingComment = userComments[movie.title];
  if (commentInput) {
    commentInput.value = existingComment ? existingComment.text : "";
  }
  if (deleteCommentBtn) {
    deleteCommentBtn.style.display = existingComment ? "inline-block" : "none";
  }

  stopHeroTrailer();
  startModalTrailer(movie);
  syncModalActionButtons();
  renderModalSimilarMovies(movie);
  modal.classList.add("open");
}

function renderModalSimilarMovies(movie) {
  const container = document.getElementById("modalSimilarGrid");
  if (!container) return;
  container.innerHTML = "";

  const similar = getSimilarMovies(movie, 6);
  if (!similar || similar.length === 0) {
    const parent = container.closest(".modal-similar-container");
    if (parent) parent.style.display = "none";
    return;
  }
  const parent = container.closest(".modal-similar-container");
  if (parent) parent.style.display = "block";

  similar.forEach(sim => {
    const card = document.createElement("div");
    card.className = "modal-similar-card";
    const poster = sim.omdb?.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba";
    const profile = buildUserProfile();
    const matchScore = calculateMovieAffinity(sim, profile);
    const year = sim.year || (sim.omdb?.year) || "";
    let ageRating = sim.omdb?.rated || "14";
    if (ageRating === "R") ageRating = "16";
    if (ageRating === "PG-13") ageRating = "14";
    if (ageRating === "G") ageRating = "L";
    const shortPlot = sim.curatorNote || sim.omdb?.plot || "";

    card.innerHTML = `
      <div class="similar-card-poster">
        <img src="${poster}" alt="${sim.ptTitle || sim.title}" loading="lazy">
        <span class="similar-card-match">${matchScore}% Relevante</span>
        <button class="similar-card-play" title="Assistir">
          <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
      </div>
      <div class="similar-card-info">
        <div class="similar-card-meta">
          <span class="similar-card-year">${year}</span>
          <span class="spec-age-badge">${ageRating}</span>
          <span class="spec-audio-badge">PT-BR</span>
        </div>
        <h4 class="similar-card-title">${sim.ptTitle || sim.title}</h4>
        <p class="similar-card-plot">${shortPlot.slice(0, 115)}...</p>
      </div>
    `;

    card.tabIndex = 0;
    card.onclick = () => {
      openDetailModal(sim);
      const cardEl = document.querySelector(".modal-card");
      if (cardEl) cardEl.scrollTop = 0;
    };
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23) {
        e.preventDefault();
        openDetailModal(sim);
        const cardEl = document.querySelector(".modal-card");
        if (cardEl) cardEl.scrollTop = 0;
      }
    });
    card.addEventListener("focus", () => card.classList.add("tv-focused"));
    card.addEventListener("blur", () => card.classList.remove("tv-focused"));

    container.appendChild(card);
  });
}

function syncModalActionButtons() {
  if (!activeModalMovie) return;
  const m = activeModalMovie;

  const btnSave = document.getElementById("modalBtnSave");
  const isSaved = userSavedMovies.has(m.title);
  if (btnSave) {
    btnSave.classList.toggle("active", isSaved);
    btnSave.title = isSaved ? "Remover da Minha Lista" : "Salvar na Minha Lista";
  }

  const btnWatch = document.getElementById("modalBtnWatch");
  const btnWatchText = document.getElementById("modalBtnWatchText");
  const isWatched = userWatched.has(m.title);
  if (btnWatch) btnWatch.classList.toggle("active", isWatched);
  if (btnWatchText) btnWatchText.textContent = isWatched ? "Visto" : "Já Visto";

  const comm = userComments[m.title];
  const btnLike = document.getElementById("modalBtnLike");
  const btnDislike = document.getElementById("modalBtnDislike");
  if (btnLike) {
    const isLike = comm && comm.sentiment === "positive";
    btnLike.classList.toggle("active", isLike);
    btnLike.classList.toggle("like", isLike);
  }
  if (btnDislike) {
    const isDislike = comm && comm.sentiment === "negative";
    btnDislike.classList.toggle("active", isDislike);
    btnDislike.classList.toggle("dislike", isDislike);
  }

  const btnUndubbed = document.getElementById("modalBtnUndubbed");
  if (btnUndubbed) btnUndubbed.classList.toggle("active", userUndubbed.has(m.title));

  const btnIgnore = document.getElementById("modalBtnIgnore");
  if (btnIgnore) btnIgnore.classList.toggle("active", userIgnored.has(m.title));
}

// ==========================================================================
// User Actions: Watch, Save, Ignore, Undubbed, Comments
// ==========================================================================
function toggleSaveMovie(movie) {
  if (!movie) return;
  if (userSavedMovies.has(movie.title)) {
    userSavedMovies.delete(movie.title);
    showToast(`Removido da Minha Lista: ${movie.ptTitle || movie.title}`);
  } else {
    userSavedMovies.set(movie.title, {
      title: movie.title,
      ptTitle: movie.ptTitle,
      year: movie.year,
      category: movie.category,
      parentCategory: movie.parentCategory || "art",
      omdb: movie.omdb,
      dubbed: movie.dubbed,
      dubbingStudio: movie.dubbingStudio,
      letterboxdUrl: movie.letterboxdUrl,
      savedAt: new Date().toISOString()
    });
    showToast(`Salvo na Minha Lista: ${movie.ptTitle || movie.title}`);
  }
  syncModalActionButtons();
  if (activeHeroMovie && activeHeroMovie.title === movie.title) renderHero(movie);
  saveUserStateToDisk();
  renderContentRows();
}

function toggleWatchedMovie(movie) {
  if (!movie) return;
  if (userWatched.has(movie.title)) {
    userWatched.delete(movie.title);
    showToast(`Desmarcado como visto: ${movie.ptTitle || movie.title}`);
  } else {
    userWatched.add(movie.title);
    showToast(`Marcado como visto: ${movie.ptTitle || movie.title}`);
  }
  syncModalActionButtons();
  if (activeHeroMovie && activeHeroMovie.title === movie.title) renderHero(movie);
  saveUserStateToDisk();
  renderContentRows();
}

function toggleIgnoreMovie(movie) {
  if (!movie) return;
  if (userIgnored.has(movie.title)) {
    userIgnored.delete(movie.title);
    showToast(`Reativado nas recomendações: ${movie.ptTitle || movie.title}`);
  } else {
    userIgnored.add(movie.title);
    showToast(`Ignorado das recomendações: ${movie.ptTitle || movie.title}`);
  }
  syncModalActionButtons();
  saveUserStateToDisk();
  renderContentRows();
}

function toggleUndubbedMovie(movie) {
  if (!movie) return;
  if (userUndubbed.has(movie.title)) {
    userUndubbed.delete(movie.title);
    showToast(`Removido da lista sem dublagem: ${movie.ptTitle || movie.title}`);
  } else {
    userUndubbed.add(movie.title);
    showToast(`Reportado para verificação de dublagem: ${movie.ptTitle || movie.title}`);
  }
  syncModalActionButtons();
  saveUserStateToDisk();
}

function saveCommentForMovie(movie, text, sentiment) {
  if (!movie) return;
  if (!text.trim()) {
    delete userComments[movie.title];
    showToast("Comentário removido");
  } else {
    userComments[movie.title] = {
      text: text.trim(),
      sentiment: sentiment || "positive",
      updatedAt: new Date().toISOString()
    };
    showToast("Avaliação e comentário salvos");
  }
  syncModalActionButtons();
  saveUserStateToDisk();
}

// ==========================================================================
// UI Event Listeners
// ==========================================================================
function setupUIEventListeners() {
  // Modal Close
  const closeDetailModal = () => {
    document.getElementById("detailModal").classList.remove("open");
    stopModalTrailer();
    if (activeHeroMovie) startHeroTrailer(activeHeroMovie);
  };

  const closeBtn = document.getElementById("modalCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = closeDetailModal;
  }

  const detailModal = document.getElementById("detailModal");
  if (detailModal) {
    detailModal.onclick = (e) => {
      if (e.target.id === "detailModal") closeDetailModal();
    };
  }

  // Hero Trailer Sound Toggle Button
  const heroSoundBtn = document.getElementById("heroTrailerSoundBtn");
  if (heroSoundBtn) {
    heroSoundBtn.onclick = toggleHeroTrailerSound;
  }

  // Hero Section Buttons
  const heroPlayBtn = document.getElementById("heroPlayBtn");
  if (heroPlayBtn) {
    heroPlayBtn.onclick = () => {
      if (activeHeroMovie) openNetflixPlayer(activeHeroMovie);
    };
  }

  const heroInfoBtn = document.getElementById("heroInfoBtn");
  if (heroInfoBtn) {
    heroInfoBtn.onclick = () => {
      if (activeHeroMovie) openDetailModal(activeHeroMovie);
    };
  }

  const heroSaveBtn = document.getElementById("heroSaveBtn");
  if (heroSaveBtn) {
    heroSaveBtn.onclick = () => {
      if (activeHeroMovie) toggleSaveMovie(activeHeroMovie);
    };
  }

  const heroWatchedBtn = document.getElementById("heroWatchedBtn");
  if (heroWatchedBtn) {
    heroWatchedBtn.onclick = () => {
      if (activeHeroMovie) toggleWatchedMovie(activeHeroMovie);
    };
  }

  // Modal Action Buttons
  const modalBtnSave = document.getElementById("modalBtnSave");
  if (modalBtnSave) {
    modalBtnSave.onclick = () => {
      if (activeModalMovie) toggleSaveMovie(activeModalMovie);
    };
  }

  const modalBtnWatch = document.getElementById("modalBtnWatch");
  if (modalBtnWatch) {
    modalBtnWatch.onclick = () => {
      if (activeModalMovie) toggleWatchedMovie(activeModalMovie);
    };
  }

  const modalBtnLike = document.getElementById("modalBtnLike");
  if (modalBtnLike) {
    modalBtnLike.onclick = () => {
      if (!activeModalMovie) return;
      const text = document.getElementById("modalCommentInput")?.value || "";
      saveCommentForMovie(activeModalMovie, text, "positive");
    };
  }

  const modalBtnDislike = document.getElementById("modalBtnDislike");
  if (modalBtnDislike) {
    modalBtnDislike.onclick = () => {
      if (!activeModalMovie) return;
      const text = document.getElementById("modalCommentInput")?.value || "";
      saveCommentForMovie(activeModalMovie, text, "negative");
    };
  }

  const modalBtnUndubbed = document.getElementById("modalBtnUndubbed");
  if (modalBtnUndubbed) {
    modalBtnUndubbed.onclick = () => {
      if (activeModalMovie) toggleUndubbedMovie(activeModalMovie);
    };
  }

  const modalBtnIgnore = document.getElementById("modalBtnIgnore");
  if (modalBtnIgnore) {
    modalBtnIgnore.onclick = () => {
      if (activeModalMovie) toggleIgnoreMovie(activeModalMovie);
    };
  }

  const modalBtnSaveComment = document.getElementById("modalBtnSaveComment");
  if (modalBtnSaveComment) {
    modalBtnSaveComment.onclick = () => {
      if (!activeModalMovie) return;
      const text = document.getElementById("modalCommentInput")?.value || "";
      saveCommentForMovie(activeModalMovie, text, "positive");
    };
  }

  const modalBtnDeleteComment = document.getElementById("modalBtnDeleteComment");
  if (modalBtnDeleteComment) {
    modalBtnDeleteComment.onclick = () => {
      if (!activeModalMovie) return;
      saveCommentForMovie(activeModalMovie, "", "neutral");
      document.getElementById("modalCommentInput").value = "";
      modalBtnDeleteComment.style.display = "none";
    };
  }

  // Search Input
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.trim();
      renderContentRows();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderContentRows();
    });
  }

  // Navigation Rail Items - Exact categories from screenshot
  function setActiveNavItem(item) {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    if (item) item.classList.add("active");
  }

  const navSearch = document.getElementById("navSearch");
  if (navSearch) {
    navSearch.onclick = () => {
      document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
      navSearch.classList.add("active");
      searchInput?.focus();
      window.scrollTo({ top: 380, behavior: "smooth" });
    };
  }

  const navHome = document.getElementById("navHome");
  if (navHome) navHome.onclick = () => setNavHub("home");

  const navTerror = document.getElementById("navTerror");
  if (navTerror) navTerror.onclick = () => setNavHub("terror");

  const navBesteirol = document.getElementById("navBesteirol");
  if (navBesteirol) navBesteirol.onclick = () => setNavHub("besteirol");

  const navArt = document.getElementById("navArt");
  if (navArt) navArt.onclick = () => setNavHub("art");

  const navMovies = document.getElementById("navMovies");
  if (navMovies) navMovies.onclick = () => setNavHub("movies");

  const btnOpenSavedMovies = document.getElementById("btnOpenSavedMovies");
  if (btnOpenSavedMovies) {
    btnOpenSavedMovies.onclick = () => {
      if (userSavedMovies.size === 0) {
        showToast("Minha Lista está vazia. Salve filmes usando o botão (+) para visualizá-los aqui.");
      } else {
        setNavHub("saved");
      }
    };
  }

  // Nested subcategory click listeners inside sidebar rail
  document.querySelectorAll(".nav-sub-item").forEach(subItem => {
    subItem.onclick = (e) => {
      e.stopPropagation();
      const catId = subItem.dataset.cat;
      const cat = categories.find(c => c.id === catId);
      if (!cat) return;

      // Switch to parent hub if not already active
      if (currentNavHub !== cat.parentCategory) {
        setNavHub(cat.parentCategory, false);
      }

      // Mark this sub-item active
      document.querySelectorAll(".nav-sub-item").forEach(s => s.classList.remove("active"));
      subItem.classList.add("active");

      // Highlight category pill
      currentSelectedCat = catId;
      document.querySelectorAll(".cat-pill").forEach(p => {
        p.classList.toggle("active", p.dataset.category === catId);
      });

      // Smooth scroll to the specific category shelf
      const shelf = document.getElementById("shelf-" + catId);
      if (shelf) shelf.scrollIntoView({ behavior: "smooth", block: "center" });
    };
  });

  // Modals Buttons
  const btnOpenIptvModal = document.getElementById("btnOpenIptvModal");
  if (btnOpenIptvModal) btnOpenIptvModal.onclick = openIptvModal;

  const iptvModalClose = document.getElementById("iptvModalClose");
  if (iptvModalClose) {
    iptvModalClose.onclick = () => document.getElementById("iptvModal").classList.remove("open");
  }

  const iptvPlayerModalClose = document.getElementById("iptvPlayerModalClose");
  if (iptvPlayerModalClose) {
    iptvPlayerModalClose.onclick = closeNetflixPlayer;
  }

  const btnOpenEnginePanel = document.getElementById("btnOpenEnginePanel");
  if (btnOpenEnginePanel) btnOpenEnginePanel.onclick = openEngineModal;

  const engineModalClose = document.getElementById("engineModalClose");
  if (engineModalClose) {
    engineModalClose.onclick = () => document.getElementById("engineModal").classList.remove("open");
  }

  const engineModalCloseBtn = document.getElementById("engineModalCloseBtn");
  if (engineModalCloseBtn) {
    engineModalCloseBtn.onclick = () => document.getElementById("engineModal").classList.remove("open");
  }

  const btnResetUserData = document.getElementById("btnResetUserData");
  if (btnResetUserData) {
    btnResetUserData.onclick = () => {
      if (confirm("Deseja realmente resetar o histórico de filmes vistos e notas?")) {
        userWatched.clear();
        userIgnored.clear();
        userUndubbed.clear();
        for (let k in userComments) delete userComments[k];
        saveUserStateToDisk();
        renderContentRows();
        showToast("Histórico local resetado com sucesso");
        document.getElementById("engineModal").classList.remove("open");
      }
    };
  }

  const btnCopyUndubbedForAi = document.getElementById("btnCopyUndubbedForAi");
  if (btnCopyUndubbedForAi) {
    btnCopyUndubbedForAi.onclick = () => {
      const list = Array.from(userUndubbed).join(", ");
      navigator.clipboard?.writeText(list);
      showToast("Lista copiada para a área de transferência");
    };
  }

  // Google Login & Profile Modals
  const btnGoogleLogin = document.getElementById("btnGoogleLogin");
  if (btnGoogleLogin) {
    btnGoogleLogin.onclick = () => {
      document.getElementById("googleAuthModal").classList.add("open");
    };
  }

  const userProfilePill = document.getElementById("userProfilePill");
  if (userProfilePill) {
    userProfilePill.onclick = openUserProfileModal;
  }

  const googleAuthModalClose = document.getElementById("googleAuthModalClose");
  if (googleAuthModalClose) {
    googleAuthModalClose.onclick = () => document.getElementById("googleAuthModal").classList.remove("open");
  }

  const userProfileModalClose = document.getElementById("userProfileModalClose");
  if (userProfileModalClose) {
    userProfileModalClose.onclick = () => document.getElementById("userProfileModal").classList.remove("open");
  }

  const btnQuickGoogleLogin = document.getElementById("btnQuickGoogleLogin");
  if (btnQuickGoogleLogin) {
    btnQuickGoogleLogin.onclick = () => {
      const val = document.getElementById("googleCustomInput")?.value || "houseplayersoff@gmail.com";
      currentGoogleUser = {
        name: val.split("@")[0] || "Usuário",
        email: val,
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
      };
      saveUserStateToDisk();
      document.getElementById("googleAuthModal").classList.remove("open");
      showToast(`Conectado como ${currentGoogleUser.name}`);
    };
  }

  const btnGoogleLogout = document.getElementById("btnGoogleLogout");
  if (btnGoogleLogout) {
    btnGoogleLogout.onclick = () => {
      currentGoogleUser = null;
      localStorage.removeItem("lb_curator_google_user");
      saveUserStateToDisk();
      document.getElementById("userProfileModal").classList.remove("open");
      showToast("Conta Google desconectada");
    };
  }

  // IPTV Manager Actions
  setupIptvManagerEvents();

  // Netflix Cinema Player Engine Setup
  setupNetflixPlayerEngine();
}

// ==========================================================================
// TV Remote / Keyboard D-Pad Spatial Navigation Engine (Android Mi TV Stick)
// ==========================================================================
let lastFocusedCard = null;

function getHorizontallyClosestCard(shelfEl, referenceEl) {
  if (!shelfEl || !referenceEl) return null;
  const cards = Array.from(shelfEl.querySelectorAll(".poster-card, .top10-item"));
  if (!cards.length) return null;

  const refRect = referenceEl.getBoundingClientRect();
  const refCenter = refRect.left + refRect.width / 2;

  let bestCard = cards[0];
  let bestDist = Infinity;

  for (const c of cards) {
    const r = c.getBoundingClientRect();
    const cCenter = r.left + r.width / 2;
    const dist = Math.abs(cCenter - refCenter);
    if (dist < bestDist) {
      bestDist = dist;
      bestCard = c;
    }
  }
  return bestCard;
}

function getNextVisibleShelf(shelfEl) {
  let next = shelfEl.nextElementSibling;
  while (next) {
    if (next.classList.contains("shelf-section") && next.offsetParent !== null) {
      const hasCards = next.querySelector(".poster-card, .top10-item");
      if (hasCards) return next;
    }
    next = next.nextElementSibling;
  }
  return null;
}

function getPrevVisibleShelf(shelfEl) {
  let prev = shelfEl.previousElementSibling;
  while (prev) {
    if (prev.classList.contains("shelf-section") && prev.offsetParent !== null) {
      const hasCards = prev.querySelector(".poster-card, .top10-item");
      if (hasCards) return prev;
    }
    prev = prev.previousElementSibling;
  }
  return null;
}

function getCurrentlyVisibleCard() {
  const cards = Array.from(document.querySelectorAll(".poster-card, .top10-item"));
  const viewCenterY = window.innerHeight / 2;
  let bestCard = cards[0];
  let bestDist = Infinity;

  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) {
      return c;
    }
    const dist = Math.abs(r.top - viewCenterY);
    if (dist < bestDist) {
      bestDist = dist;
      bestCard = c;
    }
  }
  return bestCard || null;
}

function setupTVRemoteListeners() {
  // Global focus listener to track last active card and apply TV focus styling
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (el && (el.classList.contains("poster-card") || el.classList.contains("top10-item"))) {
      lastFocusedCard = el;
    }
  });

  window.addEventListener("keydown", (e) => {
    const key = e.key;
    const code = e.keyCode;

    // Normalizing Android TV D-Pad and Media Remote keys
    const isUp = key === "ArrowUp" || code === 19;
    const isDown = key === "ArrowDown" || code === 20;
    const isLeft = key === "ArrowLeft" || code === 21;
    const isRight = key === "ArrowRight" || code === 22;
    const isSelect = key === "Enter" || code === 13 || code === 23;
    const isBack = key === "Escape" || key === "Backspace" || key === "GoBack" || code === 4 || code === 27;
    const isPlayPause = key === "MediaPlayPause" || key === " " || key === "k" || code === 85 || code === 179;
    const isPlay = key === "MediaPlay" || code === 126;
    const isPause = key === "MediaPause" || code === 127;
    const isRewind = key === "MediaRewind" || code === 89;
    const isFastForward = key === "MediaFastForward" || code === 90;

    // -------------------------------------------------------------
    // CONTEXT 1: NETFLIX CINEMA VIDEO PLAYER OVERLAY IS OPEN
    // -------------------------------------------------------------
    const playerOverlay = document.getElementById("netflixPlayerOverlay");
    const isPlayerOpen = playerOverlay && playerOverlay.style.display !== "none";

    if (isPlayerOpen) {
      if (isBack) {
        e.preventDefault();
        closeNetflixPlayer();
        if (lastFocusedCard && document.body.contains(lastFocusedCard)) {
          lastFocusedCard.focus();
        }
        return;
      }
      if (isPlayPause || isSelect) {
        e.preventDefault();
        toggleNetflixPlayPause();
        return;
      }
      if (isLeft || isRewind) {
        e.preventDefault();
        seekNetflixRelative(-10);
        return;
      }
      if (isRight || isFastForward) {
        e.preventDefault();
        seekNetflixRelative(10);
        return;
      }
      if (isUp) {
        e.preventDefault();
        const v = document.getElementById("netflixVideoPlayer");
        if (v) setNetflixVolume(Math.min(1, v.volume + 0.1));
        return;
      }
      if (isDown) {
        e.preventDefault();
        const v = document.getElementById("netflixVideoPlayer");
        if (v) setNetflixVolume(Math.max(0, v.volume - 0.1));
        return;
      }
      if (key === "f" || key === "F") {
        e.preventDefault();
        toggleNetflixFullscreen();
        return;
      }
      if (key === "m" || key === "M") {
        e.preventDefault();
        toggleNetflixMute();
        return;
      }
      return;
    }

    // -------------------------------------------------------------
    // CONTEXT 2: DETAIL MODAL IS OPEN
    // -------------------------------------------------------------
    const detailModal = document.getElementById("detailModal");
    const isDetailModalOpen = detailModal && detailModal.classList.contains("open");

    if (isDetailModalOpen) {
      if (isBack) {
        e.preventDefault();
        detailModal.classList.remove("open");
        stopModalTrailer();
        if (activeHeroMovie) startHeroTrailer(activeHeroMovie);
        if (lastFocusedCard && document.body.contains(lastFocusedCard)) {
          lastFocusedCard.focus();
        } else {
          const first = document.querySelector(".poster-card, .top10-item");
          if (first) first.focus();
        }
        return;
      }

      const activeEl = document.activeElement;
      const modalHeroButtons = [
        document.getElementById("modalWatchBtn"),
        document.getElementById("modalBtnSave"),
        document.getElementById("modalBtnLike"),
        document.getElementById("modalBtnDislike"),
        document.getElementById("modalSoundBtn"),
        document.getElementById("modalCloseBtn")
      ].filter(Boolean);

      const modalSpecButtons = [
        document.getElementById("modalBtnWatch"),
        document.getElementById("modalBtnUndubbed"),
        document.getElementById("modalBtnIgnore"),
        document.getElementById("modalLetterboxdBtn")
      ].filter(Boolean);

      const modalReviewButtons = [
        document.getElementById("modalCommentInput"),
        document.getElementById("modalBtnSaveComment")
      ].filter(Boolean);

      const similarCards = Array.from(document.querySelectorAll("#modalSimilarGrid .modal-similar-card"));

      // Check which group currently has focus
      const heroIdx = modalHeroButtons.indexOf(activeEl);
      const specIdx = modalSpecButtons.indexOf(activeEl);
      const reviewIdx = modalReviewButtons.indexOf(activeEl);
      const simIdx = similarCards.indexOf(activeEl);

      if (isRight) {
        if (heroIdx !== -1 && heroIdx < modalHeroButtons.length - 1) {
          e.preventDefault();
          modalHeroButtons[heroIdx + 1].focus();
        } else if (specIdx !== -1 && specIdx < modalSpecButtons.length - 1) {
          e.preventDefault();
          modalSpecButtons[specIdx + 1].focus();
        } else if (simIdx !== -1 && simIdx < similarCards.length - 1) {
          e.preventDefault();
          similarCards[simIdx + 1].focus();
          similarCards[simIdx + 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
        return;
      }

      if (isLeft) {
        if (heroIdx > 0) {
          e.preventDefault();
          modalHeroButtons[heroIdx - 1].focus();
        } else if (specIdx > 0) {
          e.preventDefault();
          modalSpecButtons[specIdx - 1].focus();
        } else if (simIdx > 0) {
          e.preventDefault();
          similarCards[simIdx - 1].focus();
          similarCards[simIdx - 1].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
        return;
      }

      if (isDown) {
        e.preventDefault();
        if (heroIdx !== -1) {
          if (modalSpecButtons.length) modalSpecButtons[0].focus();
        } else if (specIdx !== -1) {
          if (modalReviewButtons.length && modalReviewButtons[0]) {
            modalReviewButtons[0].focus();
          } else if (similarCards.length) {
            similarCards[0].focus();
            similarCards[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          }
        } else if (reviewIdx === 0 && modalReviewButtons[1]) {
          modalReviewButtons[1].focus();
        } else if (reviewIdx !== -1) {
          if (similarCards.length) {
            similarCards[0].focus();
            similarCards[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          }
        }
        return;
      }

      if (isUp) {
        e.preventDefault();
        if (simIdx !== -1) {
          if (modalReviewButtons.length) {
            modalReviewButtons[modalReviewButtons.length - 1].focus();
          } else if (modalSpecButtons.length) {
            modalSpecButtons[0].focus();
          }
        } else if (reviewIdx === 1) {
          modalReviewButtons[0].focus();
        } else if (reviewIdx === 0) {
          if (modalSpecButtons.length) modalSpecButtons[0].focus();
        } else if (specIdx !== -1) {
          if (modalHeroButtons.length) modalHeroButtons[0].focus();
        }
        return;
      }

      return;
    }

    // -------------------------------------------------------------
    // CONTEXT 3: SECONDARY MODALS (IPTV / ENGINE / SEARCH)
    // -------------------------------------------------------------
    const openOverlay = document.querySelector(".modal-overlay.open, .search-overlay.open");
    if (openOverlay) {
      if (isBack) {
        e.preventDefault();
        openOverlay.classList.remove("open");
        if (lastFocusedCard && document.body.contains(lastFocusedCard)) {
          lastFocusedCard.focus();
        }
        return;
      }
    }

    // -------------------------------------------------------------
    // CONTEXT 4: MAIN CATALOG & D-PAD SPATIAL BROWSING
    // -------------------------------------------------------------
    const activeEl = document.activeElement;
    const isCard = activeEl && (activeEl.classList.contains("poster-card") || activeEl.classList.contains("top10-item"));
    const isNavRail = activeEl && activeEl.closest("#navRail");
    const isHero = activeEl && activeEl.closest("#heroSection");

    // Media Play Button on Remote directly plays focused card
    if ((isPlay || isPlayPause) && isCard) {
      e.preventDefault();
      const rawTitle = decodeURIComponent(activeEl.dataset.title || "");
      const movie = movies.find(m => m.title === rawTitle) || userSavedMovies.get(rawTitle);
      if (movie) openNetflixPlayer(movie);
      return;
    }

    // If nothing focused, start focus on Hero Play button or first card
    if (!isCard && !isNavRail && !isHero) {
      if (isDown || isRight || isSelect) {
        e.preventDefault();
        const heroPlay = document.getElementById("heroPlayBtn");
        const firstCard = document.querySelector(".poster-card, .top10-item");
        if (window.scrollY < 200 && heroPlay) {
          heroPlay.focus();
        } else if (firstCard) {
          firstCard.focus();
        }
        return;
      }
    }

    // A. NAVIGATION FROM LEFT SIDEBAR (NAV RAIL)
    if (isNavRail) {
      const allNavItems = Array.from(document.querySelectorAll("#navRail .nav-item, #navRail .nav-sub-item"))
        .filter(el => el.offsetParent !== null);
      const curIdx = allNavItems.indexOf(activeEl);

      if (isDown) {
        e.preventDefault();
        if (curIdx !== -1 && curIdx < allNavItems.length - 1) {
          allNavItems[curIdx + 1].focus();
        }
        return;
      }
      if (isUp) {
        e.preventDefault();
        if (curIdx > 0) {
          allNavItems[curIdx - 1].focus();
        }
        return;
      }
      if (isRight) {
        e.preventDefault();
        if (window.scrollY < 280) {
          const playBtn = document.getElementById("heroPlayBtn");
          if (playBtn) playBtn.focus();
        } else {
          const visibleCard = getCurrentlyVisibleCard();
          if (visibleCard) visibleCard.focus();
        }
        return;
      }
      return;
    }

    // B. NAVIGATION FROM HERO SECTION
    if (isHero) {
      const heroButtons = [
        document.getElementById("heroPlayBtn"),
        document.getElementById("heroInfoBtn"),
        document.getElementById("heroSaveBtn"),
        document.getElementById("heroWatchedBtn"),
        document.getElementById("heroTrailerSoundBtn")
      ].filter(Boolean);
      const hIdx = heroButtons.indexOf(activeEl);

      if (isRight) {
        if (hIdx !== -1 && hIdx < heroButtons.length - 1) {
          e.preventDefault();
          heroButtons[hIdx + 1].focus();
        }
        return;
      }
      if (isLeft) {
        if (hIdx > 0) {
          e.preventDefault();
          heroButtons[hIdx - 1].focus();
        } else if (hIdx === 0) {
          e.preventDefault();
          const activeNav = document.querySelector("#navRail .nav-item.active") || document.getElementById("navHome");
          if (activeNav) activeNav.focus();
        }
        return;
      }
      if (isDown) {
        e.preventDefault();
        const firstShelfCard = document.querySelector("#contentRows .shelf-section:first-child .poster-card, #contentRows .shelf-section:first-child .top10-item") ||
                               document.querySelector(".poster-card, .top10-item");
        if (firstShelfCard) {
          firstShelfCard.focus();
          firstShelfCard.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        }
        return;
      }
      if (isUp) {
        e.preventDefault();
        const searchBtn = document.getElementById("navSearch");
        if (searchBtn) searchBtn.focus();
        return;
      }
      return;
    }

    // C. NAVIGATION FROM A POSTER CARD OR TOP 10 ITEM
    if (isCard) {
      lastFocusedCard = activeEl;

      if (isRight) {
        const next = activeEl.nextElementSibling;
        if (next && (next.classList.contains("poster-card") || next.classList.contains("top10-item"))) {
          e.preventDefault();
          next.focus();
          next.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        }
        return;
      }

      if (isLeft) {
        const prev = activeEl.previousElementSibling;
        if (prev && (prev.classList.contains("poster-card") || prev.classList.contains("top10-item"))) {
          e.preventDefault();
          prev.focus();
          prev.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        } else {
          // At the beginning of the carousel: move focus to Left Navigation Rail (Signature Netflix TV interaction)
          e.preventDefault();
          const activeNav = document.querySelector("#navRail .nav-item.active") || document.getElementById("navHome");
          if (activeNav) activeNav.focus();
        }
        return;
      }

      if (isDown) {
        const currentShelf = activeEl.closest(".shelf-section");
        const nextShelf = currentShelf ? getNextVisibleShelf(currentShelf) : null;
        if (nextShelf) {
          e.preventDefault();
          const targetCard = getHorizontallyClosestCard(nextShelf, activeEl);
          if (targetCard) {
            targetCard.focus();
            targetCard.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          }
        }
        return;
      }

      if (isUp) {
        const currentShelf = activeEl.closest(".shelf-section");
        const prevShelf = currentShelf ? getPrevVisibleShelf(currentShelf) : null;
        if (prevShelf) {
          e.preventDefault();
          const targetCard = getHorizontallyClosestCard(prevShelf, activeEl);
          if (targetCard) {
            targetCard.focus();
            targetCard.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          }
        } else {
          // At top shelf: jump up to Hero section
          e.preventDefault();
          const heroPlay = document.getElementById("heroPlayBtn");
          if (heroPlay) {
            window.scrollTo({ top: 0, behavior: "smooth" });
            heroPlay.focus();
          }
        }
        return;
      }

      if (isBack) {
        e.preventDefault();
        // Return to top hero
        window.scrollTo({ top: 0, behavior: "smooth" });
        const heroPlay = document.getElementById("heroPlayBtn");
        if (heroPlay) heroPlay.focus();
        return;
      }
    }
  });
}

// ==========================================================================
// IPTV Integration & Video Streaming
// ==========================================================================
function setupIptvManagerEvents() {
  const btnPaste = document.getElementById("btnPasteIptvUrl");
  if (btnPaste) {
    btnPaste.onclick = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          document.getElementById("iptvUrlInput").value = text;
          showToast("Link colado da área de transferência");
        }
      } catch (e) {
        showToast("Não foi possível ler a área de transferência");
      }
    };
  }

  const btnContra = document.getElementById("btnLoadContraFileIptv");
  if (btnContra) {
    btnContra.onclick = () => {
      document.getElementById("iptvUrlInput").value = "http://contrafilenabrasa.net/get.php?username=64606950&password=08092023&type=m3u_plus";
      document.getElementById("iptvNameInput").value = "Contra Filé na Brasa";
      showToast("Link contrafilenabrasa.net preenchido");
    };
  }

  const btnSample = document.getElementById("btnLoadSampleIptv");
  if (btnSample) {
    btnSample.onclick = () => {
      document.getElementById("iptvUrlInput").value = "https://iptv-org.github.io/iptv/countries/br.m3u";
      document.getElementById("iptvNameInput").value = "IPTV Brasil Público";
      showToast("Lista pública Brasil preenchida");
    };
  }

  const btnSaveIptv = document.getElementById("btnSaveIptvUrl");
  if (btnSaveIptv) {
    btnSaveIptv.onclick = () => {
      const url = document.getElementById("iptvUrlInput")?.value.trim() || "";
      const name = document.getElementById("iptvNameInput")?.value.trim() || "";
      if (!url) {
        showToast("Insira uma URL de lista IPTV válida");
        return;
      }
      userIptvUrl = url;
      userIptvName = name || "Lista IPTV";
      saveUserStateToDisk();
      document.getElementById("iptvModal").classList.remove("open");
      showToast("Link IPTV salvo e sincronizado!");
      parseIptvChannels(userIptvUrl);
    };
  }

  const btnTest = document.getElementById("btnTestIptvList");
  if (btnTest) {
    btnTest.onclick = async () => {
      const url = document.getElementById("iptvUrlInput")?.value.trim();
      if (!url) return showToast("Insira uma URL antes de testar");
      showToast("Testando conexão com a lista IPTV...");
      await parseIptvChannels(url);
    };
  }
}

async function initIptvAutoLoad() {
  if (userIptvUrl) {
    parseIptvChannels(userIptvUrl);
  }
}

async function parseIptvChannels(url) {
  const statusBox = document.getElementById("iptvStatusBox");
  const statusMsg = document.getElementById("iptvStatusMessage");
  try {
    const apiBase = window.location.origin.includes(":8085") ? "" : "http://127.0.0.1:8085";
    const res = await fetch(`${apiBase}/api/proxy-iptv?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const content = await res.text();

    const lines = content.split("\n");
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("#EXTINF:")) {
        const parts = line.split(",");
        const name = parts[parts.length - 1].trim();
        currentChannel = { name, streamUrl: "" };
      } else if (line && !line.startsWith("#") && currentChannel) {
        currentChannel.streamUrl = line;
        channels.push(currentChannel);
        currentChannel = null;
      }
    }

    iptvParsedChannels = channels;
    if (statusBox) statusBox.style.display = "block";
    if (statusMsg) {
      statusMsg.textContent = `${channels.length} canais/filmes carregados com sucesso!`;
    }
  } catch (e) {
    if (statusBox) statusBox.style.display = "block";
    if (statusMsg) statusMsg.textContent = "Erro ao acessar a lista: " + e.message;
  }
}

function openIptvModal() {
  const modal = document.getElementById("iptvModal");
  if (!modal) return;
  const urlInput = document.getElementById("iptvUrlInput");
  const nameInput = document.getElementById("iptvNameInput");
  if (urlInput) urlInput.value = userIptvUrl || "";
  if (nameInput) nameInput.value = userIptvName || "";
  modal.classList.add("open");
}

// ==========================================================================
// NETFLIX CINEMA VIDEO PLAYER ENGINE (IPTV & STREAMING)
// ==========================================================================
let netflixCurrentMovie = null;
let netflixHlsInstance = null;
let netflixControlsTimer = null;
let netflixIsDraggingScrubber = false;
let netflixCustomOverrides = {};

// Web Audio API DSP & Video Calibration Engine
let netflixAudioCtx = null;
let netflixAudioSource = null;
let netflixCompressorNode = null;
let netflixDialogueFilter = null;
let netflixGainNode = null;

let netflixDspSettings = {
  dialogueBoost: true,
  compressor: true,
  volumeBoost: false
};

let netflixVideoSettings = {
  cinemaGrade: true,
  ditherGrain: true,
  aspectFill: false
};

try {
  const savedDsp = localStorage.getItem("curator_dsp_settings");
  if (savedDsp) netflixDspSettings = { ...netflixDspSettings, ...JSON.parse(savedDsp) };
  const savedVid = localStorage.getItem("curator_video_settings");
  if (savedVid) netflixVideoSettings = { ...netflixVideoSettings, ...JSON.parse(savedVid) };
} catch (e) {}

function initNetflixAudioDSP() {
  const video = document.getElementById("netflixVideoPlayer");
  if (!video) return;
  try {
    if (!netflixAudioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      netflixAudioCtx = new AudioCtxClass();
    }
    if (netflixAudioCtx.state === "suspended") {
      netflixAudioCtx.resume().catch(() => {});
    }
    if (!netflixAudioSource) {
      netflixAudioSource = netflixAudioCtx.createMediaElementSource(video);

      // 1. Dialogue clarity filter (peaking equalizer around 2.4kHz)
      netflixDialogueFilter = netflixAudioCtx.createBiquadFilter();
      netflixDialogueFilter.type = "peaking";
      netflixDialogueFilter.frequency.value = 2400;
      netflixDialogueFilter.Q.value = 1.2;
      netflixDialogueFilter.gain.value = netflixDspSettings.dialogueBoost ? 4.8 : 0;

      // 2. Dynamics Compressor (tames explosive spikes & lifts subtle whispers)
      netflixCompressorNode = netflixAudioCtx.createDynamicsCompressor();
      netflixCompressorNode.threshold.value = -24;
      netflixCompressorNode.knee.value = 30;
      netflixCompressorNode.ratio.value = netflixDspSettings.compressor ? 4.0 : 1.0;
      netflixCompressorNode.attack.value = 0.003;
      netflixCompressorNode.release.value = 0.25;

      // 3. Output Gain Booster (+50% headroom for quiet IPTV streams)
      netflixGainNode = netflixAudioCtx.createGain();
      netflixGainNode.gain.value = netflixDspSettings.volumeBoost ? 1.5 : 1.0;

      // Connect pipeline
      netflixAudioSource.connect(netflixDialogueFilter);
      netflixDialogueFilter.connect(netflixCompressorNode);
      netflixCompressorNode.connect(netflixGainNode);
      netflixGainNode.connect(netflixAudioCtx.destination);
    } else {
      updateNetflixAudioDSP();
    }
  } catch (err) {
    console.warn("Web Audio DSP status:", err);
  }
}

function updateNetflixAudioDSP() {
  if (netflixDialogueFilter) {
    netflixDialogueFilter.gain.value = netflixDspSettings.dialogueBoost ? 4.8 : 0;
  }
  if (netflixCompressorNode) {
    netflixCompressorNode.ratio.value = netflixDspSettings.compressor ? 4.0 : 1.0;
  }
  if (netflixGainNode) {
    netflixGainNode.gain.value = netflixDspSettings.volumeBoost ? 1.5 : 1.0;
  }
}

function applyNetflixVideoSettings() {
  const video = document.getElementById("netflixVideoPlayer");
  const dither = document.getElementById("netflixDitherGrain");
  if (video) {
    video.classList.toggle("cinema-enhanced", !!netflixVideoSettings.cinemaGrade);
    video.classList.toggle("aspect-fill", !!netflixVideoSettings.aspectFill);
  }
  if (dither) {
    dither.classList.toggle("dither-off", !netflixVideoSettings.ditherGrain);
  }
}

function openExternalPlayerModal() {
  if (!netflixCurrentMovie) return;
  const modal = document.getElementById("externalPlayerModal");
  const titleEl = document.getElementById("externalPlayerMovieTitle");
  const vlcLink = document.getElementById("extPlayerVlcLink");
  const mpvLink = document.getElementById("extPlayerMpvLink");
  const mpvInput = document.getElementById("extPlayerMpvInput");
  const downloadBtn = document.getElementById("extPlayerDownloadStrm");
  const copyBtn = document.getElementById("extPlayerCopyDirect");
  const copyMpvBtn = document.getElementById("extPlayerBtnCopyMpv");
  const closeBtn = document.getElementById("externalPlayerModalClose");

  if (!modal) return;
  const streamUrl = resolveMovieStreamUrl(netflixCurrentMovie);
  if (titleEl) titleEl.textContent = `${netflixCurrentMovie.title} (${netflixCurrentMovie.year || ''})`;

  if (vlcLink) vlcLink.href = `vlc://${streamUrl}`;
  if (mpvLink) mpvLink.href = `mpv://${streamUrl}`;
  if (mpvInput) mpvInput.value = `mpv --vo=gpu-next --hwdec=auto "${streamUrl}"`;

  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const safeTitle = (netflixCurrentMovie.title || "filme").replace(/[^a-zA-Z0-9_\-]/g, "_");
      const blob = new Blob([streamUrl], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${safeTitle}.strm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Arquivo .STRM gerado! Abra com seu player favorito.");
    };
  }

  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(streamUrl).then(() => showToast("URL de transmissão copiada!"));
    };
  }

  if (copyMpvBtn) {
    copyMpvBtn.onclick = () => {
      if (mpvInput) {
        navigator.clipboard.writeText(mpvInput.value).then(() => showToast("Comando MPV copiado para o terminal!"));
      }
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => modal.classList.remove("open");
  }

  modal.classList.add("open");
}

try {
  const savedOverrides = localStorage.getItem("curator_stream_overrides");
  if (savedOverrides) netflixCustomOverrides = JSON.parse(savedOverrides);
} catch (e) {
  netflixCustomOverrides = {};
}

function formatPlayerTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resolveMovieStreamUrl(movie) {
  if (!movie) return "";
  if (netflixCustomOverrides[movie.title]) {
    return netflixCustomOverrides[movie.title];
  }
  if (movie.streamUrl) {
    return movie.streamUrl;
  }
  if (window.iptvMovieLinks && window.iptvMovieLinks[movie.title]?.streamUrl) {
    return window.iptvMovieLinks[movie.title].streamUrl;
  }
  const cleanTitle = encodeURIComponent(movie.ptTitle || movie.title || "");
  return `http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/search_${cleanTitle}.mp4`;
}

function updateNetflixPauseCard(movie) {
  if (!movie) movie = netflixCurrentMovie;
  if (!movie) return;

  const titleEl = document.getElementById("netflixPauseTitle");
  const subEl = document.getElementById("netflixPauseSubtitle");
  const catEl = document.getElementById("netflixPauseCategory");
  const matchEl = document.getElementById("netflixPauseMatch");
  const ratingEl = document.getElementById("netflixPauseRating");
  const yearEl = document.getElementById("netflixPauseYear");
  const durEl = document.getElementById("netflixPauseDuration");
  const dubEl = document.getElementById("netflixPauseDubbed");
  const qualEl = document.getElementById("netflixPauseQuality");
  const synEl = document.getElementById("netflixPauseSynopsis");

  const directorRow = document.getElementById("netflixPauseDirectorRow");
  const directorEl = document.getElementById("netflixPauseDirector");
  const castRow = document.getElementById("netflixPauseCastRow");
  const castEl = document.getElementById("netflixPauseCast");
  const genresRow = document.getElementById("netflixPauseGenresRow");
  const genresEl = document.getElementById("netflixPauseGenres");

  // Title & Subtitle
  if (titleEl) titleEl.textContent = movie.title || "Filme";
  if (subEl) {
    if (movie.ptTitle && movie.ptTitle !== movie.title) {
      subEl.textContent = movie.ptTitle;
      subEl.style.display = "block";
    } else {
      subEl.textContent = "";
      subEl.style.display = "none";
    }
  }

  // Category
  if (catEl) {
    const catObj = categories.find(c => c.id === movie.category);
    catEl.textContent = catObj ? catObj.name : (movie.category || "Cinema");
  }

  // Match Score
  if (matchEl) {
    let aff = 96;
    try {
      const prof = typeof buildUserProfile === "function" ? buildUserProfile() : null;
      if (typeof calculateMovieAffinity === "function") {
        aff = calculateMovieAffinity(movie, prof);
      }
    } catch (e) {}
    matchEl.textContent = `${aff}% Relevância`;
  }

  // Rating
  if (ratingEl) {
    const imdb = movie.omdb?.imdbRating;
    ratingEl.textContent = imdb ? `★ ${imdb}` : (movie.rating ? `★ ${movie.rating}` : "★ 8.2");
  }

  // Year
  if (yearEl) {
    yearEl.textContent = movie.year || "";
  }

  // Duration
  if (durEl) {
    const video = document.getElementById("netflixVideoPlayer");
    if (movie.omdb?.runtime) {
      durEl.textContent = movie.omdb.runtime;
      durEl.style.display = "inline-block";
    } else if (video && video.duration && !isNaN(video.duration)) {
      durEl.textContent = formatPlayerTime(video.duration);
      durEl.style.display = "inline-block";
    } else {
      durEl.style.display = "none";
    }
  }

  // Dubbed Badge
  if (dubEl) {
    if (movie.dubbed) {
      dubEl.textContent = movie.dubbingStudio ? `DUB (${movie.dubbingStudio})` : "DUBLADO";
      dubEl.style.display = "inline-block";
    } else {
      dubEl.style.display = "none";
    }
  }

  // Quality Badge
  if (qualEl) {
    const qualityBadge = document.getElementById("netflixQualityLabel");
    qualEl.textContent = (qualityBadge && qualityBadge.textContent) ? qualityBadge.textContent.replace("AUTO (", "").replace(")", "") : "1080p FHD";
  }

  // Synopsis (curatorNote > curatorReason > omdb plot > fallback)
  if (synEl) {
    const synText = movie.curatorNote || movie.curatorReason || movie.omdb?.plot || movie.plot || movie.overview || "Sem sinopse disponível.";
    synEl.textContent = synText;
  }

  // Director
  if (directorRow && directorEl) {
    const dir = movie.omdb?.director;
    if (dir && dir !== "N/A" && dir !== "Desconhecido") {
      directorEl.textContent = dir;
      directorRow.style.display = "flex";
    } else {
      directorRow.style.display = "none";
    }
  }

  // Cast
  if (castRow && castEl) {
    const act = movie.omdb?.actors;
    if (act && act !== "N/A" && act !== "Desconhecido") {
      castEl.textContent = act;
      castRow.style.display = "flex";
    } else {
      castRow.style.display = "none";
    }
  }

  // Genres
  if (genresRow && genresEl) {
    const gen = movie.omdb?.genre ? formatGenresPt(movie.omdb.genre) : "";
    if (gen) {
      genresEl.textContent = gen;
      genresRow.style.display = "flex";
    } else {
      genresRow.style.display = "none";
    }
  }
}

function openNetflixPlayer(movie) {
  if (!movie) return;
  stopHeroTrailer();
  stopModalTrailer();
  netflixCurrentMovie = movie;

  const overlay = document.getElementById("netflixPlayerOverlay");
  const video = document.getElementById("netflixVideoPlayer");
  const buffering = document.getElementById("netflixBuffering");
  if (!overlay || !video) return;

  overlay.classList.remove("is-paused");
  updateNetflixPauseCard(movie);

  // Metadata Display
  const titleEl = document.getElementById("netflixPlayerTitle");
  const ptTitleEl = document.getElementById("netflixPlayerPtTitle");
  const yearEl = document.getElementById("netflixPlayerYear");
  const catEl = document.getElementById("netflixPlayerCategory");
  const ratingEl = document.getElementById("netflixPlayerRating");
  const dubEl = document.getElementById("netflixPlayerDubbed");

  if (titleEl) titleEl.textContent = movie.title || "Filme";
  if (ptTitleEl) ptTitleEl.textContent = movie.ptTitle && movie.ptTitle !== movie.title ? movie.ptTitle : "";
  if (yearEl) yearEl.textContent = movie.year || "";
  if (catEl) {
    const catObj = categories.find(c => c.id === movie.category);
    catEl.textContent = catObj ? catObj.name : (movie.category || "");
  }
  if (ratingEl) ratingEl.textContent = movie.omdb?.imdbRating ? `★ ${movie.omdb.imdbRating}` : "";
  if (dubEl) dubEl.style.display = movie.dubbed ? "inline-block" : "none";

  // Stream Resolution
  const streamUrl = resolveMovieStreamUrl(movie);

  // Reset Player State
  if (netflixHlsInstance) {
    netflixHlsInstance.destroy();
    netflixHlsInstance = null;
  }

  video.pause();
  video.currentTime = 0;
  if (buffering) buffering.style.display = "flex";

  // Check HLS vs Direct MP4/TS
  const isHls = streamUrl.toLowerCase().includes(".m3u8") || streamUrl.includes("output=m3u8");

  // Apply active video filters & dithering
  applyNetflixVideoSettings();

  const qualityBadge = document.getElementById("netflixQualityLabel");
  const qualityOptions = document.getElementById("netflixQualityOptions");
  const audioList = document.getElementById("netflixAudioTracksList");

  if (isHls && window.Hls && Hls.isSupported()) {
    netflixHlsInstance = new Hls({
      enableWorker: true,
      lowLatencyMode: false, // VOD Ultra Stability
      backBufferLength: 90,
      maxBufferLength: 120, // 120s buffer
      maxMaxBufferLength: 300, // up to 5 min buffer
      maxBufferSize: 120 * 1024 * 1024, // 120MB buffer
      capLevelToPlayerSize: false, // Never downgrade for small screen size
      startLevel: -1,
      progressive: true,
      testBandwidth: true
    });
    netflixHlsInstance.loadSource(streamUrl);
    netflixHlsInstance.attachMedia(video);

    netflixHlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      buffering.style.display = "none";
      video.play().catch(() => {});
      initNetflixAudioDSP();

      // Populate Dynamic Quality Selector
      if (qualityOptions) {
        let qHtml = `<button data-level="-1" class="active">Auto (Máxima Qualidade)</button>`;
        if (netflixHlsInstance.levels && netflixHlsInstance.levels.length > 0) {
          netflixHlsInstance.levels.forEach((lvl, idx) => {
            const h = lvl.height || 0;
            const kbps = Math.round((lvl.bitrate || 0) / 1000);
            let label = `${h}p`;
            if (h >= 2160) label = "4K Ultra HD (2160p)";
            else if (h >= 1440) label = "2K Quad HD (1440p)";
            else if (h >= 1080) label = "1080p Full HD";
            else if (h >= 720) label = "720p HD";
            else if (h > 0) label = `${h}p SD`;
            else label = `Transmissão ${idx + 1}`;

            qHtml += `<button data-level="${idx}">${label} <span style="font-size:10px; color:#888;">${kbps > 0 ? kbps + 'k' : ''}</span></button>`;
          });
        }
        qualityOptions.innerHTML = qHtml;

        qualityOptions.querySelectorAll("button").forEach(btn => {
          btn.onclick = (ev) => {
            ev.stopPropagation();
            const lvl = parseInt(btn.dataset.level, 10);
            netflixHlsInstance.currentLevel = lvl;
            qualityOptions.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            if (qualityBadge) {
              qualityBadge.textContent = lvl === -1 ? "AUTO" : btn.textContent.split(" ")[0];
            }
            document.getElementById("netflixQualityDropdown")?.classList.remove("open");
            showToast(`Qualidade: ${btn.textContent.trim()}`);
            resetNetflixControlsTimer();
          };
        });
      }

      // Populate Audio Tracks if available
      if (audioList && netflixHlsInstance.audioTracks && netflixHlsInstance.audioTracks.length > 0) {
        let aHtml = "";
        netflixHlsInstance.audioTracks.forEach((t, i) => {
          const isCur = netflixHlsInstance.audioTrack === i;
          const trackName = t.name || (t.lang ? t.lang.toUpperCase() : `Faixa de Áudio ${i + 1}`);
          aHtml += `<button class="audio-sub-option ${isCur ? 'active' : ''}" data-track="${i}">${escapeHtml(trackName)}</button>`;
        });
        audioList.innerHTML = aHtml;
        audioList.querySelectorAll(".audio-sub-option").forEach(btn => {
          btn.onclick = (ev) => {
            ev.stopPropagation();
            const trkId = parseInt(btn.dataset.track, 10);
            netflixHlsInstance.audioTrack = trkId;
            audioList.querySelectorAll(".audio-sub-option").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            showToast(`Áudio: ${btn.textContent.trim()}`);
            resetNetflixControlsTimer();
          };
        });
      }
    });

    netflixHlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      const lvl = netflixHlsInstance.levels[data.level];
      if (lvl && qualityBadge) {
        const h = lvl.height;
        const prefix = netflixHlsInstance.autoLevelEnabled ? "AUTO (" : "";
        const suffix = netflixHlsInstance.autoLevelEnabled ? ")" : "";
        if (h >= 2160) qualityBadge.textContent = `${prefix}4K UHD${suffix}`;
        else if (h >= 1080) qualityBadge.textContent = `${prefix}1080p${suffix}`;
        else if (h >= 720) qualityBadge.textContent = `${prefix}720p${suffix}`;
        else if (h > 0) qualityBadge.textContent = `${prefix}${h}p${suffix}`;
      }
    });

    netflixHlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.warn("HLS Fatal Error:", data);
        buffering.style.display = "none";
      }
    });
  } else {
    if (qualityBadge) qualityBadge.textContent = "DIRETO (FHD)";
    if (qualityOptions) {
      qualityOptions.innerHTML = `<button data-level="-1" class="active">Transmissão Direta (Container Nativo)</button>`;
    }
    if (audioList) {
      audioList.innerHTML = `<button class="audio-sub-option active" data-track="-1">Áudio Padrão PT-BR (Nativo)</button>`;
    }
    video.src = streamUrl;
    video.load();
    video.play().then(() => {
      initNetflixAudioDSP();
    }).catch(e => {
      console.warn("Autoplay bloqueado pelo navegador:", e);
    });
  }

  // Restore Saved Progress
  try {
    const savedTime = parseFloat(localStorage.getItem(`progress_${movie.title}`) || "0");
    if (savedTime > 20) {
      const resumeToast = document.getElementById("netflixResumeToast");
      const resumeTimeEl = document.getElementById("netflixResumeTime");
      if (resumeToast && resumeTimeEl) {
        resumeTimeEl.textContent = formatPlayerTime(savedTime);
        resumeToast.style.display = "flex";
        setTimeout(() => { resumeToast.style.display = "none"; }, 6000);

        const restartBtn = document.getElementById("netflixBtnRestart");
        if (restartBtn) {
          restartBtn.onclick = () => {
            video.currentTime = 0;
            resumeToast.style.display = "none";
          };
        }
      }
      video.currentTime = savedTime;
    }
  } catch (e) {}

  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Auto-hide controls activation
  resetNetflixControlsTimer();
}

function closeNetflixPlayer() {
  const overlay = document.getElementById("netflixPlayerOverlay");
  const video = document.getElementById("netflixVideoPlayer");
  if (!overlay || !video) return;

  // Save Progress
  if (netflixCurrentMovie && video.currentTime > 5 && video.duration && (video.duration - video.currentTime > 45)) {
    try {
      localStorage.setItem(`progress_${netflixCurrentMovie.title}`, video.currentTime);
    } catch (e) {}
  }

  video.pause();
  if (netflixHlsInstance) {
    netflixHlsInstance.destroy();
    netflixHlsInstance = null;
  }
  video.src = "";

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  overlay.style.display = "none";
  overlay.classList.remove("controls-hidden");
  overlay.classList.remove("is-paused");
  document.body.style.overflow = "";
  if (netflixControlsTimer) clearTimeout(netflixControlsTimer);
  netflixCurrentMovie = null;
  if (activeHeroMovie) startHeroTrailer(activeHeroMovie);
}

function toggleNetflixPlayPause() {
  const overlay = document.getElementById("netflixPlayerOverlay");
  const video = document.getElementById("netflixVideoPlayer");
  if (!video) return;

  const iconPlay = document.getElementById("netflixIconPlay");
  const iconPause = document.getElementById("netflixIconPause");
  const centerFlash = document.getElementById("netflixCenterFlash");
  const centerFlashIcon = document.getElementById("netflixCenterFlashIcon");

  if (video.paused) {
    video.play().catch(() => {});
    if (overlay) overlay.classList.remove("is-paused");
    if (iconPlay) iconPlay.style.display = "none";
    if (iconPause) iconPause.style.display = "inline";
    if (centerFlash && centerFlashIcon) {
      centerFlashIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"/>`;
      centerFlash.classList.add("flash-active");
      setTimeout(() => centerFlash.classList.remove("flash-active"), 350);
    }
  } else {
    video.pause();
    if (overlay) {
      overlay.classList.remove("controls-hidden");
      overlay.classList.add("is-paused");
    }
    updateNetflixPauseCard(netflixCurrentMovie);
    if (iconPlay) iconPlay.style.display = "inline";
    if (iconPause) iconPause.style.display = "none";
    if (centerFlash && centerFlashIcon) {
      centerFlashIcon.innerHTML = `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`;
      centerFlash.classList.add("flash-active");
      setTimeout(() => centerFlash.classList.remove("flash-active"), 350);
    }
  }
  resetNetflixControlsTimer();
}

function seekNetflixRelative(seconds) {
  const video = document.getElementById("netflixVideoPlayer");
  if (!video || isNaN(video.duration)) return;
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));

  // Trigger Netflix Ripple Seek Badges (-10s / +10s)
  if (seconds < 0) {
    const badgeLeft = document.getElementById("netflixSeekFeedbackLeft");
    if (badgeLeft) {
      badgeLeft.classList.add("active");
      setTimeout(() => badgeLeft.classList.remove("active"), 450);
    }
  } else if (seconds > 0) {
    const badgeRight = document.getElementById("netflixSeekFeedbackRight");
    if (badgeRight) {
      badgeRight.classList.add("active");
      setTimeout(() => badgeRight.classList.remove("active"), 450);
    }
  }

  resetNetflixControlsTimer();
}

function playNextRecommendedMovie() {
  if (!netflixCurrentMovie) return;
  const profile = buildUserProfile();
  const similar = getSimilarMovies(netflixCurrentMovie, 10);
  let next = similar.find(m => m.title !== netflixCurrentMovie.title);
  if (!next) {
    const unwatched = movies.filter(m => m.title !== netflixCurrentMovie.title && !userWatched.has(m.title));
    next = unwatched.length ? unwatched[0] : movies[0];
  }
  if (next) {
    showToast(`Iniciando próxima recomendação: ${next.ptTitle || next.title}`);
    openNetflixPlayer(next);
  }
}

function setNetflixVolume(val) {
  const video = document.getElementById("netflixVideoPlayer");
  if (!video) return;
  video.volume = Math.max(0, Math.min(1, val));
  video.muted = (video.volume === 0);
  updateNetflixVolumeIcons();
  resetNetflixControlsTimer();
}

function toggleNetflixMute() {
  const video = document.getElementById("netflixVideoPlayer");
  if (!video) return;
  video.muted = !video.muted;
  updateNetflixVolumeIcons();
  resetNetflixControlsTimer();
}

function updateNetflixVolumeIcons() {
  const video = document.getElementById("netflixVideoPlayer");
  const slider = document.getElementById("netflixVolumeSlider");
  const iconHigh = document.getElementById("netflixIconVolHigh");
  const iconMute = document.getElementById("netflixIconVolMute");
  if (!video) return;

  if (slider) slider.value = video.muted ? 0 : video.volume;
  if (iconHigh && iconMute) {
    if (video.muted || video.volume === 0) {
      iconHigh.style.display = "none";
      iconMute.style.display = "inline";
    } else {
      iconHigh.style.display = "inline";
      iconMute.style.display = "none";
    }
  }
}

function toggleNetflixFullscreen() {
  const overlay = document.getElementById("netflixPlayerOverlay");
  const iconEnter = document.getElementById("netflixIconFullscreenEnter");
  const iconExit = document.getElementById("netflixIconFullscreenExit");
  if (!overlay) return;

  if (!document.fullscreenElement) {
    overlay.requestFullscreen().catch(() => {});
    if (iconEnter) iconEnter.style.display = "none";
    if (iconExit) iconExit.style.display = "inline";
  } else {
    document.exitFullscreen().catch(() => {});
    if (iconEnter) iconEnter.style.display = "inline";
    if (iconExit) iconExit.style.display = "none";
  }
  resetNetflixControlsTimer();
}

function setNetflixPlaybackSpeed(speed) {
  const video = document.getElementById("netflixVideoPlayer");
  const btn = document.getElementById("netflixBtnSpeed");
  const dropdown = document.getElementById("netflixSpeedDropdown");
  if (video) video.playbackRate = speed;
  if (btn) btn.textContent = `${speed}x`;
  if (dropdown) {
    dropdown.querySelectorAll("button").forEach(b => {
      b.classList.toggle("active", parseFloat(b.dataset.speed) === speed);
    });
    dropdown.classList.remove("open");
  }
  resetNetflixControlsTimer();
}

function resetNetflixControlsTimer() {
  const overlay = document.getElementById("netflixPlayerOverlay");
  if (!overlay || overlay.style.display === "none") return;

  overlay.classList.remove("controls-hidden");
  if (netflixControlsTimer) clearTimeout(netflixControlsTimer);

  netflixControlsTimer = setTimeout(() => {
    const video = document.getElementById("netflixVideoPlayer");
    const speedMenu = document.getElementById("netflixSpeedDropdown");
    const subMenu = document.getElementById("netflixSubtitlesDropdown");
    const isMenuOpen = (speedMenu && speedMenu.classList.contains("open")) || (subMenu && subMenu.classList.contains("open"));

    if (video && !video.paused && !netflixIsDraggingScrubber && !isMenuOpen) {
      overlay.classList.add("controls-hidden");
    }
  }, 3200);
}

// Stream Config Modal (View / Override IPTV link)
function openStreamConfigModal() {
  if (!netflixCurrentMovie) return;
  const modal = document.getElementById("streamConfigModal");
  const titleEl = document.getElementById("streamConfigMovieTitle");
  const inputEl = document.getElementById("streamConfigUrlInput");
  const srcEl = document.getElementById("streamConfigSourceLabel");
  if (!modal) return;

  if (titleEl) titleEl.textContent = `Link IPTV: ${netflixCurrentMovie.title}`;
  const currentUrl = resolveMovieStreamUrl(netflixCurrentMovie);
  if (inputEl) inputEl.value = currentUrl;
  if (srcEl) {
    srcEl.textContent = netflixCustomOverrides[netflixCurrentMovie.title] ? "Personalizado (Usuário)" : (netflixCurrentMovie.streamName ? `contrafilenabrasa.net (${netflixCurrentMovie.streamName})` : "contrafilenabrasa.net");
  }

  modal.classList.add("open");
}

let netflixShowRemainingTime = false;

function setupNetflixPlayerEngine() {
  const overlay = document.getElementById("netflixPlayerOverlay");
  const video = document.getElementById("netflixVideoPlayer");
  const backBtn = document.getElementById("netflixPlayerBackBtn");
  const playPauseBtn = document.getElementById("netflixBtnPlayPause");
  const rewindBtn = document.getElementById("netflixBtnRewind10");
  const forwardBtn = document.getElementById("netflixBtnForward10");
  const volBtn = document.getElementById("netflixBtnVolume");
  const volSlider = document.getElementById("netflixVolumeSlider");
  const speedBtn = document.getElementById("netflixBtnSpeed");
  const speedDropdown = document.getElementById("netflixSpeedDropdown");
  const subBtn = document.getElementById("netflixBtnSubtitles");
  const subDropdown = document.getElementById("netflixSubtitlesDropdown");
  const nextBtn = document.getElementById("netflixBtnNextTitle");
  const fsBtn = document.getElementById("netflixBtnFullscreen");
  const editStreamBtn = document.getElementById("netflixBtnEditStream");
  const externalBtn = document.getElementById("netflixBtnExternalPlayer");

  const scrubberContainer = document.getElementById("netflixScrubberContainer");
  const scrubberProgress = document.getElementById("netflixScrubberProgress");
  const scrubberBuffer = document.getElementById("netflixScrubberBuffer");
  const scrubberThumb = document.getElementById("netflixScrubberThumb");
  const scrubberTooltip = document.getElementById("netflixScrubberTooltip");

  const timeWrap = document.getElementById("netflixTimeDisplayWrap");
  const timeCurrent = document.getElementById("netflixTimeCurrent");
  const timeDivider = document.getElementById("netflixTimeDivider");
  const timeDuration = document.getElementById("netflixTimeDuration");
  const buffering = document.getElementById("netflixBuffering");

  if (!overlay || !video) return;

  const updateTimeLabels = () => {
    if (!video.duration || isNaN(video.duration)) return;
    if (netflixShowRemainingTime) {
      const remaining = Math.max(0, video.duration - video.currentTime);
      if (timeCurrent) timeCurrent.textContent = `-${formatPlayerTime(remaining)}`;
      if (timeDivider) timeDivider.style.display = "none";
      if (timeDuration) timeDuration.style.display = "none";
    } else {
      if (timeCurrent) timeCurrent.textContent = formatPlayerTime(video.currentTime);
      if (timeDivider) timeDivider.style.display = "inline";
      if (timeDuration) {
        timeDuration.style.display = "inline";
        timeDuration.textContent = formatPlayerTime(video.duration);
      }
    }
  };

  if (timeWrap) {
    timeWrap.onclick = () => {
      netflixShowRemainingTime = !netflixShowRemainingTime;
      updateTimeLabels();
      resetNetflixControlsTimer();
    };
  }

  // Video Events
  video.addEventListener("play", () => {
    const iconPlay = document.getElementById("netflixIconPlay");
    const iconPause = document.getElementById("netflixIconPause");
    if (iconPlay) iconPlay.style.display = "none";
    if (iconPause) iconPause.style.display = "inline";
    if (buffering) buffering.style.display = "none";
    overlay.classList.remove("is-paused");
    resetNetflixControlsTimer();
  });

  video.addEventListener("pause", () => {
    const iconPlay = document.getElementById("netflixIconPlay");
    const iconPause = document.getElementById("netflixIconPause");
    if (iconPlay) iconPlay.style.display = "inline";
    if (iconPause) iconPause.style.display = "none";
    overlay.classList.remove("controls-hidden");
    overlay.classList.add("is-paused");
    updateNetflixPauseCard(netflixCurrentMovie);
  });

  video.addEventListener("waiting", () => {
    if (buffering) buffering.style.display = "flex";
  });

  video.addEventListener("playing", () => {
    if (buffering) buffering.style.display = "none";
  });

  video.addEventListener("timeupdate", () => {
    if (!video.duration || isNaN(video.duration)) return;
    const pct = (video.currentTime / video.duration) * 100;
    if (scrubberProgress) scrubberProgress.style.width = `${pct}%`;
    if (scrubberThumb) scrubberThumb.style.left = `${pct}%`;
    updateTimeLabels();
  });

  video.addEventListener("progress", () => {
    if (!video.duration || isNaN(video.duration)) return;
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const pct = (bufferedEnd / video.duration) * 100;
      if (scrubberBuffer) scrubberBuffer.style.width = `${pct}%`;
    }
  });

  // Double Click on Video (Seek -10s / +10s) and Single Click (Play/Pause)
  let videoClickTimer = null;
  video.addEventListener("click", (e) => {
    const rect = video.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (e.detail === 2) {
      if (videoClickTimer) clearTimeout(videoClickTimer);
      if (clickX < width * 0.35) {
        seekNetflixRelative(-10);
      } else if (clickX > width * 0.65) {
        seekNetflixRelative(10);
      } else {
        toggleNetflixFullscreen();
      }
    } else if (e.detail === 1) {
      videoClickTimer = setTimeout(() => {
        toggleNetflixPlayPause();
      }, 240);
    }
  });

  // Netflix Pause Overlay Backdrop & Card Clicks (Resume on click)
  const pauseBackdrop = document.getElementById("netflixPauseBackdrop");
  if (pauseBackdrop) {
    pauseBackdrop.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleNetflixPlayPause();
    });
  }

  const pauseCard = document.getElementById("netflixPauseCard");
  if (pauseCard) {
    pauseCard.addEventListener("click", (e) => {
      if (!e.target.closest("button, a, input")) {
        toggleNetflixPlayPause();
      }
    });
  }

  // Buttons
  if (backBtn) backBtn.onclick = closeNetflixPlayer;
  if (playPauseBtn) playPauseBtn.onclick = toggleNetflixPlayPause;
  if (rewindBtn) rewindBtn.onclick = () => seekNetflixRelative(-10);
  if (forwardBtn) forwardBtn.onclick = () => seekNetflixRelative(10);
  if (volBtn) volBtn.onclick = toggleNetflixMute;
  if (volSlider) {
    volSlider.oninput = (e) => setNetflixVolume(parseFloat(e.target.value));
  }

  // Next Title Button
  if (nextBtn) {
    nextBtn.onclick = () => {
      playNextRecommendedMovie();
    };
  }

  // Audio & Subtitles / Cinema AV Popover
  const qualityBtn = document.getElementById("netflixBtnQuality");
  const qualityDropdown = document.getElementById("netflixQualityDropdown");
  const qualityWrap = qualityBtn ? qualityBtn.closest(".netflix-quality-menu-wrap") : null;

  if (subBtn && subDropdown) {
    subBtn.onclick = (e) => {
      e.stopPropagation();
      subDropdown.classList.toggle("open");
      if (speedDropdown) speedDropdown.classList.remove("open");
      if (qualityDropdown) qualityDropdown.classList.remove("open");
      if (qualityWrap) qualityWrap.classList.remove("open");
      resetNetflixControlsTimer();
    };

    // Subtitle options click
    subDropdown.querySelectorAll("#netflixSubtitlesList .audio-sub-option").forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const parentCol = opt.closest("#netflixSubtitlesList");
        if (parentCol) {
          parentCol.querySelectorAll(".audio-sub-option").forEach(o => o.classList.remove("active"));
          opt.classList.add("active");
        }
        showToast(`Legendas: ${opt.textContent.replace("✓", "").trim()}`);
        subDropdown.classList.remove("open");
        resetNetflixControlsTimer();
      };
    });

    // DSP & Video calibration toggle bindings
    const dspDialogueBtn = document.getElementById("netflixDspDialogue");
    const dspCompressorBtn = document.getElementById("netflixDspCompressor");
    const dspBoostBtn = document.getElementById("netflixDspBoost");
    const vidGradeBtn = document.getElementById("netflixVideoGrade");
    const vidDitherBtn = document.getElementById("netflixVideoDither");
    const vidAspectBtn = document.getElementById("netflixVideoAspect");

    const syncToggleUi = (btn, active) => {
      if (!btn) return;
      btn.classList.toggle("active", !!active);
      const ind = btn.querySelector(".toggle-indicator");
      if (ind) ind.textContent = active ? "ON" : "OFF";
    };

    syncToggleUi(dspDialogueBtn, netflixDspSettings.dialogueBoost);
    syncToggleUi(dspCompressorBtn, netflixDspSettings.compressor);
    syncToggleUi(dspBoostBtn, netflixDspSettings.volumeBoost);
    syncToggleUi(vidGradeBtn, netflixVideoSettings.cinemaGrade);
    syncToggleUi(vidDitherBtn, netflixVideoSettings.ditherGrain);
    syncToggleUi(vidAspectBtn, netflixVideoSettings.aspectFill);

    if (dspDialogueBtn) {
      dspDialogueBtn.onclick = (e) => {
        e.stopPropagation();
        netflixDspSettings.dialogueBoost = !netflixDspSettings.dialogueBoost;
        syncToggleUi(dspDialogueBtn, netflixDspSettings.dialogueBoost);
        updateNetflixAudioDSP();
        try { localStorage.setItem("curator_dsp_settings", JSON.stringify(netflixDspSettings)); } catch (err) {}
        showToast(netflixDspSettings.dialogueBoost ? "Realce de Voz & Diálogos ATIVADO" : "Realce de Voz DESATIVADO");
      };
    }

    if (dspCompressorBtn) {
      dspCompressorBtn.onclick = (e) => {
        e.stopPropagation();
        netflixDspSettings.compressor = !netflixDspSettings.compressor;
        syncToggleUi(dspCompressorBtn, netflixDspSettings.compressor);
        updateNetflixAudioDSP();
        try { localStorage.setItem("curator_dsp_settings", JSON.stringify(netflixDspSettings)); } catch (err) {}
        showToast(netflixDspSettings.compressor ? "Compressor Dinâmico (Noite) ATIVADO" : "Compressor Dinâmico DESATIVADO");
      };
    }

    if (dspBoostBtn) {
      dspBoostBtn.onclick = (e) => {
        e.stopPropagation();
        netflixDspSettings.volumeBoost = !netflixDspSettings.volumeBoost;
        syncToggleUi(dspBoostBtn, netflixDspSettings.volumeBoost);
        updateNetflixAudioDSP();
        try { localStorage.setItem("curator_dsp_settings", JSON.stringify(netflixDspSettings)); } catch (err) {}
        showToast(netflixDspSettings.volumeBoost ? "Super Volume (+50%) ATIVADO" : "Super Volume DESATIVADO");
      };
    }

    if (vidGradeBtn) {
      vidGradeBtn.onclick = (e) => {
        e.stopPropagation();
        netflixVideoSettings.cinemaGrade = !netflixVideoSettings.cinemaGrade;
        syncToggleUi(vidGradeBtn, netflixVideoSettings.cinemaGrade);
        applyNetflixVideoSettings();
        try { localStorage.setItem("curator_video_settings", JSON.stringify(netflixVideoSettings)); } catch (err) {}
        showToast(netflixVideoSettings.cinemaGrade ? "Modo Cinema Master ATIVADO" : "Modo Cinema Master DESATIVADO");
      };
    }

    if (vidDitherBtn) {
      vidDitherBtn.onclick = (e) => {
        e.stopPropagation();
        netflixVideoSettings.ditherGrain = !netflixVideoSettings.ditherGrain;
        syncToggleUi(vidDitherBtn, netflixVideoSettings.ditherGrain);
        applyNetflixVideoSettings();
        try { localStorage.setItem("curator_video_settings", JSON.stringify(netflixVideoSettings)); } catch (err) {}
        showToast(netflixVideoSettings.ditherGrain ? "Anti-Banding Noturno ATIVADO" : "Anti-Banding DESATIVADO");
      };
    }

    if (vidAspectBtn) {
      vidAspectBtn.onclick = (e) => {
        e.stopPropagation();
        netflixVideoSettings.aspectFill = !netflixVideoSettings.aspectFill;
        syncToggleUi(vidAspectBtn, netflixVideoSettings.aspectFill);
        applyNetflixVideoSettings();
        try { localStorage.setItem("curator_video_settings", JSON.stringify(netflixVideoSettings)); } catch (err) {}
        showToast(netflixVideoSettings.aspectFill ? "Preenchimento de Tela (Sem Barras) ATIVADO" : "Aspect Ratio Original RESTAURADO");
      };
    }
  }

  // Quality & Bitrate Dropdown
  if (qualityBtn && qualityDropdown) {
    qualityBtn.onclick = (e) => {
      e.stopPropagation();
      qualityDropdown.classList.toggle("open");
      if (qualityWrap) qualityWrap.classList.toggle("open");
      if (subDropdown) subDropdown.classList.remove("open");
      if (speedDropdown) speedDropdown.classList.remove("open");
      resetNetflixControlsTimer();
    };
  }

  // Speed Dropdown
  if (speedBtn && speedDropdown) {
    speedBtn.onclick = (e) => {
      e.stopPropagation();
      speedDropdown.classList.toggle("open");
      if (subDropdown) subDropdown.classList.remove("open");
      if (qualityDropdown) qualityDropdown.classList.remove("open");
      if (qualityWrap) qualityWrap.classList.remove("open");
      resetNetflixControlsTimer();
    };
    speedDropdown.querySelectorAll("button").forEach(b => {
      b.onclick = () => setNetflixPlaybackSpeed(parseFloat(b.dataset.speed));
    });
  }

  // Close dropdowns on outside click
  document.addEventListener("click", () => {
    if (speedDropdown) speedDropdown.classList.remove("open");
    if (subDropdown) subDropdown.classList.remove("open");
    if (qualityDropdown) qualityDropdown.classList.remove("open");
    if (qualityWrap) qualityWrap.classList.remove("open");
  });

  if (fsBtn) fsBtn.onclick = toggleNetflixFullscreen;
  if (editStreamBtn) editStreamBtn.onclick = openStreamConfigModal;
  if (externalBtn) externalBtn.onclick = openExternalPlayerModal;

  // Scrubber Events
  if (scrubberContainer) {
    const handleScrub = (e) => {
      const rect = scrubberContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (scrubberProgress) scrubberProgress.style.width = `${pos * 100}%`;
      if (scrubberThumb) scrubberThumb.style.left = `${pos * 100}%`;
      if (video.duration && !isNaN(video.duration)) {
        video.currentTime = pos * video.duration;
      }
    };

    scrubberContainer.addEventListener("mousemove", (e) => {
      const rect = scrubberContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      if (scrubberTooltip) {
        scrubberTooltip.style.left = `${pos * 100}%`;
        if (video.duration && !isNaN(video.duration)) {
          scrubberTooltip.textContent = formatPlayerTime(pos * video.duration);
        }
        scrubberTooltip.style.opacity = "1";
      }
      if (netflixIsDraggingScrubber) handleScrub(e);
      resetNetflixControlsTimer();
    });

    scrubberContainer.addEventListener("mouseleave", () => {
      if (scrubberTooltip) scrubberTooltip.style.opacity = "0";
    });

    scrubberContainer.addEventListener("mousedown", (e) => {
      netflixIsDraggingScrubber = true;
      handleScrub(e);
    });

    window.addEventListener("mouseup", () => {
      netflixIsDraggingScrubber = false;
    });
  }

  // Mouse activity in overlay
  overlay.addEventListener("mousemove", resetNetflixControlsTimer);
  overlay.addEventListener("touchstart", resetNetflixControlsTimer);

  // Stream Config Modal Action Buttons
  const cfgClose = document.getElementById("streamConfigModalClose");
  const cfgSave = document.getElementById("streamConfigBtnSave");
  const cfgReset = document.getElementById("streamConfigBtnReset");
  const cfgCopy = document.getElementById("streamConfigBtnCopy");

  if (cfgClose) {
    cfgClose.onclick = () => document.getElementById("streamConfigModal").classList.remove("open");
  }

  if (cfgCopy) {
    cfgCopy.onclick = () => {
      const url = document.getElementById("streamConfigUrlInput")?.value || "";
      if (url) {
        navigator.clipboard.writeText(url).then(() => showToast("Link copiado para a área de transferência!"));
      }
    };
  }

  if (cfgSave) {
    cfgSave.onclick = () => {
      if (!netflixCurrentMovie) return;
      const input = document.getElementById("streamConfigUrlInput");
      const newUrl = input ? input.value.trim() : "";
      if (newUrl) {
        netflixCustomOverrides[netflixCurrentMovie.title] = newUrl;
        try {
          localStorage.setItem("curator_stream_overrides", JSON.stringify(netflixCustomOverrides));
        } catch (e) {}
        showToast("Link IPTV personalizado salvo com sucesso!");
        document.getElementById("streamConfigModal").classList.remove("open");
        openNetflixPlayer(netflixCurrentMovie);
      }
    };
  }

  if (cfgReset) {
    cfgReset.onclick = () => {
      if (!netflixCurrentMovie) return;
      delete netflixCustomOverrides[netflixCurrentMovie.title];
      try {
        localStorage.setItem("curator_stream_overrides", JSON.stringify(netflixCustomOverrides));
      } catch (e) {}
      showToast("Link padrão restaurado!");
      document.getElementById("streamConfigModal").classList.remove("open");
      openNetflixPlayer(netflixCurrentMovie);
    };
  }
}

// ==========================================================================
// Engine & User Profile Modals
// ==========================================================================
function openEngineModal() {
  const modal = document.getElementById("engineModal");
  if (!modal) return;

  const watchedCountEl = document.getElementById("engineModalWatchedCount");
  if (watchedCountEl) watchedCountEl.textContent = userWatched.size;

  const commCountEl = document.getElementById("engineModalCommentsCount");
  if (commCountEl) commCountEl.textContent = Object.keys(userComments).length;

  const ignCountEl = document.getElementById("engineModalIgnoredCount");
  if (ignCountEl) ignCountEl.textContent = userIgnored.size;

  const undubCountEl = document.getElementById("engineModalUndubbedCount");
  if (undubCountEl) undubCountEl.textContent = userUndubbed.size;

  const undubSection = document.getElementById("engineUndubbedSection");
  const undubList = document.getElementById("engineUndubbedList");
  if (undubSection && undubList) {
    if (userUndubbed.size > 0) {
      undubSection.style.display = "block";
      undubList.innerHTML = Array.from(userUndubbed).map(t => `
        <span class="cat-pill" style="font-size: 12px; padding: 4px 10px;">${escapeHtml(t)}</span>
      `).join("");
    } else {
      undubSection.style.display = "none";
    }
  }

  const profile = buildUserProfile();
  const topGenres = document.getElementById("engineTopGenres");
  if (topGenres) {
    const sorted = Object.entries(profile.genreWeights).sort((a, b) => b[1] - a[1]).slice(0, 8);
    topGenres.innerHTML = sorted.map(([g, w]) => `
      <span class="cat-pill" style="font-size: 12px; padding: 4px 10px; background: rgba(70,211,105,0.15); border-color: rgba(70,211,105,0.3); color: #46d369;">
        ${escapeHtml(g)} (+${w})
      </span>
    `).join("");
  }

  const topDirectors = document.getElementById("engineTopDirectors");
  if (topDirectors) {
    const sortedD = Object.entries(profile.directorWeights).sort((a, b) => b[1] - a[1]).slice(0, 8);
    topDirectors.innerHTML = sortedD.map(([d, w]) => `
      <span class="cat-pill" style="font-size: 12px; padding: 4px 10px;">
        ${escapeHtml(d)}
      </span>
    `).join("");
  }

  modal.classList.add("open");
}

function openUserProfileModal() {
  const modal = document.getElementById("userProfileModal");
  if (!modal) return;

  const avatarEl = document.getElementById("profileModalAvatar");
  if (avatarEl) avatarEl.src = currentGoogleUser?.picture || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100";

  const nameEl = document.getElementById("profileModalName");
  if (nameEl) nameEl.textContent = currentGoogleUser?.name || "Usuário";

  const emailEl = document.getElementById("profileModalEmail");
  if (emailEl) emailEl.textContent = currentGoogleUser?.email || "";

  const savedCountEl = document.getElementById("profileSavedMoviesCount");
  if (savedCountEl) savedCountEl.textContent = userSavedMovies.size;

  const catCountEl = document.getElementById("profileCategoriesCount");
  if (catCountEl) catCountEl.textContent = categories.length;

  const savedListEl = document.getElementById("profileSavedMoviesList");
  if (savedListEl) {
    const list = Array.from(userSavedMovies.values());
    if (!list.length) {
      savedListEl.innerHTML = "<p style='color: #888; font-size: 13px;'>Nenhum filme salvo na sua lista ainda.</p>";
    } else {
      savedListEl.innerHTML = list.map(m => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.06); padding: 8px 12px; border-radius: 4px;">
          <span style="font-size: 13px; font-weight: 600; color: #fff;">${escapeHtml(m.ptTitle || m.title)}</span>
          <span style="font-size: 11px; color: #888;">${m.year || ''}</span>
        </div>
      `).join("");
    }
  }

  const btnProfileIptv = document.getElementById("btnProfileManageIptv");
  if (btnProfileIptv) {
    btnProfileIptv.onclick = () => {
      modal.classList.remove("open");
      openIptvModal();
    };
  }

  modal.classList.add("open");
}

function updateUserStatsUI() {
  const navSavedCount = document.getElementById("navSavedCount");
  if (navSavedCount) navSavedCount.textContent = userSavedMovies.size;

  const userProfilePill = document.getElementById("userProfilePill");
  const btnGoogleLogin = document.getElementById("btnGoogleLogin");
  const userAvatarImg = document.getElementById("userAvatarImg");
  const userNameLabel = document.getElementById("userNameLabel");

  if (currentGoogleUser) {
    if (userProfilePill) userProfilePill.style.display = "flex";
    if (btnGoogleLogin) btnGoogleLogin.style.display = "none";
    if (userAvatarImg) userAvatarImg.src = currentGoogleUser.picture || "";
    if (userNameLabel) userNameLabel.textContent = currentGoogleUser.name || "Usuário";
  } else {
    if (userProfilePill) userProfilePill.style.display = "none";
    if (btnGoogleLogin) btnGoogleLogin.style.display = "flex";
  }
}

function initGoogleAuth() {
  // Google GIS initialization if client ID is provided
  const clientId = localStorage.getItem("lb_curator_google_client_id");
  if (window.google && window.google.accounts && clientId) {
    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse
      });
      const container = document.getElementById("g_id_signin_container");
      if (container) {
        google.accounts.id.renderButton(container, {
          theme: "filled_blue",
          size: "large",
          width: 250
        });
      }
    } catch (e) {
      console.warn("GIS Init:", e);
    }
  }

  const saveClientIdBtn = document.getElementById("btnSaveGoogleClientId");
  if (saveClientIdBtn) {
    saveClientIdBtn.onclick = () => {
      const val = document.getElementById("googleClientIdInput")?.value.trim();
      if (val) {
        localStorage.setItem("lb_curator_google_client_id", val);
        showToast("Google Client ID salvo!");
      }
    };
  }
}

function handleGoogleCredentialResponse(response) {
  try {
    const payload = parseJwt(response.credential);
    currentGoogleUser = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture
    };
    saveUserStateToDisk();
    document.getElementById("googleAuthModal")?.classList.remove("open");
    showToast(`Bem-vindo, ${currentGoogleUser.name}!`);
  } catch (e) {
    console.error("JWT parse error:", e);
  }
}

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(atob(base64).split("").map(c => {
    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(""));
  return JSON.parse(jsonPayload);
}

// ==========================================================================
// Toast Notifications
// ==========================================================================
function showToast(msg) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const item = document.createElement("div");
  item.className = "toast-item";
  item.textContent = msg;
  container.appendChild(item);
  setTimeout(() => {
    item.style.opacity = "0";
    item.style.transform = "translateY(12px)";
    item.style.transition = "opacity 0.2s, transform 0.2s";
    setTimeout(() => item.remove(), 250);
  }, 2600);
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Start application
window.addEventListener("DOMContentLoaded", init);
