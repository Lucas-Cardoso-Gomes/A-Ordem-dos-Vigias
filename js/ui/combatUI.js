/**
 * ui/combatUI.js
 * Manages tactical 2D/3D Combat Arena, 60fps 2D VFX loop, Fury/Ultimates, Status Effects, and HUD.
 */

class CombatUIManager {
    constructor(uiManager) {
        this.ui = uiManager;
        this.use3D = false;
        this.userToggledMode = false;
        this.arena3D = null;
        this.cameraPresets = ['isometric', 'tactical', 'close'];
        this.cameraPresetIndex = 0;

        this._unitVisualPos = {};
        this._vfxEffects = [];
        this._floatingCanvasTexts = [];
        this._rafId = null;
        this._lastFrameTime = 0;
        this._bannerTimeout = null;

        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.elCombatScreen = document.getElementById('screen-combat');
        this.elCombatPartyContainer = document.getElementById('combat-party-container');
        this.elCombatMonstersContainer = document.getElementById('combat-monsters-container');
        this.elCombatTurnQueueList = document.getElementById('combat-turn-queue-list');
        this.elCombatCanvasContainer = document.getElementById('combat-canvas-container');
        this.elCombatCanvas = document.getElementById('combat-grid-canvas');
        this.elCombat3DContainer = document.getElementById('combat-3d-container');
        if (this.elCombatCanvas) this.ctx = this.elCombatCanvas.getContext('2d');

        this.btnToggleCombat3D = document.getElementById('btn-toggle-combat-3d');
        this.btnCombatCam = document.getElementById('btn-combat-cam');

        this.btnMove = document.getElementById('btn-move');
        this.btnAttack = document.getElementById('btn-attack');
        this.btnSkill = document.getElementById('btn-skill');
        this.btnUltimate = document.getElementById('btn-ultimate');
        this.elUltimateFill = document.getElementById('btn-ultimate-fill');
        this.elUltimateLabel = document.getElementById('btn-ultimate-label');
        this.btnPotion = document.getElementById('btn-potion');
        this.btnFlee = document.getElementById('btn-flee');
        this.btnEndTurn = document.getElementById('btn-end-turn');

        this.elCombatLog = document.getElementById('combat-log');
        this.elCombatInstruction = document.getElementById('combat-instruction');
        this.elCombatActiveEffects = document.getElementById('combat-active-effects');

        this.elCombatSkillsMenu = document.getElementById('combat-skills-menu');
        this.elCombatSkillsList = document.getElementById('combat-skills-list');
        this.elCombatItemsMenu = document.getElementById('combat-items-menu');
        this.elCombatItemsList = document.getElementById('combat-items-list');

        this.elBossPhaseBanner = document.getElementById('boss-phase-banner');
        this.elBossPhaseTitle = document.getElementById('boss-phase-title');
        this.elBossPhaseDialogue = document.getElementById('boss-phase-dialogue');
    }

    bindEvents() {
        if (this.btnMove) {
            this.btnMove.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.hideCombatMenus();
                window.gameCombat?.startMoveSelection();
            });
        }

        if (this.btnEndTurn) {
            this.btnEndTurn.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.hideCombatMenus();
                window.gameCombat?.nextTurn();
            });
        }

        if (this.btnAttack) {
            this.btnAttack.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.hideCombatMenus();
                window.gameCombat?.cancelGridSelection();
                this.showCombatAttackMenu();
            });
        }

        if (this.btnSkill) {
            this.btnSkill.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.hideCombatMenus();
                window.gameCombat?.cancelGridSelection();
                this.showCombatSkillsMenu();
            });
        }

        if (this.btnUltimate) {
            this.btnUltimate.addEventListener('click', () => {
                this.hideCombatMenus();
                window.gameCombat?.cancelGridSelection();
                if (window.gameCombat && typeof window.gameCombat.useUltimate === 'function') {
                    window.gameCombat.useUltimate();
                }
            });
        }

        if (this.btnFlee) {
            this.btnFlee.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.hideCombatMenus();
                window.gameCombat?.flee();
            });
        }

        if (this.btnPotion) {
            this.btnPotion.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.hideCombatMenus();
                window.gameCombat?.cancelGridSelection();
                this.showCombatItemsMenu();
            });
        }

        if (this.btnToggleCombat3D) {
            this.btnToggleCombat3D.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.userToggledMode = true;
                this.use3D = !this.use3D;
                this.applyArenaMode();
            });
        }

        if (this.btnCombatCam) {
            this.btnCombatCam.addEventListener('click', () => {
                window.gameAudio?.play?.('click');
                this.cameraPresetIndex = (this.cameraPresetIndex + 1) % this.cameraPresets.length;
                const preset = this.cameraPresets[this.cameraPresetIndex];
                this.arena3D?.setCameraPreset?.(preset);
                const labels = { isometric: 'Isométrica', tactical: 'Tática', close: 'Próxima' };
                this.btnCombatCam.textContent = `🎥 ${labels[preset] || 'Câmera'}`;
            });
        }

        if (this.elCombatCanvas) {
            this.elCombatCanvas.addEventListener('click', (e) => this.handleCanvasClick(e));
            this.elCombatCanvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
            this.elCombatCanvas.addEventListener('mouseleave', () => {
                this.hoverX = undefined;
                this.hoverY = undefined;
            });
        }

        window.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        window.addEventListener('resize', () => {
            if (this.use3D && this.arena3D && this.elCombatScreen?.classList.contains('active')) {
                this.arena3D.resize?.();
            }
        });

        Engine.on('combatUpdated', () => {
            this.updateActiveEffects();
            this.updateUltimateButton();
            this.sync3DState();
        });
        Engine.on('turnQueueUpdated', () => this.updateActiveEffects());
        Engine.on('turnStarted', () => this.updateUltimateButton());
        Engine.on('turnEnded', () => this.updateUltimateButton());
        Engine.on('combatVFX', (vfx) => this.handleCombatVFX(vfx));
        Engine.on('combatMove', (move) => this.handleCombatMove(move));
        Engine.on('bossPhaseChanged', (data) => this.showBossPhaseBanner(data));
    }

    handleKeyboardShortcuts(e) {
        if (!this.elCombatScreen || !this.elCombatScreen.classList.contains('active')) return;
        if (!window.gameCombat || !window.gameCombat.inCombat) return;

        const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const isPlayerTurn = window.gameCombat.currentTurnEntity?.type === 'player' && !window.gameCombat.isProcessingTurn;
        const key = e.key;

        if (key === 'Escape') {
            this.hideCombatMenus();
            window.gameCombat.cancelGridSelection();
            return;
        }

        if (!isPlayerTurn) return;

        if (key === '1') {
            this.btnMove?.click();
        } else if (key === '2') {
            this.btnAttack?.click();
        } else if (key === '3') {
            this.btnSkill?.click();
        } else if (key === '4') {
            if (this.btnUltimate && !this.btnUltimate.disabled) {
                this.btnUltimate.click();
            }
        } else if (key === '5') {
            this.btnPotion?.click();
        } else if (key === ' ' || e.code === 'Space') {
            e.preventDefault();
            this.btnEndTurn?.click();
        }
    }

    getCombatTheme() {
        const tm = window.gameTileMap;
        if (tm?.currentMap?.theme) return tm.currentMap.theme;
        const id = tm?.currentMapId;
        const mapThemes = {
            floresta: 'forest',
            caverna: 'cave',
            ruinas: 'ruins',
            vulcao: 'volcano',
            abismo: 'abyss'
        };
        return mapThemes[id] || 'forest';
    }

    isWebGLReady() {
        return Boolean(window.Scene3D && typeof window.Scene3D.isWebGLAvailable === 'function' && window.Scene3D.isWebGLAvailable());
    }

    init3DArena() {
        if (!this.isWebGLReady() || !this.elCombat3DContainer) return false;
        if (!this.arena3D) {
            this.arena3D = new window.Scene3D.CombatArena(this.elCombat3DContainer);
            this.arena3D.onTileClick = (x, y) => this.handleGridTileClick(x, y);
            this.arena3D.onTileHover = (x, y) => this.handleGridTileHover(x, y);
        }
        return true;
    }

    applyArenaMode() {
        const webglAvailable = this.isWebGLReady();
        if (!webglAvailable) {
            this.use3D = false;
        }

        if (this.btnToggleCombat3D) {
            if (!webglAvailable) {
                this.btnToggleCombat3D.disabled = true;
                this.btnToggleCombat3D.textContent = '🗺️ Modo 2D (Sem WebGL)';
            } else {
                this.btnToggleCombat3D.disabled = false;
                this.btnToggleCombat3D.textContent = this.use3D ? '🗺️ Mudar para 2D' : '🎲 Mudar para 3D';
            }
        }

        if (this.btnCombatCam) {
            this.btnCombatCam.classList.toggle('hidden', !this.use3D);
        }

        if (this.use3D && this.init3DArena()) {
            this.elCombat3DContainer?.classList.remove('hidden');
            if (this.elCombatCanvas) this.elCombatCanvas.style.display = 'none';
            this.arena3D.setVisible?.(true);
            this.arena3D.resize?.();
            this.sync3DState();
        } else {
            this.elCombat3DContainer?.classList.add('hidden');
            if (this.elCombatCanvas) this.elCombatCanvas.style.display = 'block';
            this.arena3D?.setVisible?.(false);
            this.drawGrid();
        }
    }

    sync3DState() {
        if (!this.use3D || !this.arena3D || !window.gameCombat || !window.gameCombat.inCombat) return;
        const combat = window.gameCombat;
        this.arena3D.syncState?.({
            gridWidth: combat.gridWidth,
            gridHeight: combat.gridHeight,
            party: combat.party,
            monsters: combat.monsters,
            currentTurnEntity: combat.currentTurnEntity,
            activeTerrains: combat.activeTerrains,
            isSelectingMove: combat.isSelectingMove,
            isSelectingTarget: combat.isSelectingTarget,
            movementRemaining: combat.movementRemaining,
            selectedSkill: combat.selectedSkill,
            selectedAttackSlot: combat.selectedAttackSlot,
            targetIndex: combat.targetIndex,
            hoverTile: (this.hoverX !== undefined && this.hoverY !== undefined) ? { x: this.hoverX, y: this.hoverY } : null
        }, this.getCombatTheme());
    }

    handleGridTileHover(x, y) {
        if (!window.gameCombat || !window.gameCombat.inCombat) return;
        if (x === null || x === undefined || y === null || y === undefined) {
            this.hoverX = undefined;
            this.hoverY = undefined;
        } else {
            this.hoverX = x;
            this.hoverY = y;
        }
        if (!this.use3D) {
            this.drawGrid();
        } else {
            this.sync3DState();
        }
    }

    handleGridTileClick(x, y) {
        if (!window.gameCombat || !window.gameCombat.inCombat) return;
        const combat = window.gameCombat;

        if (combat.isSelectingMove) {
            combat.moveEntityTo(x, y);
            return;
        }

        if (combat.isSelectingTarget) {
            if (combat.selectedSkill && combat.selectedSkill.type === 'terrain') {
                combat.playerSkill(combat.selectedSkill, null, { x, y });
                return;
            }

            const targetIndex = combat.monsters.findIndex(m => m.hp > 0 && m.gridX === x && m.gridY === y);
            if (targetIndex !== -1) {
                combat.setTarget(targetIndex);
                if (combat.selectedSkill) {
                    combat.playerSkill(combat.selectedSkill);
                } else {
                    combat.playerAttack(combat.selectedAttackSlot || 'weaponMain');
                }
            } else if (combat.selectedSkill && combat.selectedSkill.isAoE) {
                Engine.emit('combatLog', { msg: 'Selecione um inimigo como alvo para a área.', type: 'log-system' });
            } else {
                Engine.emit('combatLog', { msg: 'Nenhum alvo válido selecionado no mapa.', type: 'log-system' });
            }
            return;
        }

        // Clicking a monster directly selects it as current target
        const clickedMonster = combat.monsters.findIndex(m => m.hp > 0 && m.gridX === x && m.gridY === y);
        if (clickedMonster !== -1) {
            combat.setTarget(clickedMonster);
        }
    }

    handleCanvasClick(e) {
        if (!window.gameCombat || !window.gameCombat.inCombat || !this.elCombatCanvas) return;

        const rect = this.elCombatCanvas.getBoundingClientRect();
        const scaleX = this.elCombatCanvas.width / (rect.width || this.elCombatCanvas.width);
        const scaleY = this.elCombatCanvas.height / (rect.height || this.elCombatCanvas.height);

        const x = Math.floor(((e.clientX - rect.left) * scaleX) / (this.elCombatCanvas.width / window.gameCombat.gridWidth));
        const y = Math.floor(((e.clientY - rect.top) * scaleY) / (this.elCombatCanvas.height / window.gameCombat.gridHeight));

        this.handleGridTileClick(x, y);
    }

    handleCanvasMouseMove(e) {
        if (!window.gameCombat || !window.gameCombat.inCombat || !this.elCombatCanvas) return;

        const rect = this.elCombatCanvas.getBoundingClientRect();
        const scaleX = this.elCombatCanvas.width / (rect.width || this.elCombatCanvas.width);
        const scaleY = this.elCombatCanvas.height / (rect.height || this.elCombatCanvas.height);

        const hx = Math.floor(((e.clientX - rect.left) * scaleX) / (this.elCombatCanvas.width / window.gameCombat.gridWidth));
        const hy = Math.floor(((e.clientY - rect.top) * scaleY) / (this.elCombatCanvas.height / window.gameCombat.gridHeight));

        if (hx !== this.hoverX || hy !== this.hoverY) {
            this.handleGridTileHover(hx, hy);
        }
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
            btnMain.textContent = `${wMain.name} (Dano: ${wMain.minDmg}-${wMain.maxDmg}, Alcance: ${wMain.range || 1})`;
        } else {
            btnMain.textContent = `Soco (Dano: 1-2, Alcance: 1)`;
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
                btnOff.textContent = `🛡️ Posição de Defesa (${wOff.name})`;
                btnOff.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.activateDefenseStance();
                };
            } else {
                const offMin = Math.floor((wOff.minDmg || 0) * 0.5);
                const offMax = Math.floor((wOff.maxDmg || 0) * 0.5);
                btnOff.textContent = `${wOff.name} (Dano: ${offMin}-${offMax}, Alcance: ${wOff.range || 1})`;
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
        cancelBtn.textContent = 'Cancelar';
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
            const emptyMsg = document.createElement('span');
            emptyMsg.style.color = 'var(--text-muted)';
            emptyMsg.textContent = 'Nenhuma habilidade disponível. Escolha uma classe na aba Personagem!';
            this.elCombatSkillsList.appendChild(emptyMsg);
        } else {
            skills.forEach(skill => {
                const btn = document.createElement('button');
                const elemTag = skill.element ? ` [${skill.element}]` : '';
                btn.textContent = `${skill.name}${elemTag} (${skill.manaCost} MP)`;
                btn.title = skill.desc || `Alcance: ${skill.range || 1}`;
                if (p.mana < skill.manaCost) {
                    btn.disabled = true;
                }
                btn.onclick = () => {
                    this.hideCombatMenus();
                    if (skill.type === 'heal') {
                        if (window.gameParty.length > 1 && !skill.isAoE) {
                            this.showPartyTargetMenu(skill);
                        } else {
                            window.gameCombat.playerSkill(skill, 0);
                        }
                    } else if (skill.type === 'buff' || skill.type === 'buff_taunt' || skill.type === 'taunt') {
                        window.gameCombat.playerSkill(skill);
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
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatSkillsList.appendChild(cancelBtn);

        this.elCombatSkillsMenu.classList.remove('hidden');
    }

    showPartyTargetMenu(skill) {
        this.elCombatSkillsList.innerHTML = `<h4>Escolha o alvo para ${skill.name}</h4>`;
        window.gameParty.forEach((member, idx) => {
            if (member.hp > 0 || skill.name.includes('Ressurreição') || skill.revive) {
                const btn = document.createElement('button');
                btn.textContent = `${member.name} (HP: ${member.hp}/${member.getMaxHp()})`;
                btn.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.playerSkill(skill, idx);
                };
                this.elCombatSkillsList.appendChild(btn);
            }
        });
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatSkillsList.appendChild(cancelBtn);
        this.elCombatSkillsMenu.classList.remove('hidden');
    }

    showCombatItemsMenu() {
        if (!this.elCombatItemsMenu || !window.gameInventory) return;
        this.elCombatItemsList.innerHTML = '';

        const potions = window.gameInventory.items.filter(i => i.type === 'potion');

        const grouped = {};
        potions.forEach(p => {
            if (!grouped[p.id]) {
                grouped[p.id] = { count: 0, instanceId: p.instanceId, name: p.name, desc: p.desc || '' };
            }
            grouped[p.id].count += (p.count || 1);
        });

        if (Object.keys(grouped).length === 0) {
            const msg = document.createElement('span');
            msg.style.color = 'var(--text-muted)';
            msg.textContent = 'Nenhum item disponível.';
            this.elCombatItemsList.appendChild(msg);
        } else {
            Object.values(grouped).forEach(g => {
                const btn = document.createElement('button');
                btn.textContent = `${g.name} (x${g.count})`;
                if (g.desc) btn.title = g.desc;
                btn.onclick = () => {
                    this.hideCombatMenus();
                    window.gameCombat.usePotion(g.instanceId);
                };
                this.elCombatItemsList.appendChild(btn);
            });
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.className = 'danger';
        cancelBtn.onclick = () => this.hideCombatMenus();
        this.elCombatItemsList.appendChild(cancelBtn);

        this.elCombatItemsMenu.classList.remove('hidden');
    }

    showCombatScreen(monsters) {
        const combatNavBtn = document.querySelector('[data-target="screen-combat"]');
        if (combatNavBtn) combatNavBtn.click();
        this.hideCombatMenus();

        this._unitVisualPos = {};
        this._vfxEffects = [];
        this._floatingCanvasTexts = [];
        if (this.elBossPhaseBanner) this.elBossPhaseBanner.classList.add('hidden');

        if (!window.gameCombat || !window.gameCombat.isInfiniteMode || window.gameCombat.infiniteWave === 1) {
            if (this.elCombatLog) this.elCombatLog.innerHTML = '';
        }

        if (this.elCombatActiveEffects) {
            this.elCombatActiveEffects.innerHTML = '';
            this.elCombatActiveEffects.style.display = 'none';
        }

        const combatTitle = document.getElementById('combat-title');
        if (combatTitle) {
            if (window.gameCombat && window.gameCombat.isInfiniteMode) {
                combatTitle.textContent = `🔥 Batalha de Ondas Infinitas - Onda ${window.gameCombat.infiniteWave} 🔥`;
                combatTitle.style.color = 'var(--rarity-legendary)';
            } else {
                combatTitle.textContent = 'Combate Tático';
                combatTitle.style.color = 'inherit';
            }
        }

        this.renderCombatMonsters(monsters);

        if (this.btnMove) this.btnMove.disabled = false;
        if (this.btnAttack) this.btnAttack.disabled = false;
        if (this.btnSkill) this.btnSkill.disabled = false;
        if (this.btnFlee) this.btnFlee.disabled = false;
        if (this.btnPotion) this.btnPotion.disabled = false;

        if (!this.userToggledMode) {
            this.use3D = this.isWebGLReady();
        }

        this.updateUltimateButton();
        this.startRenderLoop();

        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() => this.applyArenaMode());
        } else {
            this.applyArenaMode();
        }
    }

    updateUltimateButton() {
        if (!this.btnUltimate) return;
        const combat = window.gameCombat;
        const isPlayerTurn = Boolean(combat && combat.inCombat && combat.currentTurnEntity?.type === 'player' && !combat.isProcessingTurn);
        const p = isPlayerTurn ? window.gameParty?.[combat.currentTurnEntity.index] : window.gameParty?.[0];

        const fury = Math.max(0, Math.min(100, Math.floor(p?.fury || 0)));
        const ultInfo = window.GameMechanics?.getUltimateForClass?.(p?.playerClass)
            || window.GameMechanics?.ULTIMATES?.[p?.playerClass]
            || { name: 'Supremo' };

        if (this.elUltimateFill) {
            this.elUltimateFill.style.width = `${fury}%`;
        }
        if (this.elUltimateLabel) {
            this.elUltimateLabel.textContent = fury >= 100
                ? `⚡ ${ultInfo.name} (PRONTO!)`
                : `⚡ Supremo (${fury}%)`;
        }

        const canCast = isPlayerTurn && fury >= 100 && typeof combat.useUltimate === 'function';
        this.btnUltimate.disabled = !canCast;
        this.btnUltimate.classList.toggle('ready', canCast);
        this.btnUltimate.title = ultInfo.desc ? `${ultInfo.name}: ${ultInfo.desc}` : `${ultInfo.name} (Requer 100 de Fúria)`;
    }

    getEmojiForClass(className) {
        const map = {
            'Guerreiro': '⚔️',
            'Caçador': '🏹',
            'Guardião': '🛡️',
            'Mago': '🔮',
            'Clérigo': '✨',
            'Nenhuma': '🧍'
        };
        return map[className] || '🧍';
    }

    getEmojiForMonster(monster) {
        const nameLower = (monster.name || '').toLowerCase();
        const typeLower = (monster.type || '').toLowerCase();

        if (nameLower.includes('goblin') || typeLower.includes('goblin')) return '👺';
        if (nameLower.includes('esqueleto') || typeLower.includes('esqueleto')) return '💀';
        if (nameLower.includes('zumbi') || typeLower.includes('zumbi')) return '🧟';
        if (nameLower.includes('aranha') || typeLower.includes('aranha')) return '🕷️';
        if (nameLower.includes('lobo') || nameLower.includes('lobisomem') || typeLower.includes('lobo')) return '🐺';
        if (nameLower.includes('vampiro') || typeLower.includes('vampiro')) return '🧛';
        if (nameLower.includes('minotauro') || typeLower.includes('minotauro')) return '🐂';
        if (nameLower.includes('banshee') || typeLower.includes('banshee')) return '👻';
        if (nameLower.includes('cérbero') || nameLower.includes('cerbero')) return '🐕';
        if (nameLower.includes('hidra') || typeLower.includes('hidra')) return '🐍';
        if (nameLower.includes('demônio') || nameLower.includes('demonio') || typeLower.includes('demônio')) return '👿';
        if (nameLower.includes('dragão') || nameLower.includes('dragao') || typeLower.includes('dragão')) return '🐲';
        if (nameLower.includes('lorde') || typeLower.includes('vazio')) return '👁️';

        return '👾';
    }

    renderStatusPillsHTML(entity) {
        const statuses = entity?.statusEffects;
        if (!Array.isArray(statuses) || statuses.length === 0) return '';

        const dict = window.GameMechanics?.STATUS_EFFECTS || {};
        const fallbackIcons = {
            burn: { icon: '🔥', name: 'Queimadura', color: '#f97316' },
            poison: { icon: '☠️', name: 'Veneno', color: '#22c55e' },
            frost: { icon: '❄️', name: 'Congelado', color: '#38bdf8' },
            shock: { icon: '⚡', name: 'Choque', color: '#facc15' },
            bleed: { icon: '🩸', name: 'Sangramento', color: '#ef4444' },
            shield: { icon: '🛡️', name: 'Escudo', color: '#60a5fa' },
            blessing: { icon: '✨', name: 'Bênção', color: '#fde047' },
            stun: { icon: '💫', name: 'Atordoado', color: '#c084fc' }
        };

        const pills = statuses.map(s => {
            const id = typeof s === 'string' ? s : s.id;
            const meta = dict[id] || fallbackIcons[id] || { icon: '✦', name: id, color: '#cbd5e1' };
            const dur = s.duration !== undefined ? ` ${s.duration}t` : '';
            const title = meta.desc ? `${meta.name}: ${meta.desc}` : meta.name;
            return `<span class="status-pill" style="color:${meta.color};" title="${title}">${meta.icon} ${meta.name}${dur}</span>`;
        }).join('');

        return `<div class="status-badges-row">${pills}</div>`;
    }

    renderCombatMonsters(monsters) {
        if (!this.elCombatMonstersContainer) return;
        this.elCombatMonstersContainer.innerHTML = '';
        const targetIndex = window.gameCombat ? window.gameCombat.targetIndex : 0;

        const livingMonsters = [];
        const deadMonsters = [];

        monsters.forEach((monster, index) => {
            const mPct = Math.max(0, Math.min(100, (monster.hp / Math.max(1, monster.maxHp)) * 100));
            const isDead = monster.hp <= 0;
            const isTarget = index === targetIndex && !isDead;
            const isPhase2 = monster.phase === 2 || monster.phase2Triggered;
            const emoji = this.getEmojiForMonster(monster);

            const card = document.createElement('div');
            card.className = `monster-card ${isTarget ? 'target' : ''} ${isDead ? 'dead' : ''} ${isPhase2 ? 'boss-phase2' : ''}`;
            card.id = `monster-card-${monster.instanceId}`;
            card.onclick = () => {
                if (!isDead && window.gameCombat) {
                    if (window.gameCombat.isSelectingTarget) {
                        window.gameCombat.setTarget(index);
                        if (window.gameCombat.selectedSkill) {
                            window.gameCombat.playerSkill(window.gameCombat.selectedSkill);
                        } else {
                            window.gameCombat.playerAttack(window.gameCombat.selectedAttackSlot || 'weaponMain');
                        }
                    } else {
                        window.gameCombat.setTarget(index);
                    }
                }
            };

            let weaknessText = '';
            if (monster.weakness && monster.weakness.length > 0) {
                weaknessText = `<div class="monster-weaknesses" style="font-size:0.75em; color:var(--rarity-uncommon); margin-top:0.2rem;">Fraquezas: ${monster.weakness.join(', ')}</div>`;
            }

            const phaseBadge = isPhase2
                ? `<div style="font-size:0.7rem; font-weight:800; color:#fca5a5; letter-spacing:1px;">🔥 FASE 2 DESPERTADA</div>`
                : '';

            const shieldText = monster.shield > 0 ? ` <span style="color:#60a5fa;">(🛡️${monster.shield})</span>` : '';

            card.innerHTML = `
                ${phaseBadge}
                <h3 style="font-size:1em; margin-bottom:0.2rem">${emoji} Nv.${monster.level} ${monster.name}</h3>
                <div class="health-bar-container"><div class="health-bar" style="width: ${mPct}%"></div></div>
                <div class="bar-meta"><span>HP</span><span>${monster.hp} / ${monster.maxHp}${shieldText}</span></div>
                ${weaknessText}
                ${this.renderStatusPillsHTML(monster)}
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
        this.stopRenderLoop();
        this.arena3D?.setVisible?.(false);

        if (this.btnMove) this.btnMove.disabled = true;
        if (this.btnAttack) this.btnAttack.disabled = true;
        if (this.btnSkill) this.btnSkill.disabled = true;
        if (this.btnUltimate) this.btnUltimate.disabled = true;
        if (this.btnFlee) this.btnFlee.disabled = true;
        if (this.btnPotion) this.btnPotion.disabled = true;
        this.hideCombatMenus();

        if (victory) {
            this.ui.showToast('Vitória! Retornando ao mapa...');
        } else {
            this.ui.showToast('Fuga ou Derrota. Retornando ao mapa...');
        }

        setTimeout(() => {
            const mapNavBtn = document.querySelector('[data-target="screen-map"]');
            if (mapNavBtn) mapNavBtn.click();
            if (this.ui && this.ui.selectedLocId) {
                this.ui.renderRegionDetails(this.ui.selectedLocId);
            }
        }, 2000);
    }

    updateInstruction() {
        if (!this.elCombatInstruction || !window.gameCombat || !window.gameCombat.inCombat) return;

        if (window.gameCombat.isSelectingMove) {
            this.elCombatInstruction.textContent = `Selecione no grid para mover (Movimento restante: ${window.gameCombat.movementRemaining})`;
            this.elCombatInstruction.style.display = 'block';
        } else if (window.gameCombat.isSelectingTarget) {
            if (window.gameCombat.selectedSkill) {
                if (window.gameCombat.selectedSkill.type === 'terrain') {
                    this.elCombatInstruction.textContent = `Selecione uma célula no grid para criar ${window.gameCombat.selectedSkill.name}`;
                } else {
                    this.elCombatInstruction.textContent = `Selecione um alvo no grid para usar ${window.gameCombat.selectedSkill.name}`;
                }
            } else {
                this.elCombatInstruction.textContent = `Selecione um alvo no grid para Atacar`;
            }
            this.elCombatInstruction.style.display = 'block';
        } else {
            this.elCombatInstruction.style.display = 'none';
        }
    }

    // =========================================================
    // 60FPS 2D CANVAS ANIMATION & VFX ENGINE
    // =========================================================
    startRenderLoop() {
        if (this._rafId || typeof requestAnimationFrame === 'undefined') return;
        this._lastFrameTime = performance.now();

        const tick = (now) => {
            if (!window.gameCombat || !window.gameCombat.inCombat || !this.elCombatScreen?.classList.contains('active')) {
                this._rafId = null;
                return;
            }
            const dt = Math.min(0.05, Math.max(0.001, (now - this._lastFrameTime) / 1000));
            this._lastFrameTime = now;

            if (!this.use3D) {
                this.step2DAnimations(dt, now);
                this.drawGrid(now);
            }
            this._rafId = requestAnimationFrame(tick);
        };

        this._rafId = requestAnimationFrame(tick);
    }

    stopRenderLoop() {
        if (this._rafId && typeof cancelAnimationFrame !== 'undefined') {
            cancelAnimationFrame(this._rafId);
        }
        this._rafId = null;
    }

    getUnitVisualKey(entity, isPlayer, idx) {
        if (isPlayer) return `player_${idx}`;
        return entity.instanceId || `monster_${idx}`;
    }

    getVisualPos(key, gridX, gridY) {
        if (!this._unitVisualPos[key]) {
            this._unitVisualPos[key] = { x: gridX, y: gridY, pathQueue: [] };
        }
        return this._unitVisualPos[key];
    }

    handleCombatMove(move) {
        if (!move) return;
        const path = move.path || move.pathCoords || [];
        if (path.length === 0) return;

        let key = move.entityId;
        if (!key && move.entity && window.gameCombat) {
            const pIdx = window.gameCombat.party.indexOf(move.entity);
            if (pIdx !== -1) key = `player_${pIdx}`;
            else key = move.entity.instanceId;
        }
        if (key) {
            const vp = this.getVisualPos(key, path[0].x, path[0].y);
            vp.pathQueue = path.map(pt => ({ x: pt.x, y: pt.y }));
        }

        if (this.arena3D && this.use3D) {
            const entityId = move.entityId || move.entity?.instanceId || key;
            this.arena3D.animateMove?.(entityId, path);
        }
    }

    triggerScreenShake() {
        const target = this.elCombatCanvasContainer || this.elCombatScreen;
        if (!target) return;
        target.classList.remove('screen-shake');
        void target.offsetWidth;
        target.classList.add('screen-shake');
        setTimeout(() => target.classList.remove('screen-shake'), 450);
    }

    showBossPhaseBanner(data) {
        if (!this.elBossPhaseBanner) return;
        const boss = data?.monster || data?.boss || data || {};
        const name = boss.phase2Name || boss.name || 'Chefe';
        const dialogue = data?.dialogue || boss.phase2Dialogue || 'O poder do Abismo desperta sem limites!';

        if (this.elBossPhaseTitle) this.elBossPhaseTitle.textContent = `${name} — FASE 2!`;
        if (this.elBossPhaseDialogue) this.elBossPhaseDialogue.textContent = `"${dialogue}"`;

        this.elBossPhaseBanner.classList.remove('hidden');
        this.triggerScreenShake();

        if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
        this._bannerTimeout = setTimeout(() => {
            this.elBossPhaseBanner?.classList.add('hidden');
        }, 4800);
    }

    handleCombatVFX(vfx) {
        if (!vfx) return;

        // Forward to 3D Arena if active (normalize aliases and unit IDs for Scene3D.CombatArena)
        if (this.use3D && this.arena3D) {
            const type3dMap = { aoe_burst: 'aoe', magic_bolt: 'projectile' };
            const mappedVfx = { ...vfx };
            if (type3dMap[vfx.type]) {
                mappedVfx.type = type3dMap[vfx.type];
            }
            if (!mappedVfx.sourceId) {
                const isMonsterSource = window.gameCombat?.currentTurnEntity?.type === 'monster' && vfx.monsterId;
                if (isMonsterSource) mappedVfx.sourceId = vfx.monsterId;
                else if (vfx.playerIndex !== undefined) mappedVfx.sourceId = `player_${vfx.playerIndex}`;
                else if (vfx.monsterId) mappedVfx.sourceId = vfx.monsterId;
            }
            if (!mappedVfx.targetId) {
                const isMonsterSource = mappedVfx.sourceId === vfx.monsterId;
                if (isMonsterSource && vfx.playerIndex !== undefined) mappedVfx.targetId = `player_${vfx.playerIndex}`;
                else if (!isMonsterSource && vfx.monsterId) mappedVfx.targetId = vfx.monsterId;
            }
            this.arena3D.playVFX?.(mappedVfx);
        }

        if (vfx.isCrit || vfx.type === 'ultimate' || vfx.type === 'boss_phase2' || vfx.shake) {
            this.triggerScreenShake();
        }

        const from = vfx.from || (vfx.fromX !== undefined ? { x: vfx.fromX, y: vfx.fromY } : null);
        const to = vfx.to || (vfx.toX !== undefined ? { x: vfx.toX, y: vfx.toY } : null);
        const elementColors = {
            fogo: '#f97316',
            fire: '#f97316',
            gelo: '#38bdf8',
            ice: '#38bdf8',
            raio: '#facc15',
            lightning: '#facc15',
            sagrado: '#fef08a',
            holy: '#fef08a',
            veneno: '#22c55e',
            poison: '#22c55e',
            trevas: '#a855f7',
            dark: '#a855f7',
            arcano: '#c084fc',
            heal: '#4ade80',
            shield: '#60a5fa',
            physical: '#f8fafc',
            fisico: '#f8fafc'
        };
        const rawColor = typeof vfx.color === 'number'
            ? '#' + vfx.color.toString(16).padStart(6, '0')
            : vfx.color;
        const color = rawColor || elementColors[vfx.element] || elementColors[vfx.type] || '#fbbf24';

        if (from && to && (from.x !== to.x || from.y !== to.y)) {
            this._vfxEffects.push({
                kind: 'projectile',
                fromX: from.x,
                fromY: from.y,
                toX: to.x,
                toY: to.y,
                color,
                element: vfx.element || vfx.type || 'physical',
                progress: 0,
                duration: vfx.type === 'ultimate' ? 0.38 : 0.25
            });
        }

        const impactTargets = Array.isArray(vfx.targets) && vfx.targets.length > 0
            ? vfx.targets
            : (to ? [to] : (from ? [from] : []));

        impactTargets.forEach(pt => {
            const tx = pt.x ?? pt.gridX;
            const ty = pt.y ?? pt.gridY;
            if (tx === undefined || ty === undefined) return;

            this._vfxEffects.push({
                kind: 'shockwave',
                x: tx,
                y: ty,
                color,
                radiusTiles: vfx.radius || (vfx.type === 'ultimate' || vfx.type === 'boss_phase2' ? 3 : 1.2),
                progress: 0,
                duration: 0.48
            });

            const particleCount = (vfx.type === 'ultimate' || vfx.type === 'combo' || vfx.type === 'boss_phase2') ? 18 : 10;
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.4;
                const speed = 1.4 + Math.random() * 2.8;
                this._vfxEffects.push({
                    kind: 'particle',
                    x: tx + 0.5,
                    y: ty + 0.5,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color,
                    size: 2 + Math.random() * 3.5,
                    progress: 0,
                    duration: 0.4 + Math.random() * 0.25
                });
            }
        });

        const label = vfx.reaction || vfx.comboName || vfx.ultimateName || vfx.label;
        if (label && (to || from)) {
            const pos = to || from;
            this._floatingCanvasTexts.push({
                x: pos.x,
                y: pos.y,
                text: label,
                color: (vfx.reaction || vfx.comboName) ? '#e879f9' : color,
                scale: (vfx.reaction || vfx.comboName || vfx.ultimateName || vfx.isCrit) ? 1.25 : 1.0,
                progress: 0,
                duration: 1.05
            });
        }
    }

    step2DAnimations(dt) {
        const combat = window.gameCombat;
        if (!combat) return;

        // Smooth unit interpolation along queued path or direct lerp
        const updateUnit = (entity, key) => {
            const vp = this.getVisualPos(key, entity.gridX, entity.gridY);
            if (vp.pathQueue.length > 0) {
                const next = vp.pathQueue[0];
                const dx = next.x - vp.x;
                const dy = next.y - vp.y;
                const dist = Math.hypot(dx, dy);
                const step = dt * 11;
                if (dist <= step) {
                    vp.x = next.x;
                    vp.y = next.y;
                    vp.pathQueue.shift();
                } else {
                    vp.x += (dx / dist) * step;
                    vp.y += (dy / dist) * step;
                }
            } else {
                const lerp = Math.min(1, dt * 14);
                vp.x += (entity.gridX - vp.x) * lerp;
                vp.y += (entity.gridY - vp.y) * lerp;
            }
        };

        combat.party.forEach((p, idx) => updateUnit(p, `player_${idx}`));
        combat.monsters.forEach((m, idx) => updateUnit(m, this.getUnitVisualKey(m, false, idx)));

        // Advance VFX
        for (let i = this._vfxEffects.length - 1; i >= 0; i--) {
            const eff = this._vfxEffects[i];
            eff.progress += dt / eff.duration;
            if (eff.kind === 'particle') {
                eff.x += eff.vx * dt;
                eff.y += eff.vy * dt;
            }
            if (eff.progress >= 1) {
                this._vfxEffects.splice(i, 1);
            }
        }

        // Advance Floating Canvas Text
        for (let i = this._floatingCanvasTexts.length - 1; i >= 0; i--) {
            const ft = this._floatingCanvasTexts[i];
            ft.progress += dt / ft.duration;
            if (ft.progress >= 1) {
                this._floatingCanvasTexts.splice(i, 1);
            }
        }
    }

    drawGrid(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
        if (!this.ctx || !window.gameCombat || !window.gameCombat.inCombat || !this.elCombatCanvas) return;

        this.updateInstruction();

        const ctx = this.ctx;
        const gw = window.gameCombat.gridWidth;
        const gh = window.gameCombat.gridHeight;
        const W = this.elCombatCanvas.width;
        const H = this.elCombatCanvas.height;
        const cellW = W / gw;
        const cellH = H / gh;
        const tSec = now / 1000;

        ctx.clearRect(0, 0, W, H);

        // Biome-themed animated floor tiles
        const theme = this.getCombatTheme();
        const palettes = {
            forest: ['#152518', '#1a2e1e'],
            cave: ['#141620', '#1a1d2b'],
            ruins: ['#22242c', '#292c36'],
            volcano: ['#261515', '#301a18'],
            abyss: ['#150e24', '#1d1332']
        };
        const pal = palettes[theme] || palettes.forest;

        for (let y = 0; y < gh; y++) {
            for (let x = 0; x < gw; x++) {
                ctx.fillStyle = (x + y) % 2 === 0 ? pal[0] : pal[1];
                ctx.fillRect(x * cellW, y * cellH, cellW, cellH);

                const shimmer = 0.04 + 0.03 * Math.sin(tSec * 2 + x * 0.6 + y * 0.8);
                ctx.fillStyle = theme === 'volcano'
                    ? `rgba(255, 100, 40, ${shimmer})`
                    : theme === 'abyss'
                        ? `rgba(168, 85, 247, ${shimmer})`
                        : `rgba(255, 255, 255, ${shimmer * 0.45})`;
                ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            }
        }

        // Grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.lineWidth = 1;
        for (let x = 0; x <= gw; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellW, 0);
            ctx.lineTo(x * cellW, H);
            ctx.stroke();
        }
        for (let y = 0; y <= gh; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellH);
            ctx.lineTo(W, y * cellH);
            ctx.stroke();
        }

        // Animated Active Terrains
        if (window.gameCombat.activeTerrains) {
            window.gameCombat.activeTerrains.forEach(terrain => {
                const tx = terrain.x * cellW;
                const ty = terrain.y * cellH;
                const pulse = 0.25 + 0.14 * Math.sin(tSec * 4 + terrain.x + terrain.y);
                let terrainColor = `rgba(249, 115, 22, ${pulse})`;
                let glyph = '🔥';
                if (terrain.type === 'ice') {
                    terrainColor = `rgba(56, 189, 248, ${pulse})`;
                    glyph = '❄️';
                } else if (terrain.type === 'healing' || terrain.type === 'blessing' || terrain.type === 'holy') {
                    terrainColor = `rgba(250, 204, 21, ${pulse})`;
                    glyph = '✨';
                } else if (terrain.type === 'wall') {
                    terrainColor = 'rgba(120, 80, 40, 0.68)';
                    glyph = '🧱';
                } else if (terrain.type === 'spikes' || terrain.type === 'mine') {
                    terrainColor = `rgba(168, 85, 247, ${pulse})`;
                    glyph = terrain.type === 'mine' ? '💣' : '🔺';
                } else if (terrain.type === 'void') {
                    terrainColor = `rgba(126, 34, 206, ${pulse + 0.1})`;
                    glyph = '🌀';
                }

                ctx.fillStyle = terrainColor;
                ctx.fillRect(tx, ty, cellW, cellH);
                ctx.font = `${Math.floor(Math.min(cellW, cellH) * 0.45)}px Segoe UI Emoji, Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(glyph, tx + cellW / 2, ty + cellH / 2);
            });
        }

        // Range Highlights (Move / Attack)
        if (window.gameCombat.isSelectingMove && window.gameCombat.currentTurnEntity?.type === 'player') {
            const p = window.gameParty[window.gameCombat.currentTurnEntity.index];
            const glow = 0.18 + 0.08 * Math.sin(tSec * 5);
            ctx.fillStyle = `rgba(16, 185, 129, ${glow})`;
            for (let x = 0; x < gw; x++) {
                for (let y = 0; y < gh; y++) {
                    const dist = Math.abs(p.gridX - x) + Math.abs(p.gridY - y);
                    if (dist <= window.gameCombat.movementRemaining) {
                        ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
                    }
                }
            }
        } else if (window.gameCombat.isSelectingTarget && window.gameCombat.currentTurnEntity?.type === 'player') {
            const p = window.gameParty[window.gameCombat.currentTurnEntity.index];
            let attackRange = 1;
            if (window.gameCombat.selectedSkill) {
                attackRange = window.gameCombat.selectedSkill.range || 4;
            } else {
                const slot = window.gameCombat.selectedAttackSlot || 'weaponMain';
                if (p.equipment?.[slot] && p.equipment[slot].range !== undefined) {
                    attackRange = p.equipment[slot].range;
                }
            }

            const glow = 0.18 + 0.08 * Math.sin(tSec * 5);
            ctx.fillStyle = `rgba(239, 68, 68, ${glow})`;
            for (let x = 0; x < gw; x++) {
                for (let y = 0; y < gh; y++) {
                    const dist = Math.abs(p.gridX - x) + Math.abs(p.gridY - y);
                    if (dist <= attackRange) {
                        ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
                    }
                }
            }
        }

        // Hover Cell + AoE Preview
        if (this.hoverX !== undefined && this.hoverY !== undefined && this.hoverX >= 0 && this.hoverX < gw && this.hoverY >= 0 && this.hoverY < gh) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.fillRect(this.hoverX * cellW, this.hoverY * cellH, cellW, cellH);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.hoverX * cellW + 1, this.hoverY * cellH + 1, cellW - 2, cellH - 2);
        }

        // Draw Entities (smooth visual coords + HP mini-bar + status icons)
        const drawEntity = (entity, key, color, label, isTurn, emoji, isBossPhase2) => {
            if (entity.hp <= 0) return;
            const vp = this.getVisualPos(key, entity.gridX, entity.gridY);
            const cx = vp.x * cellW + cellW / 2;
            const cy = vp.y * cellH + cellH / 2;
            const r = Math.min(cellW, cellH) * 0.38;

            // Ground shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + r * 0.85, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();

            if (isTurn) {
                const ringR = r * (1.35 + 0.14 * Math.sin(tSec * 6));
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (isBossPhase2) {
                ctx.fillStyle = 'rgba(220, 38, 38, 0.32)';
                ctx.beginPath();
                ctx.arc(cx, cy, r * 1.45, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isTurn ? '#fde047' : '#e2e8f0';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = `${Math.floor(Math.min(cellW, cellH) * 0.48)}px Segoe UI Emoji, Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji || label, cx, cy);

            // Mini HP Bar
            const maxHp = typeof entity.getMaxHp === 'function' ? entity.getMaxHp() : (entity.maxHp || 1);
            const hpPct = Math.max(0, Math.min(1, entity.hp / Math.max(1, maxHp)));
            const barW = cellW * 0.86;
            const barH = 4;
            const barX = cx - barW / 2;
            const barY = cy + r + 2;
            ctx.fillStyle = '#090b10';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = key.startsWith('player') ? '#22c55e' : '#ef4444';
            ctx.fillRect(barX, barY, barW * hpPct, barH);

            // Status Mini-Icons
            if (Array.isArray(entity.statusEffects) && entity.statusEffects.length > 0) {
                const dict = window.GameMechanics?.STATUS_EFFECTS || {};
                const sIcon = (s) => dict[s.id || s]?.icon || '✦';
                const icons = entity.statusEffects.slice(0, 3).map(sIcon).join('');
                ctx.font = '10px Segoe UI Emoji, Arial';
                ctx.fillText(icons, cx, cy - r - 5);
            }
        };

        window.gameCombat.party.forEach((p, idx) => {
            const isTurn = window.gameCombat.currentTurnEntity?.type === 'player' && window.gameCombat.currentTurnEntity.index === idx;
            const emoji = this.getEmojiForClass(p.playerClass);
            drawEntity(p, `player_${idx}`, '#1d4ed8', p.name.substring(0, 2), isTurn, emoji, false);
        });

        window.gameCombat.monsters.forEach((m, idx) => {
            const isTurn = window.gameCombat.currentTurnEntity?.type === 'monster' && window.gameCombat.currentTurnEntity.index === idx;
            const emoji = this.getEmojiForMonster(m);
            const isPhase2 = Boolean(m.phase === 2 || m.phase2Triggered);
            drawEntity(m, this.getUnitVisualKey(m, false, idx), isPhase2 ? '#7f1d1d' : '#991b1b', m.name.substring(0, 2), isTurn, emoji, isPhase2);
        });

        // Draw VFX Layer
        this._vfxEffects.forEach(eff => {
            const alpha = Math.max(0, 1 - eff.progress);
            ctx.save();
            ctx.globalAlpha = alpha;
            if (eff.kind === 'projectile') {
                const curX = (eff.fromX + (eff.toX - eff.fromX) * eff.progress + 0.5) * cellW;
                const curY = (eff.fromY + (eff.toY - eff.fromY) * eff.progress + 0.5) * cellH;
                ctx.fillStyle = eff.color;
                ctx.shadowColor = eff.color;
                ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.arc(curX, curY, 6, 0, Math.PI * 2);
                ctx.fill();
            } else if (eff.kind === 'shockwave') {
                const sx = (eff.x + 0.5) * cellW;
                const sy = (eff.y + 0.5) * cellH;
                const radiusPx = (0.3 + eff.progress * eff.radiusTiles) * Math.min(cellW, cellH);
                ctx.strokeStyle = eff.color;
                ctx.lineWidth = 3 * alpha + 1;
                ctx.beginPath();
                ctx.arc(sx, sy, radiusPx, 0, Math.PI * 2);
                ctx.stroke();
            } else if (eff.kind === 'particle') {
                ctx.fillStyle = eff.color;
                ctx.beginPath();
                ctx.arc(eff.x * cellW, eff.y * cellH, eff.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });

        // Draw Floating Canvas Text
        this._floatingCanvasTexts.forEach(ft => {
            const alpha = Math.max(0, 1 - ft.progress);
            const fx = (ft.x + 0.5) * cellW;
            const fy = (ft.y + 0.2) * cellH - ft.progress * 32;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `900 ${Math.round(14 * ft.scale)}px Segoe UI, Arial`;
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(ft.text, fx, fy);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, fx, fy);
            ctx.restore();
        });
    }

    updateActiveEffects() {
        if (!this.elCombatActiveEffects || !window.gameCombat || !window.gameCombat.inCombat) return;

        const effectsHTML = [];

        if (window.gameCombat.activeTerrains && window.gameCombat.activeTerrains.length > 0) {
            window.gameCombat.activeTerrains.forEach(t => {
                effectsHTML.push(`<span style="color: var(--rarity-epic);">🌋 ${t.type.toUpperCase()} (${t.x},${t.y}) [${t.duration}t]</span>`);
            });
        }

        if (window.gameCombat.monsters) {
            window.gameCombat.monsters.forEach(m => {
                if (m.hp > 0 && m.tauntedBy && m.tauntDuration > 0) {
                    effectsHTML.push(`<span style="color: var(--rarity-legendary);">😠 ${m.name} provocado por ${m.tauntedBy.name} [${m.tauntDuration}t]</span>`);
                }
            });
        }

        if (window.gameCombat.party) {
            window.gameCombat.party.forEach(p => {
                if (p.hp > 0 && p.defenseBuffDuration > 0) {
                    effectsHTML.push(`<span style="color: #4ade80;">🛡️ ${p.name} Defesa [${p.defenseBuffDuration}t]</span>`);
                }
            });
        }

        if (effectsHTML.length > 0) {
            this.elCombatActiveEffects.innerHTML = `<strong>Efeitos Ativos:</strong> ` + effectsHTML.join(' · ');
            this.elCombatActiveEffects.style.display = 'block';
        } else {
            this.elCombatActiveEffects.innerHTML = '';
            this.elCombatActiveEffects.style.display = 'none';
        }
    }

    renderCombatStats(data) {
        const party = data.party || window.gameParty || [];
        const monsters = data.monsters;

        const combatTitle = document.getElementById('combat-title');
        if (combatTitle) {
            if (window.gameCombat && window.gameCombat.isInfiniteMode) {
                combatTitle.textContent = `🔥 Batalha de Ondas Infinitas - Onda ${window.gameCombat.infiniteWave} 🔥`;
                combatTitle.style.color = 'var(--rarity-legendary)';
            } else {
                combatTitle.textContent = 'Combate Tático';
                combatTitle.style.color = 'inherit';
            }
        }

        if (!this.elCombatPartyContainer) return;
        this.elCombatPartyContainer.innerHTML = '';

        if (!this.use3D) this.drawGrid();
        this.sync3DState();
        this.updateActiveEffects();
        this.updateUltimateButton();

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

            const maxHp = Math.max(1, p.getMaxHp());
            const maxMana = Math.max(1, p.getMaxMana());
            const pPct = Math.max(0, Math.min(100, (p.hp / maxHp) * 100));
            const mPct = Math.max(0, Math.min(100, (p.mana / maxMana) * 100));
            const fury = Math.max(0, Math.min(100, Math.floor(p.fury || 0)));

            const card = document.createElement('div');
            card.className = `combat-party-member ${isDead ? 'dead' : ''} ${isTurn ? 'active-turn' : ''}`;
            card.id = `combat-player-${idx}`;

            const shieldBadge = p.shield > 0 ? `<span style="color:#60a5fa;">(🛡️${p.shield})</span>` : '';

            card.innerHTML = `
                <h4 style="margin: 0 0 0.35rem 0; font-size:0.95rem;">${emoji} ${p.name} <small style="color:var(--text-muted);">Nv.${p.level} ${p.playerClass}</small></h4>
                <div class="health-bar-container" style="height: 10px;">
                    <div class="health-bar" style="width: ${pPct}%"></div>
                </div>
                <div class="bar-meta"><span>HP ${shieldBadge}</span><span>${p.hp} / ${maxHp}</span></div>

                <div class="health-bar-container" style="height: 8px;">
                    <div class="mana-bar" style="width: ${mPct}%; height: 100%;"></div>
                </div>
                <div class="bar-meta"><span>MP</span><span>${p.mana} / ${maxMana}</span></div>

                <div class="fury-bar-container">
                    <div class="fury-bar ${fury >= 100 ? 'full' : ''}" style="width: ${fury}%;"></div>
                </div>
                <div class="bar-meta"><span>Fúria</span><span>${fury}/100</span></div>
                ${this.renderStatusPillsHTML(p)}
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
        if (!this.elCombatLog) return;
        const div = document.createElement('div');
        div.className = log.type;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${log.msg}`;
        div.style.padding = '3px 6px';
        div.style.borderBottom = '1px solid rgba(255,255,255,0.06)';

        this.elCombatLog.appendChild(div);
        this.elCombatLog.scrollTop = this.elCombatLog.scrollHeight;
    }

    playCombatAnimation(data) {
        let el;
        let gridPos = null;

        if (data.target === 'player') {
            const pIdx = data.playerIndex !== undefined ? data.playerIndex : 0;
            el = document.getElementById(`combat-player-${pIdx}`);
            const pObj = window.gameCombat?.party?.[pIdx];
            if (pObj) gridPos = { x: pObj.gridX, y: pObj.gridY };
        } else if (data.monsterId) {
            el = document.getElementById(`monster-card-${data.monsterId}`);
            const mObj = window.gameCombat?.monsters?.find(m => m.instanceId === data.monsterId);
            if (mObj) gridPos = { x: mObj.gridX, y: mObj.gridY };
        }

        if (el) {
            const animClass = data.anim === 'attack' ? 'anim-attack' : 'anim-damage';
            el.classList.add(animClass);
            setTimeout(() => el.classList.remove(animClass), 500);
        }

        if (data.dmg !== undefined || data.label) {
            const textStr = data.label
                ? data.label
                : (data.isHeal ? `+${data.dmg}` : `-${data.dmg}${data.isCrit ? '!' : ''}`);

            let variantClass = '';
            let color = '#ff5555';
            if (data.isCombo) { variantClass = 'ft-combo'; color = '#c084fc'; }
            else if (data.isHeal) { variantClass = 'ft-heal'; color = '#4ade80'; }
            else if (data.isCrit) { variantClass = 'ft-crit'; color = '#fbbf24'; }
            else if (data.isWeakness) { variantClass = 'ft-weakness'; color = '#f97316'; }
            else if (data.isStatus) { variantClass = 'ft-status'; color = '#38bdf8'; }

            if (el) {
                const ft = document.createElement('div');
                ft.className = `floating-text ${variantClass}`;
                ft.textContent = textStr;
                ft.style.color = color;
                ft.style.left = '50%';
                ft.style.top = '18%';
                el.appendChild(ft);
                setTimeout(() => ft.remove(), 1050);
            }

            if (gridPos && !this.use3D) {
                this._floatingCanvasTexts.push({
                    x: gridPos.x,
                    y: gridPos.y,
                    text: textStr,
                    color,
                    scale: data.isCrit || data.isCombo ? 1.3 : 1.0,
                    progress: 0,
                    duration: 1.0
                });
            }
        }
    }

    renderTurnQueue(queue) {
        if (!this.elCombatTurnQueueList) return;
        this.elCombatTurnQueueList.innerHTML = '';

        if (window.gameCombat && window.gameCombat.currentTurnEntity) {
            const current = window.gameCombat.currentTurnEntity;
            const currentSpan = document.createElement('span');
            currentSpan.style.padding = '0.25rem 0.5rem';
            currentSpan.style.background = 'var(--accent-gold)';
            currentSpan.style.color = '#111';
            currentSpan.style.borderRadius = '4px';
            currentSpan.style.fontWeight = 'bold';
            currentSpan.style.fontSize = '0.85rem';

            let name = '???';
            if (current.type === 'player' && window.gameParty[current.index]) name = window.gameParty[current.index].name;
            if (current.type === 'monster' && window.gameCombat.monsters[current.index]) name = window.gameCombat.monsters[current.index].name;
            currentSpan.textContent = `▶ ${name}`;

            this.elCombatTurnQueueList.appendChild(currentSpan);
        }

        queue.forEach(q => {
            const span = document.createElement('span');
            span.style.padding = '0.2rem 0.5rem';
            span.style.background = '#1c212e';
            span.style.border = '1px solid var(--border-color)';
            span.style.borderRadius = '4px';
            span.style.fontSize = '0.82rem';
            span.style.color = q.type === 'player' ? '#4ade80' : '#f87171';

            let name = '???';
            if (q.type === 'player' && window.gameParty[q.index]) name = window.gameParty[q.index].name;
            if (q.type === 'monster' && window.gameCombat.monsters[q.index]) name = window.gameCombat.monsters[q.index].name;

            span.textContent = `${name} (${q.speed})`;
            this.elCombatTurnQueueList.appendChild(span);
        });
    }
}

window.CombatUIManager = CombatUIManager;
