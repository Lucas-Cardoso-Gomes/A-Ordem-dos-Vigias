/**
 * items.js
 * Definitions and generators for weapons, armor, materials, consumables, and mythic endgame gear.
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
        { id: 'w1', name: 'Espada Longa', type: 'weapon', slot: 'weaponMain', minDmg: 5, maxDmg: 10, reqLvl: 1, range: 1 },
        { id: 'w2', name: 'Espada de Prata', type: 'weapon', slot: 'weaponMain', minDmg: 8, maxDmg: 14, reqLvl: 5, weakness: 'prata', range: 1 },
        { id: 'w3', name: 'Machado de Batalha', type: 'weapon', slot: 'weaponMain', minDmg: 10, maxDmg: 20, reqLvl: 10, weakness: 'machados', range: 1 },
        { id: 'w4', name: 'Lança', type: 'weapon', slot: 'weaponMain', minDmg: 7, maxDmg: 15, reqLvl: 5, range: 2 },
        { id: 'w5', name: 'Besta', type: 'weapon', slot: 'weaponMain', minDmg: 12, maxDmg: 18, reqLvl: 15, weakness: 'estaca', range: 8 },
        { id: 'w6', name: 'Arco Longo', type: 'weapon', slot: 'weaponMain', minDmg: 8, maxDmg: 16, reqLvl: 8, range: 8 },
        { id: 'w7', name: 'Cajado de Gelo', type: 'weapon', slot: 'weaponMain', minDmg: 6, maxDmg: 14, reqLvl: 10, weakness: 'gelo', magic: true, range: 6 },
        { id: 'w8', name: 'Cajado de Fogo', type: 'weapon', slot: 'weaponMain', minDmg: 8, maxDmg: 18, reqLvl: 15, weakness: 'fogo', magic: true, range: 6 },
        { id: 'w9', name: 'Tomo Sagrado', type: 'weapon', slot: 'weaponMain', minDmg: 10, maxDmg: 20, reqLvl: 20, weakness: 'luz sagrada', magic: true, range: 6 },
        { id: 'w10', name: 'Grimório Sombrio', type: 'weapon', slot: 'weaponMain', minDmg: 15, maxDmg: 25, reqLvl: 30, weakness: 'magia arcana', magic: true, range: 6 },
        { id: 'w11', name: 'Katana Sombria', type: 'weapon', slot: 'weaponMain', minDmg: 20, maxDmg: 35, reqLvl: 40, weakness: 'trevas', range: 1 },
        { id: 'w12', name: 'Martelo dos Deuses', type: 'weapon', slot: 'weaponMain', minDmg: 30, maxDmg: 50, reqLvl: 60, weakness: 'sagrado', range: 1 },
        { id: 'w13', name: 'Lâmina do Cataclismo', type: 'weapon', slot: 'weaponMain', minDmg: 45, maxDmg: 75, reqLvl: 75, weakness: 'fogo', range: 1, stats: { str: 18, luk: 8 }, desc: 'Espada mítica forjada no coração do Pico Vulcânico.' },
        { id: 'w14', name: 'Arco Astral dos Vigias', type: 'weapon', slot: 'weaponMain', minDmg: 38, maxDmg: 65, reqLvl: 70, weakness: 'raio', range: 9, stats: { agi: 20, luk: 12 }, desc: 'Arco lendário abençoado que dispara flechas tempestuosas.' },
        { id: 'w15', name: 'Cetro do Vazio Eterno', type: 'weapon', slot: 'weaponMain', minDmg: 40, maxDmg: 68, reqLvl: 80, weakness: 'trevas', magic: true, range: 7, stats: { int: 25, mana: 120 }, desc: 'Relíquia arcana que canaliza a energia do Abismo do Caos.' },

        { id: 'wo1', name: 'Adaga Curta', type: 'weapon', slot: 'weaponOff', minDmg: 3, maxDmg: 6, reqLvl: 1, range: 1 },
        { id: 'wo2', name: 'Escudo de Madeira', type: 'weapon', slot: 'weaponOff', minDmg: 1, maxDmg: 2, def: 3, reqLvl: 3, range: 1, isShield: true },
        { id: 'wo3', name: 'Adaga Envenenada', type: 'weapon', slot: 'weaponOff', minDmg: 5, maxDmg: 10, reqLvl: 10, weakness: 'veneno', range: 1 },
        { id: 'wo4', name: 'Orbe Mágico', type: 'weapon', slot: 'weaponOff', minDmg: 2, maxDmg: 5, reqLvl: 10, magic: true, stats: { mana: 20 }, range: 1 },
        { id: 'wo5', name: 'Escudo de Ferro', type: 'weapon', slot: 'weaponOff', minDmg: 2, maxDmg: 4, def: 8, reqLvl: 15, range: 1, isShield: true },
        { id: 'wo6', name: 'Tomo Menor', type: 'weapon', slot: 'weaponOff', minDmg: 4, maxDmg: 8, reqLvl: 15, magic: true, stats: { int: 5 }, range: 1 },
        { id: 'wo7', name: 'Escudo de Aço', type: 'weapon', slot: 'weaponOff', minDmg: 3, maxDmg: 6, def: 15, reqLvl: 25, range: 1, isShield: true },
        { id: 'wo8', name: 'Escudo Rúnico', type: 'weapon', slot: 'weaponOff', minDmg: 4, maxDmg: 8, def: 25, reqLvl: 40, range: 1, isShield: true, stats: { int: 10 } },
        { id: 'wo9', name: 'Aegis Sagrada', type: 'weapon', slot: 'weaponOff', minDmg: 5, maxDmg: 10, def: 40, reqLvl: 60, range: 1, isShield: true, stats: { hp: 100, def: 10 } },
        { id: 'wo10', name: 'Baluarte da Alvorada', type: 'weapon', slot: 'weaponOff', minDmg: 8, maxDmg: 16, def: 60, reqLvl: 75, range: 1, isShield: true, stats: { def: 20, hp: 250 }, desc: 'Escudo mítico impenetrável da Ordem dos Vigias.' }
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
        { id: 'a9', name: 'Manto do Arquimago', type: 'armor', slot: 'chest', def: 15, reqLvl: 40, stats: { int: 10, mana: 50 } },
        { id: 'a10', name: 'Elmo do Vigia Supremo', type: 'armor', slot: 'head', def: 35, reqLvl: 70, stats: { str: 10, int: 10, hp: 120 }, desc: 'Elmo mítico adornado com runas ancestrais.' },
        { id: 'a11', name: 'Armadura do Dragão Negro', type: 'armor', slot: 'chest', def: 65, reqLvl: 80, stats: { str: 15, def: 20, hp: 300 }, desc: 'Couraça mítica forjada com escamas do Dragão Negro.' },
        { id: 'a12', name: 'Manoplas da Tempestade', type: 'armor', slot: 'hands', def: 28, reqLvl: 65, stats: { agi: 12, str: 10 }, desc: 'Manoplas rúnicas que aceleram golpes e conjurações.' },
        { id: 'a13', name: 'Grevas do Abismo', type: 'armor', slot: 'legs', def: 38, reqLvl: 70, stats: { def: 15, agi: 10 }, desc: 'Proteção inabalável forjada contra o caos.' },
        { id: 'a14', name: 'Botas Etéreas do Vazio', type: 'armor', slot: 'boots', def: 25, reqLvl: 65, stats: { agi: 18, luk: 10 }, desc: 'Passos ágeis silenciosos como as sombras.' }
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
        { id: 'm9', name: 'Pó Mágico', type: 'material', value: 100 },
        { id: 'm10', name: 'Minério de Ferro', type: 'material', value: 5 }
    ],

    potions: [
        { id: 'p1', name: 'Poção de Vida Menor', type: 'potion', effect: 'heal', value: 50, gold: 10, desc: 'Restaura 50 de HP.' },
        { id: 'p2', name: 'Poção de Mana Menor', type: 'potion', effect: 'mana', value: 30, gold: 10, desc: 'Restaura 30 de Mana.' },
        { id: 'p3', name: 'Antídoto', type: 'potion', effect: 'cure_poison', value: 0, gold: 20, desc: 'Remove Veneno e Sangramento do aliado.' },
        { id: 'p4', name: 'Poção de Vida Maior', type: 'potion', effect: 'heal', value: 200, gold: 50, desc: 'Restaura 200 de HP.' },
        { id: 'p5', name: 'Poção de Mana Maior', type: 'potion', effect: 'mana', value: 100, gold: 50, desc: 'Restaura 100 de Mana.' },
        { id: 'p6', name: 'Elixir da Fúria', type: 'potion', effect: 'fury', value: 50, gold: 80, desc: 'Concede +50 de Fúria para liberar o golpe Supremo.' },
        { id: 'p7', name: 'Poção da Fênix', type: 'potion', effect: 'revive', value: 50, gold: 150, desc: 'Revive um aliado caído ou restaura 50% do HP máximo.' },
        { id: 'p8', name: 'Bomba Incendiária', type: 'potion', effect: 'fire_bomb', element: 'fogo', statusEffect: 'burn', value: 60, gold: 65, desc: 'Causa 60 de dano ígneo e aplica Queimadura em todos os inimigos em combate.' }
    ],

    accessories: [
        { id: 'ac1', name: 'Amuleto do Lobo', type: 'accessory', slot: 'amulet', stats: { str: 2 }, reqLvl: 5 },
        { id: 'ac2', name: 'Anel de Rubi', type: 'accessory', slot: 'ring1', stats: { hp: 20 }, reqLvl: 5 },
        { id: 'ac3', name: 'Anel de Safira', type: 'accessory', slot: 'ring1', stats: { int: 5, mana: 30 }, reqLvl: 20 },
        { id: 'ac4', name: 'Amuleto do Corvo', type: 'accessory', slot: 'amulet', stats: { agi: 8, luk: 5 }, reqLvl: 30 },
        { id: 'ac5', name: 'Coração de Dragão', type: 'accessory', slot: 'amulet', stats: { str: 15, int: 15, hp: 200 }, reqLvl: 70, desc: 'Amuleto mítico pulsante com fogo ancestral.' },
        { id: 'ac6', name: 'Anel do Caos Primordial', type: 'accessory', slot: 'ring1', stats: { agi: 15, luk: 15, int: 15 }, reqLvl: 80, desc: 'Anel mítico forjado nas profundezas do Abismo.' }
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
        const mult = rarityMult[rarity] || 1;

        const categories = [this.weaponBases, this.armorBases, this.accessories];
        const category = categories[Math.floor(Math.random() * categories.length)];

        let validItems = category.filter(i => i.reqLvl <= level + 5);
        if (validItems.length === 0) validItems = category;

        const base = validItems[Math.floor(Math.random() * validItems.length)];

        const item = {
            ...base,
            instanceId: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            rarity: rarity,
            sellValue: Math.floor((base.reqLvl * 10) * mult)
        };

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
        const base = this.materials.find(m => m.id === id);
        if (!base) return null;
        return { ...base, instanceId: 'mat_' + Date.now() + '_' + Math.random(), rarity: 'comum' };
    },

    getPotion(id) {
        const base = this.potions.find(p => p.id === id);
        if (!base) return null;
        return { ...base, instanceId: 'pot_' + Date.now() + '_' + Math.random(), rarity: 'comum' };
    }
};

if (typeof window !== 'undefined') {
    window.ItemDatabase = ItemDatabase;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemDatabase;
}
