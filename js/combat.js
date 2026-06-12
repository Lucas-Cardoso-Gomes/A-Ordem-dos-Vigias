/**
 * combat.js
 * Turn-based combat system logic.
 */

class CombatSystem {
    constructor(player, inventory) {
        this.player = player;
        this.inventory = inventory;
        this.monsters = [];
        this.targetIndex = 0;
        this.inCombat = false;

        this.playerStatus = [];
        this.monsterStatus = [];
        this.isPlayerTurn = true;
    }

    startCombat(monstersArray) {
        this.monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        this.targetIndex = 0;
        this.inCombat = true;
        this.playerStatus = [];
        this.monsterStatus = [];
        this.isPlayerTurn = true;

        Engine.emit('combatStarted', this.monsters);
        Engine.emit('turnStarted', null);

        if (this.monsters.length > 1) {
            this.logSystem(`Você encontrou um grupo de inimigos!`);
        } else {
            this.logSystem(`Você encontrou um ${this.monsters[0].name} (Nível ${this.monsters[0].level})!`);
        }
    }

    getCurrentTarget() {
        if (this.monsters.length === 0) return null;
        // Se o alvo atual estiver morto, pega o primeiro vivo
        if (this.monsters[this.targetIndex] && this.monsters[this.targetIndex].hp <= 0) {
            this.targetIndex = this.monsters.findIndex(m => m.hp > 0);
        }
        return this.monsters[this.targetIndex];
    }

    setTarget(index) {
        if (index >= 0 && index < this.monsters.length && this.monsters[index].hp > 0) {
            this.targetIndex = index;
            Engine.emit('combatUpdated', { player: this.player, monsters: this.monsters });
        }
    }

    flee() {
        if (!this.inCombat || !this.isPlayerTurn) return;
        this.isPlayerTurn = false;
        Engine.emit('turnEnded', null);

        const fleeChance = 50 + (this.player.getTotalAttr('agi') * 0.5);
        if (Engine.randomChance(fleeChance)) {
            this.logSystem(`Você conseguiu fugir com sucesso!`);
            this.endCombat(false); // Retorna falso para não contar como vitória de região, mas a quest e xp dos mortos já contou
        } else {
            this.logSystem(`Falha ao tentar fugir!`);
            this.monsterTurn();
        }
    }

    playerAttack() {
        if (!this.inCombat || !this.isPlayerTurn) return;

        const target = this.getCurrentTarget();
        if (!target) return;

        this.isPlayerTurn = false;
        Engine.emit('turnEnded', null);

        let { min, max, weaknessMods } = this.calculatePlayerDamage();
        let dmg = Engine.randomInt(min, max);

        const critChance = 5 + (this.player.getTotalAttr('luk') * 0.2) + (this.player.getTotalAttr('agi') * 0.1);
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

        if (this.player.playerClass === 'Caçador' && !this.inventory.equipment.weaponMain?.magic) {
            dmg = Math.floor(dmg * 1.2);
        } else if (this.player.playerClass === 'Bruxo' && this.inventory.equipment.weaponMain?.magic) {
            dmg = Math.floor(dmg * 1.2);
        } else if (this.player.playerClass === 'Exorcista' && target.type && target.type.includes('Morto-vivo')) {
            dmg = Math.floor(dmg * 1.3);
        }

        dmg = Math.floor(dmg * weaknessMultiplier);

        target.hp -= dmg;

        let msg = `Você atacou ${target.name} e causou ${dmg} de dano.`;
        if (isCrit) msg = `Acerto Crítico! ` + msg;
        if (hitWeakness) msg += ` (Fraqueza explorada!)`;

        this.logPlayer(msg);
        Engine.emit('combatAnimation', { target: 'player', anim: 'attack' });

        setTimeout(() => {
            Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: target.instanceId });
            Engine.emit('combatUpdated', { player: this.player, monsters: this.monsters });

            if (target.hp <= 0) {
                target.hp = 0;
                this.processMonsterDeath(target);
            }

            if (this.monsters.every(m => m.hp <= 0)) {
                this.winCombat();
            } else {
                setTimeout(() => this.monsterTurn(), 1000);
            }
        }, 300);
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

        const target = this.getCurrentTarget();
        if (!target && skill.type !== 'heal') return;

        this.isPlayerTurn = false;
        Engine.emit('turnEnded', null);
        this.player.mana -= skill.manaCost;
        Engine.emit('playerUpdated', this.player);

        if (skill.type === 'attack' || skill.type === 'drain') {
            let { min, max } = this.calculatePlayerDamage();
            let dmg = Math.floor(Engine.randomInt(min, max) * skill.multiplier);

            let weaknessHit = false;
            if (skill.element && target.weakness && target.weakness.includes(skill.element)) {
                dmg *= 2;
                weaknessHit = true;
            }

            target.hp -= dmg;

            let logMsg = `Você usou ${skill.name} em ${target.name} e causou ${dmg} de dano.`;
            if (weaknessHit) logMsg += " (Fraqueza explorada!)";

            this.logPlayer(logMsg);

            if (skill.type === 'drain') {
                const heal = Math.floor(dmg / 2);
                this.player.hp = Math.min(this.player.hp + heal, this.player.getMaxHp());
                this.logPlayer(`Você sugou ${heal} de vida.`);
            }

            Engine.emit('combatAnimation', { target: 'player', anim: 'attack' });
            setTimeout(() => {
                Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: target.instanceId });
                Engine.emit('combatUpdated', { player: this.player, monsters: this.monsters });

                if (target.hp <= 0) {
                    target.hp = 0;
                    this.processMonsterDeath(target);
                }

                if (this.monsters.every(m => m.hp <= 0)) {
                    this.winCombat();
                } else {
                    setTimeout(() => this.monsterTurn(), 1000);
                }
            }, 300);
        } else if (skill.type === 'heal') {
            const heal = skill.healAmount;
            this.player.hp = Math.min(this.player.hp + heal, this.player.getMaxHp());
            this.logPlayer(`Você usou ${skill.name} e curou ${heal} de vida.`);

            Engine.emit('combatAnimation', { target: 'player', anim: 'damage' });
            Engine.emit('combatUpdated', { player: this.player, monsters: this.monsters });

            setTimeout(() => {
                this.monsterTurn();
            }, 1000);
        }
    }

    // Processa morte de um monstro individual (xp, loot, quest)
    processMonsterDeath(monster) {
        this.logSystem(`${monster.name} foi derrotado!`);

        const loot = MonsterDatabase.getLoot(monster);
        this.player.gainXp(loot.xp);
        this.player.gainGold(loot.gold);

        this.logSystem(`Ganhou ${loot.xp} XP e ${loot.gold} Ouro.`);

        loot.items.forEach(item => {
            this.inventory.addItem(item);
        });

        Engine.emit('bestiaryUpdate', monster);

        // Quest update para apenas 1 abate (hordeSize do questing não aplica mais, pois criamos N monstros)
        Engine.emit('questUpdate', { type: 'kill', monsterId: monster.id, qty: 1 });

        Engine.emit('combatUpdated', { player: this.player, monsters: this.monsters });
        Engine.emit('playerUpdated', this.player);
    }

    monsterTurn() {
        if (!this.inCombat) return;

        const livingMonsters = this.monsters.filter(m => m.hp > 0);
        if (livingMonsters.length === 0) return;

        let defense = this.player.getTotalAttr('def');
        Object.values(this.inventory.equipment).forEach(item => {
            if (item && item.def) defense += item.def;
        });

        const processAttack = (index) => {
            if (index >= livingMonsters.length || this.player.hp <= 0) {
                if (this.player.hp <= 0) {
                    this.loseCombat();
                } else {
                    this.isPlayerTurn = true;
                    Engine.emit('turnStarted', null);
                }
                return;
            }

            const attacker = livingMonsters[index];
            let dmg = attacker.dmg - Math.floor(defense * 0.5);
            if (dmg < 1) dmg = 1;

            this.logMonster(`${attacker.name} atacou e causou ${dmg} de dano.`);

            Engine.emit('combatAnimation', { target: 'monster', anim: 'attack', monsterId: attacker.instanceId });

            setTimeout(() => {
                this.player.hp -= dmg;
                Engine.emit('combatAnimation', { target: 'player', anim: 'damage' });
                Engine.emit('combatUpdated', { player: this.player, monsters: this.monsters });
                Engine.emit('playerUpdated', this.player);

                if (this.player.hp <= 0) {
                    this.player.hp = 0;
                    this.loseCombat();
                } else {
                    setTimeout(() => processAttack(index + 1), 600); // Wait bit before next monster attacks
                }
            }, 300);
        };

        processAttack(0);
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
        this.logSystem(`Você venceu o combate!`);
        
        // Progressão da região só acontece se TODOS morreram
        // Pegamos o info do primeiro monstro, pois todos são da mesma região e index
        const repMonster = this.monsters[0];

        if (repMonster.regionId) {
            const regionId = repMonster.regionId;
            const regionData = window.MapSystem.getRegionDetails(regionId);
            
            if (repMonster.isCampaign) {
                window.MapSystem.progress[regionId]++;
            }
            
            const isLastBattle = repMonster.battleIndex === (regionData.encounters.length - 1);
            const isCompleted = window.MapSystem.progress[regionId] >= regionData.encounters.length;
            
            if (regionData && (isLastBattle || isCompleted)) {
                if (repMonster.isCampaign) this.logSystem(`Você completou a região: ${regionData.name}!`);
                
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
        this.logSystem(`Você foi derrotado...`);
        this.player.hp = 1;
        setTimeout(() => this.endCombat(false), 2000);
    }

    endCombat(victory) {
        this.inCombat = false;
        this.monsters = [];
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

    estimateWinChance(monstersArray) {
        const monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        let { min, max } = this.calculatePlayerDamage();
        let avgDmg = (min + max) / 2;
        let defense = this.player.getTotalAttr('def');
        Object.values(this.inventory.equipment).forEach(item => {
            if (item && item.def) defense += item.def;
        });

        let playerPower = this.player.getMaxHp() + (avgDmg * 5) + (defense * 3);

        let totalMonsterPower = 0;
        monsters.forEach(m => {
            totalMonsterPower += m.maxHp + (m.dmg * 5);
        });

        let ratio = playerPower / totalMonsterPower;
        let chance = Math.floor(ratio * 50);

        return Math.max(5, Math.min(95, chance));
    }

    autoResolveCombat(monstersArray) {
        const monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        const chance = this.estimateWinChance(monsters);
        const roll = Math.random() * 100;

        const hpLoss = Math.floor(this.player.getMaxHp() * (0.1 + (Math.random() * 0.2)));
        this.player.hp -= hpLoss;
        if (this.player.hp <= 0) this.player.hp = 1;

        if (roll <= chance) {
            this.logSystem(`[Batalha Automática] Você derrotou o grupo de inimigos! Perdeu ${hpLoss} HP de cansaço.`);
            
            monsters.forEach(monster => {
                const loot = MonsterDatabase.getLoot(monster);
                this.player.gainXp(loot.xp);
                this.player.gainGold(loot.gold);
                this.logSystem(`(De ${monster.name}) Recebeu ${loot.xp} XP e ${loot.gold} Ouro.`);

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
                    if (repMonster.isCampaign) this.logSystem(`Você completou a região: ${regionData.name}!`);
                    
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
        } else {
            this.logSystem(`[Batalha Automática] Você falhou ao tentar derrotar os inimigos e recuou perdendo ${hpLoss} HP.`);
            Engine.emit('playerUpdated', this.player);
            return false;
        }
    }
}

window.CombatSystem = CombatSystem;
