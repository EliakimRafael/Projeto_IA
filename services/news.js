async function obterNoticias() {
    if (!process.env.NEWS_API_KEY) {
        return "Para usar noticias, adiciona NEWS_API_KEY no ficheiro .env.";
    }

    try {
        let url = `https://newsapi.org/v2/top-headlines?country=pt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;

        let resposta = await fetch(url);
        let dados = await resposta.json();

        if (dados.status !== "ok") {
            return `Erro da NewsAPI: ${dados.message}`;
        }

        if (!dados.articles || dados.articles.length === 0) {
            url = `https://newsapi.org/v2/everything?q=Portugal&language=pt&sortBy=publishedAt&pageSize=5&apiKey=${process.env.NEWS_API_KEY}`;

            resposta = await fetch(url);
            dados = await resposta.json();
        }

        if (!dados.articles || dados.articles.length === 0) {
            return "Nao encontrei noticias neste momento.";
        }

        let texto = "Noticias de hoje:\n\n";

        dados.articles.forEach((noticia, index) => {
            texto += `${index + 1}. ${noticia.title}\n`;
            texto += `Fonte: ${noticia.source.name}\n\n`;
        });

        return texto;
    } catch (erro) {
        console.error("ERRO NEWS:", erro);
        return "Nao foi possivel obter noticias.";
    }
}

module.exports = {
    obterNoticias
};
