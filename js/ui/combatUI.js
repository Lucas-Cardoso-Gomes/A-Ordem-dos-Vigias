class CombatUIManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.elCombatPartyContainer = document.getElementById('combat-party-container');
        this.elCombatMonstersContainer = document.getElementById('combat-monsters-container');
        this.elCombatTurnQueueList = document.getElementById('combat-turn-queue-list');
        this.elCombatCanvas = document.getElementById('combat-grid-canvas');
        if (this.elCombatCanvas) this.ctx = this.elCombatCanvas.getContext('2d');

        this.btnMove = document.getElementById('btn-move');
        this.btnAttack = document.getElementById('btn-attack');
        this.btnSkill = document.getElementById('btn-skill');
        this.btnPotion = document.getElementById('btn-potion');
        this.btnFlee = document.getElementById('btn-flee');
        this.btnEndTurn = document.getElementById('btn-end-turn');
        this.elCombatLog = document.getElementById('combat-log');
        this.elCombatInstruction = document.getElementById('combat-instruction');

        this.elCombatSkillsMenu = document.getElementById('combat-skills-menu');
        this.elCombatSkillsList = document.getElementById('combat-skills-list');
        this.elCombatItemsMenu = document.getElementById('combat-items-menu');
        this.elCombatItemsList = document.getElementById('combat-items-list');
    }

    bindEvents() {
        if (this.btnMove) {
            this.btnMove.addEventListener('click', () => {
                this.hideCombatMenus();
                window.gameCombat.startMoveSelection();
            });
        }

        if (this.btnEndTurn) {
            this.btnEndTurn.addEventListener('click', () => {
                this.hideCombatMenus();
                window.gameCombat.nextTurn();
            });
        }

        this.btnAttack.addEventListener('click', () => {
            this.hideCombatMenus();
            window.gameCombat.cancelGridSelection();
            this.showCombatAttackMenu();
        });

        if (this.btnSkill) {
            this.btnSkill.addEventListener('click', () => {
                this.hideCombatMenus();
                window.gameCombat.cancelGridSelection();
                this.showCombatSkillsMenu();
            });
        }

        if (this.elCombatCanvas) {
            this.elCombatCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.elCombatCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        }

        this.btnFlee.addEventListener('click', () => {
            this.hideCombatMenus();
            window.gameCombat.flee();
        });

        this.btnPotion.addEventListener('click', () => {
            this.hideCombatMenus();
            window.gameCombat.cancelGridSelection();
            this.showCombatItemsMenu();
        });
    }

    handleCanvasClick(e) {
        if (!window.gameCombat || !window.gameCombat.inCombat) return;

        const rect = this.elCombatCanvas.getBoundingClientRect();
        const scaleX = this.elCombatCanvas.width / rect.width;
        const scaleY = this.elCombatCanvas.height / rect.height;

        const x = Math.floor(((e.clientX - rect.left) * scaleX) / (this.elCombatCanvas.width / window.gameCombat.gridWidth));
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / (this.elCombatCanvas.height / window.gameCombat.gridHeight));

        if (window.gameCombat.isSelectingMove) {
            window.gameCombat.moveEntityTo(x, y);
        } else if (window.gameCombat.isSelectingTarget) {
            // Se for ataque físico ou drain, clica no monstro
            // Se for AoE (sem alvo específico necessário além de uma coordenada), pode clicar em qualquer lugar ou num monstro base
            const targetIndex = window.gameCombat.monsters.findIndex(m => m.hp > 0 && m.gridX === x && m.gridY === y);
            if (targetIndex !== -1) {
                window.gameCombat.setTarget(targetIndex);
                if (window.gameCombat.selectedSkill) {
                    window.gameCombat.playerSkill(window.gameCombat.selectedSkill);
                } else {
                    window.gameCombat.playerAttack(window.gameCombat.selectedAttackSlot || 'weaponMain');
                }
            } else if (window.gameCombat.selectedSkill && window.gameCombat.selectedSkill.isAoE) {
                 // For AoE we can set a dummy target to coordinates or just find nearest to clicked point if needed, 
                 // but right now it is based on target monster. Let's keep it simple for now and require targeting a monster for AoE center
                 Engine.emit('combatLog', { msg: 'Selecione um inimigo como alvo para a área.', type: 'log-system' });
            } else {
                Engine.emit('combatLog', { msg: 'Nenhum alvo válido selecionado no mapa.', type: 'log-system' });
            }
        }
    }

    handleCanvasMouseMove(e) {
        if (!window.gameCombat || !window.gameCombat.inCombat) return;

        const rect = this.elCombatCanvas.getBoundingClientRect();
        const scaleX = this.elCombatCanvas.width / rect.width;
        const scaleY = this.elCombatCanvas.height / rect.height;

        this.hoverX = Math.floor(((e.clientX - rect.left) * scaleX) / (this.elCombatCanvas.width / window.gameCombat.gridWidth));
        this.hoverY = Math.floor(((e.clientY - rect.top) * scaleY) / (this.elCombatCanvas.height / window.gameCombat.gridHeight));

        this.drawGrid(); // Redraw with hover effect
    }

    hideCombatMenus() {
        if (this.elCombatSkillsMenu) this.elCombatSkillsMenu.classList.add('hidden');
        if (this.elCombatItemsMenu) this.elCombatItemsMenu.classList.add('hidden');
    }

    showCombatAttackMenu() {
        if (!this.elCombatSkillsMenu || !window.gameCombat || !window.gameCombat.currentTurnEntity || window.gameCombat.currentTurnEntity.type !== 'player') return;
        this.elCombatSkillsList.innerHTML = '';

        const pIndex = window.gameCombat.currentTurnEntity.index;
        const p = window.gameParty[pIndex];

        const wMain = p.equipment?.weaponMain;
        const btnMain = document.createElement('button');
        if (wMain) {
            btnMain.innerText = `${wMain.name} (Dano: ${wMain.minDmg}-${wMain.maxDmg}, Alcance: ${wMain.range || 1})`;
        } else {
            btnMain.innerText = `Soco (Dano: 1-2, Alcance: 1)`;
        }
        btnMain.onclick = () => {
            this.hideCombatMenus();
            window.gameCombat.isSelectingMove = false;
            window.gameCombat.isSelectingTarget = true;
            window.gameCombat.selectedSkill = null;
            window.gameCombat.selectedAttackSlot = 'weaponMain';
            Engine.emit('combatUpdated', { party: window.gameCombat.party, monsters: window.gameCombat.monsters });
        };
        this.elCombatSkillsList.appendChild(btnMain);

        const wOff = p.equipment?.weaponOff;
        if (wOff) {
            const btnOff = document.createElement('button');
            if (wOff.isShield || (wOff.name && wOff.name.toLowerCase().includes('escudo'))) {
                btnOff.innerText = `Posição de Defesa (${wOff.name})`;
                btnOff.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.activateDefenseStance();
                };
            } else {
                let offMin = Math.floor((wOff.minDmg || 0) * 0.5);
                let offMax = Math.floor((wOff.maxDmg || 0) * 0.5);
                btnOff.innerText = `${wOff.name} (Dano: ${offMin}-${offMax}, Alcance: ${wOff.range || 1})`;
                btnOff.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.isSelectingMove = false;
                    window.gameCombat.isSelectingTarget = true;
                    window.gameCombat.selectedSkill = null;
                    window.gameCombat.selectedAttackSlot = 'weaponOff';
                    Engine.emit('combatUpdated', { party: window.gameCombat.party, monsters: window.gameCombat.monsters });
                };
            }
            this.elCombatSkillsList.appendChild(btnOff);
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatSkillsList.appendChild(cancelBtn);

        this.elCombatSkillsMenu.classList.remove('hidden');
    }

    showCombatSkillsMenu() {
        if (!this.elCombatSkillsMenu || !window.gameCombat || !window.gameCombat.currentTurnEntity || window.gameCombat.currentTurnEntity.type !== 'player') return;
        this.elCombatSkillsList.innerHTML = '';

        const pIndex = window.gameCombat.currentTurnEntity.index;
        const p = window.gameParty[pIndex];
        const skills = p.getSkills();
        
        if (skills.length === 0) {
            this.elCombatSkillsList.innerText = 'Nenhuma habilidade disponível.';
        } else {
            skills.forEach(skill => {
                const btn = document.createElement('button');
                btn.innerText = `${skill.name} (${skill.manaCost} MP)`;
                if (p.mana < skill.manaCost) {
                    btn.disabled = true;
                }
                btn.onclick = () => {
                    this.hideCombatMenus();
                    if (skill.type === 'heal') {
                        if (window.gameParty.length > 1) {
                            this.showPartyTargetMenu(skill);
                        } else {
                            window.gameCombat.playerSkill(skill, 0);
                        }
                    } else {
                        window.gameCombat.isSelectingMove = false;
                        window.gameCombat.isSelectingTarget = true;
                        window.gameCombat.selectedSkill = skill;
                        Engine.emit('combatUpdated', { party: window.gameCombat.party, monsters: window.gameCombat.monsters });
                    }
                };
                this.elCombatSkillsList.appendChild(btn);
            });
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatSkillsList.appendChild(cancelBtn);

        this.elCombatSkillsMenu.classList.remove('hidden');
    }

    showPartyTargetMenu(skill) {
        this.elCombatSkillsList.innerHTML = `<h4>Escolha o alvo para ${skill.name}</h4>`;
        window.gameParty.forEach((member, idx) => {
            if (member.hp > 0 || skill.name.includes("Ressurreição")) { // Just in case we add revive
                const btn = document.createElement('button');
                btn.innerText = `${member.name} (HP: ${member.hp}/${member.getMaxHp()})`;
                btn.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.playerSkill(skill, idx);
                };
                this.elCombatSkillsList.appendChild(btn);
            }
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatSkillsList.appendChild(cancelBtn);
        this.elCombatSkillsMenu.classList.remove('hidden');
    }

    showCombatItemsMenu() {
        if (!this.elCombatItemsMenu) return;
        this.elCombatItemsList.innerHTML = '';

        const potions = window.gameInventory.items.filter(i => i.type === 'potion');

        const grouped = {};
        potions.forEach(p => {
            if (!grouped[p.id]) grouped[p.id] = { count: 0, instanceId: p.instanceId, name: p.name };
            grouped[p.id].count++;
        });

        if (Object.keys(grouped).length === 0) {
            this.elCombatItemsList.innerText = 'Nenhum item disponível.';
        } else {
            Object.values(grouped).forEach(g => {
                const btn = document.createElement('button');
                btn.innerText = `${g.name} (${g.count})`;
                btn.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.usePotion(g.instanceId);
                };
                this.elCombatItemsList.appendChild(btn);
            });
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatItemsList.appendChild(cancelBtn);

        this.elCombatItemsMenu.classList.remove('hidden');
    }

    showCombatScreen(monsters) {
        document.querySelector('[data-target="screen-combat"]').click();
        this.hideCombatMenus();
        this.elCombatLog.innerHTML = '';
        this.renderCombatMonsters(monsters);

        this.btnAttack.disabled = false;
        if (this.btnSkill) this.btnSkill.disabled = false;
        this.btnFlee.disabled = false;
        this.btnPotion.disabled = false;
    }

    getEmojiForClass(className) {
        const map = {
            'Caçador': '🏹', 'Exorcista': '✝️', 'Alquimista': '🧪',
            'Bruxo': '🔮', 'Mago': '🧙', 'Guerreiro': '⚔️',
            'Assassino': '🗡️', 'Paladino': '🛡️', 'Necromante': '💀',
            'Nenhuma': '🧑'
        };
        return map[className] || '🧑';
    }

    getEmojiForMonster(monster) {
        const map = {
            'Morto-vivo': '🧟', 'Vampiro': '🧛', 'Besta': '🐺',
            'Demonio': '👹', 'Dragão': '🐉', 'Goblin': '👺',
            'Humano': '👤', 'Lobo': '🐺', 'Aranha': '🕷️',
            'Orc': '👹'
        };
        // Simple heuristic matching
        for (let key in map) {
            if (monster.name.toLowerCase().includes(key.toLowerCase()) ||
               (monster.type && monster.type.toLowerCase().includes(key.toLowerCase()))) {
                return map[key];
            }
        }
        return '👾';
    }

    renderCombatMonsters(monsters) {
        this.elCombatMonstersContainer.innerHTML = '';
        const targetIndex = window.gameCombat ? window.gameCombat.targetIndex : 0;

        // Separate living and dead monsters for visual ordering
        const livingMonsters = [];
        const deadMonsters = [];

        monsters.forEach((monster, index) => {
            const mPct = Math.max(0, (monster.hp / monster.maxHp) * 100);
            const isDead = monster.hp <= 0;
            const isTarget = index === targetIndex && !isDead;
            const emoji = this.getEmojiForMonster(monster);

            const card = document.createElement('div');
            card.className = `monster-card ${isTarget ? 'target' : ''} ${isDead ? 'dead' : ''}`;
            card.id = `monster-card-${monster.instanceId}`;
            card.onclick = () => {
                if (!isDead && window.gameCombat && window.gameCombat.isSelectingTarget) {
                    window.gameCombat.setTarget(index);
                    if (window.gameCombat.selectedSkill) {
                        window.gameCombat.playerSkill(window.gameCombat.selectedSkill);
                    } else {
                        window.gameCombat.playerAttack(window.gameCombat.selectedAttackSlot || 'weaponMain');
                    }
                }
            };

            let weaknessText = '';
            if (monster.weakness && monster.weakness.length > 0) {
                weaknessText = `<div class="monster-weaknesses" style="font-size:0.8em; color:var(--rarity-uncommon)">Fraquezas: ${monster.weakness.join(', ')}</div>`;
            }

            card.innerHTML = `
                <h3 style="font-size:1.1em; margin-bottom:0.2rem">${emoji} Lvl ${monster.level} ${monster.name}</h3>
                <div class="health-bar-container"><div class="health-bar" style="width: ${mPct}%"></div></div>
                <p style="margin-top:0.2rem">HP: <span>${monster.hp}</span> / <span>${monster.maxHp}</span></p>
                ${weaknessText}
            `;

            if (isDead) {
                deadMonsters.push(card);
            } else {
                livingMonsters.push(card);
            }
        });

        livingMonsters.forEach(card => this.elCombatMonstersContainer.appendChild(card));
        deadMonsters.forEach(card => this.elCombatMonstersContainer.appendChild(card));
    }

    hideCombatScreen(victory) {
        this.btnAttack.disabled = true;
        if (this.btnSkill) this.btnSkill.disabled = true;
        this.btnFlee.disabled = true;
        this.btnPotion.disabled = true;
        this.hideCombatMenus();
        if (victory) {
            this.ui.showToast('Vitória! Retornando ao mapa...');
        } else {
            this.ui.showToast('Fuga ou Derrota. Retornando ao mapa...');
        }
        setTimeout(() => {
            document.querySelector('[data-target="screen-map"]').click();
        }, 2000);
    }

    updateInstruction() {
        if (!this.elCombatInstruction || !window.gameCombat || !window.gameCombat.inCombat) return;
        
        if (window.gameCombat.isSelectingMove) {
            this.elCombatInstruction.innerText = `Selecione no grid para mover (Movimento restante: ${window.gameCombat.movementRemaining})`;
            this.elCombatInstruction.style.display = 'block';
        } else if (window.gameCombat.isSelectingTarget) {
            if (window.gameCombat.selectedSkill) {
                this.elCombatInstruction.innerText = `Selecione um alvo no grid para usar ${window.gameCombat.selectedSkill.name}`;
            } else {
                this.elCombatInstruction.innerText = `Selecione um alvo no grid para Atacar`;
            }
            this.elCombatInstruction.style.display = 'block';
        } else {
            this.elCombatInstruction.style.display = 'none';
        }
    }

    drawGrid() {
        if (!this.ctx || !window.gameCombat || !window.gameCombat.inCombat) return;

        this.updateInstruction();

        const gw = window.gameCombat.gridWidth;
        const gh = window.gameCombat.gridHeight;
        const cellW = this.elCombatCanvas.width / gw;
        const cellH = this.elCombatCanvas.height / gh;

        this.ctx.clearRect(0, 0, this.elCombatCanvas.width, this.elCombatCanvas.height);

        // Draw grid lines
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= gw; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * cellW, 0);
            this.ctx.lineTo(x * cellW, this.elCombatCanvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= gh; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * cellH);
            this.ctx.lineTo(this.elCombatCanvas.width, y * cellH);
            this.ctx.stroke();
        }

        // Draw movement range highlight
        if (window.gameCombat.isSelectingMove && window.gameCombat.currentTurnEntity && window.gameCombat.currentTurnEntity.type === 'player') {
            const p = window.gameParty[window.gameCombat.currentTurnEntity.index];
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            for (let x = 0; x < gw; x++) {
                for (let y = 0; y < gh; y++) {
                    const dist = Math.abs(p.gridX - x) + Math.abs(p.gridY - y);
                    if (dist <= window.gameCombat.movementRemaining) {
                        this.ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
                    }
                }
            }
        } else if (window.gameCombat.isSelectingTarget && window.gameCombat.currentTurnEntity && window.gameCombat.currentTurnEntity.type === 'player') {
            const p = window.gameParty[window.gameCombat.currentTurnEntity.index];
            let attackRange = 1; // Default melee
            if (window.gameCombat.selectedSkill) {
                attackRange = window.gameCombat.selectedSkill.range || 4;
            } else {
                const slot = window.gameCombat.selectedAttackSlot || 'weaponMain';
                if (p.equipment?.[slot] && p.equipment[slot].range !== undefined) {
                    attackRange = p.equipment[slot].range;
                }
            }

            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            for (let x = 0; x < gw; x++) {
                for (let y = 0; y < gh; y++) {
                    const dist = Math.abs(p.gridX - x) + Math.abs(p.gridY - y);
                    if (dist <= attackRange) {
                        this.ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
                    }
                }
            }
        }

        // Draw Hover
        if (this.hoverX !== undefined && this.hoverY !== undefined && this.hoverX >= 0 && this.hoverX < gw && this.hoverY >= 0 && this.hoverY < gh) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(this.hoverX * cellW, this.hoverY * cellH, cellW, cellH);
        }

        // Draw Entities
        const drawEntity = (entity, color, label, isTurn, emoji) => {
            if (entity.hp <= 0) return;
            const cx = entity.gridX * cellW + cellW / 2;
            const cy = entity.gridY * cellH + cellH / 2;
            const r = Math.min(cellW, cellH) * 0.4;

            if (isTurn) {
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.5)'; // Gold highlight for active turn
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            // If emoji is available, draw emoji, else label
            this.ctx.fillText(emoji || label, cx, cy);
        };

        window.gameCombat.party.forEach((p, idx) => {
            const isTurn = window.gameCombat.currentTurnEntity?.type === 'player' && window.gameCombat.currentTurnEntity.index === idx;
            const emoji = this.getEmojiForClass(p.playerClass);
            drawEntity(p, '#1d4ed8', p.name.substring(0, 2), isTurn, emoji);
        });

        window.gameCombat.monsters.forEach((m, idx) => {
            const isTurn = window.gameCombat.currentTurnEntity?.type === 'monster' && window.gameCombat.currentTurnEntity.index === idx;
            const emoji = this.getEmojiForMonster(m);
            drawEntity(m, '#991b1b', m.name.substring(0, 2), isTurn, emoji);
        });
    }

    renderCombatStats(data) {
        const party = data.party || window.gameParty;
        const monsters = data.monsters;

        this.elCombatPartyContainer.innerHTML = '';
        
        this.drawGrid();
        
        let turnIndex = null;
        if (window.gameCombat && window.gameCombat.currentTurnEntity && window.gameCombat.currentTurnEntity.type === 'player') {
            turnIndex = window.gameCombat.currentTurnEntity.index;
        }

        const livingPlayers = [];
        const deadPlayers = [];

        party.forEach((p, idx) => {
            const isDead = p.hp <= 0;
            const isTurn = idx === turnIndex;
            const emoji = this.getEmojiForClass(p.playerClass);
            
            const pPct = Math.max(0, (p.hp / p.getMaxHp()) * 100);
            const mPct = Math.max(0, (p.mana / p.getMaxMana()) * 100);
            
            const card = document.createElement('div');
            card.className = `combat-party-member ${isDead ? 'dead' : ''} ${isTurn ? 'active-turn' : ''}`;
            card.id = `combat-player-${idx}`;
            card.style.border = isTurn ? '2px solid var(--accent-gold)' : '1px solid var(--border-color)';
            card.style.padding = '0.5rem';
            card.style.borderRadius = '4px';
            card.style.background = 'rgba(0,0,0,0.5)';
            card.style.position = 'relative';
            
            if (isDead) {
                card.style.opacity = '0.4';
                card.style.filter = 'grayscale(100%)';
            }

            card.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0;">${emoji} ${p.name} <small>Nv.${p.level} ${p.playerClass}</small></h4>
                <div class="health-bar-container" style="height: 10px; margin-bottom: 2px;">
                    <div class="health-bar" style="width: ${pPct}%"></div>
                </div>
                <div style="font-size: 0.8rem; text-align: right; margin-bottom: 5px;">HP: ${p.hp} / ${p.getMaxHp()}</div>
                
                <div class="health-bar-container" style="height: 10px; margin-bottom: 2px;">
                    <div class="mana-bar" style="width: ${mPct}%; background-color: #3b82f6; height: 100%;"></div>
                </div>
                <div style="font-size: 0.8rem; text-align: right;">MP: ${p.mana} / ${p.getMaxMana()}</div>
            `;
            if (isDead) {
                deadPlayers.push(card);
            } else {
                livingPlayers.push(card);
            }
        });

        livingPlayers.forEach(card => this.elCombatPartyContainer.appendChild(card));
        deadPlayers.forEach(card => this.elCombatPartyContainer.appendChild(card));

        if (monsters) {
            this.renderCombatMonsters(monsters);
        }
    }

    appendCombatLog(log) {
        const div = document.createElement('div');
        div.className = log.type;
        div.innerText = `[${new Date().toLocaleTimeString()}] ${log.msg}`;
        div.style.padding = "2px 5px";
        div.style.borderBottom = "1px solid #222";

        if(log.type === 'log-player') div.style.color = "#4ade80"; // green
        else if(log.type === 'log-monster') div.style.color = "#f87171"; // red
        else div.style.color = "#fbbf24"; // yellow for system

        this.elCombatLog.appendChild(div);
        this.elCombatLog.scrollTop = this.elCombatLog.scrollHeight;
    }

    playCombatAnimation(data) {
        let el;
        if (data.target === 'player') {
            if (data.playerIndex !== undefined) el = document.getElementById(`combat-player-${data.playerIndex}`);
            else el = document.getElementById(`combat-player-0`); // fallback
        }
        else if (data.monsterId) el = document.getElementById(`monster-card-${data.monsterId}`);
        if (!el) return;

        const animClass = data.anim === 'attack' ? 'anim-attack' : 'anim-damage';
        el.classList.add(animClass);

        if (data.dmg !== undefined) {
            const ft = document.createElement('div');
            ft.className = 'floating-text';
            ft.innerText = data.isHeal ? `+${data.dmg}` : `-${data.dmg}`;
            ft.style.color = data.isHeal ? '#00ff00' : (data.isCrit ? '#ffaa00' : '#ff4444');
            if (data.isCrit) ft.style.fontSize = '2.2rem';

            ft.style.left = '50%';
            ft.style.top = '20%';
            el.appendChild(ft);
            setTimeout(() => ft.remove(), 1000);
        }

        setTimeout(() => el.classList.remove(animClass), 500);
    }

    renderTurnQueue(queue) {
        if (!this.elCombatTurnQueueList) return;
        this.elCombatTurnQueueList.innerHTML = '';
        
        // Add the currently acting entity first if one exists
        if (window.gameCombat && window.gameCombat.currentTurnEntity) {
            const current = window.gameCombat.currentTurnEntity;
            const currentSpan = document.createElement('span');
            currentSpan.style.padding = '0.2rem 0.5rem';
            currentSpan.style.background = 'var(--accent-gold)';
            currentSpan.style.color = '#000';
            currentSpan.style.borderRadius = '4px';
            currentSpan.style.fontWeight = 'bold';
            
            let name = "???";
            if (current.type === 'player') name = window.gameParty[current.index].name;
            if (current.type === 'monster') name = window.gameCombat.monsters[current.index].name;
            currentSpan.innerText = name;
            
            this.elCombatTurnQueueList.appendChild(currentSpan);
        }

        queue.forEach(q => {
            const span = document.createElement('span');
            span.style.padding = '0.2rem 0.5rem';
            span.style.background = '#333';
            span.style.border = '1px solid var(--border-color)';
            span.style.borderRadius = '4px';
            span.style.color = q.type === 'player' ? '#4ade80' : '#f87171';
            
            let name = "???";
            if (q.type === 'player') name = window.gameParty[q.index].name;
            if (q.type === 'monster') name = window.gameCombat.monsters[q.index].name;
            
            span.innerText = `${name} (${q.speed})`;
            this.elCombatTurnQueueList.appendChild(span);
        });
    }
}
window.CombatUIManager = CombatUIManager;
