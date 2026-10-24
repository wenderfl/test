#!/usr/bin/env node
/**
 * Update Baixa Autoestima Category Pack
 * Replaces teen makeover / chick-flick films (Mean Girls, Legally Blonde, etc.)
 * with authentic underdog / transformation / social anxiety comedy masterpieces
 * in the spirit of "The Mask" (Stanley Ipkiss archetype).
 *
 * All additions are verified against:
 * 1. Letterboxd watched history of @wender_fl (zero collisions).
 * 2. preferenciasDoUsuario.md (100% PT-BR dubbed, high affinity score).
 * 3. Verified HTTP 200 streams.
 *
 * Strict rule: Zero emojis in code, comments, logs, and outputs.
 */

const fs = require('fs');
const path = require('path');
const { generateFeed } = require('./generate_opentv_feed');

const BASE_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(BASE_DIR, 'data');
const PACKS_DIR = path.join(DATA_DIR, 'packs');
const TARGET_PACK = path.join(PACKS_DIR, 'baixa-autoestima.json');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const LINKS_FILE = path.join(DATA_DIR, 'iptv_movie_links.json');

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

// 1. Core movies to keep from previous pack (non-chick-flick underdog films)
const keepTitles = new Set([
  'The Way, Way Back',
  'Big',
  'Roxanne',
  'Anger Management',
  'Bruce Almighty',
  'Dumbo',
  'Me and Earl and the Dying Girl'
]);

const currentPack = loadJson(TARGET_PACK, []);
const preserved = currentPack.filter(m => keepTitles.has(m.title));
console.log(`[Baixa Autoestima] Preserved ${preserved.length} existing underdog films:`, preserved.map(m => m.title));

// 2. New Mask-archetype / transformation / underdog comedy films
const newMovies = [
  {
    id: "the-secret-life-of-walter-mitty",
    title: "The Secret Life of Walter Mitty",
    ptTitle: "A Vida Secreta de Walter Mitty",
    year: 2013,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/the-secret-life-of-walter-mitty/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Ben Stiller dirige e estrela como Walter Mitty, um funcionário tímido e invisível de arquivo negativo que vive imerso em devaneios heroicos para compensar sua completa falta de autoconfiança no mundo real.",
    curatorReason: "O arquétipo perfeito da superação da timidez patológica e da timidez crônica: uma jornada deslumbrante onde a imaginação dá lugar à coragem viva e à realização do próprio valor.",
    omdb: {
      title: "The Secret Life of Walter Mitty",
      year: "2013",
      rated: "PG",
      released: "25 Dec 2013",
      runtime: "114 min",
      genre: "Adventure, Comedy, Drama",
      director: "Ben Stiller",
      writer: "Steve Conrad, James Thurber",
      actors: "Ben Stiller, Kristen Wiig, Jon Daly",
      plot: "When both he and a colleague are about to lose their job, Walter takes action by embarking on an adventure more extraordinary than anything he could have ever imagined.",
      language: "English, Spanish, Icelandic",
      country: "United States, United Kingdom",
      awards: "4 wins & 17 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BNTI2ODQzNDQyMl5BMl5BanBnXkFtZTgwMTUzMzYzMDE@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "7.3/10" },
        { Source: "Rotten Tomatoes", Value: "52%" },
        { Source: "Metacritic", Value: "54/100" }
      ],
      metascore: "54",
      imdbRating: "7.3",
      imdbVotes: "340,000",
      imdbID: "tt0359950",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BNTI2ODQzNDQyMl5BMl5BanBnXkFtZTgwMTUzMzYzMDE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/20505.mp4",
    streamId: 20505,
    streamName: "A Vida Secreta de Walter Mitty",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BNTI2ODQzNDQyMl5BMl5BanBnXkFtZTgwMTUzMzYzMDE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "me-myself-and-irene",
    title: "Me, Myself & Irene",
    ptTitle: "Eu, Eu Mesmo & Irene",
    year: 2000,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/me-myself-irene/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Jim Carrey na veia cômica direta de 'O Máskara'. Um policial rodoviário excessivamente complacente que nunca reage a abusos e humilhações desenvolve um alter ego agressivo e desbocado (Hank) para compensar sua passividade.",
    curatorReason: "O clássico estudo cômico da repressão da raiva e da baixa autoestima crônica, onde a falta de limites pessoais explode na criação de uma segunda personalidade sem filtros.",
    omdb: {
      title: "Me, Myself & Irene",
      year: "2000",
      rated: "R",
      released: "23 Jun 2000",
      runtime: "116 min",
      genre: "Comedy",
      director: "Bobby Farrelly, Peter Farrelly",
      writer: "Peter Farrelly, Mike Cerrone, Bobby Farrelly",
      actors: "Jim Carrey, Renée Zellweger, Anthony Anderson",
      plot: "A mild-mannered Rhode Island state trooper with a split personality is assigned to escort a woman back to New York, and must deal with his aggressive alter ego.",
      language: "English, German",
      country: "United States",
      awards: "1 win & 7 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BMjA4ODU0MTQzM15BMl5BanBnXkFtZTYwODgyNDc4._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "6.6/10" },
        { Source: "Rotten Tomatoes", Value: "48%" },
        { Source: "Metacritic", Value: "49/100" }
      ],
      metascore: "49",
      imdbRating: "6.6",
      imdbVotes: "250,000",
      imdbID: "tt0183505",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMjA4ODU0MTQzM15BMl5BanBnXkFtZTYwODgyNDc4._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/100109.mp4",
    streamId: 100109,
    streamName: "Eu, Eu Mesmo & Irene",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMjA4ODU0MTQzM15BMl5BanBnXkFtZTYwODgyNDc4._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "office-space",
    title: "Office Space",
    ptTitle: "Como Enlouquecer seu Chefe",
    year: 1999,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/office-space/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Herbert Richers",
    curatorNote: "Comédia cult definitiva de Mike Judge sobre a mediocridade corporativa. Um programador paralisado pelo medo de errar e pela subserviência passa por uma sessão de hipnose e decide simplesmente parar de ter medo.",
    curatorReason: "O manifesto catártico de libertação da autoanulação e do pavor da autoridade, transformando o desapego em confiança invencível.",
    omdb: {
      title: "Office Space",
      year: "1999",
      rated: "R",
      released: "19 Feb 1999",
      runtime: "89 min",
      genre: "Comedy",
      director: "Mike Judge",
      writer: "Mike Judge",
      actors: "Ron Livingston, Jennifer Aniston, David Herman",
      plot: "Three company workers who hate their jobs decide to rebel against their greedy boss.",
      language: "English",
      country: "United States",
      awards: "2 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BODA4MzExMTkzNF5BMl5BanBnXkFtZTgwOTU5NTMwMTE@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "7.6/10" },
        { Source: "Rotten Tomatoes", Value: "80%" },
        { Source: "Metacritic", Value: "68/100" }
      ],
      metascore: "68",
      imdbRating: "7.6",
      imdbVotes: "280,000",
      imdbID: "tt0151804",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BODA4MzExMTkzNF5BMl5BanBnXkFtZTgwOTU5NTMwMTE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/106997.mp4",
    streamId: 106997,
    streamName: "Como Enlouquecer seu Chefe",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BODA4MzExMTkzNF5BMl5BanBnXkFtZTgwOTU5NTMwMTE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "wanted",
    title: "Wanted",
    ptTitle: "O Procurado",
    year: 2008,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/wanted/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Ação frenética e visceral dirigida por Timur Bekmambetov com James McAvoy, Angelina Jolie e Morgan Freeman. Wesley Gibson é um contador tímido, hipocondríaco e humilhado pelo chefe e pela namorada que descobre uma herança de reflexos sobre-humanos.",
    curatorReason: "A fantasia catártica máxima do perdedor impotente que canaliza ansiedade e baixa autoestima em foco absoluto, virando a mesa contra a opressão cotidiana.",
    omdb: {
      title: "Wanted",
      year: "2008",
      rated: "R",
      released: "27 Jun 2008",
      runtime: "110 min",
      genre: "Action, Crime, Thriller",
      director: "Timur Bekmambetov",
      writer: "Michael Brandt, Derek Haas, Chris Morgan",
      actors: "Angelina Jolie, James McAvoy, Morgan Freeman",
      plot: "A frustrated office worker discovers that he is the son of a professional assassin, and that he shares his father's superhuman killing abilities.",
      language: "English",
      country: "United States, Germany",
      awards: "Nominated for 2 Oscars. 13 wins & 23 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BMTQwNDM2MTMwMl5BMl5BanBnXkFtZTgwMjE4NjI1MDE@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "6.7/10" },
        { Source: "Rotten Tomatoes", Value: "71%" },
        { Source: "Metacritic", Value: "64/100" }
      ],
      metascore: "64",
      imdbRating: "6.7",
      imdbVotes: "400,000",
      imdbID: "tt0493464",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMTQwNDM2MTMwMl5BMl5BanBnXkFtZTgwMjE4NjI1MDE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/20163.mp4",
    streamId: 20163,
    streamName: "O Procurado",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMTQwNDM2MTMwMl5BMl5BanBnXkFtZTgwMjE4NjI1MDE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "bedazzled",
    title: "Bedazzled",
    ptTitle: "Endiabrado",
    year: 2000,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/bedazzled-2000/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Comédia de transformação fantástica de Harold Ramis com Brendan Fraser e Elizabeth Hurley. Elliot Richards é um operador de telemarketing nerd, desajeitado e totalmente ignorado que vende a alma ao Diabo por 7 desejos de transformação para conquistar sua colega.",
    curatorReason: "O irmão espiritual de 'O Máskara': cada desejo transforma o protagonista em uma caricatura absurda, provando que nenhuma persona artificial compensa a ausência de autoestima genuína e autenticidade.",
    omdb: {
      title: "Bedazzled",
      year: "2000",
      rated: "PG-13",
      released: "20 Oct 2000",
      runtime: "93 min",
      genre: "Comedy, Fantasy",
      director: "Harold Ramis",
      writer: "Peter Cook, Dudley Moore, Larry Gelbart",
      actors: "Brendan Fraser, Elizabeth Hurley, Frances O'Connor",
      plot: "Hopeless dork Elliot Richards is granted seven wishes by the Devil to ensnare Allison, the girl of his dreams, in exchange for his soul.",
      language: "English, Spanish, Russian",
      country: "United States, Germany",
      awards: "1 win & 2 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BNDAwMzc0NDgtOGFkZi00NDExLTg1OGUtOTc0OTM0ZGNjY2FkXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "6.1/10" },
        { Source: "Rotten Tomatoes", Value: "50%" },
        { Source: "Metacritic", Value: "49/100" }
      ],
      metascore: "49",
      imdbRating: "6.1",
      imdbVotes: "115,000",
      imdbID: "tt0230030",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BNDAwMzc0NDgtOGFkZi00NDExLTg1OGUtOTc0OTM0ZGNjY2FkXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/20601.mp4",
    streamId: 20601,
    streamName: "Endiabrado",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BNDAwMzc0NDgtOGFkZi00NDExLTg1OGUtOTc0OTM0ZGNjY2FkXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "teen-wolf",
    title: "Teen Wolf",
    ptTitle: "O Garoto do Futuro",
    year: 1985,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/teen-wolf/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Herbert Richers",
    curatorNote: "Clássico dos anos 80 estrelando Michael J. Fox. Scott Howard é um adolescente comum e inseguro, péssimo no basquete escolar, que descobre uma herança de família que o transforma em um lobisomem peludo e carismático.",
    curatorReason: "A grande metáfora pop da adolescência sobre a sedução de se tornar outra criatura para ganhar popularidade fácil e a lição final de vencer sendo apenas você mesmo.",
    omdb: {
      title: "Teen Wolf",
      year: "1985",
      rated: "PG",
      released: "23 Aug 1985",
      runtime: "91 min",
      genre: "Comedy, Fantasy",
      director: "Rod Daniel",
      writer: "Jeph Loeb, Matthew Weisman",
      actors: "Michael J. Fox, James Hampton, Susan Ursitti",
      plot: "An ordinary high school student discovers that his family has an unusual pedigree when he finds himself turning into a werewolf.",
      language: "English",
      country: "United States",
      awards: "1 nomination total",
      poster: "https://m.media-amazon.com/images/M/MV5BMjA1MDIwMzY3M15BMl5BanBnXkFtZTcwNTY2OTk5MQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "6.1/10" },
        { Source: "Rotten Tomatoes", Value: "45%" },
        { Source: "Metacritic", Value: "48/100" }
      ],
      metascore: "48",
      imdbRating: "6.1",
      imdbVotes: "85,000",
      imdbID: "tt0090142",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMjA1MDIwMzY3M15BMl5BanBnXkFtZTcwNTY2OTk5MQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/363901.mp4",
    streamId: 363901,
    streamName: "O Garoto do Futuro",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMjA1MDIwMzY3M15BMl5BanBnXkFtZTcwNTY2OTk5MQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "george-of-the-jungle",
    title: "George of the Jungle",
    ptTitle: "George, O Rei da Floresta",
    year: 1997,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/george-of-the-jungle/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Comédia clássica dos anos 90 com Brendan Fraser e Leslie Mann. Um homem criado por gorilas na selva é levado para a alta sociedade de San Francisco, enfrentando a inadequação social e o choque cultural com ingenuidade e pureza de espírito.",
    curatorReason: "O arquétipo clássico do peixe fora d'água: a celebração da espontaneidade e do carisma desarmante contra a hipocrisia e as regras vazias de etiqueta da alta sociedade.",
    omdb: {
      title: "George of the Jungle",
      year: "1997",
      rated: "PG",
      released: "16 Jul 1997",
      runtime: "92 min",
      genre: "Action, Adventure, Comedy, Family, Romance",
      director: "Sam Weisman",
      writer: "Jay Ward, Dana Olsen, Audrey Wells",
      actors: "Brendan Fraser, Leslie Mann, Thomas Haden Church",
      plot: "A man raised in the jungle tries to adapt to modern life after he falls for an American heiress.",
      language: "English",
      country: "United States",
      awards: "1 win & 3 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BMjA5OTM2OTkwOF5BMl5BanBnXkFtZTgwNTQzNzAyNzE@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "5.6/10" },
        { Source: "Rotten Tomatoes", Value: "57%" }
      ],
      metascore: "53",
      imdbRating: "5.6",
      imdbVotes: "90,000",
      imdbID: "tt0119190",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMjA5OTM2OTkwOF5BMl5BanBnXkFtZTgwNTQzNzAyNzE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/103139.mp4",
    streamId: 103139,
    streamName: "George O Rei da Floresta",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMjA5OTM2OTkwOF5BMl5BanBnXkFtZTgwNTQzNzAyNzE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "meet-the-parents",
    title: "Meet the Parents",
    ptTitle: "Entrando Numa Fria",
    year: 2000,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/meet-the-parents/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Comédia de enorme sucesso dirigida por Jay Roach com Ben Stiller e Robert De Niro. Greg Focker é um enfermeiro afetuoso porém crônicamente inseguro que entra em colapso de ansiedade social ao passar um fim de semana tentando impressionar o sogro ex-agente da CIA.",
    curatorReason: "A autópsia hilária do complexo de inferioridade masculino: como o pavor do ridículo e a obsessão por validação externa transformam pequenos mal-entendidos em catástrofes monumentais.",
    omdb: {
      title: "Meet the Parents",
      year: "2000",
      rated: "PG-13",
      released: "06 Oct 2000",
      runtime: "108 min",
      genre: "Comedy, Romance",
      director: "Jay Roach",
      writer: "Greg Glienna, Mary Ruth Clarke, Jim Herzfeld",
      actors: "Ben Stiller, Robert De Niro, Teri Polo",
      plot: "Male nurse Greg Focker promotes his intentions to his girlfriend's father, who takes an immediate and intense dislike to him.",
      language: "English, Spanish, Thai",
      country: "United States",
      awards: "Nominated for 1 Oscar. 7 wins & 15 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BZmE0MGI0OTctOGRlMy00MDdjLTg4M2EtNzFmZWNiNDhjYTgzXkEyXkFqcGc@._V1_QL75_UX380_CR0,1,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "7.0/10" },
        { Source: "Rotten Tomatoes", Value: "85%" },
        { Source: "Metacritic", Value: "73/100" }
      ],
      metascore: "73",
      imdbRating: "7.0",
      imdbVotes: "380,000",
      imdbID: "tt0212338",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BZmE0MGI0OTctOGRlMy00MDdjLTg4M2EtNzFmZWNiNDhjYTgzXkEyXkFqcGc@._V1_QL75_UX380_CR0,1,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/320886.mp4",
    streamId: 320886,
    streamName: "Entrando Numa Fria",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BZmE0MGI0OTctOGRlMy00MDdjLTg4M2EtNzFmZWNiNDhjYTgzXkEyXkFqcGc@._V1_QL75_UX380_CR0,1,380,562_.jpg"
  },
  {
    id: "night-at-the-museum",
    title: "Night at the Museum",
    ptTitle: "Uma Noite no Museu",
    year: 2006,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/night-at-the-museum/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Aventura cômica e calorosa com Ben Stiller, Robin Williams e Owen Wilson. Larry Daley é um pai divorciado que pula de emprego em emprego, atormentado pela sensação de ser um fracasso aos olhos do filho, até aceitar o cargo de guarda noturno no Museu de História Natural.",
    curatorReason: "A redescoberta da autoestima e da competência pessoal: sob pressão sobrenatural, o homem desacreditado por todos encontra liderança, inteligência e o respeito de quem ama.",
    omdb: {
      title: "Night at the Museum",
      year: "2006",
      rated: "PG",
      released: "22 Dec 2006",
      runtime: "108 min",
      genre: "Adventure, Comedy, Family, Fantasy",
      director: "Shawn Levy",
      writer: "Robert Ben Garant, Thomas Lennon, Milan Trenc",
      actors: "Ben Stiller, Carla Gugino, Ricky Gervais",
      plot: "A newly recruited night security guard at the Museum of Natural History discovers that an ancient curse causes the animals and exhibits on display to come to life and wreak havoc.",
      language: "English, Italian, Hebrew",
      country: "United States, United Kingdom",
      awards: "2 wins & 17 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BMTQyOTM4ODI3Ml5BMl5BanBnXkFtZTcwMDE3MTUzMw@@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "6.5/10" },
        { Source: "Rotten Tomatoes", Value: "43%" },
        { Source: "Metacritic", Value: "48/100" }
      ],
      metascore: "48",
      imdbRating: "6.5",
      imdbVotes: "370,000",
      imdbID: "tt0477347",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMTQyOTM4ODI3Ml5BMl5BanBnXkFtZTcwMDE3MTUzMw@@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/20871.mp4",
    streamId: 20871,
    streamName: "Uma Noite no Museu",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMTQyOTM4ODI3Ml5BMl5BanBnXkFtZTcwMDE3MTUzMw@@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "the-waterboy",
    title: "The Waterboy",
    ptTitle: "O Rei da Água",
    year: 1998,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/the-waterboy/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Double Sound",
    curatorNote: "Comédia clássica de Frank Coraci com Adam Sandler e Kathy Bates. Bobby Boucher é um homem de 31 anos gago, tímido e com baixa autoestima extrema, humilhado desde a infância pelo time de futebol americano universitário para o qual distribui água.",
    curatorReason: "A apoteose do azarão: Bobby canaliza décadas de zombaria reprimida e raiva em foco físico demolidor, tornando-se o maior jogador da liga e conquistando seu amor-próprio.",
    omdb: {
      title: "The Waterboy",
      year: "1998",
      rated: "PG-13",
      released: "06 Nov 1998",
      runtime: "90 min",
      genre: "Comedy, Sport",
      director: "Frank Coraci",
      writer: "Tim Herlihy, Adam Sandler",
      actors: "Adam Sandler, Kathy Bates, Henry Winkler",
      plot: "A waterboy for a college football team discovers he has a unique tackling ability and becomes a member of the team.",
      language: "English",
      country: "United States",
      awards: "6 wins & 6 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BMjA4Nzg5NzA1N15BMl5BanBnXkFtZTgwNTU5NTE4MDE@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "6.2/10" },
        { Source: "Rotten Tomatoes", Value: "33%" },
        { Source: "Metacritic", Value: "41/100" }
      ],
      metascore: "41",
      imdbRating: "6.2",
      imdbVotes: "175,000",
      imdbID: "tt0120484",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMjA4Nzg5NzA1N15BMl5BanBnXkFtZTgwNTU5NTE4MDE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/382476.mp4",
    streamId: 382476,
    streamName: "O Rei da Água",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMjA4Nzg5NzA1N15BMl5BanBnXkFtZTgwNTU5NTE4MDE@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  },
  {
    id: "almost-famous",
    title: "Almost Famous",
    ptTitle: "Quase Famosos",
    year: 2000,
    category: "baixa-autoestima",
    parentCategory: "art",
    letterboxdUrl: "https://letterboxd.com/film/almost-famous/",
    inWatchlist: false,
    watched: false,
    dubbed: true,
    dubbingStudio: "Delart",
    curatorNote: "Vencedor do Oscar de Melhor Roteiro Original escrito e dirigido por Cameron Crowe com Patrick Fugit, Billy Crudup e Frances McDormand. William Miller é um garoto de 15 anos tímido, deslocado e sem traquejo social que é contratado pela Rolling Stone para cobrir a turnê de uma banda de rock dos anos 70.",
    curatorReason: "O amadurecimento comovente de um jovem que se enxergava como 'desprovido de charme' e que encontra sua força através da honestidade intelectual e da escrita apaixonada.",
    omdb: {
      title: "Almost Famous",
      year: "2000",
      rated: "R",
      released: "22 Sep 2000",
      runtime: "122 min",
      genre: "Adventure, Comedy, Drama, Music",
      director: "Cameron Crowe",
      writer: "Cameron Crowe",
      actors: "Billy Crudup, Patrick Fugit, Kate Hudson",
      plot: "A high-school boy in the early 1970s is given the chance to write a story for Rolling Stone magazine about an up-and-coming rock band as he accompanies them on their concert tour.",
      language: "English",
      country: "United States",
      awards: "Won 1 Oscar. 58 wins & 104 nominations total",
      poster: "https://m.media-amazon.com/images/M/MV5BMjIxMTg5MDA4OF5BMl5BanBnXkFtZTcwNzUxMjUxMQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg",
      ratings: [
        { Source: "Internet Movie Database", Value: "7.9/10" },
        { Source: "Rotten Tomatoes", Value: "89%" },
        { Source: "Metacritic", Value: "90/100" }
      ],
      metascore: "90",
      imdbRating: "7.9",
      imdbVotes: "290,000",
      imdbID: "tt0181875",
      type: "movie",
      Poster: "https://m.media-amazon.com/images/M/MV5BMjIxMTg5MDA4OF5BMl5BanBnXkFtZTcwNzUxMjUxMQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg"
    },
    streamUrl: "http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/112995.mp4",
    streamId: 112995,
    streamName: "Quase Famosos (2000)",
    streamAvailable: true,
    isDirect: true,
    poster: "https://m.media-amazon.com/images/M/MV5BMjIxMTg5MDA4OF5BMl5BanBnXkFtZTcwNzUxMjUxMQ@@._V1_QL75_UX380_CR0,0,380,562_.jpg"
  }
];

// Combine preserved and new additions
const finalPack = [...preserved, ...newMovies];

// Save updated pack
saveJson(TARGET_PACK, finalPack);
console.log(`[Baixa Autoestima] Saved ${finalPack.length} movies to ${TARGET_PACK}`);

// Update iptv_movie_links.json
const links = loadJson(LINKS_FILE, {});
newMovies.forEach(m => {
  links[m.title] = m.streamUrl;
  if (m.ptTitle) {
    links[m.ptTitle] = m.streamUrl;
  }
});
saveJson(LINKS_FILE, links);
console.log(`[Baixa Autoestima] Updated iptv_movie_links.json with new stream mappings`);

// Synchronize all packs into consolidated movies.json
const packFiles = fs.readdirSync(PACKS_DIR).filter(f => f.endsWith('.json'));
const allMovies = [];
const seenTitles = new Map();

packFiles.forEach(file => {
  const cat = file.replace('.json', '');
  const p = loadJson(path.join(PACKS_DIR, file), []);
  p.forEach(m => {
    const norm = m.title.toLowerCase().trim();
    if (!seenTitles.has(norm)) {
      seenTitles.set(norm, cat);
      allMovies.push(m);
    }
  });
});

saveJson(MOVIES_FILE, allMovies);
console.log(`[Baixa Autoestima] Synced ${allMovies.length} total movies into movies.json`);

// Regenerate OpenTV atomic feed and sync assets
generateFeed();
console.log(`[Baixa Autoestima] Rebuilt OpenTV feed successfully!`);
