const path = require("path");

// Níveis de log
const LEVELS = {
    ERROR: "ERROR",
    WARN: "WARN",
    INFO: "INFO",
    DEBUG: "DEBUG"
};

const LOG_DIR = path.join(__dirname, "..", "logs");

/**
 * Formata uma mensagem de log com timestamp e nível
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem do log
 * @param {object} data - Dados adicionais (opcional)
 */
function formatLog(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const base = `[${timestamp}] [${level}] ${message}`;
    
    if (Object.keys(data).length > 0) {
        return `${base} ${JSON.stringify(data)}`;
    }
    
    return base;
}

const logger = {
    error(message, data) {
        const log = formatLog(LEVELS.ERROR, message, data);
        console.error(log);
    },

    warn(message, data) {
        const log = formatLog(LEVELS.WARN, message, data);
        console.warn(log);
    },

    info(message, data) {
        const log = formatLog(LEVELS.INFO, message, data);
        console.log(log);
    },

    debug(message, data) {
        if (process.env.NODE_ENV !== "production") {
            const log = formatLog(LEVELS.DEBUG, message, data);
            console.log(log);
        }
    }
};

module.exports = logger;
