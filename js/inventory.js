/**
 * inventory.js
 * Manages player inventory, equipment, and consumable item usage.
 */

class Inventory {
    constructor() {
        this.items = [];
        this.capacity = 100; // Increased capacity for a party
    }

    _emit(event, payload) {
        const eng = (typeof Engine !== 'undefined' ? Engine : (typeof window !== 'undefined' ? window.Engine : null));
        if (eng && typeof eng.emit === 'function') {
            eng.emit(event, payload);
        }
    }

    _playAudio(name) {
        if (typeof window !== 'undefined' && window.gameAudio && typeof window.gameAudio.play === 'function') {
            window.gameAudio.play(name);
        }
    }

    _getMechanics() {
        if (typeof GameMechanics !== 'undefined') return GameMechanics;
        if (typeof window !== 'undefined' && window.GameMechanics) return window.GameMechanics;
        return null;
    }

    _getParty() {
        if (typeof window !== 'undefined' && Array.isArray(window.gameParty)) return window.gameParty;
        return [];
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
        const party = this._getParty();
        if (data.equipment && party[0]) {
            party[0].equipment = data.equipment;
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
        if (!item) return false;
        if (!item.count) item.count = 1;

        if (item.type === 'material' || item.type === 'potion') {
            const existing = this.items.find(i => i.id === item.id);
            if (existing) {
                existing.count += item.count;
                this._emit('systemLog', `Você obteve: ${item.name} (x${item.count})`);
                this._emit('inventoryUpdated', this);
                return true;
            }
        }

        if (this.items.length >= this.capacity) {
            this._emit('systemLog', 'Inventário cheio! Não foi possível pegar ' + item.name);
            return false;
        }

        this.items.push(item);
        this._emit('systemLog', `Você obteve: ${item.name} ${item.type === 'material' || item.type === 'potion' ? '(x' + item.count + ')' : '(' + item.rarity + ')'}`);
        this._emit('inventoryUpdated', this);
        return true;
    }

    removeItem(instanceId, countToRemove = 1) {
        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index !== -1) {
            const item = this.items[index];
            if ((item.type === 'material' || item.type === 'potion') && item.count > countToRemove) {
                item.count -= countToRemove;
                this._emit('inventoryUpdated', this);
                return { ...item, count: countToRemove };
            } else {
                this.items.splice(index, 1);
                this._emit('inventoryUpdated', this);
                return item;
            }
        }
        return null;
    }

    equip(instanceId, playerIndex = 0, slotOverride = null) {
        const player = this._getParty()[playerIndex];
        if (!player) return false;

        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index === -1) return false;

        const item = this.items[index];
        if (!['weapon', 'armor', 'accessory'].includes(item.type)) {
            this._emit('systemLog', 'Este item não pode ser equipado.');
            return false;
        }

        if (item.reqLvl > player.level) {
            this._emit('systemLog', `Nível insuficiente. Requer nível ${item.reqLvl}.`);
            return false;
        }

        let slot = slotOverride || item.slot;

        if (slot === 'ring1' && player.equipment.ring1 && !player.equipment.ring2) {
            slot = 'ring2';
        }

        if (player.equipment[slot] && this.items.length >= this.capacity) {
            this._emit('systemLog', 'Inventário cheio! Não é possível trocar de equipamento.');
            return false;
        }

        if (player.equipment[slot]) {
            this.items.push(player.equipment[slot]);
        }

        player.equipment[slot] = item;
        this.items.splice(index, 1);

        this._playAudio('equip');
        this.updatePlayerStats(playerIndex);
        this._emit('inventoryUpdated', this);
        this._emit('equipmentUpdated', player.equipment);
        this._emit('systemLog', `${player.name} equipou: ${item.name}`);
        return true;
    }

    unequip(slot, playerIndex = 0) {
        const player = this._getParty()[playerIndex];
        if (!player || !player.equipment[slot]) return false;

        if (this.items.length >= this.capacity) {
            this._emit('systemLog', 'Inventário cheio! Não foi possível desequipar.');
            return false;
        }

        const item = player.equipment[slot];
        player.equipment[slot] = null;
        this.items.push(item);

        this._playAudio('equip');
        this.updatePlayerStats(playerIndex);
        this._emit('inventoryUpdated', this);
        this._emit('equipmentUpdated', player.equipment);
        this._emit('systemLog', `${player.name} desequipou: ${item.name}`);
        return true;
    }

    useItem(instanceId, playerIndex = 0) {
        const player = this._getParty()[playerIndex];
        if (!player) return false;

        const index = this.items.findIndex(i => i.instanceId === instanceId);
        if (index === -1) return false;

        const item = this.items[index];
        if (item.type !== 'potion') {
            return false;
        }

        const gm = this._getMechanics();

        if (item.effect === 'cure_poison') {
            const removed = gm && typeof gm.cleanseNegativeStatuses === 'function'
                ? gm.cleanseNegativeStatuses(player, ['poison', 'bleed'])
                : [];
            if (removed.length > 0) {
                this._emit('systemLog', `Você usou ${item.name} em ${player.name} e removeu: ${removed.join(', ')}.`);
            } else {
                this._emit('systemLog', `Você usou ${item.name} em ${player.name} e purificou seus males.`);
            }
        } else if (item.effect === 'heal') {
            if (typeof player.heal === 'function') player.heal(item.value);
            else player.hp = Math.min(player.getMaxHp ? player.getMaxHp() : 9999, (player.hp || 0) + item.value);
            this._emit('systemLog', `Você usou ${item.name} em ${player.name} e curou ${item.value} HP.`);
        } else if (item.effect === 'mana') {
            if (typeof player.restoreMana === 'function') player.restoreMana(item.value);
            else player.mana = Math.min(player.getMaxMana ? player.getMaxMana() : 9999, (player.mana || 0) + item.value);
            this._emit('systemLog', `Você usou ${item.name} em ${player.name} e restaurou ${item.value} Mana.`);
        } else if (item.effect === 'fury') {
            const gain = item.value || 50;
            if (gm && typeof gm.addFury === 'function') {
                gm.addFury(player, gain);
            } else {
                player.fury = Math.max(0, Math.min(100, (player.fury || 0) + gain));
            }
            this._emit('systemLog', `⚡ ${player.name} usou ${item.name} e ganhou +${gain} de Fúria!`);
        } else if (item.effect === 'revive') {
            const maxHp = typeof player.getMaxHp === 'function' ? player.getMaxHp() : (player.maxHp || 100);
            const pct = (item.value || 50) / 100;
            const healAmount = Math.max(1, Math.floor(maxHp * pct));
            if (player.hp <= 0) {
                player.hp = healAmount;
                this._emit('systemLog', `🔥 ${player.name} foi revivido pela ${item.name} com ${healAmount} HP!`);
            } else {
                if (typeof player.heal === 'function') player.heal(healAmount);
                else player.hp = Math.min(maxHp, player.hp + healAmount);
                this._emit('systemLog', `🔥 ${item.name} restaurou ${healAmount} HP em ${player.name}!`);
            }
        } else if (item.effect === 'fire_bomb') {
            const combat = typeof window !== 'undefined' ? window.gameCombat : null;
            if (!combat || !combat.inCombat || !Array.isArray(combat.monsters)) {
                this._emit('systemLog', '💣 A Bomba Incendiária só pode ser usada em combate!');
                return false;
            }
            const bombDmg = item.value || 60;
            combat.monsters.forEach(m => {
                if (m.hp > 0) {
                    m.hp = Math.max(0, m.hp - bombDmg);
                    if (gm && typeof gm.applyStatus === 'function') {
                        gm.applyStatus(m, 'burn', { duration: 3, potency: Math.max(10, Math.floor(bombDmg * 0.25)) });
                    }
                    this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: m.instanceId, dmg: bombDmg });
                }
            });
            this._playAudio('fire');
            this._emit('systemLog', `💣 ${player.name} arremessou ${item.name}, causando ${bombDmg} de dano ígneo e Queimadura em área!`);
            this._emit('combatUpdated', { party: combat.party, monsters: combat.monsters });
        }

        if (item.count > 1) {
            item.count -= 1;
        } else {
            this.items.splice(index, 1);
        }

        this._playAudio('potion');
        this._emit('inventoryUpdated', this);
        this._emit('playerUpdated', player);
        return true;
    }

    updatePlayerStats(playerIndex = 0) {
        const player = this._getParty()[playerIndex];
        if (player) {
            this._emit('playerUpdated', player);
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
        this._emit('inventoryUpdated', this);
    }
}

if (typeof window !== 'undefined') {
    window.Inventory = Inventory;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Inventory;
}
