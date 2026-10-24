# Padrão de Nomenclatura e Auto-Atualização do APK OpenTV Letterboxd Curator

Este documento estabelece o padrão oficial de nomenclatura, versionamento e distribuição do APK para que o aplicativo instalado na Android TV reconheça automaticamente novas versões publicadas no repositório Git, faça o download com barra de progresso e execute a instalação.

---

## 1. Padrão Oficial de Nomenclatura do APK

Para garantir que o app localizador e os scripts de automação encontrem o arquivo sem ambiguidade, utilize a seguinte convenção:

| Tipo | Nome do Arquivo | Descrição |
| :--- | :--- | :--- |
| **Canônico (Raiz do Git)** | `LetterboxdCurator_OpenTV_Release.apk` | Nome padrão na raiz do repositório Git. O app busca este arquivo diretamente na URL raw do GitHub. |
| **Alternativo / Core** | `OpenTV_Release.apk` | Cópia espelho na raiz de `opentv/`. |
| **Versionado (GitHub Releases)** | `LetterboxdCurator_OpenTV_v0.11.9_Release.apk` | Usado para anexar como tag/asset fixo em GitHub Releases. |

> **Importante**: Não utilize espaços, caracteres especiais ou acentos no nome do arquivo APK (ex: evite `app release (1).apk`).

---

## 2. Como o App Detecta Novas Versões

O aplicativo possui o componente `UpdateChecker` e a tela modal `UpdateGate` que consultam o repositório em background a cada abertura ou intervalo periódico através de 3 camadas de detecção:

### Camada 1: Manifesto de Versão Git (`data/version.json`) — **Recomendado e Imediato**
O app consulta o endpoint:
```text
https://raw.githubusercontent.com/wenderfl/test/main/data/version.json
```
Estrutura do arquivo `data/version.json`:
```json
{
  "version_code": 21,
  "version_name": "0.11.9",
  "apk_name": "LetterboxdCurator_OpenTV_Release.apk",
  "apk_url": "https://raw.githubusercontent.com/wenderfl/test/main/LetterboxdCurator_OpenTV_Release.apk",
  "apk_size_bytes": 7654321,
  "title": "OpenTV Letterboxd Curator v0.11.9",
  "notes": "Player estilo Netflix atualizado, novas categorias de animes (anime-fun, anime-art) e correções de estabilidade.",
  "published_at": "2026-10-24T13:30:00Z"
}
```

- **Critério de Atualização**: Se o `version_code` for maior que o `BuildConfig.VERSION_CODE` do app atual (ou `version_name` for semanticamente superior), o app imediatamente abre o diálogo de atualização na TV.

### Camada 2: GitHub Releases (`api.github.com/repos/wenderfl/test/releases/latest`)
Se você criar uma Release oficial no GitHub com uma tag mais recente (ex: `v0.11.9`), o app lê a tag, captura o primeiro anexo `.apk` da release e inicia a atualização.

---

## 3. Passo a Passo para Lançar uma Nova Versão

Sempre que fizer alterações no código do app e quiser que todos os dispositivos atualizem:

### Passo 1: Incrementar a Versão no App
No arquivo `app/build.gradle.kts`:
```kotlin
defaultConfig {
    versionCode = 21          // Incremente em +1 (ex: de 20 para 21)
    versionName = "0.11.9"    // Nova versão semântica
}
```

### Passo 2: Compilar o APK Release Otimizado
Na pasta `opentv`:
```bash
./gradlew assembleRelease
```
O arquivo final gerado estará em:
`app/build/outputs/apk/release/app-release.apk`

### Passo 3: Copiar o APK com o Nome Padrão
Copie o APK gerado para a raiz do repositório com o nome canônico:
```bash
cp app/build/outputs/apk/release/app-release.apk "/home/zorin/Music/SIte Recomendação de FIlmes/LetterboxdCurator_OpenTV_Release.apk"
cp app/build/outputs/apk/release/app-release.apk "/home/zorin/Music/opentv/OpenTV_Release.apk"
```

### Passo 4: Atualizar o Manifesto `data/version.json`
Edite ou gere `data/version.json` com o novo `version_code`, `version_name` e as notas da versão:
```bash
node scripts/generate_opentv_feed.js
```

### Passo 5: Enviar para o Git
No terminal do projeto `SIte Recomendação de FIlmes`:
```bash
git add data/version.json LetterboxdCurator_OpenTV_Release.apk
git commit -m "release: publicar LetterboxdCurator_OpenTV v0.11.9"
git push origin main
```

---

## 4. O que acontece na TV do usuário?

1. Ao abrir o aplicativo ou navegar na TV, o sistema consulta `data/version.json`.
2. Um alerta moderno surge na tela:
   - **Título**: "Nova versão disponível"
   - **Corpo**: "OpenTV 0.11.9 está pronta para instalação. Versão atual: 0.11.8."
   - **Notas da versão**: resumo das novidades.
   - **Botões**: `[Atualizar Agora]` e `[Mais Tarde]`.
3. Ao clicar em **Atualizar Agora**:
   - Uma barra de progresso linear exibe o download (`0%` a `100%`).
   - O instalador oficial do Android abre solicitando apenas a confirmação para atualizar.
   - Os dados, favoritos e histórico do usuário são preservados integralmente.
