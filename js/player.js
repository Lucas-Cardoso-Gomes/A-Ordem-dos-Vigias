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
        this.playerClass = 'Nenhuma'; // Caçador, Exorcista, Alquimista, Bruxo
        
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
        // Exponential growth: e.g., level 1 -> 100, level 2 -> ~200, level 3 -> ~400
        return Math.floor(100 * Math.pow(1.5, this.level - 1));
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

    getMaxHp() {
        // Base 100 + 10 per Str + 5 per Def + level bonus
        let max = 100 + (this.attributes.str * 10) + (this.attributes.def * 5) + (this.level * 10);
        return max;
    }

    getMaxMana() {
        // Base 50 + 10 per Int + level bonus
        return 50 + (this.attributes.int * 10) + (this.level * 5);
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
        const validClasses = ['Caçador', 'Exorcista', 'Alquimista', 'Bruxo'];
        if (validClasses.includes(newClass)) {
            this.playerClass = newClass;
            Engine.emit('playerUpdated', this);
            Engine.emit('systemLog', `Você se tornou um ${newClass}!`);
        }
    }
}

window.Player = Player;
