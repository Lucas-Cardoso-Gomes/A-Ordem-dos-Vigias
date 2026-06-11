/**
 * engine.js
 * Core event system and LocalStorage save/load functionality.
 */

const Engine = {
    events: {},

    // Simple Pub/Sub event system
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    },

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(data));
        }
    },

    // Save state to LocalStorage
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

    // Load state from LocalStorage
    loadGame() {
        try {
            const serializedState = localStorage.getItem('a_ordem_dos_vigias_save');
            if (serializedState === null) {
                return null;
            }
            return JSON.parse(serializedState);
        } catch (e) {
            console.error("Failed to load game", e);
            return null;
        }
    },

    // Clear saved game
    clearSave() {
        localStorage.removeItem('a_ordem_dos_vigias_save');
        this.emit('systemLog', 'Progresso resetado.');
    },
    
    // RNG Utilities
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    randomChance(percent) {
        return Math.random() * 100 <= percent;
    }
};

window.Engine = Engine;
