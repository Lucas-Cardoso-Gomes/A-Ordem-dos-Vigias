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
            // Pick a random monster around player level
            const validMonsters = MonsterDatabase.monsters.filter(m => m.minLvl <= this.player.level + 10 && !m.isBoss);
            if (validMonsters.length === 0) continue;
            
            const target = validMonsters[Math.floor(Math.random() * validMonsters.length)];
            const targetQty = Engine.randomInt(3, 10);
            
            const xpReward = target.xp * targetQty * 1.5;
            const goldReward = target.gold * targetQty * 2;

            this.availableContracts.push({
                id: 'contract_' + Date.now() + '_' + i,
                title: `Contrato: Caça aos ${target.name}s`,
                desc: `A Ordem recebeu relatos de ataques. Elimine ${targetQty} ${target.name}s.`,
                type: 'kill',
                targetId: target.id,
                targetName: target.name,
                requiredQty: targetQty,
                currentQty: 0,
                rewards: {
                    xp: Math.floor(xpReward),
                    gold: Math.floor(goldReward)
                }
            });
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

    completeQuest(id) {
        const index = this.activeQuests.findIndex(q => q.id === id);
        if (index === -1) return false;

        const quest = this.activeQuests[index];
        if (quest.currentQty < quest.requiredQty) {
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