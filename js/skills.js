const SkillDatabase = {
    getSkillsForClass: function(playerClass, level, getTotalAttr) {
        let skills = [];

        switch (playerClass) {
            case 'Guerreiro':
                // Corpo a corpo puro, foco em dano físico direto, investidas. Alcance baixo.
                if (level >= 5) skills.push({ id: 's_gue_1', name: "Golpe Poderoso", manaCost: 20, type: 'attack', multiplier: 2.0, reqLvl: 5, range: 1 });
                if (level >= 10) skills.push({ id: 's_gue_2', name: "Corte Furioso", manaCost: 40, type: 'attack', multiplier: 3.5, reqLvl: 10, range: 1 });
                if (level >= 20) skills.push({ id: 's_gue_3', name: "Investida Bruta", manaCost: 70, type: 'attack', multiplier: 5.0, reqLvl: 20, range: 2 });
                if (level >= 30) skills.push({ id: 's_gue_4', name: "Giro de Batalha (Área)", manaCost: 100, type: 'attack', multiplier: 4.5, isAoE: true, aoeRadius: 1, reqLvl: 30, range: 1 });
                if (level >= 40) skills.push({ id: 's_gue_5', name: "Fúria do Berserker", manaCost: 140, type: 'attack', multiplier: 8.0, reqLvl: 40, range: 1 });
                if (level >= 50) skills.push({ id: 's_gue_6', name: "Esmagar Ossos", manaCost: 180, type: 'attack', multiplier: 11.0, reqLvl: 50, range: 1 });
                if (level >= 60) skills.push({ id: 's_gue_7', name: "Onda de Choque (Área)", manaCost: 220, type: 'attack', multiplier: 9.0, isAoE: true, aoeRadius: 2, reqLvl: 60, range: 2 });
                if (level >= 70) skills.push({ id: 's_gue_8', name: "Golpe Colossal", manaCost: 260, type: 'attack', multiplier: 15.0, reqLvl: 70, range: 1 });
                if (level >= 80) skills.push({ id: 's_gue_9', name: "Devastar", manaCost: 310, type: 'attack', multiplier: 19.0, reqLvl: 80, range: 1 });
                if (level >= 90) skills.push({ id: 's_gue_10', name: "Terremoto (Área)", manaCost: 360, type: 'attack', multiplier: 14.0, isAoE: true, aoeRadius: 3, reqLvl: 90, range: 2 });
                if (level >= 100) skills.push({ id: 's_gue_11', name: "Ira do Deus da Guerra", manaCost: 450, type: 'attack', multiplier: 25.0, reqLvl: 100, range: 1 });
                break;

            case 'Caçador':
                // Ataque à distância, dano perfurante e controle. Alcance alto.
                if (level >= 5) skills.push({ id: 's_cac_1', name: "Tiro Certeiro", manaCost: 20, type: 'attack', multiplier: 2.0, reqLvl: 5, range: 6 });
                if (level >= 10) skills.push({ id: 's_cac_2', name: "Tiro Penetrante", manaCost: 45, type: 'attack', multiplier: 3.2, reqLvl: 10, range: 7 });
                if (level >= 20) skills.push({ id: 's_cac_3', name: "Armadilha de Espinhos", manaCost: 80, type: 'terrain', terrainType: 'spikes', multiplier: 2.0, duration: 3, reqLvl: 20, range: 5, desc: "Cria terreno que causa dano." });
                if (level >= 30) skills.push({ id: 's_cac_4', name: "Saraivada (Área)", manaCost: 110, type: 'attack', multiplier: 4.0, isAoE: true, aoeRadius: 2, reqLvl: 30, range: 6 });
                if (level >= 40) skills.push({ id: 's_cac_5', name: "Tiro Envenenado", manaCost: 150, type: 'attack', multiplier: 7.5, element: 'veneno', reqLvl: 40, range: 7 });
                if (level >= 50) skills.push({ id: 's_cac_6', name: "Olho da Águia", manaCost: 190, type: 'attack', multiplier: 10.5, reqLvl: 50, range: 8 });
                if (level >= 60) skills.push({ id: 's_cac_7', name: "Chuva de Flechas (Área)", manaCost: 240, type: 'attack', multiplier: 8.5, isAoE: true, aoeRadius: 3, reqLvl: 60, range: 6 });
                if (level >= 70) skills.push({ id: 's_cac_8', name: "Tiro Fatal", manaCost: 280, type: 'attack', multiplier: 14.5, reqLvl: 70, range: 7 });
                if (level >= 80) skills.push({ id: 's_cac_9', name: "Campo Minado", manaCost: 330, type: 'terrain', terrainType: 'mine', multiplier: 15.0, duration: 5, reqLvl: 80, range: 6, desc: "Terreno altamente explosivo." });
                if (level >= 90) skills.push({ id: 's_cac_10', name: "Tiro na Cabeça", manaCost: 380, type: 'attack', multiplier: 20.0, reqLvl: 90, range: 8 });
                if (level >= 100) skills.push({ id: 's_cac_11', name: "Chuva de Meteoros Perfurantes", manaCost: 460, type: 'attack', multiplier: 18.0, isAoE: true, aoeRadius: 4, reqLvl: 100, range: 7 });
                break;

            case 'Guardião':
                // Tank, defesa, taunt, controle. Alcance baixo a médio.
                if (level >= 5) skills.push({ id: 's_grd_1', name: "Golpe de Escudo", manaCost: 25, type: 'attack', multiplier: 1.5, reqLvl: 5, range: 1 });
                if (level >= 10) skills.push({ id: 's_grd_2', name: "Postura Inabalável", manaCost: 50, type: 'buff_taunt', buffType: 'defense', amount: 0.20, buffDuration: 3, tauntDuration: 5, reqLvl: 10, range: 3, desc: "Aumenta defesa em 20% por 3 turnos e atrai inimigos por 5 turnos. Inimigos rolam INT." });
                if (level >= 20) skills.push({ id: 's_grd_3', name: "Investida Pesada", manaCost: 80, type: 'attack', multiplier: 3.5, reqLvl: 20, range: 2, desc: "Avança e atinge o inimigo." });
                if (level >= 30) skills.push({ id: 's_grd_4', name: "Terreno Sagrado", manaCost: 120, type: 'terrain', terrainType: 'holy', duration: 4, reqLvl: 30, range: 2, desc: "Cria área que desacelera ou fere inimigos." });
                if (level >= 40) skills.push({ id: 's_grd_5', name: "Choque de Tremor (Área)", manaCost: 150, type: 'attack', multiplier: 5.5, isAoE: true, aoeRadius: 2, reqLvl: 40, range: 1 });
                if (level >= 50) skills.push({ id: 's_grd_6', name: "Provocação em Massa", manaCost: 190, type: 'taunt', duration: 5, reqLvl: 50, range: 5, desc: "Atrai todos próximos. Alvos rolam INT." });
                if (level >= 60) skills.push({ id: 's_grd_7', name: "Baluarte Absoluto", manaCost: 230, type: 'buff', buffType: 'defense', amount: 0.40, duration: 4, reqLvl: 60, range: 0, desc: "Aumenta defesa em 40% por 4 turnos." });
                if (level >= 70) skills.push({ id: 's_grd_8', name: "Pancada Sísmica", manaCost: 270, type: 'attack', multiplier: 12.0, reqLvl: 70, range: 2 });
                if (level >= 80) skills.push({ id: 's_grd_9', name: "Barreira Intransponível", manaCost: 320, type: 'terrain', terrainType: 'wall', duration: 3, reqLvl: 80, range: 3, desc: "Cria parede física que bloqueia passagem." });
                if (level >= 90) skills.push({ id: 's_grd_10', name: "Golpe Punição", manaCost: 370, type: 'attack', multiplier: 16.0, reqLvl: 90, range: 1 });
                if (level >= 100) skills.push({ id: 's_grd_11', name: "Avatar de Aço", manaCost: 500, type: 'buff', buffType: 'defense', amount: 0.80, duration: 5, reqLvl: 100, range: 0, desc: "Aumenta defesa em 80% por 5 turnos." });
                break;

            case 'Mago':
                // Dano mágico, área, terrenos mágicos. Alcance alto.
                if (level >= 5) skills.push({ id: 's_mag_1', name: "Dardo de Fogo", manaCost: 30, type: 'attack', multiplier: 2.5, element: 'fogo', reqLvl: 5, range: 5 });
                if (level >= 10) skills.push({ id: 's_mag_2', name: "Onda de Frio (Área)", manaCost: 65, type: 'attack', multiplier: 3.5, element: 'gelo', isAoE: true, aoeRadius: 2, reqLvl: 10, range: 4 });
                if (level >= 20) skills.push({ id: 's_mag_3', name: "Parede de Fogo", manaCost: 100, type: 'terrain', terrainType: 'fire', multiplier: 4.0, duration: 3, reqLvl: 20, range: 4, desc: "Cria uma parede em chamas." });
                if (level >= 30) skills.push({ id: 's_mag_4', name: "Relâmpago", manaCost: 140, type: 'attack', multiplier: 7.0, element: 'raio', reqLvl: 30, range: 6 });
                if (level >= 40) skills.push({ id: 's_mag_5', name: "Explosão Arcana (Área)", manaCost: 190, type: 'attack', multiplier: 8.5, isAoE: true, aoeRadius: 3, reqLvl: 40, range: 5 });
                if (level >= 50) skills.push({ id: 's_mag_6', name: "Prisão de Gelo", manaCost: 240, type: 'terrain', terrainType: 'ice', duration: 3, reqLvl: 50, range: 5, desc: "Congela o chão, bloqueando avanço." });
                if (level >= 60) skills.push({ id: 's_mag_7', name: "Tempestade Elétrica (Área)", manaCost: 290, type: 'attack', multiplier: 12.0, element: 'raio', isAoE: true, aoeRadius: 3, reqLvl: 60, range: 6 });
                if (level >= 70) skills.push({ id: 's_mag_8', name: "Desintegração", manaCost: 350, type: 'attack', multiplier: 18.0, element: 'arcano', reqLvl: 70, range: 5 });
                if (level >= 80) skills.push({ id: 's_mag_9', name: "Erupção Vulcânica", manaCost: 400, type: 'terrain', terrainType: 'lava', multiplier: 10.0, duration: 4, reqLvl: 80, range: 5, desc: "Enche o chão de lava contínua." });
                if (level >= 90) skills.push({ id: 's_mag_10', name: "Buraco Negro", manaCost: 460, type: 'attack', multiplier: 22.0, element: 'trevas', reqLvl: 90, range: 6 });
                if (level >= 100) skills.push({ id: 's_mag_11', name: "Armagedom (Área)", manaCost: 600, type: 'attack', multiplier: 28.0, isAoE: true, aoeRadius: 5, reqLvl: 100, range: 7 });
                break;

            case 'Clérigo':
                // Cura, buff, luz sagrada.
                if (level >= 5) skills.push({ id: 's_cle_1', name: "Cura Menor", manaCost: 25, type: 'heal', healAmount: 100 + getTotalAttr('int') * 1.5, reqLvl: 5, range: 0 });
                if (level >= 10) skills.push({ id: 's_cle_2', name: "Raio de Luz", manaCost: 40, type: 'attack', multiplier: 2.5, element: 'sagrado', reqLvl: 10, range: 5 });
                if (level >= 20) skills.push({ id: 's_cle_3', name: "Cura em Grupo", manaCost: 90, type: 'heal', isAoE: true, healAmount: 200 + getTotalAttr('int') * 2.0, reqLvl: 20, range: 0 });
                if (level >= 30) skills.push({ id: 's_cle_4', name: "Santuário", manaCost: 130, type: 'terrain', terrainType: 'healing', healAmount: 150, duration: 4, reqLvl: 30, range: 3, desc: "Cria área que cura aliados." });
                if (level >= 40) skills.push({ id: 's_cle_5', name: "Purgação Sagrada (Área)", manaCost: 170, type: 'attack', multiplier: 6.0, element: 'sagrado', isAoE: true, aoeRadius: 2, reqLvl: 40, range: 4 });
                if (level >= 50) skills.push({ id: 's_cle_6', name: "Luz Restauradora", manaCost: 220, type: 'heal', healAmount: 600 + getTotalAttr('int') * 4.0, reqLvl: 50, range: 0 });
                if (level >= 60) skills.push({ id: 's_cle_7', name: "Aura de Proteção", manaCost: 260, type: 'buff', buffType: 'defense', amount: 0.30, duration: 4, reqLvl: 60, range: 0, desc: "Aumenta defesa em 30% por 4 turnos." });
                if (level >= 70) skills.push({ id: 's_cle_8', name: "Julgamento", manaCost: 310, type: 'attack', multiplier: 14.0, element: 'sagrado', reqLvl: 70, range: 5 });
                if (level >= 80) skills.push({ id: 's_cle_9', name: "Solo Consagrado", manaCost: 380, type: 'terrain', terrainType: 'blessing', buffType: 'damage', duration: 4, reqLvl: 80, range: 4, desc: "Área que aumenta dano dos aliados." });
                if (level >= 90) skills.push({ id: 's_cle_10', name: "Ressurgência Divina", manaCost: 450, type: 'heal', isAoE: true, healAmount: 1500 + getTotalAttr('int') * 8.0, reqLvl: 90, range: 0 });
                if (level >= 100) skills.push({ id: 's_cle_11', name: "Fúria do Criador (Área)", manaCost: 550, type: 'attack', multiplier: 20.0, element: 'sagrado', isAoE: true, aoeRadius: 4, reqLvl: 100, range: 6 });
                break;
        }

        return skills;
    }
};

window.SkillDatabase = SkillDatabase;
