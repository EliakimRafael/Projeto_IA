const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "conversations.json");
const MAX_MESSAGES_PER_CONVERSATION = 40;
let mutationQueue = Promise.resolve();

function serializeMutation(operation) {
    const result = mutationQueue.then(operation, operation);
    mutationQueue = result.catch(() => undefined);
    return result;
}

async function ensureStore() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error("Erro ao criar diretório de dados:", error);
    }

    try {
        await fs.stat(DB_PATH);
    } catch (error) {
        if (error.code === "ENOENT") {
            await fs.writeFile(DB_PATH, JSON.stringify({ conversations: {} }, null, 2));
        }
    }
}

async function readStore() {
    await ensureStore();

    try {
        const data = await fs.readFile(DB_PATH, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Erro ao ler store:", error);
        return { conversations: {} };
    }
}

async function writeStore(store) {
    await ensureStore();
    const temporaryPath = `${DB_PATH}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, JSON.stringify(store, null, 2));
    await fs.rename(temporaryPath, DB_PATH);
}

function createConversationId() {
    return crypto.randomUUID();
}

async function getConversation(conversationId) {
    const store = await readStore();

    if (!conversationId || !store.conversations[conversationId]) {
        return null;
    }

    return store.conversations[conversationId];
}

async function ensureConversation(conversationId) {
    return serializeMutation(async () => {
        const store = await readStore();
        const id = conversationId && store.conversations[conversationId]
            ? conversationId
            : createConversationId();

    if (!store.conversations[id]) {
        const now = new Date().toISOString();

        store.conversations[id] = {
            id,
            title: "Nova conversa",
            createdAt: now,
            updatedAt: now,
            messages: []
        };
    }

        await writeStore(store);

        return store.conversations[id];
    });
}

async function addMessage(conversationId, role, content) {
    return serializeMutation(async () => {
        const store = await readStore();
        const conversation = store.conversations[conversationId];

    if (!conversation) {
        return null;
    }

    const message = {
        id: crypto.randomUUID(),
        role,
        content: String(content || ""),
        createdAt: new Date().toISOString()
    };

    conversation.messages.push(message);
    conversation.messages = conversation.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    conversation.updatedAt = message.createdAt;

    if (conversation.title === "Nova conversa" && role === "user") {
        conversation.title = message.content.slice(0, 60) || "Nova conversa";
    }

        await writeStore(store);

        return message;
    });
}

async function deleteConversation(conversationId) {
    return serializeMutation(async () => {
        const store = await readStore();

    if (!conversationId || !store.conversations[conversationId]) {
        return false;
    }

    delete store.conversations[conversationId];
    await writeStore(store);

        return true;
    });
}

function formatHistoryForPrompt(conversation) {
    if (!conversation || !Array.isArray(conversation.messages)) {
        return "";
    }

    return conversation.messages
        .slice(-12)
        .map(message => {
            const label = message.role === "assistant" ? "Atlas" : "Utilizador";
            return `${label}: ${message.content}`;
        })
        .join("\n");
}

module.exports = {
    getConversation,
    ensureConversation,
    addMessage,
    deleteConversation,
    formatHistoryForPrompt
};
