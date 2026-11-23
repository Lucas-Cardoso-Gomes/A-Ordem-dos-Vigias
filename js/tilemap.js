/**
 * tilemap.js
 * Comprehensive multi-map world system for Aegis Nocturna:
 * - 5 progression maps connected exclusively by walkable portals:
 *   1. Floresta dos Vigias (Base / Cidade / Acampamento seguro)
 *   2. Caverna dos Ecos (Linear, debuff de visão, inimigos com visão no escuro)
 *   3. Ruínas Esquecidas (Salões ancestrais com colunas e guardiões de elite)
 *   4. Pico Vulcânico (Rios de magma com ponte sólida contínua e Dragão Negro)
 *   5. Abismo do Caos (Dimensão sombria e Lorde Supremo do Caos)
 * - Map-specific enemy level scaling relative to party level:
 *   * Mapa 1: Até 5 níveis a menos do player [P - 5, P]
 *   * Mapa 2: Nível do player [P - 1, P + 1]
 *   * Mapa 3: Até 5 níveis acima do player [P, P + 5]
 *   * Mapa 4: Até 10 níveis acima do player [P + 3, P + 10]
 *   * Mapa 5: Até 20 níveis acima do player [P + 8, P + 20]
 * - Respawn roll on entering a map:
 *   * Mapa 1: 10% | Mapa 2: 20% | Mapa 3: 40% | Mapa 4: 60% | Mapa 5: 75%
 * - Base Camp & Resting (Only in Floresta Base):
 *   * 2 Descansos Rápidos (Cura 25% a 50% HP e 50% Mana, inimigos não respawnam)
 *   * Descanso Longo (Cura 100% HP/MP, recupera cargas, mas TODOS os inimigos do mundo renascem)
 * - Walk-only transitions: teleports disabled, players must walk through map portals.
 */

const RESPAWN_CHANCES = {
    floresta: 0.10,
    caverna:  0.20,
    ruinas:   0.40,
    vulcao:   0.60,
    abismo:   0.75
};

const MAP_DEFINITIONS = {
    floresta: {
        id: 'floresta',
        name: 'Floresta dos Vigias (Base)',
        desc: 'Base principal da Ordem dos Vigias. Aqui você pode descansar no acampamento e acessar a Loja e a Forja.',
        theme: 'forest',
        width: 36,
        height: 20,
        visionRadius: 5,
        hasExplorationDebuff: false,
        enemiesSeePlayerInDark: false,
        spawnX: 2,
        spawnY: 2,
        camp: { x: 2, y: 2, name: 'Acampamento de Alvorada (Base)' },
        layout: [
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
            "T..T...R....T....T....R...T...R...ET",
            "T.C..TT...T....T....T...T...T...T..T",
            "T.P..T...R..WWTWW..T...R....TT.....T",
            "T.PP..T....WW.B.WW....T...T....T.R.T",
            "T..PPP.T..WW..B..WW..T...R...T...T.T",
            "T...PPPP.WW...B...WW..T....T...T...T",
            "T.T..PPPWW....B....WW..TT...R....T.T",
            "T..R...PWW....B....WW....T....T....T",
            "T.....PPPP....B....WW..T...T....T..T",
            "T..T.P...WW...B...WW....R....T....TT",
            "T...P..T..WW..B..WW..T....T....T...T",
            "T..P..R....WWTWW..T....T....R....T.T",
            "T.P...T..T...T....T..R....T....T...T",
            "T..P...T....T...T...T...T....T...T.T",
            "T.T.P...R..T...R.....T....R....T...T",
            "T..T.P...T....T...T....T....T....T.T",
            "T.....P....R....T...R....T....T....T",
            "T..R...PPPPPPPPPPPPPPPPPPPPPPPPP..ET",
            "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
        ],
        portals: [
            { x: 34, y: 1, targetMap: 'caverna', targetX: 2, targetY: 1, name: 'Entrada da Caverna dos Ecos' },
            { x: 34, y: 18, targetMap: 'caverna', targetX: 2, targetY: 1, name: 'Entrada da Caverna dos Ecos' }
        ],
        enemies: [
            { id: 'flo_1', x: 8, y: 4, baseMobId: 'mob1', name: 'Bando Goblin', icon: '👺' },
            { id: 'flo_2', x: 14, y: 8, baseMobId: 'mob4', name: 'Aranha da Mata', icon: '🕷️' },
            { id: 'flo_3', x: 20, y: 10, baseMobId: 'mob2', name: 'Sentinela Esqueleto', icon: '💀' },
            { id: 'flo_4', x: 26, y: 6, baseMobId: 'mob5', name: 'Lobisomem Feroz', icon: '🐺' },
            { id: 'flo_5', x: 25, y: 14, baseMobId: 'mob3', name: 'Zumbis da Floresta', icon: '🧟' },
            { id: 'flo_6', x: 30, y: 10, baseMobId: 'mob7', name: 'Minotauro Errante', icon: '🐂' }
        ],
        npcs: [
            {
                id: 'npc_comandante',
                role: 'comandante',
                name: 'Comandante Valerius',
                icon: '🎖️',
                x: 3,
                y: 2,
                dialogue: 'Saudações, Vigia! O Acampamento de Alvorada é nosso último bastião. Recrute aliados para sua companhia e cumpra os Contratos da Ordem antes de avançar para a Caverna.',
                actions: [
                    { label: '📜 Contratos', actionType: 'contracts' },
                    { label: '🤝 Recrutar Aliado', actionType: 'recruit' },
                    { label: '💡 Dicas Táticas', actionType: 'tips', tipText: 'Dica do Comandante: Use ataques do mesmo elemento após aplicar Veneno, Gelo ou Queimadura para detonar Reações Elementais devastadoras! Acumule 100 de Fúria para liberar seu Supremo.' }
                ]
            },
            {
                id: 'npc_ferreiro',
                role: 'ferreiro',
                name: 'Ferreiro Borin',
                icon: '🔨',
                x: 4,
                y: 3,
                dialogue: 'O aço da Ordem não se forja sozinho! Traga ossos, couro e minérios de batalha para forjar armas e refinar seu equipamento até +10.',
                actions: [
                    { label: '🔨 Abrir Forja', actionType: 'forge' }
                ]
            },
            {
                id: 'npc_mercadora',
                role: 'mercadora',
                name: 'Mercadora Lyra',
                icon: '🛒',
                x: 1,
                y: 4,
                dialogue: 'Suprimentos frescos, poções de cura e antídotos para quem ousa enfrentar as sombras! Sempre estoque poções antes de partir.',
                actions: [
                    { label: '🛒 Abrir Loja', actionType: 'shop' }
                ]
            },
            {
                id: 'npc_guia',
                role: 'guia',
                name: 'Guia da Floresta',
                icon: '🧭',
                x: 12,
                y: 18,
                dialogue: 'Recruta! Bem-vindo à Floresta dos Vigias. Apenas os mais corajosos sobrevivem aqui. Siga para Alvorada se precisar de descanso ou siga ao leste rumo à Caverna dos Ecos.'
            }
        ],
        chests: [
            { id: 'chest_flo_1', name: 'Baú da Patrulha', x: 13, y: 16, gold: 80, minLvl: 2, rarity: 'incomum', potionId: 'p1', materialId: 'm10', materialQty: 2 },
            { id: 'chest_flo_2', name: 'Baú do Batedor', x: 29, y: 7, gold: 140, minLvl: 4, rarity: 'raro', potionId: 'p2', materialId: 'm2', materialQty: 3 }
        ],
        shrines: [
            { id: 'shrine_flo_1', name: 'Altar da Alvorada', x: 16, y: 8, effectType: 'dawn', desc: 'Uma luz dourada envolve o grupo, restaurando 50% de HP/Mana e concedendo experiência.' }
        ]
    },
    caverna: {
        id: 'caverna',
        name: 'Caverna dos Ecos (Linear)',
        desc: 'Caverna escura com debuff de visão. O caminho é linear através da rocha sólida, mas os monstros enxergam através das trevas!',
        theme: 'cave',
        width: 38,
        height: 14,
        visionRadius: 2, // DEBUFF DE EXPLORAÇÃO!
        hasExplorationDebuff: true,
        enemiesSeePlayerInDark: true, // INIMIGOS CONSEGUEM VER O PLAYER!
        spawnX: 2,
        spawnY: 1,
        camp: null,
        layout: [
            "######################################",
            "#E..................................##",
            "#..###############################..##",
            "#..##...........................##..##",
            "#..##..#######################..##..##",
            "#..##..##...................##..##..##",
            "#..##..##..###############..##..##..##",
            "#..##..##..##...........##..##..##..##",
            "#..##..##..##..#######..##..##..##..##",
            "#..##..##..##..##...##..##..##..##..##",
            "#..##..##..##..##...##..##..##..##..##",
            "#..##..##..##..#######..##..##..##..##",
            "#..................................E##",
            "######################################"
        ],
        portals: [
            { x: 1, y: 1, targetMap: 'floresta', targetX: 33, targetY: 1, name: 'Retornar para a Floresta (Base)' },
            { x: 35, y: 12, targetMap: 'ruinas', targetX: 2, targetY: 8, name: 'Entrada das Ruínas Esquecidas' }
        ],
        enemies: [
            { id: 'cav_1', x: 10, y: 1, baseMobId: 'mob4', name: 'Aranha Venenosa', icon: '🕷️' },
            { id: 'cav_2', x: 20, y: 1, baseMobId: 'mob3', name: 'Zumbi Subterrâneo', icon: '🧟' },
            { id: 'cav_3', x: 30, y: 1, baseMobId: 'mob6', name: 'Vampiro Espreitador', icon: '🧛' },
            { id: 'cav_4', x: 34, y: 3, baseMobId: 'mob8', name: 'Banshee Sussurrante', icon: '👻' },
            { id: 'cav_5', x: 20, y: 5, baseMobId: 'mob5', name: 'Fera das Sombras', icon: '🐺' },
            { id: 'cav_6', x: 10, y: 7, baseMobId: 'mob7', name: 'Guardião Troglodita', icon: '🐂' },
            { id: 'cav_7', x: 25, y: 12, baseMobId: 'mob8', name: 'Aparição Maldita', icon: '👻' },
            { id: 'cav_8', x: 32, y: 12, baseMobId: 'boss1', name: 'Lorde Vampiro da Caverna', icon: '👑', isBoss: true }
        ],
        npcs: [
            {
                id: 'npc_eremita',
                role: 'eremita',
                name: 'Eremita das Sombras',
                icon: '🧙',
                x: 5,
                y: 3,
                dialogue: 'Cuidado, viajante... A névoa desta caverna cega tochas comuns, mas os monstros farejam no escuro. Busque o Santuário da Lanterna no coração do labirinto e leve Luz Sagrada contra o Lorde Vampiro!'
            }
        ],
        chests: [
            { id: 'chest_cav_1', name: 'Baú Subterrâneo', x: 18, y: 5, gold: 220, minLvl: 10, rarity: 'raro', potionId: 'p4', materialId: 'm5', materialQty: 2 },
            { id: 'chest_cav_2', name: 'Baú das Profundezas', x: 21, y: 12, gold: 320, minLvl: 14, rarity: 'epico', potionId: 'p5', materialId: 'm8', materialQty: 1 }
        ],
        shrines: [
            { id: 'shrine_cav_1', name: 'Santuário da Lanterna', x: 14, y: 7, effectType: 'lantern', desc: 'Uma chama espectral dissipa a escuridão da caverna, revelando passagens distantes e restaurando 100% de Mana do grupo!' }
        ]
    },
    ruinas: {
        id: 'ruinas',
        name: 'Ruínas Esquecidas',
        desc: 'Santuário milenar de pedra com colunas partidas e câmaras ancestrais habitadas por guardiões de elite.',
        theme: 'ruins',
        width: 34,
        height: 18,
        visionRadius: 4,
        hasExplorationDebuff: false,
        enemiesSeePlayerInDark: false,
        spawnX: 2,
        spawnY: 8,
        camp: null,
        layout: [
            "##################################",
            "#E......O.......#.......O.......##",
            "#.#####...#####.#.#####...####..##",
            "#.#...#...#...#.#.#...#...#..#..##",
            "#.#.O.#...#.O.#.#.#.O.#...#O.#..##",
            "#.#...#...#...#.#.#...#...#..#..##",
            "#.#####...#####.P.#####...####..##",
            "#.......O.......P.......O.......##",
            "#E.PPPPPPPPPPPPPPPPPPPPPPPPPPPPPE#",
            "#.......O.......P.......O.......##",
            "#.#####...#####.P.#####...####..##",
            "#.#...#...#...#.#.#...#...#..#..##",
            "#.#.O.#...#.O.#.#.#.O.#...#O.#..##",
            "#.#...#...#...#.#.#...#...#..#..##",
            "#.#####...#####.#.#####...####..##",
            "#.......O.......#.......O.......##",
            "#...............#...............##",
            "##################################"
        ],
        portals: [
            { x: 1, y: 8, targetMap: 'caverna', targetX: 34, targetY: 12, name: 'Retornar para a Caverna' },
            { x: 32, y: 8, targetMap: 'vulcao', targetX: 2, targetY: 8, name: 'Passagem para o Pico Vulcânico' }
        ],
        enemies: [
            { id: 'rui_1', x: 8, y: 8, baseMobId: 'mob2', name: 'Esqueleto Templário', icon: '💀' },
            { id: 'rui_2', x: 9, y: 4, baseMobId: 'mob7', name: 'Minotauro Guerreiro', icon: '🐂' },
            { id: 'rui_3', x: 9, y: 12, baseMobId: 'mob9', name: 'Cérbero Guardião', icon: '🐕' },
            { id: 'rui_4', x: 20, y: 8, baseMobId: 'mob8', name: 'Banshee das Criptas', icon: '👻' },
            { id: 'rui_5', x: 23, y: 4, baseMobId: 'mob11', name: 'Demônio Guardião', icon: '😈' },
            { id: 'rui_6', x: 23, y: 12, baseMobId: 'mob10', name: 'Hidra Ancestral', icon: '🐉' }
        ],
        npcs: [
            {
                id: 'npc_arquivista',
                role: 'arquivista',
                name: 'Espectro do Arquivista',
                icon: '📜',
                x: 4,
                y: 7,
                dialogue: 'Estes salões guardavam a Coroa dos Ancestrais. Agora, a Hidra Ancestral guarda a câmara sul-oriental — apenas fogo detém sua regeneração. Procure o Santuário da Sabedoria entre as colunas.'
            }
        ],
        chests: [
            { id: 'chest_rui_1', name: 'Baú dos Ancestrais', x: 10, y: 1, gold: 450, minLvl: 25, rarity: 'epico', potionId: 'p4', materialId: 'm9', materialQty: 2 },
            { id: 'chest_rui_2', name: 'Cofre Rúnico', x: 27, y: 15, gold: 650, minLvl: 32, rarity: 'epico', potionId: 'p6', materialId: 'm8', materialQty: 2 }
        ],
        shrines: [
            { id: 'shrine_rui_1', name: 'Santuário da Sabedoria', x: 17, y: 12, effectType: 'wisdom', desc: 'Runas antigas iluminam a mente dos Vigias, concedendo bônus de Experiência e curando 60% de HP e Mana!' }
        ]
    },
    vulcao: {
        id: 'vulcao',
        name: 'Pico Vulcânico',
        desc: 'Cume incandescente cortado por rios de magma. A ponte de pedra permite cruzar o abismo até o covil do Dragão.',
        theme: 'volcano',
        width: 34,
        height: 18,
        visionRadius: 4,
        hasExplorationDebuff: false,
        enemiesSeePlayerInDark: false,
        spawnX: 2,
        spawnY: 8,
        camp: null,
        layout: [
            "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
            "#E.....R....LLLLLLL....R........##",
            "#.RRR....R..LLLLLLL..R...RRRR...##",
            "#...R..R....LLLLLLL....R...R....##",
            "#.R...R...R.LLLLLLL.R....R...R..##",
            "#..R....R...LLLLLLL...R....R....##",
            "#....R......LLLLLLL.....R.......##",
            "#.RR...R....BBBBBBB...R....RR...##",
            "#E.PPPPPPPPPBBBBBBBPPPPPPPPPPPPPE#",
            "#...R.......BBBBBBB.....R.......##",
            "#.R...R...R.LLLLLLL.R....R...R..##",
            "#..R....R...LLLLLLL...R....R....##",
            "#....R......LLLLLLL.....R.......##",
            "#.RR...R....LLLLLLL...R....RR...##",
            "#...R....R..LLLLLLL..R...R...R..##",
            "#.R...R.....LLLLLLL....R...R....##",
            "#........R..LLLLLLL.............##",
            "RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR"
        ],
        portals: [
            { x: 1, y: 8, targetMap: 'ruinas', targetX: 31, targetY: 8, name: 'Retornar às Ruínas' },
            { x: 32, y: 8, targetMap: 'abismo', targetX: 2, targetY: 8, name: 'Portal para o Abismo do Caos' }
        ],
        enemies: [
            { id: 'vol_1', x: 8, y: 8, baseMobId: 'mob9', name: 'Cérbero Ígneo', icon: '🔥' },
            { id: 'vol_2', x: 8, y: 4, baseMobId: 'mob10', name: 'Hidra de Magma', icon: '🐉' },
            { id: 'vol_3', x: 9, y: 13, baseMobId: 'mob11', name: 'Lorde Demônio', icon: '👿' },
            { id: 'vol_4', x: 24, y: 5, baseMobId: 'mob9', name: 'Cérbero Vulcânico', icon: '🔥' },
            { id: 'vol_5', x: 24, y: 8, baseMobId: 'mob11', name: 'Arquidemônio', icon: '😈' },
            { id: 'vol_6', x: 27, y: 12, baseMobId: 'boss2', name: 'Dragão Negro Vulcânico', icon: '🐲', isBoss: true }
        ],
        npcs: [
            {
                id: 'npc_forjador',
                role: 'forjador',
                name: 'Forjador de Cinzas',
                icon: '⚒️',
                x: 5,
                y: 7,
                dialogue: 'Atravessar a ponte de pedra sobre o magma exige aço temperado e gelo arcano! O Dragão Negro Vulcânico teme o frio e armas lendárias — receba a bênção do Santuário da Chama antes de enfrentá-lo.'
            }
        ],
        chests: [
            { id: 'chest_vol_1', name: 'Baú de Obsidiana', x: 8, y: 16, gold: 1000, minLvl: 45, rarity: 'lendario', potionId: 'p4', materialId: 'm4', materialQty: 3 },
            { id: 'chest_vol_2', name: 'Tesouro Dracônico', x: 28, y: 5, gold: 1500, minLvl: 60, rarity: 'lendario', potionId: 'p7', materialId: 'm7', materialQty: 2 }
        ],
        shrines: [
            { id: 'shrine_vol_1', name: 'Santuário da Chama Eterna', x: 23, y: 10, effectType: 'flame', desc: 'O fogo primordial fortalece a Ordem! Concede Bênção de Ataque, Escudo protetor e restaura 75% de HP.' }
        ]
    },
    abismo: {
        id: 'abismo',
        name: 'Abismo do Caos',
        desc: 'Dimensão corrompida do vazio cósmico. O Lorde Supremo do Caos aguarda em seu trono ancestral.',
        theme: 'abyss',
        width: 34,
        height: 18,
        visionRadius: 3,
        hasExplorationDebuff: true,
        enemiesSeePlayerInDark: true,
        spawnX: 2,
        spawnY: 8,
        camp: null,
        layout: [
            "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "X#E......O......#.......O.......#X",
            "X#.#####...#####.#######...####.#X",
            "X#.#...#...#...#.#.....#...#..#.#X",
            "X#.#.O.#...#.O.#.#..O..#...#O.#.#X",
            "X#.#...#...#...#.#.....#...#..#.#X",
            "X#.#####...#####.B.#####...####.#X",
            "X#.......O.......B.......O......#X",
            "X#E.PPPPPPPPPPPPPBPPPPPPPPPP...E#X",
            "X#.......O.......B.......O......#X",
            "X#.#####...#####.B.#####...####.#X",
            "X#.#...#...#...#.#.....#...#..#.#X",
            "X#.#.O.#...#.O.#.#..O..#...#O.#.#X",
            "X#.#...#...#...#.#.....#...#..#.#X",
            "X#.#####...#####.#######...####.#X",
            "X#.......O..............O.......#X",
            "X#...............#..............#X",
            "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        ],
        portals: [
            { x: 1, y: 8, targetMap: 'vulcao', targetX: 31, targetY: 8, name: 'Retornar ao Pico Vulcânico' }
        ],
        enemies: [
            { id: 'abi_1', x: 8, y: 8, baseMobId: 'mob11', name: 'Espectro do Caos', icon: '🟣' },
            { id: 'abi_2', x: 14, y: 4, baseMobId: 'mob9', name: 'Horror Abissal', icon: '👁️' },
            { id: 'abi_3', x: 14, y: 12, baseMobId: 'mob10', name: 'Demônio do Vazio', icon: '👾' },
            { id: 'abi_4', x: 22, y: 8, baseMobId: 'mob11', name: 'Titã das Sombras', icon: '👿' },
            { id: 'abi_5', x: 28, y: 8, baseMobId: 'boss3', name: 'Lorde Supremo do Caos', icon: '👑', isBoss: true }
        ],
        npcs: [
            {
                id: 'npc_oraculo',
                role: 'oraculo',
                name: 'Oráculo do Vazio',
                icon: '🔮',
                x: 3,
                y: 7,
                dialogue: 'Vocês chegaram ao limiar do Abismo. Antes da câmara do Lorde Supremo do Caos, consagrem-se no Santuário da Ordem para restaurar toda a força e despertar sua Fúria!'
            }
        ],
        chests: [
            { id: 'chest_abi_1', name: 'Baú Astral', x: 14, y: 1, gold: 2200, minLvl: 75, rarity: 'lendario', potionId: 'p6', materialId: 'm9', materialQty: 3 },
            { id: 'chest_abi_2', name: 'Relicário do Caos', x: 25, y: 13, gold: 3500, minLvl: 85, rarity: 'mitico', potionId: 'p7', materialId: 'm7', materialQty: 3 }
        ],
        shrines: [
            { id: 'shrine_abi_1', name: 'Santuário da Ordem', x: 24, y: 9, effectType: 'order', desc: 'A última chama da Ordem restaura 100% de HP e Mana, purifica males e concede +50 de Fúria para a batalha final!' }
        ]
    }
};

const MAP_GUARDIAN_RELICS = {
    flo_6: 'relic_floresta',
    cav_8: 'relic_caverna',
    rui_6: 'relic_ruinas',
    vol_6: 'relic_vulcao',
    abi_5: 'relic_abismo'
};

class TileMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        // Active Map State
        this.currentMapId = 'floresta';
        this.currentMap   = MAP_DEFINITIONS.floresta;

        this.mapWidth  = this.currentMap.width;
        this.mapHeight = this.currentMap.height;

        this._objects = [];
        this._objectsManuallySet = false;

        // Quick Rests Remaining: max 2
        this.quickRestsRemaining = 2;

        // Chest & Shrine local fallback tracking (persisted in GameMechanics.state when available)
        this.openedChests = new Set();
        this.usedShrines = new Set();

        // Optional 3D WorldExplorer instance & active NPC 3D portrait
        this.explorer3D = null;
        this._activeNpcPortrait = null;

        // Ambient particles buffer
        this._ambientParticles = [];
        this._ambientTheme = null;

        // Stationary Enemies registry per map
        this.enemiesByMap = {};
        this._initAllMapEnemies();

        // Fog of War per map ("x,y" strings)
        this.revealedByMap = {
            floresta: new Set(),
            caverna:  new Set(),
            ruinas:   new Set(),
            vulcao:   new Set(),
            abismo:   new Set()
        };
        this.revealed = this.revealedByMap.floresta;

        // Reveal Flash Animation ("x,y" -> timestamp)
        this.revealFlashes = new Map();
        this.flashDuration = 400; // ms

        // Rendering params
        this.tileSize   = 20;
        this.camX       = 0;
        this.camY       = 0;
        this.viewTilesX = 36;
        this.viewTilesY = 20;

        // Player position (tile coords) & smooth render coords
        this.playerX = this.currentMap.spawnX;
        this.playerY = this.currentMap.spawnY;
        this.renderX = this.playerX;
        this.renderY = this.playerY;

        // Dragging & Interaction
        this._dragging   = false;
        this._hasDragged = false;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._camStartX  = 0;
        this._camStartY  = 0;

        this.activeCombatEnemy = null;
        this._dirty = true;

        this._bindEvents();
        this._resizeCanvas();

        // Initial reveal around player
        this.reveal(this.playerX, this.playerY, this.getEffectiveVisionRadius(), false);
        this._centerCamOn(this.playerX, this.playerY);

        // Subscribe to combatEnded to mark enemies defeated & grant relics
        const eng = this._getEngine();
        if (eng && typeof eng.on === 'function') {
            eng.on('combatEnded', (victory) => {
                if (victory && this.activeCombatEnemy) {
                    this.handleEnemyDefeated(this.activeCombatEnemy);
                    this.activeCombatEnemy = null;
                    this._dirty = true;
                    this.updateHUD();
                    this.draw();
                    this.explorer3D?.syncFromTileMap?.();
                    if (typeof window !== 'undefined' && window.game) window.game.save();
                } else {
                    this.activeCombatEnemy = null;
                }
            });
        }

        // Optional legacy JSON loader for tests/backwards compatibility
        this.loadMap('assets/maps/world.json');
    }

    _getEngine() {
        if (typeof Engine !== 'undefined') return Engine;
        if (typeof window !== 'undefined' && window.Engine) return window.Engine;
        return null;
    }

    _getGameMechanics() {
        return (typeof window !== 'undefined' && window.GameMechanics) ? window.GameMechanics : null;
    }

    getEffectiveVisionRadius() {
        const base = this.currentMap ? (this.currentMap.visionRadius || 4) : 4;
        const gm = this._getGameMechanics();
        if (!gm) return base;
        let bonus = 0;
        if (typeof gm.getPartyBonuses === 'function') {
            const bonuses = gm.getPartyBonuses() || {};
            if (typeof bonuses.visionBonus === 'number') {
                bonus = bonuses.visionBonus;
            } else if (typeof bonuses.vision === 'number') {
                bonus = bonuses.vision;
            } else if (typeof gm.hasRelic === 'function' && gm.hasRelic('relic_caverna')) {
                bonus = 2;
            }
        } else if (typeof gm.hasRelic === 'function' && gm.hasRelic('relic_caverna')) {
            bonus = 2;
        }
        return base + bonus;
    }

    handleEnemyDefeated(enemy) {
        if (!enemy) return;
        enemy.defeated = true;
        const eng = this._getEngine();
        if (eng) {
            eng.emit('systemLog', `🏆 Inimigo ${enemy.name} foi derrotado!`);
        }

        const relicId = MAP_GUARDIAN_RELICS[enemy.id];
        if (relicId) {
            const gm = this._getGameMechanics();
            if (gm && typeof gm.grantRelic === 'function') {
                gm.grantRelic(relicId);
            }
            if (typeof window !== 'undefined' && window.gameAudio?.play) {
                window.gameAudio.play('relic');
            }
            if (relicId === 'relic_caverna') {
                this.reveal(this.playerX, this.playerY, this.getEffectiveVisionRadius(), true);
            }
            if (enemy.id === 'abi_5' && eng) {
                eng.emit('campaignVictory', {
                    enemyId: enemy.id,
                    relicId: relicId,
                    relics: gm?.state?.relics || [],
                    stats: gm?.state?.stats || {},
                    ngPlusLevel: gm?.state?.ngPlusLevel || 0
                });
            }
        }
    }

    static get MAPS() {
        return MAP_DEFINITIONS;
    }

    static get RESPAWN_CHANCES() {
        return RESPAWN_CHANCES;
    }

    get objects() {
        return this._objects || [];
    }

    set objects(val) {
        this._objects = val;
        this._objectsManuallySet = true;
    }

    // ---------------------------------------------------------
    // Map & Enemies Initialization
    // ---------------------------------------------------------
    _initAllMapEnemies() {
        for (const [mapId, def] of Object.entries(MAP_DEFINITIONS)) {
            if (!this.enemiesByMap[mapId]) {
                this.enemiesByMap[mapId] = (def.enemies || []).map(e => ({
                    ...e,
                    mapId: mapId,
                    level: this.getEnemyLevelForMap(mapId),
                    revealed: false,
                    defeated: false
                }));
            }
        }
    }

    // ---------------------------------------------------------
    // Level Scaling Logic per Map
    // ---------------------------------------------------------
    getGroupLevel() {
        const party = (typeof window !== 'undefined' && window.gameParty) || [];
        if (!party || !party.length) return 1;
        const total = party.reduce((sum, p) => sum + (p.level || 1), 0);
        return Math.max(1, Math.round(total / party.length));
    }

    getEnemyLevelForMap(mapId) {
        const groupLvl = this.getGroupLevel();
        let minLvl, maxLvl;

        switch (mapId) {
            case 'floresta':
                // Mapa 1: Inimigos mais fáceis, até 5 lvl menos do player
                minLvl = Math.max(1, groupLvl - 5);
                maxLvl = Math.max(1, groupLvl);
                break;
            case 'caverna':
                // Mapa 2: Inimigos fáceis, nível do player
                minLvl = Math.max(1, groupLvl - 1);
                maxLvl = groupLvl + 1;
                break;
            case 'ruinas':
                // Mapa 3: Inimigos moderados, até 5 níveis acima do player
                minLvl = groupLvl;
                maxLvl = groupLvl + 5;
                break;
            case 'vulcao':
                // Mapa 4: Inimigos difíceis, até 10 níveis acima do player
                minLvl = groupLvl + 3;
                maxLvl = groupLvl + 10;
                break;
            case 'abismo':
                // Mapa 5: Difícil, até 20 níveis acima do player
                minLvl = groupLvl + 8;
                maxLvl = groupLvl + 20;
                break;
            default:
                minLvl = Math.max(1, groupLvl - 5);
                maxLvl = groupLvl + 5;
        }

        // Apply NG+ scaling ONLY when GameMechanics?.state?.ngPlusLevel > 0
        const gm = this._getGameMechanics();
        const ngLevel = (gm && gm.state && gm.state.ngPlusLevel > 0) ? gm.state.ngPlusLevel : 0;
        if (ngLevel > 0) {
            const ngBonus = ngLevel * 20;
            minLvl += ngBonus;
            maxLvl += ngBonus;
        }

        return Math.floor(Math.random() * (maxLvl - minLvl + 1)) + minLvl;
    }

    getScaledEnemyLevel() {
        return this.getEnemyLevelForMap(this.currentMapId);
    }

    getActiveEnemies() {
        return this.enemiesByMap[this.currentMapId] || [];
    }

    // ---------------------------------------------------------
    // Map Respawn Roll (Called on map entry)
    // ---------------------------------------------------------
    checkMapRespawn(mapId) {
        const chance = RESPAWN_CHANCES[mapId] || 0.10;
        const roll = Math.random();
        if (roll < chance) {
            this.respawnMapEnemies(mapId);
        }
    }

    respawnMapEnemies(mapId) {
        if (!this.enemiesByMap[mapId]) return;
        let count = 0;
        this.enemiesByMap[mapId].forEach(e => {
            if (e.defeated) {
                e.defeated = false;
                e.revealed = false;
                e.level = this.getEnemyLevelForMap(mapId);
                count++;
            }
        });
        if (count > 0 && typeof Engine !== 'undefined') {
            const pct = Math.round((RESPAWN_CHANCES[mapId] || 0) * 100);
            Engine.emit('systemLog', `⚠️ Inimigos em ${MAP_DEFINITIONS[mapId].name} reapareceram! (${count} renascidos, chance de ${pct}%).`);
        }
        this.explorer3D?.syncFromTileMap?.();
    }

    // ---------------------------------------------------------
    // Switching Maps via Walking / Portals
    // ---------------------------------------------------------
    switchMap(mapId, targetX = null, targetY = null, skipRespawnCheck = false) {
        if (!MAP_DEFINITIONS[mapId]) return;

        this.currentMapId = mapId;
        this.currentMap   = MAP_DEFINITIONS[mapId];

        this.mapWidth  = this.currentMap.width;
        this.mapHeight = this.currentMap.height;

        if (!this.revealedByMap[mapId]) {
            this.revealedByMap[mapId] = new Set();
        }
        this.revealed = this.revealedByMap[mapId];

        // Ensure enemies exist
        if (!this.enemiesByMap[mapId]) {
            this.enemiesByMap[mapId] = (this.currentMap.enemies || []).map(e => ({
                ...e,
                mapId: mapId,
                level: this.getEnemyLevelForMap(mapId),
                revealed: false,
                defeated: false
            }));
        }

        // Respawn check when entering a map
        if (!skipRespawnCheck) {
            this.checkMapRespawn(mapId);
        }

        // Set position & snap interpolated coords
        this.playerX = (targetX !== null) ? targetX : this.currentMap.spawnX;
        this.playerY = (targetY !== null) ? targetY : this.currentMap.spawnY;
        this.renderX = this.playerX;
        this.renderY = this.playerY;

        // Reveal around spawn using effective vision radius
        this.reveal(this.playerX, this.playerY, this.getEffectiveVisionRadius(), false);
        this._centerCamOn(this.playerX, this.playerY);

        if (typeof window !== 'undefined' && window.gameAudio) {
            window.gameAudio.play?.(skipRespawnCheck ? 'step' : 'portal');
            window.gameAudio.playMusic?.(mapId);
        }
        const eng = this._getEngine();
        if (eng) {
            eng.emit('systemLog', `🗺️ Viajou para: ${this.currentMap.name}`);
            eng.emit('mapChanged', { mapId, map: this.currentMap, x: this.playerX, y: this.playerY });
        }

        this._dirty = true;
        this.updateHUD();
        this.draw();
        this.explorer3D?.syncFromTileMap?.();
    }

    // ---------------------------------------------------------
    // Collision & Walkability
    // ---------------------------------------------------------
    getTileType(x, y) {
        if (!this.currentMap || !this.currentMap.layout) return '.';
        if (y < 0 || y >= this.currentMap.layout.length) return '#';
        const row = this.currentMap.layout[y];
        if (!row || x < 0 || x >= row.length) return '#';
        return row[x] || '#';
    }

    isWalkable(x, y) {
        if (x < 0 || y < 0 || x >= this.mapWidth || y >= this.mapHeight) {
            return false;
        }

        const tile = this.getTileType(x, y);

        // Solid obstacles: Tree, Rock, Water, Solid Wall, Pillar, Lava, Void Chasm
        if (tile === 'T' || tile === 'R' || tile === 'W' || tile === '#' || tile === 'O' || tile === 'L' || tile === 'X') {
            return false;
        }

        return true;
    }

    // ---------------------------------------------------------
    // City Check (Base in Floresta Camp at x:2, y:2)
    // ---------------------------------------------------------
    isPlayerInCity() {
        if (this.currentMapId !== 'floresta') return false;
        const camp = this.currentMap && this.currentMap.camp;
        if (!camp) return false;
        // In Floresta, the city / camp clearing is at (2, 2)
        const dist = Math.hypot(this.playerX - camp.x, this.playerY - camp.y);
        return dist <= 2.2;
    }

    restAtCamp() {
        this.showCampDialog();
    }

    // ---------------------------------------------------------
    // Resting System (Base City in Floresta only)
    // ---------------------------------------------------------
    quickRest() {
        const eng = this._getEngine();
        if (!this.isPlayerInCity()) {
            if (eng) {
                eng.emit('systemLog', '🔒 O descanso só é seguro dentro da Cidade (Acampamento de Alvorada na Floresta)!');
            }
            return false;
        }

        if (this.quickRestsRemaining <= 0) {
            if (eng) {
                eng.emit('systemLog', '⚠️ Você não possui mais descansos rápidos (0/2)! Faça um Descanso Longo para recuperar suas cargas.');
            }
            return false;
        }

        this.quickRestsRemaining--;
        const party = (typeof window !== 'undefined' && window.gameParty) || [];

        party.forEach(p => {
            const healPct = (Math.floor(Math.random() * 26) + 25) / 100; // 25% a 50%
            const healHp = Math.round((p.getMaxHp ? p.getMaxHp() : 100) * healPct);
            if (p.heal) p.heal(healHp);
            else p.hp = Math.min(p.getMaxHp ? p.getMaxHp() : p.hp, p.hp + healHp);

            const manaHeal = Math.round((p.getMaxMana ? p.getMaxMana() : 50) * 0.50);
            p.mana = Math.min(p.getMaxMana ? p.getMaxMana() : p.mana, p.mana + manaHeal);
        });

        if (typeof window !== 'undefined' && window.gameAudio) {
            window.gameAudio.play?.('rest');
        }
        if (eng) {
            eng.emit('playerUpdated', party[0]);
            eng.emit('systemLog', `⚡ Descanso Rápido concluído! Curou 25%-50% de Vida e 50% de Mana. (Cargas restantes: ${this.quickRestsRemaining}/2)`);
        }
        return true;
    }

    longRest() {
        const eng = this._getEngine();
        if (!this.isPlayerInCity()) {
            if (eng) {
                eng.emit('systemLog', '🔒 O descanso só é seguro dentro da Cidade (Acampamento de Alvorada na Floresta)!');
            }
            return false;
        }

        const party = (typeof window !== 'undefined' && window.gameParty) || [];
        party.forEach(p => {
            if (p.heal) p.heal(p.getMaxHp ? p.getMaxHp() : 9999);
            p.hp = p.getMaxHp ? p.getMaxHp() : p.hp;
            p.mana = p.getMaxMana ? p.getMaxMana() : p.mana;
        });

        // Restore quick rest charges
        this.quickRestsRemaining = 2;

        // Respawn ALL enemies across ALL maps!
        for (const [mId, enemies] of Object.entries(this.enemiesByMap)) {
            enemies.forEach(e => {
                e.defeated = false;
                e.revealed = false;
                e.level = this.getEnemyLevelForMap(mId);
            });
        }

        if (typeof window !== 'undefined' && window.gameAudio) {
            window.gameAudio.play?.('rest');
        }
        if (eng) {
            eng.emit('playerUpdated', party[0]);
            eng.emit('systemLog', `🌙 Descanso Longo concluído! Grupo 100% curado e cargas restauradas. Porém, TODOS os inimigos do mundo renasceram!`);
        }

        this._dirty = true;
        this.updateHUD();
        this.draw();
        this.explorer3D?.syncFromTileMap?.();
        if (typeof window !== 'undefined' && window.game) window.game.save();
        return true;
    }

    // ---------------------------------------------------------
    // Chest & Shrine State Helpers (persisted in GameMechanics.state if loaded)
    // ---------------------------------------------------------
    _isChestOpened(id) {
        const gm = this._getGameMechanics();
        const gmList = gm?.state?.openedChests;
        if (gmList) {
            return Array.isArray(gmList) ? gmList.includes(id) : (gmList instanceof Set ? gmList.has(id) : false);
        }
        return this.openedChests.has(id);
    }

    isChestOpened(id) {
        return this._isChestOpened(id);
    }

    _markChestOpened(id) {
        this.openedChests.add(id);
        const gm = this._getGameMechanics();
        if (gm?.state) {
            if (!gm.state.openedChests) gm.state.openedChests = [];
            if (Array.isArray(gm.state.openedChests)) {
                if (!gm.state.openedChests.includes(id)) gm.state.openedChests.push(id);
            } else if (gm.state.openedChests instanceof Set) {
                gm.state.openedChests.add(id);
            }
        }
    }

    _isShrineUsed(id) {
        const gm = this._getGameMechanics();
        const gmList = gm?.state?.usedShrines;
        if (gmList) {
            return Array.isArray(gmList) ? gmList.includes(id) : (gmList instanceof Set ? gmList.has(id) : false);
        }
        return this.usedShrines.has(id);
    }

    isShrineUsed(id) {
        return this._isShrineUsed(id);
    }

    _markShrineUsed(id) {
        this.usedShrines.add(id);
        const gm = this._getGameMechanics();
        if (gm?.state) {
            if (!gm.state.usedShrines) gm.state.usedShrines = [];
            if (Array.isArray(gm.state.usedShrines)) {
                if (!gm.state.usedShrines.includes(id)) gm.state.usedShrines.push(id);
            } else if (gm.state.usedShrines instanceof Set) {
                gm.state.usedShrines.add(id);
            }
        }
    }

    getActiveNPCs() {
        return (this.currentMap && Array.isArray(this.currentMap.npcs)) ? this.currentMap.npcs : [];
    }

    getActiveChests() {
        return (this.currentMap && Array.isArray(this.currentMap.chests)) ? this.currentMap.chests : [];
    }

    getActiveShrines() {
        return (this.currentMap && Array.isArray(this.currentMap.shrines)) ? this.currentMap.shrines : [];
    }

    _openChest(chest) {
        if (!chest || this._isChestOpened(chest.id)) return false;
        this._markChestOpened(chest.id);

        const party = (typeof window !== 'undefined' && window.gameParty) || [];
        const inv = (typeof window !== 'undefined' && window.gameInventory) || null;
        const gm = this._getGameMechanics();
        const eng = this._getEngine();
        const groupLvl = this.getGroupLevel();

        const goldReward = chest.gold || 50;
        if (party[0]) {
            if (typeof party[0].gainGold === 'function') party[0].gainGold(goldReward);
            else party[0].gold = (party[0].gold || 0) + goldReward;
        }

        const obtainedNames = [`${goldReward} Ouro`];
        if (inv && typeof inv.addItem === 'function' && typeof window !== 'undefined' && window.ItemDatabase) {
            const db = window.ItemDatabase;
            if (typeof db.generateItem === 'function') {
                const gear = db.generateItem(Math.max(groupLvl, chest.minLvl || 1), chest.rarity || 'raro');
                if (gear && inv.addItem(gear)) {
                    obtainedNames.push(`${gear.name} (${gear.rarity})`);
                }
            }
            if (chest.potionId && typeof db.getPotion === 'function') {
                const pot = db.getPotion(chest.potionId);
                if (pot && inv.addItem(pot)) {
                    obtainedNames.push(pot.name);
                }
            }
            if (chest.materialId && typeof db.getMaterial === 'function') {
                const qty = chest.materialQty || 1;
                for (let i = 0; i < qty; i++) {
                    const mat = db.getMaterial(chest.materialId);
                    if (mat) inv.addItem(mat);
                }
                const baseMat = db.materials?.find(m => m.id === chest.materialId);
                if (baseMat) obtainedNames.push(`${qty}x ${baseMat.name}`);
            }
        }

        if (typeof window !== 'undefined' && window.gameAudio) {
            window.gameAudio.play?.('chest');
        }
        if (gm && typeof gm.recordStat === 'function') {
            gm.recordStat('chestsOpened', 1);
        }
        const summary = obtainedNames.join(', ');
        if (eng) {
            eng.emit('systemLog', `🧰 Você abriu [${chest.name}] e encontrou: ${summary}!`);
        }

        this._dirty = true;
        this.draw();
        this.explorer3D?.syncFromTileMap?.();
        if (typeof window !== 'undefined' && window.game) window.game.save();

        this._showDialog(
            `🧰 ${chest.name}`,
            `Você destrancou o baú e encontrou tesouros da expedição:<br><br><strong style="color:var(--accent-gold, #d4af37);">${summary}</strong>`
        );
        return true;
    }

    _useShrine(shrine) {
        if (!shrine || this._isShrineUsed(shrine.id)) return false;
        this._markShrineUsed(shrine.id);

        const party = (typeof window !== 'undefined' && window.gameParty) || [];
        const gm = this._getGameMechanics();
        const eng = this._getEngine();
        const groupLvl = this.getGroupLevel();
        let extraSummary = '';

        switch (shrine.effectType) {
            case 'lantern': {
                const expandedRadius = this.getEffectiveVisionRadius() + 6;
                this.reveal(this.playerX, this.playerY, expandedRadius, true);
                this.reveal(shrine.x, shrine.y, 8, true);
                party.forEach(p => {
                    const maxMana = p.getMaxMana ? p.getMaxMana() : (p.mana || 50);
                    if (typeof p.restoreMana === 'function') p.restoreMana(maxMana);
                    else p.mana = maxMana;
                });
                extraSummary = 'Área iluminada (+6 de alcance) e 100% de Mana restaurada!';
                break;
            }
            case 'wisdom': {
                const xpGain = Math.max(100, groupLvl * 150);
                party.forEach(p => {
                    if (typeof p.gainXp === 'function') p.gainXp(xpGain);
                    const maxHp = p.getMaxHp ? p.getMaxHp() : (p.hp || 100);
                    const maxMana = p.getMaxMana ? p.getMaxMana() : (p.mana || 50);
                    if (typeof p.heal === 'function') p.heal(Math.round(maxHp * 0.6));
                    else p.hp = Math.min(maxHp, p.hp + Math.round(maxHp * 0.6));
                    if (typeof p.restoreMana === 'function') p.restoreMana(Math.round(maxMana * 0.6));
                    else p.mana = Math.min(maxMana, p.mana + Math.round(maxMana * 0.6));
                });
                extraSummary = `+${xpGain} XP para cada herói e +60% HP/Mana restaurados!`;
                break;
            }
            case 'flame': {
                party.forEach(p => {
                    const maxHp = p.getMaxHp ? p.getMaxHp() : (p.hp || 100);
                    if (typeof p.heal === 'function') p.heal(Math.round(maxHp * 0.75));
                    else p.hp = Math.min(maxHp, p.hp + Math.round(maxHp * 0.75));
                    if (gm && typeof gm.applyStatus === 'function') {
                        gm.applyStatus(p, 'blessing', { duration: 5, caster: shrine.name });
                        gm.applyStatus(p, 'shield', { duration: 4, shieldAmount: Math.round(maxHp * 0.25) });
                    } else {
                        p.shield = (p.shield || 0) + Math.round(maxHp * 0.25);
                    }
                });
                extraSummary = 'Bênção da Chama (+Dano), Escudo (25% HP) e +75% HP restaurado!';
                break;
            }
            case 'order': {
                party.forEach(p => {
                    const maxHp = p.getMaxHp ? p.getMaxHp() : (p.hp || 100);
                    const maxMana = p.getMaxMana ? p.getMaxMana() : (p.mana || 50);
                    if (typeof p.heal === 'function') p.heal(maxHp);
                    p.hp = maxHp;
                    if (typeof p.restoreMana === 'function') p.restoreMana(maxMana);
                    p.mana = maxMana;
                    if (gm && typeof gm.cleanseNegativeStatuses === 'function') {
                        gm.cleanseNegativeStatuses(p);
                    }
                    if (gm && typeof gm.addFury === 'function') {
                        gm.addFury(p, 50);
                    } else {
                        p.fury = Math.min(100, (p.fury || 0) + 50);
                    }
                });
                extraSummary = '100% HP/Mana restaurados, males purificados e +50 de Fúria!';
                break;
            }
            case 'dawn':
            default: {
                party.forEach(p => {
                    const maxHp = p.getMaxHp ? p.getMaxHp() : (p.hp || 100);
                    const maxMana = p.getMaxMana ? p.getMaxMana() : (p.mana || 50);
                    if (typeof p.heal === 'function') p.heal(Math.round(maxHp * 0.5));
                    else p.hp = Math.min(maxHp, p.hp + Math.round(maxHp * 0.5));
                    if (typeof p.restoreMana === 'function') p.restoreMana(Math.round(maxMana * 0.5));
                    else p.mana = Math.min(maxMana, p.mana + Math.round(maxMana * 0.5));
                    if (typeof p.gainXp === 'function') p.gainXp(50);
                });
                extraSummary = '50% HP/Mana restaurados e +50 XP para o grupo!';
                break;
            }
        }

        if (typeof window !== 'undefined' && window.gameAudio) {
            window.gameAudio.play?.('shrine');
        }
        if (gm && typeof gm.recordStat === 'function') {
            gm.recordStat('shrinesUsed', 1);
        }
        if (eng) {
            if (party[0]) eng.emit('playerUpdated', party[0]);
            eng.emit('systemLog', `⛩️ [${shrine.name}] ativado! ${extraSummary}`);
        }

        this._dirty = true;
        this.draw();
        this.explorer3D?.syncFromTileMap?.();
        if (typeof window !== 'undefined' && window.game) window.game.save();

        this._showDialog(
            `⛩️ ${shrine.name}`,
            `${shrine.desc}<br><br><strong style="color:#38bdf8;">${extraSummary}</strong>`
        );
        return true;
    }

    // ---------------------------------------------------------
    // Player Movement & Interaction
    // ---------------------------------------------------------
    movePlayer(dx, dy) {
        const targetX = this.playerX + dx;
        const targetY = this.playerY + dy;

        // Collision Check: Cannot walk through trees, rocks, walls, water, magma!
        if (!this.isWalkable(targetX, targetY)) {
            if (typeof window !== 'undefined' && window.gameAudio) window.gameAudio.play?.('blocked');
            return false;
        }

        const prevX = this.playerX;
        const prevY = this.playerY;
        this.playerX = targetX;
        this.playerY = targetY;

        // Reveal tiles using effective vision radius (includes Relic bonus)
        this.reveal(this.playerX, this.playerY, this.getEffectiveVisionRadius(), true);
        this._centerCamOn(this.playerX, this.playerY);

        if (typeof window !== 'undefined' && window.gameAudio) window.gameAudio.play?.('step');
        this.explorer3D?.onMove?.(prevX, prevY, this.playerX, this.playerY);

        // Check if stepped on a stationary enemy -> Iniciar combate!
        const enemyAtTile = this.getActiveEnemies().find(e => !e.defeated && e.x === this.playerX && e.y === this.playerY);
        if (enemyAtTile) {
            this.triggerEnemyCombat(enemyAtTile);
            this._dirty = true;
            this.draw();
            return true;
        }

        // In Cave/Abyss: Enemies see player in the dark and ambush when adjacent (dist <= 1.2)
        if (this.currentMap.enemiesSeePlayerInDark) {
            const ambushEnemy = this.getActiveEnemies().find(e => {
                if (e.defeated) return false;
                const dist = Math.hypot(e.x - this.playerX, e.y - this.playerY);
                return dist <= 1.2;
            });
            if (ambushEnemy) {
                const eng = this._getEngine();
                if (eng) {
                    eng.emit('systemLog', `👁️ Nas sombras, ${ambushEnemy.name} avistou você e atacou!`);
                }
                this.triggerEnemyCombat(ambushEnemy);
                this._dirty = true;
                this.draw();
                return true;
            }
        }

        // Check Portals (walking transition)
        const portal = (this.currentMap.portals || []).find(p => p.x === this.playerX && p.y === this.playerY);
        if (portal) {
            this.switchMap(portal.targetMap, portal.targetX, portal.targetY);
            return true;
        }

        // Check Camp in Floresta
        if (this.currentMap.camp && this.playerX === this.currentMap.camp.x && this.playerY === this.currentMap.camp.y) {
            if (typeof window !== 'undefined' && window.gameAudio) window.gameAudio.play?.('camp');
            this.showCampDialog();
        }

        // Check Chests
        const chest = this.getActiveChests().find(c => c.x === this.playerX && c.y === this.playerY && !this._isChestOpened(c.id));
        if (chest) {
            this._openChest(chest);
        }

        // Check Shrines
        const shrine = this.getActiveShrines().find(s => s.x === this.playerX && s.y === this.playerY && !this._isShrineUsed(s.id));
        if (shrine) {
            this._useShrine(shrine);
        }

        // Check NPC at tile
        const npc = this._getNpcAt(this.playerX, this.playerY, 0);
        if (npc) this._talkToNpc(npc);

        this._dirty = true;
        this.updateHUD();
        this.draw();
        return true;
    }

    // ---------------------------------------------------------
    // Combat Initiation with Scaled Enemy
    // ---------------------------------------------------------
    triggerEnemyCombat(enemy) {
        if (!enemy || enemy.defeated) return;
        if (window.gameCombat && window.gameCombat.inCombat) return;

        this.activeCombatEnemy = enemy;

        // Base mob definition
        const baseMob = (window.MonsterDatabase && window.MonsterDatabase.monsters.find(m => m.id === enemy.baseMobId))
            || { id: 'mob1', name: enemy.name, minLvl: 1, maxLvl: 5, hp: 35, dmg: 6, xp: 18, gold: 10 };

        // Scale monster stats according to dynamic enemy.level
        const scale = Math.max(0.35, 1 + (enemy.level - (baseMob.minLvl || 1)) * 0.12);
        const hordeSize = enemy.isBoss ? 1 : Math.min(3, Math.max(1, Math.floor(Math.random() * 2) + 1));

        const monsters = [];
        for (let i = 0; i < hordeSize; i++) {
            monsters.push({
                ...baseMob,
                name: hordeSize > 1 ? `${baseMob.name} ${String.fromCharCode(65 + i)}` : baseMob.name,
                instanceId: 'map_mob_' + Date.now() + '_' + i,
                level: enemy.level,
                maxHp: Math.max(10, Math.floor((baseMob.hp || 30) * scale)),
                hp: Math.max(10, Math.floor((baseMob.hp || 30) * scale)),
                dmg: Math.max(3, Math.floor((baseMob.dmg || 6) * scale)),
                xp: Math.max(5, Math.floor((baseMob.xp || 15) * scale)),
                gold: Math.max(2, Math.floor((baseMob.gold || 8) * scale)),
                isCampaign: false,
                hordeSize: hordeSize
            });
        }

        if (typeof window !== 'undefined' && window.gameAudio) {
            window.gameAudio.play?.('combat');
        }
        const eng = this._getEngine();
        if (eng) {
            eng.emit('systemLog', `⚔️ Combate iniciado com ${enemy.name} (Nível ${enemy.level})!`);
        }

        if (window.gameCombat) {
            window.gameCombat.startCombat(monsters);
        }
    }

    // ---------------------------------------------------------
    // Fog of War & Reveal Logic
    // ---------------------------------------------------------
    reveal(cx, cy, radius = 4, triggerFlash = true) {
        let newlyRevealedCount = 0;
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (nx >= 0 && ny >= 0 && nx < this.mapWidth && ny < this.mapHeight) {
                        const key = `${nx},${ny}`;
                        if (!this.revealed.has(key)) {
                            this.revealed.add(key);
                            newlyRevealedCount++;
                            if (triggerFlash) {
                                this.revealFlashes.set(key, now);
                            }
                        }
                    }
                }
            }
        }

        // Check if any stationary enemies on this map were revealed
        this.getActiveEnemies().forEach(e => {
            if (!e.revealed && this.revealed.has(`${e.x},${e.y}`)) {
                e.revealed = true;
                if (typeof Engine !== 'undefined') {
                    Engine.emit('systemLog', `👁️ Inimigo avistado: ${e.name} (Nível ${e.level})!`);
                }
            }
        });

        if (newlyRevealedCount > 0 && triggerFlash && window.gameAudio) {
            window.gameAudio.play('reveal');
        }

        this._dirty = true;
        return newlyRevealedCount;
    }

    // ---------------------------------------------------------
    // Drawing & Canvas Render
    // ---------------------------------------------------------
    draw() {
        if (!this.canvas || !this.ctx) return;
        const ctx = this.ctx;
        const ts  = this.tileSize;
        const W   = this.canvas.width;
        const H   = this.canvas.height;
        if (W <= 0 || H <= 0 || ts <= 0) return;

        // Smooth interpolated movement (renderX, renderY -> playerX, playerY)
        if (this.renderX === undefined) this.renderX = this.playerX;
        if (this.renderY === undefined) this.renderY = this.playerY;
        const distToPlayer = Math.hypot(this.playerX - this.renderX, this.playerY - this.renderY);
        if (distToPlayer > 3) {
            this.renderX = this.playerX;
            this.renderY = this.playerY;
        } else if (distToPlayer > 0.005) {
            this.renderX += (this.playerX - this.renderX) * 0.25;
            this.renderY += (this.playerY - this.renderY) * 0.25;
        } else {
            this.renderX = this.playerX;
            this.renderY = this.playerY;
        }

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        const startX = Math.max(0, Math.floor(this.camX));
        const startY = Math.max(0, Math.floor(this.camY));
        const endX   = Math.min(this.mapWidth,  startX + this.viewTilesX + 2);
        const endY   = Math.min(this.mapHeight, startY + this.viewTilesY + 2);

        // 1. Render Terrain Tiles (never add extra fillRect/strokeRect inside renderMap)
        this.renderMap(ctx, ts, startX, startY, endX, endY);

        // 2. Render Fog of War & Reveal Flash Animation
        this.drawFog(ctx, ts, startX, startY, endX, endY);

        // 3. Render Objects (Camp Glow, Pulsing Portals, Chests, Shrines, NPCs)
        this._drawMapObjects(ctx, ts);

        // 4. Render Stationary Enemies
        this._drawEnemies(ctx, ts);

        // 5. Render Biome Ambient Particle Effects
        this._drawAmbientEffects(ctx, ts);

        // 6. Render Player
        this._drawPlayer(ctx, ts);

        this._dirty = false;
    }

    renderMap(
        ctx = this.ctx,
        ts = this.tileSize,
        startCol = 0,
        startRow = 0,
        endCol = this.mapWidth,
        endRow = this.mapHeight
    ) {
        const minCol = Math.max(0, startCol);
        const minRow = Math.max(0, startRow);
        const maxCol = Math.min(this.mapWidth, endCol);
        const maxRow = Math.min(this.mapHeight, endRow);
        const camX   = this.camX || 0;
        const camY   = this.camY || 0;

        for (let y = minRow; y < maxRow; y++) {
            for (let x = minCol; x < maxCol; x++) {
                const drawX = Math.floor((x - camX) * ts);
                const drawY = Math.floor((y - camY) * ts);
                const key = `${x},${y}`;

                if (!this.revealed.has(key)) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(drawX, drawY, ts, ts);
                    continue;
                }

                // Render revealed terrain tile
                ctx.fillStyle = this._getTileColor(x, y);
                ctx.fillRect(drawX, drawY, ts, ts);

                // Subtle grid border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.strokeRect(drawX, drawY, ts, ts);

                // Draw tile decoration emoji if special
                this._drawTileDecoration(ctx, x, y, drawX, drawY, ts);
            }
        }
    }

    _drawTileDecoration(ctx, x, y, drawX, drawY, ts) {
        const tile = this.getTileType(x, y);
        const cx = drawX + ts / 2;
        const cy = drawY + ts / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (tile === 'T') {
            ctx.font = `${Math.floor(ts * 0.75)}px Segoe UI Emoji, Arial`;
            ctx.fillText('🌲', cx, cy);
        } else if (tile === 'R') {
            ctx.font = `${Math.floor(ts * 0.7)}px Segoe UI Emoji, Arial`;
            ctx.fillText('🪨', cx, cy);
        } else if (tile === 'O') {
            ctx.font = `${Math.floor(ts * 0.75)}px Segoe UI Emoji, Arial`;
            ctx.fillText(this.currentMap.theme === 'abyss' ? '🔮' : '🏛️', cx, cy);
        } else if (tile === 'W') {
            ctx.font = `${Math.floor(ts * 0.55)}px Segoe UI Emoji, Arial`;
            ctx.fillText('💧', cx, cy);
        } else if (tile === 'L') {
            ctx.font = `${Math.floor(ts * 0.65)}px Segoe UI Emoji, Arial`;
            ctx.fillText('🌋', cx, cy);
        } else if (tile === 'X') {
            ctx.font = `${Math.floor(ts * 0.65)}px Segoe UI Emoji, Arial`;
            ctx.fillText('🕳️', cx, cy);
        } else if (tile === 'B') {
            ctx.font = `${Math.floor(ts * 0.65)}px Segoe UI Emoji, Arial`;
            ctx.fillText(this.currentMap.theme === 'abyss' ? '✨' : '🪵', cx, cy);
        } else if (tile === 'C') {
            ctx.font = `${Math.floor(ts * 0.8)}px Segoe UI Emoji, Arial`;
            ctx.fillText('🏕️', cx, cy);
        } else if (tile === 'E') {
            ctx.font = `${Math.floor(ts * 0.8)}px Segoe UI Emoji, Arial`;
            ctx.fillText('🚪', cx, cy);
        }
    }

    _getTileColor(tx, ty) {
        const tile = this.getTileType(tx, ty);
        const theme = this.currentMap ? this.currentMap.theme : 'forest';

        if (tile === '#') {
            if (theme === 'cave') return '#141416';
            if (theme === 'ruins') return '#222226';
            if (theme === 'abyss') return '#180f24';
            return '#182018';
        }
        if (tile === 'T') return '#183818';
        if (tile === 'R') return '#333538';
        if (tile === 'W') return '#1e3a5f';
        if (tile === 'L') return '#5c1d11';
        if (tile === 'X') return '#0a0212';
        if (tile === 'P') {
            if (theme === 'abyss') return '#2e1065';
            return '#3d2c1e';
        }
        if (tile === 'B') {
            if (theme === 'abyss') return '#4c1d95';
            if (theme === 'volcano') return '#4a3b2c';
            return '#4a3b2c';
        }

        // Open Walkable ground
        if (theme === 'cave') return '#1b1b22';
        if (theme === 'ruins') return '#26282b';
        if (theme === 'volcano') return '#241a1a';
        if (theme === 'abyss') return '#150d21';
        return '#1b381b'; // Default forest grass
    }

    drawFog(ctx, ts = this.tileSize, startX = 0, startY = 0, endX = this.mapWidth, endY = this.mapHeight) {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());

        for (let ty = startY; ty < endY; ty++) {
            for (let tx = startX; tx < endX; tx++) {
                const key = `${tx},${ty}`;
                if (!this.revealed.has(key)) continue;

                const px = Math.floor((tx - this.camX) * ts);
                const py = Math.floor((ty - this.camY) * ts);

                const hasHiddenNeighbour =
                    !this.revealed.has(`${tx - 1},${ty}`) ||
                    !this.revealed.has(`${tx + 1},${ty}`) ||
                    !this.revealed.has(`${tx},${ty - 1}`) ||
                    !this.revealed.has(`${tx},${ty + 1}`);

                if (hasHiddenNeighbour) {
                    ctx.fillStyle = 'rgba(0,0,0,0.45)';
                    ctx.fillRect(px, py, ts, ts);
                }

                if (this.revealFlashes.has(key)) {
                    const elapsed = now - this.revealFlashes.get(key);
                    if (elapsed >= this.flashDuration) {
                        this.revealFlashes.delete(key);
                    } else {
                        const alpha = 0.3 * (1 - elapsed / this.flashDuration);
                        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
                        ctx.fillRect(px, py, ts, ts);
                    }
                }
            }
        }
    }

    _drawAmbientEffects(ctx, ts) {
        if (!this.canvas || !ctx) return;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const theme = this.currentMap ? this.currentMap.theme : 'forest';
        const now = Date.now();

        if (this._ambientTheme !== theme || this._ambientParticles.length === 0) {
            this._ambientTheme = theme;
            this._ambientParticles = [];
            const count = 28;
            for (let i = 0; i < count; i++) {
                this._ambientParticles.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: theme === 'volcano' ? -(0.4 + Math.random() * 0.9) : (theme === 'ruins' ? (0.15 + Math.random() * 0.35) : (Math.random() - 0.5) * 0.5),
                    size: 1.2 + Math.random() * 2.2,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        const palette = {
            forest:  'rgba(163, 230, 53,',   // fireflies
            cave:    'rgba(56, 189, 248,',   // cave spores
            ruins:   'rgba(226, 232, 240,',  // ruins dust
            volcano: 'rgba(251, 146, 60,',   // volcanic embers
            abyss:   'rgba(192, 132, 252,'   // abyssal stars
        };
        const prefix = palette[theme] || palette.forest;

        this._ambientParticles.forEach(p => {
            p.x += p.vx + Math.sin(now / 700 + p.phase) * 0.2;
            p.y += p.vy;
            if (p.x < 0) p.x += W;
            if (p.x > W) p.x -= W;
            if (p.y < 0) p.y += H;
            if (p.y > H) p.y -= H;

            const flicker = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(now / 320 + p.phase));
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `${prefix}${flicker.toFixed(2)})`;
            ctx.fill();
        });
    }

    _drawMapObjects(ctx, ts) {
        const now = Date.now();

        // Flickering Campfire Glow
        if (this.currentMap.camp && this.revealed.has(`${this.currentMap.camp.x},${this.currentMap.camp.y}`)) {
            const cx = Math.floor((this.currentMap.camp.x - this.camX) * ts) + ts / 2;
            const cy = Math.floor((this.currentMap.camp.y - this.camY) * ts) + ts / 2;
            const flicker = 0.5 + 0.5 * Math.sin(now / 120) * Math.cos(now / 73);
            const rOuter = ts * (1.5 + flicker * 0.35);
            const rInner = ts * (0.85 + flicker * 0.2);

            ctx.beginPath();
            ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(251, 146, 60, ${(0.14 + flicker * 0.08).toFixed(2)})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(250, 204, 21, ${(0.22 + flicker * 0.1).toFixed(2)})`;
            ctx.fill();
        }

        // Pulsing Portal Rings
        (this.currentMap.portals || []).forEach(p => {
            if (!this.revealed.has(`${p.x},${p.y}`)) return;
            const px = Math.floor((p.x - this.camX) * ts);
            const py = Math.floor((p.y - this.camY) * ts);
            const cx = px + ts / 2;
            const cy = py + ts / 2;
            const pulse = 0.5 + 0.5 * Math.sin(now / 260);

            ctx.beginPath();
            ctx.arc(cx, cy, ts * (0.45 + pulse * 0.22), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(168, 85, 247, ${(0.45 + pulse * 0.45).toFixed(2)})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, cy, ts * (0.28 + pulse * 0.12), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(212, 175, 55, ${(0.5 + pulse * 0.4).toFixed(2)})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.font = `bold ${Math.max(8, ts * 0.55)}px Segoe UI`;
            ctx.fillStyle = 'var(--accent-gold, #d4af37)';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, cx, py - 4);
        });

        // Treasure Chests
        this.getActiveChests().forEach(c => {
            if (!this.revealed.has(`${c.x},${c.y}`)) return;
            const cx = Math.floor((c.x - this.camX) * ts) + ts / 2;
            const cy = Math.floor((c.y - this.camY) * ts) + ts / 2;
            const opened = this._isChestOpened(c.id);

            if (!opened) {
                const pulse = 0.5 + 0.5 * Math.sin(now / 300);
                ctx.beginPath();
                ctx.arc(cx, cy, ts * 0.46, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(250, 204, 21, ${(0.15 + pulse * 0.15).toFixed(2)})`;
                ctx.fill();
            }

            ctx.font = `${Math.max(10, Math.floor(ts * 0.8))}px Segoe UI Emoji, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = opened ? 0.45 : 1.0;
            ctx.fillText(opened ? '📦' : '🧰', cx, cy);
            ctx.globalAlpha = 1.0;
        });

        // Ancient Shrines
        this.getActiveShrines().forEach(s => {
            if (!this.revealed.has(`${s.x},${s.y}`)) return;
            const cx = Math.floor((s.x - this.camX) * ts) + ts / 2;
            const cy = Math.floor((s.y - this.camY) * ts) + ts / 2;
            const used = this._isShrineUsed(s.id);

            if (!used) {
                const pulse = 0.5 + 0.5 * Math.sin(now / 280);
                ctx.beginPath();
                ctx.arc(cx, cy, ts * (0.5 + pulse * 0.15), 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56, 189, 248, ${(0.5 + pulse * 0.4).toFixed(2)})`;
                ctx.lineWidth = 1.8;
                ctx.stroke();
            }

            ctx.font = `${Math.max(10, Math.floor(ts * 0.85))}px Segoe UI Emoji, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = used ? 0.45 : 1.0;
            ctx.fillText('⛩️', cx, cy);
            ctx.globalAlpha = 1.0;
        });

        // Map NPCs
        const drawnIds = new Set();
        this.getActiveNPCs().forEach(npc => {
            if (!this.revealed.has(`${npc.x},${npc.y}`)) return;
            drawnIds.add(npc.id);
            const cx = Math.floor((npc.x - this.camX) * ts) + ts / 2;
            const cy = Math.floor((npc.y - this.camY) * ts) + ts / 2;

            ctx.beginPath();
            ctx.arc(cx, cy, ts * 0.42, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
            ctx.fill();

            ctx.font = `${Math.max(11, Math.floor(ts * 0.85))}px Segoe UI Emoji, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(npc.icon || '👤', cx, cy);

            ctx.font = `bold ${Math.max(7, ts * 0.45)}px Segoe UI`;
            ctx.fillStyle = '#93c5fd';
            ctx.fillText(npc.name.split(' ')[0], cx, cy - ts * 0.6);
        });

        // Legacy / manually injected objects
        (this.objects || []).forEach(obj => {
            if (drawnIds.has(obj.id)) return;
            if (!this.revealed.has(`${obj.x},${obj.y}`)) return;
            const px = Math.floor((obj.x - this.camX) * ts);
            const py = Math.floor((obj.y - this.camY) * ts);
            if (obj.type === 'npc') {
                ctx.font = `${Math.max(12, ts)}px Segoe UI Emoji, Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('👤', px + ts / 2, py + ts / 2);
            }
        });
    }

    _drawEnemies(ctx, ts) {
        const enemies = this.getActiveEnemies();
        const now = Date.now();

        enemies.forEach(e => {
            if (e.defeated) return;

            const isRevealed = this.revealed.has(`${e.x},${e.y}`);
            const px = Math.floor((e.x - this.camX) * ts) + ts / 2;
            const py = Math.floor((e.y - this.camY) * ts) + ts / 2;

            if (isRevealed) {
                ctx.font = `${Math.floor(ts * 0.9)}px Segoe UI Emoji, Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(e.icon || '👾', px, py);

                ctx.font = `bold ${Math.max(7, ts * 0.5)}px Segoe UI`;
                ctx.fillStyle = e.isBoss ? '#ef4444' : '#fbbf24';
                ctx.fillText(`Nv.${e.level}`, px, py - ts * 0.6);
            } else if (this.currentMap.enemiesSeePlayerInDark) {
                const dist = Math.hypot(e.x - this.playerX, e.y - this.playerY);
                if (dist <= 4.5) {
                    const pulse = 0.5 + 0.5 * Math.sin(now / 200);
                    ctx.font = `${Math.floor(ts * 0.7)}px Segoe UI Emoji, Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.globalAlpha = 0.6 + pulse * 0.4;
                    ctx.fillText('👀', px, py);
                    ctx.globalAlpha = 1.0;
                }
            }
        });
    }

    _drawPlayer(ctx, ts) {
        const rx = this.renderX !== undefined ? this.renderX : this.playerX;
        const ry = this.renderY !== undefined ? this.renderY : this.playerY;
        const px = Math.floor((rx - this.camX) * ts) + ts / 2;
        const py = Math.floor((ry - this.camY) * ts) + ts / 2;

        const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 250);
        const r = Math.max(5, ts * 0.4) + pulse * 1.5;

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.9 + pulse * 0.1})`;
        ctx.fill();
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = `bold ${Math.max(8, ts * 0.55)}px Segoe UI`;
        ctx.fillStyle = '#d4af37';
        ctx.textAlign = 'center';
        ctx.fillText('Grupo', px, py - r - 3);
        ctx.textAlign = 'left';
    }

    // ---------------------------------------------------------
    // HUD & UI Updates
    // ---------------------------------------------------------
    updateHUD() {
        const elTitle = document.getElementById('world-map-title');
        if (elTitle && this.currentMap) {
            elTitle.innerText = `${this.currentMap.name}`;
        }

        const elDebuff = document.getElementById('world-map-debuff');
        if (elDebuff) {
            if (this.currentMap && this.currentMap.hasExplorationDebuff) {
                elDebuff.style.display = 'inline-block';
                elDebuff.innerText = '👁️ Debuff: Névoa Densa (-70% Visão · Inimigos Enxergam Você!)';
            } else {
                elDebuff.style.display = 'none';
            }
        }

        const groupLvl = this.getGroupLevel();
        const elParty = document.getElementById('world-party-level');
        if (elParty) elParty.innerText = `Nível do Grupo: Nv. ${groupLvl}`;

        const elScaling = document.getElementById('world-enemy-scaling');
        if (elScaling) {
            let scaleDesc = '';
            switch (this.currentMapId) {
                case 'floresta': scaleDesc = `Escala: Nv. ${Math.max(1, groupLvl - 5)} ~ ${groupLvl} (Fácil)`; break;
                case 'caverna': scaleDesc = `Escala: Nv. ${Math.max(1, groupLvl - 1)} ~ ${groupLvl + 1} (Nível do Grupo)`; break;
                case 'ruinas': scaleDesc = `Escala: Nv. ${groupLvl} ~ ${groupLvl + 5} (Moderado)`; break;
                case 'vulcao': scaleDesc = `Escala: Nv. ${groupLvl + 3} ~ ${groupLvl + 10} (Difícil)`; break;
                case 'abismo': scaleDesc = `Escala: Nv. ${groupLvl + 8} ~ ${groupLvl + 20} (Extremo)`; break;
                default: scaleDesc = `Escala: Nv. ${Math.max(1, groupLvl - 5)} ~ ${groupLvl + 5}`;
            }
            elScaling.innerText = scaleDesc;
        }

        const elDesc = document.getElementById('world-map-desc');
        if (elDesc && this.currentMap) {
            elDesc.innerText = this.currentMap.desc;
        }

        const elEnemies = document.getElementById('world-enemies-status');
        if (elEnemies) {
            const enemies = this.getActiveEnemies();
            const defeated = enemies.filter(e => e.defeated).length;
            elEnemies.innerText = `Inimigos: ${defeated}/${enemies.length} Derrotados`;
        }

        // Highlight progression badges
        document.querySelectorAll('.journey-badge').forEach(badge => {
            if (badge.getAttribute('data-map') === this.currentMapId) {
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        });
    }

    // ---------------------------------------------------------
    // Base Camp Modal
    // ---------------------------------------------------------
    showCampDialog() {
        this._disposeNpcPortrait();
        const old = document.getElementById('world-dialog');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'world-dialog';
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.8);
            display:flex; align-items:center; justify-content:center;
            z-index:5000;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background:var(--bg-panel, #1e1e1e); border:1px solid var(--accent-gold, #d4af37);
            padding:1.5rem; max-width:480px; width:92%;
            box-shadow:0 0 25px rgba(212,175,55,0.3);
            animation:fadeIn 0.2s ease;
        `;

        box.innerHTML = `
            <h3 style="color:var(--accent-gold, #d4af37);margin-bottom:.5rem;">🏕️ Acampamento de Alvorada (Base)</h3>
            <p style="margin-bottom:1rem;line-height:1.5;font-size:0.9rem;color:#ccc;">
                Você está na segurança da cidade na floresta. Apenas aqui você pode descansar, curar seu grupo e acessar o comércio da Ordem.
            </p>
            
            <div style="background:#151515; border:1px solid #333; padding:0.8rem; border-radius:6px; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                    <strong>Cargas de Descanso Rápido:</strong>
                    <span style="color:var(--accent-gold); font-weight:bold;">${this.quickRestsRemaining} / 2</span>
                </div>
                <div style="font-size:0.8rem; color:#888;">
                    • <strong>Descanso Rápido:</strong> Cura 25% a 50% de Vida e 50% de Mana. Inimigos não respawnam.<br>
                    • <strong>Descanso Longo:</strong> Cura 100% de Vida e Mana e restaura as 2 cargas. Porém, <strong>TODOS</strong> os inimigos do mundo renascem!
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
                <button id="camp-quick-rest" style="border-color:var(--rarity-rare); padding:0.6rem; text-align:left; font-size:0.85rem;" ${this.quickRestsRemaining <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                    ⚡ <strong>Descanso Rápido</strong> (${this.quickRestsRemaining}/2 cargas) — Cura 25%-50% HP e 50% MP
                </button>
                <button id="camp-long-rest" style="border-color:var(--accent-gold); padding:0.6rem; text-align:left; font-size:0.85rem;">
                    🌙 <strong>Descanso Longo</strong> — Cura 100% HP/MP (Todos os inimigos renascem!)
                </button>
            </div>

            <div style="display:flex; justify-content:space-between; gap:0.5rem; border-top:1px solid #333; padding-top:0.8rem;">
                <div style="display:flex; gap:0.5rem;">
                    <button id="camp-open-shop" style="font-size:0.85rem;">🛒 Loja</button>
                    <button id="camp-open-craft" style="font-size:0.85rem;">🔨 Forja</button>
                </div>
                <button id="world-dialog-close" style="font-size:0.85rem;">Fechar</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('world-dialog-close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        const btnQuick = document.getElementById('camp-quick-rest');
        if (btnQuick && this.quickRestsRemaining > 0) {
            btnQuick.addEventListener('click', () => {
                this.quickRest();
                close();
                this.updateHUD();
            });
        }

        document.getElementById('camp-long-rest').addEventListener('click', () => {
            this.longRest();
            close();
            this.updateHUD();
        });

        document.getElementById('camp-open-shop').addEventListener('click', () => {
            close();
            document.querySelector('[data-target="screen-shop"]')?.click();
        });

        document.getElementById('camp-open-craft').addEventListener('click', () => {
            close();
            document.querySelector('[data-target="screen-crafting"]')?.click();
        });
    }

    _disposeNpcPortrait() {
        if (this._activeNpcPortrait) {
            try {
                if (typeof this._activeNpcPortrait.dispose === 'function') {
                    this._activeNpcPortrait.dispose();
                }
            } catch (_) {
                // Ignore WebGL cleanup errors
            }
            this._activeNpcPortrait = null;
        }
    }

    _resolveNpcActionButtons(npc) {
        if (!npc || !Array.isArray(npc.actions)) return [];
        return npc.actions.map(act => {
            if (typeof act.onClick === 'function') return act;
            switch (act.actionType) {
                case 'forge':
                    return {
                        label: act.label || '🔨 Abrir Forja',
                        onClick: () => document.querySelector('[data-target="screen-crafting"]')?.click()
                    };
                case 'shop':
                    return {
                        label: act.label || '🛒 Abrir Loja',
                        onClick: () => document.querySelector('[data-target="screen-shop"]')?.click()
                    };
                case 'contracts':
                    return {
                        label: act.label || '📜 Contratos',
                        onClick: () => document.querySelector('[data-target="screen-contracts"]')?.click()
                    };
                case 'recruit':
                    return {
                        label: act.label || '🤝 Recrutar Aliado',
                        onClick: () => {
                            document.querySelector('[data-target="screen-character"]')?.click();
                            const presetBtn = document.getElementById('btn-recruit-preset');
                            if (presetBtn) {
                                presetBtn.click();
                            } else {
                                const addBtn = document.getElementById('btn-add-member') || document.getElementById('btn-add-party-member');
                                if (addBtn) addBtn.click();
                            }
                        }
                    };
                case 'tips':
                    return {
                        label: act.label || '💡 Dicas Táticas',
                        keepOpen: true,
                        onClick: () => {
                            const textEl = document.getElementById('world-dialog-text');
                            if (textEl) {
                                textEl.innerHTML = act.tipText || 'Explore todos os baús e santuários de cada região antes de desafiar o guardião do mapa!';
                            }
                        }
                    };
                default:
                    return act;
            }
        });
    }

    _showDialog(title, text, actionBtn = null, npc = null) {
        this._disposeNpcPortrait();
        const old = document.getElementById('world-dialog');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'world-dialog';
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.78);
            display:flex; align-items:center; justify-content:center;
            z-index:5000;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background:var(--bg-panel, #1e1e1e); border:1px solid var(--accent-gold, #d4af37);
            padding:1.5rem; max-width:520px; width:92%;
            box-shadow:0 0 24px rgba(212,175,55,0.35);
            animation:fadeIn 0.2s ease; border-radius:8px;
        `;

        const portraitMarkup = npc
            ? `<div id="world-dialog-npc3d" style="width:140px; height:160px; flex-shrink:0; background:rgba(0,0,0,0.45); border:1px solid rgba(212,175,55,0.35); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:3rem; overflow:hidden;">${npc.icon || '👤'}</div>`
            : '';

        box.innerHTML = `
            <div style="display:flex; gap:1rem; align-items:flex-start; margin-bottom:1.1rem;">
                ${portraitMarkup}
                <div style="flex:1; min-width:0;">
                    <h3 style="color:var(--accent-gold, #d4af37);margin:0 0 .6rem 0;">${title}</h3>
                    <p id="world-dialog-text" style="margin:0;line-height:1.6;color:#e5e5e5;">${text}</p>
                </div>
            </div>
            <div id="world-dialog-actions" style="display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:flex-end;">
                <button id="world-dialog-close">Fechar</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        if (npc) {
            const portraitEl = document.getElementById('world-dialog-npc3d');
            if (portraitEl && typeof window !== 'undefined' && window.Scene3D && window.Scene3D.NPCPortrait) {
                try {
                    const Ctor = window.Scene3D.NPCPortrait;
                    try {
                        this._activeNpcPortrait = new Ctor(portraitEl, npc.role || npc.id);
                    } catch (_) {
                        this._activeNpcPortrait = Ctor(portraitEl, npc.role || npc.id);
                    }
                } catch (_) {
                    this._activeNpcPortrait = null;
                }
            }
        }

        const close = () => {
            this._disposeNpcPortrait();
            overlay.remove();
        };
        document.getElementById('world-dialog-close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        const actionList = Array.isArray(actionBtn) ? actionBtn : (actionBtn ? [actionBtn] : []);
        const actionsContainer = document.getElementById('world-dialog-actions');
        const closeBtnEl = document.getElementById('world-dialog-close');

        actionList.forEach(act => {
            if (!act || !act.label || typeof act.onClick !== 'function') return;
            const btn = document.createElement('button');
            btn.textContent = act.label;
            btn.style.borderColor = 'var(--accent-gold, #d4af37)';
            btn.addEventListener('click', () => {
                if (!act.keepOpen) close();
                act.onClick();
            });
            actionsContainer.insertBefore(btn, closeBtnEl);
        });
    }

    _getNpcAt(tx, ty, radius = 0) {
        const list = this._objectsManuallySet
            ? [...(this.objects || []), ...this.getActiveNPCs()]
            : [...this.getActiveNPCs(), ...(this.currentMapId === 'floresta' ? (this.objects || []) : [])];
        return list.find(o => (!o.type || o.type === 'npc') && Math.abs(o.x - tx) <= radius && Math.abs(o.y - ty) <= radius) || null;
    }

    _talkToNpc(npc) {
        if (typeof window !== 'undefined' && window.gameAudio) window.gameAudio.play?.('npc');
        const eng = this._getEngine();
        if (eng) {
            eng.emit('systemLog', `${npc.name}: "${npc.dialogue}"`);
        }
        const actions = this._resolveNpcActionButtons(npc);
        this._showDialog(npc.name, npc.dialogue, actions, npc);
        return npc.dialogue;
    }

    handleTileClick(tx, ty) {
        // 1. Exact NPC tile match first
        let npc = this._getNpcAt(tx, ty, 0);
        if (npc) {
            this._talkToNpc(npc);
            return { type: 'npc', object: npc, dialogue: npc.dialogue };
        }

        const distFromPlayer = Math.hypot(tx - this.playerX, ty - this.playerY);

        // 2. Chest interaction within reach
        const chest = this.getActiveChests().find(c => !this._isChestOpened(c.id) && c.x === tx && c.y === ty);
        if (chest && this.revealed.has(`${tx},${ty}`) && distFromPlayer <= 1.5) {
            this._openChest(chest);
            return { type: 'chest', chest };
        }

        // 3. Shrine interaction within reach
        const shrine = this.getActiveShrines().find(s => !this._isShrineUsed(s.id) && s.x === tx && s.y === ty);
        if (shrine && this.revealed.has(`${tx},${ty}`) && distFromPlayer <= 1.5) {
            this._useShrine(shrine);
            return { type: 'shrine', shrine };
        }

        // 4. Enemy combat within reach
        const enemy = this.getActiveEnemies().find(e => !e.defeated && e.x === tx && e.y === ty);
        if (enemy && this.revealed.has(`${tx},${ty}`)) {
            if (distFromPlayer <= 1.5) {
                this.triggerEnemyCombat(enemy);
                return { type: 'combat', enemy: enemy };
            }
        }

        // 5. Camp click within reach
        if (this.currentMap.camp && tx === this.currentMap.camp.x && ty === this.currentMap.camp.y && distFromPlayer <= 1.5) {
            this.showCampDialog();
            return { type: 'camp' };
        }

        // 6. Forgiving radius-1 NPC click when clicking away from player's immediate step
        if (distFromPlayer > 1.5) {
            npc = this._getNpcAt(tx, ty, 1);
            if (npc) {
                this._talkToNpc(npc);
                return { type: 'npc', object: npc, dialogue: npc.dialogue };
            }
        }

        const dx = Math.sign(tx - this.playerX);
        const dy = Math.sign(ty - this.playerY);

        if (dx !== 0 && this.isWalkable(this.playerX + dx, this.playerY)) {
            this.movePlayer(dx, 0);
            return { type: 'move', x: this.playerX, y: this.playerY };
        } else if (dy !== 0 && this.isWalkable(this.playerX, this.playerY + dy)) {
            this.movePlayer(0, dy);
            return { type: 'move', x: this.playerX, y: this.playerY };
        } else if (dx !== 0 || dy !== 0) {
            this.movePlayer(dx, dy);
            return { type: 'move', x: this.playerX, y: this.playerY };
        }

        return null;
    }

    _handleCanvasClick(e) {
        if (this._hasDragged) {
            this._hasDragged = false;
            return null;
        }
        if (!this.canvas) return null;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / (rect.width || this.canvas.width || 1);
        const scaleY = this.canvas.height / (rect.height || this.canvas.height || 1);
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        const ts = this.tileSize;

        const tx = Math.floor(mx / ts + this.camX);
        const ty = Math.floor(my / ts + this.camY);

        return this.handleTileClick(tx, ty);
    }

    _centerCamOn(tx, ty) {
        this.camX = tx - this.viewTilesX / 2;
        this.camY = ty - this.viewTilesY / 2;
        this._clampCam();
    }

    _clampCam() {
        this.camX = Math.max(0, Math.min(Math.max(0, this.mapWidth  - this.viewTilesX), this.camX));
        this.camY = Math.max(0, Math.min(Math.max(0, this.mapHeight - this.viewTilesY), this.camY));
    }

    _resizeCanvas() {
        if (!this.canvas) return;
        const section = document.getElementById('screen-map');
        const rawW = section && section.clientWidth > 0 ? section.clientWidth - 32 : 860;
        const w = Math.max(300, Math.min(rawW, 900));
        const h = Math.round(w * 0.5);

        this.canvas.width  = w;
        this.canvas.height = h;
        this.tileSize    = w / 50;
        this.viewTilesX  = Math.ceil(w / this.tileSize);
        this.viewTilesY  = Math.ceil(h / this.tileSize);
        this._centerCamOn(this.playerX, this.playerY);
        this._dirty = true;
    }

    onShow() {
        this._resizeCanvas();
        this.updateHUD();
        this.draw();
    }

    _bindEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', e => this._handleCanvasClick(e));

        this.canvas.addEventListener('mousedown', e => {
            this._dragging   = true;
            this._hasDragged = false;
            this._dragStartX = e.clientX;
            this._dragStartY = e.clientY;
            this._camStartX  = this.camX;
            this._camStartY  = this.camY;
            this.canvas.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', e => {
            if (!this._dragging) return;
            const moveDist = Math.hypot(e.clientX - this._dragStartX, e.clientY - this._dragStartY);
            if (moveDist > 5) this._hasDragged = true;

            const dx = (e.clientX - this._dragStartX) / this.tileSize;
            const dy = (e.clientY - this._dragStartY) / this.tileSize;
            this.camX = this._camStartX - dx;
            this.camY = this._camStartY - dy;
            this._clampCam();
            this._dirty = true;
        });

        window.addEventListener('mouseup', () => {
            this._dragging = false;
            if (this.canvas) this.canvas.style.cursor = 'crosshair';
        });

        window.addEventListener('keydown', e => {
            const mapScreen = document.getElementById('screen-map');
            if (!mapScreen || !mapScreen.classList.contains('active')) return;
            const key = e.key.toLowerCase();
            if (e.key === 'ArrowLeft'  || key === 'a') { this.movePlayer(-1, 0); e.preventDefault(); }
            if (e.key === 'ArrowRight' || key === 'd') { this.movePlayer( 1, 0); e.preventDefault(); }
            if (e.key === 'ArrowUp'    || key === 'w') { this.movePlayer(0, -1); e.preventDefault(); }
            if (e.key === 'ArrowDown'  || key === 's') { this.movePlayer(0,  1); e.preventDefault(); }
        });

        window.addEventListener('resize', () => {
            this._resizeCanvas();
            this.draw();
        });

        const loop = () => {
            const mapActive = document.getElementById('screen-map')?.classList.contains('active');
            if (mapActive) {
                this.draw();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    async loadMap(url) {
        try {
            if (typeof fetch === 'undefined') return;
            const resp = await fetch(url);
            const json = await resp.json();
            if (this._objectsManuallySet) return;
            if (json && json.objects) {
                this._objects = json.objects;
            }
        } catch (e) {
            // Silently fallback in environments without fetch or static mock
        }
    }

    onRegionsUpdated() {
        this._dirty = true;
        this.updateHUD();
    }
}

if (typeof window !== 'undefined') {
    window.TileMap = TileMap;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileMap;
}
