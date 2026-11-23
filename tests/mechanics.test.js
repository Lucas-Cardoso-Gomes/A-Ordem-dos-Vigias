const GameMechanics = require('../js/mechanics');
const SkillDatabase = require('../js/skills');
const Player = require('../js/player');
const MonsterDatabase = require('../js/monsters');
const ItemDatabase = require('../js/items');
const CraftingSystem = require('../js/crafting');
const Inventory = require('../js/inventory');
const QuestSystem = require('../js/quests');

describe('Core Mechanics, RPG Systems, Crafting, Inventory & Story Quests', () => {
    let emittedEvents;
    let playedSounds;

    beforeEach(() => {
        emittedEvents = [];
        playedSounds = [];

        global.Engine = {
            events: {},
            on(event, fn) {
                if (!this.events[event]) this.events[event] = [];
                this.events[event].push(fn);
            },
            emit(event, data) {
                emittedEvents.push({ event, data });
                if (this.events[event]) {
                    this.events[event].forEach(fn => fn(data));
                }
            },
            randomInt(min, max) {
                return Math.floor((min + max) / 2);
            },
            randomChance(pct) {
                return pct >= 50;
            }
        };

        window.Engine = global.Engine;
        window.GameMechanics = GameMechanics;
        window.SkillDatabase = SkillDatabase;
        window.MonsterDatabase = MonsterDatabase;
        window.ItemDatabase = ItemDatabase;
        window.CraftingSystem = CraftingSystem;
        window.gameAudio = {
            play: jest.fn((name) => playedSounds.push(name))
        };
        window.gameTileMap = null;
        window.gameCombat = null;
        window.MapSystem = {
            unlockedRegions: ['floresta'],
            regions: {
                floresta: { id: 'floresta', name: 'Floresta dos Vigias' }
            }
        };

        GameMechanics.reset();
    });

    describe('1. GameMechanics: Statuses, Combos, Fury, Relics & Companions', () => {
        test('STATUS_EFFECTS contains all 8 required statuses with full metadata', () => {
            const required = ['burn', 'poison', 'frost', 'shock', 'bleed', 'shield', 'blessing', 'stun'];
            required.forEach(id => {
                const s = GameMechanics.STATUS_EFFECTS[id];
                expect(s).toBeDefined();
                expect(s.id).toBe(id);
                expect(typeof s.name).toBe('string');
                expect(typeof s.icon).toBe('string');
                expect(typeof s.color).toBe('string');
                expect(typeof s.isDebuff).toBe('boolean');
                expect(typeof s.desc).toBe('string');
            });
            expect(GameMechanics.STATUS_EFFECTS.shield.isDebuff).toBe(false);
            expect(GameMechanics.STATUS_EFFECTS.blessing.isDebuff).toBe(false);
        });

        test('applyStatus, processTurnStartStatuses, processMovementStatuses, multipliers & shield', () => {
            const mob = { name: 'Goblin', hp: 100, maxHp: 100, statusEffects: [] };

            expect(GameMechanics.applyStatus(mob, 'burn', { duration: 2, potency: 12 })).toBeTruthy();
            expect(GameMechanics.applyStatus(mob, 'frost', { duration: 2 })).toBeTruthy();
            expect(GameMechanics.applyStatus(mob, 'shock', { duration: 2 })).toBeTruthy();
            expect(GameMechanics.applyStatus(mob, 'bleed', { duration: 3, potency: 7 })).toBeTruthy();

            expect(GameMechanics.getMovementMultiplier(mob)).toBe(0.5);
            expect(GameMechanics.getDamageTakenMultiplier(mob)).toBeCloseTo(1.2);

            const moveRes = GameMechanics.processMovementStatuses(mob, 2);
            expect(moveRes.triggered).toBe(true);
            expect(moveRes.damage).toBe(14);
            expect(mob.hp).toBe(86);

            const turnRes = GameMechanics.processTurnStartStatuses(mob);
            expect(turnRes.totalDamage).toBe(12);
            expect(mob.hp).toBe(74);
            expect(turnRes.stunned).toBe(false);

            // Shield absorption
            GameMechanics.applyStatus(mob, 'shield', { shieldAmount: 30, duration: 2 });
            expect(mob.shield).toBe(30);
            expect(GameMechanics.absorbDamageWithShield(mob, 20)).toBe(0);
            expect(mob.shield).toBe(10);
            expect(GameMechanics.absorbDamageWithShield(mob, 25)).toBe(15);
            expect(mob.shield).toBe(0);
            expect(GameMechanics.hasStatus(mob, 'shield')).toBe(false);

            // Stun blocks turn and movement
            GameMechanics.applyStatus(mob, 'stun', { duration: 1 });
            expect(GameMechanics.getMovementMultiplier(mob)).toBe(0);
            const stunTurn = GameMechanics.processTurnStartStatuses(mob);
            expect(stunTurn.stunned).toBe(true);
            expect(GameMechanics.hasStatus(mob, 'stun')).toBe(false);
        });

        test('cleanseNegativeStatuses removes targeted or all debuffs while preserving buffs', () => {
            const p = new Player();
            GameMechanics.applyStatus(p, 'poison', { duration: 3 });
            GameMechanics.applyStatus(p, 'bleed', { duration: 3 });
            GameMechanics.applyStatus(p, 'burn', { duration: 3 });
            GameMechanics.applyStatus(p, 'blessing', { duration: 3 });

            const partial = GameMechanics.cleanseNegativeStatuses(p, ['poison', 'bleed']);
            expect(partial).toEqual(['poison', 'bleed']);
            expect(GameMechanics.hasStatus(p, 'burn')).toBe(true);
            expect(GameMechanics.hasStatus(p, 'blessing')).toBe(true);

            const rest = GameMechanics.cleanseNegativeStatuses(p);
            expect(rest).toEqual(['burn']);
            expect(GameMechanics.hasStatus(p, 'blessing')).toBe(true);
        });

        test('checkElementalReaction handles all 4 elemental combos correctly', () => {
            // 1. fogo + poison => Explosão Tóxica
            const m1 = { name: 'Orc', hp: 200, maxHp: 200, statusEffects: [] };
            GameMechanics.applyStatus(m1, 'poison', { duration: 3 });
            const r1 = GameMechanics.checkElementalReaction(m1, 'fogo');
            expect(r1.name).toBe('Explosão Tóxica');
            expect(r1.bonusDamage).toBeGreaterThan(0);
            expect(GameMechanics.hasStatus(m1, 'poison')).toBe(false);

            // 2. raio + frost => Sobrecarga Cristalina (+stun)
            const m2 = { name: 'Lobisomem', hp: 200, maxHp: 200, statusEffects: [] };
            GameMechanics.applyStatus(m2, 'frost', { duration: 2 });
            const r2 = GameMechanics.checkElementalReaction(m2, 'raio');
            expect(r2.name).toBe('Sobrecarga Cristalina');
            expect(r2.stunApplied).toBe(true);
            expect(GameMechanics.hasStatus(m2, 'stun')).toBe(true);

            // 3. gelo + burn => Choque Térmico
            const m3 = { name: 'Hidra', hp: 300, maxHp: 300, statusEffects: [] };
            GameMechanics.applyStatus(m3, 'burn', { duration: 2 });
            const r3 = GameMechanics.checkElementalReaction(m3, 'gelo');
            expect(r3.name).toBe('Choque Térmico');
            expect(r3.bonusDamage).toBeGreaterThan(0);

            // 4. sagrado + Morto-vivo / poison (+heal caster) => Expurgo Radiante
            const caster = new Player();
            caster.hp = 50;
            const undead = { name: 'Esqueleto', type: 'Morto-vivo', hp: 150, maxHp: 150, statusEffects: [] };
            GameMechanics.applyStatus(undead, 'bleed', { duration: 2 });
            const r4 = GameMechanics.checkElementalReaction(undead, 'sagrado', caster);
            expect(r4.name).toBe('Expurgo Radiante');
            expect(r4.healCaster).toBeGreaterThan(0);
            expect(caster.hp).toBeGreaterThan(50);
            expect(GameMechanics.hasStatus(undead, 'bleed')).toBe(false);
        });

        test('Fury & Ultimates cover all 6 classes', () => {
            const expected = {
                'Guerreiro': 'Lâmina do Cataclismo',
                'Caçador': 'Tempestade Estelar',
                'Guardião': 'Égide da Ordem',
                'Mago': 'Colapso Arcano',
                'Clérigo': 'Alvorada Eterna',
                'Nenhuma': 'Golpe do Vigia'
            };

            for (const [cls, ultName] of Object.entries(expected)) {
                const ult = GameMechanics.getUltimateForClass(cls);
                expect(ult).toBeDefined();
                expect(ult.name).toBe(ultName);
            }

            const p = new Player();
            expect(GameMechanics.addFury(p, 45)).toBe(45);
            expect(GameMechanics.addFury(p, 80)).toBe(100);
            expect(GameMechanics.addFury(p, -150)).toBe(0);
        });

        test('Relics, Burn immunity, NG+, stats, and save/load persistence', () => {
            const p = new Player();
            window.gameParty = [p];
            const baseHp = p.getMaxHp();
            const baseAgi = p.getTotalAttr('agi');

            expect(GameMechanics.grantRelic('relic_floresta')).toBe(true);
            expect(GameMechanics.grantRelic('relic_floresta')).toBe(false); // no duplicates
            expect(p.getMaxHp()).toBe(Math.floor(baseHp * 1.15));

            GameMechanics.grantRelic('relic_caverna');
            expect(GameMechanics.getPartyBonuses().visionBonus).toBe(2);
            expect(p.getTotalAttr('agi')).toBe(Math.floor(baseAgi * 1.10));

            GameMechanics.grantRelic('relic_ruinas');
            expect(GameMechanics.getPartyBonuses().critBonus).toBe(10);
            p.gainXp(100);
            expect(p.level).toBe(2); // 100 * 1.2 = 120 >= 100

            GameMechanics.grantRelic('relic_vulcao');
            expect(GameMechanics.getDamageDealtMultiplier(p)).toBeCloseTo(1.15);
            expect(GameMechanics.applyStatus(p, 'burn', { duration: 3 })).toBe(false); // immune!

            GameMechanics.grantRelic('relic_abismo');
            expect(GameMechanics.state.campaignCompleted).toBe(true);
            expect(p.getTotalAttr('str')).toBe(Math.floor(10 * 1.25));

            // NG+
            GameMechanics.state.openedChests.push('chest_1');
            GameMechanics.state.usedShrines.push('shrine_1');
            GameMechanics.recordStat('kills', 12);

            const ng = GameMechanics.startNewGamePlus();
            expect(ng).toBe(1);
            expect(GameMechanics.state.openedChests).toEqual([]);
            expect(GameMechanics.state.usedShrines).toEqual([]);
            expect(GameMechanics.hasRelic('relic_abismo')).toBe(true);

            const saved = GameMechanics.save();
            GameMechanics.reset();
            expect(GameMechanics.state.relics).toEqual([]);
            GameMechanics.load(saved);
            expect(GameMechanics.state.relics).toHaveLength(5);
            expect(GameMechanics.state.ngPlusLevel).toBe(1);
            expect(GameMechanics.state.stats.kills).toBe(12);
        });

        test('PRESET_COMPANIONS provides 4 balanced heroes with valid classes and gear', () => {
            expect(GameMechanics.PRESET_COMPANIONS).toHaveLength(4);
            const names = GameMechanics.PRESET_COMPANIONS.map(c => c.name);
            expect(names).toEqual(['Kael', 'Lyra', 'Aldric', 'Seraphina']);

            GameMechanics.PRESET_COMPANIONS.forEach(comp => {
                const member = new Player();
                member.name = comp.name;
                member.attributes = { ...comp.attributes };
                expect(member.setClass(comp.playerClass)).toBe(true);
                expect(member.getSkills().length).toBeGreaterThanOrEqual(1);
                expect(Object.keys(comp.starterEquipment).length).toBeGreaterThanOrEqual(2);
            });
        });
    });

    describe('2. Skills & Player Updates', () => {
        test('Every class unlocks a reqLvl 1 starter skill and skills carry metadata', () => {
            const starters = {
                'Guerreiro': 'Corte Inicial',
                'Caçador': 'Disparo Rápido',
                'Guardião': 'Escudo Firme',
                'Mago': 'Centelha Arcana',
                'Clérigo': 'Prece Menor'
            };

            for (const [cls, skillName] of Object.entries(starters)) {
                const list = SkillDatabase.getSkillsForClass(cls, 1, () => 10);
                expect(list).toHaveLength(1);
                expect(list[0].reqLvl).toBe(1);
                expect(list[0].name).toBe(skillName);
                expect(list[0].desc.length).toBeGreaterThan(10);

                const all = SkillDatabase.getSkillsForClass(cls, 100, () => 10);
                all.forEach(sk => {
                    expect(typeof sk.desc).toBe('string');
                    expect(sk.desc.length).toBeGreaterThan(5);
                    expect(sk.element).toBeDefined();
                });
            }
        });

        test('Player allows Level 1 class choice, respects lock/forceRespec, and keeps legacy save compatibility', () => {
            const p = new Player();
            expect(p.fury).toBe(0);
            expect(p.statusEffects).toEqual([]);
            expect(p.shield).toBe(0);
            expect(p.roleTitle).toBe('');

            expect(p.setClass('Mago')).toBe(true);
            expect(p.playerClass).toBe('Mago');
            expect(p.classLocked).toBe(true);
            expect(p.setClass('Guerreiro')).toBe(false);
            expect(p.setClass('Guerreiro', true)).toBe(true);
            expect(p.playerClass).toBe('Guerreiro');

            // Level up emits event + plays sound
            p.gainXp(100);
            expect(p.level).toBe(2);
            expect(playedSounds).toContain('levelup');
            expect(emittedEvents.some(e => e.event === 'levelUp')).toBe(true);

            // Legacy save without new fields loads cleanly
            const legacyPlayer = new Player();
            legacyPlayer.load({
                name: 'Veterano',
                level: 10,
                xp: 50,
                gold: 500,
                attributes: { str: 20, agi: 12, int: 10, def: 15, luk: 10 },
                playerClass: 'Guardião',
                hp: 300,
                mana: 100
            });
            expect(legacyPlayer.name).toBe('Veterano');
            expect(legacyPlayer.classLocked).toBe(true);
            expect(legacyPlayer.fury).toBe(0);
            expect(legacyPlayer.statusEffects).toEqual([]);
            expect(legacyPlayer.shield).toBe(0);
        });
    });

    describe('3. Monsters, Items, Crafting, Inventory & Quests', () => {
        test('Monsters have rich descriptions, habitats, resists, and Boss Phase 2 data', () => {
            expect(MonsterDatabase.monsters).toHaveLength(14);
            MonsterDatabase.monsters.forEach(m => {
                expect(typeof m.desc).toBe('string');
                expect(m.desc.length).toBeGreaterThan(10);
                expect(typeof m.habitat).toBe('string');
                expect(m.elementalResists).toBeDefined();
            });

            ['boss1', 'boss2', 'boss3'].forEach(id => {
                const boss = MonsterDatabase.monsters.find(m => m.id === id);
                expect(boss.phase2Name).toBeDefined();
                expect(boss.phase2Dialogue).toBeDefined();
                expect(boss.phase2DmgMult).toBeGreaterThan(1);
                expect(boss.phase2Skill).toBeDefined();
                expect(boss.phase2Skill.name).toBeDefined();
            });
        });

        test('Items include new consumables and mythic gear', () => {
            expect(ItemDatabase.getPotion('p6').effect).toBe('fury');
            expect(ItemDatabase.getPotion('p7').effect).toBe('revive');
            expect(ItemDatabase.getPotion('p8').effect).toBe('fire_bomb');
            expect(ItemDatabase.weaponBases.some(w => w.id === 'w13')).toBe(true);
            expect(ItemDatabase.armorBases.some(a => a.id === 'a11')).toBe(true);
            expect(ItemDatabase.accessories.some(ac => ac.id === 'ac6')).toBe(true);
        });

        test('CraftingSystem crafts new recipes, guards city requirement, and plays forge/refine audio', () => {
            const p = new Player();
            p.level = 80;
            p.gold = 1000;
            const inv = new Inventory();
            window.gameParty = [p];

            for (let i = 0; i < 10; i++) inv.addItem(ItemDatabase.getMaterial('m5'));
            for (let i = 0; i < 10; i++) inv.addItem(ItemDatabase.getMaterial('m9'));
            for (let i = 0; i < 10; i++) inv.addItem(ItemDatabase.getMaterial('m10'));

            // Outside city -> blocked
            window.gameTileMap = { isPlayerInCity: () => false };
            expect(CraftingSystem.craft('c7', inv, p)).toBe(false);

            // Inside city -> succeeds
            window.gameTileMap = { isPlayerInCity: () => true };
            expect(CraftingSystem.craft('c7', inv, p)).toBe(true);
            expect(inv.countItem('p6')).toBe(1);
            expect(playedSounds).toContain('forge');

            // Refine equipment inside vs outside city
            const sword = ItemDatabase.generateItem(10, 'raro');
            sword.type = 'weapon';
            sword.minDmg = 10;
            sword.maxDmg = 20;
            inv.addItem(sword);

            window.gameTileMap = { isPlayerInCity: () => false };
            expect(CraftingSystem.refineEquipment(sword.instanceId, inv, p)).toBe(false);

            window.gameTileMap = { isPlayerInCity: () => true };
            expect(CraftingSystem.refineEquipment(sword.instanceId, inv, p)).toBe(true);
            expect(sword.name).toContain('+1');
            expect(playedSounds).toContain('refine');
        });

        test('Inventory useItem handles Antídoto, Elixir da Fúria, Poção da Fênix, and Bomba Incendiária', () => {
            const p = new Player();
            window.gameParty = [p];
            const inv = new Inventory();

            // Antídoto cleanses poison & bleed
            const antidote = ItemDatabase.getPotion('p3');
            inv.addItem(antidote);
            GameMechanics.applyStatus(p, 'poison', { duration: 3 });
            GameMechanics.applyStatus(p, 'bleed', { duration: 3 });
            expect(inv.useItem(antidote.instanceId, 0)).toBe(true);
            expect(GameMechanics.hasStatus(p, 'poison')).toBe(false);
            expect(GameMechanics.hasStatus(p, 'bleed')).toBe(false);
            expect(playedSounds).toContain('potion');

            // Elixir da Fúria
            const furyPot = ItemDatabase.getPotion('p6');
            inv.addItem(furyPot);
            expect(inv.useItem(furyPot.instanceId, 0)).toBe(true);
            expect(p.fury).toBe(50);

            // Poção da Fênix revives 0 HP ally
            p.hp = 0;
            const phoenix = ItemDatabase.getPotion('p7');
            inv.addItem(phoenix);
            expect(inv.useItem(phoenix.instanceId, 0)).toBe(true);
            expect(p.hp).toBe(Math.floor(p.getMaxHp() * 0.5));

            // Bomba Incendiária fails outside combat and works in combat
            const bomb = ItemDatabase.getPotion('p8');
            inv.addItem(bomb);
            expect(inv.useItem(bomb.instanceId, 0)).toBe(false);
            expect(inv.countItem('p8')).toBe(1);

            const mob = { instanceId: 'm_test', name: 'Goblin', hp: 100, maxHp: 100, statusEffects: [] };
            window.gameCombat = { inCombat: true, party: [p], monsters: [mob] };
            expect(inv.useItem(bomb.instanceId, 0)).toBe(true);
            expect(mob.hp).toBe(40);
            expect(GameMechanics.hasStatus(mob, 'burn')).toBe(true);
        });

        test('QuestSystem tracks 5 main Story Quests tied to Relics and progresses sequentially', () => {
            const p = new Player();
            const inv = new Inventory();
            window.gameParty = [p];
            window.gameInventory = inv;

            const qs = new QuestSystem(p);
            qs.load(null);

            expect(QuestSystem.STORY_QUESTS).toHaveLength(5);
            expect(qs.activeQuests[0].id).toBe('story_1');
            expect(qs.activeQuests[0].currentQty).toBe(0);

            // Granting relic_floresta automatically completes progress of story_1
            GameMechanics.grantRelic('relic_floresta');
            expect(qs.activeQuests[0].currentQty).toBe(1);

            expect(qs.completeQuest('story_1')).toBe(true);
            expect(playedSounds).toContain('quest');
            expect(qs.completedStoryIds).toContain('story_1');
            expect(qs.activeQuests.some(q => q.id === 'story_2')).toBe(true);
            expect(p.gold).toBeGreaterThanOrEqual(250);
            expect(inv.countItem('p4')).toBeGreaterThanOrEqual(1);
        });

        test('Player, Inventory, CraftingSystem and QuestSystem degrade safely when GameMechanics is not loaded', () => {
            delete window.GameMechanics;
            const prevGlobal = global.GameMechanics;
            delete global.GameMechanics;

            const p = new Player();
            window.gameParty = [p];
            p.setClass('Guerreiro');
            expect(p.getMaxHp()).toBeGreaterThan(0);
            p.gainXp(100);
            expect(p.level).toBe(2);

            const inv = new Inventory();
            const ant = ItemDatabase.getPotion('p3');
            inv.addItem(ant);
            expect(inv.useItem(ant.instanceId, 0)).toBe(true);

            const qs = new QuestSystem(p);
            qs.load(null);
            expect(qs.activeQuests.length).toBeGreaterThanOrEqual(1);

            global.GameMechanics = prevGlobal;
        });
    });
});
