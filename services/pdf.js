const fs = require("fs");
const { PDFParse } = require("pdf-parse");

async function lerPDF(caminho) {
    try {
        const buffer = fs.readFileSync(caminho);

        const parser = new PDFParse({
            data: buffer
        });

        const resultado = await parser.getText();

        await parser.destroy();

        return {
            paginas: resultado.total || 1,
            texto: resultado.text
        };

    } catch (erro) {
        console.error("Erro ao ler PDF:", erro);
        throw erro;
    }
}

module.exports = {
    lerPDF
};