const TileMap = require('../js/tilemap');
const worldData = require('../assets/maps/world.json');

describe('TileMap', () => {
    let mockCtx;
    let map;

    beforeEach(() => {
        document.body.innerHTML = `
            <section id="screen-map" class="screen active" style="width: 800px;">
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

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve(worldData)
            })
        );

        global.requestAnimationFrame = jest.fn();
        window.MapSystem = { unlockedRegions: ['floresta', 'helgen'] };

        map = new TileMap('world-canvas');
        map.objects = worldData.objects;
        map.revealed.clear();
        map.revealFlashes.clear();
        jest.clearAllMocks();
    });

    test('1. TileMap.reveal marca corretamente as tiles dentro do raio e respeita os limites do mapa', () => {
        const count = map.reveal(10, 10, 2);

        // Raio 2 circular: dx^2 + dy^2 <= 4 -> 13 tiles
        expect(count).toBe(13);
        expect(map.revealed.has('10,10')).toBe(true);
        expect(map.revealed.has('12,10')).toBe(true);
        expect(map.revealed.has('10,8')).toBe(true);
        expect(map.revealed.has('12,12')).toBe(false); // 2^2 + 2^2 = 8 > 4

        // Testa borda (0,0) para garantir que coordenadas negativas não são adicionadas
        map.revealed.clear();
        map.reveal(0, 0, 2);
        expect(map.revealed.has('-1,0')).toBe(false);
        expect(map.revealed.has('0,-1')).toBe(false);
        expect(map.revealed.has('0,0')).toBe(true);
    });

    test('2. renderMap desenha o tileset esperado para áreas reveladas e cobertas por névoa', () => {
        map.camX = 0;
        map.camY = 0;
        map.tileSize = 16;
        map.reveal(1, 1, 0); // Revela apenas (1,1)

        map.renderMap(mockCtx, 16, 0, 0, 2, 2);

        // 4 tiles renderizados (2x2): 3 ocultos (#000) e 1 revelado com cor de terreno rgb(...)
        expect(mockCtx.fillRect).toHaveBeenCalledTimes(4);
        expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1);
        expect(mockCtx.strokeRect).toHaveBeenCalledWith(16, 16, 16, 16);
    });

    test('3. Detecção de clique em NPCs retorna o diálogo correto e abre o modal', () => {
        // Guia da Floresta fica em (12, 18) no world.json
        map.camX = 0;
        map.camY = 0;
        map.tileSize = 16;
        map.reveal(12, 18, 2);

        const clickEvent = {
            clientX: 12 * 16 + 4,
            clientY: 18 * 16 + 4
        };

        const result = map._handleCanvasClick(clickEvent);

        expect(result).not.toBeNull();
        expect(result.type).toBe('npc');
        expect(result.object.id).toBe('npc_guia');
        expect(result.dialogue).toContain('Recruta! Bem-vindo');

        const dialog = document.getElementById('world-dialog');
        expect(dialog).not.toBeNull();
        expect(dialog.textContent).toContain('Guia da Floresta');
    });
});