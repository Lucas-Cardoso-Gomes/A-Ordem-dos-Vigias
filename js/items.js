/**
 * items.js
 * Definitions and generators for weapons, armor, materials, and potions.
 */

const ItemDatabase = {
    rarities: ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'],
    
    types: {
        WEAPON: 'weapon',
        ARMOR: 'armor',
        POTION: 'potion',
        MATERIAL: 'material',
        ACCESSORY: 'accessory'
    },

    weaponBases: [
        { id: 'w1', name: 'Espada Longa', type: 'weapon', slot: 'weaponMain', minDmg: 5, maxDmg: 10, reqLvl: 1 },
        { id: 'w2', name: 'Espada de Prata', type: 'weapon', slot: 'weaponMain', minDmg: 8, maxDmg: 14, reqLvl: 5, weakness: 'prata' },
        { id: 'w3', name: 'Machado de Batalha', type: 'weapon', slot: 'weaponMain', minDmg: 10, maxDmg: 20, reqLvl: 10, weakness: 'machados' },
        { id: 'w4', name: 'Lança', type: 'weapon', slot: 'weaponMain', minDmg: 7, maxDmg: 15, reqLvl: 5 },
        { id: 'w5', name: 'Besta', type: 'weapon', slot: 'weaponMain', minDmg: 12, maxDmg: 18, reqLvl: 15, weakness: 'estaca' },
        { id: 'w6', name: 'Arco Longo', type: 'weapon', slot: 'weaponMain', minDmg: 8, maxDmg: 16, reqLvl: 8 },
        { id: 'w7', name: 'Cajado de Gelo', type: 'weapon', slot: 'weaponMain', minDmg: 6, maxDmg: 14, reqLvl: 10, weakness: 'gelo', magic: true },
        { id: 'w8', name: 'Cajado de Fogo', type: 'weapon', slot: 'weaponMain', minDmg: 8, maxDmg: 18, reqLvl: 15, weakness: 'fogo', magic: true },
        { id: 'w9', name: 'Tomo Sagrado', type: 'weapon', slot: 'weaponMain', minDmg: 10, maxDmg: 20, reqLvl: 20, weakness: 'luz sagrada', magic: true },
        { id: 'w10', name: 'Grimório Sombrio', type: 'weapon', slot: 'weaponMain', minDmg: 15, maxDmg: 25, reqLvl: 30, weakness: 'magia arcana', magic: true },
        { id: 'w11', name: 'Katana Sombria', type: 'weapon', slot: 'weaponMain', minDmg: 20, maxDmg: 35, reqLvl: 40, weakness: 'trevas' },
        { id: 'w12', name: 'Martelo dos Deuses', type: 'weapon', slot: 'weaponMain', minDmg: 30, maxDmg: 50, reqLvl: 60, weakness: 'sagrado' },

        { id: 'wo1', name: 'Adaga Curta', type: 'weapon', slot: 'weaponOff', minDmg: 3, maxDmg: 6, reqLvl: 1 },
        { id: 'wo2', name: 'Escudo de Madeira', type: 'weapon', slot: 'weaponOff', minDmg: 1, maxDmg: 2, def: 3, reqLvl: 3 },
        { id: 'wo3', name: 'Adaga Envenenada', type: 'weapon', slot: 'weaponOff', minDmg: 5, maxDmg: 10, reqLvl: 10, weakness: 'veneno' },
        { id: 'wo4', name: 'Orbe Mágico', type: 'weapon', slot: 'weaponOff', minDmg: 2, maxDmg: 5, reqLvl: 10, magic: true, stats: { mana: 20 } },
        { id: 'wo5', name: 'Escudo de Ferro', type: 'weapon', slot: 'weaponOff', minDmg: 2, maxDmg: 4, def: 8, reqLvl: 15 },
        { id: 'wo6', name: 'Tomo Menor', type: 'weapon', slot: 'weaponOff', minDmg: 4, maxDmg: 8, reqLvl: 15, magic: true, stats: { int: 5 } }
    ],

    armorBases: [
        { id: 'a1', name: 'Capuz de Couro', type: 'armor', slot: 'head', def: 2, reqLvl: 1 },
        { id: 'a2', name: 'Peitoral de Couro', type: 'armor', slot: 'chest', def: 5, reqLvl: 1 },
        { id: 'a3', name: 'Luvas de Couro', type: 'armor', slot: 'hands', def: 1, reqLvl: 1 },
        { id: 'a4', name: 'Calças de Couro', type: 'armor', slot: 'legs', def: 3, reqLvl: 1 },
        { id: 'a5', name: 'Botas de Couro', type: 'armor', slot: 'boots', def: 2, reqLvl: 1 },
        { id: 'a6', name: 'Elmo de Ferro', type: 'armor', slot: 'head', def: 5, reqLvl: 10 },
        { id: 'a7', name: 'Cota de Malha', type: 'armor', slot: 'chest', def: 10, reqLvl: 10 },
        { id: 'a8', name: 'Armadura de Placas Rúnicas', type: 'armor', slot: 'chest', def: 30, reqLvl: 40 },
        { id: 'a9', name: 'Manto do Arquimago', type: 'armor', slot: 'chest', def: 15, reqLvl: 40, stats: { int: 10, mana: 50 } }
    ],

    materials: [
        { id: 'm1', name: 'Ossos', type: 'material', value: 2 },
        { id: 'm2', name: 'Couro', type: 'material', value: 3 },
        { id: 'm3', name: 'Presas', type: 'material', value: 5 },
        { id: 'm4', name: 'Escamas', type: 'material', value: 10 },
        { id: 'm5', name: 'Sangue Vampírico', type: 'material', value: 20 },
        { id: 'm6', name: 'Chifre de Minotauro', type: 'material', value: 25 },
        { id: 'm7', name: 'Essência Demoníaca', type: 'material', value: 50 },
        { id: 'm8', name: 'Fragmento de Cristal', type: 'material', value: 75 },
        { id: 'm9', name: 'Pó Mágico', type: 'material', value: 100 }
    ],

    potions: [
        { id: 'p1', name: 'Poção de Vida Menor', type: 'potion', effect: 'heal', value: 50, gold: 10 },
        { id: 'p2', name: 'Poção de Mana Menor', type: 'potion', effect: 'mana', value: 30, gold: 10 },
        { id: 'p3', name: 'Antídoto', type: 'potion', effect: 'cure_poison', value: 0, gold: 20 },
        { id: 'p4', name: 'Poção de Vida Maior', type: 'potion', effect: 'heal', value: 200, gold: 50 },
        { id: 'p5', name: 'Poção de Mana Maior', type: 'potion', effect: 'mana', value: 100, gold: 50 }
    ],

    accessories: [
        { id: 'ac1', name: 'Amuleto do Lobo', type: 'accessory', slot: 'amulet', stats: { str: 2 }, reqLvl: 5 },
        { id: 'ac2', name: 'Anel de Rubi', type: 'accessory', slot: 'ring1', stats: { hp: 20 }, reqLvl: 5 },
        { id: 'ac3', name: 'Anel de Safira', type: 'accessory', slot: 'ring1', stats: { int: 5, mana: 30 }, reqLvl: 20 },
        { id: 'ac4', name: 'Amuleto do Corvo', type: 'accessory', slot: 'amulet', stats: { agi: 8, luk: 5 }, reqLvl: 30 }
    ],

    generateItem(level, forceRarity = null) {
        // Roll rarity
        let rarity = forceRarity || 'comum';
        if (!forceRarity) {
            const roll = Math.random() * 100;
            if (roll > 99) rarity = 'mitico';
            else if (roll > 95) rarity = 'lendario';
            else if (roll > 85) rarity = 'epico';
            else if (roll > 60) rarity = 'raro';
            else if (roll > 30) rarity = 'incomum';
        }

        const rarityMult = {
            'comum': 1, 'incomum': 1.2, 'raro': 1.5, 'epico': 2.0, 'lendario': 3.0, 'mitico': 5.0
        };
        const mult = rarityMult[rarity];

        // Pick random category (mostly gear, sometimes material/potion if low level)
        const categories = [this.weaponBases, this.armorBases, this.accessories];
        const category = categories[Math.floor(Math.random() * categories.length)];
        
        // Filter by level
        let validItems = category.filter(i => i.reqLvl <= level + 5);
        if (validItems.length === 0) validItems = category;

        const base = validItems[Math.floor(Math.random() * validItems.length)];
        
        // Create instance
        const item = {
            ...base,
            instanceId: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            rarity: rarity,
            sellValue: Math.floor((base.reqLvl * 10) * mult)
        };

        // Scale stats
        if (item.minDmg) item.minDmg = Math.floor(item.minDmg * mult);
        if (item.maxDmg) item.maxDmg = Math.floor(item.maxDmg * mult);
        if (item.def) item.def = Math.floor(item.def * mult);
        
        if (item.stats) {
            item.stats = { ...item.stats };
            for (let k in item.stats) {
                item.stats[k] = Math.floor(item.stats[k] * mult);
            }
        }

        return item;
    },

    getMaterial(id) {
        return { ...this.materials.find(m => m.id === id), instanceId: 'mat_' + Date.now() + '_' + Math.random(), rarity: 'comum' };
    },
    
    getPotion(id) {
        return { ...this.potions.find(p => p.id === id), instanceId: 'pot_' + Date.now() + '_' + Math.random(), rarity: 'comum' };
    }
};

window.ItemDatabase = ItemDatabase;