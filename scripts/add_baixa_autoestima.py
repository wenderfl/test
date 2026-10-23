#!/usr/bin/env python3
import json
import urllib.request
import urllib.parse
import re
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
PACKS_DIR = os.path.join(DATA_DIR, "packs")
OMDB_API_KEY = "8d5e8777"

MOVIE_SPECS = [
    {
        "title": "The Whale",
        "ptTitle": "A Baleia",
        "year": "2022",
        "stream_id": 390134,
        "dubbed": True,
        "curatorNote": "Retrato devastador e compassivo de Charlie, um homem isolado lidando com obesidade severa, profunda vergonha corporal e a busca desesperada por reconciliação."
    },
    {
        "title": "The Elephant Man",
        "ptTitle": "O Homem Elefante",
        "year": "1980",
        "stream_id": 348070,
        "dubbed": False,
        "curatorNote": "A obra-prima definitiva de David Lynch sobre John Merrick, explorando a monstruosidade do preconceito social diante de deformidades físicas e a nobreza da alma humana."
    },
    {
        "title": "A Different Man",
        "ptTitle": "Um Homem Diferente",
        "year": "2024",
        "stream_id": 322733,
        "dubbed": True,
        "curatorNote": "Sebastian Stan vive Edward, que passa por uma cirurgia reconstrutiva radical para neurofibromatose, descobrindo que alterar o rosto não cura a dismorfia interna e a obsessão estética."
    },
    {
        "title": "Mask",
        "ptTitle": "Marcas do Destino",
        "year": "1985",
        "stream_id": 310754,
        "dubbed": True,
        "curatorNote": "A emocionante história real de Rocky Dennis, portador de displasia craniodiafisária, enfrentando o olhar da sociedade com carisma inabalável e autenticidade."
    },
    {
        "title": "Precious",
        "ptTitle": "Preciosa - Uma História de Esperança",
        "year": "2009",
        "stream_id": 21131,
        "dubbed": True,
        "curatorNote": "Potente drama sobre Claireece Precious Jones superando abuso, rejeição por seu peso e aparência, encontrando na alfabetização e no afeto o caminho para a própria dignidade."
    },
    {
        "title": "Little Miss Sunshine",
        "ptTitle": "Pequena Miss Sunshine",
        "year": "2006",
        "stream_id": 380530,
        "dubbed": True,
        "curatorNote": "Crítica afiada e afetuosa à ditadura dos padrões de beleza nos concursos infantis, celebrando a espontaneidade e a aceitação genuína de quem somos."
    },
    {
        "title": "Lars and the Real Girl",
        "ptTitle": "A Garota Ideal",
        "year": "2007",
        "stream_id": 362588,
        "dubbed": True,
        "curatorNote": "Ryan Gosling em atuação sensível sobre fobia social, inadequação corporal e isolamento emocional, acolhido pela comunidade em um processo tocante de cura."
    },
    {
        "title": "The Skin I Live In",
        "ptTitle": "A Pele Que Habito",
        "year": "2011",
        "stream_id": 128885,
        "dubbed": True,
        "curatorNote": "Almodóvar investiga a relação entre a derme, a cirurgia plástica e a construção forçada da identidade corporal em um suspense psicológico hipnótico."
    },
    {
        "title": "Muriel's Wedding",
        "ptTitle": "O Casamento de Muriel",
        "year": "1994",
        "imdb_id": "tt0110598",
        "stream_id": 371911,
        "dubbed": True,
        "curatorNote": "Tragicromédia australiana icônica sobre Muriel, uma jovem que se sente feia, gorda e indesejada, sonhando com um casamento de fantasia para validar sua autoestima."
    },
    {
        "title": "Shallow Hal",
        "ptTitle": "O Amor É Cego",
        "year": "2001",
        "stream_id": 20729,
        "dubbed": True,
        "curatorNote": "Comédia dos irmãos Farrelly que desconstrói a futilidade dos padrões físicos convencionais ao fazer um homem superficial enxergar apenas a beleza interior das pessoas."
    },
    {
        "title": "I Feel Pretty",
        "ptTitle": "Sexy por Acidente",
        "year": "2018",
        "stream_id": 349060,
        "dubbed": True,
        "curatorNote": "Amy Schumer aborda a ansiedade estética moderna e demonstra como a autoconfiança e o amor-próprio transformam a realidade mais do que qualquer cirurgia."
    },
    {
        "title": "The Hunchback of Notre Dame",
        "ptTitle": "O Corcunda de Notre Dame",
        "year": "1996",
        "stream_id": 110824,
        "dubbed": True,
        "curatorNote": "Clássico adaptado de Victor Hugo sobre Quasímodo, vivendo recluso pelo medo do julgamento alheio à sua aparência física, revelando a verdadeira nobreza de caráter."
    },
    {
        "title": "Cyrano",
        "ptTitle": "Cyrano",
        "year": "2021",
        "imdb_id": "tt12889404",
        "stream_id": 157984,
        "dubbed": True,
        "curatorNote": "Peter Dinklage brilha como Cyrano de Bergerac, cuja imensa eloquência e coragem são paralisadas pela certeza dolorosa de que sua aparência o torna indigno do amor de Roxanne."
    },
    {
        "title": "Eighth Grade",
        "ptTitle": "Oitava Série",
        "year": "2018",
        "stream_id": 22492,
        "dubbed": True,
        "curatorNote": "Retrato cirúrgico e visceral de Bo Burnham sobre a angústia da adolescência, acnes, postura e o desespero de projetar aceitação no espelho e nas redes sociais."
    },
    {
        "title": "The Edge of Seventeen",
        "ptTitle": "Quase 18",
        "year": "2016",
        "stream_id": 20799,
        "dubbed": True,
        "curatorNote": "Hailee Steinfeld interpreta Nadine em seu turbilhão de insegurança estética, autoaversão e sensação constante de inadequação diante de colegas mais populares."
    },
    {
        "title": "Sierra Burgess Is a Loser",
        "ptTitle": "Sierra Burgess É uma Loser",
        "year": "2018",
        "stream_id": 20820,
        "dubbed": True,
        "curatorNote": "Releitura contemporânea sobre o medo de rejeição por não se encaixar nos moldes estéticos padronizados das adolescentes populares."
    },
    {
        "title": "Tall Girl",
        "ptTitle": "Crush à Altura",
        "year": "2019",
        "stream_id": 29643,
        "dubbed": True,
        "curatorNote": "A jornada de Jodi para superar anos de piadas e constrangimento devido à sua estatura elevada, aprendendo a ter orgulho de seu próprio porte físico."
    },
    {
        "title": "She's Out of My League",
        "ptTitle": "Ela É Demais para Mim",
        "year": "2010",
        "stream_id": 208853,
        "dubbed": True,
        "curatorNote": "Comédia ágil que examina a autodepreciação masculina e a escala numérica social de beleza física (Kirk se vê como um 5 e ela como um 10) sabotando o próprio relacionamento."
    },
    {
        "title": "She's All That",
        "ptTitle": "Ela É Demais",
        "year": "1999",
        "stream_id": 352997,
        "dubbed": True,
        "curatorNote": "Clássico dos anos 90 que satiriza a futilidade das transformações visuais de colegial, mostrando que o valor real reside na personalidade e nas paixões artísticas de Laney Boggs."
    },
    {
        "title": "The Devil Wears Prada",
        "ptTitle": "O Diabo Veste Prada",
        "year": "2006",
        "stream_id": 97193,
        "dubbed": True,
        "curatorNote": "Análise brilhante da pressão implacável da indústria da moda sobre peso, tamanho 36 e aparência externa, confrontando as concessões feitas para ser aceito."
    }
]

def slugify(text):
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[-\s]+", "-", text).strip("-")

def fetch_omdb(spec):
    if "imdb_id" in spec:
        url = f"https://www.omdbapi.com/?i={spec['imdb_id']}&apikey={OMDB_API_KEY}"
    else:
        url = f"https://www.omdbapi.com/?t={urllib.parse.quote(spec['title'])}&y={spec['year']}&apikey={OMDB_API_KEY}"
    
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=8) as res:
        data = json.load(res)
        if data.get("Response") == "True":
            return data
        else:
            print(f"OMDB fallback for {spec['title']}: {data.get('Error')}")
            # Try without year
            url2 = f"https://www.omdbapi.com/?t={urllib.parse.quote(spec['title'])}&apikey={OMDB_API_KEY}"
            with urllib.request.urlopen(urllib.request.Request(url2, headers={"User-Agent": "Mozilla/5.0"}), timeout=8) as res2:
                data2 = json.load(res2)
                if data2.get("Response") == "True":
                    return data2
    return {}

def main():
    print("Iniciando inclusao da categoria 'Baixa Autoestima'...")
    new_movies = []
    iptv_links = {}

    for spec in MOVIE_SPECS:
        print(f"Buscando metadados: {spec['title']} ({spec['year']})...")
        omdb = fetch_omdb(spec)
        poster = omdb.get("Poster") if omdb.get("Poster") != "N/A" else ""
        plot = omdb.get("Plot") if omdb.get("Plot") != "N/A" else spec["curatorNote"]
        rating = omdb.get("imdbRating") if omdb.get("imdbRating") != "N/A" else "7.0"
        director = omdb.get("Director") if omdb.get("Director") != "N/A" else "Curadoria"
        actors = omdb.get("Actors") if omdb.get("Actors") != "N/A" else ""
        genre = omdb.get("Genre") if omdb.get("Genre") != "N/A" else "Drama"
        runtime = omdb.get("Runtime") if omdb.get("Runtime") != "N/A" else "105 min"

        stream_url = f"http://contrafilenabrasa.net:80/movie/frc-561250/Yrwa1z/{spec['stream_id']}.mp4"

        movie_obj = {
            "id": slugify(spec["title"]),
            "title": spec["title"],
            "ptTitle": spec["ptTitle"],
            "year": spec["year"],
            "category": "baixa-autoestima",
            "parentCategory": "art",
            "curatorNote": spec["curatorNote"],
            "curatorReason": spec["curatorNote"],
            "dubbed": spec["dubbed"],
            "streamUrl": stream_url,
            "streamId": spec["stream_id"],
            "streamAvailable": True,
            "isDirect": True,
            "omdb": {
                "title": omdb.get("Title", spec["title"]),
                "year": omdb.get("Year", spec["year"]),
                "poster": poster,
                "plot": plot,
                "imdbRating": rating,
                "director": director,
                "actors": actors,
                "genre": genre,
                "runtime": runtime,
                "country": omdb.get("Country", "United States")
            }
        }
        new_movies.append(movie_obj)

        link_entry = {
            "streamId": spec["stream_id"],
            "streamUrl": stream_url,
            "streamName": spec["ptTitle"],
            "isDirect": True
        }
        iptv_links[spec["title"]] = link_entry
        iptv_links[spec["ptTitle"]] = link_entry

    # 1. Salvar pack
    pack_path = os.path.join(PACKS_DIR, "baixa-autoestima.json")
    with open(pack_path, "w", encoding="utf-8") as f:
        json.dump(new_movies, f, indent=2, ensure_ascii=False)
    print(f"Salvo pack com {len(new_movies)} filmes em {pack_path}")

    # 2. Atualizar categories.json
    cats_path = os.path.join(DATA_DIR, "categories.json")
    with open(cats_path, "r", encoding="utf-8") as f:
        categories = json.load(f)

    # Inserir id em art.subcategories se necessario
    for cat in categories:
        if cat["id"] == "art" and "subcategories" in cat:
            if "baixa-autoestima" not in cat["subcategories"]:
                cat["subcategories"].append("baixa-autoestima")

    cat_exists = any(c["id"] == "baixa-autoestima" for c in categories)
    if not cat_exists:
        new_category = {
            "id": "baixa-autoestima",
            "name": "Baixa Autoestima",
            "badgeLabel": "Autoimagem & Dismorfia",
            "accentColor": "#ec4899",
            "gradient": "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
            "glowColor": "rgba(236, 72, 153, 0.35)",
            "iconSvg": "<svg class=\"icon icon-stroke\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M16 16s-1.5-2-4-2-4 2-4 2\"/><line x1=\"9\" x2=\"9.01\" y1=\"9\" y2=\"9\"/><line x1=\"15\" x2=\"15.01\" y1=\"9\" y2=\"9\"/></svg>",
            "description": "Obras profundas e sensíveis sobre dismorfia corporal, inadequação física, rejeição estética e a jornada de autoaceitação.",
            "parentCategory": "art"
        }
        categories.append(new_category)

    with open(cats_path, "w", encoding="utf-8") as f:
        json.dump(categories, f, indent=2, ensure_ascii=False)
    print(f"Atualizado {cats_path}")

    # 3. Atualizar movies.json
    movs_path = os.path.join(DATA_DIR, "movies.json")
    with open(movs_path, "r", encoding="utf-8") as f:
        movies = json.load(f)

    existing_titles = set(m["title"] for m in movies)
    added_count = 0
    for nm in new_movies:
        if nm["title"] not in existing_titles:
            movies.append(nm)
            added_count += 1

    with open(movs_path, "w", encoding="utf-8") as f:
        json.dump(movies, f, indent=2, ensure_ascii=False)
    print(f"Adicionados {added_count} novos filmes em {movs_path} (Total: {len(movies)})")

    # 4. Atualizar iptv_movie_links.json
    links_path = os.path.join(DATA_DIR, "iptv_movie_links.json")
    with open(links_path, "r", encoding="utf-8") as f:
        existing_links = json.load(f)
    existing_links.update(iptv_links)
    with open(links_path, "w", encoding="utf-8") as f:
        json.dump(existing_links, f, indent=2, ensure_ascii=False)
    print(f"Atualizado {links_path}")

    # 5. Atualizar catalog.js
    catalog_path = os.path.join(DATA_DIR, "catalog.js")
    catalog_content = f"window.DEFAULT_CATALOG = {{\n  categories: {json.dumps(categories, indent=2, ensure_ascii=False)},\n  movies: {json.dumps(movies, indent=2, ensure_ascii=False)}\n}};\n"
    with open(catalog_path, "w", encoding="utf-8") as f:
        f.write(catalog_content)
    print(f"Atualizado {catalog_path}")

    print("Processo concluido com sucesso!")

if __name__ == "__main__":
    main()
