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
        this.items = data.items || [];
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
        if (this.items.length >= this.capacity) {
            Engine.emit('systemLog', 'Inventário cheio! Não foi possível pegar ' + item.name);
            return false;
        }
        this.items.push(item);
        Engine.emit('systemLog', `Você obteve: ${item.name} (${item.rarity})`);
        Engine.emit('inventoryUpdated', this);
        return true;
    }

    removeItem(instanceId) {
        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index !== -1) {
            const item = this.items[index];
            this.items.splice(index, 1);
            Engine.emit('inventoryUpdated', this);
            return item;
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

        if (item.effect === 'heal') {
            this.player.heal(item.value);
            Engine.emit('systemLog', `Você usou ${item.name} e curou ${item.value} HP.`);
        } else if (item.effect === 'mana') {
            this.player.restoreMana(item.value);
            Engine.emit('systemLog', `Você usou ${item.name} e restaurou ${item.value} Mana.`);
        }
        
        this.items.splice(index, 1);
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
        return this.items.filter(i => i.id === id).length;
    }
    
    removeItemsById(id, count) {
        let removed = 0;
        for (let i = this.items.length - 1; i >= 0 && removed < count; i--) {
            if (this.items[i].id === id) {
                this.items.splice(i, 1);
                removed++;
            }
        }
        Engine.emit('inventoryUpdated', this);
    }
}

window.Inventory = Inventory;