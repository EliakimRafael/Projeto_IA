require("dotenv").config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const logger = require("./utils/logger");

const { responderIA } = require("./services/ai");
const { responderTempo } = require("./services/weather");
const { converterMoeda } = require("./services/currency");
const { obterNoticias } = require("./services/news");
const {
    getConversation,
    ensureConversation,
    addMessage,
    deleteConversation,
    formatHistoryForPrompt
} = require("./services/memory");
const pdfRoute = require("./routes/pdf");
const tempoRoute = require("./routes/tempo");
const moedasRoute = require("./routes/moedas");
const noticiasRoute = require("./routes/noticias");
const ttsRoute = require("./routes/tts");

const app = express();
const PORT = process.env.PORT || 3005;
const TIMEZONE = "Europe/Lisbon";

function positiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(origin => origin.trim()).filter(Boolean)
    : true;

// Middleware de compressão para reduzir tamanho das respostas
app.use(compression());

// Rate limiting para proteger contra abuso
const limiter = rateLimit({
    windowMs: positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    max: positiveInteger(process.env.RATE_LIMIT_REQUESTS, 30),
    message: "Muitas requisições. Tente novamente mais tarde.",
    standardHeaders: true,
    legacyHeaders: false
});

app.use(limiter);

app.use(cors({
    origin: allowedOrigins
}));
app.use(express.json({
    limit: "64kb"
}));
app.use(express.static("public"));

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(date, options) {
    return new Intl.DateTimeFormat("pt-PT", {
        timeZone: TIMEZONE,
        ...options
    }).format(date);
}

// Obtem sempre a data e hora reais do servidor no fuso horario de Portugal.
function getCurrentDateTime() {
    const now = new Date();

    return {
        date: formatDate(now, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }),
        time: formatDate(now, {
            hour: "2-digit",
            minute: "2-digit"
        }),
        full: formatDate(now, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    };
}

function detectIntent(message) {
    const text = normalizeText(message);
    const words = text.split(/[^a-z0-9]+/).filter(Boolean);
    const hasWord = word => words.includes(word);
    const hasAnyWord = list => list.some(hasWord);
    const hasAnyTerm = list => list.some(term => text.includes(term));

    const scores = {
        date_time: 0,
        weather: 0,
        football: 0,
        currency: 0,
        news: 0
    };

    if (hasAnyTerm([
        "que dia e hoje",
        "qual a data",
        "data de hoje",
        "que dia",
        "qual dia",
        "que horas",
        "hora atual",
        "horas sao",
        "dia de hoje"
    ])) {
        scores.date_time += 3;
    }

    if (hasAnyWord(["data", "hora", "horas", "hoje", "amanha", "ontem"])) {
        scores.date_time += 1;
    }

    if (hasAnyTerm([
        "jogos",
        "jogo",
        "copa",
        "campeonato",
        "futebol",
        "placar",
        "resultado",
        "partida",
        "partidas"
    ])) {
        scores.football += 2;
    }

    if (hasAnyTerm([
        "qual a temperatura",
        "previsao do tempo",
        "previsao para",
        "vai chover",
        "esta calor",
        "esta frio"
    ])) {
        scores.weather += 3;
    }

    if (hasAnyWord([
        "clima",
        "tempo",
        "temperatura",
        "chuva",
        "chover",
        "sol",
        "frio",
        "calor",
        "vento",
        "humidade"
    ])) {
        scores.weather += 2;
    }

    if (hasAnyTerm([
        "converter",
        "converte",
        "cotacao",
        "cambio",
        "quanto vale",
        "quanto da"
    ])) {
        scores.currency += 2;
    }

    if (hasAnyWord([
        "euro",
        "euros",
        "eur",
        "dolar",
        "dolares",
        "usd",
        "libra",
        "libras",
        "gbp",
        "real",
        "reais",
        "brl",
        "iene",
        "ienes",
        "jpy",
        "franco",
        "francos",
        "chf"
    ])) {
        scores.currency += 2;
    }

    if (hasAnyTerm([
        "noticias",
        "noticia",
        "manchetes",
        "jornal",
        "ultimas noticias",
        "noticias de hoje"
    ])) {
        scores.news += 3;
    }

    const ranked = Object.entries(scores)
        .sort((a, b) => b[1] - a[1]);

    if (ranked[0][1] > 0) {
        return ranked[0][0];
    }

    return "general";
}

function handleDateTimeIntent(message) {
    const text = normalizeText(message);
    const current = getCurrentDateTime();

    if (text.includes("hora")) {
        return `Agora sao ${current.time} em Portugal.`;
    }

    if (text.includes("amanha")) {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = formatDate(tomorrow, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        return `Amanha sera ${date}, em Portugal.`;
    }

    if (text.includes("ontem")) {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const date = formatDate(yesterday, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        return `Ontem foi ${date}, em Portugal.`;
    }

    return `Hoje e ${current.date}, em Portugal.`;
}

function extractCity(message) {
    const original = String(message || "").trim();
    const text = normalizeText(original);
    const patterns = [
        "temperatura em",
        "clima em",
        "tempo em",
        "chuva em",
        "frio em",
        "calor em",
        "em"
    ];

    for (const pattern of patterns) {
        const index = text.lastIndexOf(pattern);

        if (index !== -1) {
            const city = original.slice(index + pattern.length).trim();

            if (city) {
                return city.replace(/[?.!,;:]+$/g, "").trim();
            }
        }
    }

    return "Aveiro";
}

function getDateOnly(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);

    const year = parts.find(part => part.type === "year").value;
    const month = parts.find(part => part.type === "month").value;
    const day = parts.find(part => part.type === "day").value;

    return `${year}-${month}-${day}`;
}

function getFootballDate(message) {
    const text = normalizeText(message);
    const date = new Date();

    if (text.includes("amanha")) {
        date.setDate(date.getDate() + 1);
    } else if (text.includes("ontem")) {
        date.setDate(date.getDate() - 1);
    }

    return getDateOnly(date);
}

function extractFootballHour(message) {
    const text = normalizeText(message);
    const match = text.match(/(?:as|às|a|aos?)\s*(\d{1,2})(?:h|:00)?/);

    if (!match) {
        return null;
    }

    const hour = Number(match[1]);

    if (Number.isNaN(hour) || hour < 0 || hour > 23) {
        return null;
    }

    return hour;
}

function formatMatchTime(utcDate) {
    return formatDate(new Date(utcDate), {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function getMatchHour(utcDate) {
    return Number(formatDate(new Date(utcDate), {
        hour: "2-digit",
        hour12: false
    }));
}

function formatFootballMatch(match) {
    const home = match.homeTeam?.name || "Equipa da casa";
    const away = match.awayTeam?.name || "Equipa visitante";
    const competition = match.competition?.name || "competicao";
    const time = formatMatchTime(match.utcDate);
    const status = match.status || "SCHEDULED";
    const score = match.score?.fullTime;

    if (status === "FINISHED" && score?.home !== null && score?.away !== null) {
        return `${home} ${score.home}-${score.away} ${away} (${competition}, terminado).`;
    }

    if (status === "IN_PLAY" || status === "PAUSED") {
        return `${home} vs ${away} (${competition}) esta em jogo.`;
    }

    return `${time} - ${home} vs ${away} (${competition}).`;
}

async function handleWeatherIntent(message) {
    return await responderTempo(String(message).toLowerCase());
}

async function handleFootballIntent(message) {
    if (!process.env.FOOTBALL_API_KEY) {
        return "Para responder jogos em tempo real, configure a FOOTBALL_API_KEY no ficheiro .env.";
    }

    const date = getFootballDate(message);
    const requestedHour = extractFootballHour(message);
    const url = new URL("https://api.football-data.org/v4/matches");

    url.searchParams.set("dateFrom", date);
    url.searchParams.set("dateTo", date);

    const response = await fetch(url, {
        headers: {
            "X-Auth-Token": process.env.FOOTBALL_API_KEY
        }
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            return "A FOOTBALL_API_KEY e invalida, ainda nao esta ativa ou nao tem permissao para esta API. Confirme a chave no .env e reinicie o servidor.";
        }

        if (response.status === 429) {
            return "A API de futebol atingiu o limite de pedidos. Tente novamente daqui a pouco.";
        }

        return "Nao consegui consultar jogos em tempo real agora. Tente novamente mais tarde.";
    }

    const data = await response.json();
    let matches = data.matches || [];

    if (requestedHour !== null) {
        matches = matches.filter(match => getMatchHour(match.utcDate) === requestedHour);
    }

    if (matches.length === 0) {
        const hourText = requestedHour !== null ? ` as ${requestedHour}h` : "";

        return `Nao encontrei jogos${hourText} para ${date} nas competicoes disponiveis da tua API.`;
    }

    const limitedMatches = matches.slice(0, 5).map(formatFootballMatch);
    const more = matches.length > 5 ? `\n\nEncontrei mais ${matches.length - 5} jogo(s), mas mostrei apenas os primeiros.` : "";

    return `Jogos encontrados para ${date}:\n\n${limitedMatches.join("\n")}${more}`;
}

async function handleCurrencyIntent(message) {
    return await converterMoeda(normalizeText(message));
}

async function handleNewsIntent() {
    return await obterNoticias();
}

async function handleGeneralIntent(message, conversation) {
    const current = getCurrentDateTime();
    const history = formatHistoryForPrompt(conversation);
    const perguntaComContexto = [
        "Contexto do sistema:",
        "Es o Atlas AI Assistant. Responde em portugues de Portugal, de forma clara e objetiva.",
        `Data e hora atual em Portugal (${TIMEZONE}): ${current.full}.`,
        "Nunca inventes a data ou hora atual; usa apenas a informacao fornecida neste contexto.",
        "Nao inventes dados em tempo real.",
        "Quando a pergunta exigir dados em tempo real e nenhuma ferramenta tiver sido acionada, explica que pode ser necessario consultar uma API externa.",
        "Ferramentas disponiveis no backend: clima, jogos, noticias, cotacoes, PDF e voz.",
        "Usa o historico apenas quando for relevante para responder a mensagem atual.",
        "",
        "Historico recente da conversa:",
        history || "Sem historico anterior.",
        "",
        "Mensagem do utilizador:",
        message
    ].join("\n");

    return await responderIA(perguntaComContexto);
}

app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body.message || req.body.pedido;

        if (!message || !String(message).trim()) {
            return res.status(400).json({
                erro: "Escreva uma pergunta."
            });
        }

        const normalizedMessage = String(message).trim();

        if (normalizedMessage.length > 5000) {
            return res.status(400).json({
                erro: "A mensagem nao pode ter mais de 5000 caracteres."
            });
        }

        const conversation = await ensureConversation(req.body.conversationId);
        await addMessage(conversation.id, "user", normalizedMessage);

        const intent = detectIntent(message);
        let resposta;

        if (intent === "date_time") {
            resposta = handleDateTimeIntent(normalizedMessage);
        } else if (intent === "weather") {
            resposta = await handleWeatherIntent(normalizedMessage);
        } else if (intent === "football") {
            resposta = await handleFootballIntent(normalizedMessage);
        } else if (intent === "currency") {
            resposta = await handleCurrencyIntent(normalizedMessage);
        } else if (intent === "news") {
            resposta = await handleNewsIntent();
        } else {
            resposta = await handleGeneralIntent(normalizedMessage, conversation);
        }

        await addMessage(conversation.id, "assistant", resposta);

        return res.json({
            conversationId: conversation.id,
            intent,
            resposta
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: "Ocorreu um erro ao processar a sua mensagem. Tente novamente."
        });
    }
});

app.get("/api/conversations/:id", async (req, res, next) => {
    try {
        const conversation = await getConversation(req.params.id);

        if (!conversation) {
            return res.status(404).json({
                erro: "Conversa nao encontrada."
            });
        }

        return res.json({ conversation });
    } catch (error) {
        return next(error);
    }
});

app.delete("/api/conversations/:id", async (req, res, next) => {
    try {
        const deleted = await deleteConversation(req.params.id);

        return res.status(deleted ? 200 : 404).json({
            ok: deleted,
            ...(deleted ? {} : { erro: "Conversa nao encontrada." })
        });
    } catch (error) {
        return next(error);
    }
});

app.use("/api/tempo", tempoRoute);
app.use("/api/moedas", moedasRoute);
app.use("/api/noticias", noticiasRoute);
app.use("/api/tts", ttsRoute);
app.use("/api/pdf", pdfRoute);

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
        return res.status(400).json({ erro: "O corpo JSON do pedido e invalido." });
    }

    logger.error("Erro nao tratado na requisicao", {
        message: error?.message,
        path: req.path
    });

    return res.status(500).json({ erro: "Erro interno do servidor." });
});

if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Atlas AI Assistant iniciado na porta ${PORT}`);
        console.log(`
==========================================
Atlas AI Assistant iniciado!
==========================================

Servidor:
http://localhost:${PORT}

Rotas disponiveis:

/api/chat
/api/tempo
/api/moedas
/api/noticias
/api/tts

==========================================
`);
    });
}

module.exports = {
    app,
    getCurrentDateTime,
    detectIntent,
    handleDateTimeIntent,
    extractCity,
    handleWeatherIntent,
    handleFootballIntent,
    handleCurrencyIntent,
    handleNewsIntent,
    handleGeneralIntent
};
