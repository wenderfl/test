const fs = require("fs");
const https = require("https");
const path = require("path");

const apiKey = "8d5e8777";

const internationalCyberpunk = [
  {
    id: "tt0347246",
    title: "Ghost in the Shell 2: Innocence",
    year: 2004,
    ptTitle: "Ghost in the Shell 2: A Inocência",
    category: "cyberpunk",
    slug: "ghost-in-the-shell-2-innocence",
    dubbingStudio: "Álamo / BKS",
    curatorNote: "Obra-prima visual e filosófica de Mamoru Oshii (Japão): Batou investiga ginóides assassinas que se autodestroem em um submundo transhumanista."
  },
  {
    id: "tt0401233",
    title: "Appleseed",
    year: 2004,
    ptTitle: "Appleseed: A Chave do Sobrevivente",
    category: "cyberpunk",
    slug: "appleseed",
    dubbingStudio: "Centauro",
    curatorNote: "Criação de Masamune Shirow (Japão): na metrópole utópica de Olympus, guerreiros cibernéticos desvendam um plano para erradicar os bioroids clonados."
  },
  {
    id: "tt0275277",
    title: "Cowboy Bebop: The Movie",
    year: 2001,
    ptTitle: "Cowboy Bebop: O Filme",
    category: "cyberpunk",
    slug: "cowboy-bebop-the-movie",
    dubbingStudio: "Álamo / Mastersound",
    curatorNote: "Shinichirō Watanabe (Japão): atentado terrorista com nanotecnologia viral na colônia de Marte desafia a tripulação da Bebop contra cobaias de guerra cibernética."
  },
  {
    id: "tt6574146",
    title: "BLAME!",
    year: 2017,
    ptTitle: "BLAME!",
    category: "cyberpunk",
    slug: "blame-2017",
    dubbingStudio: "TV Group Digital / Delart",
    curatorNote: "Distopia vertical colossal de Tsutomu Nihei (Japão): a Cidade cresce infinitamente fora de controle e robôs automatizados caçam humanos desprovidos de genes de rede."
  },
  {
    id: "tt20225374",
    title: "Vesper",
    year: 2022,
    ptTitle: "Vesper",
    category: "cyberpunk",
    slug: "vesper",
    dubbingStudio: "UniDub",
    curatorNote: "Ficção científica autoral europeia (Lituânia/França/Bélgica): pós-colapso genético onde oligarcas vivem em Cidadelas de biotecnologia e uma jovem faz biohacking para sobreviver."
  },
  {
    id: "tt0884335",
    title: "Chrysalis",
    year: 2007,
    ptTitle: "Chrysalis: Um Futuro Destruído",
    category: "cyberpunk",
    slug: "chrysalis-2007",
    dubbingStudio: "Clone",
    curatorNote: "Neo-noir futurista francês (França): Paris de 2025 com cirurgias clandestinas de reprogramação de memórias humanas e segredos militares de alta tecnologia."
  },
  {
    id: "tt0314063",
    title: "Immortal",
    year: 2004,
    ptTitle: "Imortal (Ad Vitam)",
    category: "cyberpunk",
    slug: "immortal-ad-vitam",
    dubbingStudio: "Herbert Richers / Clone",
    curatorNote: "Enki Bilal (França/Itália/Reino Unido): metrópole flutuante de 2095 dominada pela megacorporação genética Eugenics, humanos sintetizados e deuses egípcios imortais."
  },
  {
    id: "tt0378428",
    title: "Natural City",
    year: 2003,
    ptTitle: "Natural City",
    category: "cyberpunk",
    slug: "natural-city",
    dubbingStudio: "Clone / Herbert Richers",
    curatorNote: "Marco do cinema cyberpunk sul-coreano (Coreia do Sul): policiais militares encarregados de caçar ciborgues de combate antes de sua obsolescência de 3 anos."
  },
  {
    id: "tt0405821",
    title: "Casshern",
    year: 2004,
    ptTitle: "Casshern: Reencarnação do Mal",
    category: "cyberpunk",
    slug: "casshern",
    dubbingStudio: "Clone",
    curatorNote: "Kazuaki Kiriya (Japão): Ásia militarista distópica onde engenharia de neo-células reconstrói corpos humanos e desencadeia a revolta armada dos neo-humanos bio-cibernéticos."
  },
  {
    id: "tt0353014",
    title: "Wonderful Days",
    year: 2003,
    ptTitle: "Wonderful Days: Dias Maravilhosos",
    category: "cyberpunk",
    slug: "wonderful-days",
    dubbingStudio: "Clone / Herbert Richers",
    curatorNote: "Kim Moon-saeng (Coreia do Sul): a suntuosa cidade de Ecoban converte poluição e chuva ácida em energia cibernética enquanto exclui a população dos ermos."
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
  console.log("Fetching OMDb metadata for 10 international cyberpunk movies...");
  const newMovies = [];
  for (const item of internationalCyberpunk) {
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
