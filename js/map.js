/**
 * map.js
 * Definitions of regions and encounter generation.
 */

const MapSystem = {
    regions: {
        'floresta': { id: 'floresta', name: 'Floresta Sombria', minLvl: 1, maxLvl: 10, desc: 'Uma floresta densa e escura. Lar de Goblins, Aranhas e mortos-vivos fracos.' },
        'cripta': { id: 'cripta', name: 'Cripta Maldita', minLvl: 10, maxLvl: 25, desc: 'Tumbas antigas corrompidas pela magia necromântica. Cuidado com Vampiros e Lobisomens.' },
        'montanhas': { id: 'montanhas', name: 'Montanhas de Ferro', minLvl: 25, maxLvl: 40, desc: 'Picos gélidos habitados por tribos de Minotauros guerreiros.' },
        'pantano': { id: 'pantano', name: 'Pântano das Almas', minLvl: 40, maxLvl: 60, desc: 'Lamas tóxicas e névoa densa. Fantasmas e Banshees assombram o local.' },
        'fortaleza': { id: 'fortaleza', name: 'Fortaleza Infernal', minLvl: 60, maxLvl: 80, desc: 'Ruínas de uma antiga ordem de cavaleiros, agora dominada por demônios.' },
        'vale': { id: 'vale', name: 'Vale dos Dragões', minLvl: 80, maxLvl: 100, desc: 'O berço da Convergência. Criaturas míticas e Reis mortos-vivos espreitam aqui.' }
    },

    currentRegion: null,

    getRegionDetails(id) {
        return this.regions[id];
    },

    explore(regionId) {
        const region = this.regions[regionId];
        if (!region) return null;

        this.currentRegion = region;
        
        // 5% chance to encounter a boss if player level is near max region level
        const isBoss = Engine.randomChance(5) && region.maxLvl >= 80;

        const monster = MonsterDatabase.generateMonster(region.minLvl, region.maxLvl, isBoss);
        return monster;
    }
};

window.MapSystem = MapSystem;