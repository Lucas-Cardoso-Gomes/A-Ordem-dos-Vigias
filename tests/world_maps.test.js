const TileMap = require('../js/tilemap');

describe('World Maps & Progression System (5 Maps, Escalation, Bridge, Rest & Respawn)', () => {
    let mockCtx;
    let map;

    beforeEach(() => {
        document.body.innerHTML = `
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

        mockCtx = {
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
        canvas.getContext = jest.fn(() => mockCtx);
        canvas.getBoundingClientRect = jest.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 400
        }));

        global.requestAnimationFrame = jest.fn();

        window.gameParty = [
            { name: 'Lucas', level: 10, hp: 100, mana: 50, getMaxHp: () => 100, getMaxMana: () => 50, heal: function(v) { this.hp = Math.min(this.getMaxHp(), this.hp + v); } },
            { name: 'Vigiano', level: 10, hp: 120, mana: 60, getMaxHp: () => 120, getMaxMana: () => 60, heal: function(v) { this.hp = Math.min(this.getMaxHp(), this.hp + v); } }
        ];

        window.MonsterDatabase = {
            monsters: [
                { id: 'mob1', name: 'Goblin', minLvl: 1, maxLvl: 5, hp: 30, dmg: 5, xp: 10, gold: 5 },
                { id: 'mob4', name: 'Aranha', minLvl: 4, maxLvl: 10, hp: 40, dmg: 8, xp: 18, gold: 8 },
                { id: 'boss1', name: 'Lorde Vampiro', minLvl: 10, maxLvl: 25, hp: 200, dmg: 25, xp: 200, gold: 100, isBoss: true },
                { id: 'boss2', name: 'Dragão Negro', minLvl: 90, maxLvl: 100, hp: 5000, dmg: 250, xp: 5000, gold: 3000, isBoss: true },
                { id: 'boss3', name: 'Lorde Supremo do Caos', minLvl: 95, maxLvl: 120, hp: 6500, dmg: 320, xp: 8000, gold: 5000, isBoss: true }
            ]
        };

        window.gameCombat = {
            inCombat: false,
            startCombat: jest.fn()
        };

        map = new TileMap('world-canvas');
    });

    test('1. Colisão: árvores (T), rochas (R) e paredes (#) devem bloquear movimento', () => {
        map.switchMap('floresta', null, null, true);

        expect(map.getTileType(0, 0)).toBe('T');
        expect(map.isWalkable(0, 0)).toBe(false);

        expect(map.isWalkable(2, 2)).toBe(true);
        expect(map.isWalkable(1, 1)).toBe(true);

        expect(map.isWalkable(-1, 5)).toBe(false);
        expect(map.isWalkable(100, 5)).toBe(false);

        map.playerX = 1;
        map.playerY = 1;
        const initialX = map.playerX;
        const initialY = map.playerY;

        const moved = map.movePlayer(0, -1);
        expect(moved).toBe(false);
        expect(map.playerX).toBe(initialX);
        expect(map.playerY).toBe(initialY);
    });

    test('2. Pico Vulcânico: ponte sobre o magma é contínua e permite atravessar o rio de lava', () => {
        map.switchMap('vulcao', null, null, true);

        // A ponte está localizada nas colunas 12 a 18 na linha 8
        for (let col = 12; col <= 18; col++) {
            expect(map.isWalkable(col, 8)).toBe(true);
        }

        // Caminhar da esquerda (coluna 1) para a direita (coluna 32) através da ponte é 100% caminhável
        for (let col = 1; col <= 32; col++) {
            expect(map.isWalkable(col, 8)).toBe(true);
        }
    });

    test('3. Nenhum inimigo em nenhum dos 5 mapas fica preso em obstáculos sólidos', () => {
        const mapIds = ['floresta', 'caverna', 'ruinas', 'vulcao', 'abismo'];
        mapIds.forEach(mId => {
            map.switchMap(mId, null, null, true);
            const enemies = map.getActiveEnemies();
            expect(enemies.length).toBeGreaterThan(0);
            enemies.forEach(e => {
                const walkable = map.isWalkable(e.x, e.y);
                if (!walkable) {
                    console.error(`Inimigo ${e.id} preso em (${e.x}, ${e.y}) no mapa ${mId}! Tile: ${map.getTileType(e.x, e.y)}`);
                }
                expect(walkable).toBe(true);
            });
        });
    });

    test('4. Escalonamento exato para cada um dos 5 mapas conforme o nível do grupo', () => {
        // Nível do grupo = 10
        expect(map.getGroupLevel()).toBe(10);

        // Mapa 1: Inimigos mais fáceis, até 5 lvl menos do player [5, 10]
        for (let i = 0; i < 30; i++) {
            const lvl = map.getEnemyLevelForMap('floresta');
            expect(lvl).toBeGreaterThanOrEqual(5);
            expect(lvl).toBeLessThanOrEqual(10);
        }

        // Mapa 2: Inimigos fáceis, nível do player [9, 11]
        for (let i = 0; i < 30; i++) {
            const lvl = map.getEnemyLevelForMap('caverna');
            expect(lvl).toBeGreaterThanOrEqual(9);
            expect(lvl).toBeLessThanOrEqual(11);
        }

        // Mapa 3: Inimigos moderados, até 5 níveis acima do player [10, 15]
        for (let i = 0; i < 30; i++) {
            const lvl = map.getEnemyLevelForMap('ruinas');
            expect(lvl).toBeGreaterThanOrEqual(10);
            expect(lvl).toBeLessThanOrEqual(15);
        }

        // Mapa 4: Inimigos difíceis, até 10 níveis acima do player [13, 20]
        for (let i = 0; i < 30; i++) {
            const lvl = map.getEnemyLevelForMap('vulcao');
            expect(lvl).toBeGreaterThanOrEqual(13);
            expect(lvl).toBeLessThanOrEqual(20);
        }

        // Mapa 5: Difícil, até 20 níveis acima do player [18, 30]
        for (let i = 0; i < 30; i++) {
            const lvl = map.getEnemyLevelForMap('abismo');
            expect(lvl).toBeGreaterThanOrEqual(18);
            expect(lvl).toBeLessThanOrEqual(30);
        }
    });

    test('5. Rolagem de Respawn ao entrar em cada mapa respeita as probabilidades configuradas', () => {
        expect(TileMap.RESPAWN_CHANCES.floresta).toBe(0.10);
        expect(TileMap.RESPAWN_CHANCES.caverna).toBe(0.20);
        expect(TileMap.RESPAWN_CHANCES.ruinas).toBe(0.40);
        expect(TileMap.RESPAWN_CHANCES.vulcao).toBe(0.60);
        expect(TileMap.RESPAWN_CHANCES.abismo).toBe(0.75);

        // Forçar respawn no mapa 1
        map.enemiesByMap.floresta.forEach(e => e.defeated = true);
        expect(map.enemiesByMap.floresta.every(e => e.defeated)).toBe(true);

        map.respawnMapEnemies('floresta');
        expect(map.enemiesByMap.floresta.every(e => !e.defeated)).toBe(true);
    });

    test('6. Descanso só funciona na base (Floresta) e cumpre as regras de descanso rápido e longo', () => {
        // Tentar descansar fora da base (ex: na Caverna) deve falhar
        map.switchMap('caverna', null, null, true);
        expect(map.quickRest()).toBe(false);
        expect(map.longRest()).toBe(false);

        // Voltar para a base
        map.switchMap('floresta', null, null, true);
        expect(map.quickRestsRemaining).toBe(2);

        // Danificar o grupo
        window.gameParty[0].hp = 20;
        window.gameParty[0].mana = 10;
        window.gameParty[1].hp = 30;
        window.gameParty[1].mana = 15;

        // 1º Descanso rápido: cura 25%-50% HP e 50% Mana
        const quick1 = map.quickRest();
        expect(quick1).toBe(true);
        expect(map.quickRestsRemaining).toBe(1);
        expect(window.gameParty[0].hp).toBeGreaterThanOrEqual(45); // 20 + 25
        expect(window.gameParty[0].mana).toBe(35); // 10 + 25 (50% de 50)

        // 2º Descanso rápido: usa a última carga
        const quick2 = map.quickRest();
        expect(quick2).toBe(true);
        expect(map.quickRestsRemaining).toBe(0);

        // 3º Descanso rápido: deve falhar por falta de cargas
        const quick3 = map.quickRest();
        expect(quick3).toBe(false);

        // Matar alguns monstros no mundo
        map.enemiesByMap.floresta[0].defeated = true;
        map.enemiesByMap.vulcao[0].defeated = true;

        // Descanso Longo: cura 100%, restaura cargas e RESPAWNA TODOS os inimigos
        const longSuccess = map.longRest();
        expect(longSuccess).toBe(true);
        expect(window.gameParty[0].hp).toBe(100);
        expect(window.gameParty[0].mana).toBe(50);
        expect(window.gameParty[1].hp).toBe(120);
        expect(window.gameParty[1].mana).toBe(60);
        expect(map.quickRestsRemaining).toBe(2);

        // Todos os inimigos de todos os mapas renasceram
        expect(map.enemiesByMap.floresta.every(e => !e.defeated)).toBe(true);
        expect(map.enemiesByMap.vulcao.every(e => !e.defeated)).toBe(true);
    });

    test('7. Transição forçada a caminhar: portais conectam a progressão de 5 mapas', () => {
        expect(TileMap.MAPS.floresta.portals.some(p => p.targetMap === 'caverna')).toBe(true);
        expect(TileMap.MAPS.caverna.portals.some(p => p.targetMap === 'ruinas')).toBe(true);
        expect(TileMap.MAPS.ruinas.portals.some(p => p.targetMap === 'vulcao')).toBe(true);
        expect(TileMap.MAPS.vulcao.portals.some(p => p.targetMap === 'abismo')).toBe(true);
        expect(TileMap.MAPS.abismo.portals.some(p => p.targetMap === 'vulcao')).toBe(true);
    });
});
