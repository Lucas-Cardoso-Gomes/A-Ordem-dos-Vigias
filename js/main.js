/**
 * main.js
 * Main entry point, initialization, and loop.
 */

class Game {
    constructor() {
        this.player = new Player();
        this.inventory = new Inventory(this.player);
        this.combat = new CombatSystem(this.player, this.inventory);
        this.quests = new QuestSystem(this.player);
        
        // Export to window for UI access
        window.gamePlayer = this.player;
        window.gameInventory = this.inventory;
        window.gameCombat = this.combat;
        window.gameQuests = this.quests;
        window.game = this;

        this.ui = null;
        this.lastSave = Date.now();
    }

    init() {
        this.ui = new UIManager();
        this.load();
        
        // Trigger initial renders
        Engine.emit('playerUpdated', this.player);
        Engine.emit('inventoryUpdated', this.inventory);
        Engine.emit('equipmentUpdated', this.inventory.equipment);
        Engine.emit('questsUpdated', this.quests);
        Engine.emit('regionProgressUpdated');

        // Listen to combat events
        Engine.on('questUpdate', (data) => {
            if (data.type === 'kill') {
                this.quests.processKillEvent(data.monsterId, data.qty);
            }
        });

        // Auto-save loop
        setInterval(() => this.loop(), 1000);
        
        Engine.emit('systemLog', 'Bem-vindo à Aegis Nocturna, recruta!');
    }

    loop() {
        // Auto save every 30 seconds
        const now = Date.now();
        if (now - this.lastSave > 30000) {
            this.save();
            this.lastSave = now;
        }
    }

    save() {
        const state = {
            player: this.player.save(),
            inventory: this.inventory.save(),
            quests: this.quests.save(),
            mapProgress: MapSystem.progress,
            unlockedRegions: MapSystem.unlockedRegions
            // In a larger scale, we'd save bestiary, achievements, map unlocks, etc.
        };
        Engine.saveGame(state);
    }

    load() {
        const state = Engine.loadGame();
        if (state) {
            this.player.load(state.player);
            this.inventory.load(state.inventory);
            this.quests.load(state.quests);
            if (state.mapProgress) {
                MapSystem.progress = state.mapProgress;
            } else {
                MapSystem.progress = {};
            }
            if (state.unlockedRegions) {
                MapSystem.unlockedRegions = state.unlockedRegions;
            }
        } else {
            // New game initial items
            this.inventory.addItem(ItemDatabase.generateItem(1, 'comum')); // Give a starting item
            this.inventory.addItem(ItemDatabase.getPotion('p1'));
            this.quests.load(null); // Generates starting contracts
            MapSystem.unlockedRegions = ['floresta', 'helgen']; // Default initial regions
        }
    }
}

window.onload = () => {
    const game = new Game();
    game.init();
};