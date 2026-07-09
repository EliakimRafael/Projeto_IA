const express = require("express");
const Joi = require("joi");
const router = express.Router();

const { responderIA } = require("../services/ai");
const { responderTempo } = require("../services/weather");
const { converterMoeda } = require("../services/currency");
const { obterNoticias } = require("../services/news");

const { contem } = require("../utils/cidades");
const { formatarDataHora } = require("../utils/datas");

// Schema de validação para o corpo da requisição
const chatSchema = Joi.object({
    pedido: Joi.string()
        .required()
        .min(1)
        .max(5000)
        .trim()
        .messages({
            "string.empty": "O pedido não pode estar vazio.",
            "string.max": "O pedido não pode ter mais de 5000 caracteres.",
            "any.required": "O campo 'pedido' é obrigatório."
        }),
    latitude: Joi.number().optional().messages({
        "number.base": "Latitude deve ser um número."
    }),
    longitude: Joi.number().optional().messages({
        "number.base": "Longitude deve ser um número."
    }),
    conversationId: Joi.string().optional().messages({
        "string.base": "conversationId deve ser uma string."
    })
});

router.post("/", async (req, res) => {
    try {
        // Validar entrada com Joi
        const { error, value } = chatSchema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const mensagens = error.details.map(d => d.message).join(", ");
            return res.status(400).json({ erro: mensagens });
        }

        const { pedido, latitude, longitude } = value;
        const texto = String(pedido).toLowerCase();

        if (contem(texto, [
            "que dia e hoje",
            "data",
            "hora",
            "horas",
            "que horas sao"
        ])) {
            return res.json({
                resposta: formatarDataHora()
            });
        }

        if (contem(texto, [
            "tempo",
            "temperatura",
            "clima",
            "chuva",
            "chover",
            "previsao"
        ])) {
            const resposta = await responderTempo(
                texto,
                latitude,
                longitude
            );

            return res.json({ resposta });
        }

        if (contem(texto, [
            "converter",
            "converte",
            "moeda",
            "euro",
            "euros",
            "dolar",
            "dolares",
            "libra",
            "libras",
            "real",
            "reais",
            "iene",
            "ienes"
        ])) {
            const resposta = await converterMoeda(texto);

            return res.json({ resposta });
        }

        if (contem(texto, [
            "noticias",
            "jornal",
            "manchetes"
        ])) {
            const resposta = await obterNoticias();

            return res.json({ resposta });
        }

        const resposta = await responderIA(pedido);

        return res.json({ resposta });
    } catch (erro) {
        console.error("Erro no chat:", erro);

        return res.status(500).json({
            erro: erro.message || "Erro ao processar a mensagem."
        });
    }
});

module.exports = router;
