const pedido = document.getElementById("pedido");
const botao = document.getElementById("enviar");
const chat = document.getElementById("chat");
const limpar = document.getElementById("limpar");

let ultimaResposta = "";
let audioAtual = null;
let conversationId = localStorage.getItem("atlasConversationId");

const icones = {
    robo: "\uD83E\uDD16",
    microfone: "\uD83C\uDFA4",
    altoFalante: "\uD83D\uDD0A",
    falando: "\uD83D\uDDE3\uFE0F",
    gravando: "\uD83D\uDD34",
    clipe: "\uD83D\uDCCE",
    pdf: "\uD83D\uDCC4",
    lendo: "\uD83D\uDCD1"
};

const mensagemInicial = `${icones.robo} Ola! Sou o Atlas AI Assistente. Como posso ajudar?`;

function horaAtual() {
    const agora = new Date();

    return agora.toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function guardarMensagem(texto, tipo) {
    // A memoria principal fica no backend. Esta funcao permanece para manter
    // a assinatura de adicionarMensagem simples.
}

function escaparHtml(texto) {
    return String(texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderizarMarkdownSeguro(texto) {
    const template = document.createElement("template");
    let html = escaparHtml(texto);

    html = html
        .replace(/`([^`\n]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

    template.innerHTML = html;

    return template.content.cloneNode(true);
}

function adicionarMensagem(texto, tipo, guardar = true) {
    const mensagem = document.createElement("div");
    mensagem.classList.add("mensagem", tipo);

    const bolha = document.createElement("div");
    bolha.classList.add("bolha");

    const conteudo = document.createElement("span");
    conteudo.classList.add("conteudo-mensagem");

    if (tipo === "ia") {
        conteudo.appendChild(renderizarMarkdownSeguro(texto));
    } else {
        conteudo.textContent = texto;
    }

    const hora = document.createElement("span");
    hora.classList.add("hora");
    hora.textContent = horaAtual();

    bolha.appendChild(conteudo);
    bolha.appendChild(hora);
    mensagem.appendChild(bolha);
    chat.appendChild(mensagem);

    chat.scrollTop = chat.scrollHeight;

    if (guardar) {
        guardarMensagem(texto, tipo);
    }

    return mensagem;
}

async function carregarHistorico() {
    chat.innerHTML = "";

    if (!conversationId) {
        adicionarMensagem(mensagemInicial, "ia");
        return;
    }

    try {
        const resposta = await fetch(`/api/conversations/${conversationId}`);

        if (!resposta.ok) {
            throw new Error("Conversa nao encontrada.");
        }

        const dados = await resposta.json();
        const mensagens = dados.conversation?.messages || [];

        if (mensagens.length === 0) {
            adicionarMensagem(mensagemInicial, "ia");
            return;
        }

        mensagens.forEach((mensagem) => {
            const tipo = mensagem.role === "user" ? "usuario" : "ia";

            adicionarMensagem(mensagem.content, tipo, false);

            if (tipo === "ia") {
                ultimaResposta = mensagem.content;
            }
        });
    } catch (erro) {
        localStorage.removeItem("atlasConversationId");
        conversationId = null;
        ultimaResposta = "";

        adicionarMensagem(mensagemInicial, "ia");
    }
}

async function enviarMensagem() {
    const texto = pedido.value.trim();

    if (texto === "") {
        return;
    }

    adicionarMensagem(texto, "usuario");

    pedido.value = "";
    botao.disabled = true;

    const mensagemPensando = adicionarMensagem(`${icones.robo} Atlas esta a escrever...`, "ia", false);

    try {
        const req = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pedido: texto,
                message: texto,
                conversationId
            })
        });

        const dados = await req.json().catch(() => ({
            erro: "Resposta invalida do servidor."
        }));

        mensagemPensando.remove();

        const respostaFinal = dados.resposta || dados.erro || "Nao consegui responder. Tenta novamente daqui a pouco.";

        if (dados.conversationId) {
            conversationId = dados.conversationId;
            localStorage.setItem("atlasConversationId", conversationId);
        }

        ultimaResposta = respostaFinal;

        adicionarMensagem(respostaFinal, "ia");
    } catch (erro) {
        mensagemPensando.remove();

        const mensagemErro = "Erro ao comunicar com o servidor.";
        ultimaResposta = mensagemErro;

        adicionarMensagem(mensagemErro, "ia");
    }

    botao.disabled = false;
    pedido.focus();
}

botao.addEventListener("click", enviarMensagem);

pedido.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        enviarMensagem();
    }
});

limpar.addEventListener("click", async function() {
    if (conversationId) {
        await fetch(`/api/conversations/${conversationId}`, {
            method: "DELETE"
        }).catch(() => null);
    }

    localStorage.removeItem("atlasConversationId");
    localStorage.removeItem("atlasHistorico");

    chat.innerHTML = "";
    conversationId = null;
    ultimaResposta = "";

    if (audioAtual) {
        audioAtual.pause();
        audioAtual = null;
    }

    adicionarMensagem(mensagemInicial, "ia");
});

const botaoVoz = document.createElement("button");
botaoVoz.textContent = icones.microfone;
botaoVoz.id = "voz";
botaoVoz.title = "Falar";

const botaoOuvir = document.createElement("button");
botaoOuvir.textContent = icones.altoFalante;
botaoOuvir.id = "ouvir";
botaoOuvir.title = "Ouvir ultima resposta";

document.querySelector(".chat-input").appendChild(botaoVoz);
document.querySelector(".chat-input").appendChild(botaoOuvir);

async function falarTexto(texto) {
    try {
        botaoOuvir.disabled = true;
        botaoOuvir.textContent = icones.falando;

        if (audioAtual) {
            audioAtual.pause();
            audioAtual = null;
        }

        const resposta = await fetch("/api/tts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                texto
            })
        });

        if (!resposta.ok) {
            throw new Error("Erro ao gerar audio.");
        }

        const audioBlob = await resposta.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        audioAtual = new Audio(audioUrl);

        audioAtual.onended = () => {
            botaoOuvir.disabled = false;
            botaoOuvir.textContent = icones.altoFalante;
            URL.revokeObjectURL(audioUrl);
        };

        audioAtual.onerror = () => {
            botaoOuvir.disabled = false;
            botaoOuvir.textContent = icones.altoFalante;
            adicionarMensagem("Nao consegui reproduzir a voz natural.", "ia");
        };

        await audioAtual.play();
    } catch (erro) {
        console.error(erro);

        botaoOuvir.disabled = false;
        botaoOuvir.textContent = icones.altoFalante;

        adicionarMensagem("Nao consegui gerar a voz natural.", "ia");
    }
}

botaoOuvir.addEventListener("click", () => {
    if (ultimaResposta) {
        falarTexto(ultimaResposta);
    } else {
        adicionarMensagem("Ainda nao existe resposta para ler.", "ia");
    }
});

botaoVoz.addEventListener("click", () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        adicionarMensagem("O teu navegador nao suporta reconhecimento de voz.", "ia");
        return;
    }

    const reconhecimento = new SpeechRecognition();

    reconhecimento.lang = "pt-PT";
    reconhecimento.start();

    botaoVoz.textContent = icones.gravando;

    reconhecimento.onresult = (event) => {
        const textoFalado = event.results[0][0].transcript;
        pedido.value = textoFalado;
        enviarMensagem();
    };

    reconhecimento.onerror = () => {
        adicionarMensagem("Nao consegui ouvir a tua voz.", "ia");
        botaoVoz.textContent = icones.microfone;
    };

    reconhecimento.onend = () => {
        botaoVoz.textContent = icones.microfone;
    };
});

const botaoArquivo = document.createElement("button");
botaoArquivo.textContent = icones.clipe;
botaoArquivo.id = "arquivo";
botaoArquivo.title = "Enviar PDF";

const inputArquivo = document.createElement("input");
inputArquivo.type = "file";
inputArquivo.accept = "application/pdf";
inputArquivo.style.display = "none";

document.querySelector(".chat-input").appendChild(botaoArquivo);
document.body.appendChild(inputArquivo);

botaoArquivo.addEventListener("click", () => {
    inputArquivo.click();
});

inputArquivo.addEventListener("change", async () => {
    const arquivo = inputArquivo.files[0];

    if (!arquivo) {
        return;
    }

    adicionarMensagem(`${icones.pdf} PDF enviado: ${arquivo.name}`, "usuario");

    const mensagemPensando = adicionarMensagem(`${icones.lendo} Atlas esta a analisar o PDF...`, "ia", false);

    const formData = new FormData();
    formData.append("arquivo", arquivo);

    try {
        const req = await fetch("/api/pdf", {
            method: "POST",
            body: formData
        });

        const dados = await req.json().catch(() => ({
            erro: "Resposta invalida do servidor."
        }));

        mensagemPensando.remove();

        const respostaFinal = dados.resposta || dados.erro || "Nao consegui analisar o PDF.";

        ultimaResposta = respostaFinal;

        adicionarMensagem(respostaFinal, "ia");
    } catch (erro) {
        mensagemPensando.remove();

        adicionarMensagem("Erro ao enviar o PDF para o servidor.", "ia");
    }

    inputArquivo.value = "";
});

carregarHistorico();
