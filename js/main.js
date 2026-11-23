/**
 * main.js
 * Main entry point, initialization, save/load, and loop.
 */

class Game {
    constructor() {
        this.party = [new Player()];
        this.inventory = new Inventory();
        this.combat = new CombatSystem(this.party, this.inventory);
        this.quests = new QuestSystem(this.party[0]);

        // Export to window for UI access
        window.gameParty = this.party;
        window.gamePlayer = this.party[0];
        window.gameInventory = this.inventory;
        window.gameCombat = this.combat;
        window.gameQuests = this.quests;
        window.game = this;

        this.ui = null;
        this.lastSave = Date.now();
    }

    addPartyMember(name = 'Aliado') {
        if (this.party.length >= 4) return false;

        const newMember = new Player();
        newMember.name = name;
        newMember.level = 1;
        newMember.xp = 0;
        newMember.exp = 0;
        newMember.expToNext = 100;
        newMember.statPoints = 0;
        newMember.skillPoints = 0;

        newMember.hp = newMember.getMaxHp();
        newMember.mana = newMember.getMaxMana();
        newMember.playerClass = 'Nenhuma';
        newMember.classLocked = false;

        this.party.push(newMember);
        window.gameAudio?.play?.('quest');
        Engine.emit('partyUpdated', this.party);
        Engine.emit('playerUpdated', newMember);
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
                this.tileMap.switchMap(s.currentMapId, s.playerX, s.playerY, true);
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
            this.tileMap._centerCamOn?.(this.tileMap.playerX, this.tileMap.playerY);
            this.tileMap.updateHUD?.();
            this._pendingWorldMapState = null;
        }

        // Wire 3D WorldExplorer preference cleanly if WebGL available
        if (window.Scene3D && typeof window.Scene3D.isWebGLAvailable === 'function' && window.Scene3D.isWebGLAvailable()) {
            this.ui.useMap3D = true;
        }

        // Keep TileMap in sync when regions unlock
        Engine.on('regionProgressUpdated', () => {
            if (this.tileMap) this.tileMap.onRegionsUpdated?.();
        });

        // Sync biome music on map change
        Engine.on('mapChanged', (payload) => {
            const mapId = typeof payload === 'string'
                ? payload
                : (payload?.mapId || this.tileMap?.currentMapId || 'floresta');
            if (window.gameAudio?.playMusic && (!this.combat || !this.combat.inCombat)) {
                window.gameAudio.playMusic(mapId);
            }
            this.ui?.updateMapControls?.();
        });

        // Listen to combat quest updates
        Engine.on('questUpdate', (data) => {
            if (data && data.type === 'kill') {
                this.quests.processKillEvent(data.monsterId, data.qty);
            }
        });

        // Refresh UI state across all panels
        this.ui.refreshTitleOverlay();
        this.ui.renderRelicsHUD();
        this.ui.renderOrderStats();
        this.ui.syncAudioUI();
        this.ui.updateMapControls();

        // Trigger initial renders
        Engine.emit('partyUpdated', this.party);
        Engine.emit('playerUpdated', this.party[0]);
        Engine.emit('inventoryUpdated', this.inventory);
        Engine.emit('equipmentUpdated', this.party[0].equipment);
        Engine.emit('questsUpdated', this.quests);
        Engine.emit('regionProgressUpdated');
        Engine.emit('mechanicsUpdated');

        // Auto-save loop
        setInterval(() => this.loop(), 1000);

        Engine.emit('systemLog', 'Bem-vindo à Aegis Nocturna, Vigia! Escolha sua classe e explore os reinos.');
    }

    loop() {
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
            mechanics: window.GameMechanics && typeof window.GameMechanics.save === 'function'
                ? window.GameMechanics.save()
                : null,
            worldMap: tileMap ? {
                currentMapId: tileMap.currentMapId,
                playerX: tileMap.playerX,
                playerY: tileMap.playerY,
                quickRestsRemaining: tileMap.quickRestsRemaining,
                revealed: Array.from(tileMap.revealed || []),
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
            // Load mechanics first so relic bonuses apply during player load
            if (window.GameMechanics) {
                if (state.mechanics && typeof window.GameMechanics.load === 'function') {
                    window.GameMechanics.load(state.mechanics);
                } else if (typeof window.GameMechanics.reset === 'function') {
                    window.GameMechanics.reset();
                }
            }

            if (Array.isArray(state.party) && state.party.length > 0) {
                this.party = state.party.map(pData => {
                    const p = new Player();
                    p.load(pData);
                    return p;
                });
                window.gameParty = this.party;
                window.gamePlayer = this.party[0];
            } else if (state.player) {
                this.party = [new Player()];
                this.party[0].load(state.player);
                window.gameParty = this.party;
                window.gamePlayer = this.party[0];
            }

            this.combat.party = this.party;
            this.quests.player = this.party[0];

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

            if (state.worldMap) {
                this._pendingWorldMapState = state.worldMap;
            }
        } else {
            if (window.GameMechanics && typeof window.GameMechanics.reset === 'function') {
                window.GameMechanics.reset();
            }
            this.inventory.addItem(ItemDatabase.generateItem(1, 'comum'));
            this.inventory.addItem(ItemDatabase.getPotion('p1'));
            this.quests.load(null);
            MapSystem.unlockedRegions = ['floresta', 'helgen'];
        }

        if (this.ui) {
            this.ui.refreshTitleOverlay();
            this.ui.renderRelicsHUD();
            this.ui.renderOrderStats();
            Engine.emit('partyUpdated', this.party);
            Engine.emit('playerUpdated', this.party[0]);
            Engine.emit('inventoryUpdated', this.inventory);
            Engine.emit('equipmentUpdated', this.party[0].equipment);
            Engine.emit('questsUpdated', this.quests);
        }
    }
}

window.onload = () => {
    const game = new Game();
    game.init();
};
