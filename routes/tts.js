const express = require("express");
const router = express.Router();

const { gerarAudio } = require("../services/tts");

router.post("/", async (req, res) => {
    try {
        const { texto } = req.body;

        if (!texto || !String(texto).trim()) {
            return res.status(400).json({
                erro: "Informe um texto para gerar voz."
            });
        }

        if (String(texto).length > 4000) {
            return res.status(400).json({
                erro: "O texto para voz nao pode ter mais de 4000 caracteres."
            });
        }

        const audio = await gerarAudio(texto);

        res.setHeader("Content-Type", "audio/mpeg");

        return res.send(audio);

    } catch (erro) {
        console.error(erro);

        return res.status(500).json({
            erro: erro.message || "Erro ao gerar voz."
        });
    }
});

module.exports = router;
