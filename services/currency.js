async function converterMoeda(texto) {
    const moedas = {
        euro: "EUR",
        euros: "EUR",
        eur: "EUR",

        dolar: "USD",
        dolares: "USD",
        usd: "USD",

        libra: "GBP",
        libras: "GBP",
        gbp: "GBP",

        real: "BRL",
        reais: "BRL",
        brl: "BRL",

        iene: "JPY",
        ienes: "JPY",
        jpy: "JPY",

        franco: "CHF",
        francos: "CHF",
        chf: "CHF"
    };

    const numeroEncontrado = texto.match(/\d+([.,]\d+)?/);

    if (!numeroEncontrado) {
        return "Indica um valor para converter. Exemplo: converter 50 euros para dolares.";
    }

    const valor = Number(numeroEncontrado[0].replace(",", "."));

    let origem = null;
    let destino = null;

    for (const nomeMoeda in moedas) {
        if (texto.includes(nomeMoeda)) {
            if (!origem) {
                origem = moedas[nomeMoeda];
            } else if (!destino && moedas[nomeMoeda] !== origem) {
                destino = moedas[nomeMoeda];
            }
        }
    }

    if (!origem) origem = "EUR";
    if (!destino) destino = "USD";

    const url = `https://api.frankfurter.dev/v1/latest?amount=${valor}&from=${origem}&to=${destino}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        return "Nao consegui consultar a cotacao agora.";
    }

    const dados = await resposta.json();

    if (!dados.rates || !dados.rates[destino]) {
        return "Nao consegui converter essa moeda.";
    }

    const convertido = dados.rates[destino];
    const taxa = convertido / valor;

    return `
Conversao de moeda

${valor} ${origem} = ${convertido} ${destino}

Taxa aproximada:
1 ${origem} = ${taxa.toFixed(4)} ${destino}
    `;
}

module.exports = {
    converterMoeda
};
