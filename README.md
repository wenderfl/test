# Letterboxd Curator • Guia de Arquitetura e Inserção para IAs

Este documento descreve a nova arquitetura desacoplada e modular do sistema web de recomendação cinematográfica integrada ao Letterboxd (`@wender_fl`) e OMDb.

---

## 1. Visão Geral da Nova Arquitetura

O sistema foi completamente reestruturado para ser **orientado a dados (Data-Driven)**. 

### O que mudou?
- **Antes**: Para adicionar ou alterar filmes ou categorias, uma IA ou desenvolvedor precisava editar um arquivo JavaScript monolítico de mais de 160 KB e alterar marcações HTML estáticas.
- **Agora**: Toda a renderização é dinâmica. Uma IA **não precisa tocar no HTML ou no CSS** para adicionar filmes ou novas categorias. Basta adicionar itens em arquivos JSON modulares e executar o sincronizador.

```
web/
├── index.html                 # Shell HTML dinâmico (com containers vazios para injeção reativa)
├── style.css                  # Estilização global com tokens CSS e classes de tema
├── app.js                     # Motor reativo (~500 linhas): dados dinâmicos, Afinidade IA, filtros e modais
├── data/
│   ├── categories.json        # Definição oficial de categorias (cores, ícones SVG, descrições)
│   ├── movies.json            # Catálogo completo compilado (536 filmes atuais)
│   ├── catalog.js             # Bundle de fallback para ambientes offline ou file:/// (zero CORS)
│   └── packs/                 # Packs modulares isolados por categoria (ideal para inserção por IA)
│       ├── iranian-cinema.json
│       ├── poetic-cinema.json
│       ├── surrealism.json
│       ├── moral-dilemma.json
│       ├── world-cinema.json
│       ├── study.json
│       ├── misfit.json
│       ├── ... (27 packs modulares no total)
└── scripts/
    └── catalog_manager.js     # CLI de automação, validação e sincronização para IAs
```

---

## 2. Como uma IA Pode Inserir Novos Filmes

Existem três formas simples e seguras para qualquer agente de IA inserir novos filmes:

### Método A: Inserção Direta no Pack da Categoria (Recomendado)
1. Localize o arquivo de pack em `web/data/packs/<categoria>.json` (ex: `web/data/packs/adventure.json`).
2. Adicione os objetos dos filmes ao array JSON seguindo o schema.
3. Execute o comando de sincronização:
   ```bash
   node web/scripts/catalog_manager.js sync-packs
   ```
   *Isso compila automaticamente todos os packs em `web/data/movies.json` e atualiza `web/data/catalog.js`.*
4. Valide a integridade:
   ```bash
   node web/scripts/catalog_manager.js validate
   ```

---

### Método B: Inserir via Arquivo JSON Avulso via CLI
1. Crie um arquivo temporário com as novas recomendações (ex: `novos_filmes.json`).
2. Execute o comando de adição:
   ```bash
   node web/scripts/catalog_manager.js add novos_filmes.json
   ```
   *O script valida automaticamente se o filme já existe no histórico do usuário `@wender_fl` (747 filmes mapeados) ou no catálogo existente, rejeitando duplicatas.*

---

### Método C: Buscar Metadados via OMDb Automaticamente
Se a IA souber apenas o título e o ano em inglês, ela pode rodar o comando:
```bash
node web/scripts/catalog_manager.js fetch-omdb "The Thing" 1982
```
O CLI busca sinopse, diretor, elenco, notas (IMDb, Rotten Tomatoes, Metacritic), pôster em alta definição e retorna o bloco OMDb formatado.

---

## 3. Como uma IA Pode Criar uma Nova Categoria

Para criar uma categoria inteiramente nova (ex: `noir`, `cyberpunk`, `documentary`):

1. Execute via CLI:
   ```bash
   node web/scripts/catalog_manager.js add-category \
     --id "cyberpunk" \
     --name "Cyberpunk" \
     --badge "Cyberpunk & Distopia" \
     --accent "#00f0ff" \
     --desc "Obras futuristas e distópicas de alta tecnologia e baixa qualidade de vida"
   ```
2. O sistema automaticamente:
   - Registra a categoria em `web/data/categories.json`;
   - Cria o arquivo de pack `web/data/packs/cyberpunk.json`;
   - O `app.js` injetará automaticamente as regras de CSS (`.card-cyberpunk`, `.tab-cyberpunk`, etc.), a aba na barra de filtros e o cartão nas estatísticas do Hero.

---

## 4. Comandos Disponíveis no CLI (`catalog_manager.js`)

| Comando | Descrição |
| :--- | :--- |
| `node web/scripts/catalog_manager.js stats` | Exibe resumo com total de filmes e contagem por categoria |
| `node web/scripts/catalog_manager.js validate` | Valida ausência estrita de emojis, schema OMDb, dublagem e IDs |
| `node web/scripts/catalog_manager.js sync-packs` | Sincroniza todos os packs para `movies.json` e `catalog.js` |
| `node web/scripts/catalog_manager.js add <arquivo.json>` | Insere novos filmes com checagem de histórico Letterboxd |
| `node web/scripts/catalog_manager.js fetch-omdb "Titulo" [ano]` | Consulta metadados da OMDb API oficial |
| `node web/scripts/catalog_manager.js add-category --id <id> --name <nome>` | Registra uma nova categoria no sistema |

---

## 5. Regras e Restrições Críticas para IAs

1. **PROIBIDO O USO DE EMOJIS**:
   - É estritamente proibido o uso de emojis em qualquer parte do catálogo, código ou interface.
   - Utilize exclusivamente ícones vetoriais SVG (`ICONS` em `app.js` ou tags `<svg class="icon ...">`).
2. **DUBLAGEM BRASILEIRA OBRIGATÓRIA**:
   - Todo filme inserido deve possuir o campo `"dubbed": true` e a informação `"dubbingStudio"` confirmada (ex: Herbert Richers, Cinecastro, Delart, Álamo, Clone, etc.).
3. **INÉDITO PARA O USUÁRIO**:
   - O filme **não pode** estar presente na lista de 747 filmes assistidos por `@wender_fl` no Letterboxd. O CLI faz essa validação automaticamente via `wender_watched_titles.json`.
4. **FORMATO DO SCHEMA DE FILME**:
   ```json
   {
     "title": "Título Original em Inglês",
     "titlePt": "Título Nacional em Português",
     "year": "1982",
     "category": "horror",
     "letterboxdUrl": "https://letterboxd.com/film/the-thing-1982/",
     "inWatchlist": false,
     "dubbed": true,
     "dubbingStudio": "Herbert Richers",
     "curatorReason": "Explicação detalhada do motivo da recomendação com base nas preferências do usuário.",
     "omdb": {
       "director": "John Carpenter",
       "writer": "Bill Lancaster",
       "actors": "Kurt Russell, Wilford Brimley, Keith David",
       "genre": "Horror, Mystery, Sci-Fi",
       "plot": "Sinopse em inglês ou português...",
       "poster": "https://m.media-amazon.com/images/...",
       "imdbRating": "8.2",
       "rottenTomatoes": "85%",
       "metascore": "57",
       "runtime": "109 min",
       "rated": "R"
     }
   }
   ```

---

## 6. Sistema de Comentários e Afinidade Semântica

O aplicativo inclui um sistema interativo onde o usuário pode registrar comentários e avaliações pessoais sobre qualquer filme:

- **Armazenamento**: Chave local `letterboxd_curator_user_comments` com `{ text, sentiment, updatedAt }`.
- **Sentimentos**: `positive` (Curti +), `neutral` (Neutro ~) e `negative` (Não Curti -).
- **Extração Semântica**: Dicionário temático cinematográfico que identifica conceitos citados pelo usuário (ex: "efeitos práticos", "monstro", "frenético", "ciência", "robô", "mutação", "gore", "anos 80").
- **Impacto no Motor de Afinidade**:
  1. Se o usuário elogia uma obra, o motor impulsiona não apenas o diretor e os gêneros dela, mas também busca filmes que compartilham termos e elementos destacados na opinião do usuário.
  2. Se o usuário desaprova uma obra, o motor penaliza obras com diretores e estilos semelhantes.
  3. No painel de Afinidade e no modal de detalhes, o usuário pode visualizar a justificativa detalhada (ex: *"Termos do seu comentário (efeitos práticos, monstro)"*).

# test
