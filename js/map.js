/**
 * map.js
 * Definitions of regions and encounter generation.
 */

const MapSystem = {
    regions: {
        'floresta': { id: 'floresta', name: 'Floresta Sombria', minLvl: 1, maxLvl: 10, desc: 'Uma floresta densa e escura. Lar de Goblins, Aranhas e mortos-vivos fracos.', encounters: ['mob1', 'mob2', 'mob3', 'mob4', 'boss1'], next: 'cripta' },
        'cripta': { id: 'cripta', name: 'Cripta Maldita', minLvl: 10, maxLvl: 25, desc: 'Tumbas antigas corrompidas pela magia necromântica. Cuidado com Vampiros e Lobisomens.', encounters: ['mob3', 'mob2', 'mob5', 'mob6', 'boss1'], next: 'montanhas' },
        'montanhas': { id: 'montanhas', name: 'Montanhas de Ferro', minLvl: 25, maxLvl: 40, desc: 'Picos gélidos habitados por tribos de Minotauros guerreiros.', encounters: ['mob1', 'mob4', 'mob7', 'mob7', 'boss2'], next: 'pantano' },
        'pantano': { id: 'pantano', name: 'Pântano das Almas', minLvl: 40, maxLvl: 60, desc: 'Lamas tóxicas e névoa densa. Fantasmas e Banshees assombram o local.', encounters: ['mob3', 'mob8', 'mob8', 'mob9', 'boss2'], next: 'fortaleza' },
        'fortaleza': { id: 'fortaleza', name: 'Fortaleza Infernal', minLvl: 60, maxLvl: 80, desc: 'Ruínas de uma antiga ordem de cavaleiros, agora dominada por demônios.', encounters: ['mob6', 'mob9', 'mob9', 'mob11', 'boss1'], next: 'vale' },
        'vale': { id: 'vale', name: 'Vale dos Dragões', minLvl: 80, maxLvl: 100, desc: 'O berço da Convergência. Criaturas míticas e Reis mortos-vivos espreitam aqui.', encounters: ['mob7', 'mob10', 'mob11', 'mob10', 'boss2'], next: null },
        
       // Mapas bonus
        'helgen': { id: 'helgen', name: 'Masmorras de Helgen', minLvl: 1, maxLvl: 15, desc: 'Ruínas e masmorras sob a cidade destruída. Cuidado com bestas selvagens e aranhas.', encounters: ['mob1', 'mob4', 'mob2', 'mob4', 'boss1'], next: 'abismo_sombras', isBonus: true },
        'abismo_sombras': { id: 'abismo_sombras', name: 'Abismo das Sombras Profundas', minLvl: 15, maxLvl: 30, desc: 'Caverna iluminada por cristais brilhantes onde perigosos ursos espreitam.', encounters: ['mob4', 'mob5', 'mob5', 'mob8', 'boss1'], next: 'antro_golgorgs', isBonus: true },
        'antro_golgorgs': { id: 'antro_golgorgs', name: 'Antro dos Golgorgs', minLvl: 30, maxLvl: 50, desc: 'Passagens tortuosas infestadas por pequenas e astutas criaturas.', encounters: ['mob1', 'mob5', 'mob7', 'mob9', 'boss2'], next: 'covil_orcs', isBonus: true },
        'covil_orcs': { id: 'covil_orcs', name: 'Covil dos Orcs', minLvl: 50, maxLvl: 80, desc: 'Acampamento subterrâneo e campo de treinamento de guerreiros orcs brutais.', encounters: ['mob7', 'mob7', 'mob10', 'mob11', 'boss2'], next: null, isBonus: true }
    },

    currentRegion: null,
    progress: {},
    unlockedRegions: ['floresta', 'helgen'], // Base regions unlocked by default

    getRegionDetails(id) {
        return this.regions[id];
    },

    explore(regionId, battleIndex = null) {
        const region = this.regions[regionId];
        if (!region || !this.unlockedRegions.includes(regionId)) return null;

        this.currentRegion = region;
        
        if (this.progress[regionId] === undefined) {
            this.progress[regionId] = 0;
        }
        
        let index = battleIndex !== null ? battleIndex : this.progress[regionId];
        if (index < 0 || index >= region.encounters.length) return null;
        
        const mobId = region.encounters[index];
        const baseMob = window.MonsterDatabase.monsters.find(m => m.id === mobId);
        
        if (!baseMob) return null;
        
        const isCampaign = index === this.progress[regionId];
        const level = Math.max(region.minLvl, Math.min(region.maxLvl, window.Engine.randomInt(baseMob.minLvl, baseMob.maxLvl)));
        const scale = Math.max(0.2, 1 + (level - baseMob.minLvl) * 0.1);
        
        // NOVIDADE: Múltiplos inimigos! Se for mapa Bônus e não for o Boss, cria uma Horda de 2 a 5 monstros.
        const hordeSize = (region.isBonus && !baseMob.isBoss) ? window.Engine.randomInt(2, 5) : 1;
        
        const monster = {
            ...baseMob,
            // Altera o nome dinamicamente caso seja mais de 1 inimigo
            name: hordeSize > 1 ? `Horda de ${baseMob.name}s (x${hordeSize})` : baseMob.name,
            instanceId: 'mon_' + Date.now(),
            level: level,
            // Multiplica os status pelo tamanho da horda (com uma leve redução para não dar 'Insta-Kill' no jogador)
            maxHp: Math.floor((baseMob.hp * scale) * (hordeSize * 0.8)),
            hp: Math.floor((baseMob.hp * scale) * (hordeSize * 0.8)),
            dmg: Math.floor((baseMob.dmg * scale) * (hordeSize * 0.7)),
            // Recompensas escalam de acordo com o total de inimigos multiplicados
            xp: Math.floor(baseMob.xp * scale) * hordeSize,
            gold: Math.floor(baseMob.gold * scale) * hordeSize,
            isCampaign: isCampaign,
            regionId: regionId,
            hordeSize: hordeSize
        };
        
        return { type: 'combat', data: monster };
    }
};

window.MapSystem = MapSystem;