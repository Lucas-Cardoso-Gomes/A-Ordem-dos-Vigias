/**
 * player.js
 * Player logic, stats, leveling and classes.
 */

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.level = 1;
        this.xp = 0;
        this.gold = 0;

        this.attributes = {
            str: 10,
            agi: 10,
            int: 10,
            def: 10,
            luk: 10
        };

        this.statPoints = 0;
        this.playerClass = 'Nenhuma'; // Caçador, Exorcista, Alquimista, Bruxo, Mago

        this.hp = this.getMaxHp();
        this.mana = this.getMaxMana();

        this.bestiary = [];
    }

    load(data) {
        if (!data) return;
        this.level = data.level || 1;
        this.xp = data.xp || 0;
        this.gold = data.gold || 0;
        this.attributes = data.attributes || this.attributes;
        this.statPoints = data.statPoints || 0;
        this.playerClass = data.playerClass || 'Nenhuma';
        this.hp = data.hp || this.getMaxHp();
        this.mana = data.mana || this.getMaxMana();
        this.bestiary = data.bestiary || [];
    }

    save() {
        return {
            level: this.level,
            xp: this.xp,
            gold: this.gold,
            attributes: this.attributes,
            statPoints: this.statPoints,
            playerClass: this.playerClass,
            hp: this.hp,
            mana: this.mana,
            bestiary: this.bestiary
        };
    }

    getXpNeeded() {
        // More balanced exponential growth:
        // level 1 -> 100, level 2 -> ~115, level 10 -> ~350, level 50 -> ~9400
        return Math.floor(100 * Math.pow(1.15, this.level - 1));
    }

    gainXp(amount) {
        this.xp += amount;
        let leveledUp = false;
        while (this.xp >= this.getXpNeeded() && this.level < 100) {
            this.xp -= this.getXpNeeded();
            this.levelUp();
            leveledUp = true;
        }
        if (leveledUp) {
            Engine.emit('systemLog', `Você alcançou o nível ${this.level}! (+5 Pontos de Atributo)`);
        }
        Engine.emit('playerUpdated', this);
    }

    gainGold(amount) {
        this.gold += amount;
        Engine.emit('playerUpdated', this);
    }

    levelUp() {
        this.level++;
        this.statPoints += 5;
        this.hp = this.getMaxHp();
        this.mana = this.getMaxMana();

        if (this.level === 5 && this.playerClass === 'Nenhuma') {
            // Unlock class selection (simplified for now to set a default or wait for UI)
            Engine.emit('systemLog', 'Você agora pode escolher uma classe na tela de Personagem!');
        }
    }

    addAttribute(attr) {
        if (this.statPoints > 0 && this.attributes[attr] !== undefined) {
            this.attributes[attr]++;
            this.statPoints--;

            // Adjust max stats if needed
            if (attr === 'str' || attr === 'def') {
                this.hp += 5; // Simple bump, but real max relies on getMaxHp
            }
            if (attr === 'int') {
                this.mana += 5;
            }

            Engine.emit('playerUpdated', this);
        }
    }

    getTotalAttr(attr) {
        let val = this.attributes[attr] || 0;
        if (window.gameInventory && window.gameInventory.equipment) {
            Object.values(window.gameInventory.equipment).forEach(item => {
                if (item && item.stats && item.stats[attr]) {
                    val += item.stats[attr];
                }
            });
        }
        return val;
    }

    getMaxHp() {
        // Base 100 + 10 per Str + 5 per Def + level bonus + item bonuses
        let max = 100 + (this.getTotalAttr('str') * 10) + (this.getTotalAttr('def') * 5) + (this.level * 10);

        if (window.gameInventory && window.gameInventory.equipment) {
            Object.values(window.gameInventory.equipment).forEach(item => {
                if (item && item.stats && item.stats.hp) {
                    max += item.stats.hp;
                }
            });
        }
        return max;
    }

    getMaxMana() {
        // Base 50 + 10 per Int + level bonus + item bonuses
        let max = 50 + (this.getTotalAttr('int') * 10) + (this.level * 5);

        if (window.gameInventory && window.gameInventory.equipment) {
            Object.values(window.gameInventory.equipment).forEach(item => {
                if (item && item.stats && item.stats.mana) {
                    max += item.stats.mana;
                }
            });
        }
        return max;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.getMaxHp());
        Engine.emit('playerUpdated', this);
    }

    restoreMana(amount) {
        this.mana = Math.min(this.mana + amount, this.getMaxMana());
        Engine.emit('playerUpdated', this);
    }

    setClass(newClass) {
        const validClasses = ['Caçador', 'Exorcista', 'Alquimista', 'Bruxo', 'Mago', 'Guerreiro', 'Assassino', 'Paladino', 'Necromante'];
        const inputClass = newClass ? newClass.trim().toLowerCase() : '';
        const match = validClasses.find(c => c.toLowerCase() === inputClass);
        if (match) {
            this.playerClass = match;
            Engine.emit('playerUpdated', this);
            Engine.emit('systemLog', `Você se tornou um ${match}!`);
        }
    }

    getSkills() {
        if (window.SkillDatabase) {
            return window.SkillDatabase.getSkillsForClass(this.playerClass, this.level, (attr) => this.getTotalAttr(attr));
        }
        return [];
    }
}

window.Player = Player;
