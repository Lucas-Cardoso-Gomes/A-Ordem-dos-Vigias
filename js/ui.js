/**
 * ui.js
 * Handles DOM manipulation, 3D showcases, audio/relic HUD, modals, and UI rendering based on engine events.
 */

class UIManager {
    constructor() {
        this.selectedPartyIndex = 0;
        this.heroShowcase = null;
        this.worldExplorer3D = null;
        this.victoryDiorama = null;
        this.bestiaryPreview = null;
        this.useMap3D = false;
        this.userToggledMap3D = false;

        this.cacheDOM();
        this.bindEvents();
        this.setupNavigation();

        if (window.CombatUIManager) {
            this.combatUI = new window.CombatUIManager(this);
        }

        this.renderShop();
        this.renderRelicsHUD();
        this.syncAudioUI();
        this.refreshTitleOverlay();

        // Subscribe to engine events
        Engine.on('partyUpdated', party => {
            if (this.selectedPartyIndex >= party.length) {
                this.selectedPartyIndex = Math.max(0, party.length - 1);
            }
            this.renderPartySelectors(party);
            this.renderAllPlayers();
            this.syncHeroShowcase();
        });

        Engine.on('playerUpdated', p => {
            if (window.gameParty && window.gameParty[this.selectedPartyIndex] === p) {
                this.renderPlayer(p);
            }
            if (window.gameParty && window.gameParty.includes(p)) {
                this.renderAllPlayers();
            }
            this.renderHeader();
            this.syncHeroShowcase();
        });

        Engine.on('inventoryUpdated', inv => {
            const currentFilter = this.currentInvFilter || 'all';
            this.renderInventory(inv, currentFilter);
            const shopScreen = document.getElementById('screen-shop');
            if (this.elShopList && shopScreen && !shopScreen.classList.contains('hidden')) {
                this.renderShop();
            }
            const craftScreen = document.getElementById('screen-crafting');
            if (this.elCraftingRecipes && craftScreen && !craftScreen.classList.contains('hidden')) {
                this.renderCrafting(inv, window.gameParty[0]);
            }
        });

        Engine.on('equipmentUpdated', eq => {
            if (window.gameParty[this.selectedPartyIndex] && window.gameParty[this.selectedPartyIndex].equipment === eq) {
                this.renderEquipment(eq);
            }
            this.syncHeroShowcase(true);
        });

        if (this.combatUI) {
            Engine.on('turnQueueUpdated', q => this.combatUI.renderTurnQueue(q));
            Engine.on('combatUpdated', c => this.combatUI.renderCombatStats(c));
            Engine.on('combatLog', log => this.combatUI.appendCombatLog(log));
            Engine.on('combatStarted', m => this.combatUI.showCombatScreen(m));
            Engine.on('combatEnded', v => this.combatUI.hideCombatScreen(v));
            Engine.on('combatAnimation', a => this.combatUI.playCombatAnimation(a));

            Engine.on('turnStarted', () => {
                if (this.combatUI.btnMove) this.combatUI.btnMove.disabled = false;
                if (this.combatUI.btnAttack) this.combatUI.btnAttack.disabled = false;
                if (this.combatUI.btnSkill) this.combatUI.btnSkill.disabled = false;
                if (this.combatUI.btnPotion) this.combatUI.btnPotion.disabled = false;
                if (this.combatUI.btnFlee) this.combatUI.btnFlee.disabled = false;
                if (this.combatUI.btnEndTurn) this.combatUI.btnEndTurn.disabled = false;
                this.combatUI.updateUltimateButton?.();
            });

            Engine.on('turnEnded', () => {
                if (this.combatUI.btnMove) this.combatUI.btnMove.disabled = true;
                if (this.combatUI.btnAttack) this.combatUI.btnAttack.disabled = true;
                if (this.combatUI.btnSkill) this.combatUI.btnSkill.disabled = true;
                if (this.combatUI.btnUltimate) this.combatUI.btnUltimate.disabled = true;
                if (this.combatUI.btnPotion) this.combatUI.btnPotion.disabled = true;
                if (this.combatUI.btnFlee) this.combatUI.btnFlee.disabled = true;
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

        Engine.on('audioSettingsChanged', settings => this.syncAudioUI(settings));
        Engine.on('relicGranted', () => {
            this.renderRelicsHUD();
            this.renderOrderStats();
        });
        Engine.on('mechanicsUpdated', () => {
            this.renderRelicsHUD();
            this.renderOrderStats();
            this.renderHeader();
        });
        Engine.on('mapChanged', () => {
            this.updateMapControls();
            if (this.useMap3D && this.worldExplorer3D) {
                this.worldExplorer3D.syncFromTileMap?.();
            }
        });
        Engine.on('campaignVictory', data => this.showVictoryModal(data));
    }

    cacheDOM() {
        // Title Overlay
        this.elTitleOverlay = document.getElementById('title-overlay');
        this.btnTitleContinue = document.getElementById('btn-title-continue');
        this.btnTitleNew = document.getElementById('btn-title-new');

        // Headers
        this.elHeaderLevel = document.getElementById('header-level');
        this.elHeaderHp = document.getElementById('header-hp');
        this.elHeaderMana = document.getElementById('header-mana');
        this.elHeaderGold = document.getElementById('header-gold');
        this.elHeaderNgPlus = document.getElementById('header-ngplus');
        this.elHeaderRelics = document.getElementById('header-relics');
        this.btnAudioMute = document.getElementById('btn-audio-mute');

        // Character & Showcase
        this.elInvPartySelector = document.getElementById('inv-party-selector');
        this.btnAddMember = document.getElementById('btn-add-member');
        this.btnRecruitPreset = document.getElementById('btn-recruit-preset');
        this.elHero3DShowcase = document.getElementById('hero-3d-showcase');
        this.elShowcaseHeroSelector = document.getElementById('showcase-hero-selector');
        this.showcaseAnimBtns = document.querySelectorAll('.showcase-anim-btn');

        // Preset Companion Modal
        this.elRecruitPresetModal = document.getElementById('recruit-preset-modal');
        this.elRecruitPresetList = document.getElementById('recruit-preset-list');
        this.btnCloseRecruitModal = document.getElementById('btn-close-recruit-modal');

        // Nav
        this.navButtons = document.querySelectorAll('.nav-btn');
        this.screens = document.querySelectorAll('.screen');

        // Inventory
        this.elInvCount = document.getElementById('inv-count');
        this.elInvCapacity = document.getElementById('inv-capacity');
        this.elInvList = document.getElementById('inventory-list');
        this.invTabBtns = document.querySelectorAll('.inv-tab-btn');
        this.elInvActionPanel = document.getElementById('inventory-action-panel');
        this.elActionPanelName = document.getElementById('action-panel-name');
        this.elActionPanelDesc = document.getElementById('action-panel-desc');
        this.btnEquipItem = document.getElementById('btn-equip-item');
        this.btnEquipItemMain = document.getElementById('btn-equip-item-main');
        this.btnEquipItemOff = document.getElementById('btn-equip-item-off');
        this.btnUseItem = document.getElementById('btn-use-item');
        this.eqSlots = document.querySelectorAll('.eq-slot');

        // Map & World
        this.mapLocations = document.querySelectorAll('.map-location');
        this.elLocDetails = document.getElementById('location-details');
        this.elLocName = document.getElementById('loc-name');
        this.btnExplore = document.getElementById('btn-explore');
        this.btnInfiniteMode = document.getElementById('btn-infinite-mode');
        this.btnToggleMap3D = document.getElementById('btn-toggle-map-3d');
        this.btnCampQuick = document.getElementById('btn-camp-quick');
        this.elWorldCanvas = document.getElementById('world-canvas');
        this.elWorld3DContainer = document.getElementById('world-3d-container');
        this.mapTabBtns = document.querySelectorAll('.map-tab-btn');
        this.btnWorldRest = document.getElementById('btn-world-rest');

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
        this.elBestiaryCount = document.getElementById('bestiary-count');
        this.elBestiaryDetails = document.getElementById('bestiary-details');
        this.elBestiary3DPreview = document.getElementById('bestiary-3d-preview');
        this.elBestName = document.getElementById('best-name');
        this.elBestHabitat = document.getElementById('best-habitat');
        this.elBestDesc = document.getElementById('best-desc');
        this.elBestWeak = document.getElementById('best-weak');
        this.elBestResist = document.getElementById('best-resist');
        this.elBestLoot = document.getElementById('best-loot');
        this.btnCloseBestiary = document.getElementById('btn-close-bestiary');

        // Tooltip
        this.tooltip = document.getElementById('item-tooltip');

        // Settings & Audio Mixer & Stats
        this.btnSave = document.getElementById('btn-save');
        this.btnLoad = document.getElementById('btn-load');
        this.btnReset = document.getElementById('btn-reset');
        this.btnExportSave = document.getElementById('btn-export-save');
        this.btnImportSave = document.getElementById('btn-import-save');
        this.btnCopySave = document.getElementById('btn-copy-save');
        this.elSaveDataTextarea = document.getElementById('save-data-textarea');

        this.sliderMasterVol = document.getElementById('audio-master-vol');
        this.elMasterVal = document.getElementById('audio-master-val');
        this.sliderSfxVol = document.getElementById('audio-sfx-vol');
        this.elSfxVal = document.getElementById('audio-sfx-val');
        this.sliderMusicVol = document.getElementById('audio-music-vol');
        this.elMusicVal = document.getElementById('audio-music-val');
        this.btnSettingsMute = document.getElementById('btn-settings-mute');
        this.btnTestSfx = document.getElementById('btn-test-sfx');
        this.elOrderStatsPanel = document.getElementById('order-stats-panel');
        this.btnStartNgPlus = document.getElementById('btn-start-ng-plus');

        // Victory Modal
        this.elVictoryModal = document.getElementById('victory-modal');
        this.elVictoryDiorama = document.getElementById('victory-3d-diorama');
        this.elVictoryRelics = document.getElementById('victory-relics');
        this.elVictoryStats = document.getElementById('victory-stats');
        this.btnVictoryContinue = document.getElementById('btn-victory-continue');
        this.btnVictoryInfinite = document.getElementById('btn-victory-infinite');
        this.btnVictoryNgPlus = document.getElementById('btn-victory-ngplus');

        this.renderMap();
    }

    bindEvents() {
        // Title Overlay Buttons
        if (this.btnTitleContinue) {
            this.btnTitleContinue.addEventListener('click', () => {
                window.gameAudio?.unlock?.();
                window.gameAudio?.play?.('click');
                const mapId = window.gameTileMap?.currentMapId || 'floresta';
                window.gameAudio?.playMusic?.(mapId);
                this.dismissTitleOverlay();
            });
        }

        if (this.btnTitleNew) {
            this.btnTitleNew.addEventListener('click', () => {
                window.gameAudio?.unlock?.();
                window.gameAudio?.play?.('click');
                const hasSave = Boolean(Engine.loadGame());
                if (hasSave && !confirm('Já existe uma jornada salva. Deseja apagar o progresso anterior e iniciar uma Nova Aventura?')) {
                    return;
                }
                if (hasSave) {
                    Engine.clearSave();
                    window.GameMechanics?.reset?.();
                    if (window.game) {
                        window.game.party = [new Player()];
                        window.game.inventory = new Inventory();
                        window.game.combat.party = window.game.party;
                        window.game.combat.inventory = window.game.inventory;
                        window.game.quests = new QuestSystem(window.game.party[0]);
                        window.gameParty = window.game.party;
                        window.gamePlayer = window.game.party[0];
                        window.gameInventory = window.game.inventory;
                        window.gameQuests = window.game.quests;
                        window.game.inventory.addItem(ItemDatabase.generateItem(1, 'comum'));
                        window.game.inventory.addItem(ItemDatabase.getPotion('p1'));
                        window.game.quests.load(null);
                        MapSystem.progress = {};
                        MapSystem.unlockedRegions = ['floresta', 'helgen'];
                        this.selectedPartyIndex = 0;
                        this.shopItems = null;
                        if (window.gameTileMap) {
                            window.gameTileMap.revealedByMap = {};
                            window.gameTileMap.enemiesByMap = {};
                            window.gameTileMap.openedChests?.clear?.();
                            window.gameTileMap.usedShrines?.clear?.();
                            window.gameTileMap.quickRestsRemaining = 2;
                            window.gameTileMap.switchMap('floresta', null, null, true);
                        }
                        Engine.emit('partyUpdated', window.game.party);
                        Engine.emit('playerUpdated', window.game.party[0]);
                        Engine.emit('inventoryUpdated', window.game.inventory);
                        Engine.emit('equipmentUpdated', window.game.party[0].equipment);
                        Engine.emit('questsUpdated', window.game.quests);
                        Engine.emit('mechanicsUpdated');
                    }
                }
                const mapId = window.gameTileMap?.currentMapId || 'floresta';
                window.gameAudio?.playMusic?.(mapId);
                this.dismissTitleOverlay();
            });
        }

        // Audio Mute Quick Control & Settings Mixer
        const handleToggleMute = () => {
            window.gameAudio?.unlock?.();
            window.gameAudio?.toggleMute?.();
            this.syncAudioUI();
        };
        if (this.btnAudioMute) this.btnAudioMute.addEventListener('click', handleToggleMute);
        if (this.btnSettingsMute) this.btnSettingsMute.addEventListener('click', handleToggleMute);

        if (this.sliderMasterVol) {
            this.sliderMasterVol.addEventListener('input', (e) => {
                window.gameAudio?.unlock?.();
                const v = Number(e.target.value) / 100;
                window.gameAudio?.setMasterVolume?.(v);
                if (this.elMasterVal) this.elMasterVal.textContent = `${e.target.value}%`;
            });
        }
        if (this.sliderSfxVol) {
            this.sliderSfxVol.addEventListener('input', (e) => {
                window.gameAudio?.unlock?.();
                const v = Number(e.target.value) / 100;
                window.gameAudio?.setSfxVolume?.(v);
                if (this.elSfxVal) this.elSfxVal.textContent = `${e.target.value}%`;
            });
        }
        if (this.sliderMusicVol) {
            this.sliderMusicVol.addEventListener('input', (e) => {
                window.gameAudio?.unlock?.();
                const v = Number(e.target.value) / 100;
                window.gameAudio?.setMusicVolume?.(v);
                if (this.elMusicVal) this.elMusicVal.textContent = `${e.target.value}%`;
            });
        }
        if (this.btnTestSfx) {
            this.btnTestSfx.addEventListener('click', () => {
                window.gameAudio?.unlock?.();
                window.gameAudio?.play?.('relic');
            });
        }

        // Showcase Animation Preview Buttons
        this.showcaseAnimBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const anim = btn.getAttribute('data-anim') || 'idle';
                this.showcaseAnimBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.gameAudio?.play?.('click');
                this.heroShowcase?.triggerAction?.(this.selectedPartyIndex, anim);
            });
        });

        // Add Custom Member
        if (this.btnAddMember) {
            this.btnAddMember.addEventListener('click', () => {
                const name = prompt('Nome do novo membro:');
                if (name && name.trim()) {
                    window.game.addPartyMember(name.trim());
                }
            });
        }

        // Recruit Preset Companion Modal
        if (this.btnRecruitPreset) {
            this.btnRecruitPreset.addEventListener('click', () => this.openRecruitModal());
        }
        if (this.btnCloseRecruitModal) {
            this.btnCloseRecruitModal.addEventListener('click', () => this.closeRecruitModal());
        }
        if (this.elRecruitPresetModal) {
            this.elRecruitPresetModal.addEventListener('click', (e) => {
                if (e.target === this.elRecruitPresetModal) this.closeRecruitModal();
            });
        }

        if (this.elInvPartySelector) {
            this.elInvPartySelector.addEventListener('change', (e) => {
                this.selectedPartyIndex = parseInt(e.target.value, 10) || 0;
                const hero = window.gameParty[this.selectedPartyIndex];
                if (hero) {
                    this.renderPlayer(hero);
                    this.renderEquipment(hero.equipment);
                    this.syncHeroShowcase();
                }
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
                    if (item && item.type === 'potion' && item.count > 1) {
                        const qtyStr = prompt(`Quantas poções de ${item.name} deseja tomar de uma vez? (No Inventário: ${item.count})`, '1');
                        const qty = parseInt(qtyStr, 10);
                        if (!isNaN(qty) && qty > 0) {
                            const toUse = Math.min(qty, item.count);
                            let usedCount = 0;
                            for (let i = 0; i < toUse; i++) {
                                if (!window.gameInventory.useItem(this.selectedItemInstanceId, this.selectedPartyIndex)) break;
                                usedCount++;
                            }
                            if (usedCount > 0) {
                                this.showToast(`Você consumiu ${usedCount}x ${item.name}!`);
                            }
                        }
                    } else {
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
            slot.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    slot.click();
                }
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
                this.selectedLocId = locId;
                this.renderRegionDetails(locId);
            });
        });

        // Map 3D Toggle & Camp Quick Button & Infinite Mode
        if (this.btnToggleMap3D) {
            this.btnToggleMap3D.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.userToggledMap3D = true;
                this.useMap3D = !this.useMap3D;
                this.applyMapViewMode();
            });
        }

        if (this.btnCampQuick) {
            this.btnCampQuick.addEventListener('click', () => {
                window.gameAudio?.play?.('camp');
                if (window.gameTileMap) {
                    if (typeof window.gameTileMap.restAtCamp === 'function') {
                        window.gameTileMap.restAtCamp();
                    } else {
                        window.gameTileMap.showCampDialog?.();
                    }
                }
            });
        }

        if (this.btnInfiniteMode) {
            this.btnInfiniteMode.addEventListener('click', () => {
                if (window.gameCombat) {
                    window.gameCombat.startInfiniteMode();
                    this.switchScreen('screen-combat');
                }
            });
        }

        // Settings & Save/Load/NG+
        if (this.btnSave) this.btnSave.addEventListener('click', () => window.game.save());
        if (this.btnLoad) {
            this.btnLoad.addEventListener('click', () => {
                window.game.load();
                this.renderRelicsHUD();
                this.renderOrderStats();
                this.showToast('Jogo Carregado.');
            });
        }
        if (this.btnReset) {
            this.btnReset.addEventListener('click', () => {
                if (confirm('Tem certeza? Isso apagará todo o seu progresso.')) {
                    Engine.clearSave();
                    window.GameMechanics?.reset?.();
                    location.reload();
                }
            });
        }

        if (this.btnStartNgPlus) {
            this.btnStartNgPlus.addEventListener('click', () => this.triggerNewGamePlus());
        }

        if (this.btnCloseBestiary) {
            this.btnCloseBestiary.addEventListener('click', () => {
                this.disposeBestiaryPreview();
                this.elBestiaryDetails.classList.add('hidden');
                this.elBestiaryList.classList.remove('hidden');
            });
        }

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
                        this.renderRelicsHUD();
                        this.renderOrderStats();
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
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(this.elSaveDataTextarea.value).catch(() => document.execCommand('copy'));
                } else {
                    document.execCommand('copy');
                }
                this.showToast('Save copiado para a área de transferência.');
            });
        }

        if (this.mapTabBtns) {
            this.mapTabBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const mapId = e.currentTarget.getAttribute('data-map');
                    if (window.gameTileMap) {
                        window.gameTileMap.switchMap(mapId);
                    }
                });
            });
        }

        if (this.btnWorldRest) {
            this.btnWorldRest.addEventListener('click', () => {
                if (window.gameTileMap) {
                    window.gameTileMap.restAtCamp();
                }
            });
        }

        // Victory Modal Actions
        if (this.btnVictoryContinue) {
            this.btnVictoryContinue.addEventListener('click', () => {
                this.closeVictoryModal();
                const mapId = window.gameTileMap?.currentMapId || 'abismo';
                window.gameAudio?.playMusic?.(mapId);
            });
        }
        if (this.btnVictoryInfinite) {
            this.btnVictoryInfinite.addEventListener('click', () => {
                this.closeVictoryModal();
                if (window.gameCombat) {
                    window.gameCombat.startInfiniteMode();
                    this.switchScreen('screen-combat');
                }
            });
        }
        if (this.btnVictoryNgPlus) {
            this.btnVictoryNgPlus.addEventListener('click', () => {
                this.closeVictoryModal();
                this.triggerNewGamePlus();
            });
        }

        window.addEventListener('resize', () => {
            if (document.getElementById('screen-character')?.classList.contains('active')) {
                this.heroShowcase?.resize?.();
            }
            if (document.getElementById('screen-map')?.classList.contains('active') && this.useMap3D) {
                this.worldExplorer3D?.resize?.();
            }
        });
    }

    isWebGLReady() {
        return Boolean(window.Scene3D && typeof window.Scene3D.isWebGLAvailable === 'function' && window.Scene3D.isWebGLAvailable());
    }

    refreshTitleOverlay() {
        if (!this.btnTitleContinue) return;
        const hasSave = Boolean(Engine.loadGame());
        this.btnTitleContinue.classList.toggle('hidden', !hasSave);
    }

    dismissTitleOverlay() {
        if (!this.elTitleOverlay) return;
        this.elTitleOverlay.classList.add('hidden');
        this.syncHeroShowcase();
    }

    switchScreen(target) {
        this.navButtons.forEach(b => b.classList.remove('active'));
        this.screens.forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });

        const navBtn = Array.from(this.navButtons).find(b => b.getAttribute('data-target') === target);
        if (navBtn) navBtn.classList.add('active');

        const targetScreen = document.getElementById(target);
        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('active');
        }
    }

    setupNavigation() {
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-target');

                if (window.gameCombat && window.gameCombat.inCombat && target !== 'screen-combat') {
                    this.showToast('Você não pode sair enquanto estiver em combate!');
                    return;
                }

                if (target === 'screen-shop' || target === 'screen-crafting') {
                    const currentMap = window.gameTileMap ? window.gameTileMap.currentMapId : 'floresta';
                    if (currentMap !== 'floresta') {
                        this.showToast('🔒 A Loja e a Forja só estão disponíveis na Base (Cidade na Floresta)! Caminhe de volta até a base para acessá-las.');
                        return;
                    }
                }

                window.gameAudio?.play?.('click');
                this.switchScreen(target);

                if (target !== 'screen-map' && this.worldExplorer3D) {
                    this.worldExplorer3D.setVisible?.(false);
                }
                if (target !== 'screen-bestiary') {
                    this.disposeBestiaryPreview();
                }

                if (target === 'screen-character') {
                    this.syncHeroShowcase();
                }
                if (target === 'screen-shop') {
                    this.renderShop();
                }
                if (target === 'screen-crafting') {
                    this.renderCrafting(window.gameInventory, window.gameParty[0]);
                }
                if (target === 'screen-settings') {
                    this.syncAudioUI();
                    this.renderOrderStats();
                }
                if (target === 'screen-map' && window.gameTileMap) {
                    if (!this.userToggledMap3D) {
                        this.useMap3D = this.isWebGLReady();
                    }
                    this.updateMapControls();
                    window.gameTileMap.onShow();
                    if (typeof requestAnimationFrame !== 'undefined') {
                        requestAnimationFrame(() => this.applyMapViewMode());
                    } else {
                        this.applyMapViewMode();
                    }
                }
            });
        });
    }

    // =========================================================
    // Audio & Relics & Order Stats HUD
    // =========================================================
    syncAudioUI(settingsArg = null) {
        const s = settingsArg || window.gameAudio?.getSettings?.() || {
            muted: false,
            masterVolume: 0.8,
            sfxVolume: 0.8,
            musicVolume: 0.6
        };

        if (this.btnAudioMute) {
            this.btnAudioMute.textContent = s.muted ? '🔇 Mudo' : '🔊 Som';
        }
        if (this.btnSettingsMute) {
            this.btnSettingsMute.textContent = s.muted ? '🔊 Ativar Áudio' : '🔇 Silenciar Tudo';
        }
        const mPct = Math.round((s.masterVolume ?? 0.8) * 100);
        const sPct = Math.round((s.sfxVolume ?? 0.8) * 100);
        const bgmPct = Math.round((s.musicVolume ?? 0.6) * 100);

        if (this.sliderMasterVol) this.sliderMasterVol.value = mPct;
        if (this.elMasterVal) this.elMasterVal.textContent = `${mPct}%`;
        if (this.sliderSfxVol) this.sliderSfxVol.value = sPct;
        if (this.elSfxVal) this.elSfxVal.textContent = `${sPct}%`;
        if (this.sliderMusicVol) this.sliderMusicVol.value = bgmPct;
        if (this.elMusicVal) this.elMusicVal.textContent = `${bgmPct}%`;
    }

    getRelicsList() {
        const raw = window.GameMechanics?.RELICS;
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') return Object.values(raw);
        return [
            { id: 'relic_floresta', name: 'Selo da Folha Eterna', icon: '🌿', desc: '+15% HP Máximo' },
            { id: 'relic_caverna', name: 'Olho das Sombras', icon: '👁️', desc: '+2 Visão na névoa, +10% AGI' },
            { id: 'relic_ruinas', name: 'Coroa dos Ancestrais', icon: '👑', desc: '+20% XP, +10% Crítico' },
            { id: 'relic_vulcao', name: 'Coração de Magma', icon: '🔥', desc: '+15% Dano, Imunidade a Queimadura' },
            { id: 'relic_abismo', name: 'Fragmento do Vazio', icon: '🌌', desc: '+25% Atributos, conclui campanha' }
        ];
    }

    renderRelicsHUD() {
        if (!this.elHeaderRelics) return;
        const relics = this.getRelicsList();
        const fallbackIcons = {
            relic_floresta: '🌿',
            relic_caverna: '👁️',
            relic_ruinas: '👑',
            relic_vulcao: '🔥',
            relic_abismo: '🌌'
        };

        this.elHeaderRelics.innerHTML = relics.map(r => {
            const owned = Boolean(window.GameMechanics?.hasRelic?.(r.id));
            const icon = r.icon || fallbackIcons[r.id] || '💎';
            const bonusText = r.bonusDesc || r.desc || '';
            const title = owned ? `✅ ${r.name}: ${bonusText}` : `🔒 ${r.name} (Não obtida)`;
            return `<span class="relic-slot ${owned ? 'collected' : ''}" title="${title}">${icon}</span>`;
        }).join('');
    }

    renderOrderStats() {
        if (!this.elOrderStatsPanel) return;
        const mech = window.GameMechanics;
        const state = mech?.state || {};
        const stats = state.stats || {};
        const ngPlus = state.ngPlusLevel || 0;
        const relicsCount = this.getRelicsList().filter(r => mech?.hasRelic?.(r.id)).length;

        const items = [
            { label: 'Abates Totais', value: stats.kills || 0 },
            { label: 'Chefes Derrotados', value: stats.bossesDefeated || 0 },
            { label: 'Dano Total', value: stats.damageDealt || 0 },
            { label: 'Cura Realizada', value: stats.healingDone || 0 },
            { label: 'Combos Elementais', value: stats.elementalCombos || 0 },
            { label: 'Supremos Usados', value: stats.ultimatesUsed || 0 },
            { label: 'Baús & Santuários', value: (stats.chestsOpened || state.openedChests?.length || 0) + (stats.shrinesUsed || state.usedShrines?.length || 0) },
            { label: 'Itens Forjados', value: stats.itemsCrafted || 0 },
            { label: 'Relíquias / NG+', value: `${relicsCount}/5 · NG+${ngPlus}` }
        ];

        this.elOrderStatsPanel.innerHTML = items.map(it => `
            <div class="order-stat-box">
                <span>${it.label}</span>
                <strong>${it.value}</strong>
            </div>
        `).join('');

        if (this.btnStartNgPlus) {
            const canNgPlus = Boolean(state.campaignCompleted || mech?.hasRelic?.('relic_abismo'));
            this.btnStartNgPlus.classList.toggle('hidden', !canNgPlus);
        }
    }

    // =========================================================
    // World Map 3D & Camp Controls
    // =========================================================
    updateMapControls() {
        const tm = window.gameTileMap;
        if (this.btnCampQuick) {
            const inFloresta = !tm || tm.currentMapId === 'floresta';
            this.btnCampQuick.classList.toggle('hidden', !inFloresta);
        }
    }

    initWorld3D() {
        if (!this.isWebGLReady() || !this.elWorld3DContainer || !window.gameTileMap) return false;
        if (!this.worldExplorer3D) {
            this.worldExplorer3D = new window.Scene3D.WorldExplorer(this.elWorld3DContainer, window.gameTileMap);
            window.gameTileMap.explorer3D = this.worldExplorer3D;
        }
        return true;
    }

    applyMapViewMode() {
        const webglAvailable = this.isWebGLReady();
        if (!webglAvailable) {
            this.useMap3D = false;
        }

        if (this.btnToggleMap3D) {
            if (!webglAvailable) {
                this.btnToggleMap3D.disabled = true;
                this.btnToggleMap3D.textContent = '🗺️ Mapa 2D';
            } else {
                this.btnToggleMap3D.disabled = false;
                this.btnToggleMap3D.textContent = this.useMap3D ? '🗺️ Mudar para 2D' : '🎲 Mudar para 3D';
            }
        }

        if (this.useMap3D && this.initWorld3D()) {
            this.elWorld3DContainer?.classList.remove('hidden');
            if (this.elWorldCanvas) this.elWorldCanvas.style.display = 'none';
            this.worldExplorer3D.setVisible?.(true);
            this.worldExplorer3D.resize?.();
            this.worldExplorer3D.syncFromTileMap?.();
        } else {
            this.elWorld3DContainer?.classList.add('hidden');
            if (this.elWorldCanvas) this.elWorldCanvas.style.display = 'block';
            this.worldExplorer3D?.setVisible?.(false);
            window.gameTileMap?.onShow?.();
        }
    }

    // =========================================================
    // 3D Hero Showcase & Preset Companions
    // =========================================================
    renderShowcaseSelector() {
        if (!this.elShowcaseHeroSelector || !window.gameParty) return;
        this.elShowcaseHeroSelector.innerHTML = '';

        window.gameParty.forEach((p, idx) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `showcase-hero-btn ${idx === this.selectedPartyIndex ? 'active' : ''}`;
            const emoji = this.combatUI?.getEmojiForClass?.(p.playerClass) || '🧍';
            btn.textContent = `${emoji} ${p.name}`;
            btn.addEventListener('click', () => {
                this.selectedPartyIndex = idx;
                if (this.elInvPartySelector) this.elInvPartySelector.value = String(idx);
                this.renderEquipment(p.equipment);
                this.renderAllPlayers();
                this.syncHeroShowcase();
            });
            this.elShowcaseHeroSelector.appendChild(btn);
        });
    }

    syncHeroShowcase(playFlourish = false) {
        this.renderShowcaseSelector();
        if (!this.elHero3DShowcase || !window.gameParty) return;

        const charScreen = document.getElementById('screen-character');
        if (charScreen && !charScreen.classList.contains('active')) return;

        if (!this.isWebGLReady()) {
            const active = window.gameParty[this.selectedPartyIndex] || window.gameParty[0];
            const emoji = this.combatUI?.getEmojiForClass?.(active?.playerClass) || '🧍';
            this.elHero3DShowcase.innerHTML = `
                <div class="viewport-fallback">
                    <div>
                        <div style="font-size:3rem; margin-bottom:0.4rem;">${emoji}</div>
                        <strong style="color:var(--accent-gold);">${active?.name || 'Herói'}</strong> — ${active?.playerClass || 'Nenhuma'}<br>
                        <small>Visualizador 2D ativo (WebGL indisponível neste dispositivo)</small>
                    </div>
                </div>
            `;
            return;
        }

        if (!this.heroShowcase) {
            this.elHero3DShowcase.innerHTML = '';
            this.heroShowcase = new window.Scene3D.HeroShowcase(this.elHero3DShowcase);
        }

        this.heroShowcase.resize?.();
        this.heroShowcase.setParty?.(window.gameParty, this.selectedPartyIndex);
        if (playFlourish) {
            this.heroShowcase.triggerAction?.(this.selectedPartyIndex, 'celebrate');
        }
    }

    getPresetCompanionsList() {
        const raw = window.GameMechanics?.PRESET_COMPANIONS;
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') return Object.values(raw);
        return [];
    }

    openRecruitModal() {
        if (!this.elRecruitPresetModal || !this.elRecruitPresetList) return;
        const companions = this.getPresetCompanionsList();
        this.elRecruitPresetList.innerHTML = '';

        if (companions.length === 0) {
            this.elRecruitPresetList.innerHTML = '<p style="color:var(--text-muted);">Nenhum companheiro icônico disponível.</p>';
        } else {
            const party = window.gameParty || [];
            const partyFull = party.length >= 4;

            companions.forEach(comp => {
                const compClass = comp.playerClass || comp.class || 'Guerreiro';
                const alreadyInParty = party.some(p => p.name.toLowerCase() === (comp.name || '').toLowerCase());
                const emoji = this.combatUI?.getEmojiForClass?.(compClass) || '⚔️';

                const starterNames = comp.starterEquipment
                    ? Object.values(comp.starterEquipment).filter(Boolean).map(it => it.name || it).join(', ')
                    : '';
                const gearLine = starterNames ? `<div style="font-size:0.76rem; color:var(--accent-gold); margin-bottom:0.25rem;">⚔️ ${starterNames}</div>` : '';

                const card = document.createElement('div');
                card.className = 'recruit-preset-card';
                card.innerHTML = `
                    <h4>${emoji} ${comp.name} <small style="color:var(--text-muted);">(${compClass})</small></h4>
                    <div style="font-size:0.8rem; color:var(--rarity-uncommon);">${comp.roleTitle || comp.title || 'Vigia da Ordem'}</div>
                    <p style="font-size:0.85rem; color:#cbd5e1; flex:1;">${comp.lore || comp.desc || ''}</p>
                    ${gearLine}
                `;

                const btn = document.createElement('button');
                btn.className = 'btn-ornate btn-gold';
                if (alreadyInParty) {
                    btn.textContent = 'Já no Grupo';
                    btn.disabled = true;
                } else if (partyFull) {
                    btn.textContent = 'Grupo Cheio (4/4)';
                    btn.disabled = true;
                } else {
                    btn.textContent = `Recrutar ${comp.name}`;
                    btn.addEventListener('click', () => {
                        this.recruitPresetCompanion(comp);
                    });
                }
                card.appendChild(btn);
                this.elRecruitPresetList.appendChild(card);
            });
        }

        this.elRecruitPresetModal.classList.remove('hidden');
    }

    closeRecruitModal() {
        this.elRecruitPresetModal?.classList.add('hidden');
    }

    recruitPresetCompanion(comp) {
        if (!window.gameParty || window.gameParty.length >= 4) {
            this.showToast('O grupo já possui o máximo de 4 membros.');
            return false;
        }
        if (window.gameParty.some(p => p.name.toLowerCase() === (comp.name || '').toLowerCase())) {
            this.showToast(`${comp.name} já faz parte do grupo!`);
            return false;
        }

        const member = new Player();
        member.name = comp.name;
        member.level = Math.max(1, comp.level || 1);
        member.roleTitle = comp.roleTitle || comp.title || '';
        if (comp.attributes) {
            member.attributes = { ...member.attributes, ...comp.attributes };
        }
        const compClass = comp.playerClass || comp.class;
        if (compClass && compClass !== 'Nenhuma') {
            member.setClass(compClass);
        }

        // Equip starter gear if provided cleanly
        const starterGear = comp.equipment || comp.starterEquipment;
        if (starterGear && typeof starterGear === 'object') {
            Object.entries(starterGear).forEach(([slot, itemOrId]) => {
                if (!itemOrId) return;
                if (typeof itemOrId === 'string' && window.ItemDatabase) {
                    const base = ItemDatabase.weaponBases.find(b => b.id === itemOrId)
                        || ItemDatabase.armorBases.find(b => b.id === itemOrId)
                        || ItemDatabase.accessories.find(b => b.id === itemOrId);
                    if (base) {
                        member.equipment[slot] = {
                            ...base,
                            instanceId: `preset_${comp.id || comp.name}_${slot}_${Date.now()}`,
                            rarity: 'incomum'
                        };
                    }
                } else if (typeof itemOrId === 'object') {
                    member.equipment[slot] = {
                        ...itemOrId,
                        instanceId: itemOrId.instanceId || `preset_${comp.id || comp.name}_${slot}_${Date.now()}`
                    };
                }
            });
        }

        member.hp = member.getMaxHp();
        member.mana = member.getMaxMana();

        window.gameParty.push(member);
        this.selectedPartyIndex = window.gameParty.length - 1;

        window.gameAudio?.play?.('quest');
        Engine.emit('partyUpdated', window.gameParty);
        Engine.emit('playerUpdated', member);
        Engine.emit('systemLog', `⭐ ${member.name} (${member.playerClass}) juntou-se à Ordem dos Vigias!`);

        this.closeRecruitModal();
        this.heroShowcase?.triggerAction?.(this.selectedPartyIndex, 'celebrate');
        return true;
    }

    // =========================================================
    // Party, Header, Character Cards
    // =========================================================
    renderPartySelectors(party) {
        if (!this.elInvPartySelector) return;

        const optionsHTML = party.map((p, idx) => `<option value="${idx}">${p.name} (Nv. ${p.level})</option>`).join('');
        this.elInvPartySelector.innerHTML = optionsHTML;
        this.elInvPartySelector.value = String(Math.min(this.selectedPartyIndex, Math.max(0, party.length - 1)));

        const isFull = party.length >= 4;
        if (this.btnAddMember) {
            this.btnAddMember.style.display = isFull ? 'none' : 'inline-block';
        }
        if (this.btnRecruitPreset) {
            this.btnRecruitPreset.style.display = isFull ? 'none' : 'inline-block';
        }
    }

    renderHeader() {
        const party = window.gameParty;
        if (!party || party.length === 0) return;

        const avgLevel = Math.floor(party.reduce((sum, p) => sum + p.level, 0) / party.length);
        const totalHp = party.reduce((sum, p) => sum + p.hp, 0);
        const maxHp = party.reduce((sum, p) => sum + p.getMaxHp(), 0);
        const totalMana = party.reduce((sum, p) => sum + p.mana, 0);
        const maxMana = party.reduce((sum, p) => sum + p.getMaxMana(), 0);

        if (this.elHeaderLevel) this.elHeaderLevel.textContent = `Nível Médio: ${avgLevel}`;
        if (this.elHeaderHp) this.elHeaderHp.textContent = `Grupo HP: ${totalHp}/${maxHp}`;
        if (this.elHeaderMana) this.elHeaderMana.textContent = `Grupo Mana: ${totalMana}/${maxMana}`;

        const totalGold = party[0].gold || 0;
        if (this.elHeaderGold) this.elHeaderGold.textContent = `Ouro: ${totalGold}`;

        const ngPlus = window.GameMechanics?.state?.ngPlusLevel || 0;
        if (this.elHeaderNgPlus) {
            if (ngPlus > 0) {
                this.elHeaderNgPlus.textContent = `NG+${ngPlus}`;
                this.elHeaderNgPlus.classList.remove('hidden');
            } else {
                this.elHeaderNgPlus.classList.add('hidden');
            }
        }
    }

    renderPlayer(p) {
        this.renderBestiary();
        this.renderHeader();
        this.renderAllPlayers();
    }

    renderAllPlayers() {
        const container = document.getElementById('character-list');
        if (!container || !window.gameParty) return;
        container.innerHTML = '';

        window.gameParty.forEach((p, idx) => {
            const card = document.createElement('div');
            card.className = `character-card ${idx === this.selectedPartyIndex ? 'selected-hero' : ''}`;

            const removeBtnHtml = idx > 0
                ? `<button class="btn-remove-member danger" data-idx="${idx}" style="font-size: 0.72rem; padding: 0.2rem 0.45rem;">Remover</button>`
                : '';

            const emoji = this.combatUI?.getEmojiForClass?.(p.playerClass) || '🧑';
            const roleTag = p.roleTitle ? `<div style="font-size:0.75rem; color:var(--text-muted);">${p.roleTitle}</div>` : '';

            const titleHtml = `
                <div class="char-card-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); margin-bottom: 0.55rem; padding-bottom: 0.5rem; cursor:pointer;">
                    <div>
                        <h3 style="margin: 0;">${emoji} ${p.name}</h3>
                        ${roleTag}
                    </div>
                    <div style="display: flex; gap: 0.25rem;">
                        <button class="btn-rename" data-idx="${idx}" style="font-size: 0.72rem; padding: 0.2rem 0.45rem;">Renomear</button>
                        ${removeBtnHtml}
                    </div>
                </div>
            `;

            const attrRows = [
                { key: 'str', label: 'Força' },
                { key: 'agi', label: 'Agilidade' },
                { key: 'int', label: 'Inteligência' },
                { key: 'def', label: 'Defesa' },
                { key: 'luk', label: 'Sorte' }
            ].map(a => {
                const btn1 = p.statPoints > 0
                    ? `<button class="btn-add-attr" data-attr="${a.key}" data-idx="${idx}" title="Adicionar +1 ponto">+</button>`
                    : '';
                const btn5 = p.statPoints >= 5
                    ? `<button class="btn-add-attr-bulk" data-attr="${a.key}" data-idx="${idx}" data-amount="5" title="Adicionar +5 pontos">+5</button>`
                    : '';
                return `
                    <div style="display: flex; justify-content: space-between; align-items:center;">
                        <span>${a.label}: ${p.attributes[a.key]} <small style="color:var(--accent-gold);">(${p.getTotalAttr(a.key)})</small></span>
                        <span style="display:flex; gap:0.25rem;">${btn1}${btn5}</span>
                    </div>
                `;
            }).join('');

            const statsHtml = `
                <p style="margin: 0.15rem 0;"><strong>Nível:</strong> ${p.level}</p>
                <p style="margin: 0.15rem 0;"><strong>HP:</strong> ${p.hp} / ${p.getMaxHp()} &nbsp;|&nbsp; <strong>Mana:</strong> ${p.mana} / ${p.getMaxMana()}</p>
                <p style="margin: 0.15rem 0;"><strong>XP:</strong> ${p.xp} / ${p.getXpNeeded()}</p>
                <div class="class-container" style="margin: 0.5rem 0;">
                    <strong>Classe:</strong> <span class="class-label" style="color: ${p.playerClass !== 'Nenhuma' ? 'var(--accent-gold)' : 'inherit'};">${p.playerClass}</span>
                </div>
                <p style="margin: 0.5rem 0 0.25rem 0;"><strong>Atributos (Pontos: <span style="color:var(--accent-gold);">${p.statPoints}</span>)</strong></p>
                <div style="display: grid; gap: 0.3rem;">
                    ${attrRows}
                </div>
            `;

            card.innerHTML = titleHtml + statsHtml;

            const headerEl = card.querySelector('.char-card-header');
            headerEl?.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                this.selectedPartyIndex = idx;
                if (this.elInvPartySelector) this.elInvPartySelector.value = String(idx);
                this.renderEquipment(p.equipment);
                this.renderAllPlayers();
                this.syncHeroShowcase();
            });

            const btnRename = card.querySelector('.btn-rename');
            btnRename?.addEventListener('click', () => {
                const newName = prompt('Digite o novo nome:', p.name);
                if (newName && newName.trim().length > 0) {
                    p.name = newName.trim();
                    Engine.emit('partyUpdated', window.gameParty);
                    Engine.emit('playerUpdated', p);
                }
            });

            const btnRemove = card.querySelector('.btn-remove-member');
            btnRemove?.addEventListener('click', () => {
                if (confirm(`Tem certeza que deseja remover ${p.name} do grupo?`)) {
                    window.gameParty.splice(idx, 1);
                    Engine.emit('partyUpdated', window.gameParty);
                    Engine.emit('systemLog', `${p.name} deixou o grupo.`);
                }
            });

            card.querySelectorAll('.btn-add-attr').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const attr = e.currentTarget.getAttribute('data-attr');
                    p.addAttribute(attr);
                    window.gameAudio?.play?.('click');
                });
            });

            card.querySelectorAll('.btn-add-attr-bulk').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const attr = e.currentTarget.getAttribute('data-attr');
                    const amount = Math.min(parseInt(e.currentTarget.getAttribute('data-amount') || '5', 10), p.statPoints);
                    for (let i = 0; i < amount; i++) {
                        p.addAttribute(attr);
                    }
                    window.gameAudio?.play?.('click');
                });
            });

            // Level 1 Class Selection!
            if (p.level >= 1 && !p.classLocked) {
                const classCont = card.querySelector('.class-container');
                classCont.innerHTML = `<strong>Classe:</strong> <span class="class-label">${p.playerClass}</span> <small style="color:var(--rarity-uncommon);">(Escolha sua vocação!)</small><div class="class-picker-grid"></div>`;
                const btnArea = classCont.querySelector('.class-picker-grid');
                const classesDisponiveis = [
                    { id: 'Guerreiro', icon: '⚔️', tip: 'Dano físico bruto e combate corpo a corpo' },
                    { id: 'Caçador', icon: '🏹', tip: 'Ataques à distância, armadilhas e precisão' },
                    { id: 'Guardião', icon: '🛡️', tip: 'Tanque protetor com provocação e defesa' },
                    { id: 'Mago', icon: '🔮', tip: 'Magia elemental devastadora em área' },
                    { id: 'Clérigo', icon: '✨', tip: 'Cura, suporte e luz purificadora' }
                ];
                classesDisponiveis.forEach(cls => {
                    const btnClasse = document.createElement('button');
                    btnClasse.className = 'btn-pick-class';
                    btnClasse.textContent = `${cls.icon} ${cls.id}`;
                    btnClasse.title = cls.tip;
                    btnClasse.onclick = () => {
                        this.selectedPartyIndex = idx;
                        p.setClass(cls.id);
                        window.gameAudio?.play?.('levelup');
                        this.syncHeroShowcase(true);
                    };
                    btnArea.appendChild(btnClasse);
                });
            }

            container.appendChild(card);
        });
    }

    // =========================================================
    // Inventory & Equipment
    // =========================================================
    getItemEmoji(item) {
        if (!item || !item.name) return '📦';
        const nameLower = item.name.toLowerCase();

        if (nameLower.includes('colar') || nameLower.includes('amuleto')) return '📿';
        if (nameLower.includes('anel')) return '💍';
        if (nameLower.includes('cajado') || nameLower.includes('orbe') || nameLower.includes('tomo') || nameLower.includes('grimório') || nameLower.includes('grimorio')) return '🪄';
        if (nameLower.includes('arco') || nameLower.includes('besta')) return '🏹';
        if (nameLower.includes('espada') || nameLower.includes('adaga') || nameLower.includes('katana')) return '🗡️';
        if (nameLower.includes('machado')) return '🪓';
        if (nameLower.includes('lança') || nameLower.includes('lanca')) return '🔱';
        if (nameLower.includes('martelo')) return '🔨';
        if (nameLower.includes('escudo') || nameLower.includes('aegis')) return '🛡️';
        if (nameLower.includes('capuz') || nameLower.includes('elmo') || nameLower.includes('coroa')) return '🪖';
        if (nameLower.includes('peitoral') || nameLower.includes('armadura') || nameLower.includes('cota') || nameLower.includes('manto')) return '👕';
        if (nameLower.includes('luvas')) return '🧤';
        if (nameLower.includes('calças') || nameLower.includes('calcas')) return '👖';
        if (nameLower.includes('botas')) return '👢';
        if (nameLower.includes('ossos')) return '🦴';
        if (nameLower.includes('couro')) return '🟤';
        if (nameLower.includes('presas') || nameLower.includes('chifre')) return '🦏';
        if (nameLower.includes('escamas')) return '🐟';
        if (nameLower.includes('sangue')) return '🩸';
        if (nameLower.includes('essência') || nameLower.includes('essencia') || nameLower.includes('cristal') || nameLower.includes('pó') || nameLower.includes('po ')) return '✨';
        if (nameLower.includes('minério') || nameLower.includes('minerio') || nameLower.includes('ferro')) return '🪨';
        if (nameLower.includes('poção') || nameLower.includes('pocao') || nameLower.includes('antídoto') || nameLower.includes('antidoto') || nameLower.includes('elixir') || nameLower.includes('bomba')) return '🧪';

        const typeEmojis = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            potion: '🧪',
            material: '💎'
        };
        return typeEmojis[item.type] || '📦';
    }

    getItemDescription(item) {
        const rarity = item.rarity || 'comum';
        let desc = `<span class="rarity-badge rarity-${rarity}">${rarity}</span> <small style="color:var(--text-muted);">${item.type}</small><br>`;
        if (item.count > 1) desc += `Quantidade: ${item.count}<br>`;
        if (item.minDmg) desc += `Dano: ${item.minDmg} - ${item.maxDmg}<br>`;
        if (item.def) desc += `Defesa: ${item.def}<br>`;
        if (item.stats) {
            const statsStrs = Object.entries(item.stats).map(([k, v]) => `${k.toUpperCase()}: +${v}`);
            if (statsStrs.length > 0) desc += `Atributos: ${statsStrs.join(', ')}<br>`;
        }
        if (item.weakness) desc += `Elemento/Especial: ${item.weakness}<br>`;
        if (item.desc) desc += `${item.desc}<br>`;
        else if (item.effect) desc += `Efeito: ${item.effect} (${item.value || 0})<br>`;
        if (item.reqLvl) desc += `Nível Requerido: ${item.reqLvl}<br>`;
        return desc;
    }

    renderInventory(inv, filter = 'all') {
        if (!this.elInvCount || !this.elInvList) return;
        this.elInvCount.textContent = inv.items.length;
        if (this.elInvCapacity) this.elInvCapacity.textContent = inv.capacity || 100;
        this.elInvList.innerHTML = '';

        let items = [...inv.items];
        if (filter !== 'all') {
            items = items.filter(i => i.type === filter);
        }

        const typeOrder = { weapon: 1, armor: 2, accessory: 3, potion: 4, material: 5 };
        const rarityOrder = { mitico: 1, lendario: 2, epico: 3, raro: 4, incomum: 5, comum: 6 };

        items.sort((a, b) => {
            if (typeOrder[a.type] !== typeOrder[b.type]) return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return (rarityOrder[a.rarity] || 9) - (rarityOrder[b.rarity] || 9);
            return a.name.localeCompare(b.name);
        });

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = `inv-item rarity-${item.rarity || 'comum'}`;
            div.tabIndex = 0;
            div.setAttribute('role', 'button');

            const emoji = this.getItemEmoji(item);
            div.innerHTML = `<span style="font-size: 1.5rem;">${emoji}</span>`;

            if ((item.type === 'material' || item.type === 'potion') && item.count > 1) {
                div.innerHTML += `<span class="item-count">x${item.count}</span>`;
            }

            div.addEventListener('click', () => {
                this.selectedItemInstanceId = item.instanceId;
                if (this.elInvActionPanel) {
                    this.elInvActionPanel.classList.remove('hidden');
                    this.elActionPanelName.textContent = item.name;
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

            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    div.click();
                }
            });
            div.addEventListener('mouseenter', (e) => this.showItemTooltip(e, item));
            div.addEventListener('mouseleave', () => this.hideTooltip());

            this.elInvList.appendChild(div);
        });
    }

    renderEquipment(eq) {
        if (!eq) return;
        const trans = {
            head: 'Cabeça', chest: 'Peitoral', hands: 'Luvas', legs: 'Calças',
            boots: 'Botas', weaponMain: 'Arma Principal', weaponOff: 'Secundária',
            amulet: 'Amuleto', ring1: 'Anel 1', ring2: 'Anel 2'
        };
        Object.keys(eq).forEach(slot => {
            const el = document.getElementById(`eq-${slot}`);
            if (!el) return;

            if (eq[slot]) {
                el.textContent = eq[slot].name;
                el.className = `eq-slot rarity-${eq[slot].rarity || 'comum'}`;
            } else {
                el.textContent = trans[slot] || slot;
                el.className = 'eq-slot';
            }
        });
    }

    showItemTooltip(e, item) {
        if (!this.tooltip) return;
        let html = `<strong>${item.name}</strong><br>`;
        html += this.getItemDescription(item);

        this.tooltip.innerHTML = html;
        this.tooltip.classList.remove('hidden');
        this.tooltip.style.left = (e.pageX + 12) + 'px';
        this.tooltip.style.top = (e.pageY + 12) + 'px';
    }

    showEquipmentTooltip(e, slotEl) {
        const slotId = slotEl.getAttribute('data-slot');
        const item = window.gameParty?.[this.selectedPartyIndex]?.equipment?.[slotId];
        if (item) {
            this.showItemTooltip(e, item);
        }
    }

    hideTooltip() {
        this.tooltip?.classList.add('hidden');
    }

    showToast(msg) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position:fixed; bottom:20px; right:20px; display:flex; flex-direction:column; gap:10px; z-index:9999; pointer-events:none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.style.cssText = 'background:linear-gradient(135deg,#5c0d0d,#2a0b12); border:1px solid var(--accent-gold); color:#fff; padding:0.75rem 1.15rem; border-radius:5px; transition:opacity 0.4s ease, transform 0.4s ease; box-shadow:0 6px 18px rgba(0,0,0,0.6); font-size:0.9rem; max-width:340px;';
        toast.textContent = msg;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // =========================================================
    // Quests & Contracts
    // =========================================================
    renderQuests(questSys) {
        if (!this.elActiveQuests || !this.elAvailableContracts) return;
        this.elActiveQuests.innerHTML = '';
        const categories = {
            story: { title: 'Missões da Ordem', items: [] },
            kill: { title: 'Batalha / Caça', items: [] },
            gather: { title: 'Coleta', items: [] },
            explore: { title: 'Exploração', items: [] },
            boss: { title: 'Chefe', items: [] }
        };

        questSys.activeQuests.forEach(q => {
            const li = document.createElement('li');
            li.className = 'quest-card';

            let progressText = `Progresso: ${q.currentQty} / ${q.requiredQty}`;
            let isComplete = q.currentQty >= q.requiredQty;

            if (q.type === 'gather') {
                const count = window.gameInventory.countItem(q.targetId);
                progressText = `Progresso: ${count} / ${q.requiredQty}`;
                isComplete = count >= q.requiredQty;
            }

            li.innerHTML = `<strong>${q.title}</strong>${q.desc ? `<br><small style="color:var(--text-muted);">${q.desc}</small>` : ''}<br>${progressText}<br>`;
            if (isComplete) {
                const btn = document.createElement('button');
                btn.className = 'btn-ornate btn-gold';
                btn.style.marginTop = '0.4rem';
                btn.textContent = 'Concluir';
                btn.onclick = () => questSys.completeQuest(q.id);
                li.appendChild(btn);
            }

            let cat = q.isStory ? 'story' : q.type;
            if (q.title.includes('Ameaça Máxima')) cat = 'boss';
            if (categories[cat]) categories[cat].items.push(li);
            else categories.kill.items.push(li);
        });

        Object.values(categories).forEach(cat => {
            if (cat.items.length > 0) {
                const header = document.createElement('h4');
                header.textContent = cat.title;
                header.style.color = 'var(--accent-gold)';
                header.style.marginTop = '1rem';
                this.elActiveQuests.appendChild(header);
                cat.items.forEach(item => this.elActiveQuests.appendChild(item));
            }
        });

        if (this.elActiveQuests.innerHTML === '') {
            this.elActiveQuests.innerHTML = 'Nenhuma missão ativa.';
        }

        this.elAvailableContracts.innerHTML = '';
        const availableCategories = {
            story: { title: 'Missões da Ordem', items: [] },
            kill: { title: 'Batalha / Caça', items: [] },
            gather: { title: 'Coleta', items: [] },
            explore: { title: 'Exploração', items: [] },
            boss: { title: 'Chefe', items: [] }
        };

        questSys.availableContracts.forEach(c => {
            const li = document.createElement('li');
            li.className = 'quest-card';
            li.innerHTML = `<strong>${c.title}</strong><br>${c.desc}<br>Recompensas: ${c.rewards.xp} XP, ${c.rewards.gold} Ouro<br>`;
            const btn = document.createElement('button');
            btn.style.marginTop = '0.4rem';
            btn.textContent = 'Aceitar';
            btn.onclick = () => questSys.acceptContract(c.id);
            li.appendChild(btn);

            let cat = c.isStory ? 'story' : c.type;
            if (c.title.includes('Ameaça Máxima')) cat = 'boss';
            if (availableCategories[cat]) availableCategories[cat].items.push(li);
            else availableCategories.kill.items.push(li);
        });

        Object.values(availableCategories).forEach(cat => {
            if (cat.items.length > 0) {
                const header = document.createElement('h4');
                header.textContent = cat.title;
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
        if (window.gameTileMap) {
            window.gameTileMap.updateHUD();
        }
        this.updateMapControls();
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
                        text += progress >= maxBattles ? ` [Concluído]` : ` [${progress}/${maxBattles} Batalhas]`;
                    }
                    btn.innerHTML = `${text}<br><small>${loc.desc}</small>`;
                }
            }
        });
    }

    // =========================================================
    // Crafting & Refining (Fixed critical btn bug!)
    // =========================================================
    renderCrafting(inventory, player) {
        if (!this.elCraftingRecipes || !this.elCraftingUpgradeList) return;
        this.elCraftingRecipes.innerHTML = '';
        this.elCraftingUpgradeList.innerHTML = '';

        CraftingSystem.recipes.forEach(r => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:1rem; border:1px solid var(--border-color); background:var(--bg-card); border-radius:5px;';

            const craftedItem = { name: r.name };
            if (r.result && r.result.baseId) {
                if (r.result.baseId.startsWith('w')) craftedItem.type = 'weapon';
                else if (r.result.baseId.startsWith('a')) craftedItem.type = 'armor';
                else craftedItem.type = 'accessory';
            } else if (r.result && r.result.type) {
                craftedItem.type = r.result.type;
            }
            const emoji = this.getItemEmoji(craftedItem);

            const ings = r.ingredients.map(ing => {
                const hasQty = inventory.countItem(ing.id);
                const color = hasQty >= ing.qty ? 'var(--rarity-uncommon)' : 'var(--rarity-mythic)';
                return `<span style="color: ${color};">${hasQty}/${ing.qty}x ${ing.name}</span>`;
            }).join('<br>');

            div.innerHTML = `<h4 style="margin:0 0 0.45rem 0; color: var(--accent-gold);">${emoji} ${r.name}</h4>
                             <p style="margin: 0 0 0.45rem 0; font-size: 0.85rem;">Requisito Nv: ${r.reqLvl}</p>
                             <div style="font-size: 0.85rem; margin-bottom: 0.9rem;"><strong>Ingredientes:</strong><br>${ings}</div>`;

            const btn = document.createElement('button');
            btn.textContent = 'Forjar';
            btn.style.width = '100%';

            if (!CraftingSystem.canCraft(r.id, inventory) || player.level < r.reqLvl) {
                btn.disabled = true;
            } else {
                btn.style.borderColor = 'var(--accent-gold)';
            }

            btn.onclick = () => CraftingSystem.craft(r.id, inventory, player);
            div.appendChild(btn);
            this.elCraftingRecipes.appendChild(div);
        });

        const upgItems = inventory.items.filter(i => i.type === 'weapon' || i.type === 'armor');
        if (upgItems.length === 0) {
            const noI = document.createElement('p');
            noI.textContent = 'Não tens equipamento na mochila para refinar. (Desequipa um item primeiro)';
            noI.style.color = 'var(--text-muted)';
            this.elCraftingUpgradeList.appendChild(noI);
            return;
        }

        upgItems.forEach(item => {
            const div = document.createElement('div');
            div.className = `quest-card rarity-${item.rarity || 'comum'}`;
            div.style.background = 'var(--bg-card)';
            div.style.padding = '1rem';

            const currentLevel = parseInt((item.name.match(/\+(\d+)/) || [0, 0])[1], 10);
            const nextLevel = currentLevel + 1;
            const costGold = 100 * nextLevel;
            const matReq = { id: 'm10', qty: nextLevel, name: 'Minério de Ferro' };

            const hasMatQty = inventory.countItem(matReq.id);
            const matColor = hasMatQty >= matReq.qty ? 'var(--rarity-uncommon)' : 'var(--rarity-mythic)';

            div.innerHTML = `
                <strong>${item.name}</strong> ➔ <span style="color:var(--accent-gold);">Nível +${nextLevel}</span><br>
                <div style="font-size: 0.85rem; margin-top: 0.5rem;">Custo: ${costGold} Ouro</div>
                <div style="font-size: 0.85rem; margin-bottom: 1rem;">Requer: <span style="color:${matColor};">${hasMatQty}/${matReq.qty}x ${matReq.name}</span></div>
            `;

            const btn = document.createElement('button');
            btn.textContent = 'Refinar';
            btn.style.width = '100%';

            if ((player.gold || 0) < costGold || hasMatQty < matReq.qty) {
                btn.disabled = true;
            } else {
                btn.style.borderColor = 'var(--rarity-epic)';
            }

            btn.onclick = () => {
                CraftingSystem.refineEquipment(item.instanceId, inventory, player);
            };
            div.appendChild(btn);
            this.elCraftingUpgradeList.appendChild(div);
        });
    }

    // =========================================================
    // Bestiary + 3D Monster Preview
    // =========================================================
    updateBestiary(monster) {
        if (!window.gamePlayer) return;
        if (!window.gamePlayer.bestiary) window.gamePlayer.bestiary = [];
        if (!window.gamePlayer.bestiary.find(m => m.id === monster.id)) {
            const baseMonster = MonsterDatabase.monsters.find(m => m.id === monster.id) || monster;
            window.gamePlayer.bestiary.push({
                id: baseMonster.id,
                name: baseMonster.name,
                type: baseMonster.type,
                habitat: baseMonster.habitat || baseMonster.type,
                weakness: baseMonster.weakness || [],
                elementalResists: baseMonster.elementalResists || [],
                desc: baseMonster.desc || 'Encontrado em expedições da Ordem.'
            });
            this.renderBestiary();
            Engine.emit('systemLog', `Novo monstro adicionado ao bestiário: ${monster.name}`);
        }
    }

    disposeBestiaryPreview() {
        if (this.bestiaryPreview) {
            if (this.bestiaryPreview.rafId && typeof cancelAnimationFrame !== 'undefined') {
                cancelAnimationFrame(this.bestiaryPreview.rafId);
            }
            if (this.bestiaryPreview.renderer) {
                try { this.bestiaryPreview.renderer.dispose?.(); } catch (e) {}
                try { this.bestiaryPreview.renderer.forceContextLoss?.(); } catch (e) {}
            }
            this.bestiaryPreview = null;
        }
        if (this.elBestiary3DPreview) {
            this.elBestiary3DPreview.innerHTML = '';
        }
    }

    renderBestiaryPreview(monster) {
        this.disposeBestiaryPreview();
        if (!this.elBestiary3DPreview) return;

        if (this.isWebGLReady() && window.THREE && window.Models3D?.createMonsterModel) {
            try {
                const w = Math.max(220, this.elBestiary3DPreview.clientWidth || 300);
                const h = Math.max(160, this.elBestiary3DPreview.clientHeight || 200);
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
                camera.position.set(0, 1.4, 3.6);
                camera.lookAt(0, 0.7, 0);

                const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                renderer.setSize(w, h);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                this.elBestiary3DPreview.appendChild(renderer.domElement);

                const ambient = new THREE.AmbientLight(0xb8c4e0, 0.9);
                const keyLight = new THREE.DirectionalLight(0xffe0b2, 1.35);
                keyLight.position.set(2.5, 4, 3);
                const rimLight = new THREE.PointLight(0xef4444, 1.2, 8);
                rimLight.position.set(-2, 2, -1.5);
                scene.add(ambient, keyLight, rimLight);

                const model = window.Models3D.createMonsterModel(monster);
                if (model) {
                    scene.add(model);
                }

                const previewState = { renderer, rafId: null };
                this.bestiaryPreview = previewState;
                let last = performance.now();
                const animate = (now) => {
                    if (this.bestiaryPreview !== previewState) return;
                    const dt = Math.min(0.05, (now - last) / 1000);
                    last = now;
                    if (model) {
                        model.rotation.y += dt * 0.7;
                        window.Models3D.updateAnimation?.(model, dt);
                    }
                    renderer.render(scene, camera);
                    previewState.rafId = requestAnimationFrame(animate);
                };
                previewState.rafId = requestAnimationFrame(animate);
                return;
            } catch (e) {
                // Fallback below
            }
        }

        const emoji = this.combatUI?.getEmojiForMonster?.(monster) || '👾';
        this.elBestiary3DPreview.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:4rem;">${emoji}</div>
                <small style="color:var(--text-muted);">${monster.type || 'Criatura'}</small>
            </div>
        `;
    }

    renderBestiary() {
        if (!this.elBestiaryList) return;
        this.elBestiaryList.innerHTML = '';
        const discovered = window.gamePlayer?.bestiary || [];
        const allMonsters = window.MonsterDatabase?.monsters || discovered;

        if (this.elBestiaryCount) {
            this.elBestiaryCount.textContent = `${discovered.length}/${allMonsters.length} Catalogados`;
        }

        allMonsters.forEach(baseMob => {
            const foundEntry = discovered.find(m => m.id === baseMob.id);
            const div = document.createElement('div');
            if (foundEntry) {
                const fullMob = { ...baseMob, ...foundEntry };
                const emoji = this.combatUI?.getEmojiForMonster?.(fullMob) || '👾';
                div.className = 'bestiary-card';
                div.innerHTML = `<strong>${emoji} ${fullMob.name}</strong><br><small style="color:var(--text-muted);">${fullMob.type}</small>`;
                div.onclick = () => {
                    this.elBestiaryList.classList.add('hidden');
                    this.elBestName.textContent = `${emoji} ${fullMob.name}`;
                    this.elBestHabitat.textContent = fullMob.habitat || fullMob.type || 'Desconhecido';
                    this.elBestDesc.textContent = fullMob.desc || 'Criatura hostil registrada pela Ordem.';
                    this.elBestWeak.textContent = fullMob.weakness && fullMob.weakness.length > 0 ? fullMob.weakness.join(', ') : 'Nenhuma conhecida';
                    if (this.elBestResist) {
                        const resists = fullMob.elementalResists || fullMob.resists;
                        if (Array.isArray(resists) && resists.length > 0) {
                            this.elBestResist.textContent = resists.join(', ');
                        } else if (resists && typeof resists === 'object' && Object.keys(resists).length > 0) {
                            this.elBestResist.textContent = Object.entries(resists)
                                .map(([el, val]) => `${el.charAt(0).toUpperCase() + el.slice(1)} (${Math.round(val * 100)}%)`)
                                .join(', ');
                        } else {
                            this.elBestResist.textContent = 'Nenhuma';
                        }
                    }
                    this.elBestLoot.textContent = `Drop Base: ${fullMob.dropChance || 10}% · ${fullMob.xp || 0} XP`;
                    this.elBestiaryDetails.classList.remove('hidden');
                    this.renderBestiaryPreview(fullMob);
                };
            } else {
                div.className = 'bestiary-card locked';
                div.innerHTML = `<strong>❓ ???</strong><br><small>Não catalogado</small>`;
            }
            this.elBestiaryList.appendChild(div);
        });
    }

    // =========================================================
    // Shop
    // =========================================================
    renderShop() {
        if (!this.elShopList || !window.gameParty) return;
        this.elShopList.innerHTML = '';

        const playerLvl = window.gameParty[0] ? window.gameParty[0].level : 1;
        const currentFilter = this.currentShopFilter || 'all';

        if (!this.shopItems || this.shopLevel !== playerLvl) {
            this.shopLevel = playerLvl;
            this.shopItems = [];

            for (let i = 0; i < 6; i++) {
                this.shopItems.push(ItemDatabase.generateItem(playerLvl + Math.floor(Math.random() * 5)));
            }
            for (let i = 0; i < 4; i++) {
                const pot = ItemDatabase.potions[Math.floor(Math.random() * ItemDatabase.potions.length)];
                this.shopItems.push(ItemDatabase.getPotion(pot.id));
            }
            for (let i = 0; i < 4; i++) {
                const mat = ItemDatabase.materials[Math.floor(Math.random() * ItemDatabase.materials.length)];
                this.shopItems.push(ItemDatabase.getMaterial(mat.id));
            }
            if (!this.shopItems.some(i => i.id === 'm10')) {
                this.shopItems.push(ItemDatabase.getMaterial('m10'));
            }
        }

        const typeOrder = { weapon: 1, armor: 2, accessory: 3, potion: 4, material: 5 };
        const rarityOrder = { mitico: 1, lendario: 2, epico: 3, raro: 4, incomum: 5, comum: 6 };

        let filteredBuyItems = [...this.shopItems];
        if (currentFilter !== 'all') {
            filteredBuyItems = filteredBuyItems.filter(item => item.type === currentFilter);
        }

        filteredBuyItems.sort((a, b) => {
            if (typeOrder[a.type] !== typeOrder[b.type]) return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return (rarityOrder[a.rarity] || 9) - (rarityOrder[b.rarity] || 9);
            return a.name.localeCompare(b.name);
        });

        const buySection = document.createElement('div');
        buySection.className = 'shop-buy-section shop-items';
        buySection.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(165px, 1fr)); gap:1rem;';

        filteredBuyItems.forEach(item => {
            const div = document.createElement('div');
            div.className = `shop-card rarity-${item.rarity || 'comum'}`;

            const baseCost = item.sellValue || item.gold || item.value || 10;
            const increasedCost = Math.floor(baseCost * 3);

            let descHtml = `<strong>${this.getItemEmoji(item)} ${item.name}</strong><br>`;
            descHtml += this.getItemDescription(item);
            descHtml += `<hr style="margin: 0.5rem 0; border-color: var(--border-color);">`;
            descHtml += `Preço: <strong>${increasedCost} Ouro</strong><br><br>`;
            div.innerHTML = descHtml;

            const btnBuy = document.createElement('button');
            btnBuy.textContent = 'Comprar';
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
                        window.gameAudio?.play?.('coin');
                        Engine.emit('playerUpdated', window.gameParty[0]);
                        Engine.emit('systemLog', `Você comprou ${item.name} por ${increasedCost} Ouro.`);
                    }
                } else {
                    window.gameAudio?.play?.('error');
                    Engine.emit('systemLog', 'Ouro insuficiente.');
                }
            };
            div.appendChild(btnBuy);
            buySection.appendChild(div);
        });

        this.elShopList.appendChild(buySection);

        const hr = document.createElement('hr');
        hr.style.cssText = 'grid-column:1 / -1; margin:2rem 0 1rem 0; border-color:var(--border-color);';
        this.elShopList.appendChild(hr);

        const sellTitle = document.createElement('h3');
        sellTitle.textContent = 'Vender seus itens';
        sellTitle.style.cssText = 'grid-column:1 / -1; color:var(--accent-gold); margin-bottom:1rem;';
        this.elShopList.appendChild(sellTitle);

        let itemsToSell = [...window.gameInventory.items];
        if (currentFilter !== 'all') {
            itemsToSell = itemsToSell.filter(item => item.type === currentFilter);
        }

        itemsToSell.sort((a, b) => {
            if (typeOrder[a.type] !== typeOrder[b.type]) return (typeOrder[a.type] || 9) - (typeOrder[b.type] || 9);
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) return (rarityOrder[a.rarity] || 9) - (rarityOrder[b.rarity] || 9);
            return a.name.localeCompare(b.name);
        });

        const sellSection = document.createElement('div');
        sellSection.className = 'shop-sell-section shop-items';
        sellSection.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(165px, 1fr)); gap:1rem;';

        if (itemsToSell.length === 0) {
            const noItemsMsg = document.createElement('p');
            noItemsMsg.textContent = 'Nenhum item desta categoria no seu inventário.';
            noItemsMsg.style.cssText = 'grid-column:1 / -1; color:var(--text-muted);';
            sellSection.appendChild(noItemsMsg);
        }

        itemsToSell.forEach(item => {
            const div = document.createElement('div');
            div.className = `shop-card rarity-${item.rarity || 'comum'}`;

            const sellPrice = item.sellValue || Math.floor((item.gold || item.value || 10) / 2) || 5;

            let desc = `<strong>${this.getItemEmoji(item)} ${item.name}</strong><br>`;
            desc += this.getItemDescription(item);
            desc += `<hr style="margin: 0.5rem 0; border-color: var(--border-color);">`;
            desc += `Venda: <strong>${sellPrice} Ouro</strong>${item.count > 1 ? ' (cada)' : ''}<br><br>`;
            div.innerHTML = desc;

            const btnSell = document.createElement('button');
            btnSell.textContent = 'Vender 1';
            btnSell.onclick = () => {
                const removedItem = window.gameInventory.removeItem(item.instanceId, 1);
                if (removedItem) {
                    window.gameParty[0].gainGold(sellPrice);
                    window.gameAudio?.play?.('coin');
                    Engine.emit('systemLog', `Você vendeu 1x ${item.name} por ${sellPrice} Ouro.`);
                }
            };
            div.appendChild(btnSell);

            if (item.count > 1) {
                const btnSellAll = document.createElement('button');
                btnSellAll.style.marginLeft = '0.35rem';
                btnSellAll.textContent = 'Vender Todos';
                btnSellAll.onclick = () => {
                    const totalSells = item.count;
                    const totalGold = sellPrice * totalSells;
                    const removedItem = window.gameInventory.removeItem(item.instanceId, totalSells);
                    if (removedItem) {
                        window.gameParty[0].gainGold(totalGold);
                        window.gameAudio?.play?.('coin');
                        Engine.emit('systemLog', `Você vendeu ${totalSells}x ${item.name} por ${totalGold} Ouro.`);
                    }
                };
                div.appendChild(btnSellAll);
            }

            sellSection.appendChild(div);
        });

        this.elShopList.appendChild(sellSection);
    }

    // =========================================================
    // Campaign Victory Epilogue & New Game+
    // =========================================================
    showVictoryModal(data = {}) {
        if (!this.elVictoryModal) return;
        window.gameAudio?.playMusic?.('victory');

        if (this.elVictoryRelics) {
            const relics = this.getRelicsList();
            this.elVictoryRelics.innerHTML = relics.map(r => {
                const owned = Boolean(window.GameMechanics?.hasRelic?.(r.id));
                const bonusText = r.bonusDesc || r.desc || '';
                return `<span class="relic-slot ${owned ? 'collected' : ''}" style="width:auto; height:auto; padding:0.35rem 0.65rem; border-radius:999px;" title="${bonusText}">${r.icon || '💎'} ${r.name}</span>`;
            }).join('');
        }

        if (this.elVictoryStats) {
            const stats = window.GameMechanics?.state?.stats || data.stats || {};
            const statList = [
                { label: 'Abates Totais', val: stats.kills || 0 },
                { label: 'Chefes Derrotados', val: stats.bossesDefeated || 0 },
                { label: 'Dano Causado', val: stats.damageDealt || 0 },
                { label: 'Combos Elementais', val: stats.elementalCombos || 0 },
                { label: 'Supremos', val: stats.ultimatesUsed || 0 },
                { label: 'Nível do Grupo', val: window.gameParty?.[0]?.level || 1 }
            ];
            this.elVictoryStats.innerHTML = statList.map(s => `
                <div class="order-stat-box"><span>${s.label}</span><strong>${s.val}</strong></div>
            `).join('');
        }

        this.elVictoryModal.classList.remove('hidden');

        if (this.elVictoryDiorama) {
            this.victoryDiorama?.dispose?.();
            this.victoryDiorama = null;

            const launchDiorama = () => {
                if (this.isWebGLReady() && window.Scene3D?.VictoryDiorama) {
                    this.elVictoryDiorama.innerHTML = '';
                    this.victoryDiorama = new window.Scene3D.VictoryDiorama(this.elVictoryDiorama, window.gameParty);
                } else {
                    const partyBadges = (window.gameParty || []).map(p => `${this.combatUI?.getEmojiForClass?.(p.playerClass) || '🧍'} ${p.name}`).join(' · ');
                    this.elVictoryDiorama.innerHTML = `<div class="viewport-fallback">🏆 Campeões da Ordem:<br>${partyBadges}</div>`;
                }
            };

            if (typeof requestAnimationFrame !== 'undefined') {
                requestAnimationFrame(launchDiorama);
            } else {
                launchDiorama();
            }
        }
    }

    closeVictoryModal() {
        this.victoryDiorama?.dispose?.();
        this.victoryDiorama = null;
        this.elVictoryModal?.classList.add('hidden');
    }

    triggerNewGamePlus() {
        if (!window.GameMechanics?.startNewGamePlus) {
            this.showToast('Sistema de Novo Jogo+ indisponível.');
            return;
        }
        if (!confirm('Iniciar Novo Jogo+? Seus heróis, equipamentos e Relíquias serão mantidos, e o mundo será reiniciado com inimigos muito mais poderosos!')) {
            return;
        }

        const newLvl = window.GameMechanics.startNewGamePlus();
        (window.gameParty || []).forEach(p => {
            p.hp = p.getMaxHp();
            p.mana = p.getMaxMana();
            p.fury = 0;
        });

        if (window.gameTileMap) {
            window.gameTileMap.openedChests?.clear?.();
            window.gameTileMap.usedShrines?.clear?.();
            if (window.gameTileMap.enemiesByMap) {
                Object.keys(window.gameTileMap.enemiesByMap).forEach(mId => {
                    window.gameTileMap.respawnMapEnemies?.(mId);
                });
            }
            window.gameTileMap.switchMap('floresta', null, null, true);
        }

        MapSystem.progress = {};
        MapSystem.unlockedRegions = ['floresta', 'helgen'];
        window.game?.save?.();

        Engine.emit('partyUpdated', window.gameParty);
        Engine.emit('playerUpdated', window.gameParty?.[0]);
        Engine.emit('mechanicsUpdated');
        window.gameAudio?.play?.('levelup');
        this.showToast(`🌟 Novo Jogo+ (NG+${newLvl || window.GameMechanics.state?.ngPlusLevel || 1}) iniciado!`);
    }

    // Legacy Region helpers preserved for backwards compatibility
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
                if (p.hp <= 0) p.hp = 1;
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
        if (!this.elLocDetails) return;
        const loc = window.MapSystem.getRegionDetails(locId);
        if (!loc) return;

        const progress = window.MapSystem.progress[locId] || 0;
        const maxBattles = loc.encounters ? loc.encounters.length : 0;
        const percentage = maxBattles > 0 ? Math.min(100, (progress / maxBattles) * 100) : 0;

        this.elLocDetails.innerHTML = '';

        const title = document.createElement('h3');
        title.innerHTML = `${loc.name} (Nível ${loc.minLvl}-${loc.maxLvl})<br><small style="color: #aaa; font-weight: normal;">${loc.desc}</small>`;
        this.elLocDetails.appendChild(title);

        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = 'width:100%; background:#222; border:1px solid var(--border-color); margin:1rem 0; height:22px; position:relative;';

        const progressBar = document.createElement('div');
        progressBar.style.cssText = `width:${percentage}%; height:100%; background:var(--accent-gold); transition:width 0.4s ease;`;

        const progressText = document.createElement('span');
        progressText.textContent = `Progresso do Mapa: ${progress}/${maxBattles} Fases (${Math.floor(percentage)}%)`;
        progressText.style.cssText = 'position:absolute; width:100%; text-align:center; top:0; font-size:0.8rem; color:#fff; font-weight:bold; line-height:22px;';

        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        this.elLocDetails.appendChild(progressContainer);

        const battlesGrid = document.createElement('div');
        battlesGrid.style.cssText = 'display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem;';

        loc.encounters.forEach((mobId, idx) => {
            const baseMob = window.MonsterDatabase.monsters.find(m => m.id === mobId);
            const btnBattle = document.createElement('button');
            btnBattle.style.cssText = 'flex:1 1 calc(33% - 0.5rem); min-width:160px;';

            const isCompleted = idx < progress;
            const isActiveCampaign = idx === progress;
            const isLocked = idx > progress;

            if (isLocked) {
                btnBattle.textContent = `🔒 Batalha ${idx + 1}`;
                btnBattle.disabled = true;
            } else {
                const mobName = baseMob ? baseMob.name : 'Inimigo';
                if (loc.isBonus) {
                    btnBattle.textContent = isCompleted ? `⚡ Auto (Repetir): ${mobName}` : `⚡ Auto (Avançar): ${mobName}`;
                    btnBattle.style.borderColor = isCompleted ? 'var(--rarity-rare)' : 'var(--rarity-legendary)';
                    btnBattle.onclick = () => {
                        const event = window.MapSystem.explore(locId, idx);
                        if (event && event.type === 'event') {
                            this.handleMapEvent(event.data);
                            return;
                        }
                        if (!event || event.type !== 'combat') return;
                        const monsters = event.data;
                        const winChance = window.gameCombat.estimateWinChance(monsters);
                        if (confirm(`Estimativa: ${winChance}%\nDeseja iniciar Batalha Automática?`)) {
                            window.gameCombat.autoResolveCombat(monsters);
                        }
                    };
                } else {
                    btnBattle.textContent = isCompleted ? `🔄 Repetir ${idx + 1}: ${mobName}` : `⚔️ Desafio ${idx + 1}: ${mobName}`;
                    btnBattle.style.borderColor = isCompleted ? 'var(--rarity-uncommon)' : (isActiveCampaign ? 'var(--accent-red)' : 'var(--border-color)');
                    btnBattle.onclick = () => {
                        if (btnBattle.disabled) return;
                        btnBattle.disabled = true;
                        const originalText = btnBattle.textContent;
                        const frames = ['🚶‍♂️', '🏃‍♂️', '🚶‍♂️', '🏃‍♂️'];
                        let frameIdx = 0;
                        const animInterval = setInterval(() => {
                            frameIdx = (frameIdx + 1) % frames.length;
                            btnBattle.textContent = `Viajando... ${frames[frameIdx]}`;
                        }, 250);

                        setTimeout(() => {
                            clearInterval(animInterval);
                            btnBattle.disabled = false;
                            btnBattle.textContent = originalText;
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
