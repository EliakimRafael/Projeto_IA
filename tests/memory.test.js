const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const fs = require("fs").promises;

const {
    getConversation,
    ensureConversation,
    addMessage,
    deleteConversation,
    formatHistoryForPrompt
} = require("../services/memory");

// Teste para ensureConversation
test("ensureConversation deve criar uma nova conversa", async () => {
    const conversation = await ensureConversation(null);
    
    assert.ok(conversation, "Conversa deveria ter sido criada");
    assert.ok(conversation.id, "Conversa deveria ter um ID");
    assert.strictEqual(conversation.title, "Nova conversa", "Título deveria ser 'Nova conversa'");
    assert.ok(Array.isArray(conversation.messages), "Messages deveria ser um array");
    assert.strictEqual(conversation.messages.length, 0, "Messages deveria estar vazio");
});

// Teste para addMessage
test("addMessage deve adicionar uma mensagem à conversa", async () => {
    const conversation = await ensureConversation(null);
    const message = await addMessage(conversation.id, "user", "Olá Atlas!");
    
    assert.ok(message, "Mensagem deveria ter sido criada");
    assert.strictEqual(message.role, "user", "Role deveria ser 'user'");
    assert.strictEqual(message.content, "Olá Atlas!", "Content deveria ser 'Olá Atlas!'");
});

// Teste para getConversation
test("getConversation deve recuperar uma conversa existente", async () => {
    const created = await ensureConversation(null);
    const retrieved = await getConversation(created.id);
    
    assert.ok(retrieved, "Conversa deveria ter sido recuperada");
    assert.strictEqual(retrieved.id, created.id, "IDs deveriam ser iguais");
});

// Teste para deleteConversation
test("deleteConversation deve deletar uma conversa", async () => {
    const conversation = await ensureConversation(null);
    const deleted = await deleteConversation(conversation.id);
    
    assert.strictEqual(deleted, true, "deleteConversation deveria retornar true");
    
    const retrieved = await getConversation(conversation.id);
    assert.strictEqual(retrieved, null, "Conversa deletada não deveria ser recuperada");
});

// Teste para formatHistoryForPrompt
test("formatHistoryForPrompt deve formatar o histórico corretamente", async () => {
    const conversation = await ensureConversation(null);
    await addMessage(conversation.id, "user", "Teste 1");
    await addMessage(conversation.id, "assistant", "Resposta 1");
    
    const retrieved = await getConversation(conversation.id);
    const formatted = formatHistoryForPrompt(retrieved);
    
    assert.ok(formatted.includes("Utilizador: Teste 1"), "Histórico deveria conter a mensagem do utilizador");
    assert.ok(formatted.includes("Atlas: Resposta 1"), "Histórico deveria conter a resposta do assistente");
});

// Teste para máximo de mensagens
test("addMessage deve limitar a 40 mensagens", async () => {
    const conversation = await ensureConversation(null);
    
    for (let i = 0; i < 50; i++) {
        await addMessage(conversation.id, "user", `Mensagem ${i}`);
    }
    
    const retrieved = await getConversation(conversation.id);
    assert.strictEqual(
        retrieved.messages.length,
        40,
        "Deveria ter exatamente 40 mensagens após adicionar 50"
    );
});

test("addMessage nao deve perder mensagens simultaneas", async () => {
    const conversation = await ensureConversation(null);

    await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
            addMessage(conversation.id, "user", `Simultanea ${index}`)
        )
    );

    const retrieved = await getConversation(conversation.id);
    assert.strictEqual(retrieved.messages.length, 20);
});
