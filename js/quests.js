/**
 * quests.js
 * Story Quests (Missões da Ordem) tracking the 5 maps / Relics + dynamic contract generation.
 */

const STORY_QUEST_DEFINITIONS = [
    {
        id: 'story_1',
        storyIndex: 1,
        isStory: true,
        mapId: 'floresta',
        targetRelic: 'relic_floresta',
        title: '📜 Missão da Ordem I: O Selo da Floresta',
        desc: 'Explore a Floresta dos Vigias, derrote o guardião da mata e recupere a relíquia Selo da Folha Eterna.',
        type: 'explore',
        targetId: 'relic_floresta',
        targetName: 'Selo da Folha Eterna',
        requiredQty: 1,
        rewards: { xp: 300, gold: 250, itemId: 'p4', itemType: 'potion' }
    },
    {
        id: 'story_2',
        storyIndex: 2,
        isStory: true,
        mapId: 'caverna',
        targetRelic: 'relic_caverna',
        title: '📜 Missão da Ordem II: Ecos nas Trevas',
        desc: 'Atravesse a Caverna dos Ecos, derrote o Lorde Vampiro e conquiste o Olho das Sombras.',
        type: 'explore',
        targetId: 'relic_caverna',
        targetName: 'Olho das Sombras',
        requiredQty: 1,
        rewards: { xp: 1000, gold: 800, itemId: 'p6', itemType: 'potion' }
    },
    {
        id: 'story_3',
        storyIndex: 3,
        isStory: true,
        mapId: 'ruinas',
        targetRelic: 'relic_ruinas',
        title: '📜 Missão da Ordem III: Ruínas Esquecidas',
        desc: 'Desvende as câmaras ancestrais, vença a Hidra Ancestral e recupere a Coroa dos Ancestrais.',
        type: 'explore',
        targetId: 'relic_ruinas',
        targetName: 'Coroa dos Ancestrais',
        requiredQty: 1,
        rewards: { xp: 2500, gold: 1800, itemId: 'p7', itemType: 'potion' }
    },
    {
        id: 'story_4',
        storyIndex: 4,
        isStory: true,
        mapId: 'vulcao',
        targetRelic: 'relic_vulcao',
        title: '📜 Missão da Ordem IV: Fúria Vulcânica',
        desc: 'Atravesse a ponte sobre o magma no Pico Vulcânico, derrote o Dragão Negro e obtenha o Coração de Magma.',
        type: 'explore',
        targetId: 'relic_vulcao',
        targetName: 'Coração de Magma',
        requiredQty: 1,
        rewards: { xp: 5000, gold: 3500, itemRarity: 'epico', itemLevel: 50 }
    },
    {
        id: 'story_5',
        storyIndex: 5,
        isStory: true,
        mapId: 'abismo',
        targetRelic: 'relic_abismo',
        title: '📜 Missão da Ordem V: O Trono do Caos',
        desc: 'Invada o Abismo do Caos, derrote o Lorde Supremo do Caos e conquiste o Fragmento do Vazio.',
        type: 'explore',
        targetId: 'relic_abismo',
        targetName: 'Fragmento do Vazio',
        requiredQty: 1,
        rewards: { xp: 12000, gold: 8000, itemRarity: 'mitico', itemLevel: 85 }
    }
];

class QuestSystem {
    constructor(player) {
        this.player = player;
        this.activeQuests = [];
        this.availableContracts = [];
        this.completedCount = 0;
        this.completedStoryIds = [];
        this._bindEngineListeners();
    }

    _getEngine() {
        if (typeof Engine !== 'undefined') return Engine;
        if (typeof window !== 'undefined' && window.Engine) return window.Engine;
        return null;
    }

    _emit(event, payload) {
        const eng = this._getEngine();
        if (eng && typeof eng.emit === 'function') {
            eng.emit(event, payload);
        }
    }

    _playAudio(name) {
        if (typeof window !== 'undefined' && window.gameAudio && typeof window.gameAudio.play === 'function') {
            window.gameAudio.play(name);
        }
    }

    _getMechanics() {
        if (typeof GameMechanics !== 'undefined') return GameMechanics;
        if (typeof window !== 'undefined' && window.GameMechanics) return window.GameMechanics;
        return null;
    }

    _getItemDb() {
        if (typeof ItemDatabase !== 'undefined') return ItemDatabase;
        if (typeof window !== 'undefined' && window.ItemDatabase) return window.ItemDatabase;
        return null;
    }

    _bindEngineListeners() {
        const eng = this._getEngine();
        if (!eng || typeof eng.on !== 'function' || this._boundEngine === eng) return;
        this._boundEngine = eng;
        eng.on('relicGranted', (relic) => {
            if (typeof window !== 'undefined' && window.gameQuests && window.gameQuests !== this) return;
            if (relic && relic.id) {
                this.processRelicEvent(relic.id);
            }
        });
    }

    ensureStoryQuest() {
        for (const def of STORY_QUEST_DEFINITIONS) {
            if (this.completedStoryIds.includes(def.id)) continue;
            const alreadyActive = this.activeQuests.find(q => q.id === def.id);
            if (!alreadyActive) {
                const clone = {
                    ...def,
                    currentQty: 0,
                    rewards: { ...def.rewards }
                };
                const gm = this._getMechanics();
                if (gm && typeof gm.hasRelic === 'function' && gm.hasRelic(clone.targetRelic)) {
                    clone.currentQty = clone.requiredQty;
                }
                this.activeQuests.unshift(clone);
            }
            break;
        }
        this.syncStoryQuests();
    }

    syncStoryQuests() {
        const gm = this._getMechanics();
        if (!gm || typeof gm.hasRelic !== 'function') return;
        let updated = false;
        for (const q of this.activeQuests) {
            if (q.isStory && q.targetRelic && gm.hasRelic(q.targetRelic) && q.currentQty < q.requiredQty) {
                q.currentQty = q.requiredQty;
                updated = true;
            }
        }
        if (updated) {
            this._emit('questsUpdated', this);
        }
    }

    processRelicEvent(relicId) {
        if (!relicId) return false;
        let updated = false;
        for (const q of this.activeQuests) {
            if (q.isStory && (q.targetRelic === relicId || q.targetId === relicId)) {
                if (q.currentQty < q.requiredQty) {
                    q.currentQty = q.requiredQty;
                    updated = true;
                    this._emit('systemLog', `Missão da Ordem Concluída: ${q.title}! Entregue na aba de Contratos.`);
                }
            }
        }
        if (updated) {
            this._emit('questsUpdated', this);
        }
        return updated;
    }

    load(data) {
        this._bindEngineListeners();
        if (!data) {
            this.activeQuests = [];
            this.completedStoryIds = [];
            this.completedCount = 0;
            this.ensureStoryQuest();
            this.generateContracts();
            return;
        }
        this.activeQuests = Array.isArray(data.activeQuests) ? data.activeQuests : [];
        this.availableContracts = Array.isArray(data.availableContracts) ? data.availableContracts : [];
        this.completedCount = data.completedCount || 0;
        this.completedStoryIds = Array.isArray(data.completedStoryIds) ? [...data.completedStoryIds] : [];

        this.ensureStoryQuest();
        if (this.availableContracts.length === 0) {
            this.generateContracts();
        }
    }

    save() {
        return {
            activeQuests: this.activeQuests,
            availableContracts: this.availableContracts,
            completedCount: this.completedCount,
            completedStoryIds: [...this.completedStoryIds]
        };
    }

    generateContracts() {
        this.availableContracts = [];
        const numContracts = 3;
        const eng = this._getEngine();
        const randInt = eng?.randomInt || ((min, max) => Math.floor(Math.random() * (max - min + 1)) + min);
        const monsterDb = (typeof MonsterDatabase !== 'undefined' ? MonsterDatabase : (typeof window !== 'undefined' ? window.MonsterDatabase : null));
        const itemDb = this._getItemDb();
        const mapSys = (typeof MapSystem !== 'undefined' ? MapSystem : (typeof window !== 'undefined' ? window.MapSystem : null));

        let attempts = 0;
        for (let i = 0; i < numContracts && attempts < 20; i++) {
            attempts++;
            const questTypes = ['kill', 'gather', 'boss', 'explore'];
            const type = questTypes[Math.floor(Math.random() * questTypes.length)];

            let contract = null;

            if (type === 'kill' && monsterDb && Array.isArray(monsterDb.monsters)) {
                const validMonsters = monsterDb.monsters.filter(m => m.minLvl <= (this.player?.level || 1) + 10 && !m.isBoss);
                if (validMonsters.length > 0) {
                    const target = validMonsters[Math.floor(Math.random() * validMonsters.length)];
                    const targetQty = randInt(3, 10);

                    contract = {
                        id: 'contract_' + Date.now() + '_' + i + '_' + attempts,
                        title: `Contrato: Caça aos ${target.name}s`,
                        desc: `A Ordem recebeu relatos de ataques. Elimine ${targetQty} ${target.name}s.`,
                        type: 'kill',
                        targetId: target.id,
                        targetName: target.name,
                        requiredQty: targetQty,
                        currentQty: 0,
                        rewards: {
                            xp: Math.floor(target.xp * targetQty * 1.5),
                            gold: Math.floor(target.gold * targetQty * 2)
                        }
                    };
                }
            } else if (type === 'gather' && itemDb && Array.isArray(itemDb.materials)) {
                const materials = itemDb.materials;
                const target = materials[Math.floor(Math.random() * materials.length)];
                const targetQty = randInt(3, 8);

                contract = {
                    id: 'contract_' + Date.now() + '_' + i + '_' + attempts,
                    title: `Coleta: ${target.name}`,
                    desc: `O Alquimista local precisa de ${targetQty} ${target.name}. Encontre-os e traga-os.`,
                    type: 'gather',
                    targetId: target.id,
                    targetName: target.name,
                    requiredQty: targetQty,
                    currentQty: 0,
                    rewards: {
                        xp: Math.floor((this.player?.level || 1) * 50),
                        gold: Math.floor(target.value * targetQty * 3)
                    }
                };
            } else if (type === 'boss' && monsterDb && Array.isArray(monsterDb.monsters)) {
                const validBosses = monsterDb.monsters.filter(m => m.isBoss);
                if (validBosses.length > 0) {
                    const target = validBosses[Math.floor(Math.random() * validBosses.length)];

                    contract = {
                        id: 'contract_' + Date.now() + '_' + i + '_' + attempts,
                        title: `Ameaça Máxima: ${target.name}`,
                        desc: `Uma ameaça formidável foi detectada. Elimine o ${target.name}.`,
                        type: 'kill',
                        targetId: target.id,
                        targetName: target.name,
                        requiredQty: 1,
                        currentQty: 0,
                        rewards: {
                            xp: Math.floor(target.xp * 2),
                            gold: Math.floor(target.gold * 3)
                        }
                    };
                }
            } else if (type === 'explore' && mapSys && Array.isArray(mapSys.unlockedRegions) && mapSys.unlockedRegions.length > 0) {
                const unlockedRegionsKeys = mapSys.unlockedRegions;
                const regionId = unlockedRegionsKeys[Math.floor(Math.random() * unlockedRegionsKeys.length)];
                const region = mapSys.regions?.[regionId];

                if (region) {
                    const targetQty = randInt(2, 5);
                    contract = {
                        id: 'contract_' + Date.now() + '_' + i + '_' + attempts,
                        title: `Exploração: ${region.name}`,
                        desc: `Patrulhe a região e complete ${targetQty} batalhas em ${region.name}.`,
                        type: 'explore',
                        targetId: regionId,
                        targetName: region.name,
                        requiredQty: targetQty,
                        currentQty: 0,
                        rewards: {
                            xp: Math.floor((this.player?.level || 1) * 100),
                            gold: Math.floor((this.player?.level || 1) * 50)
                        }
                    };
                }
            }

            if (contract) {
                this.availableContracts.push(contract);
            } else {
                i--;
            }
        }
        this._emit('questsUpdated', this);
    }

    acceptContract(id) {
        const index = this.availableContracts.findIndex(c => c.id === id);
        if (index === -1) return false;

        const contract = this.availableContracts.splice(index, 1)[0];
        this.activeQuests.push(contract);
        this._playAudio('quest');
        this._emit('systemLog', `Contrato Aceito: ${contract.title}`);
        this._emit('questsUpdated', this);
        return true;
    }

    processKillEvent(monsterId, qty = 1) {
        let updated = false;
        for (let quest of this.activeQuests) {
            if (quest.type === 'kill' && quest.targetId === monsterId) {
                if (quest.currentQty < quest.requiredQty) {
                    quest.currentQty = Math.min(quest.requiredQty, quest.currentQty + qty);
                    updated = true;
                    if (quest.currentQty === quest.requiredQty) {
                        this._emit('systemLog', `Missão Concluída: ${quest.title}! Entregue na aba de Contratos.`);
                    }
                }
            }
        }
        if (updated) this._emit('questsUpdated', this);
    }

    processExploreEvent(regionId, qty = 1) {
        let updated = false;
        for (let quest of this.activeQuests) {
            if (quest.type === 'explore' && !quest.isStory && quest.targetId === regionId) {
                if (quest.currentQty < quest.requiredQty) {
                    quest.currentQty = Math.min(quest.requiredQty, quest.currentQty + qty);
                    updated = true;
                    if (quest.currentQty === quest.requiredQty) {
                        this._emit('systemLog', `Missão Concluída: ${quest.title}! Entregue na aba de Contratos.`);
                    }
                }
            }
        }
        if (updated) this._emit('questsUpdated', this);
    }

    completeQuest(id) {
        const index = this.activeQuests.findIndex(q => q.id === id);
        if (index === -1) return false;
        const quest = this.activeQuests[index];

        this.syncStoryQuests();

        const inv = typeof window !== 'undefined' ? window.gameInventory : null;
        const party = typeof window !== 'undefined' && Array.isArray(window.gameParty) ? window.gameParty : null;
        const itemDb = this._getItemDb();
        const eng = this._getEngine();
        const randChance = eng?.randomChance || ((pct) => Math.random() * 100 <= pct);

        if (quest.type === 'gather') {
            if (!inv) return false;
            const totalCount = inv.countItem(quest.targetId);
            if (totalCount < quest.requiredQty) {
                this._emit('systemLog', `Itens insuficientes. Você precisa de ${quest.requiredQty}x ${quest.targetName}.`);
                return false;
            } else {
                inv.removeItemsById(quest.targetId, quest.requiredQty);
                quest.currentQty = quest.requiredQty;
            }
        } else if (quest.currentQty < quest.requiredQty) {
            this._emit('systemLog', 'Missão ainda não concluída.');
            return false;
        }

        // Distribuição de Recompensas
        if (party && party.length > 0) {
            const livingPlayers = party.filter(p => p.hp > 0);
            if (livingPlayers.length > 0) {
                const xpPerMember = Math.floor(quest.rewards.xp / party.length);
                livingPlayers.forEach(p => p.gainXp(xpPerMember));
                party[0].gainGold(quest.rewards.gold);
            } else {
                party[0].gainXp(quest.rewards.xp);
                party[0].gainGold(quest.rewards.gold);
            }
        } else if (this.player) {
            this.player.gainXp(quest.rewards.xp);
            this.player.gainGold(quest.rewards.gold);
        }

        // Recompensa garantida de item para Missões da Ordem
        if (inv && itemDb && quest.rewards) {
            if (quest.rewards.itemId) {
                const rewardItem = quest.rewards.itemType === 'material'
                    ? itemDb.getMaterial(quest.rewards.itemId)
                    : itemDb.getPotion(quest.rewards.itemId);
                if (rewardItem) inv.addItem(rewardItem);
            } else if (quest.rewards.itemRarity) {
                const gear = itemDb.generateItem(quest.rewards.itemLevel || (this.player?.level || 1), quest.rewards.itemRarity);
                if (gear) inv.addItem(gear);
            }
        }

        // Chance de bônus para contratos dinâmicos
        if (!quest.isStory && inv && itemDb && randChance(30)) {
            this._emit('systemLog', 'O cliente enviou um item extra como agradecimento!');
            const bonus = Math.random() > 0.5 ? itemDb.getPotion('p1') : itemDb.getMaterial('m1');
            if (bonus) inv.addItem(bonus);
        }

        this.activeQuests.splice(index, 1);
        this.completedCount++;

        if (quest.isStory && !this.completedStoryIds.includes(quest.id)) {
            this.completedStoryIds.push(quest.id);
            this.ensureStoryQuest();
        }

        this._playAudio('quest');
        const gm = this._getMechanics();
        if (gm && typeof gm.recordStat === 'function') {
            gm.recordStat('questsCompleted', 1);
        }

        this._emit('systemLog', `Recompensas recebidas: ${quest.rewards.xp} XP, ${quest.rewards.gold} Ouro.`);

        if (this.availableContracts.length === 0) {
            this.generateContracts();
        } else {
            this._emit('questsUpdated', this);
        }

        return true;
    }
}

QuestSystem.STORY_QUESTS = STORY_QUEST_DEFINITIONS;

if (typeof window !== 'undefined') {
    window.QuestSystem = QuestSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = QuestSystem;
}
