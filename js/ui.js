/**
 * ui.js
 * Handles DOM manipulation and UI rendering based on engine events.
 */

class UIManager {
    constructor() {
        this.selectedPartyIndex = 0;
        this.cacheDOM();
        this.bindEvents();
        this.setupNavigation();

        // Initialize sub-managers
        if (window.CombatUIManager) {
            this.combatUI = new window.CombatUIManager(this);
        }

        this.renderShop();

        // Subscribe to engine events
        Engine.on('partyUpdated', party => this.renderPartySelectors(party));
        Engine.on('playerUpdated', p => {
            if (window.gameParty[this.selectedPartyIndex] === p) {
                this.renderPlayer(p);
            }
            // Always re-render the party list if the player object changed (e.g., stats added)
            if (window.gameParty && window.gameParty.includes(p)) {
                this.renderAllPlayers();
            }
            this.renderHeader();
        });
        Engine.on('inventoryUpdated', inv => {
            const currentFilter = this.currentInvFilter || 'all';
            this.renderInventory(inv, currentFilter);
            if (this.elShopList && !this.elShopList.parentElement.parentElement.classList.contains('hidden')) {
                this.renderShop();
            }
            if (this.elCraftingRecipes && !this.elCraftingRecipes.parentElement.parentElement.parentElement.classList.contains('hidden')) {
                this.renderCrafting(inv, window.gameParty[0]);
            }
        });
        Engine.on('equipmentUpdated', eq => {
            if (window.gameParty[this.selectedPartyIndex] && window.gameParty[this.selectedPartyIndex].equipment === eq) {
                this.renderEquipment(eq);
            }
        });

        // Delegate combat events
        if (this.combatUI) {
            Engine.on('turnQueueUpdated', q => this.combatUI.renderTurnQueue(q));
            Engine.on('combatUpdated', c => this.combatUI.renderCombatStats(c));
            Engine.on('combatLog', log => this.combatUI.appendCombatLog(log));
            Engine.on('combatStarted', m => this.combatUI.showCombatScreen(m));
            Engine.on('combatEnded', v => this.combatUI.hideCombatScreen(v));
            Engine.on('combatAnimation', a => this.combatUI.playCombatAnimation(a));
Engine.on('turnStarted', () => {
                if (this.combatUI.btnAttack) this.combatUI.btnAttack.disabled = false;
                if (this.combatUI.btnSkill) this.combatUI.btnSkill.disabled = false;
                if (this.combatUI.btnPotion) this.combatUI.btnPotion.disabled = false;
                if (this.combatUI.btnFlee) this.combatUI.btnFlee.disabled = false;
                // CORREÇÃO: Garantindo que o Fim de Turno obedeça ao estado
                if (this.combatUI.btnEndTurn) this.combatUI.btnEndTurn.disabled = false; 
            });
            
            Engine.on('turnEnded', () => {
                if (this.combatUI.btnAttack) this.combatUI.btnAttack.disabled = true;
                if (this.combatUI.btnSkill) this.combatUI.btnSkill.disabled = true;
                if (this.combatUI.btnPotion) this.combatUI.btnPotion.disabled = true;
                if (this.combatUI.btnFlee) this.combatUI.btnFlee.disabled = true;
                // CORREÇÃO: Travando o botão Fim de Turno no turno do inimigo
                if (this.combatUI.btnEndTurn) this.combatUI.btnEndTurn.disabled = true; 
            });
        }

        Engine.on('systemLog', msg => this.showToast(msg));
        Engine.on('questsUpdated', qs => this.renderQuests(qs));
        Engine.on('bestiaryUpdate', m => this.updateBestiary(m));

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

        // Party Selection
        this.elInvPartySelector = document.getElementById('inv-party-selector');
        this.btnAddMember = document.getElementById('btn-add-member');

        // Nav
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.screens = document.querySelectorAll('.screen');

        // Inventory
        this.elInvCount = document.getElementById('inv-count');
        this.elInvList = document.getElementById('inventory-list');
        this.invTabBtns = document.querySelectorAll('.inv-tab-btn');
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

        // Quests
        this.elActiveQuests = document.getElementById('active-quests-list');
        this.elAvailableContracts = document.getElementById('available-contracts-list');

        // Crafting
        this.elCraftingRecipes = document.getElementById('crafting-recipes');
        this.elCraftingUpgradeList = document.getElementById('crafting-upgrade-list');

        // Shop
        this.elShopList = document.getElementById('shop-list');
        this.shopTabBtns = document.querySelectorAll('.shop-tab-btn');

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
        this.btnExportSave = document.getElementById('btn-export-save');
        this.btnImportSave = document.getElementById('btn-import-save');
        this.btnCopySave = document.getElementById('btn-copy-save');
        this.elSaveDataTextarea = document.getElementById('save-data-textarea');

        // Initial map render after cacheDOM
        this.renderMap();
    }

    bindEvents() {
        if (this.btnAddMember) {
            this.btnAddMember.addEventListener('click', () => {
                const name = prompt("Nome do novo membro:");
                if (name) {
                    window.game.addPartyMember(name);
                }
            });
        }

        if (this.elInvPartySelector) {
            this.elInvPartySelector.addEventListener('change', (e) => {
                this.selectedPartyIndex = parseInt(e.target.value);
                this.renderPlayer(window.gameParty[this.selectedPartyIndex]);
                this.renderEquipment(window.gameParty[this.selectedPartyIndex].equipment);
            });
        }

        this.invTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.invTabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentInvFilter = e.target.getAttribute('data-filter');
                this.renderInventory(window.gameInventory, this.currentInvFilter);
            });
        });

        if (this.btnEquipItem) {
            this.btnEquipItem.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.equip(this.selectedItemInstanceId, this.selectedPartyIndex);
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        if (this.btnEquipItemMain) {
            this.btnEquipItemMain.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.equip(this.selectedItemInstanceId, this.selectedPartyIndex, 'weaponMain');
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        if (this.btnEquipItemOff) {
            this.btnEquipItemOff.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    window.gameInventory.equip(this.selectedItemInstanceId, this.selectedPartyIndex, 'weaponOff');
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        if (this.btnUseItem) {
            this.btnUseItem.addEventListener('click', () => {
                if (this.selectedItemInstanceId) {
                    const item = window.gameInventory.items.find(i => i.instanceId === this.selectedItemInstanceId);
                    
                    // Se for poção e o jogador tiver mais de uma, abre o assistente de quantidade
                    if (item && item.type === 'potion' && item.count > 1) {
                        const qtyStr = prompt(`Quantas poções de ${item.name} deseja tomar de uma vez? (No Inventário: ${item.count})`, '1');
                        const qty = parseInt(qtyStr);
                        if (!isNaN(qty) && qty > 0) {
                            const toUse = Math.min(qty, item.count);
                            for (let i = 0; i < toUse; i++) {
                                window.gameInventory.useItem(this.selectedItemInstanceId, this.selectedPartyIndex);
                            }
                            this.showToast(`Você consumiu ${toUse}x ${item.name}!`);
                        }
                    } else {
                        // Comportamento padrão para item único ou outros tipos de usáveis
                        window.gameInventory.useItem(this.selectedItemInstanceId, this.selectedPartyIndex);
                    }
                    if (this.elInvActionPanel) this.elInvActionPanel.classList.add('hidden');
                }
            });
        }

        this.eqSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotId = e.currentTarget.getAttribute('data-slot');
                window.gameInventory.unequip(slotId, this.selectedPartyIndex);
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
        // Adicione junto aos outros escutadores de eventos
        this.shopTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.shopTabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentShopFilter = e.target.getAttribute('data-filter');
                this.renderShop();
            });
        });

        if (this.btnExportSave) {
            this.btnExportSave.addEventListener('click', () => {
                window.game.save();
                const saveStr = Engine.exportSave();
                if (saveStr) {
                    this.elSaveDataTextarea.value = saveStr;
                    this.btnCopySave.classList.remove('hidden');
                    this.showToast('Save exportado com sucesso.');
                } else {
                    this.showToast('Nenhum save encontrado para exportar.');
                }
            });
        }

        if (this.btnImportSave) {
            this.btnImportSave.addEventListener('click', () => {
                const saveStr = this.elSaveDataTextarea.value.trim();
                if (!saveStr) {
                    this.showToast('Cole o texto do save na área de texto primeiro.');
                    return;
                }
                if (confirm('Tem certeza? Isso irá sobrescrever o seu jogo atual.')) {
                    if (Engine.importSave(saveStr)) {
                        window.game.load();
                        this.showToast('Jogo importado com sucesso!');
                        this.elSaveDataTextarea.value = '';
                        this.btnCopySave.classList.add('hidden');
                    } else {
                        this.showToast('Falha ao importar o jogo. Save corrompido ou inválido.');
                    }
                }
            });
        }

        if (this.btnCopySave) {
            this.btnCopySave.addEventListener('click', () => {
                this.elSaveDataTextarea.select();
                document.execCommand('copy');
                this.showToast('Save copiado para a área de transferência.');
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
                
                // Explicitly render crafting if navigating to it
                if (target === 'screen-crafting') {
                    this.renderCrafting(window.gameInventory, window.gameParty[0]);
                }
            });
        });
    }

    renderPartySelectors(party) {
        if (!this.elInvPartySelector) return;
        
        const optionsHTML = party.map((p, idx) => `<option value="${idx}">${p.name} (Nv. ${p.level})</option>`).join('');
        
        this.elInvPartySelector.innerHTML = optionsHTML;
        this.elInvPartySelector.value = this.selectedPartyIndex;

        if (this.btnAddMember) {
            this.btnAddMember.style.display = party.length < 4 ? 'inline-block' : 'none';
        }
    }

    renderHeader() {
        const party = window.gameParty;
        if (!party) return;
        
        const avgLevel = Math.floor(party.reduce((sum, p) => sum + p.level, 0) / party.length);
        const totalHp = party.reduce((sum, p) => sum + p.hp, 0);
        const maxHp = party.reduce((sum, p) => sum + p.getMaxHp(), 0);
        const totalMana = party.reduce((sum, p) => sum + p.mana, 0);
        const maxMana = party.reduce((sum, p) => sum + p.getMaxMana(), 0);
        
        this.elHeaderLevel.innerText = `Nível Médio: ${avgLevel}`;
        this.elHeaderHp.innerText = `Grupo HP: ${totalHp}/${maxHp}`;
        this.elHeaderMana.innerText = `Grupo Mana: ${totalMana}/${maxMana}`;
        // Gold goes to game state, but we sum it up if it exists per player, though gold should really be global.
        // If player 0 has it, let's just use player 0's gold for display.
        const totalGold = window.gameParty[0].gold || 0;
        this.elHeaderGold.innerText = `Ouro: ${totalGold}`;
    }

    renderPlayer(p) {
        this.renderBestiary();
        this.renderHeader();
        this.renderAllPlayers();
    }

    renderAllPlayers() {
        const container = document.getElementById('character-list');
        if (!container) return;
        container.innerHTML = '';
        
        window.gameParty.forEach((p, idx) => {
            const card = document.createElement('div');
            card.style.background = 'var(--bg-panel)';
            card.style.border = '1px solid var(--border-color)';
            card.style.padding = '1rem';
            card.style.borderRadius = '4px';
            
            // Renomear and Remover buttons
            const removeBtnHtml = idx > 0 ? `<button class="btn-remove-member danger" data-idx="${idx}" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">Remover</button>` : '';

            let emoji = '🧑';
            if (this.combatUI && this.combatUI.getEmojiForClass) {
                emoji = this.combatUI.getEmojiForClass(p.playerClass);
            }

            const titleHtml = `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); margin-bottom: 0.5rem; padding-bottom: 0.5rem;">
                <h3 style="margin: 0;">${emoji} ${p.name}</h3>
                <div style="display: flex; gap: 0.2rem;">
                    <button class="btn-rename" data-idx="${idx}" style="font-size: 0.7rem; padding: 0.2rem 0.4rem;">Renomear</button>
                    ${removeBtnHtml}
                </div>
            </div>`;
            
            const statsHtml = `
                <p style="margin: 0.2rem 0;"><strong>Nível:</strong> ${p.level}</p>
                <p style="margin: 0.2rem 0;"><strong>HP:</strong> ${p.hp} / ${p.getMaxHp()}</p>
                <p style="margin: 0.2rem 0;"><strong>Mana:</strong> ${p.mana} / ${p.getMaxMana()}</p>
                <p style="margin: 0.2rem 0;"><strong>XP:</strong> ${p.xp} / ${p.getXpNeeded()}</p>
                <div class="class-container" style="margin: 0.5rem 0;">
                    <strong>Classe:</strong> <span class="class-label" style="color: ${p.playerClass !== 'Nenhuma' ? 'var(--accent-gold)' : 'inherit'};">${p.playerClass}</span>
                </div>
                <p style="margin: 0.5rem 0 0.2rem 0;"><strong>Atributos (Pontos: ${p.statPoints})</strong></p>
                <div style="display: grid; gap: 0.3rem;">
                    <div style="display: flex; justify-content: space-between;"><span>Força: ${p.attributes.str} (${p.getTotalAttr('str')})</span> <button class="btn-add-attr" data-attr="str" data-idx="${idx}" style="display: ${p.statPoints > 0 ? 'inline-block' : 'none'}; padding: 0 5px;">+</button></div>
                    <div style="display: flex; justify-content: space-between;"><span>Agilidade: ${p.attributes.agi} (${p.getTotalAttr('agi')})</span> <button class="btn-add-attr" data-attr="agi" data-idx="${idx}" style="display: ${p.statPoints > 0 ? 'inline-block' : 'none'}; padding: 0 5px;">+</button></div>
                    <div style="display: flex; justify-content: space-between;"><span>Inteligência: ${p.attributes.int} (${p.getTotalAttr('int')})</span> <button class="btn-add-attr" data-attr="int" data-idx="${idx}" style="display: ${p.statPoints > 0 ? 'inline-block' : 'none'}; padding: 0 5px;">+</button></div>
                    <div style="display: flex; justify-content: space-between;"><span>Defesa: ${p.attributes.def} (${p.getTotalAttr('def')})</span> <button class="btn-add-attr" data-attr="def" data-idx="${idx}" style="display: ${p.statPoints > 0 ? 'inline-block' : 'none'}; padding: 0 5px;">+</button></div>
                    <div style="display: flex; justify-content: space-between;"><span>Sorte: ${p.attributes.luk} (${p.getTotalAttr('luk')})</span> <button class="btn-add-attr" data-attr="luk" data-idx="${idx}" style="display: ${p.statPoints > 0 ? 'inline-block' : 'none'}; padding: 0 5px;">+</button></div>
                </div>
            `;
            
            card.innerHTML = titleHtml + statsHtml;
            
            // Re-bind Rename
            const btnRename = card.querySelector('.btn-rename');
            btnRename.addEventListener('click', () => {
                const newName = prompt("Digite o novo nome:", p.name);
                if (newName && newName.trim().length > 0) {
                    p.name = newName.trim();
                    Engine.emit('partyUpdated', window.gameParty);
                    Engine.emit('playerUpdated', p);
                }
            });

            // Remove Member
            const btnRemove = card.querySelector('.btn-remove-member');
            if (btnRemove) {
                btnRemove.addEventListener('click', () => {
                    if (confirm(`Tem certeza que deseja remover ${p.name} do grupo?`)) {
                        window.gameParty.splice(idx, 1);
                        Engine.emit('partyUpdated', window.gameParty);
                        Engine.emit('systemLog', `${p.name} deixou o grupo.`);
                    }
                });
            }

            // Re-bind add attr
            const addBtns = card.querySelectorAll('.btn-add-attr');
            addBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const attr = e.target.getAttribute('data-attr');
                    p.addAttribute(attr);
                });
            });

            // Class Selection
            if (p.level >= 5 && !p.classLocked) {
                const classCont = card.querySelector('.class-container');
                classCont.innerHTML = `<strong>Classe:</strong> <span class="class-label" style="color: inherit;">${p.playerClass}</span><br><div style="display: flex; gap: 0.2rem; flex-wrap: wrap; margin-top: 0.2rem;"></div>`;
                const btnArea = classCont.querySelector('div');
                const classesDisponiveis = ['Guerreiro', 'Caçador', 'Guardião', 'Mago', 'Clérigo'];
                classesDisponiveis.forEach(cls => {
                    const btnClasse = document.createElement('button');
                    btnClasse.innerText = cls;
                    btnClasse.style.padding = '0.2rem 0.4rem';
                    btnClasse.style.fontSize = '0.7rem';
                    btnClasse.onclick = () => {
                        p.setClass(cls);
                    };
                    btnArea.appendChild(btnClasse);
                });
            }
            
            container.appendChild(card);
        });
    }

    getItemEmoji(item) {
        if (!item || !item.name) return '📦';
        const nameLower = item.name.toLowerCase();

        // Accessories
        if (nameLower.includes('colar') || nameLower.includes('amuleto')) return '📿';
        if (nameLower.includes('anel')) return '💍';

        // Magic weapons / staves
        if (nameLower.includes('cajado') || nameLower.includes('orbe') || nameLower.includes('tomo') || nameLower.includes('grimório') || nameLower.includes('grimorio')) return '🪄';

        // Ranged weapons
        if (nameLower.includes('arco') || nameLower.includes('besta')) return '🏹';

        // Bladed weapons
        if (nameLower.includes('espada') || nameLower.includes('adaga') || nameLower.includes('katana')) return '🗡️';

        // Other melee weapons
        if (nameLower.includes('machado')) return '🪓';
        if (nameLower.includes('lança') || nameLower.includes('lanca')) return '🔱';
        if (nameLower.includes('martelo')) return '🔨';

        // Armor & Shields
        if (nameLower.includes('escudo') || nameLower.includes('aegis')) return '🛡️';
        if (nameLower.includes('capuz') || nameLower.includes('elmo')) return '🪖';
        if (nameLower.includes('peitoral') || nameLower.includes('armadura') || nameLower.includes('cota') || nameLower.includes('manto')) return '👕';
        if (nameLower.includes('luvas')) return '🧤';
        if (nameLower.includes('calças') || nameLower.includes('calcas')) return '👖';
        if (nameLower.includes('botas')) return '👢';

        // Materials
        if (nameLower.includes('ossos')) return '🦴';
        if (nameLower.includes('couro')) return '🟤';
        if (nameLower.includes('presas') || nameLower.includes('chifre')) return '🦏';
        if (nameLower.includes('escamas')) return '🐟';
        if (nameLower.includes('sangue')) return '🩸';
        if (nameLower.includes('essência') || nameLower.includes('essencia') || nameLower.includes('cristal') || nameLower.includes('pó') || nameLower.includes('po ')) return '✨';
        if (nameLower.includes('minério') || nameLower.includes('minerio') || nameLower.includes('ferro')) return '🪨';

        // Potions
        if (nameLower.includes('poção') || nameLower.includes('pocao') || nameLower.includes('antídoto') || nameLower.includes('antidoto')) return '🧪';

        // Fallbacks by type
        const typeEmojis = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'accessory': '💍',
            'potion': '🧪',
            'material': '💎'
        };

        return typeEmojis[item.type] || '📦';
    }

    getItemDescription(item) {
        let desc = `<em>Raridade: ${item.rarity || 'comum'}</em><br>Tipo: ${item.type}<br>`;
        if (item.count > 1) desc += `Quantidade: ${item.count}<br>`;
        if (item.minDmg) desc += `Dano: ${item.minDmg} - ${item.maxDmg}<br>`;
        if (item.def) desc += `Defesa: ${item.def}<br>`;
        if (item.stats) {
            let statsStrs = [];
            for (let [k,v] of Object.entries(item.stats)) {
                statsStrs.push(`${k.toUpperCase()}: +${v}`);
            }
            if (statsStrs.length > 0) desc += `Atributos: ${statsStrs.join(', ')}<br>`;
        }
        if (item.weakness) desc += `Elemento/Especial: ${item.weakness}<br>`;
        if (item.effect) desc += `Efeito: Cura/Mana ${item.value}<br>`;
        if (item.reqLvl) desc += `Nível Requerido: ${item.reqLvl}<br>`;
        return desc;
    }

    renderInventory(inv, filter = 'all') {
        this.elInvCount.innerText = inv.items.length;
        this.elInvList.innerHTML = '';

        let items = [...inv.items];
        if (filter !== 'all') {
            items = items.filter(i => i.type === filter);
        }

        const typeOrder = { 'weapon': 1, 'armor': 2, 'accessory': 3, 'potion': 4, 'material': 5 };
        const rarityOrder = { 'mitico': 1, 'lendario': 2, 'epico': 3, 'raro': 4, 'incomum': 5, 'comum': 6 };
        
        items.sort((a, b) => {
            if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return rarityOrder[a.rarity] - rarityOrder[b.rarity];
            return a.name.localeCompare(b.name);
        });

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `inv-item rarity-${item.rarity}`;
            div.style.position = 'relative';
            
            const emoji = this.getItemEmoji(item);
            div.innerHTML = `<span style="font-size: 1.5rem;">${emoji}</span>`;

            if ((item.type === 'material' || item.type === 'potion') && item.count > 1) {
                div.innerHTML += `<span class="item-count">x${item.count}</span>`;
            }

            div.addEventListener('click', () => {
                this.selectedItemInstanceId = item.instanceId;
                if (this.elInvActionPanel) {
                    this.elInvActionPanel.classList.remove('hidden');
                    this.elActionPanelName.innerText = item.name;

                    this.elActionPanelDesc.innerHTML = this.getItemDescription(item);

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
        html += this.getItemDescription(item);

        this.tooltip.innerHTML = html;
        this.tooltip.classList.remove('hidden');

        // Position
        this.tooltip.style.left = (e.pageX + 10) + 'px';
        this.tooltip.style.top = (e.pageY + 10) + 'px';
    }

    showEquipmentTooltip(e, slotEl) {
        const slotId = slotEl.getAttribute('data-slot');
        const item = window.gameParty[this.selectedPartyIndex].equipment[slotId];
        if (item) {
            this.showItemTooltip(e, item);
        }
    }

    hideTooltip() {
        this.tooltip.classList.add('hidden');
    }

showToast(msg) {
        // Verifica se o orquestrador de notificações já existe, se não, cria um.
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.position = 'fixed';
            container.style.bottom = '20px';
            container.style.right = '20px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column'; // Empilha uma em cima da outra
            container.style.gap = '10px';             // Espaçamento entre as mensagens
            container.style.zIndex = '9999';
            container.style.pointerEvents = 'none';   // Não bloqueia os seus cliques no mapa
            document.body.appendChild(container);
        }

        // Cria a notificação individual
        const toast = document.createElement('div');
        toast.style.backgroundColor = 'var(--accent-red)';
        toast.style.border = '1px solid var(--accent-gold)';
        toast.style.color = 'white';
        toast.style.padding = '0.8rem 1.2rem';
        toast.style.borderRadius = '4px';
        toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        toast.style.boxShadow = '0 4px 8px rgba(0,0,0,0.5)';
        toast.style.fontSize = '0.9rem';
        toast.innerText = msg;

        // Adiciona a nova mensagem ao final da pilha
        container.appendChild(toast);

        // Remove a notificação após 3.5 segundos com uma animação suave
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)'; // Desce levemente ao sumir
            setTimeout(() => toast.remove(), 400);      // Aguarda a animação antes de deletar a div
        }, 3500);
    }

    renderQuests(questSys) {
        this.elActiveQuests.innerHTML = '';
        const categories = {
            'kill': { title: 'Batalha / Caça', items: [] },
            'gather': { title: 'Coleta', items: [] },
            'explore': { title: 'Exploração', items: [] },
            'boss': { title: 'Chefe', items: [] }
        };

        // Populate Active Quests
        questSys.activeQuests.forEach(q => {
            const li = document.createElement('li');
            li.className = 'quest-card';

            let progressText = `Progresso: ${q.currentQty} / ${q.requiredQty}`;
            let isComplete = q.currentQty >= q.requiredQty;

            if (q.type === 'gather') {
                const item = window.gameInventory.items.find(i => i.id === q.targetId);
                const currentCount = item ? item.count : 0;
                progressText = `Progresso: ${currentCount} / ${q.requiredQty}`;
                isComplete = currentCount >= q.requiredQty;
            }

            li.innerHTML = `<strong>${q.title}</strong><br>${progressText}<br>`;
            if (isComplete) {
                const btn = document.createElement('button');
                btn.innerText = 'Concluir';
                btn.onclick = () => questSys.completeQuest(q.id);
                li.appendChild(btn);
            }

            let cat = q.type;
            if (q.title.includes('Ameaça Máxima')) cat = 'boss';
            if (categories[cat]) categories[cat].items.push(li);
            else categories['kill'].items.push(li); // Fallback
        });

        Object.values(categories).forEach(cat => {
            if (cat.items.length > 0) {
                const header = document.createElement('h4');
                header.innerText = cat.title;
                header.style.color = 'var(--accent-gold)';
                header.style.marginTop = '1rem';
                this.elActiveQuests.appendChild(header);
                cat.items.forEach(item => this.elActiveQuests.appendChild(item));
            }
        });

        if (this.elActiveQuests.innerHTML === '') {
            this.elActiveQuests.innerHTML = 'Nenhuma missão ativa.';
        }


        // Populate Available Contracts
        this.elAvailableContracts.innerHTML = '';
        const availableCategories = {
            'kill': { title: 'Batalha / Caça', items: [] },
            'gather': { title: 'Coleta', items: [] },
            'explore': { title: 'Exploração', items: [] },
            'boss': { title: 'Chefe', items: [] }
        };

        questSys.availableContracts.forEach(c => {
            const li = document.createElement('li');
            li.className = 'quest-card';
            li.innerHTML = `<strong>${c.title}</strong><br>${c.desc}<br>Recompensas: ${c.rewards.xp} XP, ${c.rewards.gold} Ouro<br>`;
            const btn = document.createElement('button');
            btn.innerText = 'Aceitar';
            btn.onclick = () => questSys.acceptContract(c.id);
            li.appendChild(btn);

            let cat = c.type;
            if (c.title.includes('Ameaça Máxima')) cat = 'boss';
            if (availableCategories[cat]) availableCategories[cat].items.push(li);
            else availableCategories['kill'].items.push(li); // Fallback
        });

        Object.values(availableCategories).forEach(cat => {
            if (cat.items.length > 0) {
                const header = document.createElement('h4');
                header.innerText = cat.title;
                header.style.color = 'var(--accent-gold)';
                header.style.marginTop = '1rem';
                this.elAvailableContracts.appendChild(header);
                cat.items.forEach(item => this.elAvailableContracts.appendChild(item));
            }
        });

        if (this.elAvailableContracts.innerHTML === '') {
            this.elAvailableContracts.innerHTML = 'Nenhum contrato disponível no momento.';
        }
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
        if (!this.elCraftingRecipes || !this.elCraftingUpgradeList) return;
        this.elCraftingRecipes.innerHTML = '';
        this.elCraftingUpgradeList.innerHTML = '';
        
        CraftingSystem.recipes.forEach(r => {
            const div = document.createElement('div');
            div.style.padding = '1rem';
            div.style.border = '1px solid var(--border-color)';
            div.style.background = '#2a2a2a';
            div.style.borderRadius = '4px';
            
            let craftedItem = { name: r.name };
            if (r.result && r.result.baseId) {
                if (r.result.baseId.startsWith('w')) craftedItem.type = 'weapon';
                else if (r.result.baseId.startsWith('a')) craftedItem.type = 'armor';
                else craftedItem.type = 'accessory';
            } else if (r.result && r.result.type) {
                craftedItem.type = r.result.type;
            }
            let emoji = this.getItemEmoji(craftedItem);
            
            let ings = r.ingredients.map(ing => {
                const hasItem = inventory.items.find(i => i.id === ing.id);
                const hasQty = hasItem ? hasItem.count : 0;
                const color = hasQty >= ing.qty ? 'var(--rarity-uncommon)' : 'var(--rarity-mythic)';
                return `<span style="color: ${color};">${hasQty}/${ing.qty}x ${ing.name}</span>`;
            }).join('<br>');
            
            div.innerHTML = `<h4 style="margin:0 0 0.5rem 0; color: var(--accent-gold);">${emoji} ${r.name}</h4>
                             <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;">Requisito Nv: ${r.reqLvl}</p>
                             <div style="font-size: 0.85rem; margin-bottom: 1rem;"><strong>Ingredientes:</strong><br>${ings}</div>`;

            const btn = document.createElement('button');
            btn.innerText = 'Forjar';
            btn.style.width = '100%';
            btn.style.backgroundColor = 'var(--bg-panel)';
            
            if (!CraftingSystem.canCraft(r.id, inventory) || player.level < r.reqLvl) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            } else {
                btn.style.borderColor = 'var(--accent-gold)';
            }
            
            btn.onclick = () => CraftingSystem.craft(r.id, inventory, player);
            div.appendChild(btn);
            this.elCraftingRecipes.appendChild(div);
        });

        // --- INÍCIO DO SISTEMA DE REFINAMENTO ---
        const upgItems = inventory.items.filter(i => i.type === 'weapon' || i.type === 'armor');
        if (upgItems.length === 0) {
            const noI = document.createElement('p');
            noI.innerText = 'Não tens equipamento na mochila para refinar. (Desequipa um item primeiro)';
            noI.style.color = '#777';
            this.elCraftingUpgradeList.appendChild(noI);
            btn.onclick = () => {
                CraftingSystem.refineEquipment(item.instanceId, inventory, player);
            };
        }

        upgItems.forEach(item => {
            const div = document.createElement('div');
            div.className = `quest-card rarity-${item.rarity}`;
            div.style.background = '#2a2a2a';
            div.style.padding = '1rem';
            
            const currentLevel = parseInt((item.name.match(/\+(\d+)/) || [0, 0])[1]);
            const nextLevel = currentLevel + 1;
            const costGold = 100 * nextLevel;
            const matReq = { id: 'm10', qty: nextLevel, name: 'Minério de Ferro' }; // Pede Ferro

            let desc = `<strong>${item.name}</strong> ➔ <span style="color:var(--accent-gold);">Nível +${nextLevel}</span><br>`;
            desc += `<div style="font-size: 0.85rem; margin-top: 0.5rem;">Custo: ${costGold} Ouro</div>`;
            
            const hasMat = inventory.items.find(i => i.id === matReq.id);
            const hasMatQty = hasMat ? hasMat.count : 0;
            const matColor = hasMatQty >= matReq.qty ? 'var(--rarity-uncommon)' : 'var(--rarity-mythic)';
            desc += `<div style="font-size: 0.85rem; margin-bottom: 1rem;">Requer: <span style="color:${matColor};">${hasMatQty}/${matReq.qty}x ${matReq.name}</span></div>`;

            div.innerHTML = desc;

            const btn = document.createElement('button');
            btn.innerText = 'Refinar';
            btn.style.width = '100%';
            
            if (player.gold < costGold || !hasMat || hasMatQty < matReq.qty) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            } else {
                btn.style.borderColor = 'var(--rarity-epic)';
            }

            btn.onclick = () => {
                player.gold -= costGold;
                inventory.removeItem(hasMat.instanceId, matReq.qty);

                item.name = item.name.includes('+') ? item.name.replace(/\+\d+/, `+${nextLevel}`) : `${item.name} +1`;
                if (item.minDmg) item.minDmg = Math.floor(item.minDmg * 1.20);
                if (item.maxDmg) item.maxDmg = Math.floor(item.maxDmg * 1.20);
                if (item.def) item.def = Math.floor(item.def * 1.20);
                if (item.value) item.value = Math.floor(item.value * 1.5);
                
                Engine.emit('systemLog', `Sucesso! O item foi refinado para +${nextLevel}!`);
                Engine.emit('inventoryUpdated', inventory);
                Engine.emit('playerUpdated', player);
            };
            div.appendChild(btn);
            this.elCraftingUpgradeList.appendChild(div);
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

    renderShop() {
        if (!this.elShopList) return;
        this.elShopList.innerHTML = '';

        const playerLvl = window.gameParty[0] ? window.gameParty[0].level : 1;
        const currentFilter = this.currentShopFilter || 'all';

        if (!this.shopItems || this.shopLevel !== playerLvl) {
            this.shopLevel = playerLvl;
            this.shopItems = [];
            
            // Random Gear
            for (let i = 0; i < 6; i++) {
                this.shopItems.push(ItemDatabase.generateItem(playerLvl + Math.floor(Math.random() * 5)));
            }
            
            // Random Potions
            for (let i = 0; i < 4; i++) {
                const pot = ItemDatabase.potions[Math.floor(Math.random() * ItemDatabase.potions.length)];
                this.shopItems.push(ItemDatabase.getPotion(pot.id));
            }
            
            // Random Materials
            for (let i = 0; i < 4; i++) {
                const mat = ItemDatabase.materials[Math.floor(Math.random() * ItemDatabase.materials.length)];
                this.shopItems.push(ItemDatabase.getMaterial(mat.id));
            }
        }

        const typeOrder = { 'weapon': 1, 'armor': 2, 'accessory': 3, 'potion': 4, 'material': 5 };
        const rarityOrder = { 'mitico': 1, 'lendario': 2, 'epico': 3, 'raro': 4, 'incomum': 5, 'comum': 6 };

        // 1. FILTRAGEM DOS ITENS DISPONÍVEIS PARA COMPRA
        let filteredBuyItems = [...this.shopItems];
        if (currentFilter !== 'all') {
            filteredBuyItems = filteredBuyItems.filter(item => item.type === currentFilter);
        }
        
        filteredBuyItems.sort((a, b) => {
            if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return rarityOrder[a.rarity] - rarityOrder[b.rarity];
            return a.name.localeCompare(b.name);
        });

        // Wrapper for Buy Section
        const buySection = document.createElement('div');
        buySection.className = 'shop-buy-section shop-items';
        buySection.style.display = 'grid';
        buySection.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        buySection.style.gap = '1rem';

        filteredBuyItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-card';
            
            // PREÇOS REFORMULADOS: Multiplicador de 3x aplicado sobre o custo base
            const baseCost = item.sellValue || item.gold || item.value || 10;
            const increasedCost = Math.floor(baseCost * 3);

            let descHtml = `<strong>${item.name}</strong><br>`;
            descHtml += this.getItemDescription(item);
            descHtml += `<hr style="margin: 0.5rem 0; border-color: var(--border-color);">`;
            descHtml += `Preço: <strong>${increasedCost} Ouro</strong><br><br>`;
            
            div.innerHTML = descHtml;

            const btnBuy = document.createElement('button');
            btnBuy.innerText = 'Comprar';
            btnBuy.onclick = () => {
                if ((window.gameParty[0].gold || 0) >= increasedCost) {
                    let newItem;
                    if (item.type === 'potion') {
                        newItem = ItemDatabase.getPotion(item.id);
                    } else if (item.type === 'material') {
                        newItem = ItemDatabase.getMaterial(item.id);
                    } else {
                        newItem = JSON.parse(JSON.stringify(item));
                        newItem.instanceId = 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
                    }
                    if (newItem && window.gameInventory.addItem(newItem)) {
                        window.gameParty[0].gold -= increasedCost;
                        Engine.emit('playerUpdated', window.gameParty[0]);
                        Engine.emit('systemLog', `Você comprou ${item.name} por ${increasedCost} Ouro.`);
                    }
                } else {
                    Engine.emit('systemLog', 'Ouro insuficiente.');
                }
            };
            div.appendChild(btnBuy);
            buySection.appendChild(div);
        });
        
        this.elShopList.appendChild(buySection);

        // Divisor visual para a seção de Venda
        const hr = document.createElement('hr');
        hr.style.gridColumn = '1 / -1';
        hr.style.margin = '2rem 0 1rem 0';
        hr.style.borderColor = 'var(--border-color)';
        this.elShopList.appendChild(hr);

        const sellTitle = document.createElement('h3');
        sellTitle.innerText = 'Vender seus itens';
        sellTitle.style.gridColumn = '1 / -1';
        sellTitle.style.color = 'var(--accent-gold)';
        sellTitle.style.marginBottom = '1rem';
        this.elShopList.appendChild(sellTitle);

        // 2. FILTRAGEM DOS ITENS DO INVENTÁRIO PARA VENDA
        let itemsToSell = [...window.gameInventory.items];
        if (currentFilter !== 'all') {
            itemsToSell = itemsToSell.filter(item => item.type === currentFilter);
        }
        
        itemsToSell.sort((a, b) => {
            if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return rarityOrder[a.rarity] - rarityOrder[b.rarity];
            return a.name.localeCompare(b.name);
        });

        // Wrapper for Sell Section
        const sellSection = document.createElement('div');
        sellSection.className = 'shop-sell-section shop-items';
        sellSection.style.display = 'grid';
        sellSection.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        sellSection.style.gap = '1rem';

        if (itemsToSell.length === 0) {
            const noItemsMsg = document.createElement('p');
            noItemsMsg.innerText = 'Nenhum item desta categoria no seu inventário.';
            noItemsMsg.style.gridColumn = '1 / -1';
            noItemsMsg.style.color = '#777';
            sellSection.appendChild(noItemsMsg);
        }

        itemsToSell.forEach(item => {
            const div = document.createElement('div');
            div.className = `shop-card rarity-${item.rarity}`;

            const sellPrice = item.sellValue || Math.floor((item.gold || item.value || 10) / 2) || 5;

            let desc = `<strong>${item.name}</strong><br>`;
            desc += this.getItemDescription(item);
            desc += `<hr style="margin: 0.5rem 0; border-color: var(--border-color);">`;
            desc += `Venda: <strong>${sellPrice} Ouro</strong>${item.count > 1 ? ' (cada)' : ''}<br><br>`;
            
            div.innerHTML = desc;

            const btnSell = document.createElement('button');
            btnSell.innerText = 'Vender 1';
            btnSell.onclick = () => {
                const removedItem = window.gameInventory.removeItem(item.instanceId, 1);
                if (removedItem) {
                    window.gameParty[0].gainGold(sellPrice);
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
                        window.gameParty[0].gainGold(totalGold);
                        Engine.emit('systemLog', `Você vendeu ${totalSells}x ${item.name} por ${totalGold} Ouro.`);
                    }
                };
                div.appendChild(btnSellAll);
            }

            sellSection.appendChild(div);
        });
        
        this.elShopList.appendChild(sellSection);
    }

handleMapEvent(ev) {
        let msg = `${ev.title}\n\n${ev.desc}\n`;
        if (ev.gold > 0) { msg += `\n💰 +${ev.gold} Ouro`; window.gameParty[0].gainGold(ev.gold); }
        if (ev.hp > 0) { 
            msg += `\n❤️ +${ev.hp} HP`; 
            window.gameParty.forEach(p => p.heal(ev.hp)); 
        }
        if (ev.hp < 0) { 
            const dmg = Math.abs(ev.hp); 
            msg += `\n🩸 -${dmg} HP (Todos os Membros)`; 
            window.gameParty.forEach(p => {
                p.hp -= dmg; 
                if(p.hp <= 0) p.hp = 1;
            });
        }
        alert(msg);
        
        if (ev.isCampaign) {
            window.MapSystem.progress[ev.regionId]++;
            const regionData = window.MapSystem.getRegionDetails(ev.regionId);
            const isLastBattle = ev.battleIndex === (regionData.encounters.length - 1);
            const isCompleted = window.MapSystem.progress[ev.regionId] >= regionData.encounters.length;
            
            if (regionData && (isLastBattle || isCompleted)) {
                if (regionData.next && !window.MapSystem.unlockedRegions.includes(regionData.next)) {
                    window.MapSystem.unlockedRegions.push(regionData.next);
                    Engine.emit('systemLog', `Nova região desbloqueada: ${window.MapSystem.getRegionDetails(regionData.next).name}!`);
                }
            }
            Engine.emit('regionProgressUpdated', ev.regionId);
        }
        Engine.emit('playerUpdated', window.gamePlayer);
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
                        if (event && event.type === 'event') {
                            this.handleMapEvent(event.data);
                            return; // Para aqui, foi um evento e não combate!
                        }
                        if (!event || event.type !== 'combat') return;
                        
                        // Lógica de simulação ou iniciar combate (mantém o que você já tinha)
                        // Para o mapa Bônus:
                        if (loc.isBonus) {
                            const monsters = event.data;
                            const winChance = window.gameCombat.estimateWinChance(monsters);
                            if (confirm(`Estimativa: ${winChance}%\nDeseja iniciar Batalha Automática?`)) {
                                window.gameCombat.autoResolveCombat(monsters);
                            }
                        } else {
                            window.gameCombat.startCombat(event.data);
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