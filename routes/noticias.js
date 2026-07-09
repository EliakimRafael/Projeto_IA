const express = require("express");
const router = express.Router();

const { obterNoticias } = require("../services/news");

router.post("/", async (req, res) => {

    try {

        const resposta = await obterNoticias();

        res.json({
            resposta
        });

    } catch (erro) {

        console.error("ERRO NOTÍCIAS:", erro);

        res.status(500).json({
            erro: "Erro ao obter notícias."
        });

    }

});

module.exports = router;