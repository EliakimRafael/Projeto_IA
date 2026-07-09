const express = require("express");
const router = express.Router();

const { converterMoeda } = require("../services/currency");

router.post("/", async (req, res) => {
    try {
        const { pedido } = req.body;

        if (!pedido || !String(pedido).trim()) {
            return res.status(400).json({
                erro: "Indique o valor e as moedas para converter."
            });
        }

        const resposta = await converterMoeda(String(pedido).toLowerCase());

        return res.json({ resposta });
    } catch (erro) {
        console.error("ERRO MOEDAS:", erro);

        return res.status(500).json({
            erro: "Erro ao converter moeda."
        });
    }
});

module.exports = router;
