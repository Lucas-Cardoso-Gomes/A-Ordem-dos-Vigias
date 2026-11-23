/**
 * monsters.js
 * Database of all monsters, stats, habitats, lore descriptions, elemental resistances,
 * Boss Phase 2 data, and loot tables.
 */

const MonsterDatabase = {
    monsters: [
        // Comuns (Level 1-10)
        {
            id: 'mob1',
            name: 'Goblin',
            type: 'Comum',
            tier: 1,
            minLvl: 1,
            maxLvl: 5,
            hp: 30,
            dmg: 5,
            weakness: [],
            elementalResists: { veneno: 0.15 },
            habitat: 'Floresta dos Vigias e trilhas sombrias',
            desc: 'Saqueadores astutos que atacam em bando para emboscar viajantes distraídos.',
            xp: 10,
            gold: 5,
            dropChance: 10,
            ai: { targetPriority: 'CLOSEST', moveType: 'SWARM' }
        },
        {
            id: 'mob2',
            name: 'Esqueleto',
            type: 'Morto-vivo',
            tier: 1,
            minLvl: 3,
            maxLvl: 8,
            hp: 45,
            dmg: 8,
            weakness: ['machados', 'magia sagrada'],
            elementalResists: { gelo: 0.25, veneno: 0.50 },
            habitat: 'Floresta dos Vigias e Ruínas Esquecidas',
            desc: 'Restos reanimados de antigos soldados que ainda marcham em formação rígida.',
            xp: 15,
            gold: 8,
            dropChance: 15,
            ai: { targetPriority: 'CLOSEST', moveType: 'PHALANX' }
        },
        {
            id: 'mob3',
            name: 'Zumbi',
            type: 'Morto-vivo',
            tier: 1,
            minLvl: 2,
            maxLvl: 7,
            hp: 60,
            dmg: 6,
            weakness: ['fogo', 'magia sagrada'],
            elementalResists: { veneno: 0.40 },
            habitat: 'Floresta Sombria e Caverna dos Ecos',
            desc: 'Cadáveres errantes movidos por magia negra. Lentos, porém extremamente resistentes.',
            xp: 12,
            gold: 6,
            dropChance: 12,
            ai: { targetPriority: 'CLOSEST', moveType: 'ZOMBIE_WALK' }
        },
        {
            id: 'mob4',
            name: 'Aranha Gigante',
            type: 'Besta',
            tier: 1,
            minLvl: 4,
            maxLvl: 10,
            hp: 40,
            dmg: 10,
            weakness: ['fogo'],
            elementalResists: { veneno: 0.50 },
            habitat: 'Matas fechadas e Caverna dos Ecos',
            desc: 'Predadora ágil que mantém distância e dispara teias peçonhentas pelos flancos.',
            xp: 18,
            gold: 10,
            dropChance: 20,
            ai: { targetPriority: 'CLOSEST', moveType: 'KITING_EDGES' }
        },

        // Intermediários (Level 10-40)
        {
            id: 'mob5',
            name: 'Lobisomem',
            type: 'Fera Mágica',
            tier: 2,
            minLvl: 10,
            maxLvl: 25,
            hp: 150,
            dmg: 20,
            weakness: ['prata', 'fogo'],
            elementalResists: { gelo: 0.20, fisico: 0.15 },
            habitat: 'Claras da Floresta e grutas profundas',
            desc: 'Licantropo feroz que caça alvos isolados sob a névoa da noite.',
            xp: 50,
            gold: 25,
            dropChance: 30,
            ai: { targetPriority: 'ISOLATED', moveType: 'ASTAR' }
        },
        {
            id: 'mob6',
            name: 'Vampiro',
            type: 'Morto-vivo',
            tier: 2,
            minLvl: 15,
            maxLvl: 30,
            hp: 200,
            dmg: 25,
            weakness: ['luz sagrada', 'estaca'],
            elementalResists: { trevas: 0.50, gelo: 0.25 },
            habitat: 'Caverna dos Ecos e criptas antigas',
            desc: 'Nobre amaldiçoado que drena o sangue dos vivos e evita a luz consagrada.',
            xp: 70,
            gold: 40,
            dropChance: 35,
            ai: { targetPriority: 'ISOLATED', moveType: 'ASTAR' }
        },
        {
            id: 'mob7',
            name: 'Minotauro',
            type: 'Besta',
            tier: 2,
            minLvl: 25,
            maxLvl: 40,
            hp: 300,
            dmg: 35,
            weakness: ['machados'],
            elementalResists: { fogo: 0.20, fisico: 0.20 },
            habitat: 'Fronteiras da Floresta, Caverna e Ruínas',
            desc: 'Colosso taurino que busca desafiar o guerreiro mais resistente do grupo.',
            xp: 100,
            gold: 50,
            dropChance: 40,
            ai: { targetPriority: 'HIGHEST_DEF_HP', moveType: 'ASTAR' }
        },
        {
            id: 'mob8',
            name: 'Banshee',
            type: 'Fantasma',
            tier: 2,
            minLvl: 20,
            maxLvl: 35,
            hp: 120,
            dmg: 40,
            weakness: ['magia sagrada', 'prata'],
            elementalResists: { fisico: 0.40, gelo: 0.35, trevas: 0.40 },
            habitat: 'Caverna dos Ecos e Ruínas Esquecidas',
            desc: 'Espírito lamentador capaz de atravessar obstáculos sólidos em busca de alvos feridos.',
            xp: 80,
            gold: 30,
            dropChance: 35,
            ai: { targetPriority: 'LOWEST_HP', moveType: 'ETHEREAL' }
        },

        // Avançados (Level 40-80)
        {
            id: 'mob9',
            name: 'Cérbero',
            type: 'Demônio',
            tier: 3,
            minLvl: 40,
            maxLvl: 60,
            hp: 600,
            dmg: 60,
            weakness: ['gelo', 'magia divina'],
            elementalResists: { fogo: 0.60, trevas: 0.30 },
            habitat: 'Ruínas Esquecidas e Pico Vulcânico',
            desc: 'Cão infernal de três cabeças cuja mordida irradia calor abissal.',
            xp: 250,
            gold: 120,
            dropChance: 50,
            ai: { targetPriority: 'HIGHEST_DEF_HP', moveType: 'ASTAR' }
        },
        {
            id: 'mob10',
            name: 'Hidra',
            type: 'Besta Mítica',
            tier: 3,
            minLvl: 50,
            maxLvl: 70,
            hp: 800,
            dmg: 70,
            weakness: ['fogo'],
            elementalResists: { veneno: 0.60, gelo: 0.25 },
            habitat: 'Santuários submersos e encostas vulcânicas',
            desc: 'Serpente ancestral de múltiplas cabeças cujo sangue venenoso corrói armaduras.',
            xp: 350,
            gold: 150,
            dropChance: 55,
            ai: { targetPriority: 'CLOSEST', moveType: 'ASTAR' }
        },
        {
            id: 'mob11',
            name: 'Demônio Inferior',
            type: 'Demônio',
            tier: 3,
            minLvl: 60,
            maxLvl: 80,
            hp: 1000,
            dmg: 90,
            weakness: ['magia divina', 'luz sagrada'],
            elementalResists: { fogo: 0.50, trevas: 0.50 },
            habitat: 'Pico Vulcânico e fendas do Abismo',
            desc: 'Invasor profano que caça conjuradores desprotegidos com crueldade implacável.',
            xp: 500,
            gold: 200,
            dropChance: 60,
            ai: { targetPriority: 'MAGE_OR_LOWEST_DEF', moveType: 'ASTAR' }
        },

        // Chefes (Level 80-100+)
        {
            id: 'boss1',
            name: 'Rei Vampiro',
            type: 'Chefe Morto-vivo',
            tier: 4,
            minLvl: 80,
            maxLvl: 90,
            hp: 3000,
            dmg: 150,
            weakness: ['luz sagrada', 'estaca'],
            elementalResists: { trevas: 0.65, gelo: 0.35, veneno: 0.50 },
            habitat: 'Câmara Profunda da Caverna dos Ecos',
            desc: 'Soberano imortal das legiões noturnas. Domina o sangue e as sombras ancestrais.',
            phase2Name: 'Rei Vampiro — Soberano Carmesim',
            phase2Dialogue: '"O sangue antigo desperta em minhas veias! Vocês jamais verão o amanhecer!"',
            phase2DmgMult: 1.35,
            phase2Skill: {
                name: 'Tempestade Carmesim',
                element: 'trevas',
                statusEffect: 'bleed',
                statusDuration: 3,
                isAoE: true,
                dmgMult: 1.4,
                desc: 'Explosão de névoa sangrenta que drena e provoca Sangramento no grupo.'
            },
            xp: 2000,
            gold: 1000,
            dropChance: 100,
            isBoss: true,
            ai: { targetPriority: 'ISOLATED', moveType: 'ASTAR' }
        },
        {
            id: 'boss2',
            name: 'Dragão Negro',
            type: 'Chefe Dragão',
            tier: 4,
            minLvl: 90,
            maxLvl: 100,
            hp: 5000,
            dmg: 250,
            weakness: ['armas lendárias', 'gelo'],
            elementalResists: { fogo: 0.80, raio: 0.30, veneno: 0.40 },
            habitat: 'Cratera do Pico Vulcânico',
            desc: 'Wyrm colosal de escamas obsidianas cujo sopro derrete fortalezas inteiras.',
            phase2Name: 'Dragão Negro — Fúria Obsidiana',
            phase2Dialogue: '"A montanha treme sob minhas asas! Reduzirei a Ordem a cinzas eternas!"',
            phase2DmgMult: 1.40,
            phase2Skill: {
                name: 'Sopro do Cataclismo',
                element: 'fogo',
                statusEffect: 'burn',
                statusDuration: 3,
                isAoE: true,
                dmgMult: 1.5,
                desc: 'Rajada de chamas vulcânicas que incendeia o campo de batalha.'
            },
            xp: 5000,
            gold: 3000,
            dropChance: 100,
            isBoss: true,
            ai: { targetPriority: 'CLOSEST', moveType: 'ASTAR' }
        },
        {
            id: 'boss3',
            name: 'Lorde Supremo do Caos',
            type: 'Chefe do Vazio',
            tier: 4,
            minLvl: 95,
            maxLvl: 120,
            hp: 6500,
            dmg: 320,
            weakness: ['luz sagrada'],
            elementalResists: { trevas: 0.75, arcano: 0.45, fogo: 0.35, raio: 0.35 },
            habitat: 'Trono do Abismo do Caos',
            desc: 'Entidade primordial que corrompe as cinco terras. Apenas o poder das Relíquias pode detê-lo.',
            phase2Name: 'Lorde Supremo do Caos — Avatar do Vazio',
            phase2Dialogue: '"Realidade e tempo se curvam ao meu trono! Contemplem o fim de toda luz!"',
            phase2DmgMult: 1.50,
            phase2Skill: {
                name: 'Ruptura do Abismo',
                element: 'trevas',
                statusEffect: 'shock',
                statusDuration: 3,
                isAoE: true,
                dmgMult: 1.6,
                desc: 'Rasga o vazio dimensional, eletrocutando os heróis e gerando zonas de caos.'
            },
            xp: 8000,
            gold: 5000,
            dropChance: 100,
            isBoss: true,
            ai: { targetPriority: 'LOWEST_HP', moveType: 'ASTAR' }
        }
    ],

    generateMonster(regionLevelMin, regionLevelMax, isBoss = false) {
        const eng = (typeof Engine !== 'undefined' ? Engine : (typeof window !== 'undefined' ? window.Engine : null));
        const randInt = eng?.randomInt || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);

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
        const level = Math.max(regionLevelMin, Math.min(regionLevelMax, randInt(base.minLvl, base.maxLvl)));

        // Scale stats by level diff
        const scale = Math.max(0.2, 1 + (level - base.minLvl) * 0.1);

        return {
            ...base,
            instanceId: 'mon_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            level: level,
            maxHp: Math.floor(base.hp * scale),
            hp: Math.floor(base.hp * scale),
            dmg: Math.floor(base.dmg * scale),
            xp: Math.floor(base.xp * scale),
            gold: Math.floor(base.gold * scale),
            phase: 1,
            phase2Triggered: false,
            statusEffects: []
        };
    },

    getLoot(monster) {
        const eng = (typeof Engine !== 'undefined' ? Engine : (typeof window !== 'undefined' ? window.Engine : null));
        const randChance = eng?.randomChance || ((pct) => Math.random() * 100 <= pct);
        const itemDb = (typeof ItemDatabase !== 'undefined' ? ItemDatabase : (typeof window !== 'undefined' ? window.ItemDatabase : null));

        let loot = {
            gold: monster.gold || 0,
            xp: monster.xp || 0,
            items: []
        };

        if (!itemDb) return loot;

        // Material drops
        if (randChance(70)) {
            let matId = 'm1'; // Ossos default
            const mType = monster.type || '';
            if (mType.includes('Morto-vivo')) matId = 'm1';
            else if (mType.includes('Fera')) matId = 'm2'; // Couro
            else if (monster.id === 'mob7') matId = 'm6'; // Chifre Minotauro
            else if (monster.id === 'boss2') matId = 'm4'; // Escamas
            else if (monster.id === 'mob6' || monster.isBoss) matId = 'm5'; // Sangue Vamp
            else if (monster.tier === 3) {
                matId = randChance(50) ? 'm7' : (randChance(50) ? 'm8' : 'm9');
            } else if (mType === 'Comum') {
                matId = randChance(50) ? 'm10' : 'm1';
            }

            loot.items.push(itemDb.getMaterial(matId));
        }

        // Equipment drop
        if (randChance(monster.dropChance || 0)) {
            let forcedRarity = null;
            if (monster.isBoss) {
                forcedRarity = randChance(20) ? 'mitico' : 'lendario';
            } else if (monster.tier === 3) {
                forcedRarity = randChance(10) ? 'lendario' : 'epico';
            } else if (monster.tier === 2) {
                forcedRarity = randChance(10) ? 'epico' : 'raro';
            }

            loot.items.push(itemDb.generateItem(monster.level || 1, forcedRarity));

            // Small chance for a secondary item drop for bosses
            if (monster.isBoss && randChance(30)) {
                loot.items.push(itemDb.generateItem(monster.level || 1, 'epico'));
            }
        }

        // Potion drop
        if (randChance(20)) {
            if ((monster.level || 1) >= 40) {
                loot.items.push(itemDb.getPotion(randChance(50) ? 'p4' : 'p5'));
            } else {
                loot.items.push(itemDb.getPotion(randChance(50) ? 'p1' : 'p2'));
            }
        }

        return loot;
    }
};

if (typeof window !== 'undefined') {
    window.MonsterDatabase = MonsterDatabase;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MonsterDatabase;
}
