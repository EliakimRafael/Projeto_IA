const { extrairCidade } = require("../utils/cidades");

async function procurarCidade(cidade) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`;

    let resposta;

    try {
        resposta = await fetch(url);
    } catch (erro) {
        console.error("ERRO GEOCODING OPEN-METEO:", erro);
        return {
            erro: "Nao consegui ligar a Open-Meteo agora. Verifique a Internet, firewall ou certificados do Node.js."
        };
    }

    if (!resposta.ok) {
        return {
            erro: "Nao consegui procurar essa cidade na Open-Meteo agora."
        };
    }

    const dados = await resposta.json();

    if (!dados.results || dados.results.length === 0) {
        return null;
    }

    return dados.results[0];
}

async function obterTempo(latitude, longitude, nomeLocal = "local") {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    let resposta;

    try {
        resposta = await fetch(url);
    } catch (erro) {
        console.error("ERRO OPEN-METEO:", erro);
        return "Nao consegui ligar a Open-Meteo agora. Verifique a Internet, firewall ou certificados do Node.js.";
    }

    if (!resposta.ok) {
        return "Nao consegui consultar a previsao do tempo agora.";
    }

    const dados = await resposta.json();
    const atual = dados.current;
    const diario = dados.daily;

    if (!atual || !diario) {
        return "A API do tempo nao devolveu dados suficientes.";
    }

    return `
Previsao do tempo em ${nomeLocal}

Temperatura atual: ${atual.temperature_2m} C
Humidade: ${atual.relative_humidity_2m}%
Precipitacao atual: ${atual.precipitation} mm
Vento: ${atual.wind_speed_10m} km/h

Hoje:
Maxima: ${diario.temperature_2m_max[0]} C
Minima: ${diario.temperature_2m_min[0]} C
Probabilidade de chuva: ${diario.precipitation_probability_max[0]}%
    `;
}

async function responderTempo(texto, latitude, longitude) {
    const cidade = extrairCidade(texto);

    if (cidade) {
        const local = await procurarCidade(cidade);

        if (local?.erro) {
            return local.erro;
        }

        if (!local) {
            return `Nao encontrei a cidade "${cidade}". Tenta escrever, por exemplo: temperatura em Lisboa.`;
        }

        return await obterTempo(
            local.latitude,
            local.longitude,
            `${local.name}, ${local.country}`
        );
    }

    const latitudeNumerica = Number(latitude);
    const longitudeNumerica = Number(longitude);
    const coordenadasValidas = Number.isFinite(latitudeNumerica)
        && Number.isFinite(longitudeNumerica)
        && latitudeNumerica >= -90
        && latitudeNumerica <= 90
        && longitudeNumerica >= -180
        && longitudeNumerica <= 180;

    if (coordenadasValidas && latitude !== null && latitude !== undefined
        && longitude !== null && longitude !== undefined) {
        return await obterTempo(latitudeNumerica, longitudeNumerica, "localizacao atual");
    }

    return `Nao consegui obter a tua localizacao automaticamente.

Podes perguntar assim:

tempo em Lisboa
temperatura em Porto
vai chover em Vila do Conde`;
}

module.exports = {
    responderTempo
};
