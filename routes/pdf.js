const express = require("express");
const multer = require("multer");
const fs = require("fs");

const router = express.Router();

const { lerPDF } = require("../services/pdf");
const { responderIA } = require("../services/ai");

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Apenas ficheiros PDF sao permitidos."));
        }

        cb(null, true);
    }
});

router.post("/", upload.single("arquivo"), async (req, res) => {
    let caminhoPDF = null;

    try {
        if (!req.file) {
            return res.status(400).json({
                erro: "Nenhum ficheiro foi enviado."
            });
        }

        caminhoPDF = req.file.path;

        const assinatura = Buffer.alloc(5);
        const descritor = fs.openSync(caminhoPDF, "r");
        fs.readSync(descritor, assinatura, 0, assinatura.length, 0);
        fs.closeSync(descritor);

        if (assinatura.toString("ascii") !== "%PDF-") {
            return res.status(400).json({
                erro: "O ficheiro enviado nao e um PDF valido."
            });
        }

        const pdf = await lerPDF(caminhoPDF);
        const textoLimitado = pdf.texto.slice(0, 12000);

        const pergunta = `
Le o texto deste PDF e faz um resumo claro em portugues.

O documento tem ${pdf.paginas} pagina(s).

Texto do PDF:

${textoLimitado}
        `;

        const resposta = await responderIA(pergunta);

        return res.json({
            resposta
        });
    } catch (erro) {
        console.error("ERRO PDF:", erro);

        return res.status(500).json({
            erro: erro.message || "Erro ao analisar o PDF."
        });
    } finally {
        if (caminhoPDF && fs.existsSync(caminhoPDF)) {
            fs.unlinkSync(caminhoPDF);
        }
    }
});

router.use((erro, req, res, next) => {
    if (erro instanceof multer.MulterError) {
        const status = erro.code === "LIMIT_FILE_SIZE" ? 413 : 400;

        return res.status(status).json({
            erro: erro.code === "LIMIT_FILE_SIZE"
                ? "O PDF deve ter no maximo 10 MB."
                : "Erro ao receber o ficheiro PDF."
        });
    }

    if (erro) {
        return res.status(400).json({
            erro: erro.message || "Erro ao receber o ficheiro PDF."
        });
    }

    return next();
});

module.exports = router;
