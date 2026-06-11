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
        const validClasses = ['Caçador', 'Exorcista', 'Alquimista', 'Bruxo', 'Mago'];
        if (validClasses.includes(newClass)) {
            this.playerClass = newClass;
            Engine.emit('playerUpdated', this);
            Engine.emit('systemLog', `Você se tornou um ${newClass}!`);
        }
    }

    getSkills() {
        let skills = [];
        switch (this.playerClass) {
            case 'Caçador':
                skills.push({ id: 's_cacador_1', name: "Tiro Preciso", manaCost: 15, type: 'attack', multiplier: 1.5, reqLvl: 5 });
                if (this.level >= 10) skills.push({ id: 's_cacador_2', name: "Saraivada", manaCost: 30, type: 'attack', multiplier: 2.2, reqLvl: 10 });
                if (this.level >= 20) skills.push({ id: 's_cacador_3', name: "Flecha Perfurante", manaCost: 50, type: 'attack', multiplier: 3.5, element: 'estaca', reqLvl: 20 });
                break;
            case 'Exorcista':
                skills.push({ id: 's_exorcista_1', name: "Cura Sagrada", manaCost: 20, type: 'heal', healAmount: 50 + this.getTotalAttr('int') * 2, reqLvl: 5 });
                if (this.level >= 10) skills.push({ id: 's_exorcista_2', name: "Punição Divina", manaCost: 35, type: 'attack', multiplier: 2.0, element: 'luz sagrada', reqLvl: 10 });
                if (this.level >= 20) skills.push({ id: 's_exorcista_3', name: "Aura de Proteção", manaCost: 60, type: 'heal', healAmount: 150 + this.getTotalAttr('int') * 3, reqLvl: 20 });
                break;
            case 'Alquimista':
                skills.push({ id: 's_alquimista_1', name: "Bomba Ácida", manaCost: 10, type: 'attack', multiplier: 1.2, reqLvl: 5 });
                if (this.level >= 10) skills.push({ id: 's_alquimista_2', name: "Fogo Alquímico", manaCost: 25, type: 'attack', multiplier: 1.8, element: 'fogo', reqLvl: 10 });
                if (this.level >= 20) skills.push({ id: 's_alquimista_3', name: "Transmutação Explosiva", manaCost: 45, type: 'attack', multiplier: 3.0, reqLvl: 20 });
                break;
            case 'Bruxo':
                skills.push({ id: 's_bruxo_1', name: "Dreno de Vida", manaCost: 25, type: 'drain', multiplier: 1.5, reqLvl: 5 });
                if (this.level >= 10) skills.push({ id: 's_bruxo_2', name: "Maldição Sombria", manaCost: 40, type: 'attack', multiplier: 2.5, element: 'magia arcana', reqLvl: 10 });
                if (this.level >= 20) skills.push({ id: 's_bruxo_3', name: "Festim de Almas", manaCost: 70, type: 'drain', multiplier: 3.5, reqLvl: 20 });
                break;
            case 'Mago':
                skills.push({ id: 's_mago_1', name: "Bola de Fogo", manaCost: 20, type: 'attack', multiplier: 1.8, element: 'fogo', reqLvl: 5 });
                if (this.level >= 10) skills.push({ id: 's_mago_2', name: "Lança de Gelo", manaCost: 30, type: 'attack', multiplier: 2.2, element: 'gelo', reqLvl: 10 });
                if (this.level >= 20) skills.push({ id: 's_mago_3', name: "Tempestade Arcana", manaCost: 65, type: 'attack', multiplier: 4.0, element: 'magia arcana', reqLvl: 20 });
                break;
        }
        return skills;
    }
}

window.Player = Player;
