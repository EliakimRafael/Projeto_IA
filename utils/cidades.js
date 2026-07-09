function extrairCidade(texto) {
    const textoLimpo = String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    const padroes = [
        /\b(?:tempo|temperatura|clima|previsao|chuva)\s+(?:em|no|na|nos|nas|de|do|da|dos|das)\s+(.+)$/,
        /\b(?:vai chover)\s+(?:em|no|na|nos|nas)\s+(.+)$/,
        /\bcomo esta o tempo\s+(?:em|no|na|nos|nas|de|do|da|dos|das)\s+(.+)$/,
        /\bqual (?:e )?a temperatura\s+(?:em|no|na|nos|nas|de|do|da|dos|das)\s+(.+)$/
    ];

    for (const padrao of padroes) {
        const match = textoLimpo.match(padrao);

        if (match?.[1]) {
            return match[1]
                .replace(/\b(hoje|amanha|ontem|agora|mais tarde|a noite|de noite|de tarde|de manha)\b/g, "")
                .replace(/[?.!,;:]+$/g, "")
                .trim();
        }
    }

    return null;
}

function contem(texto, palavras) {
    return palavras.some(palavra => texto.includes(palavra));
}

module.exports = {
    extrairCidade,
    contem
};
