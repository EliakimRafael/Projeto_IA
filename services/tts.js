const { OpenAI } = require("openai");

let client = null;

function getOpenAIClient() {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }

    if (!client) {
        client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    return client;
}

async function gerarAudio(texto) {
    const openai = getOpenAIClient();

    if (!openai) {
        throw new Error("Configure a OPENAI_API_KEY no ficheiro .env para usar voz.");
    }

    if (!texto || !String(texto).trim()) {
        throw new Error("Informe um texto para gerar audio.");
    }

    const audio = await openai.audio.speech.create({
        model: "gpt-4o-mini-tts",
        voice: "onyx",
        input: String(texto).slice(0, 4000),
        instructions: "Fale em portugues do Brasil, com voz masculina, calma, elegante, tecnologica e parecida com um assistente futurista."
    });

    return Buffer.from(await audio.arrayBuffer());
}

module.exports = {
    gerarAudio
};
