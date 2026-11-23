/**
 * scene3d.js
 * Three.js (r128) 3D scene managers for HeroShowcase, NPCPortrait, CombatArena,
 * WorldExplorer, and VictoryDiorama.
 * Gracefully degrades to safe no-ops when THREE or WebGL is unavailable (e.g. Jest/jsdom).
 */
(function (rootScope) {
    'use strict';

    function getTHREE() {
        if (typeof window !== 'undefined' && window.THREE) return window.THREE;
        if (typeof global !== 'undefined' && global.THREE) return global.THREE;
        if (rootScope && rootScope.THREE) return rootScope.THREE;
        return null;
    }

    function getModels3D() {
        if (typeof window !== 'undefined' && window.Models3D) return window.Models3D;
        if (typeof global !== 'undefined' && global.Models3D) return global.Models3D;
        if (rootScope && rootScope.Models3D) return rootScope.Models3D;
        if (typeof require === 'function') {
            try { return require('./models3d'); } catch (e) { return null; }
        }
        return null;
    }

    function normalizeKey(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function normalizeBiome(theme) {
        const t = normalizeKey(theme || 'forest');
        if (t === 'floresta' || t === 'forest') return 'forest';
        if (t === 'caverna' || t === 'cave') return 'cave';
        if (t === 'ruinas' || t === 'ruins') return 'ruins';
        if (t === 'vulcao' || t === 'volcano') return 'volcano';
        if (t === 'abismo' || t === 'abyss') return 'abyss';
        return 'forest';
    }

    function setVec3(vec, x, y, z) {
        if (!vec) return;
        if (typeof vec.set === 'function') vec.set(x, y, z);
        else { vec.x = x; vec.y = y; vec.z = z; }
    }

    const BIOME_CONFIG = {
        forest:  { bg: 0x0a140d, fog: 0x0b1a10, fogDensity: 0.022, tileA: 0x1e3f20, tileB: 0x17331a, ambient: 0x86efac, sun: 0xfef3c7, accent: 0x22c55e },
        cave:    { bg: 0x090b10, fog: 0x0a0c14, fogDensity: 0.032, tileA: 0x222533, tileB: 0x191c26, ambient: 0x7dd3fc, sun: 0xbae6fd, accent: 0x38bdf8 },
        ruins:   { bg: 0x111418, fog: 0x14181f, fogDensity: 0.022, tileA: 0x373c45, tileB: 0x2d3138, ambient: 0xcbd5e1, sun: 0xfde68a, accent: 0xfbbf24 },
        volcano: { bg: 0x160907, fog: 0x1d0a06, fogDensity: 0.025, tileA: 0x331d19, tileB: 0x241412, ambient: 0xfdba74, sun: 0xff6b35, accent: 0xff5500 },
        abyss:   { bg: 0x0b0514, fog: 0x0f061c, fogDensity: 0.028, tileA: 0x221238, tileB: 0x170b26, ambient: 0xd8b4fe, sun: 0xc084fc, accent: 0xa855f7 }
    };

    const STATUS_COLORS = {
        burn:     0xff5500,
        poison:   0x4ade80,
        frost:    0x38bdf8,
        ice:      0x38bdf8,
        shock:    0xfacc15,
        bleed:    0xdc2626,
        shield:   0x22d3ee,
        blessing: 0xfbbf24,
        stun:     0xfef08a,
        taunt:    0xf97316
    };

    // ---------------------------------------------------------
    // WebGL Capability & Context Lifecycle Registry
    // ---------------------------------------------------------
    const activeScenes = new Set();
    const MAX_CONCURRENT_CONTEXTS = 6;

    function isWebGLAvailable() {
        if (typeof window === 'undefined' || typeof document === 'undefined') return false;
        if (!getTHREE()) return false;
        try {
            if (typeof window.WebGLRenderingContext === 'undefined') return false;
            const canvas = document.createElement('canvas');
            if (!canvas || typeof canvas.getContext !== 'function') return false;
            const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return Boolean(ctx);
        } catch (e) {
            return false;
        }
    }

    function disposeObject3D(obj) {
        if (!obj) return;
        if (typeof obj.traverse === 'function') {
            obj.traverse(child => {
                if (child.geometry && typeof child.geometry.dispose === 'function') {
                    try { child.geometry.dispose(); } catch (e) {}
                }
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(m => {
                    if (!m) return;
                    if (m.map && typeof m.map.dispose === 'function') {
                        try { m.map.dispose(); } catch (e) {}
                    }
                    if (typeof m.dispose === 'function') {
                        try { m.dispose(); } catch (e) {}
                    }
                });
            });
        }
    }

    function ensureContextBudget(containerEl) {
        if (containerEl && containerEl.__scene3dInstance && !containerEl.__scene3dInstance.disposed) {
            containerEl.__scene3dInstance.dispose();
        }
        while (activeScenes.size >= MAX_CONCURRENT_CONTEXTS) {
            let candidate = null;
            for (const s of activeScenes) {
                if (!s.visible) { candidate = s; break; }
            }
            if (!candidate) {
                candidate = activeScenes.values().next().value;
            }
            if (!candidate) break;
            candidate.dispose();
        }
    }

    // ---------------------------------------------------------
    // Shared Particle & Sprite Helpers
    // ---------------------------------------------------------
    function createEmberSystem(THREE, count, bounds, colorHex) {
        if (!THREE.BufferGeometry || !THREE.Points || !THREE.PointsMaterial || !THREE.Float32BufferAttribute) {
            return null;
        }
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        const bx = bounds.x || 4;
        const by = bounds.y || 3;
        const bz = bounds.z || 4;

        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * bx;
            positions[i * 3 + 1] = Math.random() * by;
            positions[i * 3 + 2] = (Math.random() - 0.5) * bz;
            speeds[i] = 0.4 + Math.random() * 0.9;
        }

        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            color: colorHex !== undefined ? colorHex : 0xfbbf24,
            size: bounds.size || 0.09,
            transparent: true,
            opacity: 0.85
        });
        const points = new THREE.Points(geom, mat);
        points.userData = { speeds, bounds: { x: bx, y: by, z: bz }, time: 0 };
        return points;
    }

    function updateEmberSystem(points, dt) {
        if (!points || !points.geometry || !points.geometry.attributes?.position) return;
        const attr = points.geometry.attributes.position;
        const arr = attr.array;
        const { speeds, bounds } = points.userData;
        points.userData.time = (points.userData.time || 0) + dt;
        const t = points.userData.time;

        for (let i = 0; i < speeds.length; i++) {
            const idx = i * 3;
            arr[idx + 1] += speeds[i] * dt;
            arr[idx]     += Math.sin(t * 1.8 + i) * 0.15 * dt;
            if (arr[idx + 1] > bounds.y) {
                arr[idx + 1] = 0.05;
                arr[idx]     = (Math.random() - 0.5) * bounds.x;
                arr[idx + 2] = (Math.random() - 0.5) * bounds.z;
            }
        }
        attr.needsUpdate = true;
    }

    function createHPBarSprite(THREE) {
        if (typeof document === 'undefined' || !THREE.CanvasTexture || !THREE.Sprite || !THREE.SpriteMaterial) {
            return null;
        }
        const canvas = document.createElement('canvas');
        canvas.width = 192;
        canvas.height = 48;
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        setVec3(sprite.scale, 1.45, 0.36, 1);
        sprite.userData = { canvas, tex, key: '' };
        return sprite;
    }

    function updateHPBarSprite(sprite, label, hp, maxHp, shield, isAlly, isBoss) {
        if (!sprite || !sprite.userData?.canvas) return;
        const safeMax = Math.max(1, maxHp || 1);
        const safeHp = Math.max(0, hp || 0);
        const safeShield = Math.max(0, shield || 0);
        const cacheKey = `${label}|${safeHp}|${safeMax}|${safeShield}|${isAlly}|${isBoss}`;
        if (sprite.userData.key === cacheKey) return;
        sprite.userData.key = cacheKey;

        const canvas = sprite.userData.canvas;
        const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
        if (!ctx || typeof ctx.clearRect !== 'function') return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background plate
        ctx.fillStyle = 'rgba(10, 10, 16, 0.82)';
        ctx.fillRect(6, 4, w - 12, h - 8);
        ctx.strokeStyle = isBoss ? '#fbbf24' : isAlly ? '#38bdf8' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(6, 4, w - 12, h - 8);

        // Name label
        ctx.fillStyle = isBoss ? '#fde047' : '#f8fafc';
        ctx.font = 'bold 14px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const shortName = String(label || '').slice(0, 18);
        ctx.fillText(shortName, w / 2, 6);

        // HP Bar
        const barX = 14;
        const barY = 25;
        const barW = w - 28;
        const barH = 12;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(barX, barY, barW, barH);

        const pct = Math.min(1, safeHp / safeMax);
        ctx.fillStyle = isAlly ? '#22c55e' : isBoss ? '#f59e0b' : '#ef4444';
        ctx.fillRect(barX, barY, Math.round(barW * pct), barH);

        if (safeShield > 0) {
            const spct = Math.min(1, safeShield / safeMax);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
            ctx.fillRect(barX, barY, Math.round(barW * spct), 4);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Segoe UI, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(safeHp)}/${Math.round(safeMax)}`, w / 2, barY + barH / 2 + 1);

        if (sprite.userData.tex) {
            sprite.userData.tex.needsUpdate = true;
        }
    }

    // ---------------------------------------------------------
    // Base Scene Wrapper (Lifecycle, Resize, Loop, Context Safety)
    // ---------------------------------------------------------
    class BaseScene3D {
        constructor(containerEl, opts) {
            this.containerEl = containerEl || null;
            this.opts = opts || {};
            this.active = false;
            this.visible = true;
            this.disposed = false;
            this._listeners = [];
            this._rafId = null;
            this._lastTime = 0;
            this._resizeObserver = null;

            const THREE = getTHREE();
            const Models3D = getModels3D();
            if (!this.containerEl || !THREE || !Models3D || !isWebGLAvailable()) {
                return;
            }

            ensureContextBudget(this.containerEl);

            try {
                this.THREE = THREE;
                this.Models3D = Models3D;
                this.scene = new THREE.Scene();

                const w = this.containerEl.clientWidth || this.opts.defaultWidth || 640;
                const h = this.containerEl.clientHeight || this.opts.defaultHeight || 360;

                this.camera = new THREE.PerspectiveCamera(this.opts.fov || 45, w / Math.max(1, h), 0.1, 180);
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: this.opts.alpha !== false,
                    powerPreference: 'high-performance'
                });
                if (typeof this.renderer.setPixelRatio === 'function' && typeof window !== 'undefined') {
                    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                }
                if (this.renderer.shadowMap) {
                    this.renderer.shadowMap.enabled = true;
                    if (THREE.PCFSoftShadowMap) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                }
                this.renderer.setSize(w, h, false);

                const dom = this.renderer.domElement;
                if (dom) {
                    dom.style.display = 'block';
                    dom.style.width = '100%';
                    dom.style.height = this.containerEl.clientHeight > 0 ? '100%' : `${h}px`;
                    this.containerEl.appendChild(dom);
                }

                this.containerEl.__scene3dInstance = this;
                this.active = true;
                activeScenes.add(this);

                if (typeof ResizeObserver !== 'undefined') {
                    this._resizeObserver = new ResizeObserver(() => this.resize());
                    this._resizeObserver.observe(this.containerEl);
                }
                if (typeof window !== 'undefined') {
                    this._listen(window, 'resize', () => this.resize());
                }
            } catch (e) {
                this.active = false;
                this.dispose();
            }
        }

        _listen(target, event, fn, opts) {
            if (!target || typeof target.addEventListener !== 'function') return;
            target.addEventListener(event, fn, opts);
            this._listeners.push({ target, event, fn, opts });
        }

        _startLoop() {
            if (!this.active || this.disposed || this._rafId !== null) return;
            const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (cb) => setTimeout(() => cb(Date.now()), 16);
            const nowFn = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
            this._lastTime = nowFn();

            const tick = () => {
                if (!this.active || this.disposed) {
                    this._rafId = null;
                    return;
                }
                const now = nowFn();
                const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTime) / 1000));
                this._lastTime = now;

                if (this.visible) {
                    try {
                        this._onUpdate(dt, now / 1000);
                        if (this.renderer && this.scene && this.camera) {
                            this.renderer.render(this.scene, this.camera);
                        }
                    } catch (e) {
                        // Guard render loop against transient errors
                    }
                }
                this._rafId = raf(tick);
            };
            this._rafId = raf(tick);
        }

        _onUpdate() {}

        setVisible(visible) {
            this.visible = Boolean(visible);
            if (!this.active || this.disposed) return;
            if (this.visible) {
                this.resize();
                if (this._rafId === null) this._startLoop();
            }
        }

        resize() {
            if (!this.active || this.disposed || !this.renderer || !this.camera || !this.containerEl) return;
            const w = this.containerEl.clientWidth || this.opts.defaultWidth || 640;
            const h = this.containerEl.clientHeight || this.opts.defaultHeight || 360;
            if (w <= 0 || h <= 0) return;
            if (this.renderer.domElement) {
                this.renderer.domElement.style.height = this.containerEl.clientHeight > 0 ? '100%' : `${h}px`;
            }
            this.camera.aspect = w / h;
            if (typeof this.camera.updateProjectionMatrix === 'function') {
                this.camera.updateProjectionMatrix();
            }
            this.renderer.setSize(w, h, false);
        }

        dispose() {
            if (this.disposed) return;
            this.disposed = true;
            this.active = false;

            if (this._rafId !== null && typeof cancelAnimationFrame === 'function') {
                try { cancelAnimationFrame(this._rafId); } catch (e) {}
                this._rafId = null;
            }
            if (this._resizeObserver) {
                try { this._resizeObserver.disconnect(); } catch (e) {}
                this._resizeObserver = null;
            }

            this._listeners.forEach(({ target, event, fn, opts }) => {
                try { target.removeEventListener(event, fn, opts); } catch (e) {}
            });
            this._listeners = [];

            if (this.scene) {
                disposeObject3D(this.scene);
                this.scene = null;
            }
            if (this.renderer) {
                const dom = this.renderer.domElement;
                if (dom && dom.parentNode) {
                    try { dom.parentNode.removeChild(dom); } catch (e) {}
                }
                try { this.renderer.dispose(); } catch (e) {}
                try {
                    if (typeof this.renderer.forceContextLoss === 'function') {
                        this.renderer.forceContextLoss();
                    }
                } catch (e) {}
                this.renderer = null;
            }
            if (this.containerEl && this.containerEl.__scene3dInstance === this) {
                delete this.containerEl.__scene3dInstance;
            }
            activeScenes.delete(this);
        }
    }

    // ---------------------------------------------------------
    // 1. HeroShowcase (Character / Party Screen)
    // ---------------------------------------------------------
    function HeroShowcase(containerEl) {
        if (!(this instanceof HeroShowcase)) return new HeroShowcase(containerEl);
        this._base = new BaseScene3D(containerEl, { defaultWidth: 520, defaultHeight: 360, fov: 42 });
        this.heroEntries = [];
        this.selectedIndex = 0;
        this.orbitYaw = 0;
        this.orbitPitch = 0.25;
        this._dragging = false;
        this._lastX = 0;
        this._lastY = 0;

        if (this._base.active) {
            this._setupStage();
            this._bindOrbit();
            this._base._onUpdate = (dt, t) => this._update(dt, t);
            this._base._startLoop();
        }
    }

    HeroShowcase.prototype._setupStage = function () {
        const THREE = this._base.THREE;
        const scene = this._base.scene;
        scene.background = new THREE.Color(0x0c0a14);
        if (THREE.FogExp2) scene.fog = new THREE.FogExp2(0x0c0a14, 0.045);

        const hemi = new THREE.HemisphereLight(0xcbd5e1, 0x1e1b2e, 0.75);
        scene.add(hemi);

        const spot = new THREE.DirectionalLight(0xfef3c7, 1.35);
        setVec3(spot.position, 2.5, 6.5, 4.5);
        spot.castShadow = true;
        scene.add(spot);

        this._torchLight = new THREE.PointLight(0xff7b29, 1.8, 12);
        setVec3(this._torchLight.position, -2.5, 2.4, 2.0);
        scene.add(this._torchLight);

        const rim = new THREE.PointLight(0x6366f1, 1.2, 12);
        setVec3(rim.position, 3.0, 2.8, -2.8);
        scene.add(rim);

        this._stageGroup = new THREE.Group();
        scene.add(this._stageGroup);

        // Dark-fantasy stone dais & rune rings
        const daisMat = new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.85, metalness: 0.2, flatShading: true });
        const dais = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.30, 12), daisMat);
        setVec3(dais.position, 0, -0.15, 0);
        dais.receiveShadow = true;
        this._stageGroup.add(dais);

        const runeRingMat = new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
        this._outerRune = new THREE.Mesh(new THREE.RingGeometry(2.65, 2.85, 32), runeRingMat);
        setVec3(this._outerRune.rotation, -Math.PI / 2, 0, 0);
        setVec3(this._outerRune.position, 0, 0.015, 0);
        this._stageGroup.add(this._outerRune);

        const selectMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
        this._selectRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 24), selectMat);
        setVec3(this._selectRing.rotation, -Math.PI / 2, 0, 0);
        setVec3(this._selectRing.position, 0, 0.02, 1.05);
        this._stageGroup.add(this._selectRing);

        this._heroesGroup = new THREE.Group();
        this._stageGroup.add(this._heroesGroup);

        this._embers = createEmberSystem(THREE, 45, { x: 5.5, y: 3.6, z: 5.5, size: 0.08 }, 0xfbbf24);
        if (this._embers) this._stageGroup.add(this._embers);
    };

    HeroShowcase.prototype._bindOrbit = function () {
        const dom = this._base.renderer?.domElement;
        if (!dom) return;
        this._base._listen(dom, 'pointerdown', (e) => {
            this._dragging = true;
            this._lastX = e.clientX;
            this._lastY = e.clientY;
        });
        this._base._listen(window, 'pointermove', (e) => {
            if (!this._dragging) return;
            const dx = e.clientX - this._lastX;
            const dy = e.clientY - this._lastY;
            this._lastX = e.clientX;
            this._lastY = e.clientY;
            this.orbitYaw += dx * 0.01;
            this.orbitPitch = Math.max(0.08, Math.min(0.85, this.orbitPitch + dy * 0.008));
        });
        this._base._listen(window, 'pointerup', () => { this._dragging = false; });
    };

    HeroShowcase.prototype.setParty = function (party, selectedIndex = 0) {
        if (!this._base.active || this._base.disposed) return;
        const list = Array.isArray(party) && party.length > 0 ? party : [{ playerClass: 'Guerreiro' }];
        this.selectedIndex = Math.max(0, Math.min(list.length - 1, selectedIndex || 0));

        // Clear old hero meshes
        while (this._heroesGroup.children.length > 0) {
            const ch = this._heroesGroup.children[0];
            this._heroesGroup.remove(ch);
            disposeObject3D(ch);
        }
        this.heroEntries = [];

        // Build heroic formation (selected front-center, companions behind in crescent)
        const backSlots = [
            { x: -1.45, z: -0.45, ry: 0.25 },
            { x: 1.45,  z: -0.45, ry: -0.25 },
            { x: 0.0,   z: -1.35, ry: 0 },
            { x: -2.2,  z: -1.1,  ry: 0.35 },
            { x: 2.2,   z: -1.1,  ry: -0.35 }
        ];
        let backCursor = 0;

        list.forEach((p, idx) => {
            const model = this._base.Models3D.createHeroModel(p);
            if (!model) return;
            if (idx === this.selectedIndex) {
                setVec3(model.position, 0, 0.02, 1.05);
                setVec3(model.scale, 1.08, 1.08, 1.08);
            } else {
                const slot = backSlots[backCursor % backSlots.length];
                backCursor++;
                setVec3(model.position, slot.x, 0.02, slot.z);
                setVec3(model.rotation, 0, slot.ry, 0);
            }
            this._heroesGroup.add(model);
            this.heroEntries[idx] = { model, player: p };
        });
    };

    HeroShowcase.prototype.triggerAction = function (index, animMode) {
        if (!this._base.active || this._base.disposed) return;
        const entry = this.heroEntries[index];
        if (entry && entry.model) {
            this._base.Models3D.playOneShot(entry.model, animMode || 'celebrate', 0.75);
        }
    };

    HeroShowcase.prototype._update = function (dt, t) {
        if (!this._dragging) {
            this.orbitYaw += dt * 0.14;
        }
        if (this._stageGroup) {
            this._stageGroup.rotation.y = this.orbitYaw;
        }
        const dist = 5.4;
        const camY = 1.4 + this.orbitPitch * 2.4;
        setVec3(this._base.camera.position, 0, camY, dist);
        this._base.camera.lookAt(0, 1.0, 0.2);

        if (this._torchLight) {
            this._torchLight.intensity = 1.65 + Math.sin(t * 7.2) * 0.25;
        }
        if (this._outerRune) {
            this._outerRune.rotation.z = t * 0.25;
        }
        if (this._selectRing) {
            const s = 0.95 + Math.sin(t * 3.5) * 0.08;
            setVec3(this._selectRing.scale, s, s, 1);
        }
        if (this._embers) updateEmberSystem(this._embers, dt);

        this.heroEntries.forEach(entry => {
            if (entry && entry.model) {
                this._base.Models3D.updateAnimation(entry.model, dt);
            }
        });
    };

    HeroShowcase.prototype.resize = function () { this._base.resize(); };
    HeroShowcase.prototype.setVisible = function (v) { this._base.setVisible(v); };
    HeroShowcase.prototype.dispose = function () { this._base.dispose(); this.heroEntries = []; };

    // ---------------------------------------------------------
    // 2. NPCPortrait (Compact Animated Bust Viewport)
    // ---------------------------------------------------------
    function NPCPortrait(containerEl, npcRoleOrId) {
        if (!(this instanceof NPCPortrait)) return new NPCPortrait(containerEl, npcRoleOrId);
        this._base = new BaseScene3D(containerEl, { defaultWidth: 150, defaultHeight: 170, fov: 36 });
        this.npcModel = null;

        if (this._base.active) {
            this._setupStage();
            this._base._onUpdate = (dt, t) => this._update(dt, t);
            this.setNPC(npcRoleOrId || 'guia');
            this._base._startLoop();
        }
    }

    NPCPortrait.prototype._setupStage = function () {
        const THREE = this._base.THREE;
        const scene = this._base.scene;
        scene.background = new THREE.Color(0x110d18);

        scene.add(new THREE.HemisphereLight(0xd8b4fe, 0x1c1917, 0.7));
        const key = new THREE.DirectionalLight(0xfef3c7, 1.25);
        setVec3(key.position, 1.5, 2.5, 2.2);
        scene.add(key);

        this._rimTorch = new THREE.PointLight(0xff7722, 2.0, 8);
        setVec3(this._rimTorch.position, -1.3, 1.8, -0.8);
        scene.add(this._rimTorch);

        setVec3(this._base.camera.position, 0.35, 1.44, 1.78);
        this._base.camera.lookAt(0, 1.15, 0);
    };

    NPCPortrait.prototype.setNPC = function (npcRoleOrId) {
        if (!this._base.active || this._base.disposed) return;
        if (this.npcModel) {
            this._base.scene.remove(this.npcModel);
            disposeObject3D(this.npcModel);
            this.npcModel = null;
        }
        const model = this._base.Models3D.createNPCModel(npcRoleOrId);
        if (model) {
            setVec3(model.rotation, 0, -0.22, 0);
            this._base.scene.add(model);
            this._base.Models3D.playOneShot(model, 'talk', 1.8);
            this.npcModel = model;
        }
    };

    NPCPortrait.prototype._update = function (dt, t) {
        if (this._rimTorch) {
            this._rimTorch.intensity = 1.85 + Math.sin(t * 8.4) * 0.3;
        }
        if (this.npcModel) {
            this.npcModel.rotation.y = -0.22 + Math.sin(t * 0.9) * 0.10;
            this._base.Models3D.updateAnimation(this.npcModel, dt);
        }
    };

    NPCPortrait.prototype.resize = function () { this._base.resize(); };
    NPCPortrait.prototype.setVisible = function (v) { this._base.setVisible(v); };
    NPCPortrait.prototype.dispose = function () { this._base.dispose(); this.npcModel = null; };

    // ---------------------------------------------------------
    // 3. CombatArena (Full 25x10 Tactical 3D Battlefield + VFX)
    // ---------------------------------------------------------
    function CombatArena(containerEl) {
        if (!(this instanceof CombatArena)) return new CombatArena(containerEl);
        this._base = new BaseScene3D(containerEl, { defaultWidth: 820, defaultHeight: 420, fov: 44 });
        this.gridWidth = 25;
        this.gridHeight = 10;
        this.tileSize = 1.2;

        this.onTileClick = null;
        this.onTileHover = null;

        this.currentTheme = null;
        this.unitMap = new Map();
        this.terrainMap = new Map();
        this.vfxList = [];
        this.activeMovePaths = new Map();
        this._lastCombatState = null;

        // Camera state
        this.cameraPreset = 'isometric';
        this.camYaw = 0;
        this.camPitch = 0.72;
        this.camDist = 23.0;
        this._targetCamFocus = { x: 0, y: 0, z: 0 };
        this._shakeTime = 0;
        this._shakeDuration = 0;
        this._shakeIntensity = 0;

        this._dragging = false;
        this._hasDragged = false;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._lastHover = null;

        if (this._base.active) {
            this._setupArena();
            this._bindInteractions();
            this.setTheme('forest');
            this._base._onUpdate = (dt, t) => this._update(dt, t);
            this._base._startLoop();
        }
    }

    CombatArena.prototype._gridToWorld = function (gx, gy) {
        return {
            x: (gx - (this.gridWidth - 1) / 2) * this.tileSize,
            z: (gy - (this.gridHeight - 1) / 2) * this.tileSize
        };
    };

    CombatArena.prototype._worldToGrid = function (wx, wz) {
        const gx = Math.round(wx / this.tileSize + (this.gridWidth - 1) / 2);
        const gy = Math.round(wz / this.tileSize + (this.gridHeight - 1) / 2);
        if (gx < 0 || gx >= this.gridWidth || gy < 0 || gy >= this.gridHeight) return null;
        return { x: gx, y: gy };
    };

    CombatArena.prototype._setupArena = function () {
        const THREE = this._base.THREE;
        const scene = this._base.scene;

        this._hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e1b18, 0.8);
        scene.add(this._hemiLight);

        this._sunLight = new THREE.DirectionalLight(0xfef3c7, 1.3);
        setVec3(this._sunLight.position, 10, 20, 12);
        this._sunLight.castShadow = true;
        scene.add(this._sunLight);

        this._rimLight = new THREE.PointLight(0x8b5cf6, 1.2, 45);
        setVec3(this._rimLight.position, -12, 8, -10);
        scene.add(this._rimLight);

        this._boardGroup = new THREE.Group();
        this._sceneryGroup = new THREE.Group();
        this._highlightGroup = new THREE.Group();
        this._terrainGroup = new THREE.Group();
        this._unitsGroup = new THREE.Group();
        this._vfxGroup = new THREE.Group();

        scene.add(this._boardGroup);
        scene.add(this._sceneryGroup);
        scene.add(this._highlightGroup);
        scene.add(this._terrainGroup);
        scene.add(this._unitsGroup);
        scene.add(this._vfxGroup);

        // Raycast invisible ground plane covering exact 25x10 grid
        const gw = this.gridWidth * this.tileSize;
        const gh = this.gridHeight * this.tileSize;
        const rayMat = new THREE.MeshBasicMaterial({ visible: false });
        this._rayPlane = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), rayMat);
        setVec3(this._rayPlane.rotation, -Math.PI / 2, 0, 0);
        setVec3(this._rayPlane.position, 0, 0.01, 0);
        scene.add(this._rayPlane);

        // Hover marker & active-turn marker
        const hoverMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.52, side: THREE.DoubleSide });
        this._hoverMesh = new THREE.Mesh(new THREE.PlaneGeometry(this.tileSize * 0.94, this.tileSize * 0.94), hoverMat);
        setVec3(this._hoverMesh.rotation, -Math.PI / 2, 0, 0);
        setVec3(this._hoverMesh.position, 0, 0.035, 0);
        this._hoverMesh.visible = false;
        scene.add(this._hoverMesh);

        const turnMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
        this._turnRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 20), turnMat);
        setVec3(this._turnRing.rotation, -Math.PI / 2, 0, 0);
        this._turnRing.visible = false;
        scene.add(this._turnRing);

        this._raycaster = THREE.Raycaster ? new THREE.Raycaster() : null;
        this._pointerVec = THREE.Vector2 ? new THREE.Vector2() : { x: 0, y: 0 };

        this._embers = createEmberSystem(THREE, 60, { x: gw, y: 5.5, z: gh, size: 0.11 }, 0xfbbf24);
        if (this._embers) scene.add(this._embers);

        this._updateCameraTransform();
    };

    CombatArena.prototype.setTheme = function (theme) {
        if (!this._base.active || this._base.disposed) return;
        const biome = normalizeBiome(theme);
        if (this.currentTheme === biome) return;
        this.currentTheme = biome;

        const THREE = this._base.THREE;
        const cfg = BIOME_CONFIG[biome] || BIOME_CONFIG.forest;

        this._base.scene.background = new THREE.Color(cfg.bg);
        if (THREE.FogExp2) this._base.scene.fog = new THREE.FogExp2(cfg.fog, cfg.fogDensity);
        if (this._hemiLight?.color?.setHex) this._hemiLight.color.setHex(cfg.ambient);
        if (this._sunLight?.color?.setHex) this._sunLight.color.setHex(cfg.sun);
        if (this._rimLight?.color?.setHex) this._rimLight.color.setHex(cfg.accent);
        if (this._embers?.material?.color?.setHex) this._embers.material.color.setHex(cfg.accent);

        // Rebuild 25x10 grid floor tiles
        while (this._boardGroup.children.length > 0) {
            const c = this._boardGroup.children[0];
            this._boardGroup.remove(c);
            disposeObject3D(c);
        }

        const gw = this.gridWidth * this.tileSize;
        const gh = this.gridHeight * this.tileSize;

        // Outer Arena Base
        const baseMesh = new THREE.Mesh(
            new THREE.BoxGeometry(gw + 8, 0.5, gh + 8),
            new THREE.MeshStandardMaterial({ color: cfg.bg, roughness: 0.95, flatShading: true })
        );
        setVec3(baseMesh.position, 0, -0.28, 0);
        baseMesh.receiveShadow = true;
        this._boardGroup.add(baseMesh);

        // Tactical 25x10 Checkerboard
        const tileGeom = new THREE.BoxGeometry(this.tileSize * 0.95, 0.08, this.tileSize * 0.95);
        const matA = new THREE.MeshStandardMaterial({ color: cfg.tileA, roughness: 0.85, flatShading: true });
        const matB = new THREE.MeshStandardMaterial({ color: cfg.tileB, roughness: 0.85, flatShading: true });

        for (let gx = 0; gx < this.gridWidth; gx++) {
            for (let gy = 0; gy < this.gridHeight; gy++) {
                const pos = this._gridToWorld(gx, gy);
                const tile = new THREE.Mesh(tileGeom, (gx + gy) % 2 === 0 ? matA : matB);
                setVec3(tile.position, pos.x, -0.04, pos.z);
                tile.receiveShadow = true;
                this._boardGroup.add(tile);
            }
        }

        // Border Frame
        const borderMat = new THREE.MeshStandardMaterial({ color: cfg.accent, emissive: cfg.accent, emissiveIntensity: 0.25, roughness: 0.6 });
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.4, 0.12, 0.14), borderMat);
        setVec3(topBar.position, 0, 0.02, -gh / 2 - 0.12);
        const botBar = new THREE.Mesh(new THREE.BoxGeometry(gw + 0.4, 0.12, 0.14), borderMat);
        setVec3(botBar.position, 0, 0.02, gh / 2 + 0.12);
        this._boardGroup.add(topBar);
        this._boardGroup.add(botBar);

        // Perimeter Biome Scenery Props
        while (this._sceneryGroup.children.length > 0) {
            const c = this._sceneryGroup.children[0];
            this._sceneryGroup.remove(c);
            disposeObject3D(c);
        }
        const props = biome === 'forest' ? ['tree', 'rock', 'tree']
            : biome === 'cave' ? ['rock', 'pillar', 'rock']
            : biome === 'ruins' ? ['pillar', 'wall', 'pillar']
            : biome === 'volcano' ? ['rock', 'pillar', 'rock']
            : ['pillar', 'rock', 'pillar'];

        for (let i = -3; i <= 3; i++) {
            const propName = props[Math.abs(i) % props.length];
            const mTop = this._base.Models3D.createPropModel(propName, biome);
            if (mTop) {
                setVec3(mTop.position, i * 4.4, 0, -gh / 2 - 1.6);
                this._sceneryGroup.add(mTop);
            }
            const mBot = this._base.Models3D.createPropModel(propName, biome);
            if (mBot) {
                setVec3(mBot.position, i * 4.4 + 1.5, 0, gh / 2 + 1.6);
                this._sceneryGroup.add(mBot);
            }
        }
    };

    CombatArena.prototype._bindInteractions = function () {
        const dom = this._base.renderer?.domElement;
        if (!dom) return;

        const getTileFromEvent = (e) => {
            if (!this._raycaster || !this._rayPlane) return null;
            const rect = dom.getBoundingClientRect();
            if (!rect || rect.width <= 0 || rect.height <= 0) return null;
            this._pointerVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this._pointerVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this._raycaster.setFromCamera(this._pointerVec, this._base.camera);
            const hits = this._raycaster.intersectObject(this._rayPlane, false);
            if (!hits || hits.length === 0) return null;
            const pt = hits[0].point;
            return this._worldToGrid(pt.x, pt.z);
        };

        this._base._listen(dom, 'pointerdown', (e) => {
            this._dragging = true;
            this._hasDragged = false;
            this._dragStartX = e.clientX;
            this._dragStartY = e.clientY;
        });

        this._base._listen(dom, 'pointermove', (e) => {
            if (this._dragging) {
                const dx = e.clientX - this._dragStartX;
                const dy = e.clientY - this._dragStartY;
                if (Math.hypot(dx, dy) > 6) {
                    this._hasDragged = true;
                    this.camYaw -= dx * 0.008;
                    this.camPitch = Math.max(0.28, Math.min(1.42, this.camPitch + dy * 0.006));
                    this._dragStartX = e.clientX;
                    this._dragStartY = e.clientY;
                    this._updateCameraTransform();
                }
            }
            const tile = getTileFromEvent(e);
            if (tile) {
                const pos = this._gridToWorld(tile.x, tile.y);
                setVec3(this._hoverMesh.position, pos.x, 0.035, pos.z);
                this._hoverMesh.visible = true;
                if (!this._lastHover || this._lastHover.x !== tile.x || this._lastHover.y !== tile.y) {
                    this._lastHover = tile;
                    if (typeof this.onTileHover === 'function') this.onTileHover(tile.x, tile.y);
                }
            } else {
                this._hoverMesh.visible = false;
                if (this._lastHover !== null) {
                    this._lastHover = null;
                    if (typeof this.onTileHover === 'function') this.onTileHover(null);
                }
            }
        });

        this._base._listen(window, 'pointerup', () => {
            this._dragging = false;
        });

        this._base._listen(dom, 'click', (e) => {
            if (this._hasDragged) {
                this._hasDragged = false;
                return;
            }
            const tile = getTileFromEvent(e);
            if (tile && typeof this.onTileClick === 'function') {
                this.onTileClick(tile.x, tile.y);
            }
        });

        this._base._listen(dom, 'wheel', (e) => {
            e.preventDefault();
            this.camDist = Math.max(10, Math.min(36, this.camDist + (e.deltaY > 0 ? 1.5 : -1.5)));
            this._updateCameraTransform();
        }, { passive: false });
    };

    CombatArena.prototype.setCameraPreset = function (preset) {
        this.cameraPreset = preset || 'isometric';
        if (preset === 'tactical') {
            this.camYaw = 0;
            this.camPitch = 1.32;
            this.camDist = 25.0;
        } else if (preset === 'close') {
            this.camYaw = 0.25;
            this.camPitch = 0.42;
            this.camDist = 14.5;
        } else {
            this.camYaw = 0.0;
            this.camPitch = 0.72;
            this.camDist = 23.0;
        }
        if (this._base.active) this._updateCameraTransform();
    };

    CombatArena.prototype._updateCameraTransform = function () {
        if (!this._base.camera) return;
        const fx = this._targetCamFocus.x;
        const fz = this._targetCamFocus.z;
        const cx = fx + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        const cy = Math.sin(this.camPitch) * this.camDist;
        const cz = fz + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;

        let sx = 0, sy = 0;
        if (this._shakeTime > 0 && this._shakeDuration > 0) {
            const amp = this._shakeIntensity * (this._shakeTime / this._shakeDuration);
            sx = (Math.random() - 0.5) * amp;
            sy = (Math.random() - 0.5) * amp;
        }
        setVec3(this._base.camera.position, cx + sx, Math.max(2.0, cy + sy), cz);
        this._base.camera.lookAt(fx, 0.5, fz);
    };

    CombatArena.prototype.setHighlights = function ({ moveTiles, attackTiles, hoverTile } = {}) {
        if (!this._base.active || this._base.disposed) return;
        const THREE = this._base.THREE;

        while (this._highlightGroup.children.length > 0) {
            const ch = this._highlightGroup.children[0];
            this._highlightGroup.remove(ch);
            disposeObject3D(ch);
        }

        const planeGeom = new THREE.PlaneGeometry(this.tileSize * 0.88, this.tileSize * 0.88);
        const addTiles = (coords, colorHex, opacity) => {
            if (!Array.isArray(coords) || coords.length === 0) return;
            const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity, side: THREE.DoubleSide });
            coords.forEach(c => {
                const pos = this._gridToWorld(c.x, c.y);
                const m = new THREE.Mesh(planeGeom, mat);
                setVec3(m.rotation, -Math.PI / 2, 0, 0);
                setVec3(m.position, pos.x, 0.025, pos.z);
                this._highlightGroup.add(m);
            });
        };

        addTiles(moveTiles, 0x10b981, 0.38);
        addTiles(attackTiles, 0xef4444, 0.40);
        if (hoverTile) {
            const pos = this._gridToWorld(hoverTile.x, hoverTile.y);
            setVec3(this._hoverMesh.position, pos.x, 0.035, pos.z);
            this._hoverMesh.visible = true;
        }
    };

    CombatArena.prototype._syncTerrains = function (activeTerrains) {
        const THREE = this._base.THREE;
        const terrains = Array.isArray(activeTerrains) ? activeTerrains : [];
        const keepKeys = new Set();

        terrains.forEach(t => {
            const key = `${t.x},${t.y},${t.type}`;
            keepKeys.add(key);
            if (this.terrainMap.has(key)) return;

            const group = new THREE.Group();
            const pos = this._gridToWorld(t.x, t.y);
            setVec3(group.position, pos.x, 0, pos.z);

            const tType = normalizeKey(t.type || 'fire');
            if (tType === 'wall') {
                const wall = this._base.Models3D.createPropModel('wall', this.currentTheme);
                if (wall) {
                    setVec3(wall.scale, 1.05, 0.9, 1.05);
                    group.add(wall);
                }
            } else if (tType === 'ice') {
                const iceMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45, transparent: true, opacity: 0.72, flatShading: true });
                for (let i = 0; i < 3; i++) {
                    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.75 + i * 0.15, 5), iceMat);
                    setVec3(spike.position, (i - 1) * 0.22, 0.38, (i % 2 - 0.5) * 0.2);
                    setVec3(spike.rotation, (i - 1) * 0.18, 0, (1 - i) * 0.15);
                    group.add(spike);
                }
            } else if (tType === 'healing' || tType === 'blessing' || tType === 'holy') {
                const col = tType === 'healing' ? 0x4ade80 : 0xfbbf24;
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.40, 0.48, 1.85, 10, 1, true),
                    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
                );
                setVec3(pillar.position, 0, 0.92, 0);
                group.add(pillar);
                const ring = new THREE.Mesh(
                    new THREE.RingGeometry(0.35, 0.52, 16),
                    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
                );
                setVec3(ring.rotation, -Math.PI / 2, 0, 0);
                setVec3(ring.position, 0, 0.03, 0);
                group.add(ring);
            } else if (tType === 'spikes' || tType === 'mine') {
                const spMat = new THREE.MeshStandardMaterial({ color: tType === 'mine' ? 0xa855f7 : 0x94a3b8, emissive: tType === 'mine' ? 0x9333ea : 0x000000, emissiveIntensity: 0.8, metalness: 0.7, flatShading: true });
                for (let sx of [-0.24, 0.24]) {
                    for (let sz of [-0.24, 0.24]) {
                        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 4), spMat);
                        setVec3(sp.position, sx, 0.22, sz);
                        group.add(sp);
                    }
                }
            } else {
                // 'fire' / 'lava' rising flames
                const pool = new THREE.Mesh(
                    new THREE.CircleGeometry(0.52, 12),
                    new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
                );
                setVec3(pool.rotation, -Math.PI / 2, 0, 0);
                setVec3(pool.position, 0, 0.03, 0);
                group.add(pool);
                const fMat = new THREE.MeshStandardMaterial({ color: 0xff6b00, emissive: 0xff4500, emissiveIntensity: 1.3, transparent: true, opacity: 0.85, flatShading: true });
                for (let i = 0; i < 3; i++) {
                    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.60, 5), fMat);
                    setVec3(flame.position, (i - 1) * 0.20, 0.30, (i % 2 - 0.5) * 0.16);
                    flame.userData = { flameIdx: i };
                    group.add(flame);
                }
            }

            group.userData = { terrainType: tType };
            this._terrainGroup.add(group);
            this.terrainMap.set(key, group);
        });

        for (const [key, grp] of this.terrainMap.entries()) {
            if (!keepKeys.has(key)) {
                this._terrainGroup.remove(grp);
                disposeObject3D(grp);
                this.terrainMap.delete(key);
            }
        }
    };

    CombatArena.prototype._syncStatusRing = function (entry, entity) {
        const THREE = this._base.THREE;
        const statuses = [];
        if (Array.isArray(entity.statusEffects)) {
            entity.statusEffects.forEach(s => statuses.push(normalizeKey(s.id || s.type || s)));
        }
        if (entity.defenseStance || entity.defenseBuffDuration > 0 || (entity.shield && entity.shield > 0)) {
            statuses.push('shield');
        }
        if (entity.tauntedBy && entity.tauntDuration > 0) {
            statuses.push('taunt');
        }

        const sig = statuses.join(',');
        if (entry.statusSig === sig) return;
        entry.statusSig = sig;

        if (entry.statusRing) {
            entry.container.remove(entry.statusRing);
            disposeObject3D(entry.statusRing);
            entry.statusRing = null;
        }
        if (statuses.length > 0) {
            const col = STATUS_COLORS[statuses[0]] || 0xfbbf24;
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.46, 0.55, 18),
                new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
            );
            setVec3(ring.rotation, -Math.PI / 2, 0, 0);
            setVec3(ring.position, 0, 0.03, 0);
            entry.container.add(ring);
            entry.statusRing = ring;
        }
    };

    CombatArena.prototype.syncState = function (combatState, theme) {
        this._lastCombatState = combatState;
        if (theme) this.setTheme(theme);
        if (!this._base.active || this._base.disposed || !combatState) return;

        const THREE = this._base.THREE;
        const party = Array.isArray(combatState.party) ? combatState.party : [];
        const monsters = Array.isArray(combatState.monsters) ? combatState.monsters : [];
        const activeIds = new Set();

        const reconcileUnit = (entity, id, isAlly, idx) => {
            activeIds.add(id);
            let entry = this.unitMap.get(id);
            const phase = entity.phase || (entity.isPhase2 ? 2 : 1);
            const cls = entity.playerClass || 'Nenhuma';
            const gearSig = isAlly
                ? `${entity.equipment?.weaponMain?.id || ''}:${entity.equipment?.weaponMain?.rarity || ''}:${entity.equipment?.weaponOff?.id || ''}:${entity.equipment?.weaponOff?.rarity || ''}`
                : '';

            const needsRebuild = !entry
                || (isAlly && (entry.playerClass !== cls || entry.gearSig !== gearSig))
                || (!isAlly && entry.phase !== phase);

            if (needsRebuild) {
                if (entry) {
                    this._unitsGroup.remove(entry.container);
                    disposeObject3D(entry.container);
                }
                const container = new THREE.Group();
                const model = isAlly
                    ? this._base.Models3D.createHeroModel(entity)
                    : this._base.Models3D.createMonsterModel(entity);
                if (!model) return;
                container.add(model);

                const hpSprite = createHPBarSprite(THREE);
                if (hpSprite) {
                    const yHeight = entity.isBoss ? 2.85 : 2.15;
                    setVec3(hpSprite.position, 0, yHeight, 0);
                    container.add(hpSprite);
                }

                const wpos = this._gridToWorld(entity.gridX ?? (isAlly ? 0 : 24), entity.gridY ?? idx * 2);
                setVec3(container.position, wpos.x, 0, wpos.z);
                setVec3(model.rotation, 0, isAlly ? Math.PI / 2 : -Math.PI / 2, 0);

                this._unitsGroup.add(container);
                entry = {
                    id,
                    isAlly,
                    entity,
                    container,
                    model,
                    hpSprite,
                    playerClass: cls,
                    gearSig,
                    phase,
                    wasDead: (entity.hp || 0) <= 0,
                    statusSig: '',
                    statusRing: null
                };
                if (entry.wasDead) {
                    this._base.Models3D.playOneShot(model, 'death', 0.5);
                }
                this.unitMap.set(id, entry);
            }

            entry.entity = entity;
            // Smoothly update position if not currently path-animating
            if (!this.activeMovePaths.has(id)) {
                const targetPos = this._gridToWorld(entity.gridX ?? 0, entity.gridY ?? 0);
                setVec3(entry.container.position, targetPos.x, 0, targetPos.z);
            }

            const maxHp = typeof entity.getMaxHp === 'function' ? entity.getMaxHp() : (entity.maxHp || 100);
            const isDead = (entity.hp || 0) <= 0;
            if (isDead && !entry.wasDead) {
                entry.wasDead = true;
                this._base.Models3D.playOneShot(entry.model, 'death', 0.55);
            } else if (!isDead && entry.wasDead) {
                entry.wasDead = false;
                entry.model.userData.animState = { mode: 'idle', time: 0, duration: 0, oneShot: false };
            }

            if (entry.hpSprite) {
                entry.hpSprite.visible = !isDead;
                if (!isDead) {
                    updateHPBarSprite(entry.hpSprite, entity.name || id, entity.hp, maxHp, entity.shield || 0, isAlly, Boolean(entity.isBoss));
                }
            }
            this._syncStatusRing(entry, entity);
        };

        party.forEach((p, idx) => reconcileUnit(p, `player_${idx}`, true, idx));
        monsters.forEach((m, idx) => reconcileUnit(m, m.instanceId || `monster_${idx}`, false, idx));

        for (const [id, entry] of this.unitMap.entries()) {
            if (!activeIds.has(id)) {
                this._unitsGroup.remove(entry.container);
                disposeObject3D(entry.container);
                this.unitMap.delete(id);
            }
        }

        // Active Turn Ring
        const turn = combatState.currentTurnEntity;
        let turnEntry = null;
        if (turn) {
            if (turn.type === 'player') turnEntry = this.unitMap.get(`player_${turn.index}`);
            else if (turn.type === 'monster') {
                const m = monsters[turn.index];
                turnEntry = this.unitMap.get(m?.instanceId || `monster_${turn.index}`);
            }
        }
        if (turnEntry && (turnEntry.entity.hp || 0) > 0) {
            this._turnRing.visible = true;
            setVec3(this._turnRing.position, turnEntry.container.position.x, 0.04, turnEntry.container.position.z);
        } else {
            this._turnRing.visible = false;
        }

        // Tactical Range Highlights
        let moveTiles = combatState.moveTiles || [];
        let attackTiles = combatState.attackTiles || [];
        if (turn && turn.type === 'player' && party[turn.index]) {
            const p = party[turn.index];
            if (moveTiles.length === 0 && combatState.isSelectingMove) {
                const rem = combatState.movementRemaining || 0;
                moveTiles = [];
                for (let x = 0; x < this.gridWidth; x++) {
                    for (let y = 0; y < this.gridHeight; y++) {
                        if (Math.abs((p.gridX ?? 0) - x) + Math.abs((p.gridY ?? 0) - y) <= rem) {
                            moveTiles.push({ x, y });
                        }
                    }
                }
            } else if (attackTiles.length === 0 && combatState.isSelectingTarget) {
                let range = 1;
                if (combatState.selectedSkill) {
                    range = combatState.selectedSkill.range || 4;
                } else {
                    const slot = combatState.selectedAttackSlot || 'weaponMain';
                    if (p.equipment?.[slot]?.range !== undefined) range = p.equipment[slot].range;
                }
                attackTiles = [];
                for (let x = 0; x < this.gridWidth; x++) {
                    for (let y = 0; y < this.gridHeight; y++) {
                        if (Math.abs((p.gridX ?? 0) - x) + Math.abs((p.gridY ?? 0) - y) <= range) {
                            attackTiles.push({ x, y });
                        }
                    }
                }
            }
        }
        this.setHighlights({ moveTiles, attackTiles, hoverTile: combatState.hoverTile });

        // Active Terrains
        this._syncTerrains(combatState.activeTerrains);
    };

    CombatArena.prototype._resolveUnitId = function (entityOrId) {
        if (typeof entityOrId === 'number') return `player_${entityOrId}`;
        if (typeof entityOrId === 'string') return entityOrId;
        if (entityOrId && typeof entityOrId === 'object') {
            if (entityOrId.instanceId && this.unitMap.has(entityOrId.instanceId)) return entityOrId.instanceId;
            for (const [id, entry] of this.unitMap.entries()) {
                if (entry.entity === entityOrId) return id;
            }
        }
        return null;
    };

    CombatArena.prototype.animateMove = function (entityId, pathCoords) {
        if (!this._base.active || this._base.disposed || !Array.isArray(pathCoords) || pathCoords.length === 0) {
            return Promise.resolve();
        }
        const id = this._resolveUnitId(entityId);
        const entry = id ? this.unitMap.get(id) : null;
        if (!entry) return Promise.resolve();

        const waypoints = pathCoords.map(c => this._gridToWorld(c.x, c.y));
        return new Promise(resolve => {
            entry.model.userData.animState = { mode: 'walk', time: 0, duration: 0, oneShot: false };
            this.activeMovePaths.set(id, {
                entry,
                waypoints,
                index: 0,
                speed: 6.5,
                resolve
            });
        });
    };

    CombatArena.prototype.playVFX = function (vfxEvent) {
        if (!this._base.active || this._base.disposed || !vfxEvent) return;
        const THREE = this._base.THREE;

        const resolvePos = (pt, idHint) => {
            if (pt && typeof pt.x === 'number' && typeof pt.y === 'number') {
                const w = this._gridToWorld(pt.x, pt.y);
                return { x: w.x, y: 1.0, z: w.z };
            }
            const uid = this._resolveUnitId(idHint);
            const entry = uid ? this.unitMap.get(uid) : null;
            if (entry) {
                return { x: entry.container.position.x, y: 1.0, z: entry.container.position.z };
            }
            return { x: 0, y: 1.0, z: 0 };
        };

        const from = resolvePos(vfxEvent.from, vfxEvent.sourceId);
        const to = resolvePos(vfxEvent.to, vfxEvent.targetId);
        const rawKind = normalizeKey(vfxEvent.type || 'slash');
        const kindAliases = {
            bow: 'arrow',
            magic: 'projectile', bolt: 'projectile', fire: 'fireball', fogo: 'fireball',
            ice: 'ice_shard', gelo: 'ice_shard', dark: 'dark_orb', trevas: 'dark_orb',
            poison: 'dark_orb', veneno: 'dark_orb',
            raio: 'lightning',
            holy: 'holy_beam', sagrado: 'holy_beam',
            cura: 'heal',
            defend: 'shield',
            reaction: 'combo', terrain: 'aoe',
            bossphase: 'boss_phase2', boss_phase: 'boss_phase2'
        };
        const kind = kindAliases[rawKind] || rawKind;
        const elem = normalizeKey(vfxEvent.element || '');

        // Trigger source/target animations if specified
        const srcEntry = this._resolveUnitId(vfxEvent.sourceId) ? this.unitMap.get(this._resolveUnitId(vfxEvent.sourceId)) : null;
        const tgtEntry = this._resolveUnitId(vfxEvent.targetId) ? this.unitMap.get(this._resolveUnitId(vfxEvent.targetId)) : null;
        if (srcEntry) {
            const anim = kind === 'ultimate' ? 'ultimate' : (kind === 'heal' || kind === 'shield' || kind === 'fireball' || kind === 'ice_shard' || kind === 'lightning' || kind === 'holy_beam' || kind === 'dark_orb' ? 'cast' : 'attack');
            this._base.Models3D.playOneShot(srcEntry.model, anim, 0.55);
        }
        if (tgtEntry && kind !== 'heal' && kind !== 'shield') {
            this._base.Models3D.playOneShot(tgtEntry.model, 'hit', 0.4);
        }

        const elemColorMap = {
            fogo: 0xff5500, fire: 0xff5500, gelo: 0x38bdf8, ice: 0x38bdf8,
            raio: 0xfacc15, lightning: 0xfacc15, sagrado: 0xfde047, holy: 0xfde047,
            trevas: 0xa855f7, dark: 0xa855f7, veneno: 0x4ade80, poison: 0x4ade80
        };
        const color = vfxEvent.color || elemColorMap[elem] || elemColorMap[kind] || 0xfbbf24;
        const duration = vfxEvent.duration || (kind === 'ultimate' || kind === 'boss_phase2' || kind === 'phase2' ? 0.95 : 0.48);

        const group = new THREE.Group();
        let onTick = null;

        if (kind === 'arrow' || kind === 'fireball' || kind === 'ice_shard' || kind === 'dark_orb' || kind === 'projectile') {
            const proj = new THREE.Mesh(
                kind === 'arrow' ? new THREE.CylinderGeometry(0.03, 0.03, 0.75, 5) : new THREE.OctahedronGeometry(0.24, 1),
                new THREE.MeshBasicMaterial({ color })
            );
            if (kind === 'arrow') proj.rotation.x = Math.PI / 2;
            group.add(proj);
            setVec3(group.position, from.x, from.y, from.z);
            if (typeof group.lookAt === 'function') group.lookAt(to.x, to.y, to.z);
            onTick = (p) => {
                const arcY = kind === 'arrow' ? Math.sin(p * Math.PI) * 1.1 : 0;
                setVec3(group.position,
                    from.x + (to.x - from.x) * p,
                    from.y + (to.y - from.y) * p + arcY,
                    from.z + (to.z - from.z) * p
                );
                proj.rotation.z += 0.25;
            };
        } else if (kind === 'lightning' || kind === 'shock') {
            const dx = to.x - from.x;
            const dz = to.z - from.z;
            const len = Math.max(0.5, Math.hypot(dx, dz));
            const bolt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.07, len, 5),
                new THREE.MeshBasicMaterial({ color: 0xfef08a })
            );
            setVec3(bolt.position, (from.x + to.x) / 2, 1.1, (from.z + to.z) / 2);
            if (typeof bolt.lookAt === 'function') bolt.lookAt(to.x, 1.1, to.z);
            if (typeof bolt.rotateX === 'function') bolt.rotateX(Math.PI / 2);
            group.add(bolt);
            this._triggerShake(0.22, 0.22);
            onTick = (p) => {
                const s = 1 - p * 0.7;
                setVec3(bolt.scale, s, 1, s);
            };
        } else if (kind === 'holy_beam' || kind === 'heal' || kind === 'ultimate') {
            const rad = kind === 'ultimate' ? 0.85 : 0.52;
            const beamCol = kind === 'heal' ? 0x4ade80 : color;
            const beam = new THREE.Mesh(
                new THREE.CylinderGeometry(rad * 0.6, rad, 7.5, 12, 1, true),
                new THREE.MeshBasicMaterial({ color: beamCol, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
            );
            setVec3(beam.position, to.x, 3.7, to.z);
            group.add(beam);
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.6, 20),
                new THREE.MeshBasicMaterial({ color: beamCol, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
            );
            setVec3(ring.rotation, -Math.PI / 2, 0, 0);
            setVec3(ring.position, to.x, 0.06, to.z);
            group.add(ring);
            if (kind === 'ultimate') this._triggerShake(0.45, 0.45);
            onTick = (p) => {
                const s = 1 + p * (kind === 'ultimate' ? 3.5 : 1.8);
                setVec3(ring.scale, s, s, 1);
                beam.material.opacity = 0.75 * (1 - p);
                ring.material.opacity = 0.85 * (1 - p);
            };
        } else if (kind === 'shield' || kind === 'buff') {
            const dome = new THREE.Mesh(
                new THREE.SphereGeometry(0.85, 12, 10),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, wireframe: true })
            );
            setVec3(dome.position, to.x, 0.9, to.z);
            group.add(dome);
            onTick = (p) => {
                const s = 0.7 + Math.sin(p * Math.PI) * 0.55;
                setVec3(dome.scale, s, s, s);
                dome.rotation.y += 0.12;
            };
        } else if (kind === 'boss_phase2' || kind === 'phase2' || kind === 'nova' || kind === 'aoe' || kind === 'shockwave' || kind === 'combo') {
            const isNova = kind === 'boss_phase2' || kind === 'phase2' || kind === 'nova';
            const ringCol = isNova ? 0xdc2626 : color;
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(0.65, 0.10, 6, 20),
                new THREE.MeshBasicMaterial({ color: ringCol, transparent: true, opacity: 0.9 })
            );
            setVec3(ring.rotation, Math.PI / 2, 0, 0);
            setVec3(ring.position, to.x, 0.25, to.z);
            group.add(ring);
            const burst = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 10, 8),
                new THREE.MeshBasicMaterial({ color: isNova ? 0xa855f7 : ringCol, transparent: true, opacity: 0.65 })
            );
            setVec3(burst.position, to.x, 0.75, to.z);
            group.add(burst);
            this._triggerShake(isNova ? 0.6 : 0.35, isNova ? 0.55 : 0.28);
            const maxExpand = (vfxEvent.radius || (isNova ? 4.5 : 2.6));
            onTick = (p) => {
                const s = 1 + p * maxExpand;
                setVec3(ring.scale, s, s, 1);
                setVec3(burst.scale, 1 + p * 2.0, 1 + p * 2.0, 1 + p * 2.0);
                ring.material.opacity = 0.9 * (1 - p);
                burst.material.opacity = 0.65 * (1 - p);
            };
        } else {
            // Default melee slash / hit burst
            const slash = new THREE.Mesh(
                new THREE.TorusGeometry(0.65, 0.07, 5, 14, Math.PI * 1.2),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92 })
            );
            setVec3(slash.position, to.x, 1.0, to.z);
            setVec3(slash.rotation, 0.35, 0.5, -0.4);
            group.add(slash);
            if (vfxEvent.isCrit) this._triggerShake(0.32, 0.25);
            onTick = (p) => {
                slash.rotation.z += 0.28;
                slash.material.opacity = 0.92 * (1 - p);
            };
        }

        this._vfxGroup.add(group);
        this.vfxList.push({ group, elapsed: 0, duration, onTick });
    };

    CombatArena.prototype._triggerShake = function (intensity, duration) {
        this._shakeIntensity = Math.max(this._shakeIntensity, intensity || 0.3);
        this._shakeDuration = Math.max(this._shakeDuration, duration || 0.3);
        this._shakeTime = this._shakeDuration;
    };

    CombatArena.prototype._update = function (dt, t) {
        // Update unit models & walking interpolation
        for (const [id, pathJob] of this.activeMovePaths.entries()) {
            const wp = pathJob.waypoints[pathJob.index];
            const pos = pathJob.entry.container.position;
            const dx = wp.x - pos.x;
            const dz = wp.z - pos.z;
            const dist = Math.hypot(dx, dz);
            const step = pathJob.speed * dt;
            if (dist <= step) {
                setVec3(pos, wp.x, 0, wp.z);
                pathJob.index++;
                if (pathJob.index >= pathJob.waypoints.length) {
                    pathJob.entry.model.userData.animState = { mode: 'idle', time: 0, duration: 0, oneShot: false };
                    setVec3(pathJob.entry.model.rotation, 0, pathJob.entry.isAlly ? Math.PI / 2 : -Math.PI / 2, 0);
                    this.activeMovePaths.delete(id);
                    pathJob.resolve();
                }
            } else {
                pos.x += (dx / dist) * step;
                pos.z += (dz / dist) * step;
                pathJob.entry.model.rotation.y = Math.atan2(dx, dz);
            }
        }

        for (const entry of this.unitMap.values()) {
            this._base.Models3D.updateAnimation(entry.model, dt);
        }

        // Update animated terrains (fire flicker)
        for (const grp of this.terrainMap.values()) {
            if (grp.userData?.terrainType === 'fire' || grp.userData?.terrainType === 'lava') {
                grp.children.forEach(c => {
                    if (c.userData?.flameIdx !== undefined) {
                        const s = 0.85 + Math.sin(t * 9 + c.userData.flameIdx * 2.1) * 0.25;
                        setVec3(c.scale, 1, s, 1);
                    }
                });
            }
        }

        // Update active turn ring & embers
        if (this._turnRing && this._turnRing.visible) {
            this._turnRing.rotation.z = t * 2.2;
        }
        if (this._embers) updateEmberSystem(this._embers, dt);

        // Update VFX
        for (let i = this.vfxList.length - 1; i >= 0; i--) {
            const fx = this.vfxList[i];
            fx.elapsed += dt;
            const p = Math.min(1, fx.elapsed / fx.duration);
            if (fx.onTick) fx.onTick(p);
            if (fx.elapsed >= fx.duration) {
                this._vfxGroup.remove(fx.group);
                disposeObject3D(fx.group);
                this.vfxList.splice(i, 1);
            }
        }

        if (this._shakeTime > 0) {
            this._shakeTime = Math.max(0, this._shakeTime - dt);
            this._updateCameraTransform();
        }
    };

    CombatArena.prototype.resize = function () { this._base.resize(); };
    CombatArena.prototype.setVisible = function (v) { this._base.setVisible(v); };
    CombatArena.prototype.dispose = function () {
        this._base.dispose();
        this.unitMap.clear();
        this.terrainMap.clear();
        this.vfxList = [];
        this.activeMovePaths.clear();
    };

    // ---------------------------------------------------------
    // 4. WorldExplorer (Interactive 3D Isometric World Map)
    // ---------------------------------------------------------
    function WorldExplorer(containerEl, tileMap) {
        if (!(this instanceof WorldExplorer)) return new WorldExplorer(containerEl, tileMap);
        this._base = new BaseScene3D(containerEl, { defaultWidth: 860, defaultHeight: 430, fov: 42 });
        this.tileMap = tileMap || null;
        this.tileSize = 1.6;

        this._renderedMapId = null;
        this._fogMeshes = new Map();
        this._propMeshes = new Map();
        this._enemyMeshes = new Map();
        this._npcMeshes = new Map();
        this._chestMeshes = new Map();
        this._lavaMeshes = [];
        this._leaderModel = null;
        this._leaderSignature = '';
        this._leaderTarget = null;
        this._leaderPos = { x: 0, z: 0 };
        this._lastTileX = tileMap ? tileMap.playerX : 0;
        this._lastTileY = tileMap ? tileMap.playerY : 0;
        this._lastRevealedCount = tileMap && tileMap.revealed ? tileMap.revealed.size : 0;

        this.camYaw = 0.0;
        this.camDist = 18.0;
        this._dragging = false;
        this._hasDragged = false;
        this._dragStartX = 0;
        this._dragStartY = 0;

        if (this._base.active) {
            this._setupWorld();
            this._bindWorldEvents();
            this.syncFromTileMap();
            this._base._onUpdate = (dt, t) => this._update(dt, t);
            this._base._startLoop();
        }
    }

    WorldExplorer.prototype._setupWorld = function () {
        const THREE = this._base.THREE;
        const scene = this._base.scene;

        this._hemiLight = new THREE.HemisphereLight(0xa7f3d0, 0x0f172a, 0.72);
        scene.add(this._hemiLight);

        this._dirLight = new THREE.DirectionalLight(0xfef3c7, 0.95);
        setVec3(this._dirLight.position, 14, 24, 16);
        this._dirLight.castShadow = true;
        scene.add(this._dirLight);

        this._torchLight = new THREE.PointLight(0xff8c32, 2.4, 14);
        scene.add(this._torchLight);

        this._worldGroup = new THREE.Group();
        this._tilesGroup = new THREE.Group();
        this._propsGroup = new THREE.Group();
        this._actorsGroup = new THREE.Group();
        this._fogGroup = new THREE.Group();

        this._worldGroup.add(this._tilesGroup);
        this._worldGroup.add(this._propsGroup);
        this._worldGroup.add(this._actorsGroup);
        this._worldGroup.add(this._fogGroup);
        scene.add(this._worldGroup);

        this._raycaster = THREE.Raycaster ? new THREE.Raycaster() : null;
        this._pointerVec = THREE.Vector2 ? new THREE.Vector2() : { x: 0, y: 0 };
    };

    WorldExplorer.prototype._bindWorldEvents = function () {
        const dom = this._base.renderer?.domElement;
        if (!dom) return;

        this._base._listen(dom, 'pointerdown', (e) => {
            this._dragging = true;
            this._hasDragged = false;
            this._dragStartX = e.clientX;
            this._dragStartY = e.clientY;
        });

        this._base._listen(window, 'pointermove', (e) => {
            if (!this._dragging) return;
            const dx = e.clientX - this._dragStartX;
            const dy = e.clientY - this._dragStartY;
            if (Math.hypot(dx, dy) > 6) {
                this._hasDragged = true;
                this.camYaw -= dx * 0.008;
                this._dragStartX = e.clientX;
                this._dragStartY = e.clientY;
            }
        });

        this._base._listen(window, 'pointerup', () => { this._dragging = false; });

        this._base._listen(dom, 'click', (e) => {
            if (this._hasDragged) {
                this._hasDragged = false;
                return;
            }
            if (!this._raycaster || !this._rayPlane || !this.tileMap) return;
            const rect = dom.getBoundingClientRect();
            if (!rect || rect.width <= 0 || rect.height <= 0) return;
            this._pointerVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this._pointerVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this._raycaster.setFromCamera(this._pointerVec, this._base.camera);
            const hits = this._raycaster.intersectObject(this._rayPlane, false);
            if (hits && hits.length > 0) {
                const pt = hits[0].point;
                const tx = Math.round(pt.x / this.tileSize);
                const ty = Math.round(pt.z / this.tileSize);
                if (typeof this.tileMap.handleTileClick === 'function') {
                    const prevX = this.tileMap.playerX;
                    const prevY = this.tileMap.playerY;
                    this.tileMap.handleTileClick(tx, ty);
                    if (this.tileMap.playerX !== prevX || this.tileMap.playerY !== prevY) {
                        this.onMove(prevX, prevY, this.tileMap.playerX, this.tileMap.playerY);
                    } else {
                        this.syncFromTileMap();
                    }
                }
            }
        });

        this._base._listen(dom, 'wheel', (e) => {
            e.preventDefault();
            this.camDist = Math.max(10, Math.min(30, this.camDist + (e.deltaY > 0 ? 1.2 : -1.2)));
        }, { passive: false });
    };

    WorldExplorer.prototype._rebuildMapGeometry = function () {
        const THREE = this._base.THREE;
        const tm = this.tileMap;
        if (!tm || !tm.currentMap) return;

        const map = tm.currentMap;
        const theme = normalizeBiome(map.theme || tm.currentMapId);
        const cfg = BIOME_CONFIG[theme] || BIOME_CONFIG.forest;

        this._renderedMapId = tm.currentMapId;
        this._base.scene.background = new THREE.Color(cfg.bg);
        if (THREE.FogExp2) {
            const fogDensity = map.hasExplorationDebuff ? 0.052 : cfg.fogDensity;
            this._base.scene.fog = new THREE.FogExp2(cfg.fog, fogDensity);
        }

        [this._tilesGroup, this._propsGroup, this._fogGroup].forEach(grp => {
            while (grp.children.length > 0) {
                const ch = grp.children[0];
                grp.remove(ch);
                disposeObject3D(ch);
            }
        });
        this._fogMeshes.clear();
        this._propMeshes.clear();
        this._lavaMeshes = [];

        if (this._rayPlane) {
            this._base.scene.remove(this._rayPlane);
            disposeObject3D(this._rayPlane);
        }
        const mw = (map.width || 36) * this.tileSize;
        const mh = (map.height || 20) * this.tileSize;
        this._rayPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(mw, mh),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        setVec3(this._rayPlane.rotation, -Math.PI / 2, 0, 0);
        setVec3(this._rayPlane.position, mw / 2 - this.tileSize / 2, 0.01, mh / 2 - this.tileSize / 2);
        this._base.scene.add(this._rayPlane);

        const tileGeom = new THREE.BoxGeometry(this.tileSize * 0.98, 0.14, this.tileSize * 0.98);
        const fogGeom = new THREE.BoxGeometry(this.tileSize * 1.02, 1.35, this.tileSize * 1.02);
        const fogMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 1.0, flatShading: true });

        const groundMat = new THREE.MeshStandardMaterial({ color: cfg.tileA, roughness: 0.9, flatShading: true });
        const pathMat = new THREE.MeshStandardMaterial({ color: theme === 'abyss' ? 0x4c1d95 : 0x57402c, roughness: 0.9, flatShading: true });
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, emissive: 0x1e3a8a, emissiveIntensity: 0.25, transparent: true, opacity: 0.78 });
        const lavaMat = new THREE.MeshStandardMaterial({ color: 0xea580c, emissive: 0xff4500, emissiveIntensity: 1.1 });
        const voidMat = new THREE.MeshStandardMaterial({ color: 0x090214, emissive: 0x581c87, emissiveIntensity: 0.45 });

        const layout = map.layout || [];
        for (let ty = 0; ty < layout.length; ty++) {
            const row = layout[ty];
            for (let tx = 0; tx < row.length; tx++) {
                const ch = row[tx];
                const wx = tx * this.tileSize;
                const wz = ty * this.tileSize;

                let mat = groundMat;
                let yOff = -0.07;
                if (ch === 'P') mat = pathMat;
                else if (ch === 'W') { mat = waterMat; yOff = -0.14; }
                else if (ch === 'L') { mat = lavaMat; yOff = -0.12; }
                else if (ch === 'X') { mat = voidMat; yOff = -0.18; }

                const tile = new THREE.Mesh(tileGeom, mat);
                setVec3(tile.position, wx, yOff, wz);
                tile.receiveShadow = true;
                this._tilesGroup.add(tile);
                if (ch === 'L') this._lavaMeshes.push(tile);

                // 3D Props per tile char
                let propType = null;
                if (ch === 'T') propType = 'tree';
                else if (ch === 'R') propType = 'rock';
                else if (ch === 'O') propType = 'pillar';
                else if (ch === '#') propType = 'wall';
                else if (ch === 'B') propType = 'bridge';
                else if (ch === 'C') propType = 'camp';
                else if (ch === 'E') propType = 'portal';

                if (propType) {
                    const prop = this._base.Models3D.createPropModel(propType, theme);
                    if (prop) {
                        setVec3(prop.position, wx, 0, wz);
                        if (propType === 'wall') setVec3(prop.scale, this.tileSize, 1.1, this.tileSize);
                        if (propType === 'bridge') setVec3(prop.scale, this.tileSize, 1.0, this.tileSize);
                        this._propsGroup.add(prop);
                        this._propMeshes.set(`${tx},${ty}`, prop);
                    }
                }

                // Fog of war dark veil
                const fogBlock = new THREE.Mesh(fogGeom, fogMat);
                setVec3(fogBlock.position, wx, 0.65, wz);
                this._fogGroup.add(fogBlock);
                this._fogMeshes.set(`${tx},${ty}`, fogBlock);
            }
        }
    };

    WorldExplorer.prototype._ensureLeaderModel = function () {
        const party = (typeof window !== 'undefined' && window.gameParty) || [];
        const leader = party[0] || { playerClass: 'Guerreiro' };
        const sig = `${leader.playerClass || 'Nenhuma'}|${leader.equipment?.weaponMain?.id || ''}|${leader.equipment?.weaponOff?.id || ''}`;
        if (this._leaderModel && this._leaderSignature === sig) return;

        if (this._leaderModel) {
            this._actorsGroup.remove(this._leaderModel);
            disposeObject3D(this._leaderModel);
        }
        this._leaderSignature = sig;
        this._leaderModel = this._base.Models3D.createHeroModel(leader);
        if (this._leaderModel) {
            const px = (this.tileMap?.playerX || 0) * this.tileSize;
            const pz = (this.tileMap?.playerY || 0) * this.tileSize;
            this._leaderPos = { x: px, z: pz };
            setVec3(this._leaderModel.position, px, 0, pz);
            this._actorsGroup.add(this._leaderModel);
        }
    };

    WorldExplorer.prototype.syncFromTileMap = function () {
        if (!this._base.active || this._base.disposed || !this.tileMap) return;
        const tm = this.tileMap;

        if (this._renderedMapId !== tm.currentMapId) {
            this._rebuildMapGeometry();
            this._leaderTarget = null;
        }

        const revealed = tm.revealed || new Set();
        this._lastRevealedCount = revealed.size;
        this._lastTileX = tm.playerX;
        this._lastTileY = tm.playerY;
        const theme = normalizeBiome(tm.currentMap?.theme || tm.currentMapId);

        // Update Fog of War visibility
        for (const [key, mesh] of this._fogMeshes.entries()) {
            mesh.visible = !revealed.has(key);
        }
        for (const [key, prop] of this._propMeshes.entries()) {
            prop.visible = revealed.has(key);
        }

        // Update Leader
        this._ensureLeaderModel();
        if (this._leaderModel && !this._leaderTarget) {
            this._leaderPos = { x: tm.playerX * this.tileSize, z: tm.playerY * this.tileSize };
            setVec3(this._leaderModel.position, this._leaderPos.x, 0, this._leaderPos.z);
        }

        // Reconcile Active Enemies
        const enemies = typeof tm.getActiveEnemies === 'function' ? tm.getActiveEnemies() : [];
        const activeEnemyIds = new Set();

        enemies.forEach(e => {
            if (e.defeated) return;
            const isRev = revealed.has(`${e.x},${e.y}`);
            const dist = Math.hypot(e.x - tm.playerX, e.y - tm.playerY);
            const showEyes = !isRev && tm.currentMap?.enemiesSeePlayerInDark && dist <= 4.5;
            if (!isRev && !showEyes) return;

            const key = `${e.id}_${isRev ? 'full' : 'eyes'}`;
            activeEnemyIds.add(key);

            if (!this._enemyMeshes.has(key)) {
                let obj;
                if (isRev) {
                    obj = this._base.Models3D.createMonsterModel({ ...e, id: e.baseMobId || e.id });
                } else {
                    // Glowing eerie eyes in the darkness
                    const THREE = this._base.THREE;
                    obj = new THREE.Group();
                    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
                    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 5, 5), eyeMat);
                    const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 5, 5), eyeMat);
                    setVec3(e1.position, -0.18, 0.9, 0);
                    setVec3(e2.position, 0.18, 0.9, 0);
                    obj.add(e1);
                    obj.add(e2);
                }
                if (obj) {
                    setVec3(obj.position, e.x * this.tileSize, 0, e.y * this.tileSize);
                    this._actorsGroup.add(obj);
                    this._enemyMeshes.set(key, obj);
                }
            }
        });

        for (const [k, obj] of this._enemyMeshes.entries()) {
            if (!activeEnemyIds.has(k)) {
                this._actorsGroup.remove(obj);
                disposeObject3D(obj);
                this._enemyMeshes.delete(k);
            }
        }

        // Reconcile Map NPCs (within current map bounds)
        const mapNpcs = (typeof tm.getActiveNpcs === 'function' ? tm.getActiveNpcs() : null)
            || tm.npcsByMap?.[tm.currentMapId]
            || tm.currentMap?.npcs
            || [];
        const npcs = [
            ...mapNpcs,
            ...(tm.objects || []).filter(o => o.type === 'npc' && o.x >= 0 && o.y >= 0 && o.x < (tm.mapWidth || 36) && o.y < (tm.mapHeight || 20))
        ];
        const activeNpcKeys = new Set();
        npcs.forEach(n => {
            if (!revealed.has(`${n.x},${n.y}`)) return;
            const k = `${n.id || n.name}_${n.x}_${n.y}`;
            activeNpcKeys.add(k);
            if (!this._npcMeshes.has(k)) {
                const npcModel = this._base.Models3D.createNPCModel(n);
                if (npcModel) {
                    setVec3(npcModel.position, n.x * this.tileSize, 0, n.y * this.tileSize);
                    this._actorsGroup.add(npcModel);
                    this._npcMeshes.set(k, npcModel);
                }
            }
        });
        for (const [k, obj] of this._npcMeshes.entries()) {
            if (!activeNpcKeys.has(k)) {
                this._actorsGroup.remove(obj);
                disposeObject3D(obj);
                this._npcMeshes.delete(k);
            }
        }

        // Chests & Shrines if present on currentMap or GameMechanics
        const openedSet = (typeof window !== 'undefined' && window.GameMechanics?.state?.openedChests) || [];
        const rawChests = (typeof tm.getActiveChests === 'function' ? tm.getActiveChests() : null)
            || tm.chestsByMap?.[tm.currentMapId]
            || tm.currentMap?.chests
            || [];
        const rawShrines = (typeof tm.getActiveShrines === 'function' ? tm.getActiveShrines() : null)
            || tm.shrinesByMap?.[tm.currentMapId]
            || tm.currentMap?.shrines
            || [];
        const interactables = [
            ...rawChests.map(c => ({
                ...c,
                kind: (c.opened || (c.id && openedSet.includes && openedSet.includes(c.id))) ? 'chest_open' : 'chest'
            })),
            ...rawShrines.map(s => ({ ...s, kind: 'shrine' }))
        ];
        const activeIntKeys = new Set();
        interactables.forEach(it => {
            if (!revealed.has(`${it.x},${it.y}`)) return;
            const k = `${it.kind}_${it.x}_${it.y}`;
            activeIntKeys.add(k);
            if (!this._chestMeshes.has(k)) {
                const m = this._base.Models3D.createPropModel(it.kind, theme);
                if (m) {
                    setVec3(m.position, it.x * this.tileSize, 0, it.y * this.tileSize);
                    this._actorsGroup.add(m);
                    this._chestMeshes.set(k, m);
                }
            }
        });
        for (const [k, obj] of this._chestMeshes.entries()) {
            if (!activeIntKeys.has(k)) {
                this._actorsGroup.remove(obj);
                disposeObject3D(obj);
                this._chestMeshes.delete(k);
            }
        }
    };

    WorldExplorer.prototype.onMove = function (fromX, fromY, toX, toY) {
        if (!this._base.active || this._base.disposed) return;
        this._lastTileX = toX;
        this._lastTileY = toY;
        this.syncFromTileMap();
        if (!this._leaderModel) return;

        const targetX = toX * this.tileSize;
        const targetZ = toY * this.tileSize;
        this._leaderPos = { x: fromX * this.tileSize, z: fromY * this.tileSize };
        this._leaderTarget = { x: targetX, z: targetZ };
        this._leaderModel.userData.animState = { mode: 'walk', time: 0, duration: 0, oneShot: false };
    };

    WorldExplorer.prototype._update = function (dt, t) {
        if (this.tileMap) {
            if (this._renderedMapId !== this.tileMap.currentMapId) {
                this._lastTileX = this.tileMap.playerX;
                this._lastTileY = this.tileMap.playerY;
                this.syncFromTileMap();
            } else if (this.tileMap.playerX !== this._lastTileX || this.tileMap.playerY !== this._lastTileY) {
                const px = this._lastTileX;
                const py = this._lastTileY;
                this._lastTileX = this.tileMap.playerX;
                this._lastTileY = this.tileMap.playerY;
                this.onMove(px, py, this.tileMap.playerX, this.tileMap.playerY);
            } else if ((this.tileMap.revealed?.size || 0) !== this._lastRevealedCount) {
                this._lastRevealedCount = this.tileMap.revealed?.size || 0;
                this.syncFromTileMap();
            }
        }

        // Interpolate Leader Walk
        if (this._leaderModel && this._leaderTarget) {
            const dx = this._leaderTarget.x - this._leaderPos.x;
            const dz = this._leaderTarget.z - this._leaderPos.z;
            const dist = Math.hypot(dx, dz);
            const speed = 8.0 * dt;
            if (dist <= speed) {
                this._leaderPos = { ...this._leaderTarget };
                this._leaderTarget = null;
                this._leaderModel.userData.animState = { mode: 'idle', time: 0, duration: 0, oneShot: false };
            } else {
                this._leaderPos.x += (dx / dist) * speed;
                this._leaderPos.z += (dz / dist) * speed;
                this._leaderModel.rotation.y = Math.atan2(dx, dz);
            }
            setVec3(this._leaderModel.position, this._leaderPos.x, 0, this._leaderPos.z);
        }

        if (this._leaderModel) {
            this._base.Models3D.updateAnimation(this._leaderModel, dt);
        }

        // Dynamic Torch PointLight on Leader
        if (this._torchLight) {
            setVec3(this._torchLight.position, this._leaderPos.x, 2.2, this._leaderPos.z);
            this._torchLight.intensity = 2.2 + Math.sin(t * 9.0) * 0.3;
        }

        // Follow Camera smoothly
        const camX = this._leaderPos.x + Math.sin(this.camYaw) * this.camDist * 0.72;
        const camZ = this._leaderPos.z + Math.cos(this.camYaw) * this.camDist * 0.72;
        const camY = this.camDist * 0.78;
        setVec3(this._base.camera.position, camX, camY, camZ);
        this._base.camera.lookAt(this._leaderPos.x, 0.5, this._leaderPos.z);

        // Animate props & actors
        for (const prop of this._propMeshes.values()) {
            if (prop.visible) this._base.Models3D.updateAnimation(prop, dt);
        }
        for (const m of this._enemyMeshes.values()) {
            if (m.userData?.rig) this._base.Models3D.updateAnimation(m, dt);
        }
        for (const n of this._npcMeshes.values()) {
            this._base.Models3D.updateAnimation(n, dt);
        }
        for (const ch of this._chestMeshes.values()) {
            this._base.Models3D.updateAnimation(ch, dt);
        }
        if (this._lavaMeshes.length > 0) {
            const pulse = 0.95 + Math.sin(t * 3.5) * 0.35;
            this._lavaMeshes[0].material.emissiveIntensity = pulse;
        }
    };

    WorldExplorer.prototype.resize = function () { this._base.resize(); };
    WorldExplorer.prototype.setVisible = function (v) { this._base.setVisible(v); };
    WorldExplorer.prototype.dispose = function () {
        this._base.dispose();
        this._fogMeshes.clear();
        this._propMeshes.clear();
        this._enemyMeshes.clear();
        this._npcMeshes.clear();
        this._chestMeshes.clear();
        this._lavaMeshes = [];
    };

    // ---------------------------------------------------------
    // 5. VictoryDiorama (Campaign Ending Celebration)
    // ---------------------------------------------------------
    function VictoryDiorama(containerEl, party) {
        if (!(this instanceof VictoryDiorama)) return new VictoryDiorama(containerEl, party);
        this._base = new BaseScene3D(containerEl, { defaultWidth: 600, defaultHeight: 340, fov: 42 });
        this.heroModels = [];

        if (this._base.active) {
            this._setupStage();
            this.setParty(party);
            this._base._onUpdate = (dt, t) => this._update(dt, t);
            this._base._startLoop();
        }
    }

    VictoryDiorama.prototype._setupStage = function () {
        const THREE = this._base.THREE;
        const scene = this._base.scene;
        scene.background = new THREE.Color(0x140f1c);
        if (THREE.FogExp2) scene.fog = new THREE.FogExp2(0x140f1c, 0.04);

        scene.add(new THREE.HemisphereLight(0xfef3c7, 0x1e1b2e, 0.9));
        const sun = new THREE.DirectionalLight(0xfde047, 1.55);
        setVec3(sun.position, 2, 7, 4);
        scene.add(sun);

        this._stageGroup = new THREE.Group();
        scene.add(this._stageGroup);

        const dais = new THREE.Mesh(
            new THREE.CylinderGeometry(3.4, 3.8, 0.35, 16),
            new THREE.MeshStandardMaterial({ color: 0x262335, roughness: 0.75, metalness: 0.35, flatShading: true })
        );
        setVec3(dais.position, 0, -0.175, 0);
        this._stageGroup.add(dais);

        this._haloRing = new THREE.Mesh(
            new THREE.RingGeometry(2.7, 3.05, 32),
            new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.78, side: THREE.DoubleSide })
        );
        setVec3(this._haloRing.rotation, -Math.PI / 2, 0, 0);
        setVec3(this._haloRing.position, 0, 0.02, 0);
        this._stageGroup.add(this._haloRing);

        this._heroesGroup = new THREE.Group();
        this._stageGroup.add(this._heroesGroup);

        this._embers = createEmberSystem(THREE, 75, { x: 6.0, y: 4.5, z: 6.0, size: 0.11 }, 0xfde047);
        if (this._embers) this._stageGroup.add(this._embers);
    };

    VictoryDiorama.prototype.setParty = function (party) {
        if (!this._base.active || this._base.disposed) return;
        const list = Array.isArray(party) && party.length > 0 ? party : [{ playerClass: 'Guerreiro' }];
        while (this._heroesGroup.children.length > 0) {
            const c = this._heroesGroup.children[0];
            this._heroesGroup.remove(c);
            disposeObject3D(c);
        }
        this.heroModels = [];

        const spacing = 1.35;
        const startX = -((list.length - 1) * spacing) / 2;
        list.forEach((p, idx) => {
            const m = this._base.Models3D.createHeroModel(p);
            if (!m) return;
            const x = startX + idx * spacing;
            const z = Math.abs(idx - (list.length - 1) / 2) * -0.35 + 0.3;
            setVec3(m.position, x, 0, z);
            m.userData.animState = { mode: 'celebrate', time: idx * 0.4, duration: 0, oneShot: false };
            this._heroesGroup.add(m);
            this.heroModels.push(m);
        });
    };

    VictoryDiorama.prototype._update = function (dt, t) {
        if (this._stageGroup) {
            this._stageGroup.rotation.y = Math.sin(t * 0.35) * 0.45;
        }
        setVec3(this._base.camera.position, 0, 2.2, 5.8);
        this._base.camera.lookAt(0, 1.0, 0);
        if (this._haloRing) this._haloRing.rotation.z = t * 0.6;
        if (this._embers) updateEmberSystem(this._embers, dt);
        this.heroModels.forEach(m => this._base.Models3D.updateAnimation(m, dt));
    };

    VictoryDiorama.prototype.resize = function () { this._base.resize(); };
    VictoryDiorama.prototype.setVisible = function (v) { this._base.setVisible(v); };
    VictoryDiorama.prototype.dispose = function () { this._base.dispose(); this.heroModels = []; };

    const Scene3D = {
        isWebGLAvailable,
        HeroShowcase,
        NPCPortrait,
        CombatArena,
        WorldExplorer,
        VictoryDiorama,
        getActiveContextCount: () => activeScenes.size
    };

    if (typeof window !== 'undefined') {
        window.Scene3D = Scene3D;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Scene3D;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
