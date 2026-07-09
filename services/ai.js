const { responderComGemini } = require("./gemini");
const { responderComIA } = require("./openai");

function resumirErro(error) {
    const code = error?.cause?.code || error?.code;

    if (code === "EACCES") {
        return "ligacao bloqueada pelo sistema, firewall, antivirus ou rede";
    }

    if (code === "ENOTFOUND" || code === "ECONNREFUSED" || code === "ETIMEDOUT") {
        return "falha de ligacao a Internet ou DNS";
    }

    return error?.message || "erro desconhecido";
}

async function responderIA(pergunta) {
    const provedorPrincipal = process.env.AI_PROVIDER || "gemini";

    if (provedorPrincipal === "openai") {
        return await responderComIA(pergunta);
    }

    try {
        return await responderComGemini(pergunta, {
            throwOnError: true
        });
    } catch (erroGemini) {
        console.error(`Gemini indisponivel, tentando OpenAI: ${resumirErro(erroGemini)}`);

        if (!process.env.OPENAI_API_KEY) {
            return `Nao consegui comunicar com o Gemini (${resumirErro(erroGemini)}) e a OPENAI_API_KEY nao esta configurada para fallback.`;
        }

        try {
            return await responderComIA(pergunta);
        } catch (erroOpenAI) {
            console.error("Erro no fallback OpenAI:", erroOpenAI);

            return `Nao consegui comunicar com os provedores de IA. Gemini: ${resumirErro(erroGemini)}. OpenAI: ${resumirErro(erroOpenAI)}.`;
        }
    }
}

module.exports = {
    responderIA
};
