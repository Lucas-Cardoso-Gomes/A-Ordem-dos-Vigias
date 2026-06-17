/**
 * crafting.js
 * Definitions of recipes and crafting logic.
 */

const CraftingSystem = {
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
            result: { type: 'potion', effect: 'heal', value: 150, name: 'Poção de Vida Maior' }
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
        }
    ],

    canCraft(recipeId, inventory) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return false;

        for (let ing of recipe.ingredients) {
            if (inventory.countItem(ing.id) < ing.qty) {
                return false;
            }
        }
        return true;
    },

    craft(recipeId, inventory, player) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return false;

        if (player.level < recipe.reqLvl) {
            Engine.emit('systemLog', `Nível insuficiente para forjar (Requer Nível ${recipe.reqLvl}).`);
            return false;
        }

        if (!this.canCraft(recipeId, inventory)) {
            Engine.emit('systemLog', 'Materiais insuficientes para forjar.');
            return false;
        }

        if (inventory.items.length >= inventory.capacity) {
            Engine.emit('systemLog', 'Inventário cheio! Não há espaço para o novo item.');
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
                instanceId: 'pot_craft_' + Date.now(),
                rarity: 'incomum',
                count: 1
            };
        } else {
            // Find base
            let bases = ItemDatabase.weaponBases;
            if (recipe.result.baseId.startsWith('a')) bases = ItemDatabase.armorBases;
            else if (recipe.result.baseId.startsWith('ac')) bases = ItemDatabase.accessories;

            const baseItem = bases.find(b => b.id === recipe.result.baseId);
            
            const rarityMult = {
                'comum': 1, 'incomum': 1.2, 'raro': 1.5, 'epico': 2.0, 'lendario': 3.0, 'mitico': 5.0
            };
            const mult = rarityMult[recipe.result.rarity] || 1;

            // Generate specific item directly from base to avoid mixing properties with random items
            item = {
                ...baseItem,
                instanceId: 'item_craft_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                rarity: recipe.result.rarity,
                name: recipe.name,
                reqLvl: recipe.reqLvl,
                sellValue: Math.floor((recipe.reqLvl * 10) * mult)
            };

            // Scale stats
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

        inventory.addItem(item);
        Engine.emit('systemLog', `Você forjou: ${item.name}!`);
        return true;
    }
};

window.CraftingSystem = CraftingSystem;