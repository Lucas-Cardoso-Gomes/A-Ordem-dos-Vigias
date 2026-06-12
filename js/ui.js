/**
 * ui.js
 * Handles DOM manipulation and UI rendering based on engine events.
 */

class UIManager {
    constructor() {
        this.cacheDOM();
        this.bindEvents();
        this.setupNavigation();
        this.renderShop();

        // Subscribe to engine events
        Engine.on('playerUpdated', p => this.renderPlayer(p));
        Engine.on('inventoryUpdated', inv => {
            const currentFilter = this.elInvFilter ? this.elInvFilter.value : 'all';
            this.renderInventory(inv, currentFilter);
            if (this.elShopList && !this.elShopList.parentElement.parentElement.classList.contains('hidden')) {
                this.renderShop();
            }
        });
        Engine.on('equipmentUpdated', eq => this.renderEquipment(eq));
        Engine.on('combatUpdated', c => this.renderCombatStats(c));
        Engine.on('combatLog', log => this.appendCombatLog(log));
        Engine.on('combatStarted', m => this.showCombatScreen(m));
        Engine.on('combatEnded', v => this.hideCombatScreen(v));
        Engine.on('turnStarted', () => {
            if (this.btnAttack) this.btnAttack.disabled = false;
            if (this.btnSkill) this.btnSkill.disabled = false;
            if (this.btnPotion) this.btnPotion.disabled = false;
            if (this.btnFlee) this.btnFlee.disabled = false;
        });
        Engine.on('turnEnded', () => {
            if (this.btnAttack) this.btnAttack.disabled = true;
            if (this.btnSkill) this.btnSkill.disabled = true;
            if (this.btnPotion) this.btnPotion.disabled = true;
            if (this.btnFlee) this.btnFlee.disabled = true;
        });
        Engine.on('systemLog', msg => this.showToast(msg));
        Engine.on('questsUpdated', qs => this.renderQuests(qs));
        Engine.on('bestiaryUpdate', m => this.updateBestiary(m));
        Engine.on('combatAnimation', a => this.playCombatAnimation(a));
        // Altere esta linha no seu constructor:
        // Engine.on('regionProgressUpdated', () => this.renderMap());

        // Para isto:
        Engine.on('regionProgressUpdated', () => {
            this.renderMap();
            if (this.selectedLocId) {
                this.renderRegionDetails(this.selectedLocId);
            }
        });
    }

    cacheDOM() {
        // Headers
        this.elHeaderLevel = document.getElementById('header-level');
        this.elHeaderHp = document.getElementById('header-hp');
        this.elHeaderMana = document.getElementById('header-mana');
        this.elHeaderGold = document.getElementById('header-gold');

        // Nav
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.screens = document.querySelectorAll('.screen');

        // Character
        this.elCharLevel = document.getElementById('char-level');
        this.elCharXp = document.getElementById('char-xp');
        this.elCharXpNeeded = document.getElementById('char-xp-needed');
        this.elCharClass = document.getElementById('char-class');
        this.elCharPoints = document.getElementById('char-points');

        // Attributes
        this.elAttrStr = document.getElementById('attr-str');
        this.elAttrAgi = document.getElementById('attr-agi');
        this.elAttrInt = document.getElementById('attr-int');
        this.elAttrDef = document.getElementById('attr-def');
        this.elAttrLuk = document.getElementById('attr-luk');
        this.btnAttrs = document.querySelectorAll('.btn-add-attr');

        // Inventory
        this.elInvCount = document.getElementById('inv-count');
        this.elInvList = document.getElementById('inventory-list');
        this.elInvFilter = document.getElementById('inv-filter');
        this.elInvActionPanel = document.getElementById('inventory-action-panel');
        this.elActionPanelName = document.getElementById('action-panel-name');
        this.elActionPanelDesc = document.getElementById('action-panel-desc');
        this.btnEquipItem = document.getElementById('btn-equip-item');
        this.btnEquipItemMain = document.getElementById('btn-equip-item-main');
        this.btnEquipItemOff = document.getElementById('btn-equip-item-off');
        this.btnUseItem = document.getElementById('btn-use-item');

        // Equipment slots
        this.eqSlots = document.querySelectorAll('.eq-slot');

        // Map
        this.mapLocations = document.querySelectorAll('.map-location');
        this.elLocDetails = document.getElementById('location-details');
        this.elLocName = document.getElementById('loc-name');
        this.btnExplore = document.getElementById('btn-explore');

        // Combat
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

        // Quests
        this.elActiveQuests = document.getElementById('active-quests-list');
        this.elAvailableContracts = document.getElementById('available-contracts-list');

        // Crafting
        this.elCraftingRecipes = document.getElementById('crafting-recipes');

        // Shop
        this.elShopList = document.getElementById('shop-list');

        // Bestiary
        this.elBestiaryList = document.getElementById('bestiary-list');
        this.elBestiaryDetails = document.getElementById('bestiary-details');
        this.elBestName = document.getElementById('best-name');
        this.elBestHabitat = document.getElementById('best-habitat');
        this.elBestDesc = document.getElementById('best-desc');
        this.elBestWeak = document.getElementById('best-weak');
        this.elBestLoot = document.getElementById('best-loot');
        this.btnCloseBestiary = document.getElementById('btn-close-bestiary');

        // Tooltip
        this.tooltip = document.getElementById('item-tooltip');

        // Settings
        this.btnSave = document.getElementById('btn-save');
        this.btnLoad = document.getElementById('btn-load');
        this.btnReset = document.getElementById('btn-reset');

        // Initial map render after cacheDOM
        this.renderMap();
    }

    bindEvents() {
        this.btnAttrs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const attr = e.target.getAttribute('data-attr');
                window.gamePlayer.addAttribute(attr);
            });
        });

        this.elInvFilter.addEventListener('change', (e) => {
            this.renderInventory(window.gameInventory, e.target.value);
        });

        if (this.btnEquipItem) {
            this.btnEquipItem.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.equip(this.selectedItemInstanceId);
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        if (this.btnEquipItemMain) {
            this.btnEquipItemMain.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.equip(this.selectedItemInstanceId, 'weaponMain');
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        if (this.btnEquipItemOff) {
            this.btnEquipItemOff.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.equip(this.selectedItemInstanceId, 'weaponOff');
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        if (this.btnUseItem) {
            this.btnUseItem.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.useItem(this.selectedItemInstanceId);
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        this.eqSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotId = e.currentTarget.getAttribute('data-slot');
                window.gameInventory.unequip(slotId);
            });
            slot.addEventListener('mouseenter', (e) => this.showEquipmentTooltip(e, slot));
            slot.addEventListener('mouseleave', () => this.hideTooltip());
        });

        this.mapLocations.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (e.currentTarget.classList.contains('disabled-region')) {
                    Engine.emit('systemLog', 'Esta região ainda está bloqueada.');
                    return;
                }
                const locId = e.currentTarget.getAttribute('data-loc');

                // Salva a região que está aberta para atualizar no pós-combate
                this.selectedLocId = locId;
                this.renderRegionDetails(locId);
            });
        });

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

        this.btnSave.addEventListener('click', () => window.game.save());
        this.btnLoad.addEventListener('click', () => {
            window.game.load();
            this.showToast('Jogo Carregado.');
        });
        this.btnReset.addEventListener('click', () => {
            if (confirm('Tem certeza? Isso apagará todo o seu progresso.')) {
                Engine.clearSave();
                location.reload();
            }
        });

        if (this.btnCloseBestiary) {
            this.btnCloseBestiary.addEventListener('click', () => {
                this.elBestiaryDetails.classList.add('hidden');
                this.elBestiaryList.classList.remove('hidden');
            });
        }
    }

    setupNavigation() {
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.getAttribute('data-target');

                if (window.gameCombat.inCombat && target !== 'screen-combat') {
                    this.showToast('Você não pode sair enquanto estiver em combate!');
                    return;
                }

                this.navButtons.forEach(b => b.classList.remove('active'));
                this.screens.forEach(s => {
                    s.classList.remove('active');
                    s.classList.add('hidden');
                });

                e.target.classList.add('active');
                const targetScreen = document.getElementById(target);
                targetScreen.classList.remove('hidden');
                targetScreen.classList.add('active');

                // Explicitly render shop if navigating to it
                if (target === 'screen-shop') {
                    this.renderShop();
                }
            });
        });
    }

    renderPlayer(p) {
        this.renderBestiary();
        this.elHeaderLevel.innerText = `Nível: ${p.level}`;
        this.elHeaderHp.innerText = `HP: ${p.hp}/${p.getMaxHp()}`;
        this.elHeaderMana.innerText = `Mana: ${p.mana}/${p.getMaxMana()}`;
        this.elHeaderGold.innerText = `Ouro: ${p.gold}`;

        this.elCharLevel.innerText = p.level;
        this.elCharXp.innerText = p.xp;
        this.elCharXpNeeded.innerText = p.getXpNeeded();

        // Nova lógica de exibição de classe com botões de escolha
        if (p.level >= 5 && p.playerClass === 'Nenhuma') {
            this.elCharClass.innerHTML = ''; // Limpa o texto "Nenhuma"
            this.elCharClass.style.display = 'inline-flex';
            this.elCharClass.style.gap = '0.3rem';
            this.elCharClass.style.flexWrap = 'wrap';
            this.elCharClass.style.marginTop = '0.5rem';

            const classesDisponiveis = ['Caçador', 'Exorcista', 'Alquimista', 'Bruxo', 'Mago', 'Guerreiro', 'Assassino', 'Paladino', 'Necromante'];

            classesDisponiveis.forEach(cls => {
                const btnClasse = document.createElement('button');
                btnClasse.innerText = cls;
                btnClasse.style.padding = '0.2rem 0.6rem';
                btnClasse.style.fontSize = '0.8rem';

                btnClasse.onclick = () => {
                    window.gamePlayer.setClass(cls);
                };

                this.elCharClass.appendChild(btnClasse);
            });
        } else {
            // Se não tiver nível ou já tiver escolhido uma classe, exibe apenas o texto normal
            this.elCharClass.innerHTML = p.playerClass;
            this.elCharClass.style.display = 'inline';
            this.elCharClass.style.cursor = 'default';
            this.elCharClass.style.color = p.playerClass !== 'Nenhuma' ? 'var(--accent-gold)' : '';
        }

        this.elCharPoints.innerText = p.statPoints;

        const attrStr = p.getTotalAttr('str');
        this.elAttrStr.innerText = attrStr !== p.attributes.str ? `${p.attributes.str} (${attrStr})` : p.attributes.str;

        const attrAgi = p.getTotalAttr('agi');
        this.elAttrAgi.innerText = attrAgi !== p.attributes.agi ? `${p.attributes.agi} (${attrAgi})` : p.attributes.agi;

        const attrInt = p.getTotalAttr('int');
        this.elAttrInt.innerText = attrInt !== p.attributes.int ? `${p.attributes.int} (${attrInt})` : p.attributes.int;

        const attrDef = p.getTotalAttr('def');
        this.elAttrDef.innerText = attrDef !== p.attributes.def ? `${p.attributes.def} (${attrDef})` : p.attributes.def;

        const attrLuk = p.getTotalAttr('luk');
        this.elAttrLuk.innerText = attrLuk !== p.attributes.luk ? `${p.attributes.luk} (${attrLuk})` : p.attributes.luk;

        this.btnAttrs.forEach(btn => {
            btn.style.display = p.statPoints > 0 ? 'inline-block' : 'none';
        });
    }

    renderInventory(inv, filter = 'all') {
        this.elInvCount.innerText = inv.items.length;
        this.elInvList.innerHTML = '';

        let items = inv.items;
        if (filter !== 'all') {
            items = items.filter(i => i.type === filter);
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `inv-item rarity-${item.rarity}`;
            div.style.position = 'relative';
            div.innerText = item.name.substring(0, 3) + '.';

            if ((item.type === 'material' || item.type === 'potion') && item.count > 1) {
                div.innerHTML += `<span class="item-count">x${item.count}</span>`;
            }

            div.addEventListener('click', () => {
                this.selectedItemInstanceId = item.instanceId;
                if (this.elInvActionPanel) {
                    this.elInvActionPanel.classList.remove('hidden');
                    this.elActionPanelName.innerText = item.name;

                    let desc = `<em>Raridade: ${item.rarity}</em><br>Tipo: ${item.type}<br>`;
                    if (item.count) desc += `Quantidade: ${item.count}<br>`;
                    if (item.minDmg) desc += `Dano: ${item.minDmg} - ${item.maxDmg}<br>`;
                    if (item.def) desc += `Defesa: ${item.def}<br>`;
                    if (item.weakness) desc += `Elemento/Especial: ${item.weakness}<br>`;
                    if (item.effect) desc += `Efeito: Cura/Mana ${item.value}<br>`;
                    if (item.reqLvl) desc += `Nível Requerido: ${item.reqLvl}<br>`;

                    this.elActionPanelDesc.innerHTML = desc;

                    this.btnEquipItem.classList.add('hidden');
                    if (this.btnEquipItemMain) this.btnEquipItemMain.classList.add('hidden');
                    if (this.btnEquipItemOff) this.btnEquipItemOff.classList.add('hidden');
                    this.btnUseItem.classList.add('hidden');

                    if (item.type === 'weapon') {
                        if (this.btnEquipItemMain) this.btnEquipItemMain.classList.remove('hidden');
                        if (this.btnEquipItemOff) this.btnEquipItemOff.classList.remove('hidden');
                    } else if (item.type === 'armor' || item.type === 'accessory') {
                        this.btnEquipItem.classList.remove('hidden');
                    } else if (item.type === 'potion') {
                        this.btnUseItem.classList.remove('hidden');
                    }
                }
            });

            div.addEventListener('mouseenter', (e) => this.showItemTooltip(e, item));
            div.addEventListener('mouseleave', () => this.hideTooltip());

            this.elInvList.appendChild(div);
        });

        this.renderCrafting(window.gameInventory, window.gamePlayer);
    }

    renderEquipment(eq) {
        Object.keys(eq).forEach(slot => {
            const el = document.getElementById(`eq-${slot}`);
            if (!el) return;

            if (eq[slot]) {
                el.innerText = eq[slot].name;
                el.className = `eq-slot rarity-${eq[slot].rarity}`;
            } else {
                // Map slot ID back to translation
                const trans = {
                    head: 'Cabeça', chest: 'Peitoral', hands: 'Luvas', legs: 'Calças',
                    boots: 'Botas', weaponMain: 'Arma Principal', weaponOff: 'Secundária',
                    amulet: 'Amuleto', ring1: 'Anel 1', ring2: 'Anel 2'
                };
                el.innerText = trans[slot] || slot;
                el.className = 'eq-slot';
            }
        });
    }

    showItemTooltip(e, item) {
        let html = `<strong>${item.name}</strong><br>`;
        html += `<em>Raridade: ${item.rarity}</em><br>`;
        html += `Tipo: ${item.type}<br>`;
        if (item.minDmg) html += `Dano: ${item.minDmg} - ${item.maxDmg}<br>`;
        if (item.def) html += `Defesa: ${item.def}<br>`;
        if (item.weakness) html += `Elemento/Especial: ${item.weakness}<br>`;
        if (item.effect) html += `Efeito: Cura/Mana ${item.value}<br>`;
        if (item.reqLvl) html += `Nível Requerido: ${item.reqLvl}<br>`;

        this.tooltip.innerHTML = html;
        this.tooltip.classList.remove('hidden');

        // Position
        this.tooltip.style.left = (e.pageX + 10) + 'px';
        this.tooltip.style.top = (e.pageY + 10) + 'px';
    }

    showEquipmentTooltip(e, slotEl) {
        const slotId = slotEl.getAttribute('data-slot');
        const item = window.gameInventory.equipment[slotId];
        if (item) {
            this.showItemTooltip(e, item);
        }
    }

    hideTooltip() {
        this.tooltip.classList.add('hidden');
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

        // Group by ID
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
            this.showToast('Vitória! Retornando ao mapa...');
        } else {
            this.showToast('Fuga ou Derrota. Retornando ao mapa...');
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
        div.innerText = log.msg;
        this.elCombatLog.appendChild(div);
        this.elCombatLog.scrollTop = this.elCombatLog.scrollHeight;
    }

    showToast(msg) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = 'var(--accent-red)';
        toast.style.color = 'white';
        toast.style.padding = '1rem';
        toast.style.borderRadius = '5px';
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.5s';
        toast.innerText = msg;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    renderQuests(questSys) {
        this.elActiveQuests.innerHTML = '';
        questSys.activeQuests.forEach(q => {
            const li = document.createElement('li');
            li.className = 'quest-card';
            li.innerHTML = `<strong>${q.title}</strong><br>Progresso: ${q.currentQty} / ${q.requiredQty}<br>`;
            if (q.currentQty >= q.requiredQty) {
                const btn = document.createElement('button');
                btn.innerText = 'Concluir';
                btn.onclick = () => questSys.completeQuest(q.id);
                li.appendChild(btn);
            }
            this.elActiveQuests.appendChild(li);
        });

        this.elAvailableContracts.innerHTML = '';
        questSys.availableContracts.forEach(c => {
            const li = document.createElement('li');
            li.className = 'quest-card';
            li.innerHTML = `<strong>${c.title}</strong><br>${c.desc}<br>Recompensas: ${c.rewards.xp} XP, ${c.rewards.gold} Ouro<br>`;
            const btn = document.createElement('button');
            btn.innerText = 'Aceitar';
            btn.onclick = () => questSys.acceptContract(c.id);
            li.appendChild(btn);
            this.elAvailableContracts.appendChild(li);
        });
    }

    renderMap() {
        if (!this.mapLocations) return;
        this.mapLocations.forEach(btn => {
            const locId = btn.getAttribute('data-loc');
            const loc = window.MapSystem.getRegionDetails(locId);
            if (loc) {
                const isUnlocked = window.MapSystem.unlockedRegions.includes(locId);
                const progress = window.MapSystem.progress[locId] || 0;

                if (!isUnlocked) {
                    btn.classList.add('disabled-region');
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.innerHTML = `???<br><small>Bloqueado</small>`;
                } else {
                    btn.classList.remove('disabled-region');
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';

                    const maxBattles = loc.encounters ? loc.encounters.length : 0;
                    let text = `${loc.name} (Nível ${loc.minLvl}-${loc.maxLvl})`;
                    if (maxBattles > 0) {
                        if (progress >= maxBattles) {
                            text += ` [Concluído]`;
                        } else {
                            text += ` [${progress}/${maxBattles} Batalhas]`;
                        }
                    }
                    btn.innerHTML = `${text}<br><small>${loc.desc}</small>`;
                }
            }
        });
    }

    renderCrafting(inventory, player) {
        this.elCraftingRecipes.innerHTML = '';
        CraftingSystem.recipes.forEach(r => {
            const div = document.createElement('div');
            div.className = 'quest-card';
            let ings = r.ingredients.map(ing => `${ing.qty}x ${ing.name}`).join(', ');
            div.innerHTML = `<strong>${r.name}</strong> (Lvl ${r.reqLvl})<br>Ingredientes: ${ings}<br>`;

            const btn = document.createElement('button');
            btn.innerText = 'Forjar';
            if (!CraftingSystem.canCraft(r.id, inventory) || player.level < r.reqLvl) {
                btn.disabled = true;
            }
            btn.onclick = () => CraftingSystem.craft(r.id, inventory, player);
            div.appendChild(btn);
            this.elCraftingRecipes.appendChild(div);
        });
    }

    updateBestiary(monster) {
        if (!window.gamePlayer.bestiary) window.gamePlayer.bestiary = [];
        if (!window.gamePlayer.bestiary.find(m => m.id === monster.id)) {
            // Save base monster info
            const baseMonster = MonsterDatabase.monsters.find(m => m.id === monster.id) || monster;
            window.gamePlayer.bestiary.push({
                id: baseMonster.id,
                name: baseMonster.name,
                type: baseMonster.type,
                weakness: baseMonster.weakness,
                desc: 'Encontrado no mundo.'
            });
            this.renderBestiary();
            Engine.emit('systemLog', `Novo monstro adicionado ao bestiário: ${monster.name}`);
        }
    }

    renderBestiary() {
        if (!this.elBestiaryList) return;
        this.elBestiaryList.innerHTML = '';
        const bestiary = window.gamePlayer.bestiary || [];

        bestiary.forEach(m => {
            const div = document.createElement('div');
            div.className = 'bestiary-card';
            div.innerText = m.name;
            div.onclick = () => {
                this.elBestiaryList.classList.add('hidden');
                this.elBestName.innerText = m.name;
                this.elBestHabitat.innerText = m.type;
                this.elBestDesc.innerText = m.desc || 'Sem descrição.';
                this.elBestWeak.innerText = m.weakness && m.weakness.length > 0 ? m.weakness.join(', ') : 'Nenhuma conhecida';
                this.elBestLoot.innerText = 'Vário';
                this.elBestiaryDetails.classList.remove('hidden');
            };
            this.elBestiaryList.appendChild(div);
        });
    }

    playCombatAnimation(data) {
        let el;
        if (data.target === 'player') {
            el = this.elCombatPlayerSide;
        } else {
            if (data.monsterId) {
                el = document.getElementById(`monster-card-${data.monsterId}`);
            }
        }
        if (!el) return;

        const animClass = data.anim === 'attack' ? 'anim-attack' : 'anim-damage';
        el.classList.add(animClass);

        setTimeout(() => {
            el.classList.remove(animClass);
        }, 500); // Wait long enough for animation to finish
    }

    renderShop() {
        if (!this.elShopList) return;
        this.elShopList.innerHTML = '';

        const playerLvl = window.gamePlayer ? window.gamePlayer.level : 1;

        if (!this.shopItems || this.shopLevel !== playerLvl) {
            this.shopLevel = playerLvl;
            this.shopItems = [
                ItemDatabase.getPotion('p1'),
                ItemDatabase.getPotion('p2'),
                ItemDatabase.getPotion('p3'),
                ItemDatabase.getPotion('p4'),
                ItemDatabase.getPotion('p5'),
                ItemDatabase.getMaterial('m1'),
                ItemDatabase.getMaterial('m2'),
                ItemDatabase.getMaterial('m8'),
                ItemDatabase.generateItem(playerLvl, 'comum'),
                ItemDatabase.generateItem(playerLvl, 'incomum'),
                ItemDatabase.generateItem(Math.min(playerLvl + 2, 60), 'incomum')
            ];
        }

        this.shopItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-card';
            div.innerHTML = `<strong>${item.name}</strong><br>
                             Tipo: ${item.type}<br>
                             Preço: ${item.gold || item.value || 10} Ouro<br>`;

            const btnBuy = document.createElement('button');
            btnBuy.innerText = 'Comprar';
            btnBuy.onclick = () => {
                const cost = item.gold || item.value || 10;
                if (window.gamePlayer.gold >= cost) {
                    let newItem;
                    if (item.type === 'potion') {
                        newItem = ItemDatabase.getPotion(item.id);
                    } else if (item.type === 'material') {
                        newItem = ItemDatabase.getMaterial(item.id);
                    } else {
                        // Deep clone equipment and generate a new instanceId
                        newItem = JSON.parse(JSON.stringify(item));
                        newItem.instanceId = 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    }
                    if (newItem && window.gameInventory.addItem(newItem)) {
                        window.gamePlayer.gold -= cost;
                        Engine.emit('playerUpdated', window.gamePlayer);
                        Engine.emit('systemLog', `Você comprou ${item.name} por ${cost} Ouro.`);
                    }
                } else {
                    Engine.emit('systemLog', 'Ouro insuficiente.');
                }
            };
            div.appendChild(btnBuy);
            this.elShopList.appendChild(div);
        });

        // Add a separator for selling
        const hr = document.createElement('hr');
        hr.style.gridColumn = '1 / -1';
        hr.style.margin = '1rem 0';
        hr.style.borderColor = 'var(--border-color)';
        this.elShopList.appendChild(hr);

        const sellTitle = document.createElement('h3');
        sellTitle.innerText = 'Vender seus itens';
        sellTitle.style.gridColumn = '1 / -1';
        sellTitle.style.color = 'var(--accent-gold)';
        this.elShopList.appendChild(sellTitle);

        window.gameInventory.items.forEach(item => {
            const div = document.createElement('div');
            div.className = `shop-card rarity-${item.rarity}`;

            const sellPrice = item.sellValue || Math.floor((item.gold || item.value || 10) / 2) || 5;

            let desc = `<strong>${item.name}</strong><br>
                        Tipo: ${item.type}<br>
                        Venda: ${sellPrice} Ouro${item.count > 1 ? ' (cada)' : ''}<br>`;
            if (item.count > 1) {
                desc += `Quantidade: ${item.count}<br>`;
            }
            div.innerHTML = desc;

            const btnSell = document.createElement('button');
            btnSell.innerText = 'Vender 1';
            btnSell.onclick = () => {
                const removedItem = window.gameInventory.removeItem(item.instanceId, 1);
                if (removedItem) {
                    window.gamePlayer.gold += sellPrice;
                    Engine.emit('playerUpdated', window.gamePlayer);
                    Engine.emit('systemLog', `Você vendeu 1x ${item.name} por ${sellPrice} Ouro.`);
                }
            };
            div.appendChild(btnSell);

            if (item.count > 1) {
                const btnSellAll = document.createElement('button');
                btnSellAll.innerText = 'Vender Todos';
                btnSellAll.onclick = () => {
                    const totalSells = item.count;
                    const totalGold = sellPrice * totalSells;
                    const removedItem = window.gameInventory.removeItem(item.instanceId, totalSells);
                    if (removedItem) {
                        window.gamePlayer.gold += totalGold;
                        Engine.emit('playerUpdated', window.gamePlayer);
                        Engine.emit('systemLog', `Você vendeu ${totalSells}x ${item.name} por ${totalGold} Ouro.`);
                    }
                };
                div.appendChild(btnSellAll);
            }

            this.elShopList.appendChild(div);
        });
    }
    renderRegionDetails(locId) {
        const loc = window.MapSystem.getRegionDetails(locId);
        if (!loc) return;

        const progress = window.MapSystem.progress[locId] || 0;
        const maxBattles = loc.encounters ? loc.encounters.length : 0;
        const percentage = maxBattles > 0 ? Math.min(100, (progress / maxBattles) * 100) : 0;

        // Limpa a janela antiga para desenhar a nova estrutura
        this.elLocDetails.innerHTML = '';

        // Título e subdescrição do Mapa
        const title = document.createElement('h3');
        title.innerHTML = `${loc.name} (Nível ${loc.minLvl}-${loc.maxLvl})<br><small style="color: #aaa; font-weight: normal;">${loc.desc}</small>`;
        this.elLocDetails.appendChild(title);

        // Criação Dinâmica da Barra de Progresso
        const progressContainer = document.createElement('div');
        progressContainer.style.width = '100%';
        progressContainer.style.backgroundColor = '#222';
        progressContainer.style.border = '1px solid var(--border-color)';
        progressContainer.style.margin = '1rem 0';
        progressContainer.style.height = '22px';
        progressContainer.style.position = 'relative';

        const progressBar = document.createElement('div');
        progressBar.style.width = `${percentage}%`;
        progressBar.style.height = '100%';
        progressBar.style.backgroundColor = 'var(--accent-gold)';
        progressBar.style.transition = 'width 0.4s ease';

        const progressText = document.createElement('span');
        progressText.innerText = `Progresso do Mapa: ${progress}/${maxBattles} Fases (${Math.floor(percentage)}%)`;
        progressText.style.position = 'absolute';
        progressText.style.width = '100%';
        progressText.style.textAlign = 'center';
        progressText.style.top = '0';
        progressText.style.fontSize = '0.8rem';
        progressText.style.color = '#fff';
        progressText.style.fontWeight = 'bold';
        progressText.style.lineHeight = '22px';

        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        this.elLocDetails.appendChild(progressContainer);

        // Grid com os 5 Combates Individuais
        const battlesGrid = document.createElement('div');
        battlesGrid.style.display = 'flex';
        battlesGrid.style.gap = '0.5rem';
        battlesGrid.style.flexWrap = 'wrap';
        battlesGrid.style.marginTop = '1rem';

        loc.encounters.forEach((mobId, idx) => {
            const baseMob = window.MonsterDatabase.monsters.find(m => m.id === mobId);
            const btnBattle = document.createElement('button');
            btnBattle.style.flex = '1 1 calc(33% - 0.5rem)';
            btnBattle.style.minWidth = '160px';

            const isCompleted = idx < progress;
            const isActiveCampaign = idx === progress;
            const isLocked = idx > progress;

            if (isLocked) {
                btnBattle.innerText = `🔒 Batalha ${idx + 1}`;
                btnBattle.disabled = true;
                btnBattle.style.opacity = '0.4';
                btnBattle.style.cursor = 'not-allowed';
            } else {
                const mobName = baseMob ? baseMob.name : 'Inimigo';
                
                // SE FOR MAPA BÔNUS, USA O SISTEMA DE BATALHA RÁPIDA (AUTO-RESOLVE)
                if (loc.isBonus) {
                    if (isCompleted) {
                        btnBattle.innerText = `⚡ Auto (Repetir): ${mobName}`;
                        btnBattle.style.borderColor = 'var(--rarity-rare)';
                    } else if (isActiveCampaign) {
                        btnBattle.innerText = `⚡ Auto (Avançar): ${mobName}`;
                        btnBattle.style.borderColor = 'var(--rarity-legendary)';
                    }

                    btnBattle.onclick = () => {
                        const event = window.MapSystem.explore(locId, idx);
                        if (!event || event.type !== 'combat') return;
                        
                        const monsters = event.data;
                        const winChance = window.gameCombat.estimateWinChance(monsters);

                        const isHorde = Array.isArray(monsters) && monsters.length > 1;
                        const targetName = isHorde ? `grupo de inimigos (${monsters.length})` : (Array.isArray(monsters) ? monsters[0].name : monsters.name);
                        
                        const msg = `Estimativa de Vitória: ${winChance}%\n\nO computador simulará o combate contra [${targetName}]. Batalhas automáticas aceleradas geram cansaço e consumirão uma porção do seu HP, ganhando ou perdendo.\n\nDeseja iniciar a Batalha Automática?`;
                        
                        if (confirm(msg)) {
                            const result = window.gameCombat.autoResolveCombat(monsters);
                            if (result) {
                                this.showToast(`Vitória Simulada! Você derrotou ${targetName}. Verifique o chat de combate.`);
                            } else {
                                this.showToast(`Derrota Simulada. ${targetName} foi forte demais.`);
                            }
                        }
                    };
                } 
                // SE FOR MAPA NORMAL, USA A ANIMAÇÃO E COMBATE CLÁSSICO
                else {
                    if (isCompleted) {
                        btnBattle.innerText = `🔄 Repetir ${idx + 1}: ${mobName}`;
                        btnBattle.style.borderColor = 'var(--rarity-uncommon)';
                    } else if (isActiveCampaign) {
                        btnBattle.innerText = `⚔️ Desafio ${idx + 1}: ${mobName}`;
                        btnBattle.style.borderColor = 'var(--accent-red)';
                    }

                    btnBattle.onclick = () => {
                        if (btnBattle.disabled) return;
                        btnBattle.disabled = true;
                        const originalText = btnBattle.innerText;
                        
                        const frames = ["🚶‍♂️", "🏃‍♂️", "🚶‍♂️", "🏃‍♂️"];
                        let frameIdx = 0;
                        const animInterval = setInterval(() => {
                            frameIdx = (frameIdx + 1) % frames.length;
                            btnBattle.innerText = `Viajando... ${frames[frameIdx]}`;
                        }, 250);

                        setTimeout(() => {
                            clearInterval(animInterval);
                            btnBattle.disabled = false;
                            btnBattle.innerText = originalText;

                            const event = window.MapSystem.explore(locId, idx);
                            if (event && event.type === 'combat') {
                                window.gameCombat.startCombat(event.data);
                            }
                        }, 1200);
                    };
                }
            }
            battlesGrid.appendChild(btnBattle);
        });

        this.elLocDetails.appendChild(battlesGrid);
    }
}

window.UIManager = UIManager;