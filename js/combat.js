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
        
        this.initiativeOrder = []; // Static list built once per battle
        this.turnQueue = []; // Dynamic list that depletes and refills from initiativeOrder
        this.currentTurnEntity = null;

        // Grid Dimensions
        this.gridWidth = 25;
        this.gridHeight = 10;
        
        // State for Turn Movement
        this.hasMovedThisTurn = false;
        this.movementRemaining = 0;
        this.isSelectingMove = false;
        this.isSelectingTarget = false; // For ranged attacks/skills
        this.selectedSkill = null;
    }

    setupGridPositions() {
        // Place players on the left side (x: 0 or 1, spread y)
        this.party.forEach((p, idx) => {
            p.gridX = idx % 2 === 0 ? 0 : 1;
            p.gridY = 2 + (idx * 2);
            if (p.gridY >= this.gridHeight) p.gridY = this.gridHeight - 1;
        });

        // Place monsters on the right side (x: 23 or 24, spread y)
        this.monsters.forEach((m, idx) => {
            m.gridX = idx % 2 === 0 ? 24 : 23;
            m.gridY = 1 + (idx * 2);
            if (m.gridY >= this.gridHeight) m.gridY = this.gridHeight - 1;
        });
    }

    startCombat(monstersArray) {
        this.monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        this.targetIndex = 0;
        this.inCombat = true;
        
        // Setup initial grid positions
        this.setupGridPositions();

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
        this.initiativeOrder = [];
        this.logSystem('--- Iniciativa (Rolada uma vez por batalha) ---');
        
        this.party.forEach((p, idx) => {
            if (p.hp > 0) {
                const roll = Engine.randomInt(1, 20);
                const agi = p.getTotalAttr('agi');
                const speed = roll + agi;
                this.initiativeOrder.push({ type: 'player', index: idx, speed: speed, ref: p });
                this.logSystem(`[Iniciativa] ${p.name} rolou d20(${roll}) + Agi(${agi}) = ${speed}`);
            }
        });
        
        this.monsters.forEach((m, idx) => {
            if (m.hp > 0) {
                const roll = Engine.randomInt(1, 20);
                // Assume base agility 10 for generic monsters, or scale with level
                const agi = 5 + Math.floor(m.level / 2);
                const speed = roll + agi;
                this.initiativeOrder.push({ type: 'monster', index: idx, speed: speed, ref: m });
                this.logSystem(`[Iniciativa] ${m.name} rolou d20(${roll}) + Agi(${agi}) = ${speed}`);
            }
        });
        
        this.initiativeOrder.sort((a, b) => b.speed - a.speed);
        this.turnQueue = [...this.initiativeOrder]; // Start first round
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
            this.logSystem('--- Nova Rodada (Mantendo Ordem de Iniciativa) ---');
            this.turnQueue = [...this.initiativeOrder];
            
            // Clean dead ones immediately from the refilled queue
            this.turnQueue = this.turnQueue.filter(q => {
                if (q.type === 'player') return this.party[q.index].hp > 0;
                if (q.type === 'monster') return this.monsters[q.index].hp > 0;
                return false;
            });
        }

        this.currentTurnEntity = this.turnQueue.shift();
        this.hasMovedThisTurn = false;
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;

        Engine.emit('turnQueueUpdated', this.turnQueue);
        Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });

        if (this.currentTurnEntity.type === 'player') {
            const p = this.party[this.currentTurnEntity.index];
            this.movementRemaining = 5 + Math.floor(p.getTotalAttr('agi') / 10);
            this.logSystem(`Turno de ${p.name}. Movimento: ${this.movementRemaining} blocos.`);
            Engine.emit('turnStarted', this.currentTurnEntity.index);
        } else {
            const m = this.monsters[this.currentTurnEntity.index];
            this.movementRemaining = 5 + Math.floor((5 + Math.floor(m.level / 2)) / 10); // Base monster agi logic
            Engine.emit('turnEnded', null);
            setTimeout(() => this.monsterAttack(m), 1000);
        }
    }

    startMoveSelection() {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        if (this.movementRemaining <= 0) {
            this.logSystem('Sem movimento restante.');
            return;
        }
        this.isSelectingMove = true;
        this.isSelectingTarget = false;
        Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
    }

    cancelGridSelection() {
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;
        Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
    }

    moveEntityTo(x, y) {
        if (!this.inCombat) return;

        let entity;
        let isPlayerMoving = this.currentTurnEntity.type === 'player';

        if (isPlayerMoving) {
            entity = this.party[this.currentTurnEntity.index];
        } else {
            entity = this.monsters[this.currentTurnEntity.index];
        }

        // Basic A* pathfinding for players moving to a specific spot, so we can trace the path
        const path = this.findPathAStar(entity.gridX, entity.gridY, x, y, this.movementRemaining, false);
        
        // If no path was found or it's longer than remaining movement (findPathAStar returns path without start node, length is distance)
        if (path.length === 0 || path.length > this.movementRemaining) {
             // Fallback to simple check if pathfinding fails (e.g. going to an occupied cell by mistake)
             const dist = Math.abs(entity.gridX - x) + Math.abs(entity.gridY - y);
             if (dist > this.movementRemaining) {
                if (isPlayerMoving) {
                    this.logSystem(`Alcance insuficiente ou caminho bloqueado.`);
                }
                return false;
             } else {
                // If simple dist is within range but A* failed, it means there's no valid path
                if (isPlayerMoving) {
                    this.logSystem('Caminho bloqueado.');
                }
                return false;
             }
        }

        // Check if destination cell is occupied (A* allows destination to be occupied in some cases, so we verify)
        const destX = path[path.length - 1].x;
        const destY = path[path.length - 1].y;

        const isOccupiedByPlayer = this.party.some(p => p.hp > 0 && p.gridX === destX && p.gridY === destY);
        const isOccupiedByMonster = this.monsters.some(m => m.hp > 0 && m.gridX === destX && m.gridY === destY);

        if (isOccupiedByPlayer || isOccupiedByMonster) {
            if (isPlayerMoving) {
                this.logSystem('Célula de destino já ocupada.');
            }
            return false;
        }

        // Process step by step to check for Attacks of Opportunity
        for (let step of path) {
            const startX = entity.gridX;
            const startY = entity.gridY;

            // Move one step
            entity.gridX = step.x;
            entity.gridY = step.y;
            this.movementRemaining -= 1;

            // Check for Attack of Opportunity
            // Definition: If you start adjacent to an enemy, and move to a cell NOT adjacent to that SAME enemy.
            if (isPlayerMoving) {
                this.monsters.forEach(m => {
                    if (m.hp <= 0) return;
                    const distBefore = Math.abs(startX - m.gridX) + Math.abs(startY - m.gridY);
                    const distAfter = Math.abs(entity.gridX - m.gridX) + Math.abs(entity.gridY - m.gridY);

                    if (distBefore === 1 && distAfter > 1) {
                        this.triggerOpportunityAttack(m, entity, 'monster');
                    }
                });

                // If player died from opportunity attack, stop moving
                if (entity.hp <= 0) {
                     this.logSystem(`${entity.name} caiu devido a um Ataque de Oportunidade!`);
                     break;
                }
            } else {
                // Monster is moving
                this.party.forEach(p => {
                    if (p.hp <= 0) return;
                    const distBefore = Math.abs(startX - p.gridX) + Math.abs(startY - p.gridY);
                    const distAfter = Math.abs(entity.gridX - p.gridX) + Math.abs(entity.gridY - p.gridY);

                    if (distBefore === 1 && distAfter > 1) {
                        this.triggerOpportunityAttack(p, entity, 'player');
                    }
                });

                // If monster died, stop moving
                if (entity.hp <= 0) {
                     break;
                }
            }
        }

        this.hasMovedThisTurn = true;
        
        if (isPlayerMoving && entity.hp > 0) {
            this.logSystem(`${entity.name} moveu-se. Movimento restante: ${this.movementRemaining}`);
            this.isSelectingMove = false;
        }
        
        Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
        return true;
    }

    triggerOpportunityAttack(attacker, defender, attackerType) {
        if (attackerType === 'monster') {
            // Monster attacks player
            let defense = defender.getTotalAttr('def');
            Object.values(defender.equipment).forEach(item => {
                if (item && item.def) defense += item.def;
            });

            let dmg = attacker.dmg - Math.floor(defense * 0.5);
            if (dmg < 1) dmg = 1;

            defender.hp -= dmg;
            this.logMonster(`⚠️ Ataque de Oportunidade! ${attacker.name} atacou ${defender.name} pelas costas e causou ${dmg} de dano!`);
            Engine.emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: this.party.indexOf(defender), dmg: dmg });
            Engine.emit('playerUpdated', defender);

            if (defender.hp <= 0) {
                defender.hp = 0;
            }
        } else {
            // Player attacks monster
            let { min, max } = this.calculatePlayerDamage(attacker);
            let dmg = Engine.randomInt(min, max);

            // Half damage for opportunity attacks by default to balance
            dmg = Math.floor(dmg * 0.5);
            if (dmg < 1) dmg = 1;

            defender.hp -= dmg;
            this.logPlayer(`⚠️ Ataque de Oportunidade! ${attacker.name} atacou ${defender.name} pelas costas e causou ${dmg} de dano!`);
            Engine.emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: defender.instanceId, dmg: dmg });

            if (defender.hp <= 0) {
                defender.hp = 0;
                this.processMonsterDeath(defender);
            }
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

    getDistance(e1, e2) {
        return Math.abs(e1.gridX - e2.gridX) + Math.abs(e1.gridY - e2.gridY);
    }

    playerAttack() {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        const p = this.party[this.currentTurnEntity.index];

        const target = this.getCurrentTarget();
        if (!target) return;

        // Check Range
        let attackRange = 1; // Default melee
        if (p.equipment?.weaponMain && p.equipment.weaponMain.range !== undefined) {
            attackRange = p.equipment.weaponMain.range;
        }
        
        const dist = this.getDistance(p, target);
        if (dist > attackRange) {
            this.logSystem(`${p.name} tentou atacar, mas o alvo está fora de alcance (${dist} > ${attackRange}).`);
            this.isSelectingTarget = false;
            Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
            return;
        }

        this.isSelectingTarget = false;
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
            this.isSelectingTarget = false;
            Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
            return;
        }

        let skillRange = skill.range || 4; // default range for skills if not specified
        if (p.equipment?.weaponMain && p.equipment.weaponMain.range !== undefined && p.equipment.weaponMain.range > 1) {
            // Increase skill range slightly if using a ranged weapon, but let the skill baseline take precedence
            skillRange = Math.max(skillRange, p.equipment.weaponMain.range);
        }
        
        const target = this.getCurrentTarget();

        if ((skill.type === 'attack' || skill.type === 'drain') && target) {
            const dist = this.getDistance(p, target);
            if (dist > skillRange) {
                this.logSystem(`${p.name} tentou usar habilidade, mas o alvo está fora de alcance (${dist} > ${skillRange}).`);
                this.isSelectingTarget = false;
                Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
                return;
            }
        }

        this.isSelectingTarget = false;
        Engine.emit('turnEnded', null);
        p.mana -= skill.manaCost;
        Engine.emit('playerUpdated', p);

        if (skill.type === 'attack' || skill.type === 'drain') {
            if (!target && !skill.isAoE) {
                this.nextTurn();
                return;
            }

            let { min, max } = this.calculatePlayerDamage(p);
            let baseDmg = Engine.randomInt(min, max);

            let targets = [];
            if (skill.isAoE) {
                // Determine AoE radius
                const radius = skill.aoeRadius || 2;
                targets = this.monsters.filter(m => m.hp > 0 && this.getDistance(target, m) <= radius);
            } else {
                const t = this.getCurrentTarget();
                if (t) targets.push(t);
            }

            if (targets.length === 0) return;

            let totalHeal = 0;
            let logMsg = `${p.name} usou [${skill.name}]`;
            if (skill.isAoE) logMsg += ` em área!`;

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

    findPathAStar(startX, startY, targetX, targetY, maxSteps, excludeTarget = false) {
        // Basic A* pathfinding
        class Node {
            constructor(x, y, g, h, parent = null) {
                this.x = x;
                this.y = y;
                this.g = g;
                this.h = h;
                this.f = g + h;
                this.parent = parent;
            }
        }

        const openList = [];
        const closedSet = new Set();
        const startNode = new Node(startX, startY, 0, Math.abs(startX - targetX) + Math.abs(startY - targetY));
        openList.push(startNode);

        const directions = [
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 },  // Down
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 }   // Right
        ];

        let bestNode = startNode;

        while (openList.length > 0) {
            // Get node with lowest f cost
            openList.sort((a, b) => a.f - b.f);
            const currentNode = openList.shift();
            const currentKey = `${currentNode.x},${currentNode.y}`;
            closedSet.add(currentKey);

            if (currentNode.h < bestNode.h) {
                bestNode = currentNode;
            }

            if (currentNode.x === targetX && currentNode.y === targetY) {
                bestNode = currentNode;
                break;
            }

            if (currentNode.g >= maxSteps + 10) { // Limit search depth loosely
                continue;
            }

            for (let dir of directions) {
                const nextX = currentNode.x + dir.dx;
                const nextY = currentNode.y + dir.dy;
                const nextKey = `${nextX},${nextY}`;

                if (nextX < 0 || nextX >= this.gridWidth || nextY < 0 || nextY >= this.gridHeight) {
                    continue;
                }

                if (closedSet.has(nextKey)) {
                    continue;
                }

                const isOccupied = this.party.some(p => p.hp > 0 && p.gridX === nextX && p.gridY === nextY) ||
                                   this.monsters.some(m => m.hp > 0 && m.gridX === nextX && m.gridY === nextY);

                // Allow target space to be considered if we are trying to reach it or if we exclude it
                if (isOccupied && (!excludeTarget || !(nextX === targetX && nextY === targetY))) {
                    continue;
                }

                const gCost = currentNode.g + 1;
                const hCost = Math.abs(nextX - targetX) + Math.abs(nextY - targetY);
                const neighborNode = new Node(nextX, nextY, gCost, hCost, currentNode);

                const existingNode = openList.find(n => n.x === nextX && n.y === nextY);
                if (existingNode) {
                    if (gCost < existingNode.g) {
                        existingNode.g = gCost;
                        existingNode.f = gCost + hCost;
                        existingNode.parent = currentNode;
                    }
                } else {
                    openList.push(neighborNode);
                }
            }
        }

        const path = [];
        let curr = bestNode;
        while (curr.parent !== null) {
            // Exclude the target cell itself if requested
            if (!excludeTarget || !(curr.x === targetX && curr.y === targetY)) {
                path.push({ x: curr.x, y: curr.y });
            }
            curr = curr.parent;
        }
        return path.reverse();
    }

    monsterAttack(attacker) {
        if (!this.inCombat) return;

        const livingPlayers = this.party.filter(p => p.hp > 0);
        if (livingPlayers.length === 0) {
            this.loseCombat();
            return;
        }

        let targetP = null;
        let minDist = Infinity;
        const aiType = attacker.aiType || 'default';

        if (aiType === 'goblin') {
            // Swarm behavior: find player with most adjacent monsters, or closest
            let bestScore = -Infinity;
            livingPlayers.forEach(p => {
                const dist = this.getDistance(attacker, p);
                let adjacentMonsters = 0;
                this.monsters.forEach(m => {
                    if (m.hp > 0 && this.getDistance(m, p) === 1) {
                        adjacentMonsters++;
                    }
                });

                // Score = adjacentMonsters * 10 - dist
                const score = (adjacentMonsters * 10) - dist;
                if (score > bestScore) {
                    bestScore = score;
                    targetP = p;
                    minDist = dist;
                }
            });
        } else {
            // Default and Zombie behavior: closest player
            livingPlayers.forEach(p => {
                const dist = this.getDistance(attacker, p);
                if (dist < minDist) {
                    minDist = dist;
                    targetP = p;
                }
            });
        }

        const targetPIndex = this.party.indexOf(targetP);
        const attackRange = 1; // Assuming melee for basic monsters

        if (minDist > attackRange) {
            let stepsTaken = 0;
            const maxSteps = this.movementRemaining;

            if (aiType === 'zombie') {
                // Zombie behavior: move straight towards target (greedy on X, then Y)
                while (stepsTaken < maxSteps && this.getDistance(attacker, targetP) > attackRange) {
                    let nextX = attacker.gridX;
                    let nextY = attacker.gridY;
                    
                    if (attacker.gridX < targetP.gridX) nextX++;
                    else if (attacker.gridX > targetP.gridX) nextX--;
                    else if (attacker.gridY < targetP.gridY) nextY++;
                    else if (attacker.gridY > targetP.gridY) nextY--;
                    
                    const isOccupied = this.party.some(p => p.hp > 0 && p.gridX === nextX && p.gridY === nextY) ||
                                       this.monsters.some(m => m !== attacker && m.hp > 0 && m.gridX === nextX && m.gridY === nextY);

                    if (!isOccupied && (nextX !== attacker.gridX || nextY !== attacker.gridY)) {
                        attacker.gridX = nextX;
                        attacker.gridY = nextY;
                        stepsTaken++;
                    } else {
                        // Stuck
                        break;
                    }
                }
            } else {
                // Default and Goblin behavior: A* pathfinding
                const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetP.gridX, targetP.gridY, maxSteps, true);

                // Move using moveEntityTo to trigger opportunity attacks
                if (path.length > 0) {
                    const targetStep = path[Math.min(path.length, maxSteps) - 1];
                    this.moveEntityTo(targetStep.x, targetStep.y);
                    stepsTaken = path.length;
                }
            }
            
            if (stepsTaken > 0 && aiType === 'zombie') {
                this.logSystem(`${attacker.name} moveu-se em direção a ${targetP.name}.`);
                Engine.emit('combatUpdated', { party: this.party, monsters: this.monsters });
            }

            // Recalculate distance after move
            minDist = this.getDistance(attacker, targetP);
        }

        if (minDist > attackRange || attacker.hp <= 0) {
             if (attacker.hp > 0) {
                 this.logMonster(`${attacker.name} está muito longe de ${targetP.name} e encerra o turno.`);
             }
             setTimeout(() => this.nextTurn(), 600);
             return;
        }

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

            // Notify quests about explore progress
            if (window.gameQuests) {
                window.gameQuests.processExploreEvent(regionId, 1);
            }
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
        this.initiativeOrder = [];
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
