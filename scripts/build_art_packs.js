const fs = require('fs');
const path = require('path');
const https = require('https');

const OMDB_API_KEY = '8d5e8777';
const BASE_DIR = path.resolve(__dirname, '..');
const PACKS_DIR = path.join(BASE_DIR, 'data', 'packs');

function fetchId(id) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.omdbapi.com/?i=${id}&apikey=${OMDB_API_KEY}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

const MOVIES = [
  // ==========================================
  // 1. CINEMA IRANIANO (iranian-cinema)
  // ==========================================
  {
    id: 'tt1832382',
    category: 'iranian-cinema',
    title: 'A Separation',
    ptTitle: 'A Separação',
    year: 2011,
    letterboxdUrl: 'https://letterboxd.com/film/a-separation/',
    dubbingStudio: 'Delart',
    curatorNote: 'Obra-prima de Asghar Farhadi vencedora do Oscar de Melhor Filme Estrangeiro e do Urso de Ouro em Berlim. Um drama moral minucioso sobre divórcio, dever familiar, religião e verdade.',
    curatorReason: 'Roteiro de precisão milimétrica sem vilões ou mocinhos, retratando com imensa empatia humana as pressões sociais e éticas do Teerã contemporâneo.'
  },
  {
    id: 'tt5186714',
    category: 'iranian-cinema',
    title: 'The Salesman',
    ptTitle: 'O Apartamento',
    year: 2016,
    letterboxdUrl: 'https://letterboxd.com/film/the-salesman-2016/',
    dubbingStudio: 'Unidub',
    curatorNote: 'Vencedor do Oscar de Melhor Filme Estrangeiro e Melhor Roteiro em Cannes. Um casal de atores de teatro lida com as repercussões de uma invasão domiciliar e o desejo de vingança.',
    curatorReason: 'Farhadi desconstrói a noção de honra e justiça pessoal através de uma tensão psicológica sufocante e atuações de extraordinária sutileza.'
  },
  {
    id: 'tt0120265',
    category: 'iranian-cinema',
    title: 'Taste of Cherry',
    ptTitle: 'Gosto de Cereja',
    year: 1997,
    letterboxdUrl: 'https://letterboxd.com/film/taste-of-cherry/',
    dubbingStudio: 'Studio Gábia',
    curatorNote: 'Vencedor da Palma de Ouro no Festival de Cannes. Um homem dirige pelos arredores áridos de Teerã em busca de alguém que realize uma tarefa crucial e silenciosa.',
    curatorReason: 'O cume do cinema poético de Abbas Kiarostami: uma meditação filosófica profunda e luminosa sobre o valor e o peso insubstituível da própria vida.'
  },
  {
    id: 'tt0112445',
    category: 'iranian-cinema',
    title: 'The White Balloon',
    ptTitle: 'O Balão Branco',
    year: 1995,
    letterboxdUrl: 'https://letterboxd.com/film/the-white-balloon/',
    dubbingStudio: 'Álamo',
    curatorNote: 'Vencedor do Caméra d Or em Cannes, com roteiro de Abbas Kiarostami e direção magistral de Jafar Panahi. A saga de uma menina para comprar um peixinho dourado antes do Ano Novo.',
    curatorReason: 'Puro neorrealismo comovente em tempo real, transformando as ruas de Teerã em um espelho terno de solidariedade, perseverança infantil e empatia urbana.'
  },
  {
    id: 'tt0100234',
    category: 'iranian-cinema',
    title: 'Close-Up',
    ptTitle: 'Close-Up',
    year: 1990,
    letterboxdUrl: 'https://letterboxd.com/film/close-up-1990/',
    dubbingStudio: 'Centauro',
    curatorNote: 'Marco absoluto da cinefilia mundial. A reconstituição híbrida entre ficção e documentário sobre um homem humilde e apaixonado por cinema que se passa pelo cineasta Mohsen Makhmalbaf.',
    curatorReason: 'Kiarostami interroga a própria natureza do cinema, da identidade e da dignidade humana com as pessoas reais interpretando seus próprios papéis no tribunal.'
  },
  {
    id: 'tt0191043',
    category: 'iranian-cinema',
    title: 'The Color of Paradise',
    ptTitle: 'A Cor do Paraíso',
    year: 1999,
    letterboxdUrl: 'https://letterboxd.com/film/the-color-of-paradise/',
    dubbingStudio: 'Mastersound',
    curatorNote: 'Obra visualmente arrebatadora de Majid Majidi sobre um menino cego com uma percepção poética aguçada da natureza, e a luta de seu pai viúvo contra a vergonha e a pobreza.',
    curatorReason: 'Design de som sensorial magnífico e paisagens bucólicas que transformam a experiência tátil e a inocência em uma das obras mais comoventes do cinema oriental.'
  },
  {
    id: 'tt0424227',
    category: 'iranian-cinema',
    title: 'Turtles Can Fly',
    ptTitle: 'Tartarugas Podem Voar',
    year: 2004,
    letterboxdUrl: 'https://letterboxd.com/film/turtles-can-fly/',
    dubbingStudio: 'Marshmallow',
    curatorNote: 'Vencedor da Concha de Ouro em San Sebastián, dirigido por Bahman Ghobadi. O cotidiano de um grupo de crianças órfãs e refugiadas na fronteira do Curdistão iraquiano antes da guerra.',
    curatorReason: 'Um olhar comovente, cru e poético sobre infância, resistência e resiliência sem sentimentalismo artificial.'
  },
  {
    id: 'tt2404461',
    category: 'iranian-cinema',
    title: 'The Past',
    ptTitle: 'O Passado',
    year: 2013,
    letterboxdUrl: 'https://letterboxd.com/film/the-past-2013/',
    dubbingStudio: 'Delart',
    curatorNote: 'Vencedor de Melhor Atriz em Cannes para Bérénice Bejo. Um iraniano retorna a Paris para finalizar seu divórcio e se depara com uma teia de segredos familiares sufocantes.',
    curatorReason: 'A maestria de Farhadi em demonstrar como mal-entendidos passados e culpas veladas corroem as relações humanas mais íntimas.',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/178551.mp4',
    streamName: 'O Passado',
    streamAvailable: true
  },
  {
    id: 'tt4359416',
    category: 'iranian-cinema',
    title: 'Taxi',
    ptTitle: 'Taxi Teerã',
    year: 2015,
    letterboxdUrl: 'https://letterboxd.com/film/taxi-2015/',
    dubbingStudio: 'TV Group',
    curatorNote: 'Vencedor do Urso de Ouro no Festival de Berlim. Filmado clandestinamente pelo próprio Jafar Panahi ao volante de um táxi amarelo pelas ruas movimentadas de Teerã.',
    curatorReason: 'Uma crônica calorosa, bem-humorada e contundente sobre censura, arte, coragem e a rica diversidade do povo iraniano sob um regime restritivo.'
  },
  {
    id: 'tt1360860',
    category: 'iranian-cinema',
    title: 'About Elly',
    ptTitle: 'À Procura de Elly',
    year: 2009,
    letterboxdUrl: 'https://letterboxd.com/film/about-elly/',
    dubbingStudio: 'Bravo Studios',
    curatorNote: 'Vencedor do Urso de Prata de Melhor Diretor para Asghar Farhadi. Um fim de semana à beira-mar entre amigos de faculdade se transforma em pesadelo quando uma jovem professora desaparece misteriosamente.',
    curatorReason: 'Um suspense psicológico e moral magistral que expõe a hipocrisia das convenções sociais da classe média sob pressão extrema.'
  },

  // ==========================================
  // 2. CINEMA POÉTICO (poetic-cinema)
  // ==========================================
  {
    id: 'tt0087884',
    category: 'poetic-cinema',
    title: 'Paris, Texas',
    ptTitle: 'Paris, Texas',
    year: 1984,
    letterboxdUrl: 'https://letterboxd.com/film/paris-texas/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Vencedor unânime da Palma de Ouro em Cannes. Um homem surge desorientado do deserto após quatro anos desaparecido e tenta reconstruir os laços com seu filho pequeno e a esposa perdida.',
    curatorReason: 'Wim Wenders cria uma das mais belas elegias visuais do cinema, com trilha inesquecível de Ry Cooder e a cinematografia monumental de Robby Müller.'
  },
  {
    id: 'tt0093191',
    category: 'poetic-cinema',
    title: 'Wings of Desire',
    ptTitle: 'As Asas do Desejo',
    year: 1987,
    letterboxdUrl: 'https://letterboxd.com/film/wings-of-desire/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Vencedor de Melhor Direção em Cannes. Em Berlim dividida pela Guerra Fria, dois anjos imortais observam e confortam os pensamentos íntimos dos humanos solitários.',
    curatorReason: 'Um poema cinematográfico sublime em preto e branco sobre a beleza dos pequenos sentidos físicos e o milagre da experiência mortal.'
  },
  {
    id: 'tt0069293',
    category: 'poetic-cinema',
    title: 'Solaris',
    ptTitle: 'Solaris',
    year: 1972,
    letterboxdUrl: 'https://letterboxd.com/film/solaris-1972/',
    dubbingStudio: 'Clone',
    curatorNote: 'Vencedor do Grande Prêmio do Júri em Cannes. Um psicólogo é enviado a uma estação espacial orbitando um planeta oceânico enigmático que materializa memórias e culpas reprimidas.',
    curatorReason: 'A resposta reflexiva e profundamente espiritual de Andrei Tarkovsky à ficção científica convencional, focando no amor, na perda e na incomunicabilidade humana.'
  },
  {
    id: 'tt0072443',
    category: 'poetic-cinema',
    title: 'The Mirror',
    ptTitle: 'O Espelho',
    year: 1975,
    letterboxdUrl: 'https://letterboxd.com/film/the-mirror-1975/',
    dubbingStudio: 'BKS',
    curatorNote: 'A obra mais lírica e autobiográfica de Andrei Tarkovsky, costurando lembranças de infância, poemas de seu pai Arseny Tarkovsky, notícias de arquivo e sonhos cósmicos.',
    curatorReason: 'Estrutura não-linear revolucionária onde tempo, vento, fogo e memória se fundem em pura plasticidade pictórica inigualável na história da arte.'
  },
  {
    id: 'tt5247022',
    category: 'poetic-cinema',
    title: 'Paterson',
    ptTitle: 'Paterson',
    year: 2016,
    letterboxdUrl: 'https://letterboxd.com/film/paterson/',
    dubbingStudio: 'Delart',
    curatorNote: 'Dirigido por Jim Jarmusch e estrelado por Adam Driver. O cotidiano tranquilo e contemplativo de um motorista de ônibus em New Jersey que escreve poesias no intervalo de suas rotas.',
    curatorReason: 'Um elogio sereno à rotina calma, ao amor cotidiano sem conflitos artificiais e à observação atenta da beleza escondida no ordinário.'
  },
  {
    id: 'tt0478304',
    category: 'poetic-cinema',
    title: 'The Tree of Life',
    ptTitle: 'A Árvore da Vida',
    year: 2011,
    letterboxdUrl: 'https://letterboxd.com/film/the-tree-of-life/',
    dubbingStudio: 'Delart',
    curatorNote: 'Vencedor da Palma de Ouro no Festival de Cannes. Uma família no Texas dos anos 50 espelhada na origem cósmica do universo e na busca de sentido para o luto e a graça.',
    curatorReason: 'Terrence Malick expande o cinema à oração visual com a fotografia hipnótica de Emmanuel Lubezki e trilha grandiosa.',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/100939.mp4',
    streamName: 'A Árvore da Vida',
    streamAvailable: true
  },
  {
    id: 'tt2758880',
    category: 'poetic-cinema',
    title: 'Winter Sleep',
    ptTitle: 'Sono de Inverno',
    year: 2014,
    letterboxdUrl: 'https://letterboxd.com/film/winter-sleep/',
    dubbingStudio: 'Lexx',
    curatorNote: 'Vencedor da Palma de Ouro em Cannes. Em um pequeno hotel incrustado nas paisagens rochosas e nevadas da Capadócia, um ator aposentado confronta sua família e seus inquilinos.',
    curatorReason: 'Nuri Bilge Ceylan tece diálogos de calibre chekhoviano sobre culpa moral, vaidade intelectual e solidão com rigor visual impecável.'
  },
  {
    id: 'tt0079944',
    category: 'poetic-cinema',
    title: 'Stalker',
    ptTitle: 'Stalker',
    year: 1979,
    letterboxdUrl: 'https://letterboxd.com/film/stalker/',
    dubbingStudio: 'BKS',
    curatorNote: 'Um guia conduz um escritor cético e um cientista racional por uma misteriosa Zona proibida e desolada, onde existe um quarto capaz de conceder os desejos mais íntimos.',
    curatorReason: 'Obra-prima monumental de Andrei Tarkovsky com longos planos-sequência contemplativos sobre fé, desespero e a essência da alma humana.'
  },
  {
    id: 'tt1316540',
    category: 'poetic-cinema',
    title: 'The Turin Horse',
    ptTitle: 'O Cavalo de Turim',
    year: 2011,
    letterboxdUrl: 'https://letterboxd.com/film/the-turin-horse/',
    dubbingStudio: 'Centauro',
    curatorNote: 'Vencedor do Grande Prêmio do Júri no Festival de Berlim. Em uma cabana açoitada por um vento implacável, um pai e sua filha repetem rituais de sobrevivência diária.',
    curatorReason: 'A despedida cinematográfica de Béla Tarr: hipnose visual em preto e branco absoluto com planos contínuos e trilha visceral de Mihály Vig.'
  },
  {
    id: 'tt0086022',
    category: 'poetic-cinema',
    title: 'Nostalghia',
    ptTitle: 'Nostalgia',
    year: 1983,
    letterboxdUrl: 'https://letterboxd.com/film/nostalghia/',
    dubbingStudio: 'Clone',
    curatorNote: 'Vencedor de Melhor Direção em Cannes. Um escritor russo viaja pelas termas e ruínas medievais da Toscana em busca de vestígios de um compositor esquecido.',
    curatorReason: 'Tarkovsky atinge o ápice da espiritualidade visual com a lendária cena da travessia da piscina de Santa Catarina com uma vela acesa.'
  },

  // ==========================================
  // 3. SURREALISMO (surrealism)
  // ==========================================
  {
    id: 'tt0166924',
    category: 'surrealism',
    title: 'Mulholland Drive',
    ptTitle: 'Cidade dos Sonhos',
    year: 2001,
    letterboxdUrl: 'https://letterboxd.com/film/mulholland-drive/',
    dubbingStudio: 'Dublavídeo',
    curatorNote: 'Eleito o melhor filme do século XXI pela revista britânica Sight & Sound. Uma aspirante a atriz em Los Angeles ajuda uma mulher amnésica a descobrir sua verdadeira identidade.',
    curatorReason: 'A obra máxima de David Lynch: um labirinto onírico, hipnótico e sedutor sobre ilusão, cinema, pesadelo e a fábrica de sonhos hollywoodiana.'
  },
  {
    id: 'tt0090756',
    category: 'surrealism',
    title: 'Blue Velvet',
    ptTitle: 'Veludo Azul',
    year: 1986,
    letterboxdUrl: 'https://letterboxd.com/film/blue-velvet/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Ao encontrar uma orelha humana decepada em um gramado bucólico, um jovem é tragado para o submundo criminoso e sadomasoquista de uma cidadezinha americana.',
    curatorReason: 'Clássico absoluto do neo-noir surrealista onde Lynch expõe as pulsões sombrias e os desejos reprimidos sob a fachada de inocência suburbana.',
    streamUrl: 'http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/354291.mp4',
    streamName: 'Veludo Azul',
    streamAvailable: true
  },
  {
    id: 'tt0068361',
    category: 'surrealism',
    title: 'The Discreet Charm of the Bourgeoisie',
    ptTitle: 'O Discreto Charme da Burguesia',
    year: 1972,
    letterboxdUrl: 'https://letterboxd.com/film/the-discreet-charm-of-the-bourgeoisie/',
    dubbingStudio: 'Cinecastro',
    curatorNote: 'Vencedor do Oscar de Melhor Filme Estrangeiro. Um grupo aristocrático tenta repetidamente se reunir para um jantar elegante, mas é sempre interrompido por situações absurdas.',
    curatorReason: 'Luis Buñuel em sua melhor forma satírica: um ataque desconcertante e deliciosamente ácido aos rituais, hipocrisias e convenções da alta sociedade.'
  },
  {
    id: 'tt0071615',
    category: 'surrealism',
    title: 'The Holy Mountain',
    ptTitle: 'A Montanha Sagrada',
    year: 1973,
    letterboxdUrl: 'https://letterboxd.com/film/the-holy-mountain/',
    dubbingStudio: 'Clone',
    curatorNote: 'Um ladrão semelhante a Cristo é guiado por um mestre alquimista junto a sete figuras planetárias em uma jornada mística até o topo de uma montanha sagrada para alcançar a imortalidade.',
    curatorReason: 'Obra visualmente alucinante de Alejandro Jodorowsky repleta de alquimia, esoterismo, sátira social e plasticidade provocadora.'
  },
  {
    id: 'tt0074486',
    category: 'surrealism',
    title: 'Eraserhead',
    ptTitle: 'Eraserhead',
    year: 1977,
    letterboxdUrl: 'https://letterboxd.com/film/eraserhead/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Em uma paisagem industrial desolada e sombria, um jovem tímido precisa cuidar sozinho de uma criatura recém-nascida monstruosa e deformada.',
    curatorReason: 'A estreia monumental de David Lynch que definiu o surrealismo corporal independente americano com design de som aterrador e estética analógica.'
  },
  {
    id: 'tt0116922',
    category: 'surrealism',
    title: 'Lost Highway',
    ptTitle: 'Estrada Perdida',
    year: 1997,
    letterboxdUrl: 'https://letterboxd.com/film/lost-highway/',
    dubbingStudio: 'BKS',
    curatorNote: 'Um saxofonista de jazz acusado de assassinar a própria esposa se transforma misteriosamente em um jovem mecânico dentro de sua cela na prisão.',
    curatorReason: 'Estrutura em fita de Möbius com estética noir expressionista, trilha elétrica de Angelo Badalamenti e Trent Reznor, e pura atmosfera de pesadelo.'
  },
  {
    id: 'tt0054632',
    category: 'surrealism',
    title: 'Last Year at Marienbad',
    ptTitle: 'O Ano Passado em Marienbad',
    year: 1961,
    letterboxdUrl: 'https://letterboxd.com/film/last-year-at-marienbad/',
    dubbingStudio: 'Cinecastro',
    curatorNote: 'Vencedor do Leão de Ouro no Festival de Veneza. Em um palácio barroco suntuoso com jardins geométricos, um homem tenta convencer uma mulher de que eles se conheceram no ano anterior.',
    curatorReason: 'Alain Resnais e Alain Robbe-Grillet revolucionam a narrativa moderna transformando o filme em um labirinto atemporal sobre memória, persuasão e ilusão.'
  },
  {
    id: 'tt2076220',
    category: 'surrealism',
    title: 'Holy Motors',
    ptTitle: 'Holy Motors',
    year: 2012,
    letterboxdUrl: 'https://letterboxd.com/film/holy-motors/',
    dubbingStudio: 'Delart',
    curatorNote: 'Ao longo de um dia pelas ruas de Paris, um homem enigmático transportado em uma limusine branca encarna múltiplas personas: mendiga, assassino, monstro e pai de família.',
    curatorReason: 'A carta de amor febril e surreal de Leos Carax à arte da representação e à metamorfose contínua do cinema, com Denis Lavant em performance inacreditável.'
  },
  {
    id: 'tt0112817',
    category: 'surrealism',
    title: 'Dead Man',
    ptTitle: 'Dead Man',
    year: 1995,
    letterboxdUrl: 'https://letterboxd.com/film/dead-man/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Um contador ferido chamado William Blake foge para o interior selvagem ao lado de um indígena que acredita que ele seja a reencarnação do poeta britânico homônimo.',
    curatorReason: 'Faroeste lírico e onírico em preto e branco dirigido por Jim Jarmusch, com trilha improvisada em guitarra distorcida por Neil Young.'
  },
  {
    id: 'tt0056732',
    category: 'surrealism',
    title: 'The Exterminating Angel',
    ptTitle: 'O Anjo Exterminador',
    year: 1962,
    letterboxdUrl: 'https://letterboxd.com/film/the-exterminating-angel/',
    dubbingStudio: 'BKS',
    curatorNote: 'Após um banquete luxuoso, os convidados de uma mansão da alta burguesia descobrem que, por uma barreira psicológica inexplicável, ninguém consegue atravessar a porta e sair.',
    curatorReason: 'A sátira surrealista máxima de Luis Buñuel: a rápida degradação da civilidade aristocrática sob o confinamento involuntário.'
  },

  // ==========================================
  // 4. DILEMA MORAL (moral-dilemma)
  // ==========================================
  {
    id: 'tt0111495',
    category: 'moral-dilemma',
    title: 'Three Colors: Red',
    ptTitle: 'A Fraternidade É Vermelha',
    year: 1994,
    letterboxdUrl: 'https://letterboxd.com/film/three-colors-red/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Indicado a 3 Oscars. Uma modelo suíça descobre por acaso que seu vizinho idoso, um juiz aposentado e amargurado, passa os dias grampeando e escutando as conversas telefônicas alheias.',
    curatorReason: 'O fecho magnífico da trilogia de Krzysztof Kieślowski sobre fraternidade, destino cruzado e a redenção através da escuta ética desinteressada.'
  },
  {
    id: 'tt0108394',
    category: 'moral-dilemma',
    title: 'Three Colors: Blue',
    ptTitle: 'A Liberdade É Azul',
    year: 1993,
    letterboxdUrl: 'https://letterboxd.com/film/three-colors-blue/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Vencedor do Leão de Ouro em Veneza. Após perder o marido compositor e a filha em um acidente trágico de carro, Julie tenta cortar todos os laços humanos para viver em isolamento absoluto.',
    curatorReason: 'Atuação monumental de Juliette Binoche explorando o paradoxo da dor, do perdão e da impossibilidade moral de se desvincular do mundo.'
  },
  {
    id: 'tt0111507',
    category: 'moral-dilemma',
    title: 'Three Colors: White',
    ptTitle: 'A Igualdade É Branca',
    year: 1994,
    letterboxdUrl: 'https://letterboxd.com/film/three-colors-white/',
    dubbingStudio: 'Herbert Richers',
    curatorNote: 'Vencedor do Urso de Prata em Berlim. Humilhado e abandonado em Paris após um divórcio traumático, um cabeleireiro polonês retorna clandestinamente a Varsóvia tramando uma vingança elaborada.',
    curatorReason: 'Uma comédia dramática agridoce e afiada sobre igualdade, ambição capitalista no leste europeu pós-comunista e obsessão afetiva.'
  },
  {
    id: 'tt1602620',
    category: 'moral-dilemma',
    title: 'Amour',
    ptTitle: 'Amor',
    year: 2012,
    letterboxdUrl: 'https://letterboxd.com/film/amour/',
    dubbingStudio: 'Delart',
    curatorNote: 'Vencedor da Palma de Ouro em Cannes e do Oscar de Melhor Filme Estrangeiro. Georges e Anne são professores de música aposentados cujo amor octogenário é posto à prova após uma série de derrames.',
    curatorReason: 'Michael Haneke filma com pudor, lucidez e coragem devastadora o enfrentamento da decadência física, da dignidade e dos limites da compaixão.'
  },
  {
    id: 'tt1149362',
    category: 'moral-dilemma',
    title: 'The White Ribbon',
    ptTitle: 'A Fita Branca',
    year: 2009,
    letterboxdUrl: 'https://letterboxd.com/film/the-white-ribbon/',
    dubbingStudio: 'Dublavídeo',
    curatorNote: 'Vencedor da Palma de Ouro em Cannes. Em um vilarejo rural protestante no norte da Alemanha às vésperas da Primeira Guerra Mundial, estranhos acidentes punitivos começam a assombrar a comunidade.',
    curatorReason: 'Haneke investiga a rigidez moralista, o autoritarismo doméstico e as raízes psicológicas silenciosas que geram o ódio fascista.'
  },
  {
    id: 'tt0050976',
    category: 'moral-dilemma',
    title: 'The Seventh Seal',
    ptTitle: 'O Sétimo Selo',
    year: 1957,
    letterboxdUrl: 'https://letterboxd.com/film/the-seventh-seal/',
    dubbingStudio: 'Cinecastro',
    curatorNote: 'Vencedor do Prêmio Especial do Júri em Cannes. Um cavaleiro desiludido retorna das Cruzadas e encontra sua terra assolada pela Peste Negra, desafiando a Morte para uma partida de xadrez.',
    curatorReason: 'A grande alegoria existencial de Ingmar Bergman sobre o silêncio de Deus, o medo do nada e a busca de um único ato com sentido humano.'
  },
  {
    id: 'tt0060827',
    category: 'moral-dilemma',
    title: 'Persona',
    ptTitle: 'Quando Duas Mulheres Pecam',
    year: 1966,
    letterboxdUrl: 'https://letterboxd.com/film/persona/',
    dubbingStudio: 'Clone',
    curatorNote: 'Uma atriz renomada subitamente para de falar durante uma encenação de Electra e é enviada para uma casa isolada à beira-mar com uma jovem enfermeira que cuida dela.',
    curatorReason: 'Obra-prima psicológica de Bergman com montagem de vanguarda dissecando a máscara social, o vampirismo psíquico e a fragilidade da identidade.'
  },
  {
    id: 'tt0387898',
    category: 'moral-dilemma',
    title: 'Caché',
    ptTitle: 'Caché',
    year: 2005,
    letterboxdUrl: 'https://letterboxd.com/film/cache/',
    dubbingStudio: 'Delart',
    curatorNote: 'Vencedor de Melhor Direção em Cannes. Um apresentador de televisão burguês e sua esposa recebem fitas de vídeo anônimas mostrando que sua casa e rotina estão sendo vigiadas continuamente.',
    curatorReason: 'Michael Haneke constrói um suspense paranoico impecável sobre culpa histórica velada, desonestidade moral e a recusa em encarar o passado.'
  },
  {
    id: 'tt0095467',
    category: 'moral-dilemma',
    title: 'A Short Film About Love',
    ptTitle: 'Não Amarás',
    year: 1988,
    letterboxdUrl: 'https://letterboxd.com/film/a-short-film-about-love/',
    dubbingStudio: 'BKS',
    curatorNote: 'Vencedor do Prêmio do Júri em San Sebastián. Um jovem tímido de 19 anos espiona com uma luneta sua vizinha mais velha do prédio em frente, confundindo fascínio com amor.',
    curatorReason: 'Kieślowski explora com extrema delicadeza a solidão urbana, o voyeurismo e o abismo entre o amor idealizado e a fragilidade do contato real.'
  },
  {
    id: 'tt0044741',
    category: 'moral-dilemma',
    title: 'Ikiru',
    ptTitle: 'Viver',
    year: 1952,
    letterboxdUrl: 'https://letterboxd.com/film/ikiru/',
    dubbingStudio: 'Álamo',
    curatorNote: 'Ao descobrir um câncer terminal, um burocrata idoso de Tóquio percebe que desperdiçou 30 anos de sua vida em carimbos inúteis e decide encontrar um propósito antes de morrer.',
    curatorReason: 'Akira Kurosawa entrega uma das obras humanistas mais comoventes e transformadoras de todos os tempos, culminando na cena épica do balanço sob a neve.'
  }
];

async function main() {
  console.log(`Starting generation of 4 Art subcategories with ${MOVIES.length} movies...`);

  // Group by category
  const groups = {
    'iranian-cinema': [],
    'poetic-cinema': [],
    'surrealism': [],
    'moral-dilemma': []
  };

  for (const def of MOVIES) {
    process.stdout.write(`Fetching OMDB for "${def.title}" (${def.year})... `);
    const omdbData = await fetchId(def.id);
    if (!omdbData || omdbData.Response === 'False') {
      console.error(`FAILED: ${omdbData ? omdbData.Error : 'No data'}`);
      process.exit(1);
    }
    console.log(`OK! [${omdbData.imdbRating || 'N/A'}]`);

    const movieObj = {
      title: def.title,
      ptTitle: def.ptTitle,
      year: def.year,
      category: def.category,
      letterboxdUrl: def.letterboxdUrl,
      inWatchlist: false,
      watched: false,
      dubbed: true,
      dubbingStudio: def.dubbingStudio,
      curatorNote: def.curatorNote,
      curatorReason: def.curatorReason,
      omdb: {
        title: omdbData.Title || def.title,
        year: omdbData.Year || String(def.year),
        rated: omdbData.Rated || 'Not Rated',
        released: omdbData.Released || '',
        runtime: omdbData.Runtime || '',
        genre: omdbData.Genre || '',
        director: omdbData.Director || '',
        writer: omdbData.Writer || '',
        actors: omdbData.Actors || '',
        plot: omdbData.Plot || '',
        language: omdbData.Language || '',
        country: omdbData.Country || '',
        awards: omdbData.Awards || '',
        poster: omdbData.Poster || '',
        ratings: omdbData.Ratings || [],
        metascore: omdbData.Metascore ? `${omdbData.Metascore}/100` : '',
        imdbRating: omdbData.imdbRating || '',
        imdbVotes: omdbData.imdbVotes || '',
        imdbID: def.id,
        boxOffice: omdbData.BoxOffice || '',
        type: omdbData.Type || 'movie'
      },
      parentCategory: 'art'
    };

    if (def.streamUrl) {
      movieObj.streamUrl = def.streamUrl;
      movieObj.streamName = def.streamName || def.ptTitle;
      movieObj.streamAvailable = true;
    }

    groups[def.category].push(movieObj);
  }

  // Save each pack
  for (const [catId, packList] of Object.entries(groups)) {
    const packFile = path.join(PACKS_DIR, `${catId}.json`);
    fs.writeFileSync(packFile, JSON.stringify(packList, null, 2), 'utf8');
    console.log(`Saved pack "${catId}.json" (${packList.length} movies)`);
  }

  console.log(`All 4 packs successfully created!`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
