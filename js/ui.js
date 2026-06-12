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
        this.elCombatMonsterSide = document.querySelector('.monster-side');
        this.elCombatPlayerHpBar = document.getElementById('combat-player-hp-bar');
        this.elCombatPlayerHp = document.getElementById('combat-player-hp');
        this.elCombatPlayerHpMax = document.getElementById('combat-player-hp-max');
        this.elCombatMonsterName = document.getElementById('combat-monster-name');
        this.elCombatMonsterHpBar = document.getElementById('combat-monster-hp-bar');
        this.elCombatMonsterHp = document.getElementById('combat-monster-hp');
        this.elCombatMonsterHpMax = document.getElementById('combat-monster-hp-max');
        this.elCombatMonsterWeaknesses = document.getElementById('combat-monster-weaknesses');
        
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
                const locId = e.target.getAttribute('data-loc');
                const loc = MapSystem.getRegionDetails(locId);
                if (loc) {
                    this.elLocName.innerHTML = `${loc.name} (Nível ${loc.minLvl}-${loc.maxLvl})<br><small>${loc.desc}</small>`;
                    this.btnExplore.classList.remove('hidden');
                    this.btnExplore.onclick = () => {
                        const event = MapSystem.explore(locId);
                        if (event) {
                            if (event.type === 'combat') {
                                window.gameCombat.startCombat(event.data);
                            } else if (event.type === 'armadilha') {
                                const dano = Math.floor(window.gamePlayer.getMaxHp() * 0.1);
                                window.gamePlayer.hp -= dano;
                                let msg = `Você caiu em uma armadilha e perdeu ${dano} HP!`;
                                if (window.gamePlayer.hp <= 0) {
                                    window.gamePlayer.hp = 1;
                                    msg += ` Você quase morreu na armadilha! Retornando...`;
                                }
                                Engine.emit('playerUpdated', window.gamePlayer);
                                Engine.emit('systemLog', msg);
                            } else if (event.type === 'suprimentos') {
                                const cura = Math.floor(window.gamePlayer.getMaxHp() * 0.2);
                                const manaRestaurada = Math.floor(window.gamePlayer.getMaxMana() * 0.2);
                                window.gamePlayer.heal(cura);
                                window.gamePlayer.restoreMana(manaRestaurada);
                                Engine.emit('playerUpdated', window.gamePlayer);
                                Engine.emit('systemLog', `Você encontrou suprimentos! Restaurou ${cura} HP e ${manaRestaurada} Mana.`);
                            }
                        }
                    };
                }
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
            if(confirm('Tem certeza? Isso apagará todo o seu progresso.')) {
                Engine.clearSave();
                location.reload();
            }
        });

        // Add class selection logic on level 5
        this.elCharClass.addEventListener('click', () => {
            if (window.gamePlayer.playerClass === 'Nenhuma' && window.gamePlayer.level >= 5) {
                const cls = prompt('Escolha sua classe: Caçador, Exorcista, Alquimista, Bruxo ou Mago');
                if (cls) {
                    window.gamePlayer.setClass(cls);
                }
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
        
        let classTxt = p.playerClass;
        if (p.level >= 5 && p.playerClass === 'Nenhuma') {
            classTxt = 'Clique para escolher!';
            this.elCharClass.style.cursor = 'pointer';
            this.elCharClass.style.color = 'var(--accent-gold)';
        } else {
            this.elCharClass.style.cursor = 'default';
            this.elCharClass.style.color = '';
        }
        this.elCharClass.innerText = classTxt;
        
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

    showCombatScreen(monster) {
        document.querySelector('[data-target="screen-combat"]').click();
        this.hideCombatMenus();
        this.elCombatLog.innerHTML = '';
        this.elCombatMonsterName.innerText = `Lvl ${monster.level} ${monster.name}`;
        
        if (monster.weakness.length > 0) {
            this.elCombatMonsterWeaknesses.innerText = `Fraquezas: ${monster.weakness.join(', ')}`;
        } else {
            this.elCombatMonsterWeaknesses.innerText = '';
        }
        
        this.btnAttack.disabled = false;
        if (this.btnSkill) this.btnSkill.disabled = false;
        this.btnFlee.disabled = false;
        this.btnPotion.disabled = false;
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
        const m = data.monster;

        const pPct = Math.max(0, (p.hp / p.getMaxHp()) * 100);
        this.elCombatPlayerHpBar.style.width = `${pPct}%`;
        this.elCombatPlayerHp.innerText = p.hp;
        this.elCombatPlayerHpMax.innerText = p.getMaxHp();

        if (m) {
            const mPct = Math.max(0, (m.hp / m.maxHp) * 100);
            this.elCombatMonsterHpBar.style.width = `${mPct}%`;
            this.elCombatMonsterHp.innerText = m.hp;
            this.elCombatMonsterHpMax.innerText = m.maxHp;
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
        let el = data.target === 'player' ? this.elCombatPlayerSide : this.elCombatMonsterSide;
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
}

window.UIManager = UIManager;