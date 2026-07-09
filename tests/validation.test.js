const test = require("node:test");
const assert = require("node:assert");

test("Teste básico de validação com Joi", async () => {
    const Joi = require("joi");
    
    const chatSchema = Joi.object({
        pedido: Joi.string()
            .required()
            .min(1)
            .max(5000)
            .trim(),
        latitude: Joi.number().optional(),
        longitude: Joi.number().optional()
    });

    // Teste 1: Entrada válida
    const validInput = { pedido: "Qual é o tempo?" };
    const { error: error1 } = chatSchema.validate(validInput);
    assert.strictEqual(error1, undefined, "Entrada válida não deveria gerar erro");

    // Teste 2: Pedido vazio
    const emptyInput = { pedido: "" };
    const { error: error2 } = chatSchema.validate(emptyInput);
    assert.ok(error2, "Pedido vazio deveria gerar erro");

    // Teste 3: Pedido muito longo
    const longInput = { pedido: "a".repeat(5001) };
    const { error: error3 } = chatSchema.validate(longInput);
    assert.ok(error3, "Pedido muito longo deveria gerar erro");

    // Teste 4: Latitude e longitude inválidas
    const invalidCoords = { pedido: "Teste", latitude: "abc" };
    const { error: error4 } = chatSchema.validate(invalidCoords);
    assert.ok(error4, "Latitude inválida deveria gerar erro");

    // Teste 5: Trim automático
    const trimInput = { pedido: "  Olá  " };
    const { value: trimValue } = chatSchema.validate(trimInput);
    assert.strictEqual(trimValue.pedido, "Olá", "Trim deveria ser aplicado automaticamente");
});

test("Teste de rate limiting com express-rate-limit", async () => {
    const rateLimit = require("express-rate-limit");
    
    // Verificar se rateLimit pode ser criado corretamente
    const limiter = rateLimit({
        windowMs: 60000,
        max: 30,
        message: "Muitas requisições.",
        standardHeaders: true,
        legacyHeaders: false
    });
    
    assert.ok(limiter, "Limiter deveria ter sido criado");
});

test("Teste de compressão", async () => {
    const compression = require("compression");
    
    // Verificar se compression pode ser usada
    const middleware = compression();
    assert.ok(middleware, "Compression middleware deveria ter sido criado");
});
