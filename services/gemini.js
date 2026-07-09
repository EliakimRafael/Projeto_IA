const { GoogleGenAI } = require("@google/genai");

let client = null;

function getGeminiClient() {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    if (!client) {
        client = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });
    }

    return client;
}

async function responderComGemini(pedido, options = {}) {
    try {
        const ai = getGeminiClient();

        if (!ai) {
            if (options.throwOnError) {
                throw new Error("GEMINI_API_KEY ausente.");
            }

            return "Para responder com Gemini, configure a GEMINI_API_KEY no ficheiro .env.";
        }

        const systemPrompt = `
Voce e o Atlas IA, um assistente inteligente, moderno, simpatico e natural.

Voce deve:
- conversar de forma amigavel;
- responder com clareza;
- explicar programacao passo a passo;
- ajudar com estudos, projetos, PDFs e tecnologia;
- dar exemplos quando for util;
- organizar respostas grandes com titulos e listas;
- ser educado, mas tambem dinamico;
- admitir quando nao souber algo.

O utilizador chama-se Eliakim Rafael.
`;

        const prompt = `
${systemPrompt}

Mensagem do utilizador:
${pedido}
`;

        const resposta = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            contents: prompt
        });

        return resposta.text || "Nao consegui gerar uma resposta agora.";
    } catch (erro) {
        console.error("Erro no Gemini:", erro);

        if (options.throwOnError) {
            throw erro;
        }

        return "Ocorreu um erro ao comunicar com o Gemini. Verifique a GEMINI_API_KEY, o modelo configurado e a ligacao a Internet.";
    }
}

module.exports = {
    responderComGemini
};
