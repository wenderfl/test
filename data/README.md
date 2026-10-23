# Letterboxd Curator — Regras do Catálogo e Diretrizes de Curadoria

Este documento define os padrões obrigatórios para adição e manutenção do catálogo de filmes do Letterboxd Curator.

---

## Regras Estritas de Curadoria

1. **Unicidade de Categoria (1 Filme = 1 Categoria):**
   - **É estritamente proibido** que um filme pertença a mais de uma categoria ou conste em múltiplos arquivos de pacotes (`packs/*.json`).
   - Cada obra possui uma categoria temática primária exclusiva. O validador do catálogo (`catalog_manager.js validate`) rejeita qualquer duplicação por título ou IMDb ID entre coleções.

2. **Zero Emojis:**
   - O projeto utiliza exclusivamente ícones vetoriais SVG inline. Nenhuma string em JSON, HTML, CSS ou JS pode conter emojis unicode.

3. **100% Dublagem em Português do Brasil (PT-BR):**
   - Todas as obras recomendadas devem possuir dublagem oficial verificada no Brasil (versões para TV aberta, cabo ou home video).

4. **Histórico do Perfil Letterboxd (@wender_fl):**
   - Nenhum filme assistido pelo usuário pode ser recomendado ou inserido no catálogo. O validador cruza os títulos e slugs com `data/letterboxd_cache.json`.

5. **Mínimo de 10 Filmes por Categoria:**
   - Toda categoria ativa deve manter pelo menos 10 filmes recomendados não vistos/não ignorados disponíveis.

6. **Filmes Já Vistos, Ignorados ou Comentados:**
   - Filmes vistos e ignorados são estritamente ocultados em todo o site.
   - Filmes comentados são movidos para a aba exclusiva "Comentados" e não aparecem nas recomendações ativas gerais nem nas categorias.
