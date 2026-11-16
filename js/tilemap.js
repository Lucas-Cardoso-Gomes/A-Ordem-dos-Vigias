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
        ]
    }
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

        // Player position (tile coords)
        this.playerX = this.currentMap.spawnX;
        this.playerY = this.currentMap.spawnY;

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
        this.reveal(this.playerX, this.playerY, this.currentMap.visionRadius, false);
        this._centerCamOn(this.playerX, this.playerY);

        // Subscribe to combatEnded to mark enemies defeated
        if (typeof Engine !== 'undefined') {
            Engine.on('combatEnded', (victory) => {
                if (victory && this.activeCombatEnemy) {
                    this.activeCombatEnemy.defeated = true;
                    if (typeof Engine !== 'undefined') {
                        Engine.emit('systemLog', `🏆 Inimigo ${this.activeCombatEnemy.name} foi derrotado!`);
                    }
                    this.activeCombatEnemy = null;
                    this._dirty = true;
                    this.updateHUD();
                    this.draw();
                    if (window.game) window.game.save();
                } else {
                    this.activeCombatEnemy = null;
                }
            });
        }

        // Optional legacy JSON loader for tests/backwards compatibility
        this.loadMap('assets/maps/world.json');
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

        // Set position
        this.playerX = (targetX !== null) ? targetX : this.currentMap.spawnX;
        this.playerY = (targetY !== null) ? targetY : this.currentMap.spawnY;

        // Reveal around spawn
        this.reveal(this.playerX, this.playerY, this.currentMap.visionRadius, false);
        this._centerCamOn(this.playerX, this.playerY);

        if (window.gameAudio) window.gameAudio.play('step');
        if (typeof Engine !== 'undefined') {
            Engine.emit('systemLog', `🗺️ Viajou para: ${this.currentMap.name}`);
        }

        this._dirty = true;
        this.updateHUD();
        this.draw();
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

    // ---------------------------------------------------------
    // Resting System (Base City in Floresta only)
    // ---------------------------------------------------------
    quickRest() {
        if (!this.isPlayerInCity()) {
            if (typeof Engine !== 'undefined') {
                Engine.emit('systemLog', '🔒 O descanso só é seguro dentro da Cidade (Acampamento de Alvorada na Floresta)!');
            }
            return false;
        }

        if (this.quickRestsRemaining <= 0) {
            if (typeof Engine !== 'undefined') {
                Engine.emit('systemLog', '⚠️ Você não possui mais descansos rápidos (0/2)! Faça um Descanso Longo para recuperar suas cargas.');
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

        if (typeof Engine !== 'undefined') {
            Engine.emit('playerUpdated', party[0]);
            Engine.emit('systemLog', `⚡ Descanso Rápido concluído! Curou 25%-50% de Vida e 50% de Mana. (Cargas restantes: ${this.quickRestsRemaining}/2)`);
        }
        return true;
    }

    longRest() {
        if (!this.isPlayerInCity()) {
            if (typeof Engine !== 'undefined') {
                Engine.emit('systemLog', '🔒 O descanso só é seguro dentro da Cidade (Acampamento de Alvorada na Floresta)!');
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

        if (typeof Engine !== 'undefined') {
            Engine.emit('playerUpdated', party[0]);
            Engine.emit('systemLog', `🌙 Descanso Longo concluído! Grupo 100% curado e cargas restauradas. Porém, TODOS os inimigos do mundo renasceram!`);
        }

        this._dirty = true;
        this.updateHUD();
        this.draw();
        if (window.game) window.game.save();
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
            if (window.gameAudio) window.gameAudio.play('blocked');
            return false;
        }

        this.playerX = targetX;
        this.playerY = targetY;

        // Reveal tiles
        this.reveal(this.playerX, this.playerY, this.currentMap.visionRadius, true);
        this._centerCamOn(this.playerX, this.playerY);

        if (window.gameAudio) window.gameAudio.play('step');

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
                if (typeof Engine !== 'undefined') {
                    Engine.emit('systemLog', `👁️ Nas sombras, ${ambushEnemy.name} avistou você e atacou!`);
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
            this.showCampDialog();
        }

        // Check Legacy NPC if any
        const npc = this._getNpcAt(this.playerX, this.playerY);
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

        if (window.gameAudio) window.gameAudio.play('combat');
        if (typeof Engine !== 'undefined') {
            Engine.emit('systemLog', `⚔️ Combate iniciado com ${enemy.name} (Nível ${enemy.level})!`);
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

        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        const startX = Math.max(0, Math.floor(this.camX));
        const startY = Math.max(0, Math.floor(this.camY));
        const endX   = Math.min(this.mapWidth,  startX + this.viewTilesX + 2);
        const endY   = Math.min(this.mapHeight, startY + this.viewTilesY + 2);

        // 1. Render Terrain Tiles
        this.renderMap(ctx, ts, startX, startY, endX, endY);

        // 2. Render Fog of War & Reveal Flash Animation
        this.drawFog(ctx, ts, startX, startY, endX, endY);

        // 3. Render Objects (Camp, Portals, Legacy NPCs)
        this._drawMapObjects(ctx, ts);

        // 4. Render Stationary Enemies
        this._drawEnemies(ctx, ts);

        // 5. Render Player
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

    _drawMapObjects(ctx, ts) {
        (this.currentMap.portals || []).forEach(p => {
            if (!this.revealed.has(`${p.x},${p.y}`)) return;
            const px = Math.floor((p.x - this.camX) * ts);
            const py = Math.floor((p.y - this.camY) * ts);

            ctx.font = `bold ${Math.max(8, ts * 0.55)}px Segoe UI`;
            ctx.fillStyle = 'var(--accent-gold, #d4af37)';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, px + ts / 2, py - 4);
        });

        (this.objects || []).forEach(obj => {
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
        const px = Math.floor((this.playerX - this.camX) * ts) + ts / 2;
        const py = Math.floor((this.playerY - this.camY) * ts) + ts / 2;

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

    _showDialog(title, text, actionBtn = null) {
        const old = document.getElementById('world-dialog');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'world-dialog';
        overlay.style.cssText = `
            position:fixed; inset:0; background:rgba(0,0,0,0.75);
            display:flex; align-items:center; justify-content:center;
            z-index:5000;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background:var(--bg-panel, #1e1e1e); border:1px solid var(--accent-gold, #d4af37);
            padding:1.5rem; max-width:420px; width:90%;
            box-shadow:0 0 20px rgba(212,175,55,0.3);
            animation:fadeIn 0.2s ease;
        `;

        box.innerHTML = `
            <h3 style="color:var(--accent-gold, #d4af37);margin-bottom:.8rem;">${title}</h3>
            <p style="margin-bottom:1.2rem;line-height:1.6;">${text}</p>
            <div id="world-dialog-actions" style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="world-dialog-close">Fechar</button>
            </div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('world-dialog-close').addEventListener('click', close);
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

        if (actionBtn) {
            const btn = document.createElement('button');
            btn.innerText = actionBtn.label;
            btn.style.borderColor = 'var(--accent-gold, #d4af37)';
            btn.addEventListener('click', () => {
                close();
                actionBtn.onClick();
            });
            document.getElementById('world-dialog-actions').prepend(btn);
        }
    }

    _getNpcAt(tx, ty, radius = 0) {
        return (this.objects || []).find(o => o.type === 'npc' && Math.abs(o.x - tx) <= radius && Math.abs(o.y - ty) <= radius) || null;
    }

    _talkToNpc(npc) {
        if (window.gameAudio) window.gameAudio.play('npc');
        if (typeof Engine !== 'undefined') {
            Engine.emit('systemLog', `${npc.name}: "${npc.dialogue}"`);
        }
        this._showDialog(npc.name, npc.dialogue);
        return npc.dialogue;
    }

    handleTileClick(tx, ty) {
        const npc = this._getNpcAt(tx, ty, 1);
        if (npc) {
            this._talkToNpc(npc);
            return { type: 'npc', object: npc, dialogue: npc.dialogue };
        }

        const enemy = this.getActiveEnemies().find(e => !e.defeated && e.x === tx && e.y === ty);
        if (enemy && this.revealed.has(`${tx},${ty}`)) {
            const dist = Math.hypot(enemy.x - this.playerX, enemy.y - this.playerY);
            if (dist <= 1.5) {
                this.triggerEnemyCombat(enemy);
                return { type: 'combat', enemy: enemy };
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
