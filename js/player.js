/**
 * player.js
 * Player logic, stats, leveling, classes, Fury, statuses, and Relic bonus integration.
 */

class Player {
    constructor() {
        this.reset();
    }

    _emit(event, payload) {
        const eng = (typeof Engine !== 'undefined' ? Engine : (typeof window !== 'undefined' ? window.Engine : null));
        if (eng && typeof eng.emit === 'function') {
            eng.emit(event, payload);
        }
    }

    _getMechanics() {
        if (typeof GameMechanics !== 'undefined') return GameMechanics;
        if (typeof window !== 'undefined' && window.GameMechanics) return window.GameMechanics;
        return null;
    }

    reset() {
        this.name = 'Herói';
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
        this.playerClass = 'Nenhuma'; // Guerreiro, Caçador, Guardião, Mago, Clérigo
        this.classLocked = false;
        this.roleTitle = '';

        this.fury = 0;
        this.statusEffects = [];
        this.shield = 0;

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

        this.hp = this.getMaxHp();
        this.mana = this.getMaxMana();

        this.bestiary = [];
    }

    // Cópia profunda de objetos e sanitização de HP/Mana/novos campos ao carregar
    load(data) {
        if (!data) return;
        this.name = data.name || 'Herói';
        this.level = Math.max(1, data.level || 1);
        this.xp = Math.max(0, data.xp || 0);
        this.gold = Math.max(0, data.gold || 0);

        this.attributes = { ...this.attributes, ...(data.attributes || {}) };
        this.statPoints = Math.max(0, data.statPoints || 0);

        this.playerClass = data.playerClass || 'Nenhuma';
        this.classLocked = data.classLocked || false;
        if (this.playerClass !== 'Nenhuma' && data.classLocked === undefined) this.classLocked = true;
        this.roleTitle = data.roleTitle || '';

        this.fury = Math.max(0, Math.min(100, Number(data.fury) || 0));
        this.statusEffects = Array.isArray(data.statusEffects) ? data.statusEffects.map(s => ({ ...s })) : [];
        this.shield = Math.max(0, Number(data.shield) || 0);

        this.equipment = { ...this.equipment, ...(data.equipment || {}) };

        // Garante que o HP/Mana carregados nunca ultrapassem o limite real do personagem
        this.hp = Math.min(this.getMaxHp(), Math.max(0, data.hp ?? this.getMaxHp()));
        this.mana = Math.min(this.getMaxMana(), Math.max(0, data.mana ?? this.getMaxMana()));

        this.bestiary = Array.isArray(data.bestiary) ? [...data.bestiary] : [];
    }

    save() {
        return {
            name: this.name,
            level: this.level,
            xp: this.xp,
            gold: this.gold,
            attributes: { ...this.attributes },
            statPoints: this.statPoints,
            playerClass: this.playerClass,
            classLocked: this.classLocked,
            roleTitle: this.roleTitle,
            fury: this.fury,
            statusEffects: Array.isArray(this.statusEffects) ? this.statusEffects.map(s => ({ ...s })) : [],
            shield: this.shield,
            equipment: { ...this.equipment },
            hp: this.hp,
            mana: this.mana,
            bestiary: [...this.bestiary]
        };
    }

    getXpNeeded() {
        if (this.level <= 50) {
            return Math.floor(100 * Math.pow(1.15, this.level - 1));
        } else {
            const base50 = Math.floor(100 * Math.pow(1.15, 49));
            return Math.floor(base50 * Math.pow(1.35, this.level - 50));
        }
    }

    gainGold(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return;
        this.gold = Math.max(0, (this.gold || 0) + amount);
        this._emit('playerUpdated', this);
    }

    gainXp(amount) {
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) return;

        let effectiveXp = amount;
        const gm = this._getMechanics();
        if (gm && typeof gm.getPartyBonuses === 'function') {
            const bonuses = gm.getPartyBonuses();
            if (bonuses && bonuses.xpMult && bonuses.xpMult > 1) {
                effectiveXp = Math.floor(effectiveXp * bonuses.xpMult);
            }
        }

        this.xp += effectiveXp;
        let leveledUp = false;

        while (this.xp >= this.getXpNeeded() && this.level < 100) {
            this.xp -= this.getXpNeeded();
            this.levelUp();
            leveledUp = true;
        }

        if (leveledUp) {
            this._emit('systemLog', `${this.name} alcançou o nível ${this.level}! (+5 Pontos de Atributo)`);
        }
        this._emit('playerUpdated', this);
    }

    levelUp() {
        this.level++;
        this.statPoints += 5;
        this.hp = this.getMaxHp();
        this.mana = this.getMaxMana();

        if (typeof window !== 'undefined' && window.gameAudio && typeof window.gameAudio.play === 'function') {
            window.gameAudio.play('levelup');
        }
        this._emit('levelUp', { player: this, level: this.level });

        if (this.level === 5 && this.playerClass === 'Nenhuma') {
            this._emit('systemLog', 'Você agora pode escolher uma classe na tela de Personagem!');
        }
    }

    addAttribute(attr) {
        if (this.statPoints > 0 && this.attributes[attr] !== undefined) {
            this.attributes[attr]++;
            this.statPoints--;

            if (attr === 'str' || attr === 'def') {
                this.hp = Math.min(this.getMaxHp(), this.hp + 5);
            }
            if (attr === 'int') {
                this.mana = Math.min(this.getMaxMana(), this.mana + 5);
            }

            this._emit('playerUpdated', this);
        }
    }

    getTotalAttr(attr) {
        let val = this.attributes[attr] || 0;
        if (this.equipment) {
            Object.values(this.equipment).forEach(item => {
                if (item && item.stats && item.stats[attr]) {
                    val += item.stats[attr];
                }
            });
        }

        const gm = this._getMechanics();
        if (gm && typeof gm.getPartyBonuses === 'function') {
            const bonuses = gm.getPartyBonuses();
            const mult = bonuses?.attrMults?.[attr] ?? ((bonuses?.allAttrMult || 1) + (attr === 'agi' ? (bonuses?.agiPct || 0) : 0));
            if (mult && mult !== 1) {
                val = Math.floor(val * mult);
            }
        }

        return val;
    }

    getMaxHp() {
        // Base 100 + 10 per Str + 5 per Def + level bonus + item bonuses
        let max = 100 + (this.getTotalAttr('str') * 10) + (this.getTotalAttr('def') * 5) + (this.level * 10);

        if (this.equipment) {
            Object.values(this.equipment).forEach(item => {
                if (item && item.stats && item.stats.hp) {
                    max += item.stats.hp;
                }
            });
        }

        const gm = this._getMechanics();
        if (gm && typeof gm.getPartyBonuses === 'function') {
            const bonuses = gm.getPartyBonuses();
            if (bonuses && bonuses.maxHpMult && bonuses.maxHpMult !== 1) {
                max = Math.floor(max * bonuses.maxHpMult);
            }
        }

        return max;
    }

    getMaxMana() {
        // Base 50 + 10 per Int + level bonus + item bonuses
        let max = 50 + (this.getTotalAttr('int') * 10) + (this.level * 5);

        if (this.equipment) {
            Object.values(this.equipment).forEach(item => {
                if (item && item.stats && item.stats.mana) {
                    max += item.stats.mana;
                }
            });
        }
        return max;
    }

    heal(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return;
        this.hp = Math.min(this.hp + amount, this.getMaxHp());
        this._emit('playerUpdated', this);
    }

    restoreMana(amount) {
        if (typeof amount !== 'number' || isNaN(amount)) return;
        this.mana = Math.min(this.mana + amount, this.getMaxMana());
        this._emit('playerUpdated', this);
    }

    setClass(newClass, forceRespec = false) {
        const inputClass = newClass ? newClass.trim().toLowerCase() : '';

        if (forceRespec && inputClass === 'nenhuma') {
            this.playerClass = 'Nenhuma';
            this.classLocked = false;
            this._emit('playerUpdated', this);
            this._emit('systemLog', `${this.name} redefiniu sua classe e pode escolher um novo caminho.`);
            return true;
        }

        if (this.classLocked && !forceRespec) {
            return false;
        }

        const validClasses = ['Guerreiro', 'Caçador', 'Guardião', 'Mago', 'Clérigo'];
        const match = validClasses.find(c => c.toLowerCase() === inputClass);
        if (match) {
            this.playerClass = match;
            this.classLocked = true;
            this._emit('playerUpdated', this);
            this._emit('systemLog', `${this.name} se tornou um ${match}!`);
            return true;
        }
        return false;
    }

    getSkills() {
        const skillDb = (typeof SkillDatabase !== 'undefined' ? SkillDatabase : (typeof window !== 'undefined' ? window.SkillDatabase : null));
        if (skillDb) {
            return skillDb.getSkillsForClass(this.playerClass, this.level, (attr) => this.getTotalAttr(attr));
        }
        return [];
    }
}

if (typeof window !== 'undefined') {
    window.Player = Player;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}
