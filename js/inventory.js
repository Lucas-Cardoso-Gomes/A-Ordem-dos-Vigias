/**
 * inventory.js
 * Manages player inventory, equipment, and items.
 */

class Inventory {
    constructor(player) {
        this.player = player;
        this.items = [];
        this.capacity = 50;
        
        this.equipment = {
            head: null,
            chest: null,
            hands: null,
            legs: null,
            boots: null,
            weaponMain: null,
            weaponOff: null,
            amulet: null,
            ring1: null,
            ring2: null
        };
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

        this.capacity = data.capacity || 50;
        this.equipment = data.equipment || this.equipment;
        this.updatePlayerStats();
    }

    save() {
        return {
            items: this.items,
            capacity: this.capacity,
            equipment: this.equipment
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

    equip(instanceId, slotOverride = null) {
        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index === -1) return false;

        const item = this.items[index];
        if (!['weapon', 'armor', 'accessory'].includes(item.type)) {
            Engine.emit('systemLog', 'Este item não pode ser equipado.');
            return false;
        }
        
        if (item.reqLvl > this.player.level) {
            Engine.emit('systemLog', `Nível insuficiente. Requer nível ${item.reqLvl}.`);
            return false;
        }

        let slot = slotOverride || item.slot;
        
        if (slot === 'ring1' && this.equipment.ring1 && !this.equipment.ring2) {
            slot = 'ring2';
        }

        // Un-equip current item in slot
        if (this.equipment[slot]) {
            this.items.push(this.equipment[slot]);
        }

        this.equipment[slot] = item;
        this.items.splice(index, 1);
        
        this.updatePlayerStats();
        Engine.emit('inventoryUpdated', this);
        Engine.emit('equipmentUpdated', this.equipment);
        Engine.emit('systemLog', `Equipado: ${item.name}`);
        return true;
    }

    unequip(slot) {
        if (!this.equipment[slot]) return false;
        
        if (this.items.length >= this.capacity) {
            Engine.emit('systemLog', 'Inventário cheio! Não foi possível desequipar.');
            return false;
        }

        const item = this.equipment[slot];
        this.equipment[slot] = null;
        this.items.push(item);
        
        this.updatePlayerStats();
        Engine.emit('inventoryUpdated', this);
        Engine.emit('equipmentUpdated', this.equipment);
        Engine.emit('systemLog', `Desequipado: ${item.name}`);
        return true;
    }

    useItem(instanceId) {
        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index === -1) return false;

        const item = this.items[index];
        if (item.type !== 'potion') {
            return false;
        }

        if (item.effect === 'cure_poison') {
            Engine.emit('systemLog', 'Esta poção não pode ser usada agora.');
            return false;
        }

        if (item.effect === 'heal') {
            this.player.heal(item.value);
            Engine.emit('systemLog', `Você usou ${item.name} e curou ${item.value} HP.`);
        } else if (item.effect === 'mana') {
            this.player.restoreMana(item.value);
            Engine.emit('systemLog', `Você usou ${item.name} e restaurou ${item.value} Mana.`);
        }
        
        if (item.count > 1) {
            item.count -= 1;
        } else {
            this.items.splice(index, 1);
        }

        Engine.emit('inventoryUpdated', this);
        Engine.emit('playerUpdated', this.player);
        return true;
    }

    updatePlayerStats() {
        // Recalculate any passive bonuses from equipment here if needed.
        // For now, base stats are from player.js, equipment adds on top during combat.
        // We trigger an update just in case UI needs to refresh total stats.
        Engine.emit('playerUpdated', this.player);
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