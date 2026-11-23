const TileMap = require('../js/tilemap');
const CombatSystem = require('../js/combat');

function createEventEngine() {
    const events = {};
    return {
        events,
        on(ev, fn) {
            if (!events[ev]) events[ev] = [];
            events[ev].push(fn);
        },
        emit(ev, data) {
            (events[ev] || []).forEach(fn => fn(data));
        },
        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        randomChance(pct) {
            return Math.random() * 100 <= pct;
        }
    };
}

function createMockHero(overrides = {}) {
    return {
        name: 'Aldric',
        level: 10,
        xp: 0,
        gold: 100,
        playerClass: 'Guerreiro',
        attributes: { str: 20, agi: 12, int: 14, def: 15, luk: 10 },
        equipment: {
            weaponMain: { id: 'w1', name: 'Espada Longa', type: 'weapon', minDmg: 10, maxDmg: 16, range: 1 }
        },
        hp: 300,
        mana: 200,
        fury: 0,
        shield: 0,
        statusEffects: [],
        getMaxHp() { return 300; },
        getMaxMana() { return 200; },
        getTotalAttr(k) { return this.attributes[k] || 10; },
        heal(amt) { this.hp = Math.min(this.getMaxHp(), this.hp + amt); },
        restoreMana(amt) { this.mana = Math.min(this.getMaxMana(), this.mana + amt); },
        gainXp(amt) { this.xp += amt; },
        gainGold(amt) { this.gold += amt; },
        ...overrides
    };
}

function createMockCanvas() {
    const mockCtx = {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        fillText: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
        globalAlpha: 1
    };
    const canvas = document.getElementById('world-canvas');
    if (canvas) {
        canvas.getContext = jest.fn(() => mockCtx);
        canvas.getBoundingClientRect = jest.fn(() => ({ left: 0, top: 0, width: 800, height: 400 }));
    }
    return mockCtx;
}

describe('World Enhancements: NPCs, Chests, Shrines, Relics, 3D & Audio Hooks', () => {
    let map;
    let mockGM;
    let mockAudio;

    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = `
            <button data-target="screen-contracts"></button>
            <button data-target="screen-shop"></button>
            <button data-target="screen-crafting"></button>
            <button data-target="screen-character"></button>
            <button id="btn-recruit-preset"></button>
            <section id="screen-map" class="screen active" style="width: 800px;">
                <h2 id="world-map-title"></h2>
                <span id="world-map-debuff" style="display:none;"></span>
                <span id="world-party-level"></span>
                <span id="world-enemy-scaling"></span>
                <div id="world-map-desc"></div>
                <div id="world-enemies-status"></div>
                <canvas id="world-canvas"></canvas>
            </section>
        `;
        createMockCanvas();
        global.requestAnimationFrame = jest.fn();

        global.Engine = createEventEngine();
        window.Engine = global.Engine;

        mockAudio = {
            play: jest.fn(),
            playMusic: jest.fn()
        };
        window.gameAudio = mockAudio;

        const party = [
            createMockHero({ name: 'Valerius Jr', level: 10, hp: 100, mana: 40, getMaxHp: () => 200, getMaxMana: () => 100 }),
            createMockHero({ name: 'Lyra', level: 10, hp: 80, mana: 30, getMaxHp: () => 160, getMaxMana: () => 120 })
        ];
        window.gameParty = party;

        window.gameInventory = {
            items: [],
            addItem: jest.fn(function (item) {
                this.items.push(item);
                return true;
            })
        };

        window.ItemDatabase = {
            materials: [{ id: 'm10', name: 'Minério de Ferro' }, { id: 'm2', name: 'Couro' }, { id: 'm5', name: 'Sangue' }, { id: 'm8', name: 'Cristal' }, { id: 'm9', name: 'Pó' }, { id: 'm4', name: 'Escamas' }, { id: 'm7', name: 'Essência' }],
            generateItem: jest.fn((lvl, rarity) => ({ id: 'gen_1', name: `Espada ${rarity}`, rarity: rarity || 'raro' })),
            getPotion: jest.fn(id => ({ id, name: `Poção ${id}`, type: 'potion' })),
            getMaterial: jest.fn(id => ({ id, name: `Mat ${id}`, type: 'material' }))
        };

        mockGM = {
            state: {
                relics: [],
                openedChests: [],
                usedShrines: [],
                ngPlusLevel: 0,
                stats: {}
            },
            grantRelic: jest.fn((id) => {
                if (!mockGM.state.relics.includes(id)) mockGM.state.relics.push(id);
                return true;
            }),
            hasRelic: jest.fn((id) => mockGM.state.relics.includes(id)),
            getPartyBonuses: jest.fn(() => ({
                visionBonus: mockGM.state.relics.includes('relic_caverna') ? 2 : 0
            })),
            applyStatus: jest.fn((entity, statusId, opts = {}) => {
                if (!entity.statusEffects) entity.statusEffects = [];
                entity.statusEffects.push({ id: statusId, ...opts });
                if (statusId === 'shield' && opts.shieldAmount) {
                    entity.shield = (entity.shield || 0) + opts.shieldAmount;
                }
            }),
            cleanseNegativeStatuses: jest.fn((entity) => {
                entity.statusEffects = (entity.statusEffects || []).filter(s => s.id === 'blessing' || s.id === 'shield');
            }),
            addFury: jest.fn((p, amt) => {
                p.fury = Math.min(100, (p.fury || 0) + amt);
            }),
            recordStat: jest.fn((k, v) => {
                mockGM.state.stats[k] = (mockGM.state.stats[k] || 0) + v;
            })
        };
        window.GameMechanics = mockGM;

        const portraitDispose = jest.fn();
        window.Scene3D = {
            isWebGLAvailable: jest.fn(() => true),
            NPCPortrait: jest.fn(() => ({ dispose: portraitDispose })),
            _portraitDispose: portraitDispose
        };

        map = new TileMap('world-canvas');
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.Engine;
        delete window.Engine;
        delete window.GameMechanics;
        delete window.Scene3D;
        delete window.gameAudio;
    });

    test('1. Todos os 5 mapas possuem NPCs, 2 Baús e 1 Santuário em tiles caminháveis e alcançáveis', () => {
        const expectedNpcRoles = {
            floresta: ['comandante', 'ferreiro', 'mercadora', 'guia'],
            caverna: ['eremita'],
            ruinas: ['arquivista'],
            vulcao: ['forjador'],
            abismo: ['oraculo']
        };

        for (const [mapId, roles] of Object.entries(expectedNpcRoles)) {
            const def = TileMap.MAPS[mapId];
            map.switchMap(mapId, null, null, true);

            // BFS reachability from spawn
            const visited = new Set([`${def.spawnX},${def.spawnY}`]);
            const queue = [[def.spawnX, def.spawnY]];
            while (queue.length > 0) {
                const [x, y] = queue.shift();
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const key = `${nx},${ny}`;
                    if (map.isWalkable(nx, ny) && !visited.has(key)) {
                        visited.add(key);
                        queue.push([nx, ny]);
                    }
                }
            }

            expect(def.npcs.map(n => n.role)).toEqual(roles);
            expect(def.chests).toHaveLength(2);
            expect(def.shrines).toHaveLength(1);

            [...def.npcs, ...def.chests, ...def.shrines].forEach(obj => {
                expect(map.isWalkable(obj.x, obj.y)).toBe(true);
                expect(visited.has(`${obj.x},${obj.y}`)).toBe(true);
            });
        }
    });

    test('2. Diálogo de NPC instancia #world-dialog-npc3d com Scene3D.NPCPortrait, ações e faz dispose ao fechar', () => {
        map.switchMap('floresta', 2, 2, true);
        const res = map.handleTileClick(3, 2); // Comandante Valerius

        expect(res).not.toBeNull();
        expect(res.type).toBe('npc');
        expect(res.object.role).toBe('comandante');

        const portraitContainer = document.getElementById('world-dialog-npc3d');
        expect(portraitContainer).not.toBeNull();
        expect(window.Scene3D.NPCPortrait).toHaveBeenCalledWith(portraitContainer, 'comandante');

        const dialog = document.getElementById('world-dialog');
        expect(dialog.textContent).toContain('Contratos');
        expect(dialog.textContent).toContain('Recrutar Aliado');

        document.getElementById('world-dialog-close').click();
        expect(window.Scene3D._portraitDispose).toHaveBeenCalledTimes(1);
        expect(document.getElementById('world-dialog')).toBeNull();
    });

    test('3. Baús concedem ouro/itens, tocam áudio e persistem em GameMechanics.state.openedChests', () => {
        map.switchMap('floresta', 12, 16, true);
        const initialGold = window.gameParty[0].gold;

        // Walk right onto chest_flo_1 at (13, 16)
        map.movePlayer(1, 0);

        expect(map.isChestOpened('chest_flo_1')).toBe(true);
        expect(mockGM.state.openedChests).toContain('chest_flo_1');
        expect(window.gameParty[0].gold).toBeGreaterThan(initialGold);
        expect(window.gameInventory.addItem).toHaveBeenCalled();
        expect(mockAudio.play).toHaveBeenCalledWith('chest');
        expect(mockGM.state.stats.chestsOpened).toBe(1);

        // Stepping on same chest again does not grant rewards twice
        const goldAfterFirst = window.gameParty[0].gold;
        const callsBefore = window.gameInventory.addItem.mock.calls.length;
        map.movePlayer(-1, 0);
        map.movePlayer(1, 0);
        expect(window.gameParty[0].gold).toBe(goldAfterFirst);
        expect(window.gameInventory.addItem.mock.calls.length).toBe(callsBefore);
    });

    test('4. Santuários aplicam bênçãos específicas e persistem em GameMechanics.state.usedShrines', () => {
        // Caverna Lantern Shrine: reveals wide area & restores 100% mana
        map.switchMap('caverna', 13, 7, true);
        const beforeRevealed = map.revealed.size;
        map.movePlayer(1, 0); // step onto (14, 7)

        expect(map.isShrineUsed('shrine_cav_1')).toBe(true);
        expect(mockGM.state.usedShrines).toContain('shrine_cav_1');
        expect(map.revealed.size).toBeGreaterThan(beforeRevealed);
        expect(window.gameParty[0].mana).toBe(100);
        expect(mockAudio.play).toHaveBeenCalledWith('shrine');

        // Abismo Order Shrine: full restore + +50 Fury
        map.switchMap('abismo', 23, 9, true);
        window.gameParty[0].hp = 10;
        window.gameParty[0].mana = 0;
        window.gameParty[0].fury = 10;
        map.movePlayer(1, 0); // step onto (24, 9)

        expect(map.isShrineUsed('shrine_abi_1')).toBe(true);
        expect(window.gameParty[0].hp).toBe(200);
        expect(window.gameParty[0].mana).toBe(100);
        expect(window.gameParty[0].fury).toBe(60);
    });

    test('5. Derrotar guardiões dos mapas concede Relíquias, aplica bônus de visão e emite campaignVictory no abi_5', () => {
        const guardianRelics = [
            ['floresta', 'flo_6', 'relic_floresta'],
            ['caverna', 'cav_8', 'relic_caverna'],
            ['ruinas', 'rui_6', 'relic_ruinas'],
            ['vulcao', 'vol_6', 'relic_vulcao'],
            ['abismo', 'abi_5', 'relic_abismo']
        ];

        const victoryListener = jest.fn();
        global.Engine.on('campaignVictory', victoryListener);

        guardianRelics.forEach(([mapId, enemyId, expectedRelic]) => {
            map.switchMap(mapId, null, null, true);
            const enemy = map.enemiesByMap[mapId].find(e => e.id === enemyId);
            map.activeCombatEnemy = enemy;
            global.Engine.emit('combatEnded', true);
            expect(mockGM.grantRelic).toHaveBeenCalledWith(expectedRelic);
            expect(enemy.defeated).toBe(true);
        });

        // Relic from caverna increases getEffectiveVisionRadius by +2 without changing reveal() circle math
        map.switchMap('caverna', null, null, true);
        expect(map.getEffectiveVisionRadius()).toBe(TileMap.MAPS.caverna.visionRadius + 2);
        expect(victoryListener).toHaveBeenCalledTimes(1);
        expect(mockAudio.play).toHaveBeenCalledWith('relic');
    });

    test('6. switchMap emite mapChanged, troca música, notifica explorer3D e NG+ escala inimigos', () => {
        const mapChangedListener = jest.fn();
        global.Engine.on('mapChanged', mapChangedListener);
        map.explorer3D = {
            syncFromTileMap: jest.fn(),
            onMove: jest.fn()
        };

        map.switchMap('vulcao', 2, 8, true);
        expect(mapChangedListener).toHaveBeenCalledWith(expect.objectContaining({ mapId: 'vulcao' }));
        expect(mockAudio.playMusic).toHaveBeenCalledWith('vulcao');
        expect(map.explorer3D.syncFromTileMap).toHaveBeenCalled();

        map.movePlayer(1, 0);
        expect(map.explorer3D.onMove).toHaveBeenCalledWith(2, 8, 3, 8);

        // restAtCamp alias opens camp dialog
        map.switchMap('floresta', 2, 2, true);
        map.restAtCamp();
        expect(document.getElementById('world-dialog')).not.toBeNull();
        expect(document.getElementById('world-dialog').textContent).toContain('Acampamento de Alvorada');

        // NG+ level scaling only activates when ngPlusLevel > 0
        mockGM.state.ngPlusLevel = 1;
        for (let i = 0; i < 10; i++) {
            expect(map.getEnemyLevelForMap('floresta')).toBeGreaterThanOrEqual(25);
        }
    });
});

describe('CombatSystem: Status Effects, Elemental Combos, Ultimates, Boss Phase 2 & VFX', () => {
    let combat;
    let party;
    let inventory;
    let mockGM;
    let mockAudio;
    let vfxEvents;
    let moveEvents;
    let phaseEvents;

    beforeEach(() => {
        jest.useFakeTimers();
        global.Engine = createEventEngine();
        window.Engine = global.Engine;

        vfxEvents = [];
        moveEvents = [];
        phaseEvents = [];
        global.Engine.on('combatVFX', e => vfxEvents.push(e));
        global.Engine.on('combatMove', e => moveEvents.push(e));
        global.Engine.on('bossPhaseChanged', e => phaseEvents.push(e));

        mockAudio = {
            play: jest.fn(),
            playMusic: jest.fn()
        };
        window.gameAudio = mockAudio;

        window.MonsterDatabase = {
            getLoot: jest.fn(m => ({ xp: m.xp || 50, gold: m.gold || 20, items: [] }))
        };

        window.gameTileMap = { currentMapId: 'vulcao' };

        // Realistic GameMechanics mock matching js/mechanics.js contract
        mockGM = {
            state: { stats: {}, relics: [] },
            applyStatus: jest.fn((entity, statusId, opts = {}) => {
                if (!entity.statusEffects) entity.statusEffects = [];
                const existing = entity.statusEffects.find(s => s.id === statusId);
                if (existing) {
                    existing.duration = Math.max(existing.duration, opts.duration || 3);
                } else {
                    entity.statusEffects.push({ id: statusId, duration: opts.duration || 3, damage: opts.damage || 15, ...opts });
                }
                if (statusId === 'shield' && opts.shieldAmount) {
                    entity.shield = (entity.shield || 0) + opts.shieldAmount;
                }
            }),
            checkElementalReaction: jest.fn((target, incomingElement, caster, baseDmg = 0) => {
                const statuses = target.statusEffects || [];
                const has = id => statuses.some(s => s.id === id);
                const remove = id => {
                    target.statusEffects = statuses.filter(s => s.id !== id);
                };
                if (incomingElement === 'gelo' && has('burn')) {
                    remove('burn');
                    return { id: 'thermal_shock', name: 'Choque Térmico', color: '#38bdf8', bonusDamage: Math.max(30, Math.floor(baseDmg * 0.8)) };
                }
                if (incomingElement === 'fogo' && has('poison')) {
                    remove('poison');
                    return { id: 'toxic_explosion', name: 'Explosão Tóxica', color: '#84cc16', bonusDamage: Math.max(35, Math.floor(baseDmg * 0.9)) };
                }
                if (incomingElement === 'raio' && has('frost')) {
                    remove('frost');
                    mockGM.applyStatus(target, 'stun', { duration: 1 });
                    return { id: 'crystal_overload', name: 'Sobrecarga Cristalina', color: '#facc15', bonusDamage: 40, stunApplied: true };
                }
                if (incomingElement === 'sagrado' && ((target.type || '').includes('Morto-vivo') || has('poison'))) {
                    const healAmt = 25;
                    if (caster && caster.heal) caster.heal(healAmt);
                    return { id: 'radiant_purge', name: 'Expurgo Radiante', color: '#fde047', bonusDamage: 35, healCaster: healAmt };
                }
                return null;
            }),
            processTurnStartStatuses: jest.fn((entity) => {
                const statuses = entity.statusEffects || [];
                let totalDamage = 0;
                let stunned = false;
                const remaining = [];
                statuses.forEach(s => {
                    if (s.id === 'burn' || s.id === 'poison') {
                        totalDamage += s.damage || 15;
                    }
                    if (s.id === 'stun') {
                        stunned = true;
                    }
                    s.duration = (s.duration || 1) - 1;
                    if (s.duration > 0) remaining.push(s);
                });
                entity.statusEffects = remaining;
                if (totalDamage > 0) {
                    entity.hp = Math.max(0, entity.hp - totalDamage);
                }
                return { stunned, skipTurn: stunned, totalDamage, ticks: [], expired: [], logs: [] };
            }),
            processMovementStatuses: jest.fn((entity, steps = 1) => {
                const bleed = (entity.statusEffects || []).find(s => s.id === 'bleed');
                if (!bleed) return { damage: 0, triggered: false };
                const dmg = (bleed.damage || 10) * Math.max(1, steps);
                entity.hp = Math.max(0, entity.hp - dmg);
                return { damage: dmg, triggered: true, status: 'bleed', message: `${entity.name} sangrou ${dmg}!` };
            }),
            getMovementMultiplier: jest.fn((entity) => {
                return (entity.statusEffects || []).some(s => s.id === 'frost') ? 0.5 : 1.0;
            }),
            getDamageDealtMultiplier: jest.fn((entity) => {
                return (entity.statusEffects || []).some(s => s.id === 'blessing') ? 1.25 : 1.0;
            }),
            getDamageTakenMultiplier: jest.fn((entity) => {
                return (entity.statusEffects || []).some(s => s.id === 'shock') ? 1.20 : 1.0;
            }),
            absorbDamageWithShield: jest.fn((entity, dmg) => {
                if (!entity.shield || entity.shield <= 0) return dmg;
                const absorbed = Math.min(entity.shield, dmg);
                entity.shield -= absorbed;
                return dmg - absorbed;
            }),
            cleanseNegativeStatuses: jest.fn((entity) => {
                entity.statusEffects = (entity.statusEffects || []).filter(s => s.id === 'blessing' || s.id === 'shield');
            }),
            addFury: jest.fn((p, amt) => {
                p.fury = Math.min(100, (p.fury || 0) + amt);
            }),
            getUltimateForClass: jest.fn((cls) => ({ name: cls === 'Mago' ? 'Colapso Arcano' : 'Lâmina do Cataclismo', multiplier: 4.5 })),
            recordStat: jest.fn((k, v) => {
                mockGM.state.stats[k] = (mockGM.state.stats[k] || 0) + v;
            })
        };
        window.GameMechanics = mockGM;

        party = [
            createMockHero({ name: 'Kael', playerClass: 'Guerreiro', attributes: { str: 20, agi: 30, int: 10, def: 15, luk: 10 } }),
            createMockHero({ name: 'Lyra', playerClass: 'Mago', attributes: { str: 10, agi: 12, int: 28, def: 10, luk: 10 } })
        ];
        inventory = { items: [], useItem: jest.fn(() => true), addItem: jest.fn() };
        combat = new CombatSystem(party, inventory);
    });

    afterEach(() => {
        jest.useRealTimers();
        delete global.Engine;
        delete window.Engine;
        delete window.GameMechanics;
        delete window.gameAudio;
        delete window.MonsterDatabase;
        delete window.gameTileMap;
    });

    test('1. Status Effects no turno (DoT & Stun), Frost no movimento, Bleed e emissão de combatMove com caminho A*', () => {
        const mob = { id: 'mob1', instanceId: 'm_1', name: 'Goblin', type: 'Comum', level: 5, maxHp: 500, hp: 500, dmg: 20, xp: 10, gold: 5 };
        // Force Kael to act first via deterministic randomInt
        jest.spyOn(global.Engine, 'randomInt').mockImplementation((min, max) => max === 20 ? 15 : Math.floor((min + max) / 2));

        mockGM.applyStatus(party[0], 'frost', { duration: 3 });
        mockGM.applyStatus(party[0], 'bleed', { duration: 3, damage: 10 });

        combat.startCombat([mob]);
        expect(mockAudio.playMusic).toHaveBeenCalledWith('combat');
        expect(combat.currentTurnEntity.type).toBe('player');

        // Frost halved movement: base (5 + 30/10 = 8) * 0.5 = 4
        expect(combat.movementRemaining).toBe(4);

        const hpBeforeMove = party[0].hp;
        const moved = combat.moveEntityTo(party[0].gridX + 2, party[0].gridY);
        expect(moved).toBe(true);
        expect(moveEvents).toHaveLength(1);
        expect(moveEvents[0].path).toHaveLength(3); // start + 2 steps
        expect(party[0].hp).toBe(hpBeforeMove - 20); // 10 * 2 steps bleed

        // Advance past Lyra to reach mob's turn; Stun skips monster's turn & DoT ticks on monster
        mockGM.applyStatus(mob, 'burn', { duration: 2, damage: 25 });
        mockGM.applyStatus(mob, 'stun', { duration: 1 });
        combat.nextTurn(); // Lyra
        combat.nextTurn(); // mob
        expect(mob.hp).toBe(475);
        // After stun skip timeout, turn returns to player
        jest.advanceTimersByTime(650);
        expect(combat.currentTurnEntity.type).toBe('player');
    });

    test('2. Ataque básico e Skills emitem combatVFX, calculam Fúria e disparam Reações Elementais', () => {
        const mob = { id: 'mob3', instanceId: 'm_2', name: 'Zumbi', type: 'Morto-vivo', level: 5, maxHp: 800, hp: 800, dmg: 15, weakness: ['fogo'] };
        jest.spyOn(global.Engine, 'randomInt').mockReturnValue(15);
        jest.spyOn(global.Engine, 'randomChance').mockImplementation(pct => pct >= 100);

        combat.startCombat([mob]);
        // Place hero adjacent to monster for melee & skill tests
        party[0].gridX = 5;
        party[0].gridY = 5;
        mob.gridX = 6;
        mob.gridY = 5;

        // Basic melee attack emits 'slash' VFX and grants +18 Fury
        combat.playerAttack('weaponMain');
        expect(vfxEvents.some(v => v.type === 'slash')).toBe(true);
        expect(mockAudio.play).toHaveBeenCalledWith('sword');
        expect(party[0].fury).toBe(18);

        jest.advanceTimersByTime(1400); // Advance to next turn (monster + back to player)
        jest.advanceTimersByTime(1000);

        // Turn back to player (make sure Kael is active)
        combat.currentTurnEntity = { type: 'player', index: 0 };
        combat.isProcessingTurn = false;

        // Skill 1: Fire skill applies 'burn'
        const fireSkill = { id: 's_mag_1', name: 'Dardo de Fogo', manaCost: 10, type: 'attack', multiplier: 2.0, element: 'fogo', statusEffect: 'burn', statusChance: 100, range: 5 };
        combat.playerSkill(fireSkill);
        expect(vfxEvents.some(v => v.type === 'projectile' && v.element === 'fogo')).toBe(true);
        expect(mob.statusEffects.some(s => s.id === 'burn')).toBe(true);
        expect(party[0].fury).toBe(18 + 15 + 12); // +15 skill +12 weakness!

        jest.advanceTimersByTime(1700);
        combat.currentTurnEntity = { type: 'player', index: 0 };
        combat.isProcessingTurn = false;

        // Skill 2: Ice AoE skill triggers Choque Térmico elemental reaction on burned mob!
        const hpBeforeIce = mob.hp;
        const iceAoE = { id: 's_mag_2', name: 'Onda de Frio', manaCost: 10, type: 'attack', multiplier: 2.0, element: 'gelo', isAoE: true, aoeRadius: 2, range: 5 };
        combat.playerSkill(iceAoE);

        expect(vfxEvents.some(v => v.type === 'aoe_burst' && v.element === 'gelo')).toBe(true);
        expect(vfxEvents.some(v => v.type === 'combo' && v.reaction === 'Choque Térmico')).toBe(true);
        expect(mockAudio.play).toHaveBeenCalledWith('combo');
        expect(mockGM.state.stats.elementalCombos).toBe(1);
        expect(mob.hp).toBeLessThan(hpBeforeIce - 30);
    });

    test('3. Supremo (useUltimate) consome 100 de Fúria, aplica efeitos épicos, VFX e áudio', () => {
        const mob = { id: 'mob1', instanceId: 'm_3', name: 'Goblin', type: 'Comum', level: 5, maxHp: 1000, hp: 1000, dmg: 10 };
        combat.startCombat([mob]);
        combat.currentTurnEntity = { type: 'player', index: 0 };
        combat.isProcessingTurn = false;

        // Fails below 100 fury
        party[0].fury = 99;
        expect(combat.useUltimate()).toBe(false);

        // Works at 100 fury
        party[0].fury = 100;
        const ok = combat.useUltimate();
        expect(ok).toBe(true);
        expect(party[0].fury).toBe(0);
        expect(mob.hp).toBeLessThan(1000);
        expect(vfxEvents.some(v => v.type === 'ultimate' && v.ultimateName === 'Lâmina do Cataclismo')).toBe(true);
        expect(mockAudio.play).toHaveBeenCalledWith('ultimate');
        expect(mockGM.state.stats.ultimatesUsed).toBe(1);
    });

    test('4. Boss Fase 2: cura 20%, aumenta dmg em 25%, gera terreno de perigo e emite eventos/áudio uma única vez', () => {
        const boss = {
            id: 'boss2',
            instanceId: 'b_1',
            name: 'Dragão Negro',
            type: 'Chefe Dragão',
            level: 90,
            maxHp: 1000,
            hp: 600,
            dmg: 100,
            isBoss: true,
            phase2Dialogue: 'O Dragão ergue asas flamejantes!'
        };

        combat.startCombat([boss]);
        expect(mockAudio.playMusic).toHaveBeenCalledWith('boss');

        combat.currentTurnEntity = { type: 'player', index: 0 };
        combat.isProcessingTurn = false;
        party[0].gridX = 5;
        party[0].gridY = 5;
        boss.gridX = 6;
        boss.gridY = 5;

        // Deal 200 raw damage -> drops boss from 600 to 400 (< 500 = 50%), triggers Phase 2!
        const res = combat._applyDamageToMonster(boss, 200, party[0]);
        expect(res.dmg).toBe(200);
        expect(boss.phase2Triggered).toBe(true);
        expect(boss.phase).toBe(2);
        // 400 + 20% of 1000 (200) = 600
        expect(boss.hp).toBe(600);
        expect(boss.dmg).toBe(125); // +25%
        expect(combat.activeTerrains.length).toBeGreaterThanOrEqual(4);
        expect(phaseEvents).toHaveLength(1);
        expect(vfxEvents.some(v => v.type === 'boss_phase2')).toBe(true);
        expect(mockAudio.play).toHaveBeenCalledWith('bossPhase');

        // Dropping below 50% a second time must NOT re-trigger Phase 2
        combat._applyDamageToMonster(boss, 200, party[0]);
        expect(phaseEvents).toHaveLength(1);
    });

    test('5. Edge cases: alcance AoE, terreno sagrado do Guardião, resistência INT ao Taunt, escudos e fallback sem GameMechanics', () => {
        const undead = { id: 'mob2', instanceId: 'u_1', name: 'Esqueleto', type: 'Morto-vivo', level: 5, maxHp: 200, hp: 200, dmg: 15, gridX: 20, gridY: 5 };
        const boss = { id: 'boss3', instanceId: 'b_3', name: 'Lorde do Caos', type: 'Chefe', level: 100, maxHp: 1000, hp: 1000, dmg: 50, isBoss: true, int: 60, gridX: 21, gridY: 5 };
        combat.startCombat([undead, boss]);
        combat.currentTurnEntity = { type: 'player', index: 0 };
        combat.isProcessingTurn = false;
        party[0].gridX = 1;
        party[0].gridY = 5;
        party[0].mana = 100;

        // AoE skill out of range must NOT spend mana
        const aoeSkill = { id: 's_gue_4', name: 'Giro', manaCost: 30, type: 'attack', multiplier: 2.0, isAoE: true, aoeRadius: 1, range: 2 };
        combat.playerSkill(aoeSkill);
        expect(party[0].mana).toBe(100);

        // Guardian 'holy' terrain heals & blesses allies and damages Morto-vivo
        party[0].hp = 150;
        const holySkill = { id: 's_grd_4', name: 'Terreno Sagrado', manaCost: 20, type: 'terrain', terrainType: 'holy', healAmount: 40, duration: 4, aoeRadius: 1, range: 2 };
        undead.gridX = 2;
        undead.gridY = 5;
        combat.playerSkill(holySkill, null, { x: 2, y: 5 });
        expect(party[0].hp).toBe(190);
        expect(party[0].statusEffects.some(s => s.id === 'blessing')).toBe(true);
        expect(undead.hp).toBeLessThan(200);

        // INT resistance roll on Taunt: boss has 25% resist chance
        const randSpy = jest.spyOn(Math, 'random').mockReturnValue(0.10); // < 0.25 -> resists!
        expect(combat.attemptTaunt(party[0], boss, 3)).toBe(false);
        expect(boss.tauntedBy).toBeUndefined();
        randSpy.mockReturnValue(0.50); // >= 0.25 -> taunted!
        expect(combat.attemptTaunt(party[0], boss, 3)).toBe(true);
        expect(boss.tauntedBy).toBe(party[0]);
        randSpy.mockRestore();

        // Shield absorbs damage before HP
        party[0].shield = 50;
        const hpBeforeShield = party[0].hp;
        combat._applyDamageToPlayer(party[0], 30, undead);
        expect(party[0].shield).toBe(20);
        expect(party[0].hp).toBe(hpBeforeShield);

        // End combat restores biome BGM
        combat.endCombat(true);
        expect(mockAudio.playMusic).toHaveBeenCalledWith('vulcao');

        // Graceful fallback when GameMechanics is not loaded
        delete window.GameMechanics;
        party[0].fury = 100;
        combat.startCombat([undead]);
        combat.currentTurnEntity = { type: 'player', index: 0 };
        combat.isProcessingTurn = false;
        expect(() => combat.useUltimate()).not.toThrow();
        expect(party[0].fury).toBe(0);
    });
});
