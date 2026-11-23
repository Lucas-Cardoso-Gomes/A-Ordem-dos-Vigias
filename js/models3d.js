/**
 * models3d.js
 * Procedural low-poly dark-fantasy Three.js (r128) character, NPC, monster, and prop builder.
 * Zero external asset downloads. Gracefully handles environments without THREE/WebGL.
 */
(function (rootScope) {
    'use strict';

    function getTHREE() {
        if (typeof window !== 'undefined' && window.THREE) return window.THREE;
        if (typeof global !== 'undefined' && global.THREE) return global.THREE;
        if (rootScope && rootScope.THREE) return rootScope.THREE;
        return null;
    }

    function normalizeText(str) {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    function setVec3(vec, x, y, z) {
        if (!vec) return;
        if (typeof vec.set === 'function') {
            vec.set(x, y, z);
        } else {
            vec.x = x;
            vec.y = y;
            vec.z = z;
        }
    }

    const RARITY_META = {
        comum:    { color: 0xa0a0a0, emissive: 0x000000, intensity: 0.0,  hasAura: false },
        incomum:  { color: 0x2ecc71, emissive: 0x16a34a, intensity: 0.28, hasAura: false },
        raro:     { color: 0x3498db, emissive: 0x2563eb, intensity: 0.48, hasAura: false },
        epico:    { color: 0x9b59b6, emissive: 0x9333ea, intensity: 0.72, hasAura: true },
        lendario: { color: 0xf1c40f, emissive: 0xd97706, intensity: 0.95, hasAura: true },
        mitico:   { color: 0xe74c3c, emissive: 0xdc2626, intensity: 1.25, hasAura: true }
    };

    function getRarityMeta(rarity) {
        const key = normalizeText(rarity || 'comum');
        return RARITY_META[key] || RARITY_META.comum;
    }

    const THEME_PALETTES = {
        forest:  { primary: 0x1f4d2b, secondary: 0x4a3525, stone: 0x5c636a, accent: 0x4ade80, glow: 0x22c55e },
        floresta:{ primary: 0x1f4d2b, secondary: 0x4a3525, stone: 0x5c636a, accent: 0x4ade80, glow: 0x22c55e },
        cave:    { primary: 0x272a36, secondary: 0x3b3f51, stone: 0x3f4354, accent: 0x38bdf8, glow: 0x0ea5e9 },
        caverna: { primary: 0x272a36, secondary: 0x3b3f51, stone: 0x3f4354, accent: 0x38bdf8, glow: 0x0ea5e9 },
        ruins:   { primary: 0x4e5259, secondary: 0x6b7078, stone: 0x737882, accent: 0xfbbf24, glow: 0x38bdf8 },
        ruinas:  { primary: 0x4e5259, secondary: 0x6b7078, stone: 0x737882, accent: 0xfbbf24, glow: 0x38bdf8 },
        volcano: { primary: 0x3b1f1c, secondary: 0x241717, stone: 0x2d2424, accent: 0xff5500, glow: 0xf97316 },
        vulcao:  { primary: 0x3b1f1c, secondary: 0x241717, stone: 0x2d2424, accent: 0xff5500, glow: 0xf97316 },
        abyss:   { primary: 0x28133d, secondary: 0x180b29, stone: 0x2b1b42, accent: 0xc084fc, glow: 0xa855f7 },
        abismo:  { primary: 0x28133d, secondary: 0x180b29, stone: 0x2b1b42, accent: 0xc084fc, glow: 0xa855f7 }
    };

    function getThemePalette(theme) {
        return THEME_PALETTES[normalizeText(theme || 'forest')] || THEME_PALETTES.forest;
    }

    function createGeometry(THREE, type, args) {
        const fallbackMap = {
            OctahedronGeometry: 'SphereGeometry',
            DodecahedronGeometry: 'SphereGeometry',
            IcosahedronGeometry: 'SphereGeometry',
            TetrahedronGeometry: 'ConeGeometry',
            TorusGeometry: 'CylinderGeometry',
            RingGeometry: 'PlaneGeometry'
        };
        let Ctor = THREE[type];
        if (!Ctor && fallbackMap[type]) {
            Ctor = THREE[fallbackMap[type]];
        }
        if (!Ctor) {
            Ctor = THREE.BoxGeometry;
        }
        if (!Ctor) return null;
        return new Ctor(...(args || []));
    }

    function createMaterial(THREE, opts) {
        const o = opts || {};
        const params = {
            color: o.color !== undefined ? o.color : 0x888888
        };
        if (o.flatShading !== false) params.flatShading = true;
        if (o.roughness !== undefined) params.roughness = o.roughness;
        else params.roughness = 0.72;
        if (o.metalness !== undefined) params.metalness = o.metalness;
        else params.metalness = 0.18;
        if (o.emissive !== undefined) params.emissive = o.emissive;
        if (o.emissiveIntensity !== undefined) params.emissiveIntensity = o.emissiveIntensity;
        if (o.transparent) {
            params.transparent = true;
            params.opacity = o.opacity !== undefined ? o.opacity : 0.75;
        }
        if (o.side !== undefined) params.side = o.side;

        const MatCtor = THREE.MeshStandardMaterial || THREE.MeshBasicMaterial;
        if (!MatCtor) return {};
        if (MatCtor === THREE.MeshBasicMaterial) {
            const basicParams = { color: params.color };
            if (params.transparent) {
                basicParams.transparent = true;
                basicParams.opacity = params.opacity;
            }
            if (params.side !== undefined) basicParams.side = params.side;
            return new MatCtor(basicParams);
        }
        return new MatCtor(params);
    }

    function addPart(THREE, parent, geomType, geomArgs, matOpts, pos, rot, scale) {
        if (!parent || !THREE.Mesh) return null;
        const geom = createGeometry(THREE, geomType, geomArgs);
        const mat = createMaterial(THREE, matOpts);
        const mesh = new THREE.Mesh(geom, mat);
        if (pos) setVec3(mesh.position, pos[0] || 0, pos[1] || 0, pos[2] || 0);
        if (rot) setVec3(mesh.rotation, rot[0] || 0, rot[1] || 0, rot[2] || 0);
        if (scale) setVec3(mesh.scale, scale[0] ?? 1, scale[1] ?? 1, scale[2] ?? 1);
        mesh.castShadow = matOpts?.castShadow !== false;
        mesh.receiveShadow = matOpts?.receiveShadow !== false;
        parent.add(mesh);
        return mesh;
    }

    function createRigRoot(THREE) {
        const root = new THREE.Group();
        const rig = {
            root,
            body: new THREE.Group(),
            head: new THREE.Group(),
            leftArm: new THREE.Group(),
            rightArm: new THREE.Group(),
            leftLeg: new THREE.Group(),
            rightLeg: new THREE.Group(),
            weapon: new THREE.Group(),
            shield: new THREE.Group(),
            cape: new THREE.Group(),
            aura: new THREE.Group(),
            wings: new THREE.Group(),
            extras: new THREE.Group()
        };

        // Standard humanoid/creature skeletal hierarchy
        setVec3(rig.body.position, 0, 0.86, 0);
        setVec3(rig.head.position, 0, 0.44, 0);
        setVec3(rig.leftArm.position, -0.34, 0.28, 0);
        setVec3(rig.rightArm.position, 0.34, 0.28, 0);
        setVec3(rig.leftLeg.position, -0.15, 0.56, 0);
        setVec3(rig.rightLeg.position, 0.15, 0.56, 0);
        setVec3(rig.weapon.position, 0, -0.38, 0.08);
        setVec3(rig.shield.position, -0.06, -0.28, 0.09);
        setVec3(rig.cape.position, 0, 0.30, -0.18);
        setVec3(rig.wings.position, 0, 0.22, -0.17);
        setVec3(rig.aura.position, 0, 0.04, 0);

        root.add(rig.body);
        root.add(rig.leftLeg);
        root.add(rig.rightLeg);
        root.add(rig.aura);
        root.add(rig.extras);

        rig.body.add(rig.head);
        rig.body.add(rig.leftArm);
        rig.body.add(rig.rightArm);
        rig.body.add(rig.cape);
        rig.body.add(rig.wings);

        rig.rightArm.add(rig.weapon);
        rig.leftArm.add(rig.shield);

        root.userData.rig = rig;
        root.userData.animState = {
            mode: 'idle',
            time: 0,
            duration: 0,
            oneShot: false
        };

        return { root, rig };
    }

    function saveRestPose(rig) {
        if (!rig) return;
        const keys = ['root', 'body', 'head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'weapon', 'shield', 'cape', 'aura', 'wings', 'extras'];
        keys.forEach(k => {
            const g = rig[k];
            if (!g) return;
            g.userData = g.userData || {};
            g.userData.basePos = { x: g.position.x || 0, y: g.position.y || 0, z: g.position.z || 0 };
            g.userData.baseRot = { x: g.rotation.x || 0, y: g.rotation.y || 0, z: g.rotation.z || 0 };
        });
    }

    function setFromRest(part, dx, dy, dz, rx, ry, rz) {
        if (!part) return;
        const bp = part.userData?.basePos || { x: 0, y: 0, z: 0 };
        const br = part.userData?.baseRot || { x: 0, y: 0, z: 0 };
        setVec3(part.position, bp.x + (dx || 0), bp.y + (dy || 0), bp.z + (dz || 0));
        setVec3(part.rotation, br.x + (rx || 0), br.y + (ry || 0), br.z + (rz || 0));
    }

    // ---------------------------------------------------------
    // Weapon & Shield Procedural Builders
    // ---------------------------------------------------------
    function detectWeaponKind(weapon, fallbackKind) {
        if (!weapon) return fallbackKind || 'sword';
        const name = normalizeText(weapon.name || '');
        const id = normalizeText(weapon.id || '');
        if (name.includes('arco') || id === 'w6') return 'bow';
        if (name.includes('besta') || id === 'w5') return 'crossbow';
        if (name.includes('cajado') || name.includes('cetro') || id === 'w7' || id === 'w8') return 'staff';
        if (name.includes('tomo') || name.includes('grimorio') || id === 'w9' || id === 'w10' || id === 'wo6') return 'tome';
        if (name.includes('orbe') || id === 'wo4') return 'orb';
        if (name.includes('martelo') || name.includes('maça') || id === 'w12') return 'hammer';
        if (name.includes('machado') || id === 'w3') return 'axe';
        if (name.includes('lanca') || id === 'w4') return 'spear';
        if (name.includes('adaga') || id === 'wo1' || id === 'wo3') return 'dagger';
        if (name.includes('katana') || id === 'w11') return 'katana';
        if (name.includes('montante') || name.includes('colossal') || name.includes('cataclismo')) return 'greatsword';
        if (weapon.magic) return 'staff';
        return fallbackKind || 'sword';
    }

    function getElementColor(weapon, fallbackHex) {
        const text = normalizeText((weapon?.name || '') + ' ' + (weapon?.weakness || '') + ' ' + (weapon?.element || ''));
        if (text.includes('fogo') || text.includes('magma') || text.includes('ign')) return 0xff5500;
        if (text.includes('gelo') || text.includes('frost')) return 0x38bdf8;
        if (text.includes('sagrado') || text.includes('luz') || text.includes('deuses') || text.includes('aegis')) return 0xfacc15;
        if (text.includes('sombrio') || text.includes('trevas') || text.includes('arcana') || text.includes('vazio')) return 0xa855f7;
        if (text.includes('venen') || text.includes('toxi')) return 0x4ade80;
        if (text.includes('prata')) return 0xe2e8f0;
        return fallbackHex !== undefined ? fallbackHex : 0x94a3b8;
    }

    function populateWeapon(THREE, weaponGroup, weapon, fallbackKind) {
        const kind = detectWeaponKind(weapon, fallbackKind);
        const rarity = getRarityMeta(weapon?.rarity);
        const elemHex = getElementColor(weapon, rarity.intensity > 0 ? rarity.emissive : 0xb0bec5);
        const bladeGlow = rarity.intensity > 0 ? rarity.emissive : 0x000000;
        const bladeIntensity = rarity.intensity > 0 ? rarity.intensity * 0.85 : 0;

        const woodMat = { color: 0x4e342e, roughness: 0.85 };
        const metalMat = { color: kind === 'katana' ? 0xcbd5e1 : 0x94a3b8, metalness: 0.72, roughness: 0.3, emissive: bladeGlow, emissiveIntensity: bladeIntensity * 0.45 };
        const trimMat = { color: rarity.intensity >= 0.7 ? rarity.color : 0xd4af37, metalness: 0.65, roughness: 0.35, emissive: bladeGlow, emissiveIntensity: bladeIntensity * 0.5 };
        const crystalMat = { color: elemHex, emissive: elemHex, emissiveIntensity: Math.max(0.6, rarity.intensity), metalness: 0.2, roughness: 0.2 };

        if (kind === 'greatsword' || kind === 'sword' || kind === 'katana' || kind === 'dagger') {
            const bladeLen = kind === 'greatsword' ? 1.15 : kind === 'dagger' ? 0.42 : 0.78;
            const bladeW = kind === 'greatsword' ? 0.13 : kind === 'katana' ? 0.055 : kind === 'dagger' ? 0.06 : 0.085;
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.025, 0.028, 0.24, 6], woodMat, [0, 0, 0.08], [Math.PI / 2, 0, 0]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [kind === 'katana' ? 0.12 : 0.26, 0.045, 0.05], trimMat, [0, 0.02, 0.20]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [bladeW, 0.03, bladeLen], metalMat, [0, 0.02, 0.22 + bladeLen / 2]);
            addPart(THREE, weaponGroup, 'ConeGeometry', [bladeW * 0.72, 0.16, 4], metalMat, [0, 0.02, 0.22 + bladeLen + 0.07], [Math.PI / 2, Math.PI / 4, 0]);
            if (rarity.intensity >= 0.45) {
                addPart(THREE, weaponGroup, 'BoxGeometry', [bladeW * 0.35, 0.038, bladeLen * 0.8], crystalMat, [0, 0.02, 0.22 + bladeLen / 2]);
            }
        } else if (kind === 'axe') {
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.03, 0.032, 1.05, 6], woodMat, [0, 0.18, 0.24], [Math.PI * 0.36, 0, 0]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.34, 0.24, 0.06], metalMat, [0, 0.46, 0.56], [Math.PI * 0.36, 0, 0]);
            addPart(THREE, weaponGroup, 'ConeGeometry', [0.15, 0.22, 4], trimMat, [0.16, 0.46, 0.56], [0, 0, -Math.PI / 2]);
            addPart(THREE, weaponGroup, 'ConeGeometry', [0.15, 0.22, 4], trimMat, [-0.16, 0.46, 0.56], [0, 0, Math.PI / 2]);
        } else if (kind === 'hammer') {
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.034, 0.036, 1.0, 6], woodMat, [0, 0.16, 0.24], [Math.PI * 0.36, 0, 0]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.38, 0.22, 0.22], metalMat, [0, 0.46, 0.56], [Math.PI * 0.36, 0, 0]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.41, 0.10, 0.10], crystalMat, [0, 0.46, 0.56], [Math.PI * 0.36, 0, 0]);
        } else if (kind === 'spear') {
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.024, 0.028, 1.45, 6], woodMat, [0, 0.12, 0.38], [Math.PI * 0.44, 0, 0]);
            addPart(THREE, weaponGroup, 'ConeGeometry', [0.08, 0.30, 4], metalMat, [0, 0.25, 1.15], [Math.PI * 0.44, Math.PI / 4, 0]);
        } else if (kind === 'bow') {
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.024, 0.024, 0.48, 6], woodMat, [0, 0.12, 0.16], [0.22, 0, 0]);
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.018, 0.024, 0.45, 6], woodMat, [0, 0.50, 0.06], [-0.45, 0, 0]);
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.018, 0.024, 0.45, 6], woodMat, [0, -0.26, 0.06], [0.75, 0, 0]);
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.005, 0.005, 0.98, 4], { color: 0xe5e7eb, emissive: bladeGlow, emissiveIntensity: 0.3 }, [0, 0.12, -0.05]);
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.01, 0.01, 0.62, 5], trimMat, [0, 0.12, 0.20], [Math.PI / 2, 0, 0]);
        } else if (kind === 'crossbow') {
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.08, 0.08, 0.62], woodMat, [0, 0.02, 0.25]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.56, 0.04, 0.08], metalMat, [0, 0.04, 0.50]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.03, 0.03, 0.42], trimMat, [0, 0.06, 0.32]);
        } else if (kind === 'staff') {
            addPart(THREE, weaponGroup, 'CylinderGeometry', [0.026, 0.032, 1.38, 6], woodMat, [0, 0.24, 0.14], [0.18, 0, 0]);
            addPart(THREE, weaponGroup, 'TorusGeometry', [0.10, 0.02, 6, 12], trimMat, [0, 0.92, 0.26], [0, 0, 0]);
            addPart(THREE, weaponGroup, 'OctahedronGeometry', [0.11, 0], crystalMat, [0, 0.92, 0.26]);
        } else if (kind === 'tome') {
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.30, 0.06, 0.24], { color: 0x3f1d2b, emissive: bladeGlow, emissiveIntensity: 0.35 }, [0, 0.04, 0.16], [0.35, 0, 0]);
            addPart(THREE, weaponGroup, 'BoxGeometry', [0.26, 0.04, 0.20], { color: 0xfef3c7, emissive: elemHex, emissiveIntensity: 0.45 }, [0, 0.07, 0.16], [0.35, 0, 0]);
        } else if (kind === 'orb') {
            addPart(THREE, weaponGroup, 'OctahedronGeometry', [0.15, 1], crystalMat, [0, 0.10, 0.16]);
            addPart(THREE, weaponGroup, 'TorusGeometry', [0.20, 0.015, 6, 14], trimMat, [0, 0.10, 0.16], [0.7, 0.4, 0]);
        }

        if (rarity.hasAura) {
            addPart(THREE, weaponGroup, 'OctahedronGeometry', [0.05, 0], crystalMat, [0, 0.18, 0.42]);
        }
    }

    function populateShield(THREE, shieldGroup, item, fallbackKind) {
        const name = normalizeText(item?.name || '');
        const isShieldItem = item?.isShield || name.includes('escudo') || name.includes('aegis') || fallbackKind;
        if (!item && !fallbackKind) return;
        if (item && !isShieldItem) {
            // Offhand weapon (dagger, orb, tome)
            populateWeapon(THREE, shieldGroup, item, 'dagger');
            return;
        }

        const rarity = getRarityMeta(item?.rarity);
        let baseColor = 0x64748b;
        let trimColor = 0xd4af37;
        let glowColor = rarity.emissive;
        let glowInt = rarity.intensity * 0.5;

        if (name.includes('madeira') || fallbackKind === 'wood') {
            baseColor = 0x6b4423;
            trimColor = 0x475569;
        } else if (name.includes('ferro')) {
            baseColor = 0x475569;
            trimColor = 0x94a3b8;
        } else if (name.includes('runico')) {
            baseColor = 0x312e81;
            trimColor = 0xa855f7;
            glowColor = 0x9333ea;
            glowInt = Math.max(0.6, glowInt);
        } else if (name.includes('aegis') || fallbackKind === 'holy') {
            baseColor = 0xfef3c7;
            trimColor = 0xf59e0b;
            glowColor = 0xfbbf24;
            glowInt = Math.max(0.75, glowInt);
        }

        const bodyMat = { color: baseColor, metalness: 0.55, roughness: 0.4, emissive: glowColor, emissiveIntensity: glowInt * 0.45 };
        const rimMat = { color: trimColor, metalness: 0.75, roughness: 0.3, emissive: glowColor, emissiveIntensity: glowInt };

        addPart(THREE, shieldGroup, 'BoxGeometry', [0.10, 0.54, 0.42], bodyMat, [-0.08, 0.04, 0.04]);
        addPart(THREE, shieldGroup, 'ConeGeometry', [0.22, 0.24, 4], bodyMat, [-0.08, -0.32, 0.04], [Math.PI, Math.PI / 4, 0]);
        addPart(THREE, shieldGroup, 'BoxGeometry', [0.12, 0.14, 0.14], rimMat, [-0.10, 0.06, 0.04]);
        addPart(THREE, shieldGroup, 'BoxGeometry', [0.11, 0.44, 0.06], rimMat, [-0.09, 0.04, 0.04]);
        addPart(THREE, shieldGroup, 'BoxGeometry', [0.11, 0.06, 0.34], rimMat, [-0.09, 0.10, 0.04]);
    }

    function buildHumanoidBase(THREE, rig, palette) {
        const armorColor = palette.armor || 0x4b5563;
        const trimColor = palette.trim || 0xd4af37;
        const clothColor = palette.cloth || 0x262626;
        const skinColor = palette.skin || 0xd6b49c;
        const bootColor = palette.boots || 0x27272a;
        const eyeColor = palette.eyes || 0xfef08a;

        const armorMat = { color: armorColor, metalness: palette.metalness ?? 0.45, roughness: 0.52 };
        const trimMat = { color: trimColor, metalness: 0.65, roughness: 0.35 };
        const clothMat = { color: clothColor, roughness: 0.85, metalness: 0.05 };
        const skinMat = { color: skinColor, roughness: 0.72, metalness: 0.05 };
        const bootMat = { color: bootColor, roughness: 0.75, metalness: 0.2 };
        const eyeMat = { color: eyeColor, emissive: eyeColor, emissiveIntensity: palette.eyeGlow ?? 0.65 };

        // Torso & Belt & Pauldrons
        addPart(THREE, rig.body, 'BoxGeometry', [0.50, 0.58, 0.30], armorMat, [0, 0.02, 0]);
        addPart(THREE, rig.body, 'BoxGeometry', [0.52, 0.10, 0.32], bootMat, [0, -0.22, 0]);
        addPart(THREE, rig.body, 'BoxGeometry', [0.12, 0.10, 0.34], trimMat, [0, -0.22, 0]);

        if (palette.skirt) {
            addPart(THREE, rig.body, 'CylinderGeometry', [0.27, 0.42, 0.66, 7], clothMat, [0, -0.46, 0]);
        }

        // Shoulder Pauldrons
        const pScale = palette.heavyShoulders ? 1.35 : 1.0;
        addPart(THREE, rig.body, 'BoxGeometry', [0.22 * pScale, 0.18 * pScale, 0.30 * pScale], armorMat, [-0.34, 0.26, 0], [0, 0, 0.18]);
        addPart(THREE, rig.body, 'BoxGeometry', [0.22 * pScale, 0.18 * pScale, 0.30 * pScale], armorMat, [0.34, 0.26, 0], [0, 0, -0.18]);

        // Arms
        addPart(THREE, rig.leftArm, 'BoxGeometry', [0.15, 0.44, 0.15], clothMat, [0, -0.18, 0]);
        addPart(THREE, rig.leftArm, 'BoxGeometry', [0.13, 0.14, 0.13], armorMat, [0, -0.36, 0]);
        addPart(THREE, rig.rightArm, 'BoxGeometry', [0.15, 0.44, 0.15], clothMat, [0, -0.18, 0]);
        addPart(THREE, rig.rightArm, 'BoxGeometry', [0.13, 0.14, 0.13], armorMat, [0, -0.36, 0]);

        // Legs
        addPart(THREE, rig.leftLeg, 'BoxGeometry', [0.18, 0.42, 0.18], clothMat, [0, -0.20, 0]);
        addPart(THREE, rig.leftLeg, 'BoxGeometry', [0.19, 0.22, 0.23], bootMat, [0, -0.45, 0.02]);
        addPart(THREE, rig.rightLeg, 'BoxGeometry', [0.18, 0.42, 0.18], clothMat, [0, -0.20, 0]);
        addPart(THREE, rig.rightLeg, 'BoxGeometry', [0.19, 0.22, 0.23], bootMat, [0, -0.45, 0.02]);

        // Head + Glowing Eyes
        addPart(THREE, rig.head, 'BoxGeometry', [0.34, 0.34, 0.34], palette.masked ? { color: 0x18181b, roughness: 0.9 } : skinMat, [0, 0.06, 0]);
        addPart(THREE, rig.head, 'BoxGeometry', [0.06, 0.04, 0.04], eyeMat, [-0.07, 0.08, 0.17]);
        addPart(THREE, rig.head, 'BoxGeometry', [0.06, 0.04, 0.04], eyeMat, [0.07, 0.08, 0.17]);
    }

    function addCape(THREE, rig, color, trimColor, length) {
        const len = length || 0.92;
        addPart(THREE, rig.cape, 'BoxGeometry', [0.46, len, 0.05], { color, roughness: 0.9 }, [0, -len * 0.45, -0.02], [0.12, 0, 0]);
        if (trimColor) {
            addPart(THREE, rig.cape, 'BoxGeometry', [0.48, 0.08, 0.06], { color: trimColor, metalness: 0.5 }, [0, 0.02, -0.02]);
        }
    }

    // ---------------------------------------------------------
    // Hero Models (All 6 classes + Equipment & Rarity)
    // ---------------------------------------------------------
    function createHeroModel(player) {
        const THREE = getTHREE();
        if (!THREE) return null;

        const p = player || {};
        const cls = normalizeText(p.playerClass || 'nenhuma');
        const eq = p.equipment || {};
        const { root, rig } = createRigRoot(THREE);

        let defaultWeapon = 'sword';
        let defaultShield = null;

        if (cls === 'guerreiro') {
            buildHumanoidBase(THREE, rig, {
                armor: 0x3b4252, trim: 0x991b1b, cloth: 0x450a0a, boots: 0x1f2937,
                eyes: 0xff6b35, heavyShoulders: true, masked: true, metalness: 0.75
            });
            // Horned Helm
            addPart(THREE, rig.head, 'BoxGeometry', [0.38, 0.30, 0.38], { color: 0x334155, metalness: 0.8, roughness: 0.3 }, [0, 0.14, 0]);
            addPart(THREE, rig.head, 'ConeGeometry', [0.06, 0.28, 5], { color: 0xe2e8f0, roughness: 0.4 }, [-0.22, 0.30, 0], [0, 0, 0.55]);
            addPart(THREE, rig.head, 'ConeGeometry', [0.06, 0.28, 5], { color: 0xe2e8f0, roughness: 0.4 }, [0.22, 0.30, 0], [0, 0, -0.55]);
            addCape(THREE, rig, 0x8b0000, 0xd4af37, 0.98);
            defaultWeapon = 'greatsword';
        } else if (cls === 'cacador') {
            buildHumanoidBase(THREE, rig, {
                armor: 0x1e4620, trim: 0x854d0e, cloth: 0x142e16, boots: 0x3f2e21,
                eyes: 0xfacc15, masked: true, metalness: 0.15
            });
            // Ranger Hood + Quiver
            addPart(THREE, rig.head, 'ConeGeometry', [0.27, 0.38, 6], { color: 0x14532d, roughness: 0.85 }, [0, 0.22, -0.03], [-0.22, 0, 0]);
            addPart(THREE, rig.cape, 'CylinderGeometry', [0.07, 0.06, 0.52, 6], { color: 0x78350f, roughness: 0.8 }, [0.18, -0.14, -0.06], [0, 0, -0.25]);
            addPart(THREE, rig.cape, 'ConeGeometry', [0.04, 0.10, 4], { color: 0xfef3c7 }, [0.24, 0.14, -0.06], [0, 0, -0.25]);
            addCape(THREE, rig, 0x14532d, 0x78350f, 0.88);
            defaultWeapon = 'bow';
        } else if (cls === 'guardiao') {
            buildHumanoidBase(THREE, rig, {
                armor: 0xcbd5e1, trim: 0xf59e0b, cloth: 0x1e3a8a, boots: 0x475569,
                eyes: 0x38bdf8, heavyShoulders: true, masked: true, metalness: 0.82
            });
            // Plumed Knight Helm
            addPart(THREE, rig.head, 'CylinderGeometry', [0.20, 0.22, 0.36, 6], { color: 0xdbeafe, metalness: 0.85, roughness: 0.25 }, [0, 0.10, 0]);
            addPart(THREE, rig.head, 'BoxGeometry', [0.08, 0.22, 0.38], { color: 0xdc2626, roughness: 0.8 }, [0, 0.32, -0.04]);
            addCape(THREE, rig, 0x1d4ed8, 0xf59e0b, 0.94);
            defaultWeapon = 'hammer';
            defaultShield = 'holy';
        } else if (cls === 'mago') {
            buildHumanoidBase(THREE, rig, {
                armor: 0x312e81, trim: 0xfbbf24, cloth: 0x1e1b4b, boots: 0x1e1b4b,
                eyes: 0x38bdf8, skirt: true, metalness: 0.2
            });
            // Pointed Wizard Hat
            addPart(THREE, rig.head, 'CylinderGeometry', [0.34, 0.36, 0.04, 8], { color: 0x1e1b4b, roughness: 0.8 }, [0, 0.22, 0]);
            addPart(THREE, rig.head, 'ConeGeometry', [0.22, 0.56, 7], { color: 0x312e81, roughness: 0.8 }, [0, 0.48, -0.04], [-0.15, 0, 0]);
            addPart(THREE, rig.head, 'TorusGeometry', [0.21, 0.025, 6, 12], { color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.4 }, [0, 0.25, 0], [Math.PI / 2, 0, 0]);
            // Orbiting Arcane Rune
            const runeOrbit = new THREE.Group();
            runeOrbit.userData = { orbitSpeed: 1.8 };
            setVec3(runeOrbit.position, 0, 1.05, 0);
            addPart(THREE, runeOrbit, 'TorusGeometry', [0.68, 0.018, 6, 16], { color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.85, transparent: true, opacity: 0.8 }, [0, 0, 0], [Math.PI / 2.4, 0.3, 0]);
            addPart(THREE, runeOrbit, 'OctahedronGeometry', [0.08, 0], { color: 0xa855f7, emissive: 0x9333ea, emissiveIntensity: 1.0 }, [0.66, 0, 0]);
            rig.extras.add(runeOrbit);
            defaultWeapon = 'staff';
        } else if (cls === 'clerigo') {
            buildHumanoidBase(THREE, rig, {
                armor: 0xf8fafc, trim: 0xf59e0b, cloth: 0xe2e8f0, boots: 0x92400e,
                eyes: 0xfef08a, skirt: true, metalness: 0.35
            });
            // Cleric Hood/Mitre + Radiant Halo
            addPart(THREE, rig.head, 'ConeGeometry', [0.22, 0.34, 6], { color: 0xfef3c7, emissive: 0xd97706, emissiveIntensity: 0.15 }, [0, 0.34, 0]);
            const halo = addPart(THREE, rig.head, 'TorusGeometry', [0.28, 0.025, 6, 16], { color: 0xfde047, emissive: 0xf59e0b, emissiveIntensity: 1.0 }, [0, 0.44, -0.08], [0.2, 0, 0]);
            if (halo) halo.userData = { pulseSpeed: 2.5 };
            addCape(THREE, rig, 0xfef3c7, 0xd4af37, 0.88);
            defaultWeapon = 'staff';
        } else {
            // Nenhuma (Recruit)
            buildHumanoidBase(THREE, rig, {
                armor: 0x52525b, trim: 0xa1a1aa, cloth: 0x3f3f46, boots: 0x27272a,
                eyes: 0xfde68a, metalness: 0.25
            });
            addCape(THREE, rig, 0x3f3f46, 0x71717a, 0.78);
            defaultWeapon = 'sword';
            // Brass Lantern on off-hand
            addPart(THREE, rig.shield, 'CylinderGeometry', [0.08, 0.06, 0.18, 6], { color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.0 }, [-0.04, -0.05, 0.08]);
            addPart(THREE, rig.shield, 'BoxGeometry', [0.12, 0.04, 0.12], { color: 0x78350f, metalness: 0.6 }, [-0.04, 0.06, 0.08]);
        }

        // Apply Equipped Main Weapon & Rarity Glow
        populateWeapon(THREE, rig.weapon, eq.weaponMain, defaultWeapon);

        // Apply Equipped Offhand / Shield
        if (eq.weaponOff) {
            populateShield(THREE, rig.shield, eq.weaponOff, null);
        } else if (defaultShield) {
            populateShield(THREE, rig.shield, null, defaultShield);
        }

        // Highest Rarity Aura Ring beneath hero
        const gearList = Object.values(eq).filter(Boolean);
        let topRarity = null;
        const order = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'];
        gearList.forEach(item => {
            const idx = order.indexOf(normalizeText(item.rarity));
            if (idx > order.indexOf(topRarity || 'comum')) topRarity = normalizeText(item.rarity);
        });
        if (topRarity && getRarityMeta(topRarity).hasAura) {
            const rm = getRarityMeta(topRarity);
            const ring = addPart(THREE, rig.aura, 'RingGeometry', [0.46, 0.56, 18], {
                color: rm.color, emissive: rm.emissive, emissiveIntensity: rm.intensity,
                transparent: true, opacity: 0.7, side: THREE.DoubleSide
            }, [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
            if (ring) ring.userData = { spinSpeed: 1.2 };
        }

        root.userData.entityType = 'hero';
        root.userData.playerClass = p.playerClass || 'Nenhuma';
        saveRestPose(rig);
        return root;
    }

    // ---------------------------------------------------------
    // NPC Models (All 12 distinct roles + legacy world.json aliases)
    // ---------------------------------------------------------
    function resolveNpcRole(npcRoleOrId) {
        const raw = typeof npcRoleOrId === 'string'
            ? npcRoleOrId
            : (npcRoleOrId?.role || npcRoleOrId?.id || npcRoleOrId?.name || 'guia');
        const n = normalizeText(raw).replace(/^npc_/, '');
        if (n.includes('ferreiro') || n.includes('smith')) return 'ferreiro';
        if (n.includes('forjador')) return 'forjador';
        if (n.includes('mercador')) return 'mercadora';
        if (n.includes('comandante')) return 'comandante';
        if (n.includes('eremita')) return 'eremita';
        if (n.includes('arquivista')) return 'arquivista';
        if (n.includes('oraculo')) return 'oraculo';
        if (n.includes('pescador') || n.includes('velho')) return 'pescador';
        if (n.includes('soldado')) return 'soldado';
        if (n.includes('feiticeira')) return 'feiticeira';
        if (n.includes('monge')) return 'monge';
        return 'guia';
    }

    function createNPCModel(npcRoleOrId) {
        const THREE = getTHREE();
        if (!THREE) return null;

        const role = resolveNpcRole(npcRoleOrId);
        const { root, rig } = createRigRoot(THREE);

        const configs = {
            guia:       { armor: 0x1e4620, trim: 0xd4af37, cloth: 0x3b2f2f, eyes: 0xfde047 },
            ferreiro:   { armor: 0x451a03, trim: 0xf97316, cloth: 0x292524, eyes: 0xfdba74, heavyShoulders: true },
            mercadora:  { armor: 0x7f1d1d, trim: 0xfbbf24, cloth: 0x4c1d95, eyes: 0xfef08a, skirt: true },
            comandante: { armor: 0x991b1b, trim: 0xfbbf24, cloth: 0x1e293b, eyes: 0xfacc15, heavyShoulders: true },
            eremita:    { armor: 0x4d3b2b, trim: 0x4ade80, cloth: 0x362a1e, eyes: 0x86efac, skirt: true },
            arquivista: { armor: 0x1e3a5f, trim: 0xfacc15, cloth: 0x0f172a, eyes: 0x93c5fd, skirt: true },
            forjador:   { armor: 0x1f2937, trim: 0xf97316, cloth: 0x450a0a, eyes: 0xff5500, heavyShoulders: true },
            oraculo:    { armor: 0xede9fe, trim: 0xc084fc, cloth: 0x4c1d95, eyes: 0xe879f9, skirt: true },
            pescador:   { armor: 0x334155, trim: 0x94a3b8, cloth: 0x1e293b, eyes: 0xfef3c7 },
            soldado:    { armor: 0x475569, trim: 0x94a3b8, cloth: 0x7f1d1d, eyes: 0xfca5a5 },
            feiticeira: { armor: 0x4a044e, trim: 0xe879f9, cloth: 0x1e0626, eyes: 0xf43f5e, skirt: true },
            monge:      { armor: 0xc2410c, trim: 0xfbbf24, cloth: 0x7c2d12, eyes: 0xfef08a }
        };

        buildHumanoidBase(THREE, rig, configs[role] || configs.guia);

        switch (role) {
            case 'guia':
                addPart(THREE, rig.head, 'ConeGeometry', [0.25, 0.34, 6], { color: 0x14532d }, [0, 0.24, -0.02]);
                addCape(THREE, rig, 0x166534, 0xd4af37, 0.85);
                // Lantern + Walking Stick
                addPart(THREE, rig.weapon, 'CylinderGeometry', [0.025, 0.025, 1.35, 6], { color: 0x5c4033 }, [0, 0.22, 0.14]);
                addPart(THREE, rig.shield, 'CylinderGeometry', [0.08, 0.06, 0.18, 6], { color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 1.0 }, [-0.04, -0.04, 0.10]);
                break;

            case 'ferreiro':
                // Leather Apron + Beard + Forge Hammer
                addPart(THREE, rig.body, 'BoxGeometry', [0.46, 0.64, 0.06], { color: 0x78350f, roughness: 0.9 }, [0, -0.12, 0.16]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.26, 0.18, 0.12], { color: 0x292524 }, [0, -0.08, 0.15]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.36, 0.10, 0.36], { color: 0x7f1d1d }, [0, 0.22, 0]);
                populateWeapon(THREE, rig.weapon, { name: 'Martelo', rarity: 'incomum' }, 'hammer');
                break;

            case 'mercadora':
                // Plumed Merchant Hat + Coin Satchel
                addPart(THREE, rig.head, 'CylinderGeometry', [0.32, 0.34, 0.05, 8], { color: 0x7f1d1d }, [0, 0.24, 0]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.18, 0.26, 6], { color: 0x991b1b }, [0, 0.34, 0]);
                addPart(THREE, rig.shield, 'SphereGeometry', [0.16, 6, 6], { color: 0xd97706, emissive: 0xb45309, emissiveIntensity: 0.3 }, [-0.04, -0.04, 0.08]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.34, 0.38, 0.22], { color: 0x78350f }, [0, 0.05, -0.22]);
                break;

            case 'comandante':
                // Plumed Helm + Tall Watchers Banner Spear
                addPart(THREE, rig.head, 'BoxGeometry', [0.36, 0.24, 0.36], { color: 0x475569, metalness: 0.8 }, [0, 0.14, 0]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.08, 0.24, 0.38], { color: 0xdc2626 }, [0, 0.32, -0.03]);
                addCape(THREE, rig, 0x7f1d1d, 0xfbbf24, 0.98);
                addPart(THREE, rig.weapon, 'CylinderGeometry', [0.025, 0.025, 1.65, 6], { color: 0xd4af37, metalness: 0.7 }, [0, 0.35, 0.15]);
                addPart(THREE, rig.weapon, 'BoxGeometry', [0.04, 0.48, 0.32], { color: 0x991b1b, emissive: 0x7f1d1d, emissiveIntensity: 0.3 }, [0, 0.85, 0.30]);
                break;

            case 'eremita':
                // Long white beard + gnarled root staff
                addPart(THREE, rig.head, 'ConeGeometry', [0.15, 0.34, 5], { color: 0xe5e7eb }, [0, -0.14, 0.16], [Math.PI, 0, 0]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.24, 0.30, 6], { color: 0x57534e }, [0, 0.24, -0.02]);
                populateWeapon(THREE, rig.weapon, { name: 'Cajado', rarity: 'incomum', element: 'veneno' }, 'staff');
                break;

            case 'arquivista':
                // Scholar Cap + Golden Tome
                addPart(THREE, rig.head, 'CylinderGeometry', [0.22, 0.20, 0.16, 6], { color: 0x1e3a5f }, [0, 0.26, 0]);
                populateWeapon(THREE, rig.weapon, { name: 'Tomo Sagrado', rarity: 'raro' }, 'tome');
                addPart(THREE, rig.shield, 'CylinderGeometry', [0.05, 0.05, 0.36, 6], { color: 0xfef3c7 }, [-0.04, 0.02, 0.10], [0, 0, 0.3]);
                break;

            case 'forjador':
                // Ember-cracked Runic Armor + Rune Hammer + Glowing Shard
                addPart(THREE, rig.head, 'BoxGeometry', [0.38, 0.32, 0.38], { color: 0x111827, metalness: 0.8 }, [0, 0.12, 0]);
                addPart(THREE, rig.body, 'OctahedronGeometry', [0.12, 0], { color: 0xff5500, emissive: 0xff4500, emissiveIntensity: 1.0 }, [0, 0.05, 0.16]);
                populateWeapon(THREE, rig.weapon, { name: 'Martelo Runico', rarity: 'epico', element: 'fogo' }, 'hammer');
                break;

            case 'oraculo':
                // Blindfold + Crescent Crown + Floating Prophetic Orb
                addPart(THREE, rig.head, 'BoxGeometry', [0.36, 0.10, 0.36], { color: 0xede9fe }, [0, 0.08, 0]);
                addPart(THREE, rig.head, 'TorusGeometry', [0.22, 0.025, 6, 12], { color: 0xc084fc, emissive: 0xa855f7, emissiveIntensity: 0.8 }, [0, 0.34, 0], [0, 0, 0]);
                populateWeapon(THREE, rig.weapon, { name: 'Orbe Mágico', rarity: 'epico', element: 'trevas' }, 'orb');
                break;

            case 'pescador':
                // Straw Hat + Fishing Rod
                addPart(THREE, rig.head, 'CylinderGeometry', [0.34, 0.38, 0.04, 8], { color: 0xd97706 }, [0, 0.22, 0]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.20, 0.22, 7], { color: 0xb45309 }, [0, 0.32, 0]);
                addPart(THREE, rig.weapon, 'CylinderGeometry', [0.015, 0.025, 1.55, 6], { color: 0x78350f }, [0, 0.35, 0.28], [0.45, 0, 0]);
                addPart(THREE, rig.shield, 'CylinderGeometry', [0.10, 0.08, 0.22, 6], { color: 0x92400e }, [-0.04, -0.05, 0.05]);
                break;

            case 'soldado':
                // Half-helm + Bandage + Spear + Buckler
                addPart(THREE, rig.head, 'CylinderGeometry', [0.20, 0.21, 0.20, 6], { color: 0x64748b, metalness: 0.7 }, [0, 0.18, 0]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.52, 0.12, 0.32], { color: 0xfef2f2 }, [0, 0.10, 0.01], [0, 0, 0.22]);
                populateWeapon(THREE, rig.weapon, { name: 'Lança', rarity: 'comum' }, 'spear');
                populateShield(THREE, rig.shield, { name: 'Escudo de Ferro' }, 'wood');
                break;

            case 'feiticeira':
                // Horned Crescent Crown + Void Orb + Wand
                addPart(THREE, rig.head, 'ConeGeometry', [0.05, 0.28, 5], { color: 0x581c87 }, [-0.14, 0.34, 0], [0, 0, 0.35]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.05, 0.28, 5], { color: 0x581c87 }, [0.14, 0.34, 0], [0, 0, -0.35]);
                addCape(THREE, rig, 0x581c87, 0xe879f9, 0.96);
                populateWeapon(THREE, rig.weapon, { name: 'Cajado de Fogo', rarity: 'epico' }, 'staff');
                populateShield(THREE, rig.shield, { name: 'Orbe Mágico', rarity: 'epico', element: 'trevas' }, null);
                break;

            case 'monge':
                // Prayer Beads + Quarterstaff + Chi Aura
                addPart(THREE, rig.body, 'TorusGeometry', [0.22, 0.04, 6, 12], { color: 0x78350f }, [0, 0.28, 0.04], [Math.PI / 2.2, 0, 0]);
                addPart(THREE, rig.weapon, 'CylinderGeometry', [0.025, 0.025, 1.50, 6], { color: 0x78350f }, [0, 0.25, 0.14], [0.2, 0, 0]);
                const chi = addPart(THREE, rig.aura, 'RingGeometry', [0.40, 0.48, 16], { color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.7, transparent: true, opacity: 0.55, side: THREE.DoubleSide }, [0, 0.01, 0], [-Math.PI / 2, 0, 0]);
                if (chi) chi.userData = { spinSpeed: 1.0 };
                break;
        }

        root.userData.entityType = 'npc';
        root.userData.npcRole = role;
        saveRestPose(rig);
        return root;
    }

    // ---------------------------------------------------------
    // Monster & Boss Models (All 11 monsters + 3 bosses + Phase 2)
    // ---------------------------------------------------------
    function resolveMonsterKey(monster) {
        const m = monster || {};
        const rawId = normalizeText(m.baseMobId || m.id || '');
        if (/^(mob\d+|boss\d+)$/.test(rawId)) return rawId;

        const name = normalizeText((m.name || '') + ' ' + (m.type || ''));
        if (name.includes('rei vampiro') || (m.isBoss && name.includes('vampiro'))) return 'boss1';
        if (name.includes('dragao')) return 'boss2';
        if (name.includes('lorde supremo') || name.includes('caos') || name.includes('vazio')) return 'boss3';
        if (name.includes('goblin') || name.includes('golgorg')) return 'mob1';
        if (name.includes('esqueleto')) return 'mob2';
        if (name.includes('zumbi')) return 'mob3';
        if (name.includes('aranha')) return 'mob4';
        if (name.includes('lobisomem') || name.includes('lobo') || name.includes('fera')) return 'mob5';
        if (name.includes('vampiro')) return 'mob6';
        if (name.includes('minotauro') || name.includes('troglodita') || name.includes('orc')) return 'mob7';
        if (name.includes('banshee') || name.includes('aparicao') || name.includes('fantasma')) return 'mob8';
        if (name.includes('cerbero') || name.includes('horror')) return 'mob9';
        if (name.includes('hidra')) return 'mob10';
        if (name.includes('demonio') || name.includes('espectro')) return 'mob11';
        return 'mob1';
    }

    function applyPhase2Ascension(THREE, root, rig) {
        if (typeof root.traverse === 'function') {
            root.traverse(obj => {
                if (obj && obj.material && obj.material.emissive && typeof obj.material.emissive.setHex === 'function') {
                    obj.material = obj.material.clone ? obj.material.clone() : obj.material;
                    obj.material.emissive.setHex(0xdc2626);
                    obj.material.emissiveIntensity = Math.max(0.55, (obj.material.emissiveIntensity || 0) + 0.45);
                }
            });
        }
        const flameRing = addPart(THREE, rig.aura, 'TorusGeometry', [0.82, 0.045, 6, 20], {
            color: 0xff4500, emissive: 0xff2200, emissiveIntensity: 1.4, transparent: true, opacity: 0.85
        }, [0, 0.08, 0], [Math.PI / 2, 0, 0]);
        if (flameRing) flameRing.userData = { spinSpeed: 3.2 };

        const voidRing = addPart(THREE, rig.extras, 'TorusGeometry', [0.75, 0.03, 6, 18], {
            color: 0xd946ef, emissive: 0xa855f7, emissiveIntensity: 1.3
        }, [0, 1.35, 0], [0.6, 0.4, 0]);
        if (voidRing) voidRing.userData = { orbitSpeed: 2.8 };
    }

    function createMonsterModel(monster) {
        const THREE = getTHREE();
        if (!THREE) return null;

        const m = monster || {};
        const key = resolveMonsterKey(m);
        const { root, rig } = createRigRoot(THREE);

        switch (key) {
            case 'mob1': { // Goblin
                buildHumanoidBase(THREE, rig, {
                    armor: 0x4d7c0f, trim: 0x78350f, cloth: 0x3f2e21, skin: 0x65a30d,
                    boots: 0x3f2e21, eyes: 0xfacc15, metalness: 0.1
                });
                addPart(THREE, rig.head, 'ConeGeometry', [0.06, 0.24, 4], { color: 0x65a30d }, [-0.24, 0.10, 0], [0, 0, 1.25]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.06, 0.24, 4], { color: 0x65a30d }, [0.24, 0.10, 0], [0, 0, -1.25]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.05, 0.12, 4], { color: 0x4d7c0f }, [0, 0.04, 0.20], [Math.PI / 2, 0, 0]);
                populateWeapon(THREE, rig.weapon, { name: 'Adaga Curta' }, 'dagger');
                setVec3(root.scale, 0.78, 0.76, 0.78);
                break;
            }
            case 'mob2': { // Esqueleto
                const boneMat = { color: 0xe5e5e5, roughness: 0.65 };
                addPart(THREE, rig.body, 'BoxGeometry', [0.36, 0.48, 0.20], boneMat, [0, 0.02, 0]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.40, 0.06, 0.24], { color: 0x262626 }, [0, 0.08, 0.01]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.40, 0.06, 0.24], { color: 0x262626 }, [0, -0.06, 0.01]);
                addPart(THREE, rig.leftArm, 'CylinderGeometry', [0.045, 0.04, 0.44, 5], boneMat, [0, -0.20, 0]);
                addPart(THREE, rig.rightArm, 'CylinderGeometry', [0.045, 0.04, 0.44, 5], boneMat, [0, -0.20, 0]);
                addPart(THREE, rig.leftLeg, 'CylinderGeometry', [0.05, 0.045, 0.56, 5], boneMat, [0, -0.28, 0]);
                addPart(THREE, rig.rightLeg, 'CylinderGeometry', [0.05, 0.045, 0.56, 5], boneMat, [0, -0.28, 0]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.30, 0.32, 0.30], boneMat, [0, 0.06, 0]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.07, 0.06, 0.05], { color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.0 }, [-0.07, 0.08, 0.14]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.07, 0.06, 0.05], { color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 1.0 }, [0.07, 0.08, 0.14]);
                populateWeapon(THREE, rig.weapon, { name: 'Espada Longa' }, 'sword');
                populateShield(THREE, rig.shield, { name: 'Escudo de Madeira' }, 'wood');
                break;
            }
            case 'mob3': { // Zumbi
                buildHumanoidBase(THREE, rig, {
                    armor: 0x4a5d4e, trim: 0x3f3f46, cloth: 0x27272a, skin: 0x6b7c59,
                    boots: 0x1f2937, eyes: 0x4ade80, eyeGlow: 0.9, metalness: 0.05
                });
                setVec3(rig.leftArm.rotation, -1.15, 0, 0.1);
                setVec3(rig.rightArm.rotation, -1.05, 0, -0.1);
                setVec3(rig.head.rotation, 0.15, 0, 0.18);
                setVec3(rig.body.rotation, 0.18, 0, 0);
                break;
            }
            case 'mob4': { // 8-legged Aranha Gigante
                const chitinMat = { color: 0x1e1b2e, roughness: 0.35, metalness: 0.4 };
                const venomMat = { color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 0.75 };
                setVec3(rig.body.position, 0, 0.56, 0);
                // Thorax & Abdomen
                addPart(THREE, rig.body, 'SphereGeometry', [0.34, 8, 6], chitinMat, [0, 0, 0.15], null, [1.0, 0.75, 1.1]);
                addPart(THREE, rig.body, 'SphereGeometry', [0.52, 8, 6], chitinMat, [0, 0.12, -0.52], null, [1.0, 0.85, 1.2]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.22, 0.08, 0.28], venomMat, [0, 0.52, -0.52]);
                // Eyes & Fangs
                setVec3(rig.head.position, 0, 0.04, 0.45);
                [-0.12, -0.04, 0.04, 0.12].forEach((ex, idx) => {
                    addPart(THREE, rig.head, 'SphereGeometry', [idx === 1 || idx === 2 ? 0.05 : 0.035, 5, 5], venomMat, [ex, 0.06, 0.08]);
                });
                addPart(THREE, rig.head, 'ConeGeometry', [0.045, 0.18, 4], { color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.5 }, [-0.10, -0.10, 0.10], [Math.PI, 0, 0.2]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.045, 0.18, 4], { color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.5 }, [0.10, -0.10, 0.10], [Math.PI, 0, -0.2]);

                // 8 Articulated Spider Legs
                const spiderLegs = [];
                for (let side of [-1, 1]) {
                    for (let i = 0; i < 4; i++) {
                        const legPivot = new THREE.Group();
                        const zOff = 0.25 - i * 0.22;
                        setVec3(legPivot.position, side * 0.28, 0.52, zOff);
                        const yaw = (1.5 - i) * 0.34 * side;
                        setVec3(legPivot.rotation, 0, yaw, 0);
                        addPart(THREE, legPivot, 'CylinderGeometry', [0.04, 0.03, 0.48, 5], chitinMat, [side * 0.22, 0.16, 0], [0, 0, side * -0.95]);
                        addPart(THREE, legPivot, 'CylinderGeometry', [0.03, 0.015, 0.62, 5], chitinMat, [side * 0.54, -0.18, 0], [0, 0, side * 0.35]);
                        rig.extras.add(legPivot);
                        spiderLegs.push({ pivot: legPivot, side, idx: i, baseYaw: yaw });
                    }
                }
                rig.extras.userData.spiderLegs = spiderLegs;
                break;
            }
            case 'mob5': { // Lobisomem
                buildHumanoidBase(THREE, rig, {
                    armor: 0x3f2e21, trim: 0x57534e, cloth: 0x292524, skin: 0x4b443e,
                    boots: 0x292524, eyes: 0xf59e0b, eyeGlow: 0.9, heavyShoulders: true
                });
                addPart(THREE, rig.head, 'BoxGeometry', [0.22, 0.18, 0.28], { color: 0x4b443e }, [0, -0.02, 0.24]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.07, 0.22, 4], { color: 0x3f3732 }, [-0.14, 0.28, -0.02], [0, 0, 0.2]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.07, 0.22, 4], { color: 0x3f3732 }, [0.14, 0.28, -0.02], [0, 0, -0.2]);
                addPart(THREE, rig.body, 'ConeGeometry', [0.08, 0.52, 5], { color: 0x3f3732 }, [0, -0.20, -0.28], [-1.1, 0, 0]);
                // Claws
                addPart(THREE, rig.leftArm, 'ConeGeometry', [0.03, 0.18, 4], { color: 0xe5e7eb }, [0, -0.46, 0.05], [Math.PI, 0, 0]);
                addPart(THREE, rig.rightArm, 'ConeGeometry', [0.03, 0.18, 4], { color: 0xe5e7eb }, [0, -0.46, 0.05], [Math.PI, 0, 0]);
                setVec3(root.scale, 1.12, 1.12, 1.12);
                break;
            }
            case 'mob6': { // Vampiro
                buildHumanoidBase(THREE, rig, {
                    armor: 0x18181b, trim: 0x991b1b, cloth: 0x450a0a, skin: 0xd1d5db,
                    boots: 0x09090b, eyes: 0xef4444, eyeGlow: 1.0
                });
                addPart(THREE, rig.head, 'BoxGeometry', [0.36, 0.12, 0.36], { color: 0x09090b }, [0, 0.24, -0.02]);
                // High Gothic Collar + Cape
                addPart(THREE, rig.cape, 'BoxGeometry', [0.54, 0.30, 0.08], { color: 0x7f1d1d }, [0, 0.14, -0.04], [-0.25, 0, 0]);
                addCape(THREE, rig, 0x18181b, 0x991b1b, 0.96);
                populateWeapon(THREE, rig.weapon, { name: 'Espada Longa', rarity: 'raro', element: 'trevas' }, 'sword');
                break;
            }
            case 'mob7': { // Minotauro (Horns + Battleaxe)
                buildHumanoidBase(THREE, rig, {
                    armor: 0x5c3a21, trim: 0xd4af37, cloth: 0x451a03, skin: 0x6b4423,
                    boots: 0x292524, eyes: 0xff4500, eyeGlow: 0.95, heavyShoulders: true
                });
                addPart(THREE, rig.head, 'BoxGeometry', [0.36, 0.26, 0.38], { color: 0x5c3a21 }, [0, 0.02, 0.12]);
                addPart(THREE, rig.head, 'TorusGeometry', [0.05, 0.015, 5, 10], { color: 0xfbbf24, metalness: 0.8 }, [0, -0.08, 0.33]);
                // Huge Curved Bull Horns
                addPart(THREE, rig.head, 'ConeGeometry', [0.09, 0.44, 6], { color: 0xfef3c7 }, [-0.28, 0.24, 0.05], [0.25, 0, 0.85]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.09, 0.44, 6], { color: 0xfef3c7 }, [0.28, 0.24, 0.05], [0.25, 0, -0.85]);
                populateWeapon(THREE, rig.weapon, { name: 'Machado de Batalha', rarity: 'incomum' }, 'axe');
                setVec3(root.scale, 1.35, 1.35, 1.35);
                break;
            }
            case 'mob8': { // Floating Translucent Banshee
                const ghostMat = { color: 0x67e8f9, emissive: 0x06b6d4, emissiveIntensity: 0.65, transparent: true, opacity: 0.65 };
                const shroudMat = { color: 0xa5f3fc, emissive: 0x0891b2, emissiveIntensity: 0.45, transparent: true, opacity: 0.48 };
                setVec3(rig.body.position, 0, 1.15, 0);
                rig.body.userData.hoverAmp = 0.18;
                addPart(THREE, rig.body, 'ConeGeometry', [0.34, 0.95, 7], shroudMat, [0, -0.25, 0]);
                addPart(THREE, rig.head, 'SphereGeometry', [0.20, 7, 7], ghostMat, [0, 0.08, 0]);
                addPart(THREE, rig.head, 'SphereGeometry', [0.04, 5, 5], { color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 1.5 }, [-0.07, 0.10, 0.16]);
                addPart(THREE, rig.head, 'SphereGeometry', [0.04, 5, 5], { color: 0xffffff, emissive: 0xe0f2fe, emissiveIntensity: 1.5 }, [0.07, 0.10, 0.16]);
                addPart(THREE, rig.cape, 'ConeGeometry', [0.26, 0.85, 6], shroudMat, [0, -0.35, -0.06], [0.28, 0, 0]);
                addPart(THREE, rig.leftArm, 'BoxGeometry', [0.10, 0.48, 0.10], ghostMat, [0, -0.18, 0.10], [-0.8, 0, 0]);
                addPart(THREE, rig.rightArm, 'BoxGeometry', [0.10, 0.48, 0.10], ghostMat, [0, -0.18, 0.10], [-0.8, 0, 0]);
                const mist = addPart(THREE, rig.aura, 'RingGeometry', [0.35, 0.55, 16], { color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, side: THREE.DoubleSide }, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
                if (mist) mist.userData = { spinSpeed: 1.5 };
                break;
            }
            case 'mob9': { // 3-headed Cérbero
                const houndMat = { color: 0x291717, roughness: 0.65 };
                const emberMat = { color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.1 };
                setVec3(rig.body.position, 0, 0.68, 0);
                addPart(THREE, rig.body, 'BoxGeometry', [0.62, 0.46, 0.96], houndMat, [0, 0, -0.10]);
                addPart(THREE, rig.body, 'ConeGeometry', [0.10, 0.48, 5], emberMat, [0, 0.18, -0.68], [-1.0, 0, 0]);
                // 4 Beast Legs
                addPart(THREE, rig.leftLeg, 'BoxGeometry', [0.18, 0.54, 0.18], houndMat, [-0.14, -0.28, 0.25]);
                addPart(THREE, rig.rightLeg, 'BoxGeometry', [0.18, 0.54, 0.18], houndMat, [0.14, -0.28, 0.25]);
                addPart(THREE, rig.leftArm, 'BoxGeometry', [0.16, 0.50, 0.16], houndMat, [0.05, -0.52, -0.35]);
                addPart(THREE, rig.rightArm, 'BoxGeometry', [0.16, 0.50, 0.16], houndMat, [-0.05, -0.52, -0.35]);
                // 3 Distinct Wolf Heads!
                setVec3(rig.head.position, 0, 0.24, 0.46);
                [-0.28, 0, 0.28].forEach((hx, idx) => {
                    const yOff = idx === 1 ? 0.10 : 0.0;
                    const yaw = idx === 0 ? 0.22 : idx === 2 ? -0.22 : 0;
                    addPart(THREE, rig.head, 'BoxGeometry', [0.24, 0.22, 0.30], houndMat, [hx, yOff, 0.08], [0, yaw, 0]);
                    addPart(THREE, rig.head, 'BoxGeometry', [0.16, 0.12, 0.20], houndMat, [hx, yOff - 0.04, 0.28], [0, yaw, 0]);
                    addPart(THREE, rig.head, 'ConeGeometry', [0.05, 0.16, 4], houndMat, [hx - 0.07, yOff + 0.18, 0.02]);
                    addPart(THREE, rig.head, 'ConeGeometry', [0.05, 0.16, 4], houndMat, [hx + 0.07, yOff + 0.18, 0.02]);
                    addPart(THREE, rig.head, 'BoxGeometry', [0.05, 0.04, 0.04], emberMat, [hx - 0.06, yOff + 0.05, 0.23]);
                    addPart(THREE, rig.head, 'BoxGeometry', [0.05, 0.04, 0.04], emberMat, [hx + 0.06, yOff + 0.05, 0.23]);
                });
                setVec3(root.scale, 1.22, 1.22, 1.22);
                break;
            }
            case 'mob10': { // Multi-headed Hidra
                const scaleMat = { color: 0x0f5132, roughness: 0.45, metalness: 0.25 };
                const bellyMat = { color: 0x198754, roughness: 0.55 };
                const hydraEyeMat = { color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 1.0 };
                setVec3(rig.body.position, 0, 0.72, 0);
                addPart(THREE, rig.body, 'CylinderGeometry', [0.42, 0.58, 0.85, 7], scaleMat, [0, -0.05, -0.10]);
                addPart(THREE, rig.body, 'ConeGeometry', [0.24, 0.90, 6], bellyMat, [0, -0.25, -0.70], [-1.15, 0, 0]);
                // 3-5 Multi-headed Serpentine Necks
                const hydraNecks = [];
                const headOffsets = [
                    { x: -0.45, y: 0.55, z: 0.25, rz: 0.35, h: 0.75 },
                    { x: -0.16, y: 0.72, z: 0.32, rz: 0.12, h: 0.95 },
                    { x: 0.16,  y: 0.72, z: 0.32, rz: -0.12, h: 0.95 },
                    { x: 0.45,  y: 0.55, z: 0.25, rz: -0.35, h: 0.75 }
                ];
                setVec3(rig.head.position, 0, 0.30, 0.15);
                headOffsets.forEach((ho, idx) => {
                    const neckGroup = new THREE.Group();
                    setVec3(neckGroup.position, ho.x * 0.45, 0.15, 0.15);
                    setVec3(neckGroup.rotation, 0.25, 0, ho.rz);
                    addPart(THREE, neckGroup, 'CylinderGeometry', [0.10, 0.15, ho.h, 6], scaleMat, [0, ho.h * 0.45, 0]);
                    addPart(THREE, neckGroup, 'BoxGeometry', [0.22, 0.18, 0.32], scaleMat, [0, ho.h * 0.92, 0.10]);
                    addPart(THREE, neckGroup, 'ConeGeometry', [0.06, 0.18, 4], bellyMat, [0, ho.h * 1.05, -0.02], [-0.4, 0, 0]);
                    addPart(THREE, neckGroup, 'BoxGeometry', [0.05, 0.04, 0.04], hydraEyeMat, [-0.07, ho.h * 0.95, 0.24]);
                    addPart(THREE, neckGroup, 'BoxGeometry', [0.05, 0.04, 0.04], hydraEyeMat, [0.07, ho.h * 0.95, 0.24]);
                    rig.head.add(neckGroup);
                    hydraNecks.push({ group: neckGroup, phase: idx * 1.3, baseRotZ: ho.rz });
                });
                rig.head.userData.hydraNecks = hydraNecks;
                setVec3(root.scale, 1.30, 1.30, 1.30);
                break;
            }
            case 'mob11': { // Horned Winged Demônio
                buildHumanoidBase(THREE, rig, {
                    armor: 0x7f1d1d, trim: 0x18181b, cloth: 0x450a0a, skin: 0x991b1b,
                    boots: 0x18181b, eyes: 0xfacc15, eyeGlow: 1.1, heavyShoulders: true
                });
                addPart(THREE, rig.body, 'OctahedronGeometry', [0.14, 0], { color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 1.1 }, [0, 0.05, 0.14]);
                // Curved Demon Horns
                addPart(THREE, rig.head, 'ConeGeometry', [0.07, 0.38, 5], { color: 0x18181b }, [-0.18, 0.30, 0], [-0.2, 0, 0.45]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.07, 0.38, 5], { color: 0x18181b }, [0.18, 0.30, 0], [-0.2, 0, -0.45]);
                // Bat Wings
                addPart(THREE, rig.wings, 'BoxGeometry', [0.75, 0.56, 0.04], { color: 0x450a0a, emissive: 0x7f1d1d, emissiveIntensity: 0.25 }, [-0.48, 0.14, -0.05], [0, 0.35, 0.22]);
                addPart(THREE, rig.wings, 'BoxGeometry', [0.75, 0.56, 0.04], { color: 0x450a0a, emissive: 0x7f1d1d, emissiveIntensity: 0.25 }, [0.48, 0.14, -0.05], [0, -0.35, -0.22]);
                populateWeapon(THREE, rig.weapon, { name: 'Espada Flamejante', rarity: 'epico', element: 'fogo' }, 'greatsword');
                setVec3(root.scale, 1.32, 1.32, 1.32);
                break;
            }
            case 'boss1': { // Rei Vampiro (Crowned + Blood Aura)
                buildHumanoidBase(THREE, rig, {
                    armor: 0x1e1b24, trim: 0xfbbf24, cloth: 0x7f1d1d, skin: 0xd1d5db,
                    boots: 0x09090b, eyes: 0xef4444, eyeGlow: 1.3, heavyShoulders: true
                });
                // Spiked Royal Gold & Ruby Crown
                addPart(THREE, rig.head, 'CylinderGeometry', [0.20, 0.18, 0.14, 6], { color: 0xf59e0b, metalness: 0.85 }, [0, 0.26, 0]);
                for (let a = 0; a < 5; a++) {
                    const ang = (a / 5) * Math.PI * 2;
                    addPart(THREE, rig.head, 'ConeGeometry', [0.04, 0.15, 4], { color: 0xfbbf24, emissive: 0xdc2626, emissiveIntensity: 0.4 }, [Math.cos(ang) * 0.16, 0.36, Math.sin(ang) * 0.16]);
                }
                addCape(THREE, rig, 0x7f1d1d, 0xfbbf24, 1.10);
                populateWeapon(THREE, rig.weapon, { name: 'Lâmina Carmesim', rarity: 'mitico', element: 'trevas' }, 'greatsword');
                // Blood Aura Ring & Orbiting Blood Orbs
                const bloodRing = addPart(THREE, rig.aura, 'RingGeometry', [0.65, 0.80, 20], { color: 0xdc2626, emissive: 0x991b1b, emissiveIntensity: 1.1, transparent: true, opacity: 0.78, side: THREE.DoubleSide }, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
                if (bloodRing) bloodRing.userData = { spinSpeed: 1.8 };
                const orbOrbit = new THREE.Group();
                orbOrbit.userData = { orbitSpeed: 2.2 };
                setVec3(orbOrbit.position, 0, 1.2, 0);
                for (let i = 0; i < 3; i++) {
                    const a = (i / 3) * Math.PI * 2;
                    addPart(THREE, orbOrbit, 'SphereGeometry', [0.08, 6, 6], { color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.2 }, [Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85]);
                }
                rig.extras.add(orbOrbit);
                setVec3(root.scale, 1.48, 1.48, 1.48);
                break;
            }
            case 'boss2': { // Dragão Negro (Flapping Wings & Glowing Eyes)
                const scaleMat = { color: 0x111827, metalness: 0.45, roughness: 0.45 };
                const bellyMat = { color: 0x374151, roughness: 0.55 };
                const fireEyeMat = { color: 0xfbbf24, emissive: 0xf97316, emissiveIntensity: 1.4 };
                setVec3(rig.body.position, 0, 0.96, 0);
                addPart(THREE, rig.body, 'BoxGeometry', [0.68, 0.62, 1.15], scaleMat, [0, 0, -0.05], [0.22, 0, 0]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.54, 0.20, 0.95], bellyMat, [0, -0.22, -0.05], [0.22, 0, 0]);
                // Spiked Tail
                addPart(THREE, rig.body, 'ConeGeometry', [0.22, 1.35, 6], scaleMat, [0, -0.28, -1.05], [-1.25, 0, 0]);
                // Clawed Legs & Arms
                addPart(THREE, rig.leftLeg, 'BoxGeometry', [0.22, 0.68, 0.24], scaleMat, [-0.12, -0.32, -0.10]);
                addPart(THREE, rig.rightLeg, 'BoxGeometry', [0.22, 0.68, 0.24], scaleMat, [0.12, -0.32, -0.10]);
                addPart(THREE, rig.leftArm, 'BoxGeometry', [0.18, 0.52, 0.18], scaleMat, [0, -0.22, 0.20]);
                addPart(THREE, rig.rightArm, 'BoxGeometry', [0.18, 0.52, 0.18], scaleMat, [0, -0.22, 0.20]);
                // Horned Dragon Skull
                setVec3(rig.head.position, 0, 0.46, 0.58);
                addPart(THREE, rig.head, 'BoxGeometry', [0.42, 0.34, 0.54], scaleMat, [0, 0.08, 0.12]);
                addPart(THREE, rig.head, 'BoxGeometry', [0.30, 0.18, 0.38], scaleMat, [0, -0.02, 0.44]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.08, 0.48, 5], { color: 0x334155 }, [-0.16, 0.34, -0.08], [-0.45, 0, 0.22]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.08, 0.48, 5], { color: 0x334155 }, [0.16, 0.34, -0.08], [-0.45, 0, -0.22]);
                addPart(THREE, rig.head, 'SphereGeometry', [0.06, 6, 6], fireEyeMat, [-0.16, 0.14, 0.34]);
                addPart(THREE, rig.head, 'SphereGeometry', [0.06, 6, 6], fireEyeMat, [0.16, 0.14, 0.34]);
                // Huge Articulated Flapping Wings
                const leftWing = new THREE.Group();
                const rightWing = new THREE.Group();
                setVec3(leftWing.position, -0.34, 0.15, 0);
                setVec3(rightWing.position, 0.34, 0.15, 0);
                addPart(THREE, leftWing, 'BoxGeometry', [1.15, 0.08, 0.72], { color: 0x1f2937, emissive: 0x7c2d12, emissiveIntensity: 0.25 }, [-0.58, 0.10, -0.10], [0, 0.18, 0.15]);
                addPart(THREE, rightWing, 'BoxGeometry', [1.15, 0.08, 0.72], { color: 0x1f2937, emissive: 0x7c2d12, emissiveIntensity: 0.25 }, [0.58, 0.10, -0.10], [0, -0.18, -0.15]);
                rig.wings.add(leftWing);
                rig.wings.add(rightWing);
                rig.wings.userData.flapPair = [leftWing, rightWing];
                setVec3(root.scale, 1.55, 1.55, 1.55);
                break;
            }
            case 'boss3': { // Lorde Supremo do Caos (Towering Overlord + Orbiting Dark-Purple Rings)
                buildHumanoidBase(THREE, rig, {
                    armor: 0x140b24, trim: 0xa855f7, cloth: 0x2e1065, boots: 0x090414,
                    eyes: 0xe879f9, eyeGlow: 1.5, heavyShoulders: true, masked: true, metalness: 0.85
                });
                // Abyssal Crowned Helm + Shoulder Spikes
                addPart(THREE, rig.head, 'ConeGeometry', [0.08, 0.45, 5], { color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.7 }, [-0.20, 0.36, 0], [0, 0, 0.35]);
                addPart(THREE, rig.head, 'ConeGeometry', [0.08, 0.45, 5], { color: 0xa855f7, emissive: 0x7e22ce, emissiveIntensity: 0.7 }, [0.20, 0.36, 0], [0, 0, -0.35]);
                addPart(THREE, rig.head, 'OctahedronGeometry', [0.10, 0], { color: 0xe879f9, emissive: 0xd946ef, emissiveIntensity: 1.4 }, [0, 0.32, 0.12]);
                addPart(THREE, rig.body, 'ConeGeometry', [0.09, 0.42, 4], { color: 0x6b21a8, emissive: 0x9333ea, emissiveIntensity: 0.6 }, [-0.48, 0.48, 0], [0, 0, 0.4]);
                addPart(THREE, rig.body, 'ConeGeometry', [0.09, 0.42, 4], { color: 0x6b21a8, emissive: 0x9333ea, emissiveIntensity: 0.6 }, [0.48, 0.48, 0], [0, 0, -0.4]);
                addCape(THREE, rig, 0x2e1065, 0xa855f7, 1.15);
                populateWeapon(THREE, rig.weapon, { name: 'Colapso do Vazio', rarity: 'mitico', element: 'trevas' }, 'greatsword');

                // Orbiting Dark-Purple Chaos Rings
                const chaosOrbit1 = addPart(THREE, rig.extras, 'TorusGeometry', [0.95, 0.04, 6, 24], { color: 0x7e22ce, emissive: 0x9333ea, emissiveIntensity: 1.2 }, [0, 1.15, 0], [0.65, 0.25, 0]);
                const chaosOrbit2 = addPart(THREE, rig.extras, 'TorusGeometry', [0.80, 0.035, 6, 20], { color: 0xc084fc, emissive: 0xa855f7, emissiveIntensity: 1.1 }, [0, 1.15, 0], [-0.55, 0.45, 0.4]);
                if (chaosOrbit1) chaosOrbit1.userData = { orbitSpeed: 1.9 };
                if (chaosOrbit2) chaosOrbit2.userData = { orbitSpeed: -2.4 };
                const voidFloor = addPart(THREE, rig.aura, 'RingGeometry', [0.72, 0.90, 24], { color: 0x9333ea, emissive: 0x6b21a8, emissiveIntensity: 1.1, transparent: true, opacity: 0.78, side: THREE.DoubleSide }, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
                if (voidFloor) voidFloor.userData = { spinSpeed: -1.4 };
                setVec3(root.scale, 1.72, 1.72, 1.72);
                break;
            }
        }

        if (m.phase === 2 || m.isPhase2) {
            applyPhase2Ascension(THREE, root, rig);
        }

        root.userData.entityType = 'monster';
        root.userData.monsterKey = key;
        root.userData.phase = m.phase || (m.isPhase2 ? 2 : 1);
        saveRestPose(rig);
        return root;
    }

    // ---------------------------------------------------------
    // Prop Models ('tree', 'rock', 'pillar', 'camp', 'portal', 'chest', 'chest_open', 'shrine', 'bridge', 'wall')
    // ---------------------------------------------------------
    function createPropModel(propType, theme) {
        const THREE = getTHREE();
        if (!THREE) return null;

        const kind = normalizeText(propType || 'rock');
        const pal = getThemePalette(theme);
        const { root, rig } = createRigRoot(THREE);
        // Reset body offset for props so parts sit cleanly at y=0
        setVec3(rig.body.position, 0, 0, 0);

        if (kind === 'tree') {
            addPart(THREE, rig.body, 'CylinderGeometry', [0.12, 0.18, 0.75, 6], { color: pal.secondary, roughness: 0.9 }, [0, 0.37, 0]);
            const leafColor = normalizeText(theme) === 'abyss' ? 0x4c1d95 : normalizeText(theme) === 'volcano' ? 0x292524 : pal.primary;
            addPart(THREE, rig.body, 'ConeGeometry', [0.58, 0.85, 6], { color: leafColor, roughness: 0.85 }, [0, 0.95, 0]);
            addPart(THREE, rig.body, 'ConeGeometry', [0.44, 0.75, 6], { color: leafColor, roughness: 0.85 }, [0, 1.40, 0]);
            addPart(THREE, rig.body, 'ConeGeometry', [0.28, 0.60, 6], { color: pal.accent, emissive: normalizeText(theme) === 'abyss' ? pal.glow : 0x000000, emissiveIntensity: 0.35, roughness: 0.8 }, [0, 1.80, 0]);
        } else if (kind === 'rock') {
            addPart(THREE, rig.body, 'DodecahedronGeometry', [0.42, 0], { color: pal.stone, roughness: 0.85 }, [0, 0.28, 0], [0.2, 0.4, 0.1], [1.1, 0.75, 1.0]);
            addPart(THREE, rig.body, 'DodecahedronGeometry', [0.24, 0], { color: pal.secondary, roughness: 0.85 }, [0.26, 0.16, 0.16], [0.1, 0.8, 0]);
            if (normalizeText(theme) === 'volcano' || normalizeText(theme) === 'abyss' || normalizeText(theme) === 'cave') {
                addPart(THREE, rig.extras, 'OctahedronGeometry', [0.14, 0], { color: pal.accent, emissive: pal.glow, emissiveIntensity: 0.75 }, [-0.15, 0.42, 0.12]);
            }
        } else if (kind === 'pillar') {
            addPart(THREE, rig.body, 'BoxGeometry', [0.58, 0.18, 0.58], { color: pal.stone }, [0, 0.09, 0]);
            addPart(THREE, rig.body, 'CylinderGeometry', [0.22, 0.25, 1.45, 6], { color: pal.stone }, [0, 0.90, 0]);
            addPart(THREE, rig.body, 'BoxGeometry', [0.50, 0.16, 0.50], { color: pal.stone }, [0, 1.66, 0]);
            addPart(THREE, rig.aura, 'OctahedronGeometry', [0.14, 0], { color: pal.accent, emissive: pal.glow, emissiveIntensity: 0.9 }, [0, 1.92, 0]);
        } else if (kind === 'camp') {
            // Stone Ring & Crossed Logs
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * Math.PI * 2;
                addPart(THREE, rig.body, 'DodecahedronGeometry', [0.10, 0], { color: 0x57534e }, [Math.cos(a) * 0.38, 0.06, Math.sin(a) * 0.38]);
            }
            addPart(THREE, rig.body, 'CylinderGeometry', [0.06, 0.06, 0.55, 5], { color: 0x5c3a21 }, [0, 0.08, 0], [Math.PI / 2, 0.4, 0]);
            addPart(THREE, rig.body, 'CylinderGeometry', [0.06, 0.06, 0.55, 5], { color: 0x451a03 }, [0, 0.08, 0], [Math.PI / 2, -0.4, 0]);
            // Animated Layered Flames
            const f1 = addPart(THREE, rig.aura, 'ConeGeometry', [0.22, 0.55, 5], { color: 0xff5500, emissive: 0xff4500, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 }, [0, 0.30, 0]);
            const f2 = addPart(THREE, rig.aura, 'ConeGeometry', [0.12, 0.38, 5], { color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 1.5 }, [0, 0.26, 0]);
            if (f1) f1.userData = { flickerSpeed: 7.5 };
            if (f2) f2.userData = { flickerSpeed: 10.5 };
        } else if (kind === 'portal') {
            addPart(THREE, rig.body, 'BoxGeometry', [0.85, 0.14, 0.42], { color: pal.stone }, [0, 0.07, 0]);
            const vortex = addPart(THREE, rig.aura, 'TorusGeometry', [0.48, 0.08, 8, 18], { color: pal.accent, emissive: pal.glow, emissiveIntensity: 1.1 }, [0, 0.72, 0]);
            if (vortex) vortex.userData = { spinSpeed: 2.2 };
            const disc = addPart(THREE, rig.extras, 'CylinderGeometry', [0.42, 0.42, 0.04, 14], { color: pal.glow, emissive: pal.glow, emissiveIntensity: 0.8, transparent: true, opacity: 0.55 }, [0, 0.72, 0], [Math.PI / 2, 0, 0]);
            if (disc) disc.userData = { pulseSpeed: 3.0 };
        } else if (kind === 'chest' || kind === 'chest_open') {
            addPart(THREE, rig.body, 'BoxGeometry', [0.64, 0.36, 0.44], { color: 0x6b4423, roughness: 0.8 }, [0, 0.18, 0]);
            addPart(THREE, rig.body, 'BoxGeometry', [0.66, 0.06, 0.46], { color: 0xd4af37, metalness: 0.75 }, [0, 0.34, 0]);
            if (kind === 'chest_open') {
                addPart(THREE, rig.body, 'BoxGeometry', [0.64, 0.16, 0.44], { color: 0x78350f }, [0, 0.52, -0.22], [-0.95, 0, 0]);
                addPart(THREE, rig.aura, 'OctahedronGeometry', [0.16, 0], { color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 1.2 }, [0, 0.38, 0]);
            } else {
                addPart(THREE, rig.body, 'BoxGeometry', [0.64, 0.16, 0.44], { color: 0x78350f }, [0, 0.44, 0]);
                addPart(THREE, rig.body, 'BoxGeometry', [0.10, 0.12, 0.06], { color: 0xfbbf24, metalness: 0.85 }, [0, 0.34, 0.24]);
            }
        } else if (kind === 'shrine') {
            addPart(THREE, rig.body, 'CylinderGeometry', [0.38, 0.50, 0.24, 6], { color: pal.stone }, [0, 0.12, 0]);
            addPart(THREE, rig.body, 'CylinderGeometry', [0.22, 0.30, 0.45, 6], { color: pal.stone }, [0, 0.45, 0]);
            const crystal = addPart(THREE, rig.aura, 'OctahedronGeometry', [0.22, 0], { color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.2 }, [0, 1.02, 0]);
            if (crystal) crystal.userData = { floatSpeed: 2.4, spinSpeed: 1.5 };
            addPart(THREE, rig.extras, 'RingGeometry', [0.48, 0.56, 16], { color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.8, transparent: true, opacity: 0.6, side: THREE.DoubleSide }, [0, 0.02, 0], [-Math.PI / 2, 0, 0]);
        } else if (kind === 'bridge') {
            const plankColor = normalizeText(theme) === 'abyss' ? 0x4c1d95 : 0x5c3a21;
            const railColor = normalizeText(theme) === 'abyss' ? 0xc084fc : 0x78350f;
            addPart(THREE, rig.body, 'BoxGeometry', [1.0, 0.12, 0.96], { color: plankColor, roughness: 0.85 }, [0, 0.05, 0]);
            addPart(THREE, rig.body, 'BoxGeometry', [1.0, 0.16, 0.08], { color: railColor }, [0, 0.16, -0.44]);
            addPart(THREE, rig.body, 'BoxGeometry', [1.0, 0.16, 0.08], { color: railColor }, [0, 0.16, 0.44]);
        } else {
            // 'wall'
            addPart(THREE, rig.body, 'BoxGeometry', [0.96, 1.20, 0.96], { color: pal.stone, roughness: 0.88 }, [0, 0.60, 0]);
            addPart(THREE, rig.body, 'BoxGeometry', [0.30, 0.18, 0.30], { color: pal.stone }, [-0.30, 1.28, -0.30]);
            addPart(THREE, rig.body, 'BoxGeometry', [0.30, 0.18, 0.30], { color: pal.stone }, [0.30, 1.28, 0.30]);
        }

        root.userData.entityType = 'prop';
        root.userData.propType = kind;
        root.userData.theme = theme || 'forest';
        saveRestPose(rig);
        return root;
    }

    // ---------------------------------------------------------
    // Procedural Animation System (10 modes)
    // ---------------------------------------------------------
    function playOneShot(model, mode, duration = 0.45) {
        if (!model || !model.userData) return;
        model.userData.animState = {
            mode: mode || 'attack',
            time: 0,
            duration: duration > 0 ? duration : 0.45,
            oneShot: true
        };
    }

    function updateAmbientChildren(group, t) {
        if (!group || !group.children) return;
        for (let i = 0; i < group.children.length; i++) {
            const c = group.children[i];
            const ud = c.userData || {};
            if (ud.orbitSpeed) {
                c.rotation.y = t * ud.orbitSpeed;
            }
            if (ud.spinSpeed) {
                c.rotation.z = t * ud.spinSpeed;
            }
            if (ud.flickerSpeed) {
                const s = 0.88 + Math.sin(t * ud.flickerSpeed) * 0.18;
                setVec3(c.scale, s, 0.9 + Math.cos(t * ud.flickerSpeed * 1.3) * 0.22, s);
            }
            if (ud.floatSpeed) {
                c.position.y = 1.02 + Math.sin(t * ud.floatSpeed) * 0.12;
                c.rotation.y = t * (ud.spinSpeed || 1.2);
            }
            if (ud.pulseSpeed) {
                const p = 0.92 + Math.sin(t * ud.pulseSpeed) * 0.08;
                setVec3(c.scale, p, p, p);
            }
        }
    }

    function updateAnimation(model, dt) {
        if (!model || !model.userData || !model.userData.rig) return;
        const rig = model.userData.rig;
        const state = model.userData.animState || (model.userData.animState = { mode: 'idle', time: 0, duration: 0, oneShot: false });

        const step = Math.min(Math.max(dt || 0.016, 0), 1.0);
        state.time += step;

        let mode = state.mode || 'idle';
        let progress = 0;

        if (state.oneShot && state.duration > 0) {
            progress = Math.min(1, state.time / state.duration);
            if (state.time >= state.duration) {
                if (mode === 'death') {
                    progress = 1;
                } else {
                    state.mode = 'idle';
                    state.oneShot = false;
                    state.time = 0;
                    state.duration = 0;
                    mode = 'idle';
                }
            }
        }

        const t = state.time;

        // Ambient sub-parts (orbiting runes, flames, crystals, spider legs, dragon wings, hydra necks)
        updateAmbientChildren(rig.aura, t);
        updateAmbientChildren(rig.extras, t);

        if (rig.wings?.userData?.flapPair) {
            const [lw, rw] = rig.wings.userData.flapPair;
            const flapSpeed = mode === 'ultimate' || mode === 'attack' ? 9.0 : 3.2;
            const flapAmp = mode === 'death' ? 0.05 : 0.42;
            const f = Math.sin(t * flapSpeed) * flapAmp;
            setVec3(lw.rotation, 0, 0, f);
            setVec3(rw.rotation, 0, 0, -f);
        }

        if (rig.head?.userData?.hydraNecks) {
            rig.head.userData.hydraNecks.forEach(n => {
                setVec3(n.group.rotation, 0.25 + Math.sin(t * 2.8 + n.phase) * 0.18, Math.cos(t * 2.1 + n.phase) * 0.14, n.baseRotZ);
            });
        }

        if (rig.extras?.userData?.spiderLegs) {
            const speed = mode === 'walk' ? 14 : 3.5;
            const amp = mode === 'walk' ? 0.35 : 0.06;
            rig.extras.userData.spiderLegs.forEach(l => {
                const phase = l.idx * 1.4 + (l.side > 0 ? Math.PI : 0);
                setVec3(l.pivot.rotation, 0, l.baseYaw + Math.sin(t * speed + phase) * amp, 0);
            });
        }

        // Core Pose Animation by Mode
        const hoverBase = rig.body.userData?.hoverAmp ? Math.sin(t * 2.6) * rig.body.userData.hoverAmp : 0;

        switch (mode) {
            case 'walk': {
                const stride = Math.sin(t * 10);
                const bounce = Math.abs(Math.sin(t * 10)) * 0.08;
                setFromRest(rig.body, 0, bounce + hoverBase, 0, 0.08, Math.sin(t * 10) * 0.06, 0);
                setFromRest(rig.head, 0, 0, 0, -0.05, 0, 0);
                setFromRest(rig.leftLeg, 0, 0, 0, stride * 0.65, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, -stride * 0.65, 0, 0);
                setFromRest(rig.leftArm, 0, 0, 0, -stride * 0.55, 0, 0);
                setFromRest(rig.rightArm, 0, 0, 0, stride * 0.55, 0, 0);
                setFromRest(rig.cape, 0, 0, 0, 0.28 + Math.sin(t * 10) * 0.12, 0, 0);
                break;
            }

            case 'attack': {
                const p = state.duration > 0 ? progress : ((t * 2.2) % 1);
                const swing = p < 0.35 ? -p / 0.35 : Math.sin(((p - 0.35) / 0.65) * Math.PI);
                setFromRest(rig.body, 0, hoverBase, swing * 0.14, swing * 0.32, -swing * 0.35, 0);
                setFromRest(rig.head, 0, 0, 0, -swing * 0.15, swing * 0.20, 0);
                setFromRest(rig.rightArm, 0, 0, 0, p < 0.35 ? -1.4 * (p / 0.35) : -1.4 + 2.3 * ((p - 0.35) / 0.65), 0, -0.2);
                setFromRest(rig.leftArm, 0, 0, 0, 0.35 * swing, 0, 0.25);
                setFromRest(rig.leftLeg, 0, 0, 0, -0.25 * swing, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, 0.25 * swing, 0, 0);
                setFromRest(rig.cape, 0, 0, 0, 0.25, 0, 0);
                break;
            }

            case 'cast': {
                const p = state.duration > 0 ? Math.sin(progress * Math.PI) : 0.6 + 0.4 * Math.sin(t * 6);
                setFromRest(rig.body, 0, p * 0.14 + hoverBase, 0, -0.10 * p, 0, 0);
                setFromRest(rig.head, 0, 0, 0, -0.22 * p, 0, 0);
                setFromRest(rig.leftArm, 0, 0, 0, -2.1 * p, 0, -0.35 * p);
                setFromRest(rig.rightArm, 0, 0, 0, -2.2 * p, 0, 0.35 * p);
                setFromRest(rig.leftLeg, 0, 0, 0, 0, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, 0, 0, 0);
                setFromRest(rig.cape, 0, 0, 0, 0.35 * p, 0, 0);
                break;
            }

            case 'hit': {
                const p = state.duration > 0 ? Math.sin(progress * Math.PI) : Math.abs(Math.sin(t * 12));
                const shake = Math.sin(t * 45) * 0.06 * p;
                setFromRest(rig.body, shake, hoverBase, -p * 0.16, -0.35 * p, 0, shake);
                setFromRest(rig.head, 0, 0, 0, -0.25 * p, 0, 0);
                setFromRest(rig.leftArm, 0, 0, 0, -0.45 * p, 0, -0.45 * p);
                setFromRest(rig.rightArm, 0, 0, 0, -0.45 * p, 0, 0.45 * p);
                setFromRest(rig.leftLeg, 0, 0, 0, 0, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, 0, 0, 0);
                break;
            }

            case 'defend': {
                setFromRest(rig.body, 0, -0.08 + hoverBase, 0, 0.15, -0.30, 0);
                setFromRest(rig.head, 0, 0, 0, 0.10, 0.25, 0);
                setFromRest(rig.leftArm, 0.10, 0.06, 0.18, -1.05, 0.55, 0.15);
                setFromRest(rig.rightArm, 0, 0, 0, -0.35, -0.25, 0);
                setFromRest(rig.leftLeg, 0, 0, 0, -0.22, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, 0.22, 0, 0);
                break;
            }

            case 'death': {
                const p = state.duration > 0 ? Math.min(1, progress) : Math.min(1, t / 0.55);
                const ease = p * (2 - p);
                setFromRest(rig.body, 0, -0.58 * ease, -0.25 * ease, -1.42 * ease, 0, 0.18 * ease);
                setFromRest(rig.head, 0, 0, 0, -0.25 * ease, 0, 0);
                setFromRest(rig.leftArm, 0, 0, 0, -0.5 * ease, 0, -0.75 * ease);
                setFromRest(rig.rightArm, 0, 0, 0, -0.4 * ease, 0, 0.85 * ease);
                setFromRest(rig.leftLeg, 0, -0.35 * ease, 0, -1.35 * ease, 0, -0.15 * ease);
                setFromRest(rig.rightLeg, 0, -0.35 * ease, 0, -1.35 * ease, 0, 0.15 * ease);
                break;
            }

            case 'celebrate': {
                const hop = Math.abs(Math.sin(t * 6.5)) * 0.22;
                const pump = Math.sin(t * 6.5) * 0.30;
                setFromRest(rig.body, 0, hop + hoverBase, 0, 0, Math.sin(t * 3.2) * 0.25, 0);
                setFromRest(rig.head, 0, 0, 0, -0.12, 0, 0);
                setFromRest(rig.leftArm, 0, 0, 0, -2.5 + pump, 0, -0.30);
                setFromRest(rig.rightArm, 0, 0, 0, -2.6 - pump, 0, 0.30);
                setFromRest(rig.leftLeg, 0, 0, 0, hop * 0.4, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, -hop * 0.4, 0, 0);
                setFromRest(rig.cape, 0, 0, 0, 0.25 + hop * 0.6, 0, 0);
                break;
            }

            case 'talk': {
                const nod = Math.sin(t * 4.5) * 0.10;
                const tilt = Math.cos(t * 2.8) * 0.12;
                const gesture = Math.sin(t * 5.2) * 0.35;
                setFromRest(rig.body, 0, Math.sin(t * 2.2) * 0.02 + hoverBase, 0, 0, Math.sin(t * 1.8) * 0.08, 0);
                setFromRest(rig.head, 0, 0, 0, nod, tilt, Math.sin(t * 2.1) * 0.06);
                setFromRest(rig.leftArm, 0, 0, 0, -0.45 + gesture * 0.4, 0, -0.15);
                setFromRest(rig.rightArm, 0, 0, 0, -0.65 - gesture, 0.20, 0.15);
                setFromRest(rig.leftLeg, 0, 0, 0, 0, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, 0, 0, 0);
                break;
            }

            case 'ultimate': {
                const p = state.duration > 0 ? progress : ((t * 1.5) % 1);
                const rise = Math.sin(p * Math.PI);
                setFromRest(rig.body, 0, rise * 0.42 + hoverBase, 0, p > 0.7 ? 0.35 : -0.20 * rise, t * 4.0 * rise, 0);
                setFromRest(rig.head, 0, 0, 0, -0.30 * rise, 0, 0);
                setFromRest(rig.leftArm, 0, 0, 0, -2.6 * rise, 0, -0.6 * rise);
                setFromRest(rig.rightArm, 0, 0, 0, -2.6 * rise, 0, 0.6 * rise);
                setFromRest(rig.cape, 0, 0, 0, 0.65 * rise, 0, 0);
                break;
            }

            case 'idle':
            default: {
                const breath = Math.sin(t * 2.4) * 0.035;
                const sway = Math.sin(t * 1.5) * 0.05;
                setFromRest(rig.body, 0, breath + hoverBase, 0, 0, sway * 0.4, 0);
                setFromRest(rig.head, 0, 0, 0, Math.sin(t * 1.8) * 0.04, Math.sin(t * 1.1) * 0.08, 0);
                setFromRest(rig.leftArm, 0, 0, 0, Math.sin(t * 2.4) * 0.07, 0, -0.05);
                setFromRest(rig.rightArm, 0, 0, 0, -Math.sin(t * 2.4) * 0.07, 0, 0.05);
                setFromRest(rig.leftLeg, 0, 0, 0, 0, 0, 0);
                setFromRest(rig.rightLeg, 0, 0, 0, 0, 0, 0);
                setFromRest(rig.cape, 0, 0, 0, 0.06 + Math.sin(t * 2.6) * 0.06, 0, 0);
                break;
            }
        }
    }

    const Models3D = {
        RARITY_META,
        THEME_PALETTES,
        isAvailable: () => Boolean(getTHREE()),
        createHeroModel,
        createNPCModel,
        createMonsterModel,
        createPropModel,
        updateAnimation,
        playOneShot
    };

    if (typeof window !== 'undefined') {
        window.Models3D = Models3D;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Models3D;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this);
