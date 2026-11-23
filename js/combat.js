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

        // Infinite Mode State
        this.isInfiniteMode = false;
        this.infiniteWave = 1;
        this.waitingNextWave = false;
        this.freeTurnsRemaining = 0;

        // Active Terrains
        this.activeTerrains = [];
    }

    _getEngine() {
        if (typeof Engine !== 'undefined') return Engine;
        if (typeof window !== 'undefined' && window.Engine) return window.Engine;
        return null;
    }

    _emit(event, data) {
        const eng = this._getEngine();
        if (eng && typeof eng.emit === 'function') eng.emit(event, data);
    }

    _randomInt(min, max) {
        const eng = this._getEngine();
        if (eng && typeof eng.randomInt === 'function') return eng.randomInt(min, max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _randomChance(percent) {
        const eng = this._getEngine();
        if (eng && typeof eng.randomChance === 'function') return eng.randomChance(percent);
        return Math.random() * 100 <= percent;
    }

    _getGM() {
        return (typeof window !== 'undefined' && window.GameMechanics) ? window.GameMechanics : null;
    }

    _getAudio() {
        return (typeof window !== 'undefined' && window.gameAudio) ? window.gameAudio : null;
    }

    _recordStat(key, val = 1) {
        this._getGM()?.recordStat?.(key, val);
    }

    _addFury(player, amount) {
        if (!player || player.hp <= 0 || !amount) return;
        const gm = this._getGM();
        if (gm && typeof gm.addFury === 'function') {
            gm.addFury(player, amount);
        } else {
            player.fury = Math.min(100, Math.max(0, (player.fury || 0) + amount));
        }
        this._emit('playerUpdated', player);
    }

    _getElementColor(element) {
        const map = {
            fogo: '#ef4444',
            fire: '#ef4444',
            lava: '#f97316',
            gelo: '#38bdf8',
            ice: '#38bdf8',
            raio: '#facc15',
            lightning: '#facc15',
            sagrado: '#fde047',
            holy: '#fde047',
            trevas: '#a855f7',
            dark: '#a855f7',
            void: '#a855f7',
            veneno: '#22c55e',
            poison: '#22c55e',
            arcano: '#818cf8',
            heal: '#4ade80',
            healing: '#4ade80',
            blessing: '#fde047',
            shield: '#60a5fa'
        };
        return map[(element || '').toLowerCase()] || '#f59e0b';
    }

    _getElementSfx(element, fallback = 'magic') {
        const map = {
            fogo: 'fire',
            fire: 'fire',
            lava: 'fire',
            gelo: 'ice',
            ice: 'ice',
            raio: 'lightning',
            lightning: 'lightning',
            sagrado: 'holy',
            holy: 'holy',
            trevas: 'dark',
            dark: 'dark',
            void: 'dark',
            veneno: 'poison',
            poison: 'poison',
            arcano: 'magic'
        };
        return map[(element || '').toLowerCase()] || fallback;
    }

    _inferElementFromWeapon(weapon) {
        if (!weapon) return null;
        if (weapon.element) return weapon.element;
        const w = (weapon.weakness || '').toLowerCase();
        if (w.includes('fogo')) return 'fogo';
        if (w.includes('gelo')) return 'gelo';
        if (w.includes('raio')) return 'raio';
        if (w.includes('sagr') || w.includes('luz')) return 'sagrado';
        if (w.includes('trev')) return 'trevas';
        if (w.includes('venen')) return 'veneno';
        if (w.includes('arcan')) return 'arcano';
        return null;
    }

    _mapElementToStatus(element) {
        const map = {
            fogo: 'burn',
            gelo: 'frost',
            raio: 'shock',
            veneno: 'poison',
            sangramento: 'bleed'
        };
        return map[(element || '').toLowerCase()] || null;
    }

    _applyShieldAbsorption(entity, dmg) {
        const gm = this._getGM();
        let remaining = dmg;
        let absorbed = 0;

        if (gm && typeof gm.absorbDamageWithShield === 'function') {
            const res = gm.absorbDamageWithShield(entity, dmg);
            if (typeof res === 'number') {
                absorbed = Math.max(0, dmg - res);
                remaining = Math.max(0, res);
            } else if (res && typeof res === 'object') {
                remaining = Math.max(0, res.remainingDamage ?? res.remaining ?? res.damage ?? dmg);
                absorbed = Math.max(0, res.absorbed ?? (dmg - remaining));
            }
        } else if (entity && entity.shield > 0) {
            absorbed = Math.min(entity.shield, dmg);
            entity.shield -= absorbed;
            remaining = Math.max(0, dmg - absorbed);
        }
        return { remaining, absorbed };
    }

    _applyDamageToMonster(target, rawDmg, attacker = null) {
        const gm = this._getGM();
        let dmg = Math.max(1, Math.floor(rawDmg));
        if (gm) {
            const dealtMult = (attacker && typeof gm.getDamageDealtMultiplier === 'function') ? gm.getDamageDealtMultiplier(attacker) : 1;
            const takenMult = (typeof gm.getDamageTakenMultiplier === 'function') ? gm.getDamageTakenMultiplier(target) : 1;
            if (typeof dealtMult === 'number' && !isNaN(dealtMult)) dmg = Math.floor(dmg * dealtMult);
            if (typeof takenMult === 'number' && !isNaN(takenMult)) dmg = Math.floor(dmg * takenMult);
        }
        dmg = Math.max(1, dmg);

        const { remaining, absorbed } = this._applyShieldAbsorption(target, dmg);
        if (absorbed > 0) {
            this.logSystem(`🛡️ O escudo de ${target.name} absorveu ${absorbed} de dano!`);
            this._getAudio()?.play?.('block');
        }

        target.hp = Math.max(0, target.hp - remaining);
        if (attacker && this.party.includes(attacker)) {
            this._recordStat('totalDamageDealt', remaining);
        }
        if (target.hp > 0) {
            this.checkBossPhase2(target);
        }
        return { dmg: remaining, absorbed };
    }

    _applyDamageToPlayer(targetP, rawDmg, attacker = null) {
        const gm = this._getGM();
        let dmg = Math.max(1, Math.floor(rawDmg));
        if (gm) {
            const dealtMult = (attacker && typeof gm.getDamageDealtMultiplier === 'function') ? gm.getDamageDealtMultiplier(attacker) : 1;
            const takenMult = (typeof gm.getDamageTakenMultiplier === 'function') ? gm.getDamageTakenMultiplier(targetP) : 1;
            if (typeof dealtMult === 'number' && !isNaN(dealtMult)) dmg = Math.floor(dmg * dealtMult);
            if (typeof takenMult === 'number' && !isNaN(takenMult)) dmg = Math.floor(dmg * takenMult);
        }
        dmg = Math.max(1, dmg);

        const { remaining, absorbed } = this._applyShieldAbsorption(targetP, dmg);
        if (absorbed > 0) {
            this.logSystem(`🛡️ Escudo de ${targetP.name} absorveu ${absorbed} de dano!`);
            this._getAudio()?.play?.('block');
        }

        targetP.hp = Math.max(0, targetP.hp - remaining);
        if (targetP.hp > 0 && remaining > 0) {
            this._addFury(targetP, 15);
        }
        if (absorbed === 0 && !targetP.defenseStance) {
            this._getAudio()?.play?.('hit');
        } else if (targetP.defenseStance) {
            this._getAudio()?.play?.('block');
        }
        return { dmg: remaining, absorbed };
    }

    _handleElementalReaction(target, incomingElement, caster, baseDmg = 0) {
        if (!target || target.hp <= 0 || !incomingElement) return null;
        const gm = this._getGM();
        if (!gm || typeof gm.checkElementalReaction !== 'function') return null;

        const reaction = gm.checkElementalReaction(target, incomingElement, caster, baseDmg);
        if (!reaction) return null;

        const bonusRaw = reaction.bonusDamage ?? reaction.bonusDmg ?? reaction.damage ?? reaction.extraDmg ?? Math.max(15, Math.floor(baseDmg * 0.6));
        const res = this._applyDamageToMonster(target, bonusRaw, caster);

        if (reaction.stun && !reaction.stunApplied && typeof gm.applyStatus === 'function') {
            gm.applyStatus(target, 'stun', { duration: 1, caster });
        }
        if (reaction.healCaster && caster && typeof caster.heal === 'function') {
            caster.heal(reaction.healCaster);
            this._recordStat('totalHealingDone', reaction.healCaster);
            const pIdx = this.party.indexOf(caster);
            if (pIdx !== -1) {
                this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: pIdx, dmg: reaction.healCaster, isHeal: true });
            }
        }

        this.logPlayer(`💥 REAÇÃO ELEMENTAL: [${reaction.name}] em ${target.name}! (+${res.dmg} de dano!)`);
        this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: target.instanceId, dmg: res.dmg, isCombo: true, label: reaction.name });
        this._emit('combatVFX', {
            type: 'combo',
            reaction: reaction.name,
            element: incomingElement,
            from: caster ? { x: caster.gridX, y: caster.gridY } : { x: target.gridX, y: target.gridY },
            to: { x: target.gridX, y: target.gridY },
            monsterId: target.instanceId,
            color: reaction.color || '#f59e0b',
            dmg: res.dmg
        });
        this._getAudio()?.play?.('combo');
        this._recordStat('elementalCombos', 1);
        return { ...reaction, appliedDmg: res.dmg };
    }

    checkBossPhase2(monster) {
        if (!monster || !monster.isBoss || monster.hp <= 0 || monster.phase2Triggered) return false;
        if (monster.hp >= monster.maxHp * 0.5) return false;

        monster.phase2Triggered = true;
        monster.phase = 2;

        const healAmt = Math.max(1, Math.floor(monster.maxHp * 0.20));
        monster.hp = Math.min(monster.maxHp, monster.hp + healAmt);
        const dmgMult = monster.phase2DmgMult || 1.25;
        monster.dmg = Math.round(monster.dmg * dmgMult);

        const hazardType = monster.id === 'boss2' ? 'fire' : 'void';
        const hazardDmg = Math.max(12, Math.floor(monster.dmg * 0.20));
        const spawnedCoords = [];

        // Spawn hazard tiles near living players or arena center
        const livingPlayers = this.party.filter(p => p.hp > 0);
        for (let i = 0; i < 4; i++) {
            const anchor = livingPlayers[i % Math.max(1, livingPlayers.length)] || { gridX: 12, gridY: 5 };
            const hx = Math.max(0, Math.min(this.gridWidth - 1, anchor.gridX + this._randomInt(-1, 2)));
            const hy = Math.max(0, Math.min(this.gridHeight - 1, anchor.gridY + this._randomInt(-1, 1)));
            this.activeTerrains.push({
                x: hx,
                y: hy,
                type: hazardType,
                damage: hazardDmg,
                heal: 0,
                duration: 4,
                casterId: monster.name
            });
            spawnedCoords.push({ x: hx, y: hy });
        }

        const dialogue = monster.phase2Dialogue || `${monster.name} entrou em FASE 2 e despertou sua fúria!`;
        this.logMonster(`🔥 FASE 2: ${dialogue} (+${healAmt} HP, +25% Dano!)`);

        this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: monster.instanceId, dmg: healAmt, isHeal: true });
        this._emit('bossPhaseChanged', {
            monster,
            monsterId: monster.instanceId,
            phase: 2,
            dialogue,
            heal: healAmt,
            hazards: spawnedCoords
        });
        this._emit('combatVFX', {
            type: 'boss_phase2',
            element: monster.id === 'boss2' ? 'fogo' : 'trevas',
            monsterId: monster.instanceId,
            monster,
            from: { x: monster.gridX, y: monster.gridY },
            to: { x: monster.gridX, y: monster.gridY },
            x: monster.gridX,
            y: monster.gridY,
            radius: 3,
            color: monster.id === 'boss2' ? '#f97316' : '#a855f7'
        });
        this._getAudio()?.play?.('bossPhase');
        return true;
    }

    attemptTaunt(caster, monster, duration = 3) {
        if (!monster || monster.hp <= 0) return false;
        const playerInt = caster && typeof caster.getTotalAttr === 'function' ? caster.getTotalAttr('int') : 10;
        const monsterInt = monster.int || (monster.isBoss ? Math.max(25, Math.floor((monster.level || 1) * 0.5)) : Math.floor((monster.level || 1) * 0.4));
        const isHighIntOrBoss = Boolean(monster.isBoss || monsterInt >= 20);
        const resistChance = isHighIntOrBoss
            ? 0.25
            : Math.max(0.05, Math.min(0.20, (monsterInt - playerInt * 0.5) * 0.01));

        if (Math.random() < resistChance) {
            this.logSystem(`🧠 ${monster.name} resistiu à provocação de ${caster.name}!`);
            return false;
        }
        monster.tauntedBy = caster;
        monster.tauntDuration = duration;
        return true;
    }

    _applyTerrainTileEffect(t, entity, isPlayer) {
        if (!t || !entity || entity.hp <= 0) return;
        if (t.type === 'wall' || t.type === 'ice') return;
        const gm = this._getGM();

        if (t.type === 'healing' || t.type === 'blessing' || t.type === 'holy') {
            if (isPlayer) {
                const healAmt = t.heal || 15;
                if (typeof entity.heal === 'function') entity.heal(healAmt);
                else entity.hp += healAmt;
                this._recordStat('totalHealingDone', healAmt);
                if ((t.type === 'holy' || t.type === 'blessing') && gm && typeof gm.applyStatus === 'function') {
                    gm.applyStatus(entity, 'blessing', { duration: 2, caster: t.casterId });
                }
                const pIdx = this.party.indexOf(entity);
                if (pIdx !== -1) {
                    this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: pIdx, dmg: healAmt, isHeal: true });
                }
                this._emit('combatVFX', { type: 'heal', element: 'sagrado', to: { x: entity.gridX, y: entity.gridY }, color: '#fde047' });
            } else {
                const typeLower = (entity.type || '').toLowerCase();
                const isUnholy = typeLower.includes('morto') || typeLower.includes('dem') || typeLower.includes('vamp') || typeLower.includes('fantasma') || typeLower.includes('caos');
                if (isUnholy && (t.type === 'holy' || t.type === 'blessing')) {
                    const dmgAmt = t.damage || 15;
                    const res = this._applyDamageToMonster(entity, dmgAmt, null);
                    this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: entity.instanceId, dmg: res.dmg });
                    this._emit('combatVFX', { type: 'status', element: 'sagrado', to: { x: entity.gridX, y: entity.gridY }, color: '#fde047', dmg: res.dmg });
                }
            }
            return;
        }

        // Damaging hazard terrain (fire, lava, spikes, mine, void)
        const dmgAmt = t.damage || 10;
        if (isPlayer) {
            const res = this._applyDamageToPlayer(entity, dmgAmt, null);
            const pIdx = this.party.indexOf(entity);
            if (pIdx !== -1) {
                this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: pIdx, dmg: res.dmg });
            }
        } else {
            const res = this._applyDamageToMonster(entity, dmgAmt, null);
            this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: entity.instanceId, dmg: res.dmg });
        }
        if ((t.type === 'fire' || t.type === 'lava') && entity.hp > 0 && gm && typeof gm.applyStatus === 'function') {
            gm.applyStatus(entity, 'burn', { duration: 2 });
        }
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
            const row = idx % 5;
            const col = Math.floor(idx / 5);
            m.gridX = 24 - col;
            m.gridY = 1 + (row * 2);
            if (m.gridY >= this.gridHeight) m.gridY = this.gridHeight - 1;
            if (m.gridX < 1) m.gridX = 1; // Prevent going off grid on extreme left
        });
    }

    startInfiniteMode() {
        this.isInfiniteMode = true;
        this.infiniteWave = 1;
        this.waitingNextWave = false;
        this.freeTurnsRemaining = 0;
        
        this.spawnNextInfiniteWave();
    }
    
    spawnNextInfiniteWave() {
        this.logSystem(`🔥 Iniciando Onda ${this.infiniteWave}...`);
        
        const avgPartyLvl = Math.max(1, Math.floor(this.party.reduce((sum, p) => sum + p.level, 0) / this.party.length));
        
        // Quantidade de inimigos cresce a cada dezena de ondas (Onda 1 = 1~2, Onda 10 = 2~3...)
        const minHorde = 1 + Math.floor(this.infiniteWave / 10);
        
        // Define quantos inimigos vão aparecer baseados na wave e rolagens aleatórias
        let maxHordeCap = 3 + Math.floor(this.infiniteWave / 5);
        let numEnemies = this._randomInt(minHorde, maxHordeCap);
        
        // Se for chefe (A cada 5 ondas)
        let isBossWave = (this.infiniteWave % 5 === 0);
        if (isBossWave) {
            numEnemies = Math.max(1, Math.floor(numEnemies / 2));
        }
        
        // Pick random base monsters suitable for the level
        const allMobs = window.MonsterDatabase.monsters;
        let eligibleMobs = allMobs.filter(m => !m.isBoss && Math.abs((m.maxLvl || m.level) - avgPartyLvl) <= 15);
        if (eligibleMobs.length === 0) eligibleMobs = allMobs.filter(m => !m.isBoss);
        
        let eligibleBosses = allMobs.filter(m => m.isBoss);
        
        const monstersArray = [];
        for (let i = 0; i < numEnemies; i++) {
            let baseMob = eligibleMobs[this._randomInt(0, eligibleMobs.length - 1)];
            
            if (isBossWave && i === 0 && eligibleBosses.length > 0) {
                baseMob = eligibleBosses[this._randomInt(0, eligibleBosses.length - 1)];
            }
            
            const lvlScale = avgPartyLvl + Math.floor(this.infiniteWave / 3);
            const scale = Math.max(0.5, 1 + (lvlScale - baseMob.minLvl) * 0.15);
            
            monstersArray.push({
                ...baseMob,
                name: numEnemies > 1 ? `${baseMob.name} ${String.fromCharCode(65 + (i % 26))}` : baseMob.name,
                instanceId: 'inf_mon_' + Date.now() + '_' + i,
                level: lvlScale,
                maxHp: Math.floor(baseMob.hp * scale),
                hp: Math.floor(baseMob.hp * scale),
                dmg: Math.floor(baseMob.dmg * scale),
                xp: Math.floor(baseMob.xp * scale) * 2, // Double XP in infinite mode
                gold: Math.floor(baseMob.gold * scale),
                isCampaign: false,
                hordeSize: numEnemies
            });
        }
        
        this.startCombat(monstersArray);
    }

    startCombat(monstersArray) {
        // Complete Cleanup Rule
        this.activeTerrains = [];
        this.turnQueue = [];
        this.initiativeOrder = [];
        this.hasMovedThisTurn = false;
        this.isProcessingTurn = false;
        this.currentTurnEntity = null;
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;

        this.monsters = Array.isArray(monstersArray) ? monstersArray : [monstersArray];
        this.targetIndex = 0;
        this.inCombat = true;

        // Setup initial grid positions
        this.setupGridPositions();

        // Ensure combat status/fury/phase fields exist cleanly
        this.party.forEach(p => {
            if (p.hp <= 0) p.hp = 1;
            if (!Array.isArray(p.statusEffects)) p.statusEffects = [];
            if (typeof p.fury !== 'number') p.fury = 0;
            if (typeof p.shield !== 'number') p.shield = 0;
        });

        this.monsters.forEach(m => {
            if (!Array.isArray(m.statusEffects)) m.statusEffects = [];
            if (typeof m.shield !== 'number') m.shield = 0;
            if (!m.phase) m.phase = 1;
            m.phase2Triggered = Boolean(m.phase2Triggered);
            m._deathProcessed = false;
        });

        const hasBoss = this.monsters.some(m => m.isBoss);
        const audio = this._getAudio();
        if (audio) {
            audio.play?.('combat');
            audio.playMusic?.(hasBoss ? 'boss' : 'combat');
        }

        this._emit('combatStarted', this.monsters);

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
                const roll = this._randomInt(1, 20);
                const agi = p.getTotalAttr('agi');
                const speed = roll + agi;
                this.initiativeOrder.push({ type: 'player', index: idx, speed: speed, ref: p });
                this.logSystem(`[Iniciativa] ${p.name} rolou d20(${roll}) + Agi(${agi}) = ${speed}`);
            }
        });
        
        this.monsters.forEach((m, idx) => {
            if (m.hp > 0) {
                const roll = this._randomInt(1, 20);
                // Assume base agility 10 for generic monsters, or scale with level
                const agi = 5 + Math.floor(m.level / 2);
                const speed = roll + agi;
                this.initiativeOrder.push({ type: 'monster', index: idx, speed: speed, ref: m });
                this.logSystem(`[Iniciativa] ${m.name} rolou d20(${roll}) + Agi(${agi}) = ${speed}`);
            }
        });
        
        this.initiativeOrder.sort((a, b) => b.speed - a.speed);
        this.turnQueue = [...this.initiativeOrder]; // Start first round
        this._emit('turnQueueUpdated', this.turnQueue);
    }

    // CORREÇÃO: Adicionada a flag de segurança "isProcessingTurn" para evitar sobreposição de ações
    nextTurn() {
        if (!this.inCombat || this.isProcessingTurn) return;
        this.isProcessingTurn = true; // Trava contra cliques duplos de UI

        // Limpa queue de mortos
        this.turnQueue = this.turnQueue.filter(q => {
            if (q.type === 'player') return this.party[q.index].hp > 0;
            if (q.type === 'monster') return this.monsters[q.index].hp > 0;
            return false;
        });

        if (this.monsters.every(m => m.hp <= 0) && !this.waitingNextWave) {
            this.winCombat();
            return;
        }

        if (this.party.every(p => p.hp <= 0)) {
            this.loseCombat();
            return;
        }

        if (this.turnQueue.length === 0) {
            if (this.waitingNextWave) {
                if (this.freeTurnsRemaining <= 0) {
                    this.waitingNextWave = false;
                    this.infiniteWave++;
                    this.isProcessingTurn = false;
                    this.spawnNextInfiniteWave();
                    return;
                }
                
                // Em modo de espera, os monstros estão mortos/vazios e queremos só a party agindo livremente.
                this.turnQueue = this.initiativeOrder.filter(q => q.type === 'player' && this.party[q.index].hp > 0);
                
                if (this.turnQueue.length === 0) {
                    // Party toda morta no meio da rodada livre?
                    this.loseCombat();
                    return;
                }

            } else {
                this.logSystem('--- Nova Rodada ---');

                // Process terrains expiration at the start of a new round
                if (this.activeTerrains && this.activeTerrains.length > 0) {
                    this.activeTerrains.forEach(t => t.duration--);
                    this.activeTerrains = this.activeTerrains.filter(t => t.duration > 0);
                }

                this.turnQueue = [...this.initiativeOrder].filter(q => {
                    if (q.type === 'player') return this.party[q.index].hp > 0;
                    if (q.type === 'monster') return this.monsters[q.index].hp > 0;
                    return false;
                });
            }
        }

        this.currentTurnEntity = this.turnQueue.shift();
        
        if (this.waitingNextWave) {
            this.freeTurnsRemaining--;
            if (this.freeTurnsRemaining <= 0) {
                // Ao gastar o ultimo turno, avança a wave imedatamente e impede que passe pro controle
                this.waitingNextWave = false;
                this.infiniteWave++;
                this.isProcessingTurn = false;
                this.spawnNextInfiniteWave();
                return;
            }
        }

        this.hasMovedThisTurn = false;
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;

        this._emit('turnQueueUpdated', this.turnQueue);
        this._emit('combatUpdated', { party: this.party, monsters: this.monsters });

        let turnEntityObj = null;
        const isPlayerTurn = this.currentTurnEntity.type === 'player';

        if (isPlayerTurn) {
            const p = this.party[this.currentTurnEntity.index];
            turnEntityObj = p;
            // Manage defense buffs duration
            if (p.defenseBuffDuration && p.defenseBuffDuration > 0) {
                p.defenseBuffDuration--;
                p.defenseStance = true;
                if (p.defenseBuffDuration === 0) {
                    p.defenseStance = false;
                    p.defenseBuffAmount = 0;
                    this.logSystem(`🛡️ O efeito protetor de ${p.name} se dissipou.`);
                }
            } else {
                p.defenseStance = false;
            }
        } else {
            turnEntityObj = this.monsters[this.currentTurnEntity.index];
        }

        // Process GameMechanics Turn-Start Status Effects (Burn, Poison, Bleed, Stun, Expiry)
        const gm = this._getGM();
        let isStunned = false;
        if (turnEntityObj && gm && typeof gm.processTurnStartStatuses === 'function') {
            const hpBefore = turnEntityObj.hp;
            const shieldBefore = turnEntityObj.shield || 0;
            const hadStun = Array.isArray(turnEntityObj.statusEffects) && turnEntityObj.statusEffects.some(s => (s.id || s.type) === 'stun');
            const statusRes = gm.processTurnStartStatuses(turnEntityObj);
            const rawStatusDmg = (statusRes && (statusRes.totalDamage ?? statusRes.damage)) || 0;

            if (rawStatusDmg > 0 && turnEntityObj.hp === hpBefore && (turnEntityObj.shield || 0) === shieldBefore) {
                turnEntityObj.hp = Math.max(0, turnEntityObj.hp - rawStatusDmg);
            }
            const shownDmg = Math.max(0, hpBefore - turnEntityObj.hp) || rawStatusDmg;
            if (shownDmg > 0) {
                this.logSystem(`🔥 ${turnEntityObj.name} sofreu ${shownDmg} de dano por efeitos contínuos!`);
                this._emit('combatAnimation', isPlayerTurn
                    ? { target: 'player', anim: 'damage', playerIndex: this.currentTurnEntity.index, dmg: shownDmg }
                    : { target: 'monster', anim: 'damage', monsterId: turnEntityObj.instanceId, dmg: shownDmg });
                this._emit('combatVFX', { type: 'status', to: { x: turnEntityObj.gridX, y: turnEntityObj.gridY }, color: '#f97316', dmg: shownDmg });
                if (!isPlayerTurn && turnEntityObj.hp > 0) {
                    this.checkBossPhase2(turnEntityObj);
                }
            }
            if (statusRes && Array.isArray(statusRes.logs)) {
                statusRes.logs.forEach(l => this.logSystem(l));
            }
            isStunned = Boolean(statusRes?.stunned || statusRes?.skipTurn || statusRes?.isStunned || (!statusRes && hadStun));
        } else if (turnEntityObj && Array.isArray(turnEntityObj.statusEffects)) {
            isStunned = turnEntityObj.statusEffects.some(s => (s.id || s.type) === 'stun');
        }

        // Apply Terrain Effects at Start of Turn
        if (turnEntityObj && turnEntityObj.hp > 0 && this.activeTerrains && this.activeTerrains.length > 0) {
            this.activeTerrains.forEach(t => {
                if (t.x === turnEntityObj.gridX && t.y === turnEntityObj.gridY) {
                    this._applyTerrainTileEffect(t, turnEntityObj, isPlayerTurn);
                }
            });
        }

        // Check if turn entity died from status or terrain
        if (turnEntityObj && turnEntityObj.hp <= 0) {
            turnEntityObj.hp = 0;
            if (!isPlayerTurn) {
                this.processMonsterDeath(turnEntityObj);
            }
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            if (this.monsters.every(m => m.hp <= 0) && !this.waitingNextWave) {
                this.isProcessingTurn = false;
                this.winCombat();
            } else if (this.party.every(p => p.hp <= 0)) {
                this.isProcessingTurn = false;
                this.loseCombat();
            } else {
                this.isProcessingTurn = false;
                this.nextTurn();
            }
            return;
        }

        // Check Stun skip
        if (isStunned && turnEntityObj) {
            this.logSystem(`⚡ ${turnEntityObj.name} está atordoado e perdeu o turno!`);
            this._emit('combatVFX', { type: 'status', status: 'stun', to: { x: turnEntityObj.gridX, y: turnEntityObj.gridY }, color: '#facc15' });
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            this.isProcessingTurn = false;
            setTimeout(() => this.nextTurn(), 600);
            return;
        }

        // Compute Movement with GameMechanics frost/slow multiplier
        const agiVal = isPlayerTurn ? turnEntityObj.getTotalAttr('agi') : (5 + Math.floor(turnEntityObj.level / 2));
        let baseMove = 5 + Math.floor(agiVal / 10);
        if (gm && typeof gm.getMovementMultiplier === 'function') {
            const moveMult = gm.getMovementMultiplier(turnEntityObj);
            if (typeof moveMult === 'number' && !isNaN(moveMult)) {
                baseMove = moveMult <= 0 ? 0 : Math.max(1, Math.floor(baseMove * moveMult));
            }
        }
        this.movementRemaining = baseMove;

        if (isPlayerTurn) {
            this.logSystem(`Turno de ${turnEntityObj.name}. Movimento: ${this.movementRemaining} blocos.`);
            this.isProcessingTurn = false;
            this._emit('turnStarted', this.currentTurnEntity.index);
        } else {
            this._emit('turnEnded', null);
            setTimeout(() => {
                this.monsterAttack(turnEntityObj);
                this.isProcessingTurn = false;
            }, 1000);
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
        this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
    }

    cancelGridSelection() {
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;
        this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
    }

    _onEntityMoved(entity, isPlayerMoving, movedPath) {
        if (!movedPath || movedPath.length <= 1) return;
        const idx = isPlayerMoving ? this.party.indexOf(entity) : undefined;
        const entityId = isPlayerMoving ? `player_${idx}` : entity.instanceId;

        this._emit('combatMove', {
            type: isPlayerMoving ? 'player' : 'monster',
            entityType: isPlayerMoving ? 'player' : 'monster',
            entityId,
            playerIndex: idx,
            monsterId: isPlayerMoving ? undefined : entity.instanceId,
            entity,
            path: movedPath,
            pathCoords: movedPath,
            from: movedPath[0],
            to: movedPath[movedPath.length - 1]
        });
        this._getAudio()?.play?.('step');

        const gm = this._getGM();
        if (entity.hp > 0 && gm && typeof gm.processMovementStatuses === 'function') {
            const hpBefore = entity.hp;
            const shieldBefore = entity.shield || 0;
            const steps = movedPath.length - 1;
            const res = gm.processMovementStatuses(entity, steps);
            if (res && (res.damage > 0 || res.triggered)) {
                const rawDmg = res.damage || 0;
                if (rawDmg > 0 && entity.hp === hpBefore && (entity.shield || 0) === shieldBefore) {
                    entity.hp = Math.max(0, entity.hp - rawDmg);
                }
                const shownDmg = Math.max(rawDmg, hpBefore - entity.hp);
                if (shownDmg > 0) {
                    this.logSystem(res.message || `🩸 ${entity.name} sofreu ${shownDmg} de dano ao se mover!`);
                    this._emit('combatAnimation', isPlayerMoving
                        ? { target: 'player', anim: 'damage', playerIndex: idx, dmg: shownDmg }
                        : { target: 'monster', anim: 'damage', monsterId: entity.instanceId, dmg: shownDmg });
                    this._emit('combatVFX', { type: 'status', status: res.status || 'bleed', to: { x: entity.gridX, y: entity.gridY }, color: '#dc2626', dmg: shownDmg });
                    if (!isPlayerMoving && entity.hp > 0) this.checkBossPhase2(entity);
                }
            }
        }
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

        // Basic A* pathfinding for moving to a specific spot, so we can trace the path
        const path = this.findPathAStar(entity.gridX, entity.gridY, x, y, this.movementRemaining, false);
        
        // If no path was found or it's longer than remaining movement (findPathAStar returns path without start node, length is distance)
        if (path.length === 0 || path.length > this.movementRemaining) {
             const dist = Math.abs(entity.gridX - x) + Math.abs(entity.gridY - y);
             if (dist > this.movementRemaining) {
                if (isPlayerMoving) {
                    this.logSystem(`Alcance insuficiente ou caminho bloqueado.`);
                }
                return false;
             } else {
                if (isPlayerMoving) {
                    this.logSystem('Caminho bloqueado.');
                }
                return false;
             }
        }

        // Check if destination cell is occupied
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

        const movedPath = [{ x: entity.gridX, y: entity.gridY }];

        // Process step by step to check for Attacks of Opportunity and Terrains
        for (let step of path) {
            const startX = entity.gridX;
            const startY = entity.gridY;

            entity.gridX = step.x;
            entity.gridY = step.y;
            movedPath.push({ x: step.x, y: step.y });
            this.movementRemaining -= 1;

            // Terrain Effects on move
            if (this.activeTerrains && this.activeTerrains.length > 0) {
                this.activeTerrains.forEach(t => {
                    if (t.x === entity.gridX && t.y === entity.gridY) {
                        this._applyTerrainTileEffect(t, entity, isPlayerMoving);
                    }
                });
            }

            if (entity.hp <= 0) break;

            // Check for Attack of Opportunity
            if (isPlayerMoving) {
                this.monsters.forEach(m => {
                    if (m.hp <= 0) return;
                    const distBefore = Math.abs(startX - m.gridX) + Math.abs(startY - m.gridY);
                    const distAfter = Math.abs(entity.gridX - m.gridX) + Math.abs(entity.gridY - m.gridY);

                    if (distBefore === 1 && distAfter > 1) {
                        this.triggerOpportunityAttack(m, entity, 'monster');
                    }
                });

                if (entity.hp <= 0) {
                     this._onEntityMoved(entity, isPlayerMoving, movedPath);
                     this.logSystem(`${entity.name} caiu devido a um Ataque de Oportunidade!`);
                     setTimeout(() => this.nextTurn(), 1000);
                     return false;
                }
            } else {
                this.party.forEach(p => {
                    if (p.hp <= 0) return;
                    const distBefore = Math.abs(startX - p.gridX) + Math.abs(startY - p.gridY);
                    const distAfter = Math.abs(entity.gridX - p.gridX) + Math.abs(entity.gridY - p.gridY);

                    if (distBefore === 1 && distAfter > 1) {
                        this.triggerOpportunityAttack(p, entity, 'player');
                    }
                });

                if (entity.hp <= 0) {
                     break;
                }
            }
        }

        this._onEntityMoved(entity, isPlayerMoving, movedPath);

        if (!isPlayerMoving && entity.hp <= 0) {
            entity.hp = 0;
            this.processMonsterDeath(entity);
        }

        this.hasMovedThisTurn = true;
        
        if (isPlayerMoving && entity.hp > 0) {
            this.logSystem(`${entity.name} moveu-se. Movimento restante: ${this.movementRemaining}`);
            this.isSelectingMove = false;
        }
        
        this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
        return true;
    }

    triggerOpportunityAttack(attacker, defender, attackerType) {
        if (attackerType === 'monster') {
            let defense = defender.getTotalAttr('def');
            Object.values(defender.equipment || {}).forEach(item => {
                if (item && item.def) defense += item.def;
            });

            let dmg = attacker.dmg - Math.floor(defense * 0.5);
            if (dmg < 1) dmg = 1;

            if (defender.defenseStance) {
                dmg = Math.floor(dmg * 0.5);
                if (dmg < 1) dmg = 1;
            }

            const res = this._applyDamageToPlayer(defender, dmg, attacker);
            this.logMonster(`⚠️ Ataque de Oportunidade! ${attacker.name} atacou ${defender.name} pelas costas e causou ${res.dmg} de dano!`);
            this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: this.party.indexOf(defender), dmg: res.dmg });
            this._emit('combatVFX', { type: 'slash', element: 'fisico', from: { x: attacker.gridX, y: attacker.gridY }, to: { x: defender.gridX, y: defender.gridY }, playerIndex: this.party.indexOf(defender), dmg: res.dmg, color: '#ef4444' });
            this._emit('playerUpdated', defender);
        } else {
            let { min, max } = this.calculatePlayerDamage(attacker);
            let dmg = this._randomInt(min, max);
            dmg = Math.max(1, Math.floor(dmg * 0.5));

            const res = this._applyDamageToMonster(defender, dmg, attacker);
            this.logPlayer(`⚠️ Ataque de Oportunidade! ${attacker.name} atacou ${defender.name} pelas costas e causou ${res.dmg} de dano!`);
            this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: defender.instanceId, dmg: res.dmg });
            this._emit('combatVFX', { type: 'slash', element: 'fisico', from: { x: attacker.gridX, y: attacker.gridY }, to: { x: defender.gridX, y: defender.gridY }, monsterId: defender.instanceId, dmg: res.dmg, color: '#f59e0b' });
            this._getAudio()?.play?.('sword');

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
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
        }
    }

    flee() {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        
        const p = this.party[this.currentTurnEntity.index];
        this._emit('turnEnded', null);

        const fleeChance = 50 + (p.getTotalAttr('agi') * 0.5);
        if (this._randomChance(fleeChance)) {
            this._getAudio()?.play?.('flee');
            this.logSystem(`O grupo conseguiu fugir com sucesso!`);
            this.endCombat(false);
        } else {
            this._getAudio()?.play?.('error');
            this.logSystem(`Falha ao tentar fugir!`);
            this.nextTurn();
        }
    }

    getDistance(e1, e2) {
        return Math.abs(e1.gridX - e2.gridX) + Math.abs(e1.gridY - e2.gridY);
    }

    activateDefenseStance() {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        const p = this.party[this.currentTurnEntity.index];
        p.defenseStance = true;
        this._getAudio()?.play?.('buff');
        this._emit('combatVFX', { type: 'shield', element: 'sagrado', from: { x: p.gridX, y: p.gridY }, to: { x: p.gridX, y: p.gridY }, color: '#60a5fa' });
        this.logSystem(`${p.name} assumiu Posição de Defesa.`);
        this.isSelectingTarget = false;
        this._emit('turnEnded', null);
        setTimeout(() => this.nextTurn(), 500);
    }

    playerAttack(slot = 'weaponMain') {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        const pIndex = this.currentTurnEntity.index;
        const p = this.party[pIndex];

        const target = this.getCurrentTarget();
        if (!target) return;

        // Check Range
        let attackRange = 1; // Default melee
        const weapon = p.equipment?.[slot];
        if (weapon && weapon.range !== undefined) {
            attackRange = weapon.range;
        }
        
        const dist = this.getDistance(p, target);
        if (dist > attackRange) {
            this.logSystem(`${p.name} tentou atacar, mas o alvo está fora de alcance (${dist} > ${attackRange}).`);
            this.isSelectingTarget = false;
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            return;
        }

        this.isSelectingTarget = false;
        this._emit('turnEnded', null);

        let { min, max, weaknessMods } = this.calculatePlayerDamage(p, slot);
        let dmg = this._randomInt(min, max);

        const gm = this._getGM();
        const critBonus = gm?.getPartyBonuses?.()?.critChance || 0;
        const critChance = 5 + (p.getTotalAttr('luk') * 0.2) + (p.getTotalAttr('agi') * 0.1) + critBonus;
        let isCrit = false;
        if (this._randomChance(critChance)) {
            dmg = Math.floor(dmg * 1.5);
            isCrit = true;
            this._recordStat('criticalHits', 1);
        }

        let weaknessMultiplier = 1.0;
        let hitWeakness = false;
        for (let mod of weaknessMods) {
            if (target.weakness && target.weakness.includes(mod)) {
                weaknessMultiplier += 1.0;
                hitWeakness = true;
            }
        }

        dmg = Math.floor(dmg * weaknessMultiplier);
        const res = this._applyDamageToMonster(target, dmg, p);

        // Fury gain: +18 attack, +10 crit, +12 weakness
        let furyGain = 18 + (isCrit ? 10 : 0) + (hitWeakness ? 12 : 0);
        this._addFury(p, furyGain);

        const elem = this._inferElementFromWeapon(weapon);
        const vfxType = weapon?.magic ? 'magic_bolt' : (attackRange >= 4 ? 'arrow' : 'slash');
        const audio = this._getAudio();
        if (audio) {
            audio.play?.(weapon?.magic ? this._getElementSfx(elem, 'magic') : (attackRange >= 4 ? 'bow' : 'sword'));
            if (isCrit) audio.play?.('crit');
        }

        let msg = `${p.name} atacou ${target.name} e causou ${res.dmg} de dano.`;
        if (isCrit) msg = `Acerto Crítico! ` + msg;
        if (hitWeakness) msg += ` (Fraqueza explorada!)`;

        this.logPlayer(msg);
        this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: target.instanceId, dmg: res.dmg, isCrit: isCrit });
        this._emit('combatVFX', {
            type: vfxType,
            style: vfxType,
            element: elem || 'fisico',
            from: { x: p.gridX, y: p.gridY },
            to: { x: target.gridX, y: target.gridY },
            playerIndex: pIndex,
            monsterId: target.instanceId,
            isCrit,
            dmg: res.dmg,
            color: this._getElementColor(elem)
        });

        // Elemental combo check on elemental weapons
        if (elem && target.hp > 0) {
            this._handleElementalReaction(target, elem, p, res.dmg);
        }

        setTimeout(() => {
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });

            if (target.hp <= 0) {
                target.hp = 0;
                this.processMonsterDeath(target);
            }

            if (this.monsters.every(m => m.hp <= 0) && !this.waitingNextWave) {
                this.winCombat();
            } else {
                setTimeout(() => this.nextTurn(), 1000);
            }
        }, 300);
    }

    // Sistema de skills completo com verificação de alcance AoE, reações elementais, status, VFX e áudio
    playerSkill(skill, targetPartyIndex = null, coords = null) {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player' || this.isProcessingTurn) return;
        const pIndex = this.currentTurnEntity.index;
        const p = this.party[pIndex];

        if (!skill) return;

        if (p.mana < skill.manaCost) {
            this.logSystem(`${p.name} tem mana insuficiente. Requer ${skill.manaCost} Mana.`);
            this._getAudio()?.play?.('error');
            this.isSelectingTarget = false;
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            return;
        }

        let skillRange = skill.range || 4;
        const target = this.getCurrentTarget();

        if (skill.type === 'attack' || skill.type === 'drain') {
            const rangeTarget = skill.isAoE ? (target || this.monsters.find(m => m.hp > 0)) : target;
            if (rangeTarget) {
                const dist = this.getDistance(p, rangeTarget);
                if (dist > skillRange) {
                    this.logSystem(`${p.name} tentou usar habilidade, mas o alvo está fora de alcance (${dist} > ${skillRange}).`);
                    this._getAudio()?.play?.('error');
                    this.isSelectingTarget = false;
                    this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
                    return;
                }
            }
        } else if (skill.type === 'terrain' && coords && skill.range > 0) {
            const dist = Math.abs(p.gridX - coords.x) + Math.abs(p.gridY - coords.y);
            if (dist > skillRange) {
                this.logSystem(`${p.name} tentou conjurar terreno fora de alcance (${dist} > ${skillRange}).`);
                this._getAudio()?.play?.('error');
                this.isSelectingTarget = false;
                this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
                return;
            }
        }

        this.isProcessingTurn = true;
        this.isSelectingTarget = false;
        this._emit('turnEnded', null);
        p.mana -= skill.manaCost;
        this._addFury(p, 15);
        this._emit('playerUpdated', p);

        const gm = this._getGM();
        const audio = this._getAudio();

        if (skill.type === 'attack' || skill.type === 'drain') {
            let { min, max } = this.calculatePlayerDamage(p);
            let baseDmg = this._randomInt(min, max);
            if (skill.element && p.getTotalAttr) {
                baseDmg = Math.max(baseDmg, Math.floor(baseDmg + p.getTotalAttr('int') * 0.5));
            }
            let targets = [];
            const center = target || this.monsters.find(m => m.hp > 0);

            if (skill.isAoE) {
                if (center) {
                    targets = this.monsters.filter(m => m.hp > 0 && this.getDistance(center, m) <= (skill.aoeRadius || 2));
                }
            } else if (target) {
                targets.push(target);
            }

            if (targets.length === 0) {
                this.isProcessingTurn = false;
                this.nextTurn();
                return;
            }

            audio?.play?.(this._getElementSfx(skill.element, 'magic'));

            let totalHeal = 0;
            let logMsg = `${p.name} usou [${skill.name}]`;
            if (skill.isAoE) logMsg += ` em área!`;

            this._emit('combatVFX', {
                type: skill.isAoE ? 'aoe_burst' : 'projectile',
                element: skill.element || 'arcano',
                from: { x: p.gridX, y: p.gridY },
                to: center ? { x: center.gridX, y: center.gridY } : { x: targets[0].gridX, y: targets[0].gridY },
                targets: targets.map(t => ({ x: t.gridX, y: t.gridY, id: t.instanceId })),
                radius: skill.isAoE ? (skill.aoeRadius || 2) : 1,
                playerIndex: pIndex,
                monsterId: !skill.isAoE ? targets[0].instanceId : undefined,
                color: this._getElementColor(skill.element)
            });

            targets.forEach(t => {
                let rawDmg = Math.floor(baseDmg * (skill.multiplier || 1.5));
                let hitWeakness = false;
                if (skill.element && t.weakness && t.weakness.some(w => w.toLowerCase().includes(skill.element.toLowerCase()))) {
                    rawDmg = Math.floor(rawDmg * 2.0);
                    hitWeakness = true;
                }
                if (hitWeakness) this._addFury(p, 12);

                const res = this._applyDamageToMonster(t, rawDmg, p);
                if (skill.type === 'drain') totalHeal += Math.floor(res.dmg * 0.5);
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: t.instanceId, dmg: res.dmg });

                // Elemental Reaction + Status Effect application
                if (t.hp > 0 && skill.element) {
                    this._handleElementalReaction(t, skill.element, p, res.dmg);
                }
                if (t.hp > 0 && gm && typeof gm.applyStatus === 'function') {
                    const statusId = skill.statusEffect || this._mapElementToStatus(skill.element);
                    if (statusId) {
                        const chance = skill.statusChance ?? (skill.statusEffect ? 100 : 80);
                        if (chance >= 100 || this._randomChance(chance)) {
                            gm.applyStatus(t, statusId, {
                                duration: skill.statusDuration || 3,
                                caster: p,
                                damage: Math.max(5, Math.floor(res.dmg * 0.25))
                            });
                            audio?.play?.('debuff');
                        }
                    }
                }
            });

            this.logPlayer(logMsg);
            if (totalHeal > 0) {
                p.heal(totalHeal);
                this._recordStat('totalHealingDone', totalHeal);
            }

            setTimeout(() => {
                this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
                targets.forEach(t => { if (t.hp <= 0) { t.hp = 0; this.processMonsterDeath(t); } });

                if (this.monsters.every(m => m.hp <= 0) && !this.waitingNextWave) this.winCombat();
                else { this.isProcessingTurn = false; setTimeout(() => this.nextTurn(), 1000); }
            }, 600);

        } else if (skill.type === 'heal') {
            let targets = skill.isAoE ? this.party.filter(m => m.hp > 0) : [(targetPartyIndex !== null && this.party[targetPartyIndex]) ? this.party[targetPartyIndex] : p];
            this.logPlayer(`${p.name} usou [${skill.name}] curando aliados!`);
            audio?.play?.('heal');

            this._emit('combatVFX', {
                type: 'heal',
                element: 'sagrado',
                from: { x: p.gridX, y: p.gridY },
                to: targets[0] ? { x: targets[0].gridX, y: targets[0].gridY } : { x: p.gridX, y: p.gridY },
                targets: targets.map(tp => ({ x: tp.gridX, y: tp.gridY, playerIndex: this.party.indexOf(tp) })),
                color: '#4ade80'
            });

            targets.forEach(targetP => {
                const healAmt = Math.floor(skill.healAmount || 50);
                targetP.heal(healAmt);
                this._recordStat('totalHealingDone', healAmt);
                this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: this.party.indexOf(targetP), dmg: healAmt, isHeal: true });
            });
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            setTimeout(() => { this.isProcessingTurn = false; this.nextTurn(); }, 1000);

        } else if (skill.type === 'buff' || skill.type === 'buff_taunt' || skill.type === 'taunt') {
            let msg = `🛡️ ${p.name} usou [${skill.name}]!`;
            audio?.play?.('buff');

            this._emit('combatVFX', {
                type: 'shield',
                element: 'sagrado',
                from: { x: p.gridX, y: p.gridY },
                to: { x: p.gridX, y: p.gridY },
                playerIndex: pIndex,
                color: '#60a5fa'
            });

            if (skill.type === 'taunt' || skill.type === 'buff_taunt') {
                let tauntedCount = 0;
                const duration = skill.tauntDuration || skill.duration || 3;
                this.monsters.forEach(m => {
                    if (m.hp > 0 && this.attemptTaunt(p, m, duration)) {
                        tauntedCount++;
                    }
                });
                msg += ` (${tauntedCount} inimigo(s) provocado(s)!)`;
            }

            if (skill.type === 'buff' || skill.type === 'buff_taunt') {
                msg += ` (Aumento de Defesa: ${skill.amount ? Math.round(skill.amount * 100) : 50}%)`;
                p.defenseStance = true;
                p.defenseBuffAmount = skill.amount || 0.5;
                p.defenseBuffDuration = skill.buffDuration || skill.duration || 3;
                if (gm && typeof gm.applyStatus === 'function') {
                    gm.applyStatus(p, 'shield', { duration: p.defenseBuffDuration, shieldAmount: Math.round(p.getMaxHp() * 0.2) });
                }
            }

            this.logPlayer(msg);
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            setTimeout(() => { this.isProcessingTurn = false; this.nextTurn(); }, 1000);

        } else if (skill.type === 'terrain') {
            if (!coords) coords = { x: p.gridX, y: p.gridY };
            this.logPlayer(`🌋 ${p.name} conjurou [${skill.name}], alterando o campo de batalha em (${coords.x}, ${coords.y})!`);

            let dmgMult = skill.multiplier || 1.0;
            let baseTerrainDmg = 10 * dmgMult + p.getTotalAttr('int') * 2;
            let terrainRadius = skill.aoeRadius || 1;
            const elemMap = { fire: 'fogo', lava: 'fogo', ice: 'gelo', holy: 'sagrado', healing: 'sagrado', blessing: 'sagrado', spikes: 'veneno', mine: 'fogo' };
            const terrainElem = elemMap[skill.terrainType] || 'arcano';

            audio?.play?.(this._getElementSfx(terrainElem, 'magic'));
            this._emit('combatVFX', {
                type: 'terrain',
                terrainType: skill.terrainType,
                element: terrainElem,
                from: { x: p.gridX, y: p.gridY },
                to: { x: coords.x, y: coords.y },
                radius: terrainRadius,
                color: this._getElementColor(skill.terrainType)
            });

            // Create terrain cells
            const createdCells = [];
            for (let tx = coords.x - terrainRadius; tx <= coords.x + terrainRadius; tx++) {
                for (let ty = coords.y - terrainRadius; ty <= coords.y + terrainRadius; ty++) {
                    if (tx >= 0 && tx < this.gridWidth && ty >= 0 && ty < this.gridHeight) {
                        const cell = {
                            x: tx,
                            y: ty,
                            type: skill.terrainType,
                            damage: Math.floor(baseTerrainDmg),
                            heal: skill.healAmount || Math.floor(baseTerrainDmg),
                            duration: skill.duration || 3,
                            casterId: p.name
                        };
                        this.activeTerrains.push(cell);
                        createdCells.push(cell);
                    }
                }
            }

            // Apply immediate terrain effect using unified helper (supports 'holy' healing/blessing allies & hurting undead/demons!)
            const sampleCell = createdCells[0] || {
                type: skill.terrainType,
                damage: Math.floor(baseTerrainDmg),
                heal: skill.healAmount || Math.floor(baseTerrainDmg),
                casterId: p.name
            };

            this.monsters.forEach(m => {
                if (m.hp > 0 && Math.abs(m.gridX - coords.x) <= terrainRadius && Math.abs(m.gridY - coords.y) <= terrainRadius) {
                    this._applyTerrainTileEffect(sampleCell, m, false);
                }
            });

            if (skill.terrainType === 'healing' || skill.terrainType === 'blessing' || skill.terrainType === 'holy') {
                this.party.forEach(member => {
                    if (member.hp > 0 && Math.abs(member.gridX - coords.x) <= terrainRadius && Math.abs(member.gridY - coords.y) <= terrainRadius) {
                        this._applyTerrainTileEffect(sampleCell, member, true);
                    }
                });
            }

            setTimeout(() => {
                this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
                this.monsters.forEach(t => { if (t.hp <= 0) { t.hp = 0; this.processMonsterDeath(t); } });

                if (this.monsters.every(m => m.hp <= 0) && !this.waitingNextWave) this.winCombat();
                else { this.isProcessingTurn = false; this.nextTurn(); }
            }, 1000);
        }
    }

    useUltimate(targetPartyIndex = null) {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player' || this.isProcessingTurn) return false;
        const pIndex = this.currentTurnEntity.index;
        const p = this.party[pIndex];
        if (!p || (p.fury || 0) < 100) {
            this.logSystem(`${p ? p.name : 'Herói'} precisa de 100 de Fúria para usar o Supremo!`);
            this._getAudio()?.play?.('error');
            return false;
        }

        const gm = this._getGM();
        const audio = this._getAudio();
        const fallbackUltimates = {
            Guerreiro: { name: 'Lâmina do Cataclismo', element: 'fogo', multiplier: 4.5 },
            Caçador: { name: 'Tempestade Estelar', element: 'raio', multiplier: 3.8 },
            Guardião: { name: 'Égide da Ordem', element: 'sagrado', multiplier: 2.5 },
            Mago: { name: 'Colapso Arcano', element: 'arcano', multiplier: 4.8 },
            Clérigo: { name: 'Alvorada Eterna', element: 'sagrado', multiplier: 3.5 },
            Nenhuma: { name: 'Golpe do Vigia', element: 'fisico', multiplier: 4.0 }
        };
        const gmUlt = gm?.getUltimateForClass ? gm.getUltimateForClass(p.playerClass) : null;
        const baseUlt = fallbackUltimates[p.playerClass] || fallbackUltimates.Nenhuma;
        const ultName = gmUlt?.name || baseUlt.name;
        const ultMult = gmUlt?.multiplier || baseUlt.multiplier;
        const ultElem = gmUlt?.element || baseUlt.element;

        p.fury = 0;
        this.isProcessingTurn = true;
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;
        this._emit('playerUpdated', p);
        this._emit('turnEnded', null);

        audio?.play?.('ultimate');
        this._recordStat('ultimatesUsed', 1);

        const livingMonsters = this.monsters.filter(m => m.hp > 0);
        const primary = this.getCurrentTarget() || livingMonsters[0];
        let { min, max } = this.calculatePlayerDamage(p);
        const baseDmg = this._randomInt(min, max) + (p.getTotalAttr ? Math.floor(p.getTotalAttr('int') * 0.6) : 0);

        let vfxTargets = livingMonsters.map(m => ({ x: m.gridX, y: m.gridY, id: m.instanceId }));
        let affectedMonsters = [];

        if (p.playerClass === 'Guerreiro') {
            const center = primary;
            affectedMonsters = center
                ? livingMonsters.filter(m => m === center || this.getDistance(center, m) <= 3)
                : [];
            affectedMonsters.forEach((m, i) => {
                const raw = Math.floor(baseDmg * ultMult * (i === 0 ? 1.25 : 0.9));
                const res = this._applyDamageToMonster(m, raw, p);
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: m.instanceId, dmg: res.dmg, isCrit: true });
                if (m.hp > 0 && gm?.applyStatus) {
                    gm.applyStatus(m, 'bleed', { duration: 3, caster: p });
                    if (i === 0) gm.applyStatus(m, 'stun', { duration: 1, caster: p });
                }
            });
            this.logPlayer(`🔥 SUPREMO! ${p.name} desencadeou [${ultName}] devastando a linha inimiga!`);
        } else if (p.playerClass === 'Caçador') {
            affectedMonsters = livingMonsters;
            affectedMonsters.forEach(m => {
                const raw = Math.floor(baseDmg * ultMult);
                const res = this._applyDamageToMonster(m, raw, p);
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: m.instanceId, dmg: res.dmg, isCrit: true });
                if (m.hp > 0) this._handleElementalReaction(m, 'raio', p, res.dmg);
                if (m.hp > 0 && gm?.applyStatus) {
                    gm.applyStatus(m, 'bleed', { duration: 3, caster: p });
                    gm.applyStatus(m, 'shock', { duration: 2, caster: p });
                }
            });
            this.logPlayer(`🏹 SUPREMO! ${p.name} disparou [${ultName}] atingindo todos os inimigos!`);
        } else if (p.playerClass === 'Guardião') {
            this.party.forEach((ally, idx) => {
                if (ally.hp > 0) {
                    const shieldAmt = Math.max(50, Math.round(p.getMaxHp() * 0.50));
                    if (gm?.applyStatus) {
                        gm.applyStatus(ally, 'shield', { duration: 4, shieldAmount: shieldAmt });
                        gm.applyStatus(ally, 'blessing', { duration: 3, caster: p });
                    } else {
                        ally.shield = (ally.shield || 0) + shieldAmt;
                    }
                    ally.defenseStance = true;
                    ally.defenseBuffAmount = Math.max(ally.defenseBuffAmount || 0, 0.4);
                    ally.defenseBuffDuration = Math.max(ally.defenseBuffDuration || 0, 3);
                    this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: idx, dmg: shieldAmt, isHeal: true });
                }
            });
            affectedMonsters = livingMonsters.filter(m => this.getDistance(p, m) <= 3);
            if (affectedMonsters.length === 0 && primary) affectedMonsters = [primary];
            affectedMonsters.forEach(m => {
                const raw = Math.floor(baseDmg * ultMult);
                const res = this._applyDamageToMonster(m, raw, p);
                m.tauntedBy = p;
                m.tauntDuration = 4;
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: m.instanceId, dmg: res.dmg });
            });
            vfxTargets = this.party.filter(a => a.hp > 0).map(a => ({ x: a.gridX, y: a.gridY }));
            this.logPlayer(`🛡️ SUPREMO! ${p.name} ergueu [${ultName}] protegendo todo o grupo!`);
        } else if (p.playerClass === 'Mago') {
            affectedMonsters = livingMonsters;
            affectedMonsters.forEach(m => {
                const raw = Math.floor(baseDmg * ultMult);
                const res = this._applyDamageToMonster(m, raw, p);
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: m.instanceId, dmg: res.dmg, isCrit: true });
                if (m.hp > 0) this._handleElementalReaction(m, 'fogo', p, res.dmg);
                if (m.hp > 0 && gm?.applyStatus) {
                    gm.applyStatus(m, 'burn', { duration: 3, caster: p });
                    gm.applyStatus(m, 'shock', { duration: 2, caster: p });
                }
            });
            this.logPlayer(`🔮 SUPREMO! ${p.name} conjurou [${ultName}] obliterando o campo!`);
        } else if (p.playerClass === 'Clérigo') {
            this.party.forEach((ally, idx) => {
                if (ally.hp <= 0) {
                    ally.hp = Math.max(1, Math.round(ally.getMaxHp() * 0.40));
                }
                const healAmt = Math.max(80, Math.round(ally.getMaxHp() * 0.45) + (p.getTotalAttr ? p.getTotalAttr('int') * 4 : 40));
                ally.heal(healAmt);
                this._recordStat('totalHealingDone', healAmt);
                if (gm?.cleanseNegativeStatuses) gm.cleanseNegativeStatuses(ally);
                if (gm?.applyStatus) gm.applyStatus(ally, 'blessing', { duration: 3, caster: p });
                this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: idx, dmg: healAmt, isHeal: true });
            });
            affectedMonsters = livingMonsters;
            affectedMonsters.forEach(m => {
                const raw = Math.floor(baseDmg * ultMult);
                const res = this._applyDamageToMonster(m, raw, p);
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: m.instanceId, dmg: res.dmg });
                if (m.hp > 0) this._handleElementalReaction(m, 'sagrado', p, res.dmg);
            });
            this.logPlayer(`✨ SUPREMO! ${p.name} invocou [${ultName}] restaurando o grupo e purificando as trevas!`);
        } else {
            if (primary) {
                affectedMonsters = [primary];
                const raw = Math.floor(baseDmg * ultMult);
                const res = this._applyDamageToMonster(primary, raw, p);
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: primary.instanceId, dmg: res.dmg, isCrit: true });
                if (primary.hp > 0 && gm?.applyStatus) gm.applyStatus(primary, 'stun', { duration: 1, caster: p });
            }
            this.logPlayer(`⚡ SUPREMO! ${p.name} executou [${ultName}]!`);
        }

        this._emit('combatVFX', {
            type: 'ultimate',
            ultimateName: ultName,
            playerClass: p.playerClass,
            element: ultElem,
            playerIndex: pIndex,
            from: { x: p.gridX, y: p.gridY },
            to: primary ? { x: primary.gridX, y: primary.gridY } : { x: p.gridX, y: p.gridY },
            targets: vfxTargets,
            radius: 4,
            color: '#fbbf24'
        });

        setTimeout(() => {
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            this.monsters.forEach(m => {
                if (m.hp <= 0) {
                    m.hp = 0;
                    this.processMonsterDeath(m);
                }
            });

            if (this.monsters.every(m => m.hp <= 0) && !this.waitingNextWave) {
                this.winCombat();
            } else {
                this.isProcessingTurn = false;
                setTimeout(() => this.nextTurn(), 900);
            }
        }, 500);

        return true;
    }

    processMonsterDeath(monster) {
        if (!monster || monster._deathProcessed) return;
        monster._deathProcessed = true;

        this.logSystem(`${monster.name} foi derrotado!`);
        this._emit('combatAnimation', { target: 'monster', anim: 'death', monsterId: monster.instanceId });
        this._getAudio()?.play?.('death');
        this._recordStat('enemiesDefeated', 1);
        if (monster.isBoss) this._recordStat('bossesDefeated', 1);

        const loot = (typeof window !== 'undefined' && window.MonsterDatabase)
            ? window.MonsterDatabase.getLoot(monster)
            : { xp: monster.xp || 0, gold: monster.gold || 0, items: [] };
        
        // Split XP globally
        const xpPerMember = Math.floor((loot.xp || 0) / Math.max(1, this.party.length));
        this.party.forEach(p => {
            if (p.hp > 0 && typeof p.gainXp === 'function') p.gainXp(xpPerMember);
        });
        
        if (this.party[0] && typeof this.party[0].gainGold === 'function') {
            this.party[0].gainGold(loot.gold || 0);
        }
        
        this.logSystem(`Recebeu ${loot.xp || 0} XP (${xpPerMember} para cada) e ${loot.gold || 0} Ouro.`);

        if (this.inventory && typeof this.inventory.addItem === 'function' && Array.isArray(loot.items)) {
            loot.items.forEach(item => this.inventory.addItem(item));
        }
        
        this._emit('bestiaryUpdate', monster);
        this._emit('questUpdate', { type: 'kill', monsterId: monster.id, qty: 1 });
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

                // Verificação de Terrenos Bloqueadores
                let isBlockedByTerrain = false;
                let terrainPenalty = 0;
                if (this.activeTerrains) {
                    this.activeTerrains.forEach(t => {
                        if (t.x === nextX && t.y === nextY) {
                            if (t.type === 'wall' || t.type === 'ice') {
                                isBlockedByTerrain = true;
                            } else if (t.type !== 'healing' && t.type !== 'blessing') {
                                terrainPenalty = 5; // Penalty for walking through fire/damaging tiles
                            }
                        }
                    });
                }

                // Allow target space to be considered if we are trying to reach it or if we exclude it
                if ((isOccupied || isBlockedByTerrain) && (!excludeTarget || !(nextX === targetX && nextY === targetY))) {
                    continue;
                }

                const gCost = currentNode.g + 1 + terrainPenalty;
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

        // Handle Taunt duration
        if (attacker.tauntDuration && attacker.tauntDuration > 0) {
            attacker.tauntDuration--;
            if (attacker.tauntDuration === 0) {
                 attacker.tauntedBy = null;
            }
        }

        let targetP = null;
        let minDist = Infinity;
        const ai = attacker.ai || { targetPriority: 'CLOSEST', moveType: 'ASTAR' };

        // Helper to get defense
        const getPlayerDef = (p) => {
            let defense = p.getTotalAttr('def');
            Object.values(p.equipment).forEach(item => {
                if (item && item.def) defense += item.def;
            });
            return defense;
        };

        // TARGET PRIORITY SWITCH
        if (attacker.tauntedBy && attacker.tauntedBy.hp > 0) {
            targetP = attacker.tauntedBy;
            minDist = this.getDistance(attacker, targetP);
        } else {
        switch (ai.targetPriority) {
            case 'HIGHEST_DEF_HP': {
                let bestScore = -Infinity;
                livingPlayers.forEach(p => {
                    const score = p.getMaxHp() + getPlayerDef(p);
                    if (score > bestScore) {
                        bestScore = score;
                        targetP = p;
                    }
                });
                minDist = this.getDistance(attacker, targetP);
                break;
            }
            case 'MAGE_OR_LOWEST_DEF': {
                let mages = livingPlayers.filter(p => p.playerClass === 'Mago' || p.playerClass === 'Clérigo');
                let pool = mages.length > 0 ? mages : livingPlayers;

                let lowestDef = Infinity;
                pool.forEach(p => {
                    const def = getPlayerDef(p);
                    if (def < lowestDef) {
                        lowestDef = def;
                        targetP = p;
                    }
                });
                minDist = this.getDistance(attacker, targetP);
                break;
            }
            case 'ISOLATED': {
                let bestIsolScore = Infinity;
                livingPlayers.forEach(p => {
                    let adjacentEnemies = 0;
                    this.monsters.forEach(m => {
                        if (m.hp > 0 && this.getDistance(m, p) === 1) adjacentEnemies++;
                    });
                    if (adjacentEnemies < bestIsolScore) {
                        bestIsolScore = adjacentEnemies;
                        targetP = p;
                    }
                });
                minDist = this.getDistance(attacker, targetP);
                break;
            }
            case 'LOWEST_HP': {
                let lowestHp = Infinity;
                livingPlayers.forEach(p => {
                    if (p.hp < lowestHp) {
                        lowestHp = p.hp;
                        targetP = p;
                    }
                });
                minDist = this.getDistance(attacker, targetP);
                break;
            }
            case 'CLOSEST':
            default: {
                livingPlayers.forEach(p => {
                    const dist = this.getDistance(attacker, p);
                    if (dist < minDist) {
                        minDist = dist;
                        targetP = p;
                    }
                });
                break;
            }
        }
        }

        const targetPIndex = this.party.indexOf(targetP);
        let attackRange = 1; // Default

        // Se estiver provocado (Taunt), o monstro perde a racionalidade e força ASTAR (corpo a corpo direto) ignorando evasão
        let effectiveMoveType = ai.moveType;
        if (attacker.tauntedBy && attacker.tauntedBy.hp > 0) {
            effectiveMoveType = 'ASTAR';
        }

        if (effectiveMoveType === 'KITING_EDGES') attackRange = 3;

        let forceEndTurn = false;

        if (minDist > attackRange || effectiveMoveType === 'KITING_EDGES') {
            let stepsTaken = 0;
            const maxSteps = this.movementRemaining;

            switch (effectiveMoveType) {
                case 'ZOMBIE_WALK': {
                    const zPath = [{ x: attacker.gridX, y: attacker.gridY }];
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
                            zPath.push({ x: nextX, y: nextY });
                            stepsTaken++;
                        } else break;
                    }
                    if (stepsTaken > 0) {
                        this._onEntityMoved(attacker, false, zPath);
                        this.logSystem(`${attacker.name} moveu-se lentamente em direção a ${targetP.name}.`);
                        this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
                    }
                    break;
                }
                case 'SWARM': {
                    let nearbyFriends = 0;
                    this.monsters.forEach(m => {
                        if (m !== attacker && m.hp > 0 && m.ai && m.ai.moveType === 'SWARM' && this.getDistance(m, attacker) <= 2) {
                            nearbyFriends++;
                        }
                    });

                    if (nearbyFriends === 0) {
                        let nearestFriend = null;
                        let minFDist = Infinity;
                        this.monsters.forEach(m => {
                            if (m !== attacker && m.hp > 0 && m.ai && m.ai.moveType === 'SWARM') {
                                const dist = this.getDistance(m, attacker);
                                if (dist < minFDist) {
                                    minFDist = dist;
                                    nearestFriend = m;
                                }
                            }
                        });

                        if (nearestFriend) {
                            const path = this.findPathAStar(attacker.gridX, attacker.gridY, nearestFriend.gridX, nearestFriend.gridY, maxSteps, true);
                            if (path.length > 0) {
                                const targetStep = path[Math.min(path.length, maxSteps) - 1];
                                this.moveEntityTo(targetStep.x, targetStep.y);
                            }
                            this.logMonster(`${attacker.name} recuou para se juntar ao bando.`);
                            forceEndTurn = true;
                        } else {
                            // Totalmente sozinho, ataca normal
                            const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetP.gridX, targetP.gridY, maxSteps, true);
                            if (path.length > 0) {
                                const targetStep = path[Math.min(path.length, maxSteps) - 1];
                                this.moveEntityTo(targetStep.x, targetStep.y);
                            }
                        }
                    } else {
                        const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetP.gridX, targetP.gridY, maxSteps, true);
                        if (path.length > 0) {
                            const targetStep = path[Math.min(path.length, maxSteps) - 1];
                            this.moveEntityTo(targetStep.x, targetStep.y);
                        }
                    }
                    break;
                }
                case 'ETHEREAL': {
                    const ePath = [{ x: attacker.gridX, y: attacker.gridY }];
                    const originalGetOccupied = (x, y) => {
                         return this.party.some(p => p.hp > 0 && p.gridX === x && p.gridY === y) ||
                                this.monsters.some(m => m.hp > 0 && m.gridX === x && m.gridY === y);
                    };

                    while (stepsTaken < maxSteps && this.getDistance(attacker, targetP) > attackRange) {
                        let nextX = attacker.gridX;
                        let nextY = attacker.gridY;
                        if (attacker.gridX < targetP.gridX) nextX++;
                        else if (attacker.gridX > targetP.gridX) nextX--;
                        else if (attacker.gridY < targetP.gridY) nextY++;
                        else if (attacker.gridY > targetP.gridY) nextY--;

                        attacker.gridX = nextX;
                        attacker.gridY = nextY;
                        ePath.push({ x: nextX, y: nextY });
                        stepsTaken++;
                    }

                    if (originalGetOccupied(attacker.gridX, attacker.gridY)) {
                        let found = false;
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (!originalGetOccupied(attacker.gridX + dx, attacker.gridY + dy)) {
                                    attacker.gridX += dx;
                                    attacker.gridY += dy;
                                    ePath[ePath.length - 1] = { x: attacker.gridX, y: attacker.gridY };
                                    found = true;
                                    break;
                                }
                            }
                            if (found) break;
                        }
                    }

                    if (stepsTaken > 0) {
                        this._onEntityMoved(attacker, false, ePath);
                        this.logSystem(`${attacker.name} flutuou espectralmente.`);
                        this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
                    }
                    break;
                }
                case 'KITING_EDGES': {
                    if (minDist <= 1) {
                        // Flee from player
                        let dx = attacker.gridX - targetP.gridX;
                        let dy = attacker.gridY - targetP.gridY;

                        let runX = attacker.gridX + (dx > 0 ? 1 : -1);
                        let runY = attacker.gridY + (dy > 0 ? 1 : -1);

                        runX = Math.max(0, Math.min(this.gridWidth - 1, runX));
                        runY = Math.max(0, Math.min(this.gridHeight - 1, runY));

                        const path = this.findPathAStar(attacker.gridX, attacker.gridY, runX, runY, maxSteps, false);
                        if (path.length > 0) {
                            const targetStep = path[Math.min(path.length, maxSteps) - 1];
                            this.moveEntityTo(targetStep.x, targetStep.y);
                        }
                        this.logMonster(`${attacker.name} recuou rapidamente!`);
                        forceEndTurn = true;
                    } else if (minDist > attackRange) {
                        // Kiting approach: prioritize y=0 or y=height-1
                        let targetY = targetP.gridY < this.gridHeight / 2 ? 0 : this.gridHeight - 1;
                        let targetX = targetP.gridX;

                        const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetX, targetY, maxSteps, true);
                        if (path.length > 0) {
                            const targetStep = path[Math.min(path.length, maxSteps) - 1];
                            this.moveEntityTo(targetStep.x, targetStep.y);
                        }
                    }
                    break;
                }
                case 'PHALANX': {
                    let adjacentSkele = null;
                    this.monsters.forEach(m => {
                        if (m !== attacker && m.hp > 0 && m.ai && m.ai.moveType === 'PHALANX') {
                            if (this.getDistance(m, attacker) === 1) adjacentSkele = m;
                        }
                    });

                    if (!adjacentSkele) {
                        let nearestSkele = null;
                        let minSDist = Infinity;
                        this.monsters.forEach(m => {
                            if (m !== attacker && m.hp > 0 && m.ai && m.ai.moveType === 'PHALANX') {
                                const dist = this.getDistance(m, attacker);
                                if (dist < minSDist) {
                                    minSDist = dist;
                                    nearestSkele = m;
                                }
                            }
                        });

                        // Seek skeleton while moving to player
                        if (nearestSkele && minDist > attackRange) {
                             const path = this.findPathAStar(attacker.gridX, attacker.gridY, nearestSkele.gridX, nearestSkele.gridY, maxSteps, true);
                             if (path.length > 0) {
                                 const targetStep = path[Math.min(path.length, maxSteps) - 1];
                                 this.moveEntityTo(targetStep.x, targetStep.y);
                             }
                        } else {
                             const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetP.gridX, targetP.gridY, maxSteps, true);
                             if (path.length > 0) {
                                 const targetStep = path[Math.min(path.length, maxSteps) - 1];
                                 this.moveEntityTo(targetStep.x, targetStep.y);
                             }
                        }
                    } else {
                        // Move with Phalanx
                        const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetP.gridX, targetP.gridY, maxSteps, true);
                        if (path.length > 0) {
                            const targetStep = path[Math.min(path.length, maxSteps) - 1];
                            this.moveEntityTo(targetStep.x, targetStep.y);
                        }
                    }
                    break;
                }
                case 'ASTAR':
                default: {
                    const path = this.findPathAStar(attacker.gridX, attacker.gridY, targetP.gridX, targetP.gridY, maxSteps, true);
                    if (path.length > 0) {
                        const targetStep = path[Math.min(path.length, maxSteps) - 1];
                        this.moveEntityTo(targetStep.x, targetStep.y);
                    }
                    break;
                }
            }

            // Recalculate distance after move
            minDist = this.getDistance(attacker, targetP);
        }

        if (forceEndTurn || minDist > attackRange || attacker.hp <= 0) {
             if (attacker.hp > 0 && !forceEndTurn) {
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
            this._getAudio()?.play?.('buff');
            this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: attacker.instanceId, dmg: heal, isHeal: true });

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
                this._emit('combatAnimation', { target: 'monster', anim: 'damage', monsterId: attacker.instanceId, dmg: heal, isHeal: true });
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

        if (targetP.defenseStance) {
            let reduction = targetP.defenseBuffAmount || 0.5;
            dmg = Math.floor(dmg * (1 - reduction));
            if (dmg < 1) dmg = 1;
            this.logMonster(`🛡️ O ataque foi mitigado pela postura de defesa de ${targetP.name}!`);
        }

        this._emit('combatAnimation', { target: 'monster', anim: 'attack', monsterId: attacker.instanceId });
        this._emit('combatVFX', {
            type: attacker.isBoss ? 'magic_bolt' : 'slash',
            element: attacker.isBoss ? 'trevas' : 'fisico',
            from: { x: attacker.gridX, y: attacker.gridY },
            to: { x: targetP.gridX, y: targetP.gridY },
            monsterId: attacker.instanceId,
            playerIndex: targetPIndex,
            color: attacker.isBoss ? '#a855f7' : '#ef4444'
        });

        setTimeout(() => {
            const res = this._applyDamageToPlayer(targetP, dmg, attacker);
            this._emit('combatAnimation', { target: 'player', anim: 'damage', playerIndex: targetPIndex, dmg: res.dmg });
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            this._emit('playerUpdated', targetP);

            setTimeout(() => this.nextTurn(), 600);
        }, 300);
    }

    calculatePlayerDamage(p, slot = 'weaponMain') {
        let min = 1 + Math.floor(p.getTotalAttr('str') * 0.5);
        let max = 2 + p.getTotalAttr('str');
        let weaknessMods = [];

        const weapon = p.equipment?.[slot];
        if (weapon && weapon.type === 'weapon') {
            let wMin = weapon.minDmg || 0;
            let wMax = weapon.maxDmg || 0;

            if (slot === 'weaponOff') {
                wMin = Math.floor(wMin * 0.5);
                wMax = Math.floor(wMax * 0.5);
            }

            min += wMin;
            max += wMax;

            if (weapon.weakness) weaknessMods.push(weapon.weakness);

            if (weapon.magic) {
                min += Math.floor(p.getTotalAttr('int') * 0.8);
                max += p.getTotalAttr('int');
            }
        }

        return { min, max, weaknessMods };
    }

    winCombat() {
        this.logSystem(`O grupo venceu o combate!`);
        this._getAudio()?.play?.('victory');
        this._recordStat('combatsWon', 1);
        
        if (this.isInfiniteMode) {
            this._recordStat('highestWave', this.infiniteWave);
            this.logSystem(`Onda ${this.infiniteWave} derrotada! Vocês têm 2 rodadas livres antes da próxima onda...`);
            this.waitingNextWave = true;
            this.freeTurnsRemaining = this.party.filter(p => p.hp > 0).length * 2;
            this.monsters = [];
            
            this.turnQueue = [];
            this.isProcessingTurn = false;
            
            this._emit('combatUpdated', { party: this.party, monsters: this.monsters });
            setTimeout(() => this.nextTurn(), 1000);
            return;
        }
        
        const repMonster = this.monsters.find(m => m.regionId);

        if (repMonster && repMonster.regionId && typeof window !== 'undefined' && window.MapSystem) {
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
            
            this._emit('regionProgressUpdated', regionId);

            if (window.gameQuests) {
                window.gameQuests.processExploreEvent(regionId, 1);
            }
        }

        setTimeout(() => this.endCombat(true), 2000);
    }

    loseCombat() {
        this.logSystem(`O grupo foi derrotado...`);
        this._getAudio()?.play?.('defeat');
        this.party.forEach(p => p.hp = 1);
        setTimeout(() => this.endCombat(false), 2000);
    }

    endCombat(victory) {
        this.inCombat = false;
        this.isInfiniteMode = false;
        this.monsters = [];
        this.activeTerrains = [];
        this.turnQueue = [];
        this.initiativeOrder = [];
        this.hasMovedThisTurn = false;
        this.isProcessingTurn = false;
        this.currentTurnEntity = null;
        this.isSelectingMove = false;
        this.isSelectingTarget = false;
        this.selectedSkill = null;

        // Clean up temporary combat status effects and shields on party
        this.party.forEach(p => {
            p.statusEffects = [];
            p.shield = 0;
            p.defenseStance = false;
            p.defenseBuffAmount = 0;
            p.defenseBuffDuration = 0;
        });

        // Restore biome BGM
        const audio = this._getAudio();
        if (audio && typeof audio.playMusic === 'function') {
            const currentMapId = (typeof window !== 'undefined' && window.gameTileMap?.currentMapId) || 'floresta';
            audio.playMusic(currentMapId);
        }

        this._emit('turnQueueUpdated', this.turnQueue);
        this._emit('combatEnded', victory);
    }

    usePotion(itemInstanceId) {
        if (!this.inCombat || this.currentTurnEntity?.type !== 'player') return;
        
        const pIndex = this.currentTurnEntity.index;
        
        if (this.inventory.useItem(itemInstanceId, pIndex)) {
            this._getAudio()?.play?.('potion');
            this._emit('turnEnded', null);
            this.logPlayer(`${this.party[pIndex].name} usou uma poção.`);
            setTimeout(() => this.nextTurn(), 1000);
        }
    }

    logPlayer(msg) { this._emit('combatLog', { msg, type: 'log-player' }); }
    logMonster(msg) { this._emit('combatLog', { msg, type: 'log-monster' }); }
    logSystem(msg) { this._emit('combatLog', { msg, type: 'log-system' }); }

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
                this._emit('bestiaryUpdate', monster);
                this._emit('questUpdate', { type: 'kill', monsterId: monster.id, qty: 1 });
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
                this._emit('regionProgressUpdated', regionId);

                // Notify quests about explore progress
                if (window.gameQuests) {
                    window.gameQuests.processExploreEvent(regionId, 1);
                }
            }
            
            this._emit('partyUpdated', this.party);
            return true;
        } else {
            this.logSystem(`[Batalha Automática] O grupo falhou ao tentar derrotar os inimigos e recuou perdendo ${totalHpLoss} HP.`);
            this._emit('partyUpdated', this.party);
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.CombatSystem = CombatSystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CombatSystem;
}
