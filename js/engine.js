const Engine = {
    events: {},

    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    },

    // CORREÇÃO: Tratamento defensivo no disparo de eventos
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(listener => {
                try {
                    listener(data);
                } catch (err) {
                    console.error(`[Engine] Erro crítico ao processar o evento '${event}':`, err);
                }
            });
        }
    },

    saveGame(state) {
        try {
            const serializedState = JSON.stringify(state);
            localStorage.setItem('a_ordem_dos_vigias_save', serializedState);
            this.emit('systemLog', 'Jogo salvo com sucesso.');
        } catch (e) {
            console.error("Failed to save game", e);
            this.emit('systemLog', 'Erro ao salvar o jogo.');
        }
    },

    loadGame() {
        try {
            const serializedState = localStorage.getItem('a_ordem_dos_vigias_save');
            if (serializedState === null) return null;
            return JSON.parse(serializedState);
        } catch (e) {
            console.error("Failed to load game", e);
            return null;
        }
    },

    clearSave() {
        localStorage.removeItem('a_ordem_dos_vigias_save');
        this.emit('systemLog', 'Progresso resetado.');
    },

    // CORREÇÃO: Utilizando encodeURIComponent sem as funções depreciadas escape/unescape
    exportSave() {
        try {
            const serializedState = localStorage.getItem('a_ordem_dos_vigias_save');
            if (!serializedState) return null;
            return btoa(encodeURIComponent(serializedState));
        } catch (e) {
            console.error("Failed to export game", e);
            return null;
        }
    },

    importSave(base64Str) {
        try {
            const serializedState = decodeURIComponent(atob(base64Str));
            JSON.parse(serializedState); // Valida se é um JSON válido antes de salvar
            localStorage.setItem('a_ordem_dos_vigias_save', serializedState);
            return true;
        } catch (e) {
            console.error("Failed to import game", e);
            return false;
        }
    },

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    randomChance(percent) {
        return Math.random() * 100 <= percent;
    }
};

window.Engine = Engine;