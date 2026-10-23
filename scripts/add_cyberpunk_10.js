const fs = require("fs");
const https = require("https");
const path = require("path");

const apiKey = "8d5e8777";

const list = [
  {
    id: "tt0139809",
    title: "The Thirteenth Floor",
    year: 1999,
    ptTitle: "O 13º Andar",
    category: "cyberpunk",
    slug: "the-thirteenth-floor",
    dubbingStudio: "Herbert Richers",
    curatorNote: "Realidade virtual simulada de Los Angeles em 1937 escondendo uma conspiração corporativa de assassinatos e camadas de ilusão."
  },
  {
    id: "tt0105459",
    title: "Split Second",
    year: 1992,
    ptTitle: "O Massacre do Bairro Chinês",
    category: "cyberpunk",
    slug: "split-second",
    dubbingStudio: "Herbert Richers",
    curatorNote: "Londres futurista submersa e sombria: Rutger Hauer caça um monstro cibernético em um thriller neo-noir de alta adrenalina."
  },
  {
    id: "tt0104299",
    title: "Freejack",
    year: 1992,
    ptTitle: "Os Imortais",
    category: "cyberpunk",
    slug: "freejack",
    dubbingStudio: "Herbert Richers",
    curatorNote: "Caçadores do tempo sequestram corpos de pessoas à beira da morte no passado para servir de receptáculos à elite transhumanista."
  },
  {
    id: "tt0119794",
    title: "Nirvana",
    year: 1997,
    ptTitle: "Nirvana",
    category: "cyberpunk",
    slug: "nirvana",
    dubbingStudio: "Dublavídeo",
    curatorNote: "Cinema cyberpunk italiano autoral: programador viaja por enclaves distópicos para libertar o personagem senciente de seu videogame."
  },
  {
    id: "tt0386741",
    title: "Renaissance",
    year: 2006,
    ptTitle: "Renaissance",
    category: "cyberpunk",
    slug: "renaissance-2006",
    dubbingStudio: "Delart",
    curatorNote: "Paris futurista em animação noir de alto contraste: conspiração genética e busca por imortalidade na megacorporação Avalon."
  },
  {
    id: "tt0105698",
    title: "Universal Soldier",
    year: 1992,
    ptTitle: "Soldado Universal",
    category: "cyberpunk",
    slug: "universal-soldier",
    dubbingStudio: "Herbert Richers",
    curatorNote: "Programa militar clandestino reanima e cibernetiza soldados mortos, que recuperam suas memórias em um embate visceral."
  },
  {
    id: "tt0986263",
    title: "Surrogates",
    year: 2009,
    ptTitle: "Substitutos",
    category: "cyberpunk",
    slug: "surrogates",
    dubbingStudio: "Delart",
    curatorNote: "Humanidade reclusa operando clones robóticos perfeitos nas ruas; Bruce Willis em carne e osso investigando uma falha fatal."
  },
  {
    id: "tt1637688",
    title: "In Time",
    year: 2011,
    ptTitle: "O Preço do Amanhã",
    category: "cyberpunk",
    slug: "in-time",
    dubbingStudio: "Delart",
    curatorNote: "Andrew Niccol transforma o tempo biológico em moeda digital codificada no sangue, separando a elite imortal dos guetos decadentes."
  },
  {
    id: "tt0097138",
    title: "Cyborg",
    year: 1989,
    ptTitle: "Cyborg: O Dragão do Futuro",
    category: "cyberpunk",
    slug: "cyborg",
    dubbingStudio: "Herbert Richers",
    curatorNote: "Clássico cult de Albert Pyun com Van Damme: escolta de uma mulher ciborgue com os dados da cura biológica através da anarquia."
  },
  {
    id: "tt0851578",
    title: "Paprika",
    year: 2006,
    ptTitle: "Paprika",
    category: "cyberpunk",
    slug: "paprika-2006",
    dubbingStudio: "Clone",
    curatorNote: "Obra-prima de Satoshi Kon: dispositivo DC Mini hackeado funde sonhos com a realidade em uma alucinação visual cibernética incomparável."
  }
];

function fetchOmdb(id) {
  return new Promise((resolve, reject) => {
    const url = `https://www.omdbapi.com/?i=${id}&apikey=${apiKey}`;
    https.get(url, res => {
      let b = "";
      res.on("data", c => b += c);
      res.on("end", () => {
        try {
          resolve(JSON.parse(b));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

async function run() {
  console.log("Fetching OMDb metadata for 10 new cyberpunk movies...");
  const newMovies = [];
  for (const item of list) {
    console.log(`Fetching: ${item.title} (${item.id})`);
    const omdb = await fetchOmdb(item.id);
    newMovies.push({
      title: item.title,
      ptTitle: item.ptTitle,
      year: parseInt(item.year, 10),
      category: item.category,
      letterboxdUrl: `https://letterboxd.com/film/${item.slug}/`,
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
    });
  }

  const packPath = path.resolve("./web/data/packs/cyberpunk.json");
  const currentPack = JSON.parse(fs.readFileSync(packPath, "utf-8"));
  const updatedPack = [...currentPack, ...newMovies];

  fs.writeFileSync(packPath, JSON.stringify(updatedPack, null, 2), "utf-8");
  console.log(`Success: cyberpunk.json updated from ${currentPack.length} to ${updatedPack.length} movies!`);
}

run().catch(console.error);
