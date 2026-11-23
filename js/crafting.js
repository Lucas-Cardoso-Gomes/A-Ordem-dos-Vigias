/**
 * crafting.js
 * Definitions of recipes and crafting/refinement logic (city-gated).
 */

const CraftingSystem = {
    _emit(event, payload) {
        const eng = (typeof Engine !== 'undefined' ? Engine : (typeof window !== 'undefined' ? window.Engine : null));
        if (eng && typeof eng.emit === 'function') {
            eng.emit(event, payload);
        }
    },

    _playAudio(name) {
        if (typeof window !== 'undefined' && window.gameAudio && typeof window.gameAudio.play === 'function') {
            window.gameAudio.play(name);
        }
    },

    _getItemDb() {
        if (typeof ItemDatabase !== 'undefined') return ItemDatabase;
        if (typeof window !== 'undefined' && window.ItemDatabase) return window.ItemDatabase;
        return null;
    },

    _getMechanics() {
        if (typeof GameMechanics !== 'undefined') return GameMechanics;
        if (typeof window !== 'undefined' && window.GameMechanics) return window.GameMechanics;
        return null;
    },

    recipes: [
        {
            id: 'c1',
            name: 'Espada de Prata Aprimorada',
            type: 'weapon',
            reqLvl: 10,
            ingredients: [
                { id: 'm1', name: 'Ossos', qty: 5 },
                { id: 'm2', name: 'Couro', qty: 2 }
            ],
            result: { baseId: 'w2', rarity: 'raro' }
        },
        {
            id: 'c2',
            name: 'Poção de Vida Maior',
            type: 'potion',
            reqLvl: 5,
            ingredients: [
                { id: 'm5', name: 'Sangue Vampírico', qty: 1 }
            ],
            result: { id: 'p4', type: 'potion', effect: 'heal', value: 200, name: 'Poção de Vida Maior' }
        },
        {
            id: 'c3',
            name: 'Armadura de Couro de Lobisomem',
            type: 'armor',
            reqLvl: 15,
            ingredients: [
                { id: 'm2', name: 'Couro', qty: 10 },
                { id: 'm3', name: 'Presas', qty: 2 }
            ],
            result: { baseId: 'a2', rarity: 'epico', defMod: 15 }
        },
        {
            id: 'c4',
            name: 'Katana Sombria Aprimorada',
            type: 'weapon',
            reqLvl: 40,
            ingredients: [
                { id: 'm8', name: 'Fragmento de Cristal', qty: 3 },
                { id: 'm7', name: 'Essência Demoníaca', qty: 1 }
            ],
            result: { baseId: 'w11', rarity: 'lendario' }
        },
        {
            id: 'c5',
            name: 'Armadura de Placas Rúnicas Escuras',
            type: 'armor',
            reqLvl: 40,
            ingredients: [
                { id: 'm8', name: 'Fragmento de Cristal', qty: 5 },
                { id: 'm4', name: 'Escamas', qty: 5 }
            ],
            result: { baseId: 'a8', rarity: 'lendario', defMod: 50 }
        },
        {
            id: 'c6',
            name: 'Amuleto do Corvo Sábio',
            type: 'accessory',
            reqLvl: 30,
            ingredients: [
                { id: 'm9', name: 'Pó Mágico', qty: 2 },
                { id: 'm1', name: 'Ossos', qty: 10 }
            ],
            result: { baseId: 'ac4', rarity: 'epico' }
        },
        {
            id: 'c7',
            name: 'Elixir da Fúria',
            type: 'potion',
            reqLvl: 5,
            ingredients: [
                { id: 'm5', name: 'Sangue Vampírico', qty: 1 },
                { id: 'm9', name: 'Pó Mágico', qty: 1 }
            ],
            result: { id: 'p6', type: 'potion', effect: 'fury', value: 50, name: 'Elixir da Fúria' }
        },
        {
            id: 'c8',
            name: 'Poção da Fênix',
            type: 'potion',
            reqLvl: 15,
            ingredients: [
                { id: 'm5', name: 'Sangue Vampírico', qty: 2 },
                { id: 'm8', name: 'Fragmento de Cristal', qty: 1 }
            ],
            result: { id: 'p7', type: 'potion', effect: 'revive', value: 50, name: 'Poção da Fênix' }
        },
        {
            id: 'c9',
            name: 'Bomba Incendiária',
            type: 'potion',
            reqLvl: 10,
            ingredients: [
                { id: 'm10', name: 'Minério de Ferro', qty: 2 },
                { id: 'm9', name: 'Pó Mágico', qty: 1 }
            ],
            result: { id: 'p8', type: 'potion', effect: 'fire_bomb', element: 'fogo', statusEffect: 'burn', value: 60, name: 'Bomba Incendiária' }
        },
        {
            id: 'c10',
            name: 'Lâmina do Cataclismo (Forjada em Relíquia)',
            type: 'weapon',
            reqLvl: 75,
            ingredients: [
                { id: 'm7', name: 'Essência Demoníaca', qty: 3 },
                { id: 'm4', name: 'Escamas', qty: 5 },
                { id: 'm8', name: 'Fragmento de Cristal', qty: 4 }
            ],
            result: { baseId: 'w13', rarity: 'mitico' }
        },
        {
            id: 'c11',
            name: 'Cetro do Vazio Eterno (Forjado em Relíquia)',
            type: 'weapon',
            reqLvl: 80,
            ingredients: [
                { id: 'm9', name: 'Pó Mágico', qty: 5 },
                { id: 'm8', name: 'Fragmento de Cristal', qty: 5 },
                { id: 'm7', name: 'Essência Demoníaca', qty: 3 }
            ],
            result: { baseId: 'w15', rarity: 'mitico' }
        },
        {
            id: 'c12',
            name: 'Armadura do Dragão Negro (Mítica)',
            type: 'armor',
            reqLvl: 80,
            ingredients: [
                { id: 'm4', name: 'Escamas', qty: 8 },
                { id: 'm6', name: 'Chifre de Minotauro', qty: 3 },
                { id: 'm7', name: 'Essência Demoníaca', qty: 2 }
            ],
            result: { baseId: 'a11', rarity: 'mitico' }
        },
        {
            id: 'c13',
            name: 'Anel do Caos Primordial (Mítico)',
            type: 'accessory',
            reqLvl: 80,
            ingredients: [
                { id: 'm8', name: 'Fragmento de Cristal', qty: 6 },
                { id: 'm9', name: 'Pó Mágico', qty: 4 },
                { id: 'm7', name: 'Essência Demoníaca', qty: 3 }
            ],
            result: { baseId: 'ac6', rarity: 'mitico' }
        }
    ],

    canCraft(recipeId, inventory) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe || !inventory) return false;

        for (let ing of recipe.ingredients) {
            if (inventory.countItem(ing.id) < ing.qty) {
                return false;
            }
        }
        return true;
    },

    craft(recipeId, inventory, player) {
        if (typeof window !== 'undefined' && window.gameTileMap && !window.gameTileMap.isPlayerInCity()) {
            this._emit('systemLog', '🔒 Ação bloqueada: A Forja só funciona na Cidade de Alvorada (na Floresta)!');
            return false;
        }

        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe || !inventory || !player) return false;

        if (player.level < recipe.reqLvl) {
            this._emit('systemLog', `Nível insuficiente para forjar (Requer Nível ${recipe.reqLvl}).`);
            return false;
        }

        if (!this.canCraft(recipeId, inventory)) {
            this._emit('systemLog', 'Materiais insuficientes para forjar.');
            return false;
        }

        if (inventory.items.length >= inventory.capacity && recipe.result.type !== 'potion') {
            this._emit('systemLog', 'Inventário cheio! Não há espaço para o novo item.');
            return false;
        }

        // Consume ingredients
        for (let ing of recipe.ingredients) {
            inventory.removeItemsById(ing.id, ing.qty);
        }

        // Generate Item
        let item;
        if (recipe.result.type === 'potion') {
            item = {
                ...recipe.result,
                instanceId: 'pot_craft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                rarity: 'incomum',
                count: 1
            };
        } else {
            const itemDb = this._getItemDb();
            if (!itemDb) return false;

            let bases = itemDb.weaponBases;
            if (recipe.result.baseId.startsWith('a') && !recipe.result.baseId.startsWith('ac')) bases = itemDb.armorBases;
            else if (recipe.result.baseId.startsWith('ac')) bases = itemDb.accessories;

            const baseItem = bases.find(b => b.id === recipe.result.baseId);
            if (!baseItem) return false;

            const rarityMult = {
                'comum': 1, 'incomum': 1.2, 'raro': 1.5, 'epico': 2.0, 'lendario': 3.0, 'mitico': 5.0
            };
            const mult = rarityMult[recipe.result.rarity] || 1;

            item = {
                ...baseItem,
                instanceId: 'item_craft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                rarity: recipe.result.rarity,
                name: recipe.name,
                reqLvl: recipe.reqLvl,
                sellValue: Math.floor((recipe.reqLvl * 10) * mult)
            };

            if (item.minDmg) item.minDmg = Math.floor(item.minDmg * mult);
            if (item.maxDmg) item.maxDmg = Math.floor(item.maxDmg * mult);
            if (item.def) item.def = Math.floor(item.def * mult);

            if (item.stats) {
                item.stats = { ...item.stats };
                for (let k in item.stats) {
                    item.stats[k] = Math.floor(item.stats[k] * mult);
                }
            }

            if (recipe.result.defMod) {
                item.def = recipe.result.defMod;
            }
        }

        if (!inventory.addItem(item)) {
            return false;
        }

        this._playAudio('forge');
        const gm = this._getMechanics();
        if (gm && typeof gm.recordStat === 'function') {
            gm.recordStat('itemsCrafted', 1);
        }

        this._emit('systemLog', `Você forjou: ${item.name}!`);
        return true;
    },

    refineEquipment(itemInstanceId, inventory, player) {
        if (typeof window !== 'undefined' && window.gameTileMap && !window.gameTileMap.isPlayerInCity()) {
            this._emit('systemLog', '🔒 Ação bloqueada: O Refinamento só funciona na Cidade de Alvorada (na Floresta)!');
            return false;
        }

        if (!inventory || !player) return false;

        const item = inventory.items.find(i => i.instanceId === itemInstanceId);
        if (!item || (item.type !== 'weapon' && item.type !== 'armor')) {
            this._emit('systemLog', 'Item inválido para refinamento.');
            return false;
        }

        const currentLevel = parseInt((item.name.match(/\+(\d+)/) || [0, 0])[1], 10);
        const nextLevel = currentLevel + 1;
        const costGold = 100 * nextLevel;
        const matReqId = 'm10'; // Minério de Ferro
        const matReqQty = nextLevel;

        if (player.gold < costGold) {
            this._emit('systemLog', 'Ouro insuficiente para refinar.');
            return false;
        }

        if (inventory.countItem(matReqId) < matReqQty) {
            this._emit('systemLog', 'Materiais insuficientes para refinar.');
            return false;
        }

        player.gold -= costGold;
        inventory.removeItemsById(matReqId, matReqQty);

        item.name = item.name.includes('+') ? item.name.replace(/\+\d+/, `+${nextLevel}`) : `${item.name} +1`;
        if (item.minDmg) item.minDmg = Math.floor(item.minDmg * 1.20);
        if (item.maxDmg) item.maxDmg = Math.floor(item.maxDmg * 1.20);
        if (item.def) item.def = Math.floor(item.def * 1.20);
        if (item.sellValue) item.sellValue = Math.floor(item.sellValue * 1.5);

        this._playAudio('refine');
        this._emit('systemLog', `Sucesso! O equipamento foi refinado para +${nextLevel}!`);
        this._emit('inventoryUpdated', inventory);
        this._emit('playerUpdated', player);
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.CraftingSystem = CraftingSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CraftingSystem;
}
