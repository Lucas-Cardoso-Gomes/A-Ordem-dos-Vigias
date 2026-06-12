/**
 * combat.js
 * Turn-based combat system logic.
 */

class CombatSystem {
    constructor(player, inventory) {
        this.player = player;
        this.inventory = inventory;
        this.monster = null;
        this.inCombat = false;

        this.playerStatus = [];
        this.monsterStatus = [];
        this.isPlayerTurn = true;
    }

    startCombat(monster) {
        this.monster = monster;
        this.inCombat = true;
        this.playerStatus = [];
        this.monsterStatus = [];
        this.isPlayerTurn = true;

        Engine.emit('combatStarted', this.monster);
        Engine.emit('turnStarted', null);
        this.logSystem(`Você encontrou um ${monster.name} (Nível ${monster.level})!`);
    }

    flee() {
        if (!this.inCombat || !this.isPlayerTurn) return;
        this.isPlayerTurn = false;
        Engine.emit('turnEnded', null);
        // Base chance to flee 50%, increased by Agility
        const fleeChance = 50 + (this.player.getTotalAttr('agi') * 0.5);
        if (Engine.randomChance(fleeChance)) {
            this.logSystem(`Você conseguiu fugir com sucesso!`);
            this.endCombat(false);
        } else {
            this.logSystem(`Falha ao tentar fugir!`);
            this.monsterTurn();
        }
    }

    // Process turn: Player Action -> Process Status -> Monster Action -> Process Status
    playerAttack() {
        if (!this.inCombat || !this.isPlayerTurn) return;
        this.isPlayerTurn = false;
        Engine.emit('turnEnded', null);

        // Calculate Damage
        let { min, max, weaknessMods } = this.calculatePlayerDamage();
        let dmg = Engine.randomInt(min, max);

        // Critical Hit (based on Luk and Agi)
        const critChance = 5 + (this.player.getTotalAttr('luk') * 0.2) + (this.player.getTotalAttr('agi') * 0.1);
        let isCrit = false;
        if (Engine.randomChance(critChance)) {
            dmg = Math.floor(dmg * 1.5);
            isCrit = true;
        }

        // Apply weakness multiplier
        let weaknessMultiplier = 1.0;
        let hitWeakness = false;
        for (let mod of weaknessMods) {
            if (this.monster.weakness.includes(mod)) {
                weaknessMultiplier += 1.0; // +100% per matched weakness
                hitWeakness = true;
            }
        }

        // Class Bonus
        if (this.player.playerClass === 'Caçador' && !this.inventory.equipment.weaponMain?.magic) {
            dmg = Math.floor(dmg * 1.2);
        } else if (this.player.playerClass === 'Bruxo' && this.inventory.equipment.weaponMain?.magic) {
            dmg = Math.floor(dmg * 1.2);
        } else if (this.player.playerClass === 'Exorcista' && this.monster.type.includes('Morto-vivo')) {
            dmg = Math.floor(dmg * 1.3);
        }

        dmg = Math.floor(dmg * weaknessMultiplier);

        this.monster.hp -= dmg;

        let msg = `Você atacou e causou ${dmg} de dano.`;
        if (isCrit) msg = `Acerto Crítico! ` + msg;
        if (hitWeakness) msg += ` (Fraqueza explorada!)`;

        this.logPlayer(msg);
        Engine.emit('combatAnimation', { target: 'player', anim: 'attack' });
        setTimeout(() => {
            Engine.emit('combatAnimation', { target: 'monster', anim: 'damage' });
            Engine.emit('combatUpdated', { player: this.player, monster: this.monster });

            if (this.monster.hp <= 0) {
                this.monster.hp = 0;
                this.winCombat();
            } else {
                this.processStatusEffects(this.monster, this.monsterStatus, 'monster');
                if (this.monster.hp > 0) {
                    setTimeout(() => this.monsterTurn(), 1000);
                } else {
                    this.winCombat();
                }
            }
        }, 300);
        return; // Early return because rest is in timeout
    }

    playerSkill(skill) {
        if (!this.inCombat || !this.isPlayerTurn) return;

        if (!skill) {
            this.logSystem('Nenhuma habilidade selecionada.');
            return;
        }

        if (this.player.mana < skill.manaCost) {
            this.logSystem(`Mana insuficiente. Requer ${skill.manaCost} Mana.`);
            return;
        }

        this.isPlayerTurn = false;
        Engine.emit('turnEnded', null);
        this.player.mana -= skill.manaCost;
        Engine.emit('playerUpdated', this.player);

        if (skill.type === 'attack' || skill.type === 'drain') {
            let { min, max } = this.calculatePlayerDamage();
            let dmg = Math.floor(Engine.randomInt(min, max) * skill.multiplier);

            let weaknessHit = false;
            if (skill.element && this.monster.weakness && this.monster.weakness.includes(skill.element)) {
                dmg *= 2; // Double damage for elemental weakness
                weaknessHit = true;
            }

            this.monster.hp -= dmg;

            let logMsg = `Você usou ${skill.name} e causou ${dmg} de dano.`;
            if (weaknessHit) logMsg += " (Fraqueza explorada!)";

            this.logPlayer(logMsg);

            if (skill.type === 'drain') {
                const heal = Math.floor(dmg / 2);
                this.player.hp = Math.min(this.player.hp + heal, this.player.getMaxHp());
                this.logPlayer(`Você sugou ${heal} de vida.`);
            }

            Engine.emit('combatAnimation', { target: 'player', anim: 'attack' });
            setTimeout(() => {
                Engine.emit('combatAnimation', { target: 'monster', anim: 'damage' });
                Engine.emit('combatUpdated', { player: this.player, monster: this.monster });

                if (this.monster.hp <= 0) {
                    this.monster.hp = 0;
                    this.winCombat();
                } else {
                    this.processStatusEffects(this.monster, this.monsterStatus, 'monster');
                    if (this.monster.hp > 0) {
                        setTimeout(() => this.monsterTurn(), 1000);
                    } else {
                        this.winCombat();
                    }
                }
            }, 300);
        } else if (skill.type === 'heal') {
            const heal = skill.healAmount;
            this.player.hp = Math.min(this.player.hp + heal, this.player.getMaxHp());
            this.logPlayer(`Você usou ${skill.name} e curou ${heal} de vida.`);

            Engine.emit('combatAnimation', { target: 'player', anim: 'damage' }); // Reusing damage anim for a subtle flash
            Engine.emit('combatUpdated', { player: this.player, monster: this.monster });

            setTimeout(() => {
                this.monsterTurn();
            }, 1000);
        }
    }

    monsterTurn() {
        if (!this.inCombat || this.monster.hp <= 0) return;

        // Calculate damage reduction from armor
        let defense = this.player.getTotalAttr('def');
        Object.values(this.inventory.equipment).forEach(item => {
            if (item && item.def) defense += item.def;
        });

        // Simple mitigation formula
        let dmg = this.monster.dmg - Math.floor(defense * 0.5);
        if (dmg < 1) dmg = 1;

        this.logMonster(`${this.monster.name} atacou e causou ${dmg} de dano.`);

        Engine.emit('combatAnimation', { target: 'monster', anim: 'attack' });
        setTimeout(() => {
            this.player.hp -= dmg;
            Engine.emit('combatAnimation', { target: 'player', anim: 'damage' });
            Engine.emit('combatUpdated', { player: this.player, monster: this.monster });
            Engine.emit('playerUpdated', this.player); // Update global UI

            if (this.player.hp <= 0) {
                this.player.hp = 0;
                this.loseCombat();
            } else {
                this.processStatusEffects(this.player, this.playerStatus, 'player');
                if (this.player.hp <= 0) {
                    this.loseCombat();
                } else {
                    this.isPlayerTurn = true;
                    Engine.emit('turnStarted', null);
                }
            }
        }, 300);
    }

    processStatusEffects(entity, statusArray, type) {
        // Simple implementation for DOTs (Damage Over Time)
        // In a full game, we'd add burn, poison, etc.
        // For now, left as hook.
    }

    calculatePlayerDamage() {
        let min = 1 + Math.floor(this.player.getTotalAttr('str') * 0.5);
        let max = 2 + this.player.getTotalAttr('str');
        let weaknessMods = [];

        const mainWeapon = this.inventory.equipment.weaponMain;
        if (mainWeapon) {
            min += mainWeapon.minDmg || 0;
            max += mainWeapon.maxDmg || 0;
            if (mainWeapon.weakness) weaknessMods.push(mainWeapon.weakness);

            // Int scaling for magic weapons
            if (mainWeapon.magic) {
                min += Math.floor(this.player.getTotalAttr('int') * 0.8);
                max += this.player.getTotalAttr('int');
            }
        }

        const offWeapon = this.inventory.equipment.weaponOff;
        if (offWeapon && offWeapon.type === 'weapon') {
            min += Math.floor((offWeapon.minDmg || 0) * 0.5);
            max += Math.floor((offWeapon.maxDmg || 0) * 0.5);
            if (offWeapon.weakness) weaknessMods.push(offWeapon.weakness);
        }

        return { min, max, weaknessMods };
    }

    winCombat() {
        this.logSystem(`${this.monster.name} foi derrotado!`);
        
        const loot = MonsterDatabase.getLoot(this.monster);
        this.player.gainXp(loot.xp);
        this.player.gainGold(loot.gold);
        
        this.logSystem(`Ganhou ${loot.xp} XP e ${loot.gold} Ouro.`);
        
        loot.items.forEach(item => {
            this.inventory.addItem(item);
        });

        Engine.emit('bestiaryUpdate', this.monster);
        
        // CORREÇÃO: Informa o sistema de missões QUANTOS inimigos morreram na horda
        Engine.emit('questUpdate', { type: 'kill', monsterId: this.monster.id, qty: this.monster.hordeSize || 1 });

        if (this.monster.regionId) {
            const regionId = this.monster.regionId;
            const regionData = window.MapSystem.getRegionDetails(regionId);
            
            if (this.monster.isCampaign) {
                window.MapSystem.progress[regionId]++;
            }
            
            // CORREÇÃO DO BLOQUEIO: Destrava o mapa se derrotar o boss (última luta), mesmo no Replay
            const isLastBattle = this.monster.battleIndex === (regionData.encounters.length - 1);
            const isCompleted = window.MapSystem.progress[regionId] >= regionData.encounters.length;
            
            if (regionData && (isLastBattle || isCompleted)) {
                if (this.monster.isCampaign) this.logSystem(`Você completou a região: ${regionData.name}!`);
                
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
        this.logSystem(`Você foi derrotado por ${this.monster.name}...`);
        // Penalty: lose some gold or xp, and revive with 1 HP in town
        this.player.hp = 1;
        setTimeout(() => this.endCombat(false), 2000);
    }

    endCombat(victory) {
        this.inCombat = false;
        this.monster = null;
        Engine.emit('combatEnded', victory);
    }

    usePotion(itemInstanceId) {
        if (!this.inCombat || !this.isPlayerTurn) return;

        if (this.inventory.useItem(itemInstanceId)) {
            this.isPlayerTurn = false;
            Engine.emit('turnEnded', null);
            this.logPlayer(`Você usou uma poção.`);
            setTimeout(() => this.monsterTurn(), 1000);
        }
    }

    logPlayer(msg) { Engine.emit('combatLog', { msg, type: 'log-player' }); }
    logMonster(msg) { Engine.emit('combatLog', { msg, type: 'log-monster' }); }
    logSystem(msg) { Engine.emit('combatLog', { msg, type: 'log-system' }); }

    estimateWinChance(monster) {
        // Estima o poder do Jogador (HP + Dano Médio + Defesa)
        let { min, max } = this.calculatePlayerDamage();
        let avgDmg = (min + max) / 2;
        let defense = this.player.getTotalAttr('def');
        Object.values(this.inventory.equipment).forEach(item => {
            if (item && item.def) defense += item.def;
        });

        let playerPower = this.player.getMaxHp() + (avgDmg * 5) + (defense * 3);

        // Estima o poder do Monstro
        let monsterPower = monster.maxHp + (monster.dmg * 5);

        // Calcula a proporção (1:1 = 50% de chance)
        let ratio = playerPower / monsterPower;
        let chance = Math.floor(ratio * 50);

        // Limita a chance entre 5% (nunca é 0) e 95% (sempre há risco)
        return Math.max(5, Math.min(95, chance));
    }

    autoResolveCombat(monster) {
        const chance = this.estimateWinChance(monster);
        const roll = Math.random() * 100;

        // "Taxa de cansaço": Auto-batalha sempre consome um pouco de HP (10% a 30% do HP máximo)
        const hpLoss = Math.floor(this.player.getMaxHp() * (0.1 + (Math.random() * 0.2)));
        this.player.hp -= hpLoss;
        if (this.player.hp <= 0) this.player.hp = 1; // Sobrevive por pouco

        if (roll <= chance) {
            // Vitória na Simulação
            this.logSystem(`[Batalha Automática] Você derrotou ${monster.name}! Perdeu ${hpLoss} HP de cansaço.`);
            
            const loot = MonsterDatabase.getLoot(monster);
            this.player.gainXp(loot.xp);
            this.player.gainGold(loot.gold);
            this.logSystem(`Recebeu ${loot.xp} XP e ${loot.gold} Ouro.`);
            
            loot.items.forEach(item => this.inventory.addItem(item));
            Engine.emit('bestiaryUpdate', monster);
            
            // CORREÇÃO DA MISSÃO NA BATALHA RÁPIDA:
            Engine.emit('questUpdate', { type: 'kill', monsterId: monster.id, qty: monster.hordeSize || 1 });

            if (monster.regionId) {
                const regionId = monster.regionId;
                const regionData = window.MapSystem.getRegionDetails(regionId);
                
                if (monster.isCampaign) {
                    window.MapSystem.progress[regionId]++;
                }
                
                // CORREÇÃO DO BLOQUEIO NA BATALHA RÁPIDA:
                const isLastBattle = monster.battleIndex === (regionData.encounters.length - 1);
                const isCompleted = window.MapSystem.progress[regionId] >= regionData.encounters.length;
                
                if (regionData && (isLastBattle || isCompleted)) {
                    if (monster.isCampaign) this.logSystem(`Você completou a região: ${regionData.name}!`);
                    
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
            
            Engine.emit('playerUpdated', this.player);
            return true;
        } else { //... (resto do código) else {
            // Derrota na Simulação
            this.logSystem(`[Batalha Automática] Você falhou ao tentar derrotar ${monster.name} e recuou perdendo ${hpLoss} HP.`);
            Engine.emit('playerUpdated', this.player);
            return false;
        }
    }
}

window.CombatSystem = CombatSystem;