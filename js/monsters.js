/**
 * monsters.js
 * Database of all monsters, stats, and loot tables.
 */

const MonsterDatabase = {
    monsters: [
        // Comuns (Level 1-10)
        { id: 'mob1', name: 'Goblin', type: 'Comum', tier: 1, minLvl: 1, maxLvl: 5, hp: 30, dmg: 5, weakness: [], xp: 10, gold: 5, dropChance: 10 },
        { id: 'mob2', name: 'Esqueleto', type: 'Morto-vivo', tier: 1, minLvl: 3, maxLvl: 8, hp: 45, dmg: 8, weakness: ['machados', 'magia sagrada'], xp: 15, gold: 8, dropChance: 15 },
        { id: 'mob3', name: 'Zumbi', type: 'Morto-vivo', tier: 1, minLvl: 2, maxLvl: 7, hp: 60, dmg: 6, weakness: ['fogo', 'magia sagrada'], xp: 12, gold: 6, dropChance: 12 },
        { id: 'mob4', name: 'Aranha Gigante', type: 'Besta', tier: 1, minLvl: 4, maxLvl: 10, hp: 40, dmg: 10, weakness: ['fogo'], xp: 18, gold: 10, dropChance: 20 },
        
        // Intermediários (Level 10-40)
        { id: 'mob5', name: 'Lobisomem', type: 'Fera Mágica', tier: 2, minLvl: 10, maxLvl: 25, hp: 150, dmg: 20, weakness: ['prata', 'fogo'], xp: 50, gold: 25, dropChance: 30 },
        { id: 'mob6', name: 'Vampiro', type: 'Morto-vivo', tier: 2, minLvl: 15, maxLvl: 30, hp: 200, dmg: 25, weakness: ['luz sagrada', 'estaca'], xp: 70, gold: 40, dropChance: 35 },
        { id: 'mob7', name: 'Minotauro', type: 'Besta', tier: 2, minLvl: 25, maxLvl: 40, hp: 300, dmg: 35, weakness: ['machados'], xp: 100, gold: 50, dropChance: 40 },
        { id: 'mob8', name: 'Banshee', type: 'Fantasma', tier: 2, minLvl: 20, maxLvl: 35, hp: 120, dmg: 40, weakness: ['magia sagrada', 'prata'], xp: 80, gold: 30, dropChance: 35 },

        // Avançados (Level 40-80)
        { id: 'mob9', name: 'Cérbero', type: 'Demônio', tier: 3, minLvl: 40, maxLvl: 60, hp: 600, dmg: 60, weakness: ['gelo', 'magia divina'], xp: 250, gold: 120, dropChance: 50 },
        { id: 'mob10', name: 'Hidra', type: 'Besta Mítica', tier: 3, minLvl: 50, maxLvl: 70, hp: 800, dmg: 70, weakness: ['fogo'], xp: 350, gold: 150, dropChance: 55 },
        { id: 'mob11', name: 'Demônio Inferior', type: 'Demônio', tier: 3, minLvl: 60, maxLvl: 80, hp: 1000, dmg: 90, weakness: ['magia divina', 'luz sagrada'], xp: 500, gold: 200, dropChance: 60 },

        // Chefes (Level 80-100+)
        { id: 'boss1', name: 'Rei Vampiro', type: 'Chefe Morto-vivo', tier: 4, minLvl: 80, maxLvl: 90, hp: 3000, dmg: 150, weakness: ['luz sagrada', 'estaca'], xp: 2000, gold: 1000, dropChance: 100, isBoss: true },
        { id: 'boss2', name: 'Dragão Negro', type: 'Chefe Dragão', tier: 4, minLvl: 90, maxLvl: 100, hp: 5000, dmg: 250, weakness: ['armas lendárias', 'gelo'], xp: 5000, gold: 3000, dropChance: 100, isBoss: true }
    ],

    generateMonster(regionLevelMin, regionLevelMax, isBoss = false) {
        let pool = this.monsters.filter(m => m.minLvl <= regionLevelMax && m.maxLvl >= regionLevelMin);
        if (isBoss) {
            pool = pool.filter(m => m.isBoss);
        } else {
            pool = pool.filter(m => !m.isBoss);
        }

        if (pool.length === 0) {
            pool = [this.monsters[0]]; // fallback
        }

        const base = pool[Math.floor(Math.random() * pool.length)];
        const level = Math.max(regionLevelMin, Math.min(regionLevelMax, Engine.randomInt(base.minLvl, base.maxLvl)));
        
        // Scale stats by level diff
        const scale = 1 + (level - base.minLvl) * 0.1;

        return {
            ...base,
            instanceId: 'mon_' + Date.now(),
            level: level,
            maxHp: Math.floor(base.hp * scale),
            hp: Math.floor(base.hp * scale),
            dmg: Math.floor(base.dmg * scale),
            xp: Math.floor(base.xp * scale),
            gold: Math.floor(base.gold * scale)
        };
    },

    getLoot(monster) {
        let loot = {
            gold: monster.gold,
            xp: monster.xp,
            items: []
        };

        // Material drops
        if (Engine.randomChance(70)) {
            // Pick material based on monster type/tier
            let matId = 'm1'; // Ossos default
            if (monster.type.includes('Morto-vivo')) matId = 'm1';
            else if (monster.type.includes('Fera')) matId = 'm2'; // Couro
            else if (monster.id === 'mob7') matId = 'm6'; // Chifre Minotauro
            else if (monster.id === 'mob6' || monster.isBoss) matId = 'm5'; // Sangue Vamp
            else if (monster.tier === 3) matId = 'm7'; // Essencia
            else if (monster.id === 'boss2') matId = 'm4'; // Escamas

            loot.items.push(ItemDatabase.getMaterial(matId));
        }

        // Equipment drop
        if (Engine.randomChance(monster.dropChance)) {
            let forcedRarity = null;
            if (monster.isBoss) {
                forcedRarity = Engine.randomChance(20) ? 'mitico' : 'lendario';
            } else if (monster.tier === 3) {
                forcedRarity = Engine.randomChance(10) ? 'lendario' : 'epico';
            } else if (monster.tier === 2) {
                forcedRarity = Engine.randomChance(10) ? 'epico' : 'raro';
            }

            loot.items.push(ItemDatabase.generateItem(monster.level, forcedRarity));
        }

        // Potion drop
        if (Engine.randomChance(20)) {
            loot.items.push(ItemDatabase.getPotion('p1'));
        }

        return loot;
    }
};

window.MonsterDatabase = MonsterDatabase;