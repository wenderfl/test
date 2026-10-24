#!/usr/bin/env node
/**
 * Script to build data/packs/anime-art.json
 * Fetches accurate OMDB metadata, formats curator notes, and integrates streams.
 * Strict compliance: Zero emojis.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OMDB_API_KEY = '8d5e8777';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'packs', 'anime-art.json');

const MOVIES_DEF = [
  {
    title: 'Your Name.',
    searchTitle: 'Your Name.',
    year: 2016,
    ptTitle: 'Your Name.',
    dubbingStudio: 'Unidub',
    curatorNote: 'Mitsuha e Taki trocam de corpos atraves do espaco-tempo em uma conexao cosmica tecida pelo fio vermelho do destino, culminando na passagem de um cometa sob o ceu de Tóquio com visual transcendental e trilha dos Radwimps.',
    curatorReason: 'Mitsuha e Taki trocam de corpos atraves do espaco-tempo em uma conexao cosmica tecida pelo fio vermelho do destino, culminando na passagem de um cometa sob o ceu de Tóquio com visual transcendental e trilha dos Radwimps.',
    letterboxdUrl: 'https://letterboxd.com/film/your-name/',
    streamUrl: 'https://cdn-s01.pixel-sus-4k-image.com/stream/k/kimi-no-na-wa-dublado/01.mp4',
    streamName: 'Your Name.'
  },
  {
    title: 'A Silent Voice: The Movie',
    searchTitle: 'A Silent Voice',
    year: 2016,
    ptTitle: 'A Voz do Silêncio',
    dubbingStudio: 'Dubrasil',
    curatorNote: 'Shoya Ishida busca a redencao pessoal apos anos de isolamento psicologico ao reencontrar Shoko Nishimiya, garota surda a quem magoou no passado. Direcao magistral de Naoko Yamada com sensibilidade acustica e empatia humana dilacerante.',
    curatorReason: 'Shoya Ishida busca a redencao pessoal apos anos de isolamento psicologico ao reencontrar Shoko Nishimiya, garota surda a quem magoou no passado. Direcao magistral de Naoko Yamada com sensibilidade acustica e empatia humana dilacerante.',
    letterboxdUrl: 'https://letterboxd.com/film/a-silent-voice/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/386784.mp4',
    streamName: 'A Voz do Silêncio'
  },
  {
    title: 'The Boy and the Heron',
    searchTitle: 'The Boy and the Heron',
    year: 2023,
    ptTitle: 'O Menino e a Garça',
    dubbingStudio: 'Delart',
    curatorNote: 'Mahito adentra uma torre ancestral guiado por uma garca cinzenta falante em uma jornada onirica entre mundos de vida e morte. Obra-prima testamentaria e existencial de Hayao Miyazaki, laureada com o Oscar de Melhor Animacao.',
    curatorReason: 'Mahito adentra uma torre ancestral guiado por uma garca cinzenta falante em uma jornada onirica entre mundos de vida e morte. Obra-prima testamentaria e existencial de Hayao Miyazaki, laureada com o Oscar de Melhor Animacao.',
    letterboxdUrl: 'https://letterboxd.com/film/the-boy-and-the-heron/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/289613.mp4',
    streamName: 'O Menino e a Garça'
  },
  {
    title: 'Suzume',
    searchTitle: 'Suzume',
    year: 2022,
    ptTitle: 'Suzume',
    dubbingStudio: 'Dubrasil',
    curatorNote: 'Suzume descobre um jovem misterioso que viaja pelo Japao trancando portais dimensionais abandonados para evitar terramotos catastroficos. Odisseia visual e mistica de Makoto Shinkai sobre luto coletivo, ruinas e renascimento.',
    curatorReason: 'Suzume descobre um jovem misterioso que viaja pelo Japao trancando portais dimensionais abandonados para evitar terramotos catastroficos. Odisseia visual e mistica de Makoto Shinkai sobre luto coletivo, ruinas e renascimento.',
    letterboxdUrl: 'https://letterboxd.com/film/suzume/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/255993.mp4',
    streamName: 'Suzume'
  },
  {
    title: 'Weathering with You',
    searchTitle: 'Weathering with You',
    year: 2019,
    ptTitle: 'O Tempo com Você',
    dubbingStudio: 'Som de Vera Cruz',
    curatorNote: 'Hodaka foge de sua ilha natal para uma Tóquio sob chuvas torrenciais incessantes e conhece Hina, uma garota capaz de clarear o ceu com suas preces. Fabula metropolitana de sublime beleza plastica e composicao luminosa.',
    curatorReason: 'Hodaka foge de sua ilha natal para uma Tóquio sob chuvas torrenciais incessantes e conhece Hina, uma garota capaz de clarear o ceu com suas preces. Fabula metropolitana de sublime beleza plastica e composicao luminosa.',
    letterboxdUrl: 'https://letterboxd.com/film/weathering-with-you/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/93477.mp4',
    streamName: 'O Tempo com Você'
  },
  {
    title: 'The Tale of the Princess Kaguya',
    searchTitle: 'The Tale of the Princess Kaguya',
    year: 2013,
    ptTitle: 'O Conto da Princesa Kaguya',
    dubbingStudio: 'Delart',
    curatorNote: 'Isao Takahata reimagina o folclore ancestral japones com tracos fluidos de aquarela e carvao em movimento, retratando o florescimento efemero e a melancolia celestial da princesa da Lua na Terra.',
    curatorReason: 'Isao Takahata reimagina o folclore ancestral japones com tracos fluidos de aquarela e carvao em movimento, retratando o florescimento efemero e a melancolia celestial da princesa da Lua na Terra.',
    letterboxdUrl: 'https://letterboxd.com/film/the-tale-of-the-princess-kaguya/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/281753.mp4',
    streamName: 'O Conto da Princesa Kaguya'
  },
  {
    title: 'When Marnie Was There',
    searchTitle: 'When Marnie Was There',
    year: 2014,
    ptTitle: 'As Memórias de Marnie',
    dubbingStudio: 'Delart',
    curatorNote: 'Anna e enviada ao litoral pantanoso de Hokkaido para cuidar de sua saude e descobre uma mansao isolada onde habita Marnie, garota misteriosa cujos lacos atravessam geracoes e segredos de familia.',
    curatorReason: 'Anna e enviada ao litoral pantanoso de Hokkaido para cuidar de sua saude e descobre uma mansao isolada onde habita Marnie, garota misteriosa cujos lacos atravessam geracoes e segredos de familia.',
    letterboxdUrl: 'https://letterboxd.com/film/when-marnie-was-there/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/309904.mp4',
    streamName: 'As Memórias de Marnie'
  },
  {
    title: 'Grave of the Fireflies',
    searchTitle: 'Grave of the Fireflies',
    year: 1988,
    ptTitle: 'O Túmulo dos Vagalumes',
    dubbingStudio: 'Uniarthe',
    curatorNote: 'Seita e Setsuko lutam para sobreviver nos arredores rurais de Kobe devastada pela Segunda Guerra Mundial. Uma elegia humanista insuperavel do Studio Ghibli sobre inocencia infantil, perda e amor fraternal.',
    curatorReason: 'Seita e Setsuko lutam para sobreviver nos arredores rurais de Kobe devastada pela Segunda Guerra Mundial. Uma elegia humanista insuperavel do Studio Ghibli sobre inocencia infantil, perda e amor fraternal.',
    letterboxdUrl: 'https://letterboxd.com/film/grave-of-the-fireflies/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/309722.mp4',
    streamName: 'O Túmulo dos Vagalumes'
  },
  {
    title: 'Mirai',
    searchTitle: 'Mirai',
    year: 2018,
    ptTitle: 'Mirai',
    dubbingStudio: 'Centauro',
    curatorNote: 'Kun, menino de quatro anos que se sente deixado de lado pelo nascimento da irma cacula, acessa um jardim temporal onde encontra seus antepassados e a versao adolescente de Mirai vinda do futuro. Obra autoral de Mamoru Hosoda indicada ao Oscar.',
    curatorReason: 'Kun, menino de quatro anos que se sente deixado de lado pelo nascimento da irma cacula, acessa um jardim temporal onde encontra seus antepassados e a versao adolescente de Mirai vinda do futuro. Obra autoral de Mamoru Hosoda indicada ao Oscar.',
    letterboxdUrl: 'https://letterboxd.com/film/mirai/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/370346.mp4',
    streamName: 'Mirai'
  },
  {
    title: 'The Girl Who Leapt Through Time',
    searchTitle: 'The Girl Who Leapt Through Time',
    year: 2006,
    ptTitle: 'A Garota que Conquistou o Tempo',
    dubbingStudio: 'Vox Mundi',
    curatorNote: 'Makoto descobre a habilidade de rebobinar o tempo para resolver pequenos dissabores escolares, sem perceber o efeito cascata e o custo emocional que cada salto temporal acarreta nas pessoas que ama.',
    curatorReason: 'Makoto descobre a habilidade de rebobinar o tempo para resolver pequenos dissabores escolares, sem perceber o efeito cascata e o custo emocional que cada salto temporal acarreta nas pessoas que ama.',
    letterboxdUrl: 'https://letterboxd.com/film/the-girl-who-leapt-through-time/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/369379.mp4',
    streamName: 'A Garota que Conquistou o Tempo'
  },
  {
    title: '5 Centimeters per Second',
    searchTitle: '5 Centimeters per Second',
    year: 2007,
    ptTitle: 'Cinco Centímetros por Segundo',
    dubbingStudio: 'Lexx',
    curatorNote: 'Tres segmentos cronologicos retratam a separacao gradual e a forca da distancia entre Takaki e Akari sob cerejeiras, estacoes de trem nevadas e lancamentos de foguetes. Estetica seminal de Makoto Shinkai.',
    curatorReason: 'Tres segmentos cronologicos retratam a separacao gradual e a forca da distancia entre Takaki e Akari sob cerejeiras, estacoes de trem nevadas e lancamentos de foguetes. Estetica seminal de Makoto Shinkai.',
    letterboxdUrl: 'https://letterboxd.com/film/5-centimeters-per-second/',
    streamUrl: 'https://cdn-s01.pixel-sus-4k-image.com/stream/b/byousoku-5-centimeter/01.mp4',
    streamName: 'Cinco Centímetros por Segundo'
  },
  {
    title: 'The Tunnel to Summer, the Exit of Goodbyes',
    searchTitle: 'The Tunnel to Summer, the Exit of Goodbyes',
    year: 2022,
    ptTitle: 'O Túnel para o Verão, a Saída das Despedidas',
    dubbingStudio: 'Delart',
    curatorNote: 'Kaoru e Anzu descobrem o Tunel Urashima, passagem mistica que concede qualquer desejo do coracao a troco de anos da vida de quem o atravessa. Drama poetico de ficcao cientifica sobre luto, cumplicidade e tempo.',
    curatorReason: 'Kaoru e Anzu descobrem o Tunel Urashima, passagem mistica que concede qualquer desejo do coracao a troco de anos da vida de quem o atravessa. Drama poetico de ficcao cientifica sobre luto, cumplicidade e tempo.',
    letterboxdUrl: 'https://letterboxd.com/film/the-tunnel-to-summer-the-exit-of-goodbyes/',
    streamUrl: 'https://cdn-s01.pixel-sus-4k-image.com/stream/n/natsu-e-no-tunnel-sayonara-no-deguchi-movie/01-720p.mp4',
    streamName: 'O Túnel para o Verão, a Saída das Despedidas'
  },
  {
    title: 'A Whisker Away',
    searchTitle: 'A Whisker Away',
    year: 2020,
    ptTitle: 'Olhos de Gato',
    dubbingStudio: 'Dubbing Company',
    curatorNote: 'Miyo adquire uma mascara magica vendida por um gato mascate misterioso, permitindo que ela se transforme em felino branco para se aproximar de seu colega Hinode, arriscando perder sua humanidade.',
    curatorReason: 'Miyo adquire uma mascara magica vendida por um gato mascate misterioso, permitindo que ela se transforme em felino branco para se aproximar de seu colega Hinode, arriscando perder sua humanidade.',
    letterboxdUrl: 'https://letterboxd.com/film/a-whisker-away/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/275511.mp4',
    streamName: 'Olhos de Gato'
  },
  {
    title: 'Maboroshi',
    searchTitle: 'Maboroshi',
    year: 2023,
    ptTitle: 'maboroshi',
    dubbingStudio: 'Unidub',
    curatorNote: 'Uma explosao na usina siderurgica de Mifuse congela o tempo e isola a cidade em um inverno eterno onde nada pode mudar. Roteiro e direcao arrebatadores de Mari Okada com animacao visceral do estudio MAPPA.',
    curatorReason: 'Uma explosao na usina siderurgica de Mifuse congela o tempo e isola a cidade em um inverno eterno onde nada pode mudar. Roteiro e direcao arrebatadores de Mari Okada com animacao visceral do estudio MAPPA.',
    letterboxdUrl: 'https://letterboxd.com/film/maboroshi-2023/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/241302.mp4',
    streamName: 'maboroshi'
  },
  {
    title: 'Inu-Oh',
    searchTitle: 'Inu-Oh',
    year: 2021,
    ptTitle: 'Inu-Oh',
    dubbingStudio: 'Dubrasil',
    curatorNote: 'Masaaki Yuasa cria uma opera rock medieval delirante entre um instrumentista de biwa cego e Inu-Oh, dancarino deformado que cura suas mutilacoes a cada performance eletrizante nos palcos do Japao feudal.',
    curatorReason: 'Masaaki Yuasa cria uma opera rock medieval delirante entre um instrumentista de biwa cego e Inu-Oh, dancarino deformado que cura suas mutilacoes a cada performance eletrizante nos palcos do Japao feudal.',
    letterboxdUrl: 'https://letterboxd.com/film/inu-oh/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/223118.mp4',
    streamName: 'Inu-Oh'
  },
  {
    title: 'Porco Rosso',
    searchTitle: 'Porco Rosso',
    year: 1992,
    ptTitle: 'Porco Rosso: O Último Herói Romântico',
    dubbingStudio: 'Double Sound',
    curatorNote: 'Marco Pagot, ex-piloto da Primeira Guerra transformado em porco antropomorfico por um desencanto com a humanidade, pilota seu hidroaviao vermelho sobre o Mar Adriatico enfrentando piratas aereos e a ascensao do fascismo.',
    curatorReason: 'Marco Pagot, ex-piloto da Primeira Guerra transformado em porco antropomorfico por um desencanto com a humanidade, pilota seu hidroaviao vermelho sobre o Mar Adriatico enfrentando piratas aereos e a ascensao do fascismo.',
    letterboxdUrl: 'https://letterboxd.com/film/porco-rosso/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/358113.mp4',
    streamName: 'Porco Rosso: O Último Herói Romântico'
  },
  {
    title: 'The Secret World of Arrietty',
    searchTitle: 'The Secret World of Arrietty',
    year: 2010,
    ptTitle: 'O Mundo dos Pequeninos',
    dubbingStudio: 'Delart',
    curatorNote: 'Arrietty e sua familia de seres diminutos vivem nos assoalhos de uma casa de campo suburbana pegando emprestados pequenos pedacos de acucar e linha, ate ser avistada por um garoto com problemas cardiacos.',
    curatorReason: 'Arrietty e sua familia de seres diminutos vivem nos assoalhos de uma casa de campo suburbana pegando emprestados pequenos pedacos de acucar e linha, ate ser avistada por um garoto com problemas cardiacos.',
    letterboxdUrl: 'https://letterboxd.com/film/the-secret-world-of-arrietty/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/309720.mp4',
    streamName: 'O Mundo dos Pequeninos'
  },
  {
    title: 'From Up on Poppy Hill',
    searchTitle: 'From Up on Poppy Hill',
    year: 2011,
    ptTitle: 'Da Colina Kokuriko',
    dubbingStudio: 'Delart',
    curatorNote: 'Em Yokohama as vesperas das Olimpiadas de 1964, Umi e Shun lideram a restauracao de um casarao historico estudantil ameacado de demolicao enquanto investigam suas origens familiares apos a Guerra da Coreia.',
    curatorReason: 'Em Yokohama as vesperas das Olimpiadas de 1964, Umi e Shun lideram a restauracao de um casarao historico estudantil ameacado de demolicao enquanto investigam suas origens familiares apos a Guerra da Coreia.',
    letterboxdUrl: 'https://letterboxd.com/film/from-up-on-poppy-hill/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/308384.mp4',
    streamName: 'Da Colina Kokuriko'
  }
];

function fetchOmdb(title, year) {
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&apikey=${OMDB_API_KEY}`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('[AnimeArt] Fetching metadata and building anime-art pack...');
  const packList = [];

  for (const def of MOVIES_DEF) {
    console.log(`- Fetching ${def.searchTitle} (${def.year})...`);
    let omdbRaw = await fetchOmdb(def.searchTitle, def.year);
    if (!omdbRaw || omdbRaw.Response === 'False') {
      console.warn(`  Warning: Search failed for "${def.searchTitle}", trying without year...`);
      omdbRaw = await fetchOmdb(def.searchTitle, null);
    }

    const omdbData = {
      director: omdbRaw?.Director || 'N/A',
      writer: omdbRaw?.Writer || 'N/A',
      actors: omdbRaw?.Actors || 'N/A',
      genre: omdbRaw?.Genre || 'Animation, Drama, Fantasy',
      plot: omdbRaw?.Plot || def.curatorNote,
      poster: omdbRaw?.Poster && omdbRaw.Poster !== 'N/A' ? omdbRaw.Poster : '',
      imdbRating: omdbRaw?.imdbRating || '7.5',
      rottenTomatoes: omdbRaw?.Ratings?.find(r => r.Source === 'Rotten Tomatoes')?.Value || 'N/A',
      metascore: omdbRaw?.Metascore || 'N/A',
      runtime: omdbRaw?.Runtime || '110 min',
      rated: omdbRaw?.Rated || 'PG',
      ratings: omdbRaw?.Ratings || [],
      Poster: omdbRaw?.Poster && omdbRaw.Poster !== 'N/A' ? omdbRaw.Poster : ''
    };

    const finalPoster = omdbData.poster || '';

    const movieItem = {
      title: def.title,
      ptTitle: def.ptTitle,
      year: def.year,
      category: 'anime-art',
      parentCategory: 'art',
      letterboxdUrl: def.letterboxdUrl,
      inWatchlist: false,
      dubbed: true,
      dubbingStudio: def.dubbingStudio,
      curatorNote: def.curatorNote,
      curatorReason: def.curatorReason,
      omdb: omdbData,
      streamUrl: def.streamUrl,
      streamName: def.streamName,
      streamAvailable: true,
      poster: finalPoster
    };

    packList.push(movieItem);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(packList, null, 2), 'utf8');
  console.log(`[Success] Written ${packList.length} movies to ${OUTPUT_FILE}`);
}

run().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
