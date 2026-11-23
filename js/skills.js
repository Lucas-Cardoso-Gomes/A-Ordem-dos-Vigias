/**
 * skills.js
 * Class skill definitions, elemental tags, status effect chances, and Portuguese descriptions.
 */

const SkillDatabase = {
    getSkillsForClass: function (playerClass, level, getTotalAttr) {
        const stat = typeof getTotalAttr === 'function' ? getTotalAttr : () => 10;
        let skills = [];

        switch (playerClass) {
            case 'Guerreiro':
                // Corpo a corpo puro, foco em dano físico direto, sangramento e investidas.
                if (level >= 1) skills.push({
                    id: 's_gue_0',
                    name: 'Corte Inicial',
                    manaCost: 10,
                    type: 'attack',
                    multiplier: 1.5,
                    reqLvl: 1,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.35,
                    statusDuration: 2,
                    desc: 'Golpe firme de abertura que fere o inimigo com chance de causar Sangramento.'
                });
                if (level >= 5) skills.push({
                    id: 's_gue_1',
                    name: 'Golpe Poderoso',
                    manaCost: 20,
                    type: 'attack',
                    multiplier: 2.0,
                    reqLvl: 5,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.40,
                    statusDuration: 2,
                    desc: 'Ataque brutal concentrado na força física, podendo abrir feridas profundas.'
                });
                if (level >= 10) skills.push({
                    id: 's_gue_2',
                    name: 'Corte Furioso',
                    manaCost: 40,
                    type: 'attack',
                    multiplier: 3.5,
                    reqLvl: 10,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.60,
                    statusDuration: 3,
                    desc: 'Sequência feroz de lâmina com alta chance de aplicar Sangramento por 3 turnos.'
                });
                if (level >= 20) skills.push({
                    id: 's_gue_3',
                    name: 'Investida Bruta',
                    manaCost: 70,
                    type: 'attack',
                    multiplier: 5.0,
                    reqLvl: 20,
                    range: 2,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.35,
                    statusDuration: 1,
                    desc: 'Avança com peso total contra o inimigo, podendo atordoá-lo com o impacto.'
                });
                if (level >= 30) skills.push({
                    id: 's_gue_4',
                    name: 'Giro de Batalha (Área)',
                    manaCost: 100,
                    type: 'attack',
                    multiplier: 4.5,
                    isAoE: true,
                    aoeRadius: 1,
                    reqLvl: 30,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.50,
                    statusDuration: 2,
                    desc: 'Golpe giratório que atinge todos os inimigos próximos e causa Sangramento.'
                });
                if (level >= 40) skills.push({
                    id: 's_gue_5',
                    name: 'Fúria do Berserker',
                    manaCost: 140,
                    type: 'attack',
                    multiplier: 8.0,
                    reqLvl: 40,
                    range: 1,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.55,
                    statusDuration: 3,
                    desc: 'Golpe inflamado por fúria ardente capaz de incendiar o alvo.'
                });
                if (level >= 50) skills.push({
                    id: 's_gue_6',
                    name: 'Esmagar Ossos',
                    manaCost: 180,
                    type: 'attack',
                    multiplier: 11.0,
                    reqLvl: 50,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.50,
                    statusDuration: 1,
                    desc: 'Golpe esmagador que quebra a guarda do oponente e pode atordoá-lo.'
                });
                if (level >= 60) skills.push({
                    id: 's_gue_7',
                    name: 'Onda de Choque (Área)',
                    manaCost: 220,
                    type: 'attack',
                    multiplier: 9.0,
                    isAoE: true,
                    aoeRadius: 2,
                    reqLvl: 60,
                    range: 2,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.65,
                    statusDuration: 3,
                    desc: 'Impacto no solo que projeta ondas cortantes em área média.'
                });
                if (level >= 70) skills.push({
                    id: 's_gue_8',
                    name: 'Golpe Colossal',
                    manaCost: 260,
                    type: 'attack',
                    multiplier: 15.0,
                    reqLvl: 70,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.75,
                    statusDuration: 3,
                    desc: 'Ataque monumental de precisão letal contra um único adversário.'
                });
                if (level >= 80) skills.push({
                    id: 's_gue_9',
                    name: 'Devastar',
                    manaCost: 310,
                    type: 'attack',
                    multiplier: 19.0,
                    reqLvl: 80,
                    range: 1,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.70,
                    statusDuration: 3,
                    desc: 'Corte incandescente de força absurda que aplica Queimadura severa.'
                });
                if (level >= 90) skills.push({
                    id: 's_gue_10',
                    name: 'Terremoto (Área)',
                    manaCost: 360,
                    type: 'attack',
                    multiplier: 14.0,
                    isAoE: true,
                    aoeRadius: 3,
                    reqLvl: 90,
                    range: 2,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.45,
                    statusDuration: 1,
                    desc: 'Abala o campo de batalha inteiro com chance de atordoar múltiplos inimigos.'
                });
                if (level >= 100) skills.push({
                    id: 's_gue_11',
                    name: 'Ira do Deus da Guerra',
                    manaCost: 450,
                    type: 'attack',
                    multiplier: 25.0,
                    reqLvl: 100,
                    range: 1,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.90,
                    statusDuration: 3,
                    desc: 'Técnica suprema marcial que libera chamas da guerra sobre o inimigo.'
                });
                break;

            case 'Caçador':
                // Ataque à distância, dano perfurante, veneno e armadilhas.
                if (level >= 1) skills.push({
                    id: 's_cac_0',
                    name: 'Disparo Rápido',
                    manaCost: 10,
                    type: 'attack',
                    multiplier: 1.5,
                    reqLvl: 1,
                    range: 6,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.30,
                    statusDuration: 2,
                    desc: 'Flecha ágil à distância que pode causar Sangramento por 2 turnos.'
                });
                if (level >= 5) skills.push({
                    id: 's_cac_1',
                    name: 'Tiro Certeiro',
                    manaCost: 20,
                    type: 'attack',
                    multiplier: 2.0,
                    reqLvl: 5,
                    range: 6,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.40,
                    statusDuration: 2,
                    desc: 'Disparo mirado em pontos vitais com chance de Sangramento.'
                });
                if (level >= 10) skills.push({
                    id: 's_cac_2',
                    name: 'Tiro Penetrante',
                    manaCost: 45,
                    type: 'attack',
                    multiplier: 3.2,
                    reqLvl: 10,
                    range: 7,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.55,
                    statusDuration: 3,
                    desc: 'Flecha perfurante de longo alcance que atravessa defesas leves.'
                });
                if (level >= 20) skills.push({
                    id: 's_cac_3',
                    name: 'Armadilha de Espinhos',
                    manaCost: 80,
                    type: 'terrain',
                    terrainType: 'spikes',
                    multiplier: 2.0,
                    duration: 3,
                    reqLvl: 20,
                    range: 5,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.60,
                    statusDuration: 2,
                    desc: 'Cria terreno de espinhos que fere e sangra inimigos que pisarem na área.'
                });
                if (level >= 30) skills.push({
                    id: 's_cac_4',
                    name: 'Saraivada (Área)',
                    manaCost: 110,
                    type: 'attack',
                    multiplier: 4.0,
                    isAoE: true,
                    aoeRadius: 2,
                    reqLvl: 30,
                    range: 6,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.45,
                    statusDuration: 2,
                    desc: 'Dispara múltiplas flechas simultaneamente em uma área média.'
                });
                if (level >= 40) skills.push({
                    id: 's_cac_5',
                    name: 'Tiro Envenenado',
                    manaCost: 150,
                    type: 'attack',
                    multiplier: 7.5,
                    element: 'veneno',
                    statusEffect: 'poison',
                    statusChance: 0.85,
                    statusDuration: 3,
                    reqLvl: 40,
                    range: 7,
                    desc: 'Flecha embebida em toxina mortal que quase sempre aplica Veneno.'
                });
                if (level >= 50) skills.push({
                    id: 's_cac_6',
                    name: 'Olho da Águia',
                    manaCost: 190,
                    type: 'attack',
                    multiplier: 10.5,
                    reqLvl: 50,
                    range: 8,
                    element: 'raio',
                    statusEffect: 'shock',
                    statusChance: 0.50,
                    statusDuration: 2,
                    desc: 'Disparo carregado de altíssimo alcance que aplica Eletrocução.'
                });
                if (level >= 60) skills.push({
                    id: 's_cac_7',
                    name: 'Chuva de Flechas (Área)',
                    manaCost: 240,
                    type: 'attack',
                    multiplier: 8.5,
                    isAoE: true,
                    aoeRadius: 3,
                    reqLvl: 60,
                    range: 6,
                    element: 'fisico',
                    statusEffect: 'bleed',
                    statusChance: 0.60,
                    statusDuration: 3,
                    desc: 'Cobre uma grande área com projéteis perfurantes.'
                });
                if (level >= 70) skills.push({
                    id: 's_cac_8',
                    name: 'Tiro Fatal',
                    manaCost: 280,
                    type: 'attack',
                    multiplier: 14.5,
                    reqLvl: 70,
                    range: 7,
                    element: 'veneno',
                    statusEffect: 'poison',
                    statusChance: 0.75,
                    statusDuration: 3,
                    desc: 'Disparo letal com ponta tóxica para abater alvos prioritários.'
                });
                if (level >= 80) skills.push({
                    id: 's_cac_9',
                    name: 'Campo Minado',
                    manaCost: 330,
                    type: 'terrain',
                    terrainType: 'mine',
                    multiplier: 15.0,
                    duration: 5,
                    reqLvl: 80,
                    range: 6,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.75,
                    statusDuration: 3,
                    desc: 'Terreno altamente explosivo que incendeia quem atravessa.'
                });
                if (level >= 90) skills.push({
                    id: 's_cac_10',
                    name: 'Tiro na Cabeça',
                    manaCost: 380,
                    type: 'attack',
                    multiplier: 20.0,
                    reqLvl: 90,
                    range: 8,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.50,
                    statusDuration: 1,
                    desc: 'Disparo magistral de precisão extrema com chance de atordoar.'
                });
                if (level >= 100) skills.push({
                    id: 's_cac_11',
                    name: 'Chuva de Meteoros Perfurantes',
                    manaCost: 460,
                    type: 'attack',
                    multiplier: 18.0,
                    isAoE: true,
                    aoeRadius: 4,
                    reqLvl: 100,
                    range: 7,
                    element: 'raio',
                    statusEffect: 'shock',
                    statusChance: 0.75,
                    statusDuration: 3,
                    desc: 'Bombardeio elétrico de flechas estelares em enorme área.'
                });
                break;

            case 'Guardião':
                // Tank, defesa, escudo, taunt e controle sagrado.
                if (level >= 1) skills.push({
                    id: 's_grd_0',
                    name: 'Escudo Firme',
                    manaCost: 12,
                    type: 'buff',
                    buffType: 'defense',
                    amount: 0.25,
                    duration: 2,
                    shieldAmount: 25,
                    reqLvl: 1,
                    range: 0,
                    element: 'fisico',
                    statusEffect: 'shield',
                    statusChance: 1.0,
                    statusDuration: 2,
                    desc: 'Assume postura defensiva (+25% defesa) e ergue um Escudo que absorve dano.'
                });
                if (level >= 5) skills.push({
                    id: 's_grd_1',
                    name: 'Golpe de Escudo',
                    manaCost: 25,
                    type: 'attack',
                    multiplier: 1.5,
                    reqLvl: 5,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.40,
                    statusDuration: 1,
                    desc: 'Impacto pesado com o escudo que pode atordoar o inimigo por 1 turno.'
                });
                if (level >= 10) skills.push({
                    id: 's_grd_2',
                    name: 'Postura Inabalável',
                    manaCost: 50,
                    type: 'buff_taunt',
                    buffType: 'defense',
                    amount: 0.20,
                    buffDuration: 3,
                    tauntDuration: 5,
                    shieldAmount: 40,
                    reqLvl: 10,
                    range: 3,
                    element: 'fisico',
                    statusEffect: 'shield',
                    statusChance: 1.0,
                    statusDuration: 3,
                    desc: 'Aumenta defesa em 20%, concede Escudo e atrai inimigos por 5 turnos. Inimigos rolam INT.'
                });
                if (level >= 20) skills.push({
                    id: 's_grd_3',
                    name: 'Investida Pesada',
                    manaCost: 80,
                    type: 'attack',
                    multiplier: 3.5,
                    reqLvl: 20,
                    range: 2,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.45,
                    statusDuration: 1,
                    desc: 'Avança e colide com o inimigo, podendo atordoar o alvo.'
                });
                if (level >= 30) skills.push({
                    id: 's_grd_4',
                    name: 'Terreno Sagrado',
                    manaCost: 120,
                    type: 'terrain',
                    terrainType: 'holy',
                    duration: 4,
                    reqLvl: 30,
                    range: 2,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 1.0,
                    statusDuration: 2,
                    desc: 'Consagra o solo para abençoar aliados e punir mortos-vivos e demônios.'
                });
                if (level >= 40) skills.push({
                    id: 's_grd_5',
                    name: 'Choque de Tremor (Área)',
                    manaCost: 150,
                    type: 'attack',
                    multiplier: 5.5,
                    isAoE: true,
                    aoeRadius: 2,
                    reqLvl: 40,
                    range: 1,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.35,
                    statusDuration: 1,
                    desc: 'Bate o escudo no solo gerando onda sísmica em área.'
                });
                if (level >= 50) skills.push({
                    id: 's_grd_6',
                    name: 'Provocação em Massa',
                    manaCost: 190,
                    type: 'taunt',
                    duration: 5,
                    reqLvl: 50,
                    range: 5,
                    element: 'sagrado',
                    statusEffect: 'shield',
                    statusChance: 0.50,
                    statusDuration: 2,
                    desc: 'Grito de desafio que atrai todos os inimigos próximos. Alvos rolam INT.'
                });
                if (level >= 60) skills.push({
                    id: 's_grd_7',
                    name: 'Baluarte Absoluto',
                    manaCost: 230,
                    type: 'buff',
                    buffType: 'defense',
                    amount: 0.40,
                    duration: 4,
                    shieldAmount: 120,
                    reqLvl: 60,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'shield',
                    statusChance: 1.0,
                    statusDuration: 4,
                    desc: 'Aumenta defesa em 40% por 4 turnos e ergue um Escudo reforçado.'
                });
                if (level >= 70) skills.push({
                    id: 's_grd_8',
                    name: 'Pancada Sísmica',
                    manaCost: 270,
                    type: 'attack',
                    multiplier: 12.0,
                    reqLvl: 70,
                    range: 2,
                    element: 'fisico',
                    statusEffect: 'stun',
                    statusChance: 0.60,
                    statusDuration: 1,
                    desc: 'Golpe devastador capaz de atordoar até grandes monstros.'
                });
                if (level >= 80) skills.push({
                    id: 's_grd_9',
                    name: 'Barreira Intransponível',
                    manaCost: 320,
                    type: 'terrain',
                    terrainType: 'wall',
                    duration: 3,
                    reqLvl: 80,
                    range: 3,
                    element: 'fisico',
                    statusEffect: null,
                    statusChance: 0,
                    statusDuration: 0,
                    desc: 'Ergue uma parede física sólida que bloqueia passagem no grid.'
                });
                if (level >= 90) skills.push({
                    id: 's_grd_10',
                    name: 'Golpe Punição',
                    manaCost: 370,
                    type: 'attack',
                    multiplier: 16.0,
                    reqLvl: 90,
                    range: 1,
                    element: 'sagrado',
                    statusEffect: 'stun',
                    statusChance: 0.70,
                    statusDuration: 1,
                    desc: 'Martelada sagrada que julga e atordoa o inimigo.'
                });
                if (level >= 100) skills.push({
                    id: 's_grd_11',
                    name: 'Avatar de Aço',
                    manaCost: 500,
                    type: 'buff',
                    buffType: 'defense',
                    amount: 0.80,
                    duration: 5,
                    shieldAmount: 300,
                    reqLvl: 100,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'shield',
                    statusChance: 1.0,
                    statusDuration: 5,
                    desc: 'Aumenta defesa em 80% por 5 turnos com Escudo impenetrável.'
                });
                break;

            case 'Mago':
                // Dano mágico elemental, combos, área e terrenos mágicos.
                if (level >= 1) skills.push({
                    id: 's_mag_0',
                    name: 'Centelha Arcana',
                    manaCost: 12,
                    type: 'attack',
                    multiplier: 1.6,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.40,
                    statusDuration: 2,
                    reqLvl: 1,
                    range: 5,
                    desc: 'Dispara uma centelha flamejante com chance de causar Queimadura.'
                });
                if (level >= 5) skills.push({
                    id: 's_mag_1',
                    name: 'Dardo de Fogo',
                    manaCost: 30,
                    type: 'attack',
                    multiplier: 2.5,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.60,
                    statusDuration: 3,
                    reqLvl: 5,
                    range: 5,
                    desc: 'Projétil ígneo que incendeia o alvo e ativa reações com Veneno ou Gelo.'
                });
                if (level >= 10) skills.push({
                    id: 's_mag_2',
                    name: 'Onda de Frio (Área)',
                    manaCost: 65,
                    type: 'attack',
                    multiplier: 3.5,
                    element: 'gelo',
                    statusEffect: 'frost',
                    statusChance: 0.70,
                    statusDuration: 2,
                    isAoE: true,
                    aoeRadius: 2,
                    reqLvl: 10,
                    range: 4,
                    desc: 'Explosão glacial que aplica Congelamento e reduz o movimento inimigo.'
                });
                if (level >= 20) skills.push({
                    id: 's_mag_3',
                    name: 'Parede de Fogo',
                    manaCost: 100,
                    type: 'terrain',
                    terrainType: 'fire',
                    multiplier: 4.0,
                    duration: 3,
                    reqLvl: 20,
                    range: 4,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.80,
                    statusDuration: 2,
                    desc: 'Cria uma barreira em chamas que aplica Queimadura aos inimigos na área.'
                });
                if (level >= 30) skills.push({
                    id: 's_mag_4',
                    name: 'Relâmpago',
                    manaCost: 140,
                    type: 'attack',
                    multiplier: 7.0,
                    element: 'raio',
                    statusEffect: 'shock',
                    statusChance: 0.70,
                    statusDuration: 2,
                    reqLvl: 30,
                    range: 6,
                    desc: 'Descarga elétrica fulminante; causa Sobrecarga Cristalina em alvos congelados.'
                });
                if (level >= 40) skills.push({
                    id: 's_mag_5',
                    name: 'Explosão Arcana (Área)',
                    manaCost: 190,
                    type: 'attack',
                    multiplier: 8.5,
                    isAoE: true,
                    aoeRadius: 3,
                    reqLvl: 40,
                    range: 5,
                    element: 'arcano',
                    statusEffect: 'shock',
                    statusChance: 0.45,
                    statusDuration: 2,
                    desc: 'Detonação pura de mana que atinge múltiplos inimigos à distância.'
                });
                if (level >= 50) skills.push({
                    id: 's_mag_6',
                    name: 'Prisão de Gelo',
                    manaCost: 240,
                    type: 'terrain',
                    terrainType: 'ice',
                    duration: 3,
                    reqLvl: 50,
                    range: 5,
                    element: 'gelo',
                    statusEffect: 'frost',
                    statusChance: 0.85,
                    statusDuration: 2,
                    desc: 'Congela o chão, bloqueando avanço e aplicando Congelamento.'
                });
                if (level >= 60) skills.push({
                    id: 's_mag_7',
                    name: 'Tempestade Elétrica (Área)',
                    manaCost: 290,
                    type: 'attack',
                    multiplier: 12.0,
                    element: 'raio',
                    statusEffect: 'shock',
                    statusChance: 0.75,
                    statusDuration: 3,
                    isAoE: true,
                    aoeRadius: 3,
                    reqLvl: 60,
                    range: 6,
                    desc: 'Convoca raios em grande área, eletrocutando os alvos atingidos.'
                });
                if (level >= 70) skills.push({
                    id: 's_mag_8',
                    name: 'Desintegração',
                    manaCost: 350,
                    type: 'attack',
                    multiplier: 18.0,
                    element: 'arcano',
                    statusEffect: 'shock',
                    statusChance: 0.65,
                    statusDuration: 3,
                    reqLvl: 70,
                    range: 5,
                    desc: 'Feixe arcano concentrado que dissolve a resistência do oponente.'
                });
                if (level >= 80) skills.push({
                    id: 's_mag_9',
                    name: 'Erupção Vulcânica',
                    manaCost: 400,
                    type: 'terrain',
                    terrainType: 'lava',
                    multiplier: 10.0,
                    duration: 4,
                    reqLvl: 80,
                    range: 5,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 1.0,
                    statusDuration: 3,
                    desc: 'Enche o chão de lava contínua que incendeia qualquer alvo na zona.'
                });
                if (level >= 90) skills.push({
                    id: 's_mag_10',
                    name: 'Buraco Negro',
                    manaCost: 460,
                    type: 'attack',
                    multiplier: 22.0,
                    element: 'trevas',
                    statusEffect: 'stun',
                    statusChance: 0.55,
                    statusDuration: 1,
                    reqLvl: 90,
                    range: 6,
                    desc: 'Singularidade gravitacional das trevas com chance de atordoar.'
                });
                if (level >= 100) skills.push({
                    id: 's_mag_11',
                    name: 'Armagedom (Área)',
                    manaCost: 600,
                    type: 'attack',
                    multiplier: 28.0,
                    isAoE: true,
                    aoeRadius: 5,
                    reqLvl: 100,
                    range: 7,
                    element: 'fogo',
                    statusEffect: 'burn',
                    statusChance: 0.95,
                    statusDuration: 3,
                    desc: 'Chuva apocalíptica de meteoros que incendeia todo o campo de batalha.'
                });
                break;

            case 'Clérigo':
                // Cura, bênçãos, escudo e luz sagrada purificadora.
                if (level >= 1) skills.push({
                    id: 's_cle_0',
                    name: 'Prece Menor',
                    manaCost: 12,
                    type: 'heal',
                    healAmount: 35 + stat('int') * 1.5,
                    reqLvl: 1,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 1.0,
                    statusDuration: 2,
                    desc: 'Restaura o HP de um aliado e concede Bênção (+20% de dano).'
                });
                if (level >= 5) skills.push({
                    id: 's_cle_1',
                    name: 'Cura Menor',
                    manaCost: 25,
                    type: 'heal',
                    healAmount: 100 + stat('int') * 1.5,
                    reqLvl: 5,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 0.50,
                    statusDuration: 2,
                    desc: 'Cura moderada em um aliado com chance de conceder Bênção.'
                });
                if (level >= 10) skills.push({
                    id: 's_cle_2',
                    name: 'Raio de Luz',
                    manaCost: 40,
                    type: 'attack',
                    multiplier: 2.5,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 0.35,
                    statusDuration: 2,
                    reqLvl: 10,
                    range: 5,
                    desc: 'Dispara luz sagrada; desencadeia Expurgo Radiante em mortos-vivos e infectados.'
                });
                if (level >= 20) skills.push({
                    id: 's_cle_3',
                    name: 'Cura em Grupo',
                    manaCost: 90,
                    type: 'heal',
                    isAoE: true,
                    healAmount: 200 + stat('int') * 2.0,
                    reqLvl: 20,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 0.60,
                    statusDuration: 2,
                    desc: 'Onda curativa que restaura todos os aliados vivos do grupo.'
                });
                if (level >= 30) skills.push({
                    id: 's_cle_4',
                    name: 'Santuário',
                    manaCost: 130,
                    type: 'terrain',
                    terrainType: 'healing',
                    healAmount: 150,
                    duration: 4,
                    reqLvl: 30,
                    range: 3,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 0.80,
                    statusDuration: 2,
                    desc: 'Cria área consagrada que cura aliados continuamente.'
                });
                if (level >= 40) skills.push({
                    id: 's_cle_5',
                    name: 'Purgação Sagrada (Área)',
                    manaCost: 170,
                    type: 'attack',
                    multiplier: 6.0,
                    element: 'sagrado',
                    statusEffect: 'burn',
                    statusChance: 0.45,
                    statusDuration: 2,
                    isAoE: true,
                    aoeRadius: 2,
                    reqLvl: 40,
                    range: 4,
                    desc: 'Explosão de luz divina que purifica múltiplos inimigos.'
                });
                if (level >= 50) skills.push({
                    id: 's_cle_6',
                    name: 'Luz Restauradora',
                    manaCost: 220,
                    type: 'heal',
                    healAmount: 600 + stat('int') * 4.0,
                    reqLvl: 50,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'shield',
                    shieldAmount: 80,
                    statusChance: 1.0,
                    statusDuration: 3,
                    desc: 'Cura poderosa que também envolve o aliado em Escudo sagrado.'
                });
                if (level >= 60) skills.push({
                    id: 's_cle_7',
                    name: 'Aura de Proteção',
                    manaCost: 260,
                    type: 'buff',
                    buffType: 'defense',
                    amount: 0.30,
                    duration: 4,
                    shieldAmount: 100,
                    reqLvl: 60,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'shield',
                    statusChance: 1.0,
                    statusDuration: 4,
                    desc: 'Aumenta defesa em 30% por 4 turnos e concede Escudo protetor.'
                });
                if (level >= 70) skills.push({
                    id: 's_cle_8',
                    name: 'Julgamento',
                    manaCost: 310,
                    type: 'attack',
                    multiplier: 14.0,
                    element: 'sagrado',
                    statusEffect: 'stun',
                    statusChance: 0.45,
                    statusDuration: 1,
                    reqLvl: 70,
                    range: 5,
                    desc: 'Sentença divina de alto dano sagrado com chance de atordoar.'
                });
                if (level >= 80) skills.push({
                    id: 's_cle_9',
                    name: 'Solo Consagrado',
                    manaCost: 380,
                    type: 'terrain',
                    terrainType: 'blessing',
                    buffType: 'damage',
                    duration: 4,
                    reqLvl: 80,
                    range: 4,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 1.0,
                    statusDuration: 3,
                    desc: 'Área que fortalece e abençoa aliados enquanto fere mortos-vivos.'
                });
                if (level >= 90) skills.push({
                    id: 's_cle_10',
                    name: 'Ressurgência Divina',
                    manaCost: 450,
                    type: 'heal',
                    isAoE: true,
                    healAmount: 1500 + stat('int') * 8.0,
                    reqLvl: 90,
                    range: 0,
                    element: 'sagrado',
                    statusEffect: 'blessing',
                    statusChance: 1.0,
                    statusDuration: 3,
                    desc: 'Milagre em área que restaura massivamente o grupo e aplica Bênção.'
                });
                if (level >= 100) skills.push({
                    id: 's_cle_11',
                    name: 'Fúria do Criador (Área)',
                    manaCost: 550,
                    type: 'attack',
                    multiplier: 20.0,
                    element: 'sagrado',
                    statusEffect: 'stun',
                    statusChance: 0.50,
                    statusDuration: 1,
                    isAoE: true,
                    aoeRadius: 4,
                    reqLvl: 100,
                    range: 6,
                    desc: 'Tempestade celestial que consome todos os inimigos na luz primordial.'
                });
                break;
        }

        return skills;
    }
};

if (typeof window !== 'undefined') {
    window.SkillDatabase = SkillDatabase;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SkillDatabase;
}
