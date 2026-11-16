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

        // Initialize world TileMap
        this.tileMap = new TileMap('world-canvas');
        window.gameTileMap = this.tileMap;

        // Restore saved world map state if exists
        if (this._pendingWorldMapState) {
            const s = this._pendingWorldMapState;
            if (s.currentMapId && window.TileMap && window.TileMap.MAPS && window.TileMap.MAPS[s.currentMapId]) {
                this.tileMap.switchMap(s.currentMapId, s.playerX, s.playerY);
            } else {
                this.tileMap.playerX = s.playerX !== undefined ? s.playerX : this.tileMap.playerX;
                this.tileMap.playerY = s.playerY !== undefined ? s.playerY : this.tileMap.playerY;
            }
            if (Array.isArray(s.revealed)) {
                this.tileMap.revealed = new Set(s.revealed);
                if (this.tileMap.revealedByMap) {
                    this.tileMap.revealedByMap[this.tileMap.currentMapId] = this.tileMap.revealed;
                }
            }
            if (s.defeatedEnemies && this.tileMap.enemiesByMap) {
                for (const [mId, defIds] of Object.entries(s.defeatedEnemies)) {
                    if (this.tileMap.enemiesByMap[mId] && Array.isArray(defIds)) {
                        this.tileMap.enemiesByMap[mId].forEach(e => {
                            if (defIds.includes(e.id)) e.defeated = true;
                        });
                    }
                }
            }
            if (s.quickRestsRemaining !== undefined) {
                this.tileMap.quickRestsRemaining = s.quickRestsRemaining;
            }
            this.tileMap._centerCamOn(this.tileMap.playerX, this.tileMap.playerY);
            this.tileMap.updateHUD();
            this._pendingWorldMapState = null;
        }

        // Keep the tilemap in sync when regions unlock
        Engine.on('regionProgressUpdated', () => {
            if (this.tileMap) this.tileMap.onRegionsUpdated();
        });
        
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
        
        Engine.emit('systemLog', 'Bem-vindo à Aegis Nocturna, recruta! Visite o Mapa para explorar o mundo.');
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
        const tileMap = window.gameTileMap;
        const state = {
            party: this.party.map(p => p.save()),
            inventory: this.inventory.save(),
            quests: this.quests.save(),
            mapProgress: MapSystem.progress,
            unlockedRegions: MapSystem.unlockedRegions,
            worldMap: tileMap ? {
                currentMapId: tileMap.currentMapId,
                playerX: tileMap.playerX,
                playerY: tileMap.playerY,
                quickRestsRemaining: tileMap.quickRestsRemaining,
                revealed: Array.from(tileMap.revealed),
                defeatedEnemies: tileMap.enemiesByMap ? Object.fromEntries(
                    Object.entries(tileMap.enemiesByMap).map(([mId, list]) => [mId, list.filter(e => e.defeated).map(e => e.id)])
                ) : {}
            } : null
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

            // Restore world map state after tilemap is initialized
            if (state.worldMap) {
                this._pendingWorldMapState = state.worldMap;
            }
        } else {
            // New game initial items
            this.inventory.addItem(ItemDatabase.generateItem(1, 'comum'));
            this.inventory.addItem(ItemDatabase.getPotion('p1'));
            this.quests.load(null);
            MapSystem.unlockedRegions = ['floresta', 'helgen'];
        }
    }
}

window.onload = () => {
    const game = new Game();
    game.init();
};