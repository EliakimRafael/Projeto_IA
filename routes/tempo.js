const express = require("express");
const router = express.Router();

const { responderTempo } = require("../services/weather");

router.post("/", async (req, res) => {
    try {
        const { pedido, latitude, longitude } = req.body;

        if (!pedido || !String(pedido).trim()) {
            return res.status(400).json({
                erro: "Escreva uma pergunta sobre o tempo."
            });
        }

        const resposta = await responderTempo(
            String(pedido).toLowerCase(),
            latitude,
            longitude
        );

        return res.json({ resposta });
    } catch (erro) {
        console.error("ERRO TEMPO:", erro);

        return res.status(500).json({
            erro: "Erro ao obter previsao do tempo."
        });
    }
});

module.exports = router;
