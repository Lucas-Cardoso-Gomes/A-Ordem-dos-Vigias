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
        return Math.floor(10 * Math.pow(1.25, this.level - 1));
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
        const inputClass = newClass ? newClass.trim().toLowerCase() : '';
        const match = validClasses.find(c => c.toLowerCase() === inputClass);
        if (match) {
            this.playerClass = match;
            Engine.emit('playerUpdated', this);
            Engine.emit('systemLog', `Você se tornou um ${match}!`);
        }
    }

    getSkills() {
        let skills = [];

        switch (this.playerClass) {

            case 'Caçador':
                skills.push({
                    id: 's_cacador_1',
                    name: "Tiro Preciso",
                    manaCost: 15,
                    type: 'attack',
                    multiplier: 1.5,
                    reqLvl: 5
                });

                if (this.level >= 10)
                    skills.push({
                        id: 's_cacador_2',
                        name: "Saraivada",
                        manaCost: 30,
                        type: 'attack',
                        multiplier: 2.2,
                        reqLvl: 10
                    });

                if (this.level >= 20)
                    skills.push({
                        id: 's_cacador_3',
                        name: "Flecha Perfurante",
                        manaCost: 50,
                        type: 'attack',
                        multiplier: 3.5,
                        element: 'estaca',
                        reqLvl: 20
                    });

                if (this.level >= 30)
                    skills.push({
                        id: 's_cacador_4',
                        name: "Bala de Prata",
                        manaCost: 70,
                        type: 'attack',
                        multiplier: 4.5,
                        element: 'prata',
                        reqLvl: 30
                    });

                if (this.level >= 40)
                    skills.push({
                        id: 's_cacador_5',
                        name: "Disparo Fantasma",
                        manaCost: 100,
                        type: 'attack',
                        multiplier: 6.0,
                        element: 'espiritual',
                        reqLvl: 40
                    });

                if (this.level >= 50)
                    skills.push({
                        id: 's_cacador_6',
                        name: "Execução do Caçador",
                        manaCost: 140,
                        type: 'attack',
                        multiplier: 8.5,
                        element: 'sagrado',
                        reqLvl: 50
                    });
                break;

            case 'Exorcista':
                skills.push({
                    id: 's_exorcista_1',
                    name: "Cura Sagrada",
                    manaCost: 20,
                    type: 'heal',
                    healAmount: 50 + this.getTotalAttr('int') * 2,
                    reqLvl: 5
                });

                if (this.level >= 10)
                    skills.push({
                        id: 's_exorcista_2',
                        name: "Punição Divina",
                        manaCost: 35,
                        type: 'attack',
                        multiplier: 2.0,
                        element: 'luz sagrada',
                        reqLvl: 10
                    });

                if (this.level >= 20)
                    skills.push({
                        id: 's_exorcista_3',
                        name: "Aura de Proteção",
                        manaCost: 60,
                        type: 'heal',
                        healAmount: 150 + this.getTotalAttr('int') * 3,
                        reqLvl: 20
                    });

                if (this.level >= 30)
                    skills.push({
                        id: 's_exorcista_4',
                        name: "Expulsão Demoníaca",
                        manaCost: 85,
                        type: 'attack',
                        multiplier: 4.2,
                        element: 'sagrado',
                        reqLvl: 30
                    });

                if (this.level >= 40)
                    skills.push({
                        id: 's_exorcista_5',
                        name: "Milagre Divino",
                        manaCost: 120,
                        type: 'heal',
                        healAmount: 350 + this.getTotalAttr('int') * 5,
                        reqLvl: 40
                    });

                if (this.level >= 50)
                    skills.push({
                        id: 's_exorcista_6',
                        name: "Julgamento Celestial",
                        manaCost: 180,
                        type: 'attack',
                        multiplier: 8.0,
                        element: 'luz sagrada',
                        reqLvl: 50
                    });
                break;

            case 'Alquimista':
                skills.push({
                    id: 's_alquimista_1',
                    name: "Bomba Ácida",
                    manaCost: 10,
                    type: 'attack',
                    multiplier: 1.2,
                    reqLvl: 5
                });

                if (this.level >= 10)
                    skills.push({
                        id: 's_alquimista_2',
                        name: "Fogo Alquímico",
                        manaCost: 25,
                        type: 'attack',
                        multiplier: 1.8,
                        element: 'fogo',
                        reqLvl: 10
                    });

                if (this.level >= 20)
                    skills.push({
                        id: 's_alquimista_3',
                        name: "Transmutação Explosiva",
                        manaCost: 45,
                        type: 'attack',
                        multiplier: 3.0,
                        reqLvl: 20
                    });

                if (this.level >= 30)
                    skills.push({
                        id: 's_alquimista_4',
                        name: "Névoa Corrosiva",
                        manaCost: 70,
                        type: 'attack',
                        multiplier: 4.0,
                        element: 'ácido',
                        reqLvl: 30
                    });

                if (this.level >= 40)
                    skills.push({
                        id: 's_alquimista_5',
                        name: "Mistura Instável",
                        manaCost: 100,
                        type: 'attack',
                        multiplier: 5.8,
                        element: 'explosão',
                        reqLvl: 40
                    });

                if (this.level >= 50)
                    skills.push({
                        id: 's_alquimista_6',
                        name: "Reação em Cadeia",
                        manaCost: 150,
                        type: 'attack',
                        multiplier: 8.2,
                        element: 'alquimia',
                        reqLvl: 50
                    });
                break;

            case 'Bruxo':
                skills.push({
                    id: 's_bruxo_1',
                    name: "Dreno de Vida",
                    manaCost: 25,
                    type: 'drain',
                    multiplier: 1.5,
                    reqLvl: 5
                });

                if (this.level >= 10)
                    skills.push({
                        id: 's_bruxo_2',
                        name: "Maldição Sombria",
                        manaCost: 40,
                        type: 'attack',
                        multiplier: 2.5,
                        element: 'magia arcana',
                        reqLvl: 10
                    });

                if (this.level >= 20)
                    skills.push({
                        id: 's_bruxo_3',
                        name: "Festim de Almas",
                        manaCost: 70,
                        type: 'drain',
                        multiplier: 3.5,
                        reqLvl: 20
                    });

                if (this.level >= 30)
                    skills.push({
                        id: 's_bruxo_4',
                        name: "Praga Eterna",
                        manaCost: 90,
                        type: 'attack',
                        multiplier: 4.8,
                        element: 'trevas',
                        reqLvl: 30
                    });

                if (this.level >= 40)
                    skills.push({
                        id: 's_bruxo_5',
                        name: "Invocar Espectros",
                        manaCost: 120,
                        type: 'attack',
                        multiplier: 6.2,
                        element: 'espiritual',
                        reqLvl: 40
                    });

                if (this.level >= 50)
                    skills.push({
                        id: 's_bruxo_6',
                        name: "Apocalipse das Almas",
                        manaCost: 180,
                        type: 'drain',
                        multiplier: 9.0,
                        reqLvl: 50
                    });
                break;

            case 'Mago':
                skills.push({
                    id: 's_mago_1',
                    name: "Bola de Fogo",
                    manaCost: 20,
                    type: 'attack',
                    multiplier: 1.8,
                    element: 'fogo',
                    reqLvl: 5
                });

                if (this.level >= 10)
                    skills.push({
                        id: 's_mago_2',
                        name: "Lança de Gelo",
                        manaCost: 30,
                        type: 'attack',
                        multiplier: 2.2,
                        element: 'gelo',
                        reqLvl: 10
                    });

                if (this.level >= 20)
                    skills.push({
                        id: 's_mago_3',
                        name: "Tempestade Arcana",
                        manaCost: 65,
                        type: 'attack',
                        multiplier: 4.0,
                        element: 'magia arcana',
                        reqLvl: 20
                    });

                if (this.level >= 30)
                    skills.push({
                        id: 's_mago_4',
                        name: "Raio Elemental",
                        manaCost: 90,
                        type: 'attack',
                        multiplier: 5.0,
                        element: 'raio',
                        reqLvl: 30
                    });

                if (this.level >= 40)
                    skills.push({
                        id: 's_mago_5',
                        name: "Meteoro",
                        manaCost: 130,
                        type: 'attack',
                        multiplier: 7.0,
                        element: 'fogo',
                        reqLvl: 40
                    });

                if (this.level >= 50)
                    skills.push({
                        id: 's_mago_6',
                        name: "Cataclismo Arcano",
                        manaCost: 200,
                        type: 'attack',
                        multiplier: 10.0,
                        element: 'magia arcana',
                        reqLvl: 50
                    });
                break;
        }

        return skills;
    }
}

window.Player = Player;
