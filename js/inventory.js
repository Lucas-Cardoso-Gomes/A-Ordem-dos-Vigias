/**
 * inventory.js
 * Manages player inventory, equipment, and items.
 */

class Inventory {
    constructor() {
        this.items = [];
        this.capacity = 100; // Increased capacity for a party
    }

    load(data) {
        if (!data) return;
        let loadedItems = data.items || [];

        // Migrate old saves with unstacked items
        this.items = [];
        loadedItems.forEach(item => {
            if (!item.count) {
                item.count = 1;
            }
            if (item.type === 'material' || item.type === 'potion') {
                const existing = this.items.find(i => i.id === item.id);
                if (existing) {
                    existing.count += item.count;
                } else {
                    this.items.push(item);
                }
            } else {
                this.items.push(item);
            }
        });

        this.capacity = data.capacity || 100;

        // Em caso de save antigo, migramos o equipment para o player 0
        if (data.equipment && window.gameParty && window.gameParty[0]) {
             window.gameParty[0].equipment = data.equipment;
        }

        this.updatePlayerStats();
    }

    save() {
        return {
            items: this.items,
            capacity: this.capacity
        };
    }

    addItem(item) {
        // Initialize count if not present
        if (!item.count) item.count = 1;

        if (item.type === 'material' || item.type === 'potion') {
            const existing = this.items.find(i => i.id === item.id);
            if (existing) {
                existing.count += item.count;
                Engine.emit('systemLog', `Você obteve: ${item.name} (x${item.count})`);
                Engine.emit('inventoryUpdated', this);
                return true;
            }
        }

        if (this.items.length >= this.capacity) {
            Engine.emit('systemLog', 'Inventário cheio! Não foi possível pegar ' + item.name);
            return false;
        }

        this.items.push(item);
        Engine.emit('systemLog', `Você obteve: ${item.name} ${item.type === 'material' || item.type === 'potion' ? '(x'+item.count+')' : '('+item.rarity+')'}`);
        Engine.emit('inventoryUpdated', this);
        return true;
    }

    removeItem(instanceId, countToRemove = 1) {
        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index !== -1) {
            const item = this.items[index];
            if ((item.type === 'material' || item.type === 'potion') && item.count > countToRemove) {
                item.count -= countToRemove;
                Engine.emit('inventoryUpdated', this);
                return { ...item, count: countToRemove }; // Return a copy with the removed count
            } else {
                this.items.splice(index, 1);
                Engine.emit('inventoryUpdated', this);
                return item;
            }
        }
        return null;
    }

    equip(instanceId, playerIndex = 0, slotOverride = null) {
        const player = window.gameParty[playerIndex];
        if (!player) return false;

        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index === -1) return false;

        const item = this.items[index];
        if (!['weapon', 'armor', 'accessory'].includes(item.type)) {
            Engine.emit('systemLog', 'Este item não pode ser equipado.');
            return false;
        }
        
        if (item.reqLvl > player.level) {
            Engine.emit('systemLog', `Nível insuficiente. Requer nível ${item.reqLvl}.`);
            return false;
        }

        let slot = slotOverride || item.slot;
        
        if (slot === 'ring1' && player.equipment.ring1 && !player.equipment.ring2) {
            slot = 'ring2';
        }

        // Check inventory limit if replacing an item
        if (player.equipment[slot] && this.items.length >= this.capacity) {
            Engine.emit('systemLog', 'Inventário cheio! Não é possível trocar de equipamento.');
            return false;
        }

        // Un-equip current item in slot
        if (player.equipment[slot]) {
            this.items.push(player.equipment[slot]);
        }

        player.equipment[slot] = item;
        this.items.splice(index, 1);
        
        this.updatePlayerStats(playerIndex);
        Engine.emit('inventoryUpdated', this);
        Engine.emit('equipmentUpdated', player.equipment);
        Engine.emit('systemLog', `${player.name} equipou: ${item.name}`);
        return true;
    }

    unequip(slot, playerIndex = 0) {
        const player = window.gameParty[playerIndex];
        if (!player || !player.equipment[slot]) return false;
        
        if (this.items.length >= this.capacity) {
            Engine.emit('systemLog', 'Inventário cheio! Não foi possível desequipar.');
            return false;
        }

        const item = player.equipment[slot];
        player.equipment[slot] = null;
        this.items.push(item);
        
        this.updatePlayerStats(playerIndex);
        Engine.emit('inventoryUpdated', this);
        Engine.emit('equipmentUpdated', player.equipment);
        Engine.emit('systemLog', `${player.name} desequipou: ${item.name}`);
        return true;
    }

    // CORREÇÃO: Poções de cura de status agora são consumidas corretamente
    useItem(instanceId, playerIndex = 0) {
        const player = window.gameParty[playerIndex];
        if (!player) return false;

        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index === -1) return false;

        const item = this.items[index];
        if (item.type !== 'potion') {
            return false;
        }

        if (item.effect === 'cure_poison') {
            Engine.emit('systemLog', `Você usou ${item.name} em ${player.name} e curou seus males.`);
            // No futuro, aqui entra a lógica: player.status = 'normal';
        } else if (item.effect === 'heal') {
            player.heal(item.value);
            Engine.emit('systemLog', `Você usou ${item.name} em ${player.name} e curou ${item.value} HP.`);
        } else if (item.effect === 'mana') {
            player.restoreMana(item.value);
            Engine.emit('systemLog', `Você usou ${item.name} em ${player.name} e restaurou ${item.value} Mana.`);
        }
        
        if (item.count > 1) {
            item.count -= 1;
        } else {
            this.items.splice(index, 1);
        }
        
        Engine.emit('inventoryUpdated', this);
        Engine.emit('playerUpdated', player);
        return true;
    }

    updatePlayerStats(playerIndex = 0) {
        const player = window.gameParty[playerIndex];
        if (player) {
            Engine.emit('playerUpdated', player);
        }
    }
    
    countItem(id) {
        let count = 0;
        this.items.forEach(i => {
            if (i.id === id) {
                count += i.count || 1;
            }
        });
        return count;
    }
    
    removeItemsById(id, countToRemove) {
        let remainingToRemove = countToRemove;
        for (let i = this.items.length - 1; i >= 0 && remainingToRemove > 0; i--) {
            let item = this.items[i];
            if (item.id === id) {
                let itemCount = item.count || 1;
                if (itemCount <= remainingToRemove) {
                    remainingToRemove -= itemCount;
                    this.items.splice(i, 1);
                } else {
                    item.count -= remainingToRemove;
                    remainingToRemove = 0;
                }
            }
        }
        Engine.emit('inventoryUpdated', this);
    }
}

window.Inventory = Inventory;