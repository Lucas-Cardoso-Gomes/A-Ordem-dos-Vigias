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

        this.btnAttack = document.getElementById('btn-attack');
        this.btnSkill = document.getElementById('btn-skill');
        this.btnPotion = document.getElementById('btn-potion');
        this.btnFlee = document.getElementById('btn-flee');
        this.elCombatLog = document.getElementById('combat-log');

        this.elCombatSkillsMenu = document.getElementById('combat-skills-menu');
        this.elCombatSkillsList = document.getElementById('combat-skills-list');
        this.elCombatItemsMenu = document.getElementById('combat-items-menu');
        this.elCombatItemsList = document.getElementById('combat-items-list');
    }

    bindEvents() {
        this.btnAttack.addEventListener('click', () => {
            this.hideCombatMenus();
            window.gameCombat.playerAttack();
        });

        if (this.btnSkill) {
            this.btnSkill.addEventListener('click', () => {
                this.hideCombatMenus();
                this.showCombatSkillsMenu();
            });
        }

        this.btnFlee.addEventListener('click', () => {
            this.hideCombatMenus();
            window.gameCombat.flee();
        });

        this.btnPotion.addEventListener('click', () => {
            this.hideCombatMenus();
            this.showCombatItemsMenu();
        });
    }

    hideCombatMenus() {
        if (this.elCombatSkillsMenu) this.elCombatSkillsMenu.classList.add('hidden');
        if (this.elCombatItemsMenu) this.elCombatItemsMenu.classList.add('hidden');
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
                    if (skill.type === 'heal' && window.gameParty.length > 1) {
                        this.showPartyTargetMenu(skill);
                    } else {
                        window.gameCombat.playerSkill(skill);
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

    renderCombatMonsters(monsters) {
        this.elCombatMonstersContainer.innerHTML = '';
        const targetIndex = window.gameCombat ? window.gameCombat.targetIndex : 0;

        monsters.forEach((monster, index) => {
            const mPct = Math.max(0, (monster.hp / monster.maxHp) * 100);
            const isDead = monster.hp <= 0;
            const isTarget = index === targetIndex && !isDead;

            const card = document.createElement('div');
            card.className = `monster-card ${isTarget ? 'target' : ''} ${isDead ? 'dead' : ''}`;
            card.id = `monster-card-${monster.instanceId}`;
            card.onclick = () => {
                if (!isDead && window.gameCombat) {
                    window.gameCombat.setTarget(index);
                }
            };

            let weaknessText = '';
            if (monster.weakness && monster.weakness.length > 0) {
                weaknessText = `<div class="monster-weaknesses" style="font-size:0.8em; color:var(--rarity-uncommon)">Fraquezas: ${monster.weakness.join(', ')}</div>`;
            }

            card.innerHTML = `
                <h3 style="font-size:1.1em; margin-bottom:0.2rem">Lvl ${monster.level} ${monster.name}</h3>
                <div class="health-bar-container"><div class="health-bar" style="width: ${mPct}%"></div></div>
                <p style="margin-top:0.2rem">HP: <span>${monster.hp}</span> / <span>${monster.maxHp}</span></p>
                ${weaknessText}
            `;

            this.elCombatMonstersContainer.appendChild(card);
        });
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

    renderCombatStats(data) {
        const party = data.party || window.gameParty;
        const monsters = data.monsters;

        this.elCombatPartyContainer.innerHTML = '';

        let turnIndex = null;
        if (window.gameCombat && window.gameCombat.currentTurnEntity && window.gameCombat.currentTurnEntity.type === 'player') {
            turnIndex = window.gameCombat.currentTurnEntity.index;
        }

        party.forEach((p, idx) => {
            const isDead = p.hp <= 0;
            const isTurn = idx === turnIndex;

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

            card.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0;">${p.name} <small>Nv.${p.level} ${p.playerClass}</small></h4>
                <div class="health-bar-container" style="height: 10px; margin-bottom: 2px;">
                    <div class="health-bar" style="width: ${pPct}%"></div>
                </div>
                <div style="font-size: 0.8rem; text-align: right; margin-bottom: 5px;">HP: ${p.hp} / ${p.getMaxHp()}</div>

                <div class="health-bar-container" style="height: 10px; margin-bottom: 2px;">
                    <div class="mana-bar" style="width: ${mPct}%; background-color: #3b82f6; height: 100%;"></div>
                </div>
                <div style="font-size: 0.8rem; text-align: right;">MP: ${p.mana} / ${p.getMaxMana()}</div>
            `;
            this.elCombatPartyContainer.appendChild(card);
        });

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
