/**
 * combat.js
 * Turn-based combat system logic for party.
 */

class CombatSystem {
    constructor(party, inventory) {
        this.party = party;
        this.inventory = inventory;
        this.monsters = [];
        this.targetIndex = 0;
        this.inCombat = false;

        this.turnQueue = []; // mix of party members and monsters
        this.currentTurnEntity = null;
    }

    startCombat(monstersArray) {
        this.monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        this.targetIndex = 0;
        this.inCombat = true;

        // Revive players with 1 HP if they entered combat dead (optional gameplay rule, let's keep it forgiving)
        this.party.forEach(p => {
            if (p.hp <= 0) p.hp = 1;
        });

        Engine.emit('combatStarted', this.monsters);

        if (this.monsters.length > 1) {
            this.logSystem(`O grupo encontrou um grupo de inimigos!`);
        } else {
            this.logSystem(`O grupo encontrou um ${this.monsters[0].name} (Nível ${this.monsters[0].level})!`);
        }

        this.buildTurnQueue();
        this.nextTurn();
    }

    buildTurnQueue() {
        this.turnQueue = [];
        this.logSystem('--- Nova Rodada (Iniciativa) ---');

        this.party.forEach((p, idx) => {
            if (p.hp > 0) {
                const roll = Engine.randomInt(1, 20);
                const agi = p.getTotalAttr('agi');
                const speed = roll + agi;
                this.turnQueue.push({ type: 'player', index: idx, speed: speed, ref: p });
                this.logSystem(`[Iniciativa] ${p.name} rolou d20(${roll}) + Agi(${agi}) = ${speed}`);
            }
        });

        this.monsters.forEach((m, idx) => {
            if (m.hp > 0) {
                const roll = Engine.randomInt(1, 20);
                // Assume base agility 10 for generic monsters, or scale with level
                const agi = 5 + Math.floor(m.level / 2);
                const speed = roll + agi;
                this.turnQueue.push({ type: 'monster', index: idx, speed: speed, ref: m });
                this.logSystem(`[Iniciativa] ${m.name} rolou d20(${roll}) + Agi(${agi}) = ${speed}`);
            }
        });

        this.turnQueue.sort((a, b) => b.speed - a.speed);
        Engine.emit('turnQueueUpdated', this.turnQueue);
    }

    nextTurn() {
        if (!this.inCombat) return;

        // Limpa queue de mortos
        this.turnQueue = this.turnQueue.filter(q => {
            if (q.type === 'player') return this.party[q.index].hp > 0;
            if (q.type === 'monster') return this.monsters[q.index].hp > 0;
            return false;
        });

        if (this.monsters.every(m => m.hp <= 0)) {
            this.winCombat();
            return;
        }

        if (this.party.every(p => p.hp <= 0)) {
            this.loseCombat();
            return;
        }

        if (this.turnQueue.length === 0) {
            this.buildTurnQueue();
        }

        this.currentTurnEntity = this.turnQueue.shift();

        Engine.emit('turnQueueUpdated', this.turnQueue);
        Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });

        if (this.currentTurnEntity.type === 'player') {
            const p = this.party[this.currentTurnEntity.index];
            this.logSystem(`Turno de ${p.name}.`);
            Engine.emit('turnStarted', this.currentTurnEntity.index);
        } else {
            const m = this.monsters[this.currentTurnEntity.index];
            Engine.emit('turnEnded', null);
            setTimeout(() => this.monsterAttack(m), 1000);
        }
    }

    getCurrentTarget() {
        if (this.monsters.length === 0) return null;
        if (this.monsters[this.targetIndex] && this.monsters[this.targetIndex].hp <= 0) {
            this.targetIndex = this.monsters.findIndex(m => m.hp > 0);
        }
        return this.monsters[this.targetIndex];
    }

    setTarget(index) {
        if (index >= 0 && index < this.monsters.length && this.monsters[index].hp > 0) {
            this.targetIndex = index;
            Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
        }
    }

    flee() {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;

        const p = this.party[this.currentTurnEntity.index];
        Engine.emit('turnEnded', null);

        const fleeChance = 50 + (p.getTotalAttr('agi') * 0.5);
        if (Engine.randomChance(fleeChance)) {
            this.logSystem(`O grupo conseguiu fugir com sucesso!`);
            this.endCombat(false);
        } else {
            this.logSystem(`Falha ao tentar fugir!`);
            this.nextTurn();
        }
    }

    playerAttack() {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        const p = this.party[this.currentTurnEntity.index];

        const target = this.getCurrentTarget();
        if (!target) return;

        Engine.emit('turnEnded', null);

        let { min, max, weaknessMods } = this.calculatePlayerDamage(p);
        let dmg = Engine.randomInt(min, max);

        const critChance = 5 + (p.getTotalAttr('luk') * 0.2) + (p.getTotalAttr('agi') * 0.1);
        let isCrit = false;
        if (Engine.randomChance(critChance)) {
            dmg = Math.floor(dmg * 1.5);
            isCrit = true;
        }

        let weaknessMultiplier = 1.0;
        let hitWeakness = false;
        for (let mod of weaknessMods) {
            if (target.weakness && target.weakness.includes(mod)) {
                weaknessMultiplier += 1.0;
                hitWeakness = true;
            }
        }

        if (p.playerClass === 'Caçador' && !p.equipment?.weaponMain?.magic) {
            dmg = Math.floor(dmg * 1.2);
        } else if (p.playerClass === 'Bruxo' && p.equipment?.weaponMain?.magic) {
            dmg = Math.floor(dmg * 1.2);
        } else if (p.playerClass === 'Exorcista' && target.type && target.type.includes('Morto-vivo')) {
            dmg = Math.floor(dmg * 1.3);
        }

        dmg = Math.floor(dmg * weaknessMultiplier);
        target.hp -= dmg;

        let msg = `${p.name} atacou ${target.name} e causou ${dmg} de dano.`;
        if (isCrit) msg = `Acerto Crítico! ` + msg;
        if (hitWeakness) msg += ` (Fraqueza explorada!)`;

        this.logPlayer(msg);
        Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: target.instanceId, dmg: dmg, isCrit: isCrit });

        setTimeout(() => {
            Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });

            if (target.hp <= 0) {
                target.hp = 0;
                this.processMonsterDeath(target);
            }

            if (this.monsters.every(m => m.hp <= 0)) {
                this.winCombat();
            } else {
                setTimeout(() => this.nextTurn(), 1000);
            }
        }, 300);
    }

    playerSkill(skill, targetPartyIndex = null) {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        const p = this.party[this.currentTurnEntity.index];

        if (!skill) return;

        if (p.mana < skill.manaCost) {
            this.logSystem(`${p.name} tem mana insuficiente. Requer ${skill.manaCost} Mana.`);
            return;
        }

        Engine.emit('turnEnded', null);
        p.mana -= skill.manaCost;
        Engine.emit('playerUpdated', p);

        if (skill.type === 'attack' || skill.type === 'drain') {
            const target = this.getCurrentTarget();
            if (!target && !skill.isAoE) {
                this.nextTurn();
                return;
            }

            let { min, max } = this.calculatePlayerDamage(p);
            let baseDmg = Engine.randomInt(min, max);

            let targets = [];
            if (skill.isAoE) {
                targets = this.monsters.filter(m => m.hp > 0);
            } else {
                const t = this.getCurrentTarget();
                if (t) targets.push(t);
            }

            if (targets.length === 0) return;

            let totalHeal = 0;
            let logMsg = `${p.name} usou [${skill.name}]`;
            if (skill.isAoE) logMsg += ` em todos os inimigos!`;

            let damageDealt = {};

            targets.forEach(t => {
                let dmg = Math.floor(baseDmg * skill.multiplier);
                let weaknessHit = false;

                if (skill.element && t.weakness && t.weakness.includes(skill.element)) {
                    dmg = Math.floor(dmg * 2.0);
                    weaknessHit = true;
                }

                if (dmg < 1) dmg = 1;
                t.hp -= dmg;
                damageDealt[t.instanceId] = dmg;

                if (skill.type === 'drain') {
                    const heal = Math.floor(dmg * 0.5);
                    totalHeal += heal;
                }

                if (!skill.isAoE) {
                    if (weaknessHit) logMsg += ` e causou ${dmg} de dano! (Fraqueza explorada!)`;
                    else logMsg += ` e causou ${dmg} de dano.`;
                }
                Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: t.instanceId, dmg: dmg });
            });

            this.logPlayer(logMsg);

            if (skill.type === 'drain' && totalHeal > 0) {
                p.heal(totalHeal);
                this.logPlayer(`[${skill.name}] curou ${totalHeal} HP de ${p.name}!`);
                Engine.emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: this.currentTurnEntity.index, dmg: totalHeal, isHeal: true });
            }

            setTimeout(() => {
                Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
                targets.forEach(t => {
                    if (t.hp <= 0) {
                        t.hp = 0;
                        this.processMonsterDeath(t);
                    }
                });

                if (this.monsters.every(m => m.hp <= 0)) {
                    this.winCombat();
                } else {
                    setTimeout(() => this.nextTurn(), 1000);
                }
            }, 600);

        } else if (skill.type === 'heal') {
            const targetP = (targetPartyIndex !== null && this.party[targetPartyIndex]) ? this.party[targetPartyIndex] : p;

            targetP.heal(skill.healAmount);
            this.logPlayer(`${p.name} usou [${skill.name}] e curou ${skill.healAmount} HP de ${targetP.name}!`);
            Engine.emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: this.party.indexOf(targetP), dmg: skill.healAmount, isHeal: true });

            setTimeout(() => {
                Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
                setTimeout(() => this.nextTurn(), 1000);
            }, 600);
        }
    }

    processMonsterDeath(monster) {
        this.logSystem(`${monster.name} foi derrotado!`);
        Engine.emit('combatAnimation', { target: 'monster', anim: 'death', monsterId: monster.instanceId });

        const loot = window.MonsterDatabase.getLoot(monster);

        // Split XP globally
        const xpPerMember = Math.floor(loot.xp / this.party.length);
        this.party.forEach(p => {
            if (p.hp > 0) p.gainXp(xpPerMember);
        });

        this.party[0].gainGold(loot.gold);

        this.logSystem(`Recebeu ${loot.xp} XP (${xpPerMember} para cada) e ${loot.gold} Ouro.`);

        loot.items.forEach(item => {
            this.inventory.addItem(item);
        });

        Engine.emit('bestiaryUpdate', monster);
        Engine.emit('questUpdate', { type: 'kill', monsterId: monster.id, qty: 1 });
    }

    monsterAttack(attacker) {
        if (!this.inCombat) return;

        // Choose a random living party member
        const livingPlayers = this.party.filter(p => p.hp > 0);
        if (livingPlayers.length === 0) {
            this.loseCombat();
            return;
        }

        const targetP = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
        const targetPIndex = this.party.indexOf(targetP);

        let defense = targetP.getTotalAttr('def');
        Object.values(targetP.equipment).forEach(item => {
            if (item && item.def) defense += item.def;
        });

        const actionRoll = Math.random();
        let dmg = 0;
        let actionType = 'normal';

        if (actionRoll > 0.85) actionType = 'special';
        else if (actionRoll > 0.70) actionType = 'defend';

        if (actionType === 'defend') {
            const heal = Math.floor(attacker.maxHp * 0.1);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            this.logMonster(`🛡️ ${attacker.name} assumiu uma postura defensiva (Curou ${heal} HP)!`);
            Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: attacker.instanceId, dmg: heal, isHeal: true });

            setTimeout(() => this.nextTurn(), 600);
            return;
        }

        if (actionType === 'special') {
            if (attacker.isBoss && attacker.id === 'boss1') {
                dmg = Math.floor(attacker.dmg * 1.2) - Math.floor(defense * 0.3);
                if (dmg < 1) dmg = 1;
                const heal = Math.floor(dmg * 0.8);
                attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
                this.logMonster(`⚠️ ${attacker.name} usou [Dreno Sombrio] em ${targetP.name} causando ${dmg} de dano e curando ${heal} HP!`);
                Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: attacker.instanceId, dmg: heal, isHeal: true });
            } else if (attacker.isBoss) {
                dmg = Math.floor(attacker.dmg * 1.8) - Math.floor(defense * 0.1);
                if (dmg < 1) dmg = 1;
                this.logMonster(`🔥 ${attacker.name} usou [Golpe Devastador] em ${targetP.name} obliterando a defesa por ${dmg} de dano!`);
            } else {
                dmg = Math.floor(attacker.dmg * 1.3) - Math.floor(defense * 0.4);
                if (dmg < 1) dmg = 1;
                this.logMonster(`⚔️ ${attacker.name} usou [Ataque Feroz] em ${targetP.name} causando ${dmg} de dano!`);
            }
        } else {
            dmg = attacker.dmg - Math.floor(defense * 0.5);
            if (dmg < 1) dmg = 1;
            this.logMonster(`${attacker.name} atacou ${targetP.name} e causou ${dmg} de dano.`);
        }

        Engine.emit('combatAnimation', { target: 'monster', anim: 'attack', monsterId: attacker.instanceId });

        setTimeout(() => {
            targetP.hp -= dmg;
            Engine.emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: targetPIndex, dmg: dmg });
            Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
            Engine.emit('playerUpdated', targetP);

            if (targetP.hp <= 0) {
                targetP.hp = 0;
            }

            setTimeout(() => this.nextTurn(), 600);
        }, 300);
    }

    calculatePlayerDamage(p) {
        let min = 1 + Math.floor(p.getTotalAttr('str') * 0.5);
        let max = 2 + p.getTotalAttr('str');
        let weaknessMods = [];

        const mainWeapon = p.equipment?.weaponMain;
        if (mainWeapon) {
            min += mainWeapon.minDmg || 0;
            max += mainWeapon.maxDmg || 0;
            if (mainWeapon.weakness) weaknessMods.push(mainWeapon.weakness);

            if (mainWeapon.magic) {
                min += Math.floor(p.getTotalAttr('int') * 0.8);
                max += p.getTotalAttr('int');
            }
        }

        const offWeapon = p.equipment?.weaponOff;
        if (offWeapon && offWeapon.type === 'weapon') {
            min += Math.floor((offWeapon.minDmg || 0) * 0.5);
            max += Math.floor((offWeapon.maxDmg || 0) * 0.5);
            if (offWeapon.weakness) weaknessMods.push(offWeapon.weakness);
        }

        return { min, max, weaknessMods };
    }

    winCombat() {
        this.logSystem(`O grupo venceu o combate!`);
        
        const repMonster = this.monsters.find(m => m.regionId);

        if (repMonster && repMonster.regionId) {
            const regionId = repMonster.regionId;
            const regionData = window.MapSystem.getRegionDetails(regionId);
            
            if (repMonster.isCampaign) {
                window.MapSystem.progress[regionId]++;
            }
            
            const isLastBattle = repMonster.battleIndex === (regionData.encounters.length - 1);
            const isCompleted = window.MapSystem.progress[regionId] >= regionData.encounters.length;
            
            if (regionData && (isLastBattle || isCompleted)) {
                if (repMonster.isCampaign) this.logSystem(`O grupo completou a região: ${regionData.name}!`);
                
                if (regionData.next && !window.MapSystem.unlockedRegions.includes(regionData.next)) {
                    window.MapSystem.unlockedRegions.push(regionData.next);
                    const nextRegionData = window.MapSystem.getRegionDetails(regionData.next);
                    if (nextRegionData) {
                        this.logSystem(`Nova região desbloqueada: ${nextRegionData.name}!`);
                    }
                }
            }
            
            Engine.emit('regionProgressUpdated', regionId);
        }

        setTimeout(() => this.endCombat(true), 2000);
    }

    loseCombat() {
        this.logSystem(`O grupo foi derrotado...`);
        this.party.forEach(p => p.hp = 1);
        setTimeout(() => this.endCombat(false), 2000);
    }

    endCombat(victory) {
        this.inCombat = false;
        this.monsters = [];
        this.turnQueue = [];
        Engine.emit('turnQueueUpdated', this.turnQueue);
        Engine.emit('combatEnded', victory);
    }

    usePotion(itemInstanceId) {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;

        const pIndex = this.currentTurnEntity.index;

        if (this.inventory.useItem(itemInstanceId, pIndex)) {
            Engine.emit('turnEnded', null);
            this.logPlayer(`${this.party[pIndex].name} usou uma poção.`);
            setTimeout(() => this.nextTurn(), 1000);
        }
    }

    logPlayer(msg) { Engine.emit('combatLog', { msg, type: 'log-player' }); }
    logMonster(msg) { Engine.emit('combatLog', { msg, type: 'log-monster' }); }
    logSystem(msg) { Engine.emit('combatLog', { msg, type: 'log-system' }); }

    estimateWinChance(monstersArray) {
        const monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        let playerPower = 0;

        this.party.forEach(p => {
            if (p.hp <= 0) return;
            let { min, max } = this.calculatePlayerDamage(p);
            let avgDmg = (min + max) / 2;
            let defense = p.getTotalAttr('def');
            if (p.equipment) {
                Object.values(p.equipment).forEach(item => {
                    if (item && item.def) defense += item.def;
                });
            }
            playerPower += p.getMaxHp() + (avgDmg * 5) + (defense * 3);
        });

        let totalMonsterPower = 0;
        monsters.forEach(m => {
            totalMonsterPower += m.maxHp + (m.dmg * 5);
        });

        if (totalMonsterPower === 0) return 100;
        let ratio = playerPower / totalMonsterPower;
        let chance = Math.floor(ratio * 50);

        return Math.max(5, Math.min(95, chance));
    }

    autoResolveCombat(monstersArray) {
        const monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        const chance = this.estimateWinChance(monsters);
        const roll = Math.random() * 100;

        // Distribui dano de forma randomica pelo grupo vivo
        const livingPlayers = this.party.filter(p => p.hp > 0);
        if (livingPlayers.length === 0) {
            this.logSystem("Todo o grupo está morto. Retornando ao acampamento...");
            return false;
        }

        const totalPartyMaxHp = livingPlayers.reduce((sum, p) => sum + p.getMaxHp(), 0);
        const totalHpLoss = Math.floor(totalPartyMaxHp * (0.1 + (Math.random() * 0.2)));

        let remainingLoss = totalHpLoss;
        while (remainingLoss > 0 && livingPlayers.some(p => p.hp > 1)) {
            let p = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
            if (p.hp > 1) {
                p.hp--;
                remainingLoss--;
            }
        }

        if (roll <= chance) {
            this.logSystem(`[Batalha Automática] O grupo derrotou os inimigos! Perdeu no total ${totalHpLoss} HP na batalha.`);
            
            monsters.forEach(monster => {
                const loot = window.MonsterDatabase.getLoot(monster);

                const xpPerMember = Math.floor(loot.xp / this.party.length);
                this.party.forEach(p => {
                    if (p.hp > 0) p.gainXp(xpPerMember);
                });
                this.party[0].gainGold(loot.gold);

                this.logSystem(`(De ${monster.name}) Recebeu ${loot.xp} XP (${xpPerMember} p/ cada) e ${loot.gold} Ouro.`);

                loot.items.forEach(item => this.inventory.addItem(item));
                Engine.emit('bestiaryUpdate', monster);
                Engine.emit('questUpdate', { type: 'kill', monsterId: monster.id, qty: 1 });
            });

            const repMonster = monsters[0];
            if (repMonster.regionId) {
                const regionId = repMonster.regionId;
                const regionData = window.MapSystem.getRegionDetails(regionId);
                
                if (repMonster.isCampaign) {
                    window.MapSystem.progress[regionId]++;
                }
                
                const isLastBattle = repMonster.battleIndex === (regionData.encounters.length - 1);
                const isCompleted = window.MapSystem.progress[regionId] >= regionData.encounters.length;
                
                if (regionData && (isLastBattle || isCompleted)) {
                    if (repMonster.isCampaign) this.logSystem(`O grupo completou a região: ${regionData.name}!`);
                    
                    if (regionData.next && !window.MapSystem.unlockedRegions.includes(regionData.next)) {
                        window.MapSystem.unlockedRegions.push(regionData.next);
                        const nextRegionData = window.MapSystem.getRegionDetails(regionData.next);
                        if (nextRegionData) {
                            this.logSystem(`Nova região desbloqueada: ${nextRegionData.name}!`);
                        }
                    }
                }
                Engine.emit('regionProgressUpdated', regionId);
            }
            
            Engine.emit('partyUpdated', this.party);
            return true;
        } else {
            this.logSystem(`[Batalha Automática] O grupo falhou ao tentar derrotar os inimigos e recuou perdendo ${totalHpLoss} HP.`);
            Engine.emit('partyUpdated', this.party);
            return false;
        }
    }
}

window.CombatSystem = CombatSystem;
