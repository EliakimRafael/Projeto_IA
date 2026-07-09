function formatarDataHora() {
    const agora = new Date();

    return agora.toLocaleString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

module.exports = {
    formatarDataHora
};