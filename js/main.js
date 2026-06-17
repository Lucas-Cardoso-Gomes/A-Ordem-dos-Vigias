/**
 * main.js
 * Main entry point, initialization, and loop.
 */

class Game {
    constructor() {
        this.party = [new Player()];
        this.inventory = new Inventory();
        this.combat = new CombatSystem(this.party, this.inventory);
        this.quests = new QuestSystem(this.party[0]);
        
        // Export to window for UI access
        window.gameParty = this.party;
        window.gamePlayer = this.party[0]; // Kept for some legacy parts temporarily
        window.gameInventory = this.inventory;
        window.gameCombat = this.combat;
        window.gameQuests = this.quests;
        window.game = this;

        this.ui = null;
        this.lastSave = Date.now();
    }

    addPartyMember(name = 'Aliado') {
        if (this.party.length >= 4) return false;

        let newMember = new Player();
        newMember.name = name;
        // Start from level 1 with base attributes
        newMember.level = 1;
        newMember.exp = 0;
        newMember.expToNext = 100;
        newMember.statPoints = 0;
        newMember.skillPoints = 0;

        newMember.hp = newMember.getMaxHp();
        newMember.mana = newMember.getMaxMana();

        // Starts with no class
        newMember.setClass('Nenhuma');

        this.party.push(newMember);
        Engine.emit('partyUpdated', this.party);
        Engine.emit('systemLog', `${name} se juntou ao grupo!`);
        return true;
    }

    init() {
        this.ui = new UIManager();
        this.load();
        
        // Trigger initial renders
        Engine.emit('partyUpdated', this.party);
        Engine.emit('playerUpdated', this.party[0]);
        Engine.emit('inventoryUpdated', this.inventory);
        Engine.emit('equipmentUpdated', this.party[0].equipment);
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
            party: this.party.map(p => p.save()),
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
            if (state.party) {
                this.party = state.party.map(pData => {
                    let p = new Player();
                    p.load(pData);
                    return p;
                });
                window.gameParty = this.party;
                window.gamePlayer = this.party[0];
            } else if (state.player) {
                this.party[0].load(state.player);
            }

            // Re-assign references after party load
            this.combat.party = this.party;

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