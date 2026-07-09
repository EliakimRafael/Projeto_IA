const test = require("node:test");
const assert = require("node:assert/strict");

process.env.RATE_LIMIT_REQUESTS = "1000";
const { app } = require("../server");

async function withServer(callback) {
    const server = app.listen(0);
    await new Promise(resolve => server.once("listening", resolve));

    try {
        const { port } = server.address();
        await callback(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

test("chat cria uma conversa persistente e recuperavel", async () => {
    await withServer(async baseUrl => {
        const chatResponse = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pedido: "Que horas sao?" })
        });
        assert.strictEqual(chatResponse.status, 200);

        const chat = await chatResponse.json();
        assert.ok(chat.conversationId);

        const historyResponse = await fetch(
            `${baseUrl}/api/conversations/${chat.conversationId}`
        );
        assert.strictEqual(historyResponse.status, 200);

        const history = await historyResponse.json();
        assert.strictEqual(history.conversation.messages.length, 2);
        assert.strictEqual(history.conversation.messages[0].role, "user");
        assert.strictEqual(history.conversation.messages[1].role, "assistant");
    });
});

test("chat rejeita mensagens acima do limite", async () => {
    await withServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ pedido: "a".repeat(5001) })
        });

        assert.strictEqual(response.status, 400);
    });
});

test("historico inexistente devolve 404", async () => {
    await withServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/api/conversations/inexistente`);
        assert.strictEqual(response.status, 404);
    });
});
