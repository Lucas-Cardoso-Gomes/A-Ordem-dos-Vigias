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
                rarity: 'incomum'
            };
        } else {
            // Find base
            const bases = recipe.result.baseId.startsWith('w') ? ItemDatabase.weaponBases : ItemDatabase.armorBases;
            const baseItem = bases.find(b => b.id === recipe.result.baseId);
            
            // Generate full item
            item = ItemDatabase.generateItem(player.level, recipe.result.rarity);
            // Override base logic to match recipe explicitly
            item = { ...baseItem, ...item, name: recipe.name, reqLvl: recipe.reqLvl };
            
            if (recipe.result.defMod) {
                item.def = recipe.result.defMod;
            }
            
            // Alquimista class bonus for crafting
            if (player.playerClass === 'Alquimista') {
                if (item.minDmg) item.minDmg += 2;
                if (item.maxDmg) item.maxDmg += 2;
                if (item.def) item.def += 2;
                if (item.effect === 'heal') item.value += 50;
            }
        }

        inventory.addItem(item);
        Engine.emit('systemLog', `Você forjou: ${item.name}!`);
        return true;
    }
};

window.CraftingSystem = CraftingSystem;