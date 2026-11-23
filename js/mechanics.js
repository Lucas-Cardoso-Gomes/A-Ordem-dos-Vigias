/**
 * mechanics.js
 * Core combat status effects, elemental combo reactions, Fury/Ultimates,
 * 5-Relic campaign progression, New Game+, stats, achievements, and preset companions.
 */

(function (root) {
    function getEngine() {
        if (typeof Engine !== 'undefined') return Engine;
        if (typeof window !== 'undefined' && window.Engine) return window.Engine;
        return null;
    }

    function emitEvent(event, payload) {
        const eng = getEngine();
        if (eng && typeof eng.emit === 'function') {
            eng.emit(event, payload);
        }
    }

    function playAudio(soundName) {
        if (typeof window !== 'undefined' && window.gameAudio && typeof window.gameAudio.play === 'function') {
            window.gameAudio.play(soundName);
        }
    }

    const STATUS_EFFECTS = {
        burn: {
            id: 'burn',
            name: 'Queimadura',
            icon: '🔥',
            color: '#f97316',
            isDebuff: true,
            desc: 'Causa dano ígneo contínuo no início de cada turno.'
        },
        poison: {
            id: 'poison',
            name: 'Veneno',
            icon: '☠️',
            color: '#22c55e',
            isDebuff: true,
            desc: 'Causa dano tóxico contínuo no início de cada turno.'
        },
        frost: {
            id: 'frost',
            name: 'Congelamento',
            icon: '❄️',
            color: '#38bdf8',
            isDebuff: true,
            desc: 'Reduz o alcance de movimento em 50% e reage com eletricidade.'
        },
        shock: {
            id: 'shock',
            name: 'Eletrocução',
            icon: '⚡',
            color: '#eab308',
            isDebuff: true,
            desc: 'Aumenta em 20% todo o dano recebido enquanto ativo.'
        },
        bleed: {
            id: 'bleed',
            name: 'Sangramento',
            icon: '🩸',
            color: '#ef4444',
            isDebuff: true,
            desc: 'Causa dano sempre que a unidade se movimenta no grid.'
        },
        shield: {
            id: 'shield',
            name: 'Escudo',
            icon: '🛡️',
            color: '#60a5fa',
            isDebuff: false,
            desc: 'Absorve dano recebido antes de atingir os pontos de vida.'
        },
        blessing: {
            id: 'blessing',
            name: 'Bênção',
            icon: '✨',
            color: '#fbbf24',
            isDebuff: false,
            desc: 'Aumenta o dano causado em 20% pela luz da Ordem.'
        },
        stun: {
            id: 'stun',
            name: 'Atordoamento',
            icon: '💫',
            color: '#a855f7',
            isDebuff: true,
            desc: 'Impede a unidade de agir no seu próximo turno.'
        }
    };

    const ULTIMATES = {
        Guerreiro: {
            id: 'ult_guerreiro',
            playerClass: 'Guerreiro',
            name: 'Lâmina do Cataclismo',
            icon: '🌋',
            element: 'fogo',
            multiplier: 4.5,
            isAoE: true,
            aoeRadius: 2,
            range: 2,
            statusEffect: 'burn',
            statusDuration: 3,
            desc: 'Golpe sísmico flamejante em área que devasta inimigos e aplica Queimadura.'
        },
        Caçador: {
            id: 'ult_cacador',
            playerClass: 'Caçador',
            name: 'Tempestade Estelar',
            icon: '🌠',
            element: 'raio',
            multiplier: 3.8,
            isAoE: true,
            aoeRadius: 3,
            range: 8,
            statusEffect: 'bleed',
            statusDuration: 3,
            desc: 'Saraivada celestial de flechas perfurantes que causa Sangramento em ampla área.'
        },
        Guardião: {
            id: 'ult_guardiao',
            playerClass: 'Guardião',
            name: 'Égide da Ordem',
            icon: '🛡️',
            element: 'sagrado',
            multiplier: 3.0,
            isAoE: true,
            aoeRadius: 2,
            range: 2,
            shieldAmount: 150,
            statusEffect: 'stun',
            statusDuration: 1,
            desc: 'Ergue um Escudo sagrado em todo o grupo, atordoa e provoca os inimigos próximos.'
        },
        Mago: {
            id: 'ult_mago',
            playerClass: 'Mago',
            name: 'Colapso Arcano',
            icon: '🌌',
            element: 'arcano',
            multiplier: 5.0,
            isAoE: true,
            aoeRadius: 3,
            range: 7,
            statusEffect: 'shock',
            statusDuration: 3,
            desc: 'Implosão de energia pura que causa dano massivo em área e aplica Eletrocução.'
        },
        Clérigo: {
            id: 'ult_clerigo',
            playerClass: 'Clérigo',
            name: 'Alvorada Eterna',
            icon: '☀️',
            element: 'sagrado',
            multiplier: 3.2,
            isAoE: true,
            aoeRadius: 3,
            range: 6,
            healPct: 0.50,
            statusEffect: 'blessing',
            statusDuration: 3,
            desc: 'Restaura 50% do HP máximo e concede Bênção a todo o grupo, punindo inimigos.'
        },
        Nenhuma: {
            id: 'ult_nenhuma',
            playerClass: 'Nenhuma',
            name: 'Golpe do Vigia',
            icon: '🔦',
            element: 'fisico',
            multiplier: 3.2,
            isAoE: false,
            aoeRadius: 1,
            range: 2,
            statusEffect: 'stun',
            statusDuration: 1,
            desc: 'Investida determinada do Vigia que causa alto dano físico e atordoa o alvo.'
        }
    };

    const RELICS = {
        relic_floresta: {
            id: 'relic_floresta',
            name: 'Selo da Folha Eterna',
            mapId: 'floresta',
            icon: '🍃',
            color: '#4ade80',
            bonusDesc: '+15% HP Máximo para todo o grupo',
            bonuses: { maxHpPct: 0.15 }
        },
        relic_caverna: {
            id: 'relic_caverna',
            name: 'Olho das Sombras',
            mapId: 'caverna',
            icon: '👁️',
            color: '#a78bfa',
            bonusDesc: '+2 Visão na névoa e +10% Agilidade',
            bonuses: { visionBonus: 2, agiPct: 0.10 }
        },
        relic_ruinas: {
            id: 'relic_ruinas',
            name: 'Coroa dos Ancestrais',
            mapId: 'ruinas',
            icon: '👑',
            color: '#fbbf24',
            bonusDesc: '+20% XP e +10% Chance de Crítico',
            bonuses: { xpPct: 0.20, critBonus: 10 }
        },
        relic_vulcao: {
            id: 'relic_vulcao',
            name: 'Coração de Magma',
            mapId: 'vulcao',
            icon: '🔥',
            color: '#f97316',
            bonusDesc: '+15% Dano e Imunidade a Queimadura',
            bonuses: { damagePct: 0.15, burnImmune: true }
        },
        relic_abismo: {
            id: 'relic_abismo',
            name: 'Fragmento do Vazio',
            mapId: 'abismo',
            icon: '🌌',
            color: '#c084fc',
            bonusDesc: '+25% em todos os Atributos e conclui a campanha!',
            bonuses: { allAttrPct: 0.25, completesCampaign: true }
        }
    };

    const PRESET_COMPANIONS = [
        {
            id: 'companion_kael',
            name: 'Kael',
            roleTitle: 'Baluarte da Ordem',
            playerClass: 'Guardião',
            icon: '🛡️',
            level: 1,
            lore: 'Ex-capitão da muralha de Alvorada. Empunha o escudo com honra para proteger os recrutas da Ordem.',
            attributes: { str: 12, agi: 8, int: 9, def: 15, luk: 9 },
            starterEquipment: {
                weaponMain: {
                    id: 'w1',
                    instanceId: 'comp_kael_w1',
                    name: 'Espada do Juramento',
                    type: 'weapon',
                    slot: 'weaponMain',
                    minDmg: 7,
                    maxDmg: 12,
                    reqLvl: 1,
                    range: 1,
                    rarity: 'incomum',
                    stats: { def: 2 },
                    sellValue: 25
                },
                weaponOff: {
                    id: 'wo2',
                    instanceId: 'comp_kael_wo2',
                    name: 'Escudo da Vigília',
                    type: 'weapon',
                    slot: 'weaponOff',
                    minDmg: 2,
                    maxDmg: 4,
                    def: 6,
                    reqLvl: 1,
                    range: 1,
                    isShield: true,
                    rarity: 'incomum',
                    stats: { hp: 20 },
                    sellValue: 25
                },
                chest: {
                    id: 'a2',
                    instanceId: 'comp_kael_a2',
                    name: 'Brigandina do Guardião',
                    type: 'armor',
                    slot: 'chest',
                    def: 7,
                    reqLvl: 1,
                    rarity: 'incomum',
                    sellValue: 20
                }
            }
        },
        {
            id: 'companion_lyra',
            name: 'Lyra',
            roleTitle: 'Caçadora das Sombras',
            playerClass: 'Caçador',
            icon: '🏹',
            level: 1,
            lore: 'Rastreadora silenciosa das matas sombrias. Nenhuma presa escapa às suas flechas certeiras.',
            attributes: { str: 10, agi: 15, int: 9, def: 8, luk: 12 },
            starterEquipment: {
                weaponMain: {
                    id: 'w6',
                    instanceId: 'comp_lyra_w6',
                    name: 'Arco da Sentinela',
                    type: 'weapon',
                    slot: 'weaponMain',
                    minDmg: 8,
                    maxDmg: 15,
                    reqLvl: 1,
                    range: 8,
                    rarity: 'incomum',
                    stats: { agi: 2 },
                    sellValue: 30
                },
                head: {
                    id: 'a1',
                    instanceId: 'comp_lyra_a1',
                    name: 'Capuz da Patrulha',
                    type: 'armor',
                    slot: 'head',
                    def: 3,
                    reqLvl: 1,
                    rarity: 'incomum',
                    stats: { agi: 2 },
                    sellValue: 18
                }
            }
        },
        {
            id: 'companion_aldric',
            name: 'Aldric',
            roleTitle: 'Mago do Éter',
            playerClass: 'Mago',
            icon: '🔮',
            level: 1,
            lore: 'Estudioso dos antigos grimórios arcanos que busca selar as fissuras do Abismo do Caos.',
            attributes: { str: 7, agi: 10, int: 16, def: 8, luk: 11 },
            starterEquipment: {
                weaponMain: {
                    id: 'w8',
                    instanceId: 'comp_aldric_w8',
                    name: 'Cajado das Brasas',
                    type: 'weapon',
                    slot: 'weaponMain',
                    minDmg: 8,
                    maxDmg: 16,
                    reqLvl: 1,
                    weakness: 'fogo',
                    magic: true,
                    range: 6,
                    rarity: 'incomum',
                    stats: { int: 3, mana: 20 },
                    sellValue: 30
                },
                weaponOff: {
                    id: 'wo4',
                    instanceId: 'comp_aldric_wo4',
                    name: 'Orbe do Aprendiz',
                    type: 'weapon',
                    slot: 'weaponOff',
                    minDmg: 2,
                    maxDmg: 5,
                    reqLvl: 1,
                    magic: true,
                    range: 1,
                    rarity: 'incomum',
                    stats: { mana: 25 },
                    sellValue: 20
                }
            }
        },
        {
            id: 'companion_seraphina',
            name: 'Seraphina',
            roleTitle: 'Clériga da Alvorada',
            playerClass: 'Clérigo',
            icon: '✨',
            level: 1,
            lore: 'Sacerdotisa devota da Chama Branca, capaz de restaurar os feridos e purificar mortos-vivos.',
            attributes: { str: 8, agi: 9, int: 15, def: 11, luk: 10 },
            starterEquipment: {
                weaponMain: {
                    id: 'w9',
                    instanceId: 'comp_seraphina_w9',
                    name: 'Tomo da Alvorada',
                    type: 'weapon',
                    slot: 'weaponMain',
                    minDmg: 7,
                    maxDmg: 14,
                    reqLvl: 1,
                    weakness: 'luz sagrada',
                    magic: true,
                    range: 6,
                    rarity: 'incomum',
                    stats: { int: 3, hp: 15 },
                    sellValue: 30
                },
                chest: {
                    id: 'a2',
                    instanceId: 'comp_seraphina_a2',
                    name: 'Vestes da Ordem',
                    type: 'armor',
                    slot: 'chest',
                    def: 5,
                    reqLvl: 1,
                    rarity: 'incomum',
                    stats: { mana: 20 },
                    sellValue: 20
                }
            }
        }
    ];

    const ACHIEVEMENT_CATALOG = {
        first_combo: { id: 'first_combo', name: 'Alquimista Elemental', icon: '💥', desc: 'Desencadeou sua primeira Reação Elemental.' },
        first_ultimate: { id: 'first_ultimate', name: 'Fúria Desperta', icon: '⚡', desc: 'Executou um golpe Supremo com 100% de Fúria.' },
        first_relic: { id: 'first_relic', name: 'Guardião das Relíquias', icon: '🏆', desc: 'Recuperou sua primeira Relíquia antiga.' },
        all_relics: { id: 'all_relics', name: 'Lenda de Aegis Nocturna', icon: '👑', desc: 'Reuniu todas as 5 Relíquias da Ordem.' },
        slayer_25: { id: 'slayer_25', name: 'Flagelo das Trevas', icon: '⚔️', desc: 'Derrotou 25 inimigos em combate.' },
        master_crafter: { id: 'master_crafter', name: 'Mestre Forjador', icon: '⚒️', desc: 'Forjou 5 itens na Forja de Alvorada.' }
    };

    function createDefaultState() {
        return {
            relics: [],
            campaignCompleted: false,
            ngPlusLevel: 0,
            stats: {
                kills: 0,
                bossesDefeated: 0,
                damageDealt: 0,
                healingDone: 0,
                elementalCombos: 0,
                ultimatesUsed: 0,
                chestsOpened: 0,
                shrinesUsed: 0,
                questsCompleted: 0,
                itemsCrafted: 0
            },
            achievements: [],
            openedChests: [],
            usedShrines: []
        };
    }

    function normalizeElement(el) {
        if (!el || typeof el !== 'string') return '';
        const s = el.trim().toLowerCase();
        if (s === 'fire' || s === 'fogo') return 'fogo';
        if (s === 'ice' || s === 'gelo' || s === 'frio') return 'gelo';
        if (s === 'lightning' || s === 'raio' || s === 'eletrico' || s === 'elétrico') return 'raio';
        if (s === 'poison' || s === 'veneno' || s === 'toxico' || s === 'tóxico') return 'veneno';
        if (s === 'holy' || s === 'sagrado' || s === 'luz sagrada' || s === 'magia sagrada' || s === 'magia divina') return 'sagrado';
        if (s === 'dark' || s === 'trevas' || s === 'vazio') return 'trevas';
        if (s === 'arcane' || s === 'arcano' || s === 'magia arcana') return 'arcano';
        return s;
    }

    const GameMechanics = {
        STATUS_EFFECTS,
        ULTIMATES,
        RELICS,
        PRESET_COMPANIONS,
        ACHIEVEMENT_CATALOG,
        state: createDefaultState(),

        _isPlayerEntity(entity) {
            if (!entity) return false;
            if (typeof window !== 'undefined' && Array.isArray(window.gameParty) && window.gameParty.includes(entity)) {
                return true;
            }
            return Boolean(entity.attributes && entity.playerClass !== undefined && !entity.isBoss && entity.minLvl === undefined);
        },

        _unlockAchievement(achId) {
            const tpl = this.ACHIEVEMENT_CATALOG[achId];
            if (!tpl) return false;
            if (this.state.achievements.some(a => (typeof a === 'string' ? a : a.id) === achId)) {
                return false;
            }
            const entry = { ...tpl, unlockedAt: Date.now() };
            this.state.achievements.push(entry);
            emitEvent('achievementUnlocked', entry);
            emitEvent('systemLog', `🏅 Conquista desbloqueada: ${entry.name}!`);
            return true;
        },

        applyStatus(entity, statusId, opts = {}) {
            if (!entity || !this.STATUS_EFFECTS[statusId]) return false;

            if (opts.chance !== undefined && Math.random() > opts.chance) {
                return false;
            }

            // Relic immunity check: Coração de Magma grants Burn immunity to party members
            if (statusId === 'burn' && this.hasRelic('relic_vulcao') && this._isPlayerEntity(entity)) {
                return false;
            }

            if (!Array.isArray(entity.statusEffects)) {
                entity.statusEffects = [];
            }

            const def = this.STATUS_EFFECTS[statusId];
            const duration = Math.max(1, opts.duration ?? (statusId === 'stun' ? 1 : 3));
            const entityMaxHp = entity.maxHp || (typeof entity.getMaxHp === 'function' ? entity.getMaxHp() : 100);
            const defaultPotency = ['burn', 'poison', 'bleed'].includes(statusId)
                ? Math.max(5, Math.floor(entityMaxHp * 0.06))
                : 0;
            const potency = opts.potency ?? opts.value ?? opts.dmg ?? opts.damage ?? defaultPotency;

            if (statusId === 'shield') {
                const shieldAmt = Math.max(1, Math.floor(opts.shieldAmount ?? opts.amount ?? opts.value ?? opts.potency ?? 30));
                entity.shield = Math.max(0, (entity.shield || 0) + shieldAmt);
            }

            const existing = entity.statusEffects.find(s => s.id === statusId);
            if (existing) {
                existing.duration = Math.max(existing.duration, duration);
                if (potency > 0) existing.potency = Math.max(existing.potency || 0, potency);
                existing.stacks = Math.min(3, (existing.stacks || 1) + (opts.stacks || 1));
                existing.value = statusId === 'shield' ? entity.shield : existing.potency;
                existing.applied = true;
                return existing;
            }

            const entry = {
                id: def.id,
                name: def.name,
                icon: def.icon,
                color: def.color,
                isDebuff: def.isDebuff,
                duration,
                potency,
                value: statusId === 'shield' ? entity.shield : potency,
                stacks: Math.min(3, opts.stacks || 1),
                source: opts.source || null,
                applied: true
            };
            entity.statusEffects.push(entry);
            return entry;
        },

        hasStatus(entity, statusId) {
            if (!entity || !Array.isArray(entity.statusEffects)) return false;
            return entity.statusEffects.some(s => s.id === statusId && s.duration > 0);
        },

        checkElementalReaction(target, incomingElement, caster = null, baseDmg = 0) {
            if (!target) return null;
            const el = normalizeElement(incomingElement);
            if (!el) return null;

            if (!Array.isArray(target.statusEffects)) {
                target.statusEffects = [];
            }

            const has = (id) => target.statusEffects.some(s => s.id === id && s.duration > 0);
            const remove = (id) => {
                target.statusEffects = target.statusEffects.filter(s => s.id !== id);
            };

            const targetMaxHp = target.maxHp || (typeof target.getMaxHp === 'function' ? target.getMaxHp() : 100);
            let reaction = null;

            if ((el === 'fogo' && has('poison')) || (el === 'veneno' && has('burn'))) {
                const consumed = el === 'fogo' ? 'poison' : 'burn';
                remove(consumed);
                const bonusDamage = Math.max(20, Math.floor(targetMaxHp * 0.12) + Math.floor((baseDmg || 0) * 0.5));
                reaction = {
                    id: 'explosao_toxica',
                    name: 'Explosão Tóxica',
                    icon: '💥',
                    color: '#84cc16',
                    bonusDamage,
                    damage: bonusDamage,
                    healCaster: 0,
                    stunApplied: false,
                    consumedStatus: consumed,
                    desc: 'Fogo reage com Veneno em uma detonação cáustica!'
                };
            } else if ((el === 'raio' && has('frost')) || (el === 'gelo' && has('shock'))) {
                const consumed = el === 'raio' ? 'frost' : 'shock';
                remove(consumed);
                this.applyStatus(target, 'stun', { duration: 1 });
                const bonusDamage = Math.max(18, Math.floor(targetMaxHp * 0.10) + Math.floor((baseDmg || 0) * 0.45));
                reaction = {
                    id: 'sobrecarga_cristalina',
                    name: 'Sobrecarga Cristalina',
                    icon: '💠',
                    color: '#38bdf8',
                    bonusDamage,
                    damage: bonusDamage,
                    healCaster: 0,
                    stunApplied: true,
                    appliedStatus: 'stun',
                    consumedStatus: consumed,
                    desc: 'Eletricidade estilhaça o gelo, causando dano extra e Atordoamento!'
                };
            } else if ((el === 'gelo' && has('burn')) || (el === 'fogo' && has('frost'))) {
                const consumed = el === 'gelo' ? 'burn' : 'frost';
                remove(consumed);
                const bonusDamage = Math.max(25, Math.floor(targetMaxHp * 0.14) + Math.floor((baseDmg || 0) * 0.55));
                reaction = {
                    id: 'choque_termico',
                    name: 'Choque Térmico',
                    icon: '🌡️',
                    color: '#f43f5e',
                    bonusDamage,
                    damage: bonusDamage,
                    healCaster: 0,
                    stunApplied: false,
                    consumedStatus: consumed,
                    desc: 'Mudança térmica brusca fragmenta a resistência do alvo!'
                };
            } else if (
                el === 'sagrado' &&
                (has('poison') || has('bleed') || /morto-vivo|dem[oô]nio|chefe/i.test(target.type || '') || Boolean(target.isBoss))
            ) {
                const consumed = has('poison') ? 'poison' : (has('bleed') ? 'bleed' : null);
                if (has('poison')) remove('poison');
                if (has('bleed')) remove('bleed');

                const bonusDamage = Math.max(20, Math.floor(targetMaxHp * 0.12) + Math.floor((baseDmg || 0) * 0.5));
                const healCaster = Math.max(15, Math.floor(bonusDamage * 0.5));
                if (caster) {
                    if (typeof caster.heal === 'function') {
                        caster.heal(healCaster);
                    } else if (typeof caster.hp === 'number') {
                        const casterMax = caster.maxHp || (typeof caster.getMaxHp === 'function' ? caster.getMaxHp() : 9999);
                        caster.hp = Math.min(casterMax, caster.hp + healCaster);
                    }
                }

                reaction = {
                    id: 'expurgo_radiante',
                    name: 'Expurgo Radiante',
                    icon: '☀️',
                    color: '#fbbf24',
                    bonusDamage,
                    damage: bonusDamage,
                    healCaster,
                    healAmount: healCaster,
                    stunApplied: false,
                    consumedStatus: consumed,
                    desc: 'Luz Sagrada purga corrupção e restaura vida ao conjurador!'
                };
            }

            if (reaction) {
                this.recordStat('elementalCombos', 1);
                this._unlockAchievement('first_combo');
            }
            return reaction;
        },

        processTurnStartStatuses(entity) {
            if (!entity) {
                return { stunned: false, skipTurn: false, totalDamage: 0, damage: 0, ticks: [], expired: [], logs: [] };
            }
            if (!Array.isArray(entity.statusEffects)) {
                entity.statusEffects = [];
            }

            let totalDamage = 0;
            let stunned = false;
            const ticks = [];
            const expired = [];
            const logs = [];
            const entityName = entity.name || 'Alvo';

            for (const s of entity.statusEffects) {
                if (s.id === 'stun' && s.duration > 0) {
                    stunned = true;
                    logs.push(`💫 ${entityName} está atordoado e perde o turno!`);
                } else if ((s.id === 'burn' || s.id === 'poison') && s.duration > 0) {
                    const rawDmg = Math.max(1, Math.floor((s.potency || 8) * (s.stacks || 1)));
                    const remaining = this.absorbDamageWithShield(entity, rawDmg);
                    if (typeof entity.hp === 'number') {
                        entity.hp = Math.max(0, entity.hp - remaining);
                    }
                    totalDamage += remaining;
                    ticks.push({
                        id: s.id,
                        name: s.name,
                        icon: s.icon,
                        color: s.color,
                        rawDamage: rawDmg,
                        damage: remaining
                    });
                    logs.push(`${s.icon} ${entityName} sofreu ${remaining} de dano por ${s.name}!`);
                }

                s.duration -= 1;
                if (s.duration <= 0) {
                    expired.push(s.id);
                    if (s.id === 'shield') {
                        entity.shield = 0;
                    }
                }
            }

            entity.statusEffects = entity.statusEffects.filter(s => {
                if (s.id === 'shield' && (!entity.shield || entity.shield <= 0)) return false;
                return s.duration > 0;
            });

            return {
                stunned,
                skipTurn: stunned,
                totalDamage,
                damage: totalDamage,
                ticks,
                expired,
                logs
            };
        },

        processMovementStatuses(entity, steps = 1) {
            if (!entity || !Array.isArray(entity.statusEffects)) {
                return { damage: 0, totalDamage: 0, triggered: false, status: null, message: '' };
            }

            const bleed = entity.statusEffects.find(s => s.id === 'bleed' && s.duration > 0);
            if (!bleed) {
                return { damage: 0, totalDamage: 0, triggered: false, status: null, message: '' };
            }

            const stepCount = Math.max(1, Math.floor(steps || 1));
            const rawDmg = Math.max(1, Math.floor((bleed.potency || 6) * (bleed.stacks || 1))) * stepCount;
            const remaining = this.absorbDamageWithShield(entity, rawDmg);
            if (typeof entity.hp === 'number') {
                entity.hp = Math.max(0, entity.hp - remaining);
            }

            const name = entity.name || 'Alvo';
            return {
                damage: remaining,
                totalDamage: remaining,
                triggered: true,
                status: 'bleed',
                message: `🩸 ${name} perdeu ${remaining} HP por Sangramento ao se mover!`
            };
        },

        getMovementMultiplier(entity) {
            if (!entity) return 1.0;
            if (this.hasStatus(entity, 'stun')) return 0;
            if (this.hasStatus(entity, 'frost')) return 0.5;
            return 1.0;
        },

        getDamageTakenMultiplier(entity) {
            let mult = 1.0;
            if (!entity) return mult;
            if (this.hasStatus(entity, 'shock')) mult += 0.20;
            return mult;
        },

        getDamageDealtMultiplier(entity) {
            let mult = 1.0;
            if (!entity) return mult;
            if (this.hasStatus(entity, 'blessing')) mult += 0.20;
            if (this._isPlayerEntity(entity)) {
                const bonuses = this.getPartyBonuses();
                if (bonuses.damageBonusPct > 0) {
                    mult += bonuses.damageBonusPct;
                }
            }
            return mult;
        },

        absorbDamageWithShield(entity, dmg) {
            const incoming = Math.max(0, Math.floor(dmg || 0));
            if (!entity || !entity.shield || entity.shield <= 0) return incoming;

            const absorbed = Math.min(entity.shield, incoming);
            entity.shield -= absorbed;

            if (Array.isArray(entity.statusEffects)) {
                if (entity.shield <= 0) {
                    entity.shield = 0;
                    entity.statusEffects = entity.statusEffects.filter(s => s.id !== 'shield');
                } else {
                    const shieldStatus = entity.statusEffects.find(s => s.id === 'shield');
                    if (shieldStatus) shieldStatus.value = entity.shield;
                }
            }

            return incoming - absorbed;
        },

        cleanseNegativeStatuses(entity, types = null) {
            if (!entity || !Array.isArray(entity.statusEffects)) return [];

            const typeSet = Array.isArray(types) && types.length > 0 ? new Set(types) : null;
            const removed = [];

            entity.statusEffects = entity.statusEffects.filter(s => {
                const isNeg = s.isDebuff !== undefined
                    ? s.isDebuff
                    : Boolean(this.STATUS_EFFECTS[s.id]?.isDebuff);

                const matches = typeSet ? typeSet.has(s.id) : isNeg;
                if (matches) {
                    removed.push(s.id);
                    return false;
                }
                return true;
            });

            return removed;
        },

        addFury(player, amount) {
            if (!player || typeof amount !== 'number' || isNaN(amount)) return 0;
            player.fury = Math.max(0, Math.min(100, Math.round((player.fury || 0) + amount)));
            return player.fury;
        },

        getUltimateForClass(playerClass) {
            return this.ULTIMATES[playerClass] || this.ULTIMATES.Nenhuma;
        },

        getAllRelics() {
            return Object.values(this.RELICS);
        },

        grantRelic(id) {
            const relic = this.RELICS[id];
            if (!relic) return false;
            if (!Array.isArray(this.state.relics)) this.state.relics = [];
            if (this.state.relics.includes(id)) return false;

            this.state.relics.push(id);
            if (id === 'relic_abismo') {
                this.state.campaignCompleted = true;
            }

            playAudio('relic');
            this._unlockAchievement('first_relic');
            if (this.state.relics.length >= Object.keys(this.RELICS).length) {
                this._unlockAchievement('all_relics');
            }

            emitEvent('relicGranted', relic);
            emitEvent('mechanicsUpdated', this.state);
            emitEvent('systemLog', `✨ Relíquia obtida: ${relic.icon} ${relic.name} (${relic.bonusDesc})!`);
            return true;
        },

        hasRelic(id) {
            return Array.isArray(this.state.relics) && this.state.relics.includes(id);
        },

        getPartyBonuses() {
            const hasFloresta = this.hasRelic('relic_floresta');
            const hasCaverna = this.hasRelic('relic_caverna');
            const hasRuinas = this.hasRelic('relic_ruinas');
            const hasVulcao = this.hasRelic('relic_vulcao');
            const hasAbismo = this.hasRelic('relic_abismo');

            const maxHpPct = hasFloresta ? 0.15 : 0;
            const visionBonus = hasCaverna ? 2 : 0;
            const agiPct = hasCaverna ? 0.10 : 0;
            const xpPct = hasRuinas ? 0.20 : 0;
            const critBonus = hasRuinas ? 10 : 0;
            const damageBonusPct = hasVulcao ? 0.15 : 0;
            const burnImmune = hasVulcao;
            const allAttrPct = hasAbismo ? 0.25 : 0;

            const allAttrMult = 1 + allAttrPct;
            const agiMult = 1 + allAttrPct + agiPct;

            return {
                maxHpPct,
                maxHpMult: 1 + maxHpPct,
                visionBonus,
                agiPct,
                agiMult,
                xpPct,
                xpMult: 1 + xpPct,
                critBonus,
                damageBonusPct,
                damageMult: 1 + damageBonusPct,
                burnImmune,
                allAttrPct,
                allAttrMult,
                attrMults: {
                    str: allAttrMult,
                    agi: agiMult,
                    int: allAttrMult,
                    def: allAttrMult,
                    luk: allAttrMult
                }
            };
        },

        recordStat(key, val = 1) {
            if (!key) return 0;
            const delta = typeof val === 'number' && !isNaN(val) ? val : 1;
            if (!this.state.stats) this.state.stats = createDefaultState().stats;
            this.state.stats[key] = (this.state.stats[key] || 0) + delta;

            if (key === 'ultimatesUsed' && this.state.stats.ultimatesUsed >= 1) {
                this._unlockAchievement('first_ultimate');
            }
            if (key === 'kills' && this.state.stats.kills >= 25) {
                this._unlockAchievement('slayer_25');
            }
            if (key === 'itemsCrafted' && this.state.stats.itemsCrafted >= 5) {
                this._unlockAchievement('master_crafter');
            }

            emitEvent('mechanicsUpdated', this.state);
            return this.state.stats[key];
        },

        startNewGamePlus() {
            this.state.ngPlusLevel = (this.state.ngPlusLevel || 0) + 1;
            this.state.campaignCompleted = false;
            this.state.openedChests = [];
            this.state.usedShrines = [];

            emitEvent('newGamePlusStarted', { ngPlusLevel: this.state.ngPlusLevel });
            emitEvent('mechanicsUpdated', this.state);
            emitEvent('systemLog', `🔥 Novo Jogo+ ${this.state.ngPlusLevel} iniciado! Os inimigos estão mais fortes, mas suas Relíquias permanecem.`);
            return this.state.ngPlusLevel;
        },

        save() {
            return {
                relics: Array.isArray(this.state.relics) ? [...this.state.relics] : [],
                campaignCompleted: Boolean(this.state.campaignCompleted),
                ngPlusLevel: this.state.ngPlusLevel || 0,
                stats: { ...createDefaultState().stats, ...(this.state.stats || {}) },
                achievements: Array.isArray(this.state.achievements) ? this.state.achievements.map(a => (typeof a === 'object' ? { ...a } : a)) : [],
                openedChests: Array.isArray(this.state.openedChests) ? [...this.state.openedChests] : [],
                usedShrines: Array.isArray(this.state.usedShrines) ? [...this.state.usedShrines] : []
            };
        },

        load(data) {
            if (!data) {
                this.reset();
                return;
            }
            const defaults = createDefaultState();
            this.state = {
                relics: Array.isArray(data.relics) ? data.relics.filter(r => Boolean(this.RELICS[r])) : [],
                campaignCompleted: Boolean(data.campaignCompleted),
                ngPlusLevel: Math.max(0, Number(data.ngPlusLevel) || 0),
                stats: { ...defaults.stats, ...(data.stats || {}) },
                achievements: Array.isArray(data.achievements) ? data.achievements.map(a => (typeof a === 'object' ? { ...a } : a)) : [],
                openedChests: Array.isArray(data.openedChests) ? [...data.openedChests] : [],
                usedShrines: Array.isArray(data.usedShrines) ? [...data.usedShrines] : []
            };
            emitEvent('mechanicsUpdated', this.state);
        },

        reset() {
            this.state = createDefaultState();
            emitEvent('mechanicsUpdated', this.state);
        }
    };

    if (typeof window !== 'undefined') {
        window.GameMechanics = GameMechanics;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = GameMechanics;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
