const fs = require("fs");
const https = require("https");
const path = require("path");

const apiKey = "8d5e8777";

function fetchOmdb(query) {
  return new Promise((resolve, reject) => {
    let url;
    if (query.id) {
      url = `https://www.omdbapi.com/?i=${query.id}&apikey=${apiKey}`;
    } else {
      url = `https://www.omdbapi.com/?t=${encodeURIComponent(query.title)}&y=${query.year}&apikey=${apiKey}`;
    }
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function formatMovie(item, omdb) {
  return {
    title: item.title,
    ptTitle: item.ptTitle,
    year: parseInt(item.year, 10),
    category: item.category,
    letterboxdUrl: `https://letterboxd.com/film/${item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}/`,
    inWatchlist: false,
    dubbed: true,
    dubbingStudio: item.dubbingStudio,
    curatorNote: item.curatorNote,
    curatorReason: item.curatorNote,
    omdb: {
      plot: omdb.Plot && omdb.Plot !== "N/A" ? omdb.Plot : "Sinopse não disponível.",
      poster: omdb.Poster && omdb.Poster !== "N/A" ? omdb.Poster : "",
      director: omdb.Director && omdb.Director !== "N/A" ? omdb.Director : "Desconhecido",
      actors: omdb.Actors && omdb.Actors !== "N/A" ? omdb.Actors : "Desconhecido",
      imdbRating: omdb.imdbRating && omdb.imdbRating !== "N/A" ? omdb.imdbRating : "N/A",
      rottenTomatoes: (omdb.Ratings || []).find(r => r.Source === "Rotten Tomatoes")?.Value || "N/A",
      metascore: omdb.Metascore && omdb.Metascore !== "N/A" ? omdb.Metascore : "N/A",
      runtime: omdb.Runtime && omdb.Runtime !== "N/A" ? omdb.Runtime : "N/A",
      genre: omdb.Genre && omdb.Genre !== "N/A" ? omdb.Genre : "N/A",
      awards: omdb.Awards && omdb.Awards !== "N/A" ? omdb.Awards : "N/A"
    }
  };
}

async function run() {
  console.log("Starting resolution of pending issues...");

  // 1. Dark Losers replacements (2)
  const darkLosersToAdd = [
    {
      title: "A Fish Called Wanda",
      year: 1988,
      ptTitle: "Um Peixe Chamado Wanda",
      category: "dark-losers",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Plano de roubo que vira um desastre monumental; John Cleese e Kevin Kline em uma sátira brilhante e cínica."
    },
    {
      title: "To Die For",
      year: 1995,
      ptTitle: "Um Sonho Sem Limites",
      category: "dark-losers",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Gus Van Sant desconstrói a obsessão pela fama televisiva com cinismo mordaz e personagens deploráveis."
    }
  ];

  // 2. Cyberpunk replacement (1)
  const cyberpunkToAdd = [
    {
      title: "Virtuosity",
      year: 1995,
      ptTitle: "Assassino Virtual",
      category: "cyberpunk",
      dubbingStudio: "VTI Rio",
      curatorNote: "Clássico cyberpunk anos 90: IA gerada a partir de psicopatas escapa em corpo nanotecnológico e aterroriza o mundo real."
    }
  ];

  // 3. Fury replacements (15)
  const furyToAdd = [
    {
      title: "Point Blank",
      year: 1967,
      ptTitle: "À Queima-Roupa",
      category: "fury",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Lee Marvin canaliza vingança fria e implacável em um marco do neo-noir que inspirou gerações."
    },
    {
      title: "Get Carter",
      year: 1971,
      ptTitle: "Carter, o Vingador",
      category: "fury",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Michael Caine em um dos thrillers britânicos mais secos e cruéis: foco absoluto para punir os assassinos do irmão."
    },
    {
      title: "Rolling Thunder",
      year: 1977,
      ptTitle: "A Outra Face da Violência",
      category: "fury",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Roteiro de Paul Schrader: veterano mutilado canaliza fúria e trauma em uma missão de retaliação sem concessões."
    },
    {
      title: "La Haine",
      id: "tt0113247",
      year: 1995,
      ptTitle: "O Ódio",
      category: "fury",
      slug: "la-haine",
      dubbingStudio: "Marshmallows / Herbert Richers",
      curatorNote: "Obra-prima francesa sobre 24 horas de revolta, tensão e fúria contra a brutalidade policial na periferia de Paris."
    },
    {
      title: "The Limey",
      year: 1999,
      ptTitle: "O Estranho",
      category: "fury",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Terence Stamp atravessa Los Angeles como uma força implacável da natureza investigando a morte da filha."
    },
    {
      title: "Payback",
      year: 1999,
      ptTitle: "O Troco",
      category: "fury",
      dubbingStudio: "Herbert Richers",
      curatorNote: "Porter não quer poder nem glória, apenas seus 70 mil dólares roubados, avançando sem hesitar sobre a máfia."
    },
    {
      title: "Harry Brown",
      id: "tt1289406",
      year: 2009,
      ptTitle: "Harry Brown",
      category: "fury",
      slug: "harry-brown",
      dubbingStudio: "Studio Gábia",
      curatorNote: "Michael Caine como ex-militar idoso focado em impor disciplina e justiça contra gangues brutais em seu condomínio."
    },
    {
      title: "Headhunters",
      year: 2011,
      ptTitle: "Headhunters",
      category: "fury",
      dubbingStudio: "Clone",
      curatorNote: "Suspense norueguês tenso e visceral baseado em Jo Nesbø: sobrevivência extrema e revanches milimetricamente armadas."
    },
    {
      title: "Brawl in Cell Block 99",
      year: 2017,
      ptTitle: "Confronto no Pavilhão 99",
      category: "fury",
      dubbingStudio: "Delart",
      curatorNote: "Vince Vaughn como um rolo compressor humano canalizando força bruta e foco inabalável para proteger a família na prisão."
    },
    {
      title: "The Man from Nowhere",
      year: 2010,
      ptTitle: "O Homem de Lugar Nenhum",
      category: "fury",
      dubbingStudio: "Centauro",
      curatorNote: "Um dos ápices do cinema de ação sul-coreano: ex-agente secreto focado e letal para resgatar sua única amiga."
    },
    {
      title: "A Bittersweet Life",
      year: 2005,
      ptTitle: "O Gosto da Vingança",
      category: "fury",
      dubbingStudio: "Studio Gábia",
      curatorNote: "Estilo visual primoroso de Kim Jee-woon: lealdade traída se transforma em foco milimétrico contra todo um sindicato criminoso."
    },
    {
      title: "Bullhead",
      year: 2011,
      ptTitle: "Bullhead",
      category: "fury",
      dubbingStudio: "TV Group Digital",
      curatorNote: "Matthias Schoenaerts em um drama visceral belga: trauma de infância transformado em carcaça física impenetrável e fúria contida."
    },
    {
      title: "I Saw the Devil",
      year: 2010,
      ptTitle: "Eu Vi o Diabo",
      category: "fury",
      dubbingStudio: "Clone",
      curatorNote: "Agente secreto sul-coreano canaliza luto e raiva desmedida em um jogo sádico de caça e captura contra um serial killer."
    },
    {
      title: "Hardcore Henry",
      id: "tt3072482",
      year: 2015,
      ptTitle: "Hardcore: Missão Extrema",
      category: "fury",
      slug: "hardcore-henry",
      dubbingStudio: "Delart",
      curatorNote: "Ação ininterrupta em primeira pessoa: ciborgue furioso rompendo exércitos mercenários com adrenalina máxima."
    },
    {
      title: "Pusher",
      year: 1996,
      ptTitle: "Pusher",
      category: "fury",
      dubbingStudio: "Clone / Herbert Richers",
      curatorNote: "O marco de Nicolas Winding Refn e Mads Mikkelsen: desespero, pressão do submundo dinamarquês e sobrevivência contra o relógio."
    }
  ];

  // Fetch OMDb data
  const darkLosersFormatted = [];
  for (const item of darkLosersToAdd) {
    console.log(`Fetching OMDb: ${item.title}`);
    const omdb = await fetchOmdb(item);
    darkLosersFormatted.push(formatMovie(item, omdb));
  }

  const cyberpunkFormatted = [];
  for (const item of cyberpunkToAdd) {
    console.log(`Fetching OMDb: ${item.title}`);
    const omdb = await fetchOmdb(item);
    cyberpunkFormatted.push(formatMovie(item, omdb));
  }

  const furyFormatted = [];
  for (const item of furyToAdd) {
    console.log(`Fetching OMDb: ${item.title}`);
    const omdb = await fetchOmdb(item);
    furyFormatted.push(formatMovie(item, omdb));
  }

  // Update dark-losers.json
  const dlPath = path.resolve("./web/data/packs/dark-losers.json");
  const darkLosersPack = JSON.parse(fs.readFileSync(dlPath, "utf-8"));
  const filteredDl = darkLosersPack.filter(m => m.title !== "Bernie" && m.title !== "Sightseers");
  const updatedDl = [...filteredDl, ...darkLosersFormatted];
  fs.writeFileSync(dlPath, JSON.stringify(updatedDl, null, 2), "utf-8");
  console.log(`Updated dark-losers.json: now has ${updatedDl.length} movies (replaced Bernie and Sightseers).`);

  // Update cyberpunk.json
  const cpPath = path.resolve("./web/data/packs/cyberpunk.json");
  const cyberpunkPack = JSON.parse(fs.readFileSync(cpPath, "utf-8"));
  const filteredCp = cyberpunkPack.filter(m => m.title !== "Dredd");
  const updatedCp = [...filteredCp, ...cyberpunkFormatted];
  fs.writeFileSync(cpPath, JSON.stringify(updatedCp, null, 2), "utf-8");
  console.log(`Updated cyberpunk.json: now has ${updatedCp.length} movies (replaced Dredd with Virtuosity).`);

  // Update fury.json
  const furyPath = path.resolve("./web/data/packs/fury.json");
  const furyPack = JSON.parse(fs.readFileSync(furyPath, "utf-8"));
  const ignoredTitles = new Set([
    "Whiplash", "Warrior", "Three Billboards Outside Ebbing, Missouri", "Promising Young Woman",
    "Ip Man", "The Revenant", "Bleed for This", "Cinderella Man", "Sisu", "The Crow",
    "Dark Waters", "Lady Vengeance", "The Fighter", "Gladiator", "Braveheart"
  ]);
  const keptFury = furyPack.filter(m => !ignoredTitles.has(m.title));
  const updatedFury = [...keptFury, ...furyFormatted];
  fs.writeFileSync(furyPath, JSON.stringify(updatedFury, null, 2), "utf-8");
  console.log(`Updated fury.json: now has ${updatedFury.length} movies (${keptFury.length} kept + ${furyFormatted.length} added).`);

  // Add Dredd to watched registries
  const watchedCachePath = path.resolve("./data/letterboxd_cache.json");
  const watchedCache = JSON.parse(fs.readFileSync(watchedCachePath, "utf-8"));
  if (!watchedCache.films.some(f => (f.name || "").toLowerCase() === "dredd")) {
    watchedCache.films.unshift({
      slug: "dredd",
      name: "Dredd",
      fullDisplayName: "Dredd (2012)",
      year: 2012,
      rating: 4.0,
      ratingStars: "★★★★",
      liked: true,
      hasReview: false,
      letterboxdUrl: "https://letterboxd.com/film/dredd/",
      watchedDate: "2026-10-16"
    });
    watchedCache.totalFilms = watchedCache.films.length;
    fs.writeFileSync(watchedCachePath, JSON.stringify(watchedCache, null, 2), "utf-8");
    console.log(`Added Dredd to letterboxd_cache.json (total now ${watchedCache.totalFilms})`);
  }

  const webWatchedPath = path.resolve("./web/data/letterboxd_watched.json");
  const webWatched = JSON.parse(fs.readFileSync(webWatchedPath, "utf-8"));
  if (!webWatched.some(f => (f.title || f.name || "").toLowerCase() === "dredd")) {
    webWatched.unshift({
      name: "Dredd",
      title: "Dredd",
      slug: "dredd",
      year: 2012,
      watchedDate: "2026-10-16",
      rating: 4.0
    });
    fs.writeFileSync(webWatchedPath, JSON.stringify(webWatched, null, 2), "utf-8");
    console.log(`Added Dredd to letterboxd_watched.json (total now ${webWatched.length})`);
  }

  // Clear undubbed_reports.json
  const reportsPath = path.resolve("./web/data/undubbed_reports.json");
  fs.writeFileSync(reportsPath, "[]\n", "utf-8");
  console.log("Cleared undubbed_reports.json to []");

  // Reset user_state.json
  const userStatePath = path.resolve("./web/data/user_state.json");
  const cleanUserState = {
    watched: [],
    ignored: [],
    comments: {},
    undubbed: []
  };
  fs.writeFileSync(userStatePath, JSON.stringify(cleanUserState, null, 2), "utf-8");
  console.log("Reset user_state.json to clean state.");

  console.log("All pending files updated successfully!");
}

run().catch(console.error);
