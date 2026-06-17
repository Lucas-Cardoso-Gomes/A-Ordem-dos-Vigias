/**
 * quests.js
 * Contract generation and mission tracking.
 */

class QuestSystem {
    constructor(player) {
        this.player = player;
        this.activeQuests = [];
        this.availableContracts = [];
        this.completedCount = 0;
    }

    load(data) {
        if (!data) {
            this.generateContracts();
            return;
        }
        this.activeQuests = data.activeQuests || [];
        this.availableContracts = data.availableContracts || [];
        this.completedCount = data.completedCount || 0;
        
        if (this.availableContracts.length === 0) {
            this.generateContracts();
        }
    }

    save() {
        return {
            activeQuests: this.activeQuests,
            availableContracts: this.availableContracts,
            completedCount: this.completedCount
        };
    }

    generateContracts() {
        this.availableContracts = [];
        const numContracts = 3;

        for (let i = 0; i < numContracts; i++) {
            const questTypes = ['kill', 'gather', 'boss', 'explore'];
            const type = questTypes[Math.floor(Math.random() * questTypes.length)];
            
            let contract = null;
            
            if (type === 'kill') {
                const validMonsters = MonsterDatabase.monsters.filter(m => m.minLvl <= this.player.level + 10 && !m.isBoss);
                if (validMonsters.length > 0) {
                    const target = validMonsters[Math.floor(Math.random() * validMonsters.length)];
                    const targetQty = Engine.randomInt(3, 10);

                    contract = {
                        id: 'contract_' + Date.now() + '_' + i,
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
            } else if (type === 'gather') {
                const materials = ItemDatabase.materials;
                const target = materials[Math.floor(Math.random() * materials.length)];
                const targetQty = Engine.randomInt(3, 8);

                contract = {
                    id: 'contract_' + Date.now() + '_' + i,
                    title: `Coleta: ${target.name}`,
                    desc: `O Alquimista local precisa de ${targetQty} ${target.name}. Encontre-os e traga-os.`,
                    type: 'gather',
                    targetId: target.id,
                    targetName: target.name,
                    requiredQty: targetQty,
                    currentQty: 0,
                    rewards: {
                        xp: Math.floor(this.player.level * 50),
                        gold: Math.floor(target.value * targetQty * 3)
                    }
                };
            } else if (type === 'boss') {
                const validBosses = MonsterDatabase.monsters.filter(m => m.isBoss);
                if (validBosses.length > 0) {
                    const target = validBosses[Math.floor(Math.random() * validBosses.length)];

                    contract = {
                        id: 'contract_' + Date.now() + '_' + i,
                        title: `Ameaça Máxima: ${target.name}`,
                        desc: `Uma ameaça formidável foi detectada. Elimine o ${target.name}.`,
                        type: 'kill', // We use 'kill' type to process it the same way
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
            } else if (type === 'explore') {
                const unlockedRegionsKeys = MapSystem.unlockedRegions;
                const regionId = unlockedRegionsKeys[Math.floor(Math.random() * unlockedRegionsKeys.length)];
                const region = MapSystem.regions[regionId];

                if (region) {
                    const targetQty = Engine.randomInt(2, 5);
                    contract = {
                        id: 'contract_' + Date.now() + '_' + i,
                        title: `Exploração: ${region.name}`,
                        desc: `Patrulhe a região e complete ${targetQty} batalhas em ${region.name}.`,
                        type: 'explore',
                        targetId: regionId,
                        targetName: region.name,
                        requiredQty: targetQty,
                        currentQty: 0,
                        rewards: {
                            xp: Math.floor(this.player.level * 100),
                            gold: Math.floor(this.player.level * 50)
                        }
                    };
                }
            }

            if (contract) {
                this.availableContracts.push(contract);
            } else {
                // Retry if failed to generate specific type
                i--;
            }
        }
        Engine.emit('questsUpdated', this);
    }

    acceptContract(id) {
        const index = this.availableContracts.findIndex(c => c.id === id);
        if (index === -1) return false;

        if (this.activeQuests.length >= 5) {
            Engine.emit('systemLog', 'Você já atingiu o limite de missões ativas (5).');
            return false;
        }

        const contract = this.availableContracts.splice(index, 1)[0];
        this.activeQuests.push(contract);
        Engine.emit('systemLog', `Contrato Aceito: ${contract.title}`);
        Engine.emit('questsUpdated', this);
        return true;
    }

    processKillEvent(monsterId, qty = 1) {
        let updated = false;
        for (let quest of this.activeQuests) {
            if (quest.type === 'kill' && quest.targetId === monsterId) {
                if (quest.currentQty < quest.requiredQty) {
                    quest.currentQty += qty;
                    
                    // Garante que não ultrapasse o valor máximo da missão
                    if (quest.currentQty > quest.requiredQty) {
                        quest.currentQty = quest.requiredQty;
                    }
                    
                    updated = true;
                    if (quest.currentQty === quest.requiredQty) {
                        Engine.emit('systemLog', `Missão Concluída: ${quest.title}! Entregue na aba de Contratos.`);
                    }
                }
            }
        }
        if (updated) Engine.emit('questsUpdated', this);
    }

    processExploreEvent(regionId, qty = 1) {
        let updated = false;
        for (let quest of this.activeQuests) {
            if (quest.type === 'explore' && quest.targetId === regionId) {
                if (quest.currentQty < quest.requiredQty) {
                    quest.currentQty += qty;
                    if (quest.currentQty > quest.requiredQty) {
                        quest.currentQty = quest.requiredQty;
                    }
                    updated = true;
                    if (quest.currentQty === quest.requiredQty) {
                        Engine.emit('systemLog', `Missão Concluída: ${quest.title}! Entregue na aba de Contratos.`);
                    }
                }
            }
        }
        if (updated) Engine.emit('questsUpdated', this);
    }

    completeQuest(id) {
        const index = this.activeQuests.findIndex(q => q.id === id);
        if (index === -1) return false;

        const quest = this.activeQuests[index];

        // Special check for gather quests (check inventory at completion time)
        if (quest.type === 'gather') {
            const item = window.gameInventory.items.find(i => i.id === quest.targetId);
            if (!item || item.count < quest.requiredQty) {
                Engine.emit('systemLog', `Itens insuficientes. Você precisa de ${quest.requiredQty}x ${quest.targetName}.`);
                return false;
            } else {
                // Consume the items
                window.gameInventory.removeItem(item.instanceId, quest.requiredQty);
                quest.currentQty = quest.requiredQty; // Mark complete for rewards processing
            }
        } else if (quest.currentQty < quest.requiredQty) {
            Engine.emit('systemLog', 'Missão ainda não concluída.');
            return false;
        }

        // Rewards
        if (window.gameParty) {
            const livingPlayers = window.gameParty.filter(p => p.hp > 0);
            if (livingPlayers.length > 0) {
                const xpPerMember = Math.floor(quest.rewards.xp / window.gameParty.length);
                livingPlayers.forEach(p => p.gainXp(xpPerMember));
                window.gameParty[0].gainGold(quest.rewards.gold);
            } else {
                 // Fallback if all dead (shouldn't happen, but just in case)
                 window.gameParty[0].gainXp(quest.rewards.xp);
                 window.gameParty[0].gainGold(quest.rewards.gold);
            }
        } else {
            this.player.gainXp(quest.rewards.xp);
            this.player.gainGold(quest.rewards.gold);
        }
        
        // Potion or Material bonus 30% chance
        if (Engine.randomChance(30)) {
            Engine.emit('systemLog', 'O cliente enviou um item extra como agradecimento!');
            const bonus = Math.random() > 0.5 ? ItemDatabase.getPotion('p1') : ItemDatabase.getMaterial('m1');
            window.gameInventory.addItem(bonus); // Requires access to inventory
        }

        this.activeQuests.splice(index, 1);
        this.completedCount++;
        
        Engine.emit('systemLog', `Recompensas recebidas: ${quest.rewards.xp} XP, ${quest.rewards.gold} Ouro.`);
        
        if (this.availableContracts.length === 0) {
            this.generateContracts();
        } else {
            Engine.emit('questsUpdated', this);
        }
        
        return true;
    }
}

window.QuestSystem = QuestSystem;