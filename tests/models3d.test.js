/**
 * tests/models3d.test.js
 * Tests for js/models3d.js and js/scene3d.js:
 * - jsdom / missing THREE / missing WebGL fallback
 * - Rig & animState contracts for all hero classes, NPCs, monsters/bosses, props
 * - Procedural animation modes & one-shots
 * - Scene3D active lifecycle, CombatArena VFX/syncState, WorldExplorer sync, WebGL context cap
 */

const Models3D = require('../js/models3d');
const Scene3D = require('../js/scene3d');

function createLightweightThreeMock() {
    class Vec3 {
        constructor(x = 0, y = 0, z = 0) {
            this.x = x; this.y = y; this.z = z;
        }
        set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    }

    class Object3D {
        constructor() {
            this.position = new Vec3();
            this.rotation = new Vec3();
            this.scale = new Vec3(1, 1, 1);
            this.children = [];
            this.parent = null;
            this.userData = {};
            this.visible = true;
            this.castShadow = false;
            this.receiveShadow = false;
        }
        add(obj) {
            if (!obj) return;
            obj.parent = this;
            this.children.push(obj);
        }
        remove(obj) {
            const idx = this.children.indexOf(obj);
            if (idx !== -1) this.children.splice(idx, 1);
            if (obj) obj.parent = null;
        }
        traverse(cb) {
            cb(this);
            for (const c of this.children) {
                if (c && typeof c.traverse === 'function') c.traverse(cb);
            }
        }
        lookAt() {}
        rotateX() {}
    }

    class Group extends Object3D {}
    class Mesh extends Object3D {
        constructor(geometry, material) {
            super();
            this.geometry = geometry;
            this.material = material;
        }
    }
    class Points extends Mesh {}
    class Sprite extends Mesh {}

    class BaseGeom {
        constructor(...args) { this.args = args; this.attributes = {}; this.disposed = false; }
        setAttribute(name, attr) { this.attributes[name] = attr; }
        dispose() { this.disposed = true; }
    }

    class ColorObj {
        constructor(hex = 0) { this.hex = hex; }
        setHex(hex) { this.hex = hex; }
    }

    class BaseMat {
        constructor(opts = {}) {
            Object.assign(this, opts);
            this.color = new ColorObj(opts.color || 0);
            if (opts.emissive !== undefined) this.emissive = new ColorObj(opts.emissive);
            this.disposed = false;
        }
        clone() {
            return new BaseMat({
                ...this,
                color: this.color.hex,
                emissive: this.emissive ? this.emissive.hex : undefined
            });
        }
        dispose() { this.disposed = true; }
    }

    class Scene extends Object3D {
        constructor() { super(); this.background = null; this.fog = null; }
    }

    class PerspectiveCamera extends Object3D {
        constructor(fov, aspect, near, far) {
            super();
            this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
        }
        updateProjectionMatrix() {}
    }

    class Light extends Object3D {
        constructor(color = 0xffffff, intensity = 1) {
            super();
            this.color = new ColorObj(color);
            this.intensity = intensity;
        }
    }

    class WebGLRenderer {
        constructor() {
            this.domElement = document.createElement('canvas');
            this.shadowMap = { enabled: false, type: null };
            this.disposed = false;
            this.contextLost = false;
        }
        setPixelRatio() {}
        setSize(w, h) { this.width = w; this.height = h; }
        render() {}
        dispose() { this.disposed = true; }
        forceContextLoss() { this.contextLost = true; }
    }

    return {
        DoubleSide: 2,
        PCFSoftShadowMap: 2,
        Group,
        Mesh,
        Points,
        Sprite,
        Scene,
        PerspectiveCamera,
        WebGLRenderer,
        Color: ColorObj,
        Vector2: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } },
        Vector3: Vec3,
        Float32BufferAttribute: class { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.needsUpdate = false; } },
        BufferGeometry: BaseGeom,
        BoxGeometry: BaseGeom,
        SphereGeometry: BaseGeom,
        CylinderGeometry: BaseGeom,
        ConeGeometry: BaseGeom,
        TorusGeometry: BaseGeom,
        RingGeometry: BaseGeom,
        PlaneGeometry: BaseGeom,
        CircleGeometry: BaseGeom,
        OctahedronGeometry: BaseGeom,
        DodecahedronGeometry: BaseGeom,
        MeshStandardMaterial: BaseMat,
        MeshBasicMaterial: BaseMat,
        PointsMaterial: BaseMat,
        SpriteMaterial: BaseMat,
        CanvasTexture: class { constructor(c) { this.image = c; this.needsUpdate = false; } dispose() {} },
        HemisphereLight: Light,
        DirectionalLight: Light,
        PointLight: Light,
        FogExp2: class { constructor(c, d) { this.color = c; this.density = d; } },
        Raycaster: class { setFromCamera() {} intersectObject() { return []; } }
    };
}

describe('Models3D & Scene3D', () => {
    let origTHREE;
    let origWebGL;
    let origGetContext;

    beforeEach(() => {
        origTHREE = window.THREE;
        origWebGL = window.WebGLRenderingContext;
        origGetContext = HTMLCanvasElement.prototype.getContext;
        document.body.innerHTML = '<div id="c1"></div><div id="c2"></div>';
    });

    afterEach(() => {
        window.THREE = origTHREE;
        window.WebGLRenderingContext = origWebGL;
        HTMLCanvasElement.prototype.getContext = origGetContext;
        delete global.THREE;
    });

    describe('1. jsdom / No-THREE / No-WebGL Graceful Fallback', () => {
        test('isWebGLAvailable returns false in jsdom and Models3D reports unavailable without THREE', () => {
            delete window.THREE;
            expect(Models3D.isAvailable()).toBe(false);
            expect(Scene3D.isWebGLAvailable()).toBe(false);

            expect(Models3D.createHeroModel({ playerClass: 'Guerreiro' })).toBeNull();
            expect(Models3D.createNPCModel('guia')).toBeNull();
            expect(Models3D.createMonsterModel({ id: 'mob1' })).toBeNull();
            expect(Models3D.createPropModel('tree', 'forest')).toBeNull();

            expect(() => Models3D.updateAnimation(null, 0.016)).not.toThrow();
            expect(() => Models3D.playOneShot(null, 'attack', 0.45)).not.toThrow();
        });

        test('isWebGLAvailable returns false even when THREE is mocked if canvas has no WebGL context', () => {
            window.THREE = createLightweightThreeMock();
            expect(Scene3D.isWebGLAvailable()).toBe(false);
        });

        test('all 5 Scene3D viewports construct and operate as safe no-ops in jsdom', () => {
            delete window.THREE;
            const el = document.getElementById('c1');

            const showcase = new Scene3D.HeroShowcase(el);
            expect(showcase._base.active).toBe(false);
            expect(() => {
                showcase.setParty([{ playerClass: 'Mago' }], 0);
                showcase.triggerAction(0, 'cast');
                showcase.resize();
                showcase.setVisible(false);
                showcase.dispose();
            }).not.toThrow();

            const portrait = Scene3D.NPCPortrait(el, 'ferreiro');
            expect(portrait._base.active).toBe(false);
            expect(() => {
                portrait.setNPC('oraculo');
                portrait.dispose();
            }).not.toThrow();

            const arena = new Scene3D.CombatArena(el);
            expect(arena._base.active).toBe(false);
            expect(() => {
                arena.setCameraPreset('tactical');
                arena.setHighlights({ moveTiles: [{ x: 1, y: 1 }] });
                arena.syncState({ party: [], monsters: [], activeTerrains: [] }, 'volcano');
                arena.playVFX({ type: 'fireball', from: { x: 0, y: 0 }, to: { x: 5, y: 5 } });
                arena.resize();
                arena.setVisible(true);
                arena.dispose();
            }).not.toThrow();
            expect(arena.animateMove('player_0', [{ x: 1, y: 1 }])).resolves.toBeUndefined();

            const world = new Scene3D.WorldExplorer(el, null);
            expect(world._base.active).toBe(false);
            expect(() => {
                world.syncFromTileMap();
                world.onMove(1, 1, 2, 1);
                world.resize();
                world.setVisible(false);
                world.dispose();
            }).not.toThrow();

            const victory = new Scene3D.VictoryDiorama(el, []);
            expect(victory._base.active).toBe(false);
            expect(() => victory.dispose()).not.toThrow();
        });
    });

    describe('2. Procedural Models, Rigs, Equipment & Animations with THREE Mock', () => {
        beforeEach(() => {
            window.THREE = createLightweightThreeMock();
        });

        const EXPECTED_RIG_KEYS = [
            'root', 'body', 'head', 'leftArm', 'rightArm',
            'leftLeg', 'rightLeg', 'weapon', 'shield', 'cape',
            'aura', 'wings', 'extras'
        ];

        test('createHeroModel builds distinct rigs for all 6 classes and reflects equipment rarity', () => {
            const classes = ['Guerreiro', 'Caçador', 'Guardião', 'Mago', 'Clérigo', 'Nenhuma'];
            const rarities = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];

            classes.forEach((cls, i) => {
                const hero = Models3D.createHeroModel({
                    name: `Hero_${cls}`,
                    playerClass: cls,
                    equipment: {
                        weaponMain: { id: 'w12', name: 'Martelo dos Deuses', rarity: rarities[i] },
                        weaponOff: { id: 'wo9', name: 'Aegis Sagrada', rarity: rarities[i], isShield: true }
                    }
                });

                expect(hero).toBeInstanceOf(window.THREE.Group);
                EXPECTED_RIG_KEYS.forEach(k => {
                    expect(hero.userData.rig[k]).toBeDefined();
                });
                expect(hero.userData.animState).toEqual({ mode: 'idle', time: 0, duration: 0, oneShot: false });
                expect(hero.userData.rig.weapon.children.length).toBeGreaterThan(0);
                expect(hero.userData.rig.shield.children.length).toBeGreaterThan(0);
            });

            // Mythic equipment should attach floor rarity aura ring
            const mythicHero = Models3D.createHeroModel({
                playerClass: 'Guerreiro',
                equipment: { weaponMain: { name: 'Espada Longa', rarity: 'mitico' } }
            });
            expect(mythicHero.userData.rig.aura.children.length).toBeGreaterThan(0);
        });

        test('createNPCModel builds all 12 NPC roles and legacy world.json aliases', () => {
            const roles = [
                'guia', 'ferreiro', 'mercadora', 'comandante', 'eremita', 'arquivista',
                'forjador', 'oraculo', 'pescador', 'soldado', 'feiticeira', 'monge',
                'npc_guia', 'npc_velho', 'npc_mercador'
            ];

            roles.forEach(role => {
                const npc = Models3D.createNPCModel(role);
                expect(npc).toBeInstanceOf(window.THREE.Group);
                expect(npc.userData.rig.body.children.length).toBeGreaterThan(0);
                expect(npc.userData.rig.head.children.length).toBeGreaterThan(0);
            });
        });

        test('createMonsterModel builds all 14 monsters/bosses and Phase 2 ascension', () => {
            const ids = [
                'mob1', 'mob2', 'mob3', 'mob4', 'mob5', 'mob6', 'mob7',
                'mob8', 'mob9', 'mob10', 'mob11', 'boss1', 'boss2', 'boss3'
            ];

            ids.forEach(id => {
                const mob = Models3D.createMonsterModel({ id, name: id });
                expect(mob).toBeInstanceOf(window.THREE.Group);
                EXPECTED_RIG_KEYS.forEach(k => expect(mob.userData.rig[k]).toBeDefined());
            });

            // Specific silhouette details
            const spider = Models3D.createMonsterModel({ id: 'mob4', name: 'Aranha Gigante' });
            expect(spider.userData.rig.extras.userData.spiderLegs).toHaveLength(8);

            const hydra = Models3D.createMonsterModel({ id: 'mob10', name: 'Hidra' });
            expect(hydra.userData.rig.head.userData.hydraNecks.length).toBeGreaterThanOrEqual(3);

            const dragon = Models3D.createMonsterModel({ id: 'boss2', name: 'Dragão Negro' });
            expect(dragon.userData.rig.wings.userData.flapPair).toHaveLength(2);

            const phase2Boss = Models3D.createMonsterModel({ id: 'boss3', name: 'Lorde Supremo do Caos', phase: 2 });
            expect(phase2Boss.userData.phase).toBe(2);
            expect(phase2Boss.userData.rig.aura.children.length).toBeGreaterThanOrEqual(2);
        });

        test('createPropModel builds all 10 prop types across biome themes', () => {
            const props = ['tree', 'rock', 'pillar', 'camp', 'portal', 'chest', 'chest_open', 'shrine', 'bridge', 'wall'];
            const themes = ['forest', 'cave', 'ruins', 'volcano', 'abyss'];

            props.forEach((propType, idx) => {
                const prop = Models3D.createPropModel(propType, themes[idx % themes.length]);
                expect(prop).toBeInstanceOf(window.THREE.Group);
                expect(prop.userData.propType).toBe(propType);
                expect(prop.userData.rig).toBeDefined();
            });
        });

        test('updateAnimation and playOneShot animate all 10 modes and handle one-shot completion', () => {
            const hero = Models3D.createHeroModel({ playerClass: 'Mago' });
            const modes = ['idle', 'walk', 'attack', 'cast', 'hit', 'defend', 'celebrate', 'talk', 'ultimate'];

            modes.forEach(mode => {
                Models3D.playOneShot(hero, mode, 0.45);
                expect(hero.userData.animState.mode).toBe(mode);
                expect(hero.userData.animState.oneShot).toBe(true);

                Models3D.updateAnimation(hero, 0.15);
                expect(hero.userData.animState.mode).toBe(mode);

                // Advance past duration -> should revert cleanly to idle
                Models3D.updateAnimation(hero, 0.10);
                Models3D.updateAnimation(hero, 0.10);
                Models3D.updateAnimation(hero, 0.15);
                expect(hero.userData.animState.mode).toBe('idle');
                expect(hero.userData.animState.oneShot).toBe(false);
            });

            // Death one-shot stays fallen in 'death' mode
            Models3D.playOneShot(hero, 'death', 0.4);
            Models3D.updateAnimation(hero, 0.1);
            Models3D.updateAnimation(hero, 0.1);
            Models3D.updateAnimation(hero, 0.1);
            Models3D.updateAnimation(hero, 0.15);
            expect(hero.userData.animState.mode).toBe('death');
            expect(hero.userData.rig.body.rotation.x).toBeLessThan(-1.0);
        });
    });

    describe('3. Scene3D Interactive Scenes & WebGL Context Management (Mocked WebGL)', () => {
        let createdScenes;

        beforeEach(() => {
            createdScenes = [];
            window.THREE = createLightweightThreeMock();
            window.WebGLRenderingContext = function () {};
            const mock2d = {
                clearRect: jest.fn(),
                fillRect: jest.fn(),
                strokeRect: jest.fn(),
                fillText: jest.fn(),
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                font: '',
                textAlign: 'center',
                textBaseline: 'top'
            };
            HTMLCanvasElement.prototype.getContext = jest.fn((kind) => {
                if (kind === '2d') return mock2d;
                if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') {
                    return { getExtension: () => null };
                }
                return null;
            });
            global.requestAnimationFrame = jest.fn(() => 1);
            global.cancelAnimationFrame = jest.fn();
        });

        afterEach(() => {
            createdScenes.forEach(s => s.dispose());
            createdScenes = [];
        });

        test('HeroShowcase and VictoryDiorama build formations, trigger actions, and dispose cleanly', () => {
            const c1 = document.getElementById('c1');
            const c2 = document.getElementById('c2');

            const party = [
                { name: 'Kael', playerClass: 'Guardião' },
                { name: 'Lyra', playerClass: 'Caçador' },
                { name: 'Aldric', playerClass: 'Mago' },
                { name: 'Seraphina', playerClass: 'Clérigo' }
            ];

            const showcase = new Scene3D.HeroShowcase(c1);
            createdScenes.push(showcase);
            expect(showcase._base.active).toBe(true);
            showcase.setParty(party, 2);
            expect(showcase.heroEntries).toHaveLength(4);
            expect(showcase.selectedIndex).toBe(2);

            showcase.triggerAction(2, 'cast');
            expect(showcase.heroEntries[2].model.userData.animState.mode).toBe('cast');

            const victory = new Scene3D.VictoryDiorama(c2, party);
            createdScenes.push(victory);
            expect(victory._base.active).toBe(true);
            expect(victory.heroModels).toHaveLength(4);
            expect(victory.heroModels[0].userData.animState.mode).toBe('celebrate');

            showcase.dispose();
            victory.dispose();
            expect(Scene3D.getActiveContextCount()).toBe(0);
        });

        test('CombatArena syncState, animateMove, all VFX types, camera presets, and dispose work cleanly', async () => {
            const container = document.getElementById('c1');
            const arena = new Scene3D.CombatArena(container);
            createdScenes.push(arena);
            expect(Scene3D.isWebGLAvailable()).toBe(true);
            expect(arena._base.active).toBe(true);

            arena.syncState({
                party: [
                    { name: 'Aldric', playerClass: 'Mago', gridX: 1, gridY: 4, hp: 90, maxHp: 100, shield: 20, statusEffects: [{ id: 'blessing' }] }
                ],
                monsters: [
                    { instanceId: 'm_1', id: 'boss3', name: 'Lorde do Caos', gridX: 22, gridY: 4, hp: 500, maxHp: 1000, phase: 2, isBoss: true }
                ],
                activeTerrains: [
                    { x: 10, y: 4, type: 'fire' },
                    { x: 11, y: 4, type: 'ice' },
                    { x: 12, y: 4, type: 'healing' },
                    { x: 13, y: 4, type: 'wall' }
                ],
                currentTurnEntity: { type: 'player', index: 0 },
                isSelectingMove: true,
                movementRemaining: 3
            }, 'abyss');

            expect(arena.unitMap.size).toBe(2);
            expect(arena.terrainMap.size).toBe(4);
            expect(arena.currentTheme).toBe('abyss');

            const movePromise = arena.animateMove('player_0', [{ x: 2, y: 4 }]);
            expect(arena.activeMovePaths.size).toBe(1);
            arena._update(1.0, 1.0); // Advance enough to reach target tile
            await movePromise;
            expect(arena.activeMovePaths.size).toBe(0);

            ['arrow', 'fireball', 'ice_shard', 'lightning', 'holy_beam', 'dark_orb', 'heal', 'shield', 'aoe', 'combo', 'ultimate', 'boss_phase2', 'slash'].forEach(type => {
                arena.playVFX({ type, sourceId: 'player_0', targetId: 'm_1', element: 'fogo' });
            });
            expect(arena.vfxList.length).toBe(13);
            arena._update(1.2, 2.2); // Expire all VFX
            expect(arena.vfxList.length).toBe(0);

            arena.setCameraPreset('tactical');
            expect(arena.cameraPreset).toBe('tactical');
            arena.setCameraPreset('close');
            expect(arena.cameraPreset).toBe('close');

            arena.dispose();
            expect(arena.unitMap.size).toBe(0);
            expect(Scene3D.getActiveContextCount()).toBe(0);
        });

        test('WorldExplorer syncs TileMap state and animates leader movement', () => {
            const container = document.getElementById('c1');
            const fakeTileMap = {
                currentMapId: 'floresta',
                mapWidth: 4,
                mapHeight: 3,
                playerX: 1,
                playerY: 1,
                revealed: new Set(['0,0', '1,0', '2,0', '1,1', '2,1', '3,1']),
                currentMap: {
                    theme: 'forest',
                    width: 4,
                    height: 3,
                    layout: [
                        'TTTT',
                        'T.CT',
                        'TRPE'
                    ]
                },
                objects: [],
                getActiveEnemies: () => [{ id: 'flo_1', baseMobId: 'mob1', x: 2, y: 1, defeated: false }],
                handleTileClick: jest.fn()
            };

            const explorer = new Scene3D.WorldExplorer(container, fakeTileMap);
            createdScenes.push(explorer);
            expect(explorer._base.active).toBe(true);
            expect(explorer._enemyMeshes.size).toBe(1);

            explorer.onMove(1, 1, 2, 1);
            expect(explorer._leaderModel.userData.animState.mode).toBe('walk');

            explorer.dispose();
            expect(Scene3D.getActiveContextCount()).toBe(0);
        });

        test('WebGL context budget automatically reclaims oldest scenes when exceeding limit', () => {
            for (let i = 0; i < 8; i++) {
                const div = document.createElement('div');
                document.body.appendChild(div);
                createdScenes.push(new Scene3D.NPCPortrait(div, 'guia'));
            }
            expect(Scene3D.getActiveContextCount()).toBeLessThanOrEqual(6);
            createdScenes.forEach(s => s.dispose());
            expect(Scene3D.getActiveContextCount()).toBe(0);
        });
    });
});
