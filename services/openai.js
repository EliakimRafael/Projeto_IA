const { OpenAI } = require("openai");
const { formatarDataHora } = require("../utils/datas");

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

async function responderComIA(pedido) {
    const openai = getOpenAIClient();

    if (!openai) {
        return "Para responder com OpenAI, configure a OPENAI_API_KEY no ficheiro .env.";
    }

    const resposta = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `Es o Atlas AI Assistant. Responde em portugues de Portugal, de forma clara e objetiva. A data e hora atual e: ${formatarDataHora()}.`
            },
            {
                role: "user",
                content: pedido
            }
        ]
    });

    return resposta.choices[0].message.content;
}

module.exports = {
    responderComIA
};
