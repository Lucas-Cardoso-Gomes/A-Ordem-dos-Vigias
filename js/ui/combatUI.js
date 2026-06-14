class CombatUIManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.elCombatPlayerSide = document.querySelector('.player-side');
        this.elCombatMonstersContainer = document.getElementById('combat-monsters-container');
        this.elCombatPlayerHpBar = document.getElementById('combat-player-hp-bar');
        this.elCombatPlayerHp = document.getElementById('combat-player-hp');
        this.elCombatPlayerHpMax = document.getElementById('combat-player-hp-max');

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
        if (!this.elCombatSkillsMenu) return;
        this.elCombatSkillsList.innerHTML = '';

        const skills = window.gamePlayer.getSkills();
        if (skills.length === 0) {
            this.elCombatSkillsList.innerText = 'Nenhuma habilidade disponível.';
        } else {
            skills.forEach(skill => {
                const btn = document.createElement('button');
                btn.innerText = `${skill.name} (${skill.manaCost} MP)`;
                if (window.gamePlayer.mana < skill.manaCost) {
                    btn.disabled = true;
                }
                btn.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.playerSkill(skill);
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
        const p = data.player;
        const monsters = data.monsters;

        const pPct = Math.max(0, (p.hp / p.getMaxHp()) * 100);
        this.elCombatPlayerHpBar.style.width = `${pPct}%`;
        this.elCombatPlayerHp.innerText = p.hp;
        this.elCombatPlayerHpMax.innerText = p.getMaxHp();

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
        if (data.target === 'player') el = this.elCombatPlayerSide;
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
}
window.CombatUIManager = CombatUIManager;
