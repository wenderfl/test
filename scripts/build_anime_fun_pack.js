#!/usr/bin/env node
/**
 * Script to build data/packs/anime-fun.json
 * Creates lighthearted, fun, silly anime adventure category pack.
 * Strict compliance: Zero emojis, clean metadata, zero dependencies.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OMDB_API_KEY = '8d5e8777';
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'packs', 'anime-fun.json');

const MOVIES_DEF = [
  {
    title: 'SPY x FAMILY CODE: White',
    searchTitle: 'SPY x FAMILY CODE: White',
    year: 2023,
    ptTitle: 'SPY x FAMILY CÓDIGO: Branco',
    dubbingStudio: 'Dubrasil',
    curatorNote: 'Loid, Yor e a pequena Anya viajam em um passeio familiar de fim de semana nas montanhas que descamba em perseguicoes comicas, segredos de espionagem e doces roubados.',
    curatorReason: 'Loid, Yor e a pequena Anya viajam em um passeio familiar de fim de semana nas montanhas que descamba em perseguicoes comicas, segredos de espionagem e doces roubados.',
    letterboxdUrl: 'https://letterboxd.com/film/spy-x-family-code-white/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/284564.mp4',
    streamName: 'SPY x FAMILY CÓDIGO: Branco'
  },
  {
    title: 'KonoSuba: God\'s Blessing on this Wonderful World! Legend of Crimson',
    searchTitle: 'KonoSuba: God\'s Blessing on this Wonderful World! Legend of Crimson',
    year: 2019,
    ptTitle: 'KonoSuba: As Bênçãos de Deus Neste Mundo Maravilhoso! Legend of Crimson',
    dubbingStudio: 'Som de Vera Cruz',
    curatorNote: 'Kazuma e seu bando disfuncional viajam a vila natal dos Demonios Carmesins de Megumin em uma sequencia ininterrupta de piadas absurdas, explosoes exageradas e situacoes hilarias.',
    curatorReason: 'Kazuma e seu bando disfuncional viajam a vila natal dos Demonios Carmesins de Megumin em uma sequencia ininterrupta de piadas absurdas, explosoes exageradas e situacoes hilarias.',
    letterboxdUrl: 'https://letterboxd.com/film/konosuba-gods-blessing-on-this-wonderful-world-legend-of-crimson/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/373824.mp4',
    streamName: 'KonoSuba: Legend of Crimson'
  },
  {
    title: 'Dragon Ball Super: Super Hero',
    searchTitle: 'Dragon Ball Super: Super Hero',
    year: 2022,
    ptTitle: 'Dragon Ball Super: Super-Herói',
    dubbingStudio: 'Unidub',
    curatorNote: 'Piccolo e Gohan assumem o protagonismo em uma aventura colorida e descontraida contra os androides Gamma 1 e Gamma 2 da renascida Forca Red Ribbon com humor classico de Toriyama.',
    curatorReason: 'Piccolo e Gohan assumem o protagonismo em uma aventura colorida e descontraida contra os androides Gamma 1 e Gamma 2 da renascida Forca Red Ribbon com humor classico de Toriyama.',
    letterboxdUrl: 'https://letterboxd.com/film/dragon-ball-super-super-hero/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/202598.mp4',
    streamName: 'Dragon Ball Super: SUPER HERO'
  },
  {
    title: 'One Piece Film: Red',
    searchTitle: 'One Piece Film: Red',
    year: 2022,
    ptTitle: 'One Piece Film: Red',
    dubbingStudio: 'Uniarthe',
    curatorNote: 'Luffy e o bando do Chapeu de Palha comparecem ao concerto monumental da cantora Uta na ilha musical de Elegia, transformando a ilha em um show vibrante de energia e piratas.',
    curatorReason: 'Luffy e o bando do Chapeu de Palha comparecem ao concerto monumental da cantora Uta na ilha musical de Elegia, transformando a ilha em um show vibrante de energia e piratas.',
    letterboxdUrl: 'https://letterboxd.com/film/one-piece-film-red/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/380488.mp4',
    streamName: 'One Piece Film: Red'
  },
  {
    title: 'One Piece: Stampede',
    searchTitle: 'One Piece: Stampede',
    year: 2019,
    ptTitle: 'One Piece: Stampede',
    dubbingStudio: 'Uniarthe',
    curatorNote: 'O Festival dos Piratas reune centenas de tripulacoes em uma caca ao tesouro insana repleta de dinamismo, cameos historicos, bom humor e o espirito de liberdade dos mares.',
    curatorReason: 'O Festival dos Piratas reune centenas de tripulacoes em uma caca ao tesouro insana repleta de dinamismo, cameos historicos, bom humor e o espirito de liberdade dos mares.',
    letterboxdUrl: 'https://letterboxd.com/film/one-piece-stampede/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/173284.mp4',
    streamName: 'One Piece: Stampede'
  },
  {
    title: 'One Piece Film: Gold',
    searchTitle: 'One Piece Film: Gold',
    year: 2016,
    ptTitle: 'One Piece Gold: O Filme',
    dubbingStudio: 'Uniarthe',
    curatorNote: 'Gran Tesoro e a cidade-cassino flutuante mais luxuosa do mundo, onde Luffy e seus companheiros planejam um audacioso assalto aos cofres do imperador do ouro Gild Tesoro.',
    curatorReason: 'Gran Tesoro e a cidade-cassino flutuante mais luxuosa do mundo, onde Luffy e seus companheiros planejam um audacioso assalto aos cofres do imperador do ouro Gild Tesoro.',
    letterboxdUrl: 'https://letterboxd.com/film/one-piece-film-gold/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/339293.mp4',
    streamName: 'One Piece Gold: O Filme'
  },
  {
    title: 'Stand by Me Doraemon 2',
    searchTitle: 'Stand by Me Doraemon 2',
    year: 2020,
    ptTitle: 'Stand by Me Doraemon 2',
    dubbingStudio: 'Atma Entretenimento',
    curatorNote: 'Nobita viaja no tempo com os cacarecos de Doraemon para mostrar sua noiva a avo no passado, gerando confusoes temporais afetivas, gargalhadas e aventura domestica.',
    curatorReason: 'Nobita viaja no tempo com os cacarecos de Doraemon para mostrar sua noiva a avo no passado, gerando confusoes temporais afetivas, gargalhadas e aventura domestica.',
    letterboxdUrl: 'https://letterboxd.com/film/stand-by-me-doraemon-2/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/144865.mp4',
    streamName: 'STAND BY ME Doraemon 2'
  },
  {
    title: 'Lupin III vs. Cat\'s Eye',
    searchTitle: 'Lupin III vs. Cat\'s Eye',
    year: 2023,
    ptTitle: 'Lupin III vs. Olho de Gato',
    dubbingStudio: 'Vox Mundi',
    curatorNote: 'O ladrao cavalheiro Arsene Lupin III e as tres irmas ladras de arte Kisugi competem pelos tres quadros perdidos do pintor Michael Heinz em perseguicoes estilosas e bem-humoradas.',
    curatorReason: 'O ladrao cavalheiro Arsene Lupin III e as tres irmas ladras de arte Kisugi competem pelos tres quadros perdidos do pintor Michael Heinz em perseguicoes estilosas e bem-humoradas.',
    letterboxdUrl: 'https://letterboxd.com/film/lupin-iii-vs-cats-eye/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/186452.mp4',
    streamName: 'LUPIN III vs. CAT’S EYE'
  },
  {
    title: 'Dragon Ball Z: Fusion Reborn',
    searchTitle: 'Dragon Ball Z: Fusion Reborn',
    year: 1995,
    ptTitle: 'Dragon Ball Z: Uma Nova Fusão',
    dubbingStudio: 'Álamo',
    curatorNote: 'Um acidente no tanque purificador do Inferno liberta as almas malignas e traz viloes comicos de volta a Terra, obrigando Goku e Vegeta a realizarem a hilariante danca da fusao.',
    curatorReason: 'Um acidente no tanque purificador do Inferno liberta as almas malignas e traz viloes comicos de volta a Terra, obrigando Goku e Vegeta a realizarem a hilariante danca da fusao.',
    letterboxdUrl: 'https://letterboxd.com/film/dragon-ball-z-fusion-reborn/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/131051.mp4',
    streamName: 'Dragon Ball Z: Uma Nova Fusão'
  },
  {
    title: 'Dragon Ball Z: Wrath of the Dragon',
    searchTitle: 'Dragon Ball Z: Wrath of the Dragon',
    year: 1995,
    ptTitle: 'Dragon Ball Z: O Ataque do Dragão',
    dubbingStudio: 'Álamo',
    curatorNote: 'Trunks desenvolve afeto pelo jovem heroi Tapion, que carrega em seu corpo a ocarina e a metade do demonio gigante Hirudegarn em uma classica aventura mitologica urbana.',
    curatorReason: 'Trunks desenvolve afeto pelo jovem heroi Tapion, que carrega em seu corpo a ocarina e a metade do demonio gigante Hirudegarn em uma classica aventura mitologica urbana.',
    letterboxdUrl: 'https://letterboxd.com/film/dragon-ball-z-wrath-of-the-dragon/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/373816.mp4',
    streamName: 'Dragon Ball Z: O Ataque do Dragão'
  },
  {
    title: 'Dragon Ball Z: Resurrection \'F\'',
    searchTitle: 'Dragon Ball Z: Resurrection \'F\'',
    year: 2015,
    ptTitle: 'Dragon Ball Z: O Renascimento de Freeza',
    dubbingStudio: 'Unidub',
    curatorNote: 'Sorbet usa as Esferas do Dragao para reviver Freeza, que retorna em forma dourada para um confronto explosivo contra os Guerreiros Z com ritmo rapido e tiradas bem-humoradas de Whis e Beerus.',
    curatorReason: 'Sorbet usa as Esferas do Dragao para reviver Freeza, que retorna em forma dourada para um confronto explosivo contra os Guerreiros Z com ritmo rapido e tiradas bem-humoradas de Whis e Beerus.',
    letterboxdUrl: 'https://letterboxd.com/film/dragon-ball-z-resurrection-f/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/131054.mp4',
    streamName: 'Dragon Ball Z: O Renascimento de Freeza'
  },
  {
    title: 'Dragon Ball: The Path to Power',
    searchTitle: 'Dragon Ball: The Path to Power',
    year: 1996,
    ptTitle: 'Dragon Ball: A Caminho do Poder',
    dubbingStudio: 'Álamo',
    curatorNote: 'Recontagem nostagica e descontraida dos primordios de Goku conhecendo Bulma, Oolong e Mestre Kame em sua jornada juvenil de aventura e artes marciais contra a Red Ribbon.',
    curatorReason: 'Recontagem nostagica e descontraida dos primordios de Goku conhecendo Bulma, Oolong e Mestre Kame em sua jornada juvenil de aventura e artes marciais contra a Red Ribbon.',
    letterboxdUrl: 'https://letterboxd.com/film/dragon-ball-the-path-to-power/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/112384.mp4',
    streamName: 'Dragon Ball: A Caminho do Poder'
  },
  {
    title: 'Dragon Ball: Curse of the Blood Rubies',
    searchTitle: 'Dragon Ball: Curse of the Blood Rubies',
    year: 1986,
    ptTitle: 'Dragon Ball: A Lenda de Shenlong',
    dubbingStudio: 'BKS',
    curatorNote: 'Primeiro filme historico da franquia, acompanhando o pequeno Goku em sua nuvem voadora ajudando a jovem Pansy contra o tirano Rei Gurumes e seus lacaios gulosos.',
    curatorReason: 'Primeiro filme historico da franquia, acompanhando o pequeno Goku em sua nuvem voadora ajudando a jovem Pansy contra o tirano Rei Gurumes e seus lacaios gulosos.',
    letterboxdUrl: 'https://letterboxd.com/film/dragon-ball-curse-of-the-blood-rubies/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/20343.mp4',
    streamName: 'Dragon Ball: A Lenda de Shenlong'
  },
  {
    title: 'Boruto: Naruto the Movie',
    searchTitle: 'Boruto: Naruto the Movie',
    year: 2015,
    ptTitle: 'Boruto: Naruto O Filme',
    dubbingStudio: 'CBS',
    curatorNote: 'Boruto treina com Sasuke para tentar impressionar seu pai durante os Exames Chunin de Konoha, culminando em uma batalha energica e cheia de dinamismo e espirituosidade.',
    curatorReason: 'Boruto treina com Sasuke para tentar impressionar seu pai durante os Exames Chunin de Konoha, culminando em uma batalha energica e cheia de dinamismo e espirituosidade.',
    letterboxdUrl: 'https://letterboxd.com/film/boruto-naruto-the-movie/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/300823.mp4',
    streamName: 'Boruto: Naruto O Filme'
  },
  {
    title: 'Jujutsu Kaisen 0',
    searchTitle: 'Jujutsu Kaisen 0',
    year: 2021,
    ptTitle: 'Jujutsu Kaisen 0: O Filme',
    dubbingStudio: 'Som de Vera Cruz',
    curatorNote: 'Yuta Okkotsu e acolhido por Satoru Gojo na Escola Jujutsu de Tóquio para dominar a poderosa maldicao de Rika ao lado de Panda, Maki e Toge em uma aventura agil e envolvente.',
    curatorReason: 'Yuta Okkotsu e acolhido por Satoru Gojo na Escola Jujutsu de Tóquio para dominar a poderosa maldicao de Rika ao lado de Panda, Maki e Toge em uma aventura agil e envolvente.',
    letterboxdUrl: 'https://letterboxd.com/film/jujutsu-kaisen-0/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/174618.mp4',
    streamName: 'Jujutsu Kaisen 0: O Filme'
  },
  {
    title: 'Yu-Gi-Oh! The Movie: Pyramid of Light',
    searchTitle: 'Yu-Gi-Oh! The Movie: Pyramid of Light',
    year: 2004,
    ptTitle: 'Yu-Gi-Oh! O Filme: Pirâmide de Luz',
    dubbingStudio: 'Parisi Vídeo',
    curatorNote: 'Yugi Muto e Kaiba duelam na cupula de batalha enquanto o antigo deus egipcio Anubis desperta para transformar o duelo em uma disputa magica cheia de monstros colossais e cartas miticas.',
    curatorReason: 'Yugi Muto e Kaiba duelam na cupula de batalha enquanto o antigo deus egipcio Anubis desperta para transformar o duelo em uma disputa magica cheia de monstros colossais e cartas miticas.',
    letterboxdUrl: 'https://letterboxd.com/film/yu-gi-oh-the-movie/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/375064.mp4',
    streamName: 'Yu-Gi-Oh! O Filme: Pirâmide de Luz'
  },
  {
    title: 'My Hero Academia: Two Heroes',
    searchTitle: 'My Hero Academia: Two Heroes',
    year: 2018,
    ptTitle: 'My Hero Academia: 2 Heróis - O Filme',
    dubbingStudio: 'Uniarthe',
    curatorNote: 'Midoriya e All Might visitam a ilha movel I-Island para um festival de tecnologia de herois quando viloes invadem o complexo de seguranca, exigindo cooperacao juvenil e combate animado.',
    curatorReason: 'Midoriya e All Might visitam a ilha movel I-Island para um festival de tecnologia de herois quando viloes invadem o complexo de seguranca, exigindo cooperacao juvenil e combate animado.',
    letterboxdUrl: 'https://letterboxd.com/film/my-hero-academia-two-heroes/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/29098.mp4',
    streamName: 'My Hero Academia: 2 Heróis - O Filme'
  },
  {
    title: 'My Hero Academia: You\'re Next',
    searchTitle: 'My Hero Academia: You\'re Next',
    year: 2024,
    ptTitle: 'My Hero Academia: Agora é a Sua Vez',
    dubbingStudio: 'Dubrasil',
    curatorNote: 'A turma 1-A enfrenta Dark Might, um impostor carismatico com poderes colossais que tenta usurpar o papel do antigo Simbolo da Paz em uma batalha divertida, dinamica e grandiosa.',
    curatorReason: 'A turma 1-A enfrenta Dark Might, um impostor carismatico com poderes colossais que tenta usurpar o papel do antigo Simbolo da Paz em uma batalha divertida, dinamica e grandiosa.',
    letterboxdUrl: 'https://letterboxd.com/film/my-hero-academia-youre-next/',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/319067.mp4',
    streamName: 'My Hero Academia: Agora é a Sua Vez'
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
  console.log('[AnimeFun] Fetching metadata and building anime-fun pack...');
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
      genre: omdbRaw?.Genre || 'Animation, Action, Adventure, Comedy',
      plot: omdbRaw?.Plot || def.curatorNote,
      poster: omdbRaw?.Poster && omdbRaw.Poster !== 'N/A' ? omdbRaw.Poster : '',
      imdbRating: omdbRaw?.imdbRating || '7.5',
      rottenTomatoes: omdbRaw?.Ratings?.find(r => r.Source === 'Rotten Tomatoes')?.Value || 'N/A',
      metascore: omdbRaw?.Metascore || 'N/A',
      runtime: omdbRaw?.Runtime || '100 min',
      rated: omdbRaw?.Rated || 'PG',
      ratings: omdbRaw?.Ratings || [],
      Poster: omdbRaw?.Poster && omdbRaw.Poster !== 'N/A' ? omdbRaw.Poster : ''
    };

    const finalPoster = omdbData.poster || '';

    const movieItem = {
      title: def.title,
      ptTitle: def.ptTitle,
      year: def.year,
      category: 'anime-fun',
      parentCategory: 'besteirol',
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
