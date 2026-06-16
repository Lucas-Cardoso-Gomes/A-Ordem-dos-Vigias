const SkillDatabase = {
    getSkillsForClass: function(playerClass, level, getTotalAttr) {
        let skills = [];

        switch (playerClass) {
            case 'Caçador':
                skills.push({ id: 's_cac_1', name: "Tiro Preciso", manaCost: 35, type: 'attack', multiplier: 2.5, reqLvl: 5, range: 6 });
                if (level >= 10) skills.push({ id: 's_cac_2', name: "Saraivada (Área)", manaCost: 60, type: 'attack', multiplier: 2.4, isAoE: true, reqLvl: 10, range: 6, aoeRadius: 2 });
                if (level >= 20) skills.push({ id: 's_cac_3', name: "Flecha Perfurante", manaCost: 110, type: 'attack', multiplier: 7.0, element: 'estaca', reqLvl: 20, range: 7 });
                if (level >= 30) skills.push({ id: 's_cac_4', name: "Bala de Prata", manaCost: 160, type: 'attack', multiplier: 10.0, element: 'prata', reqLvl: 30, range: 6 });
                if (level >= 40) skills.push({ id: 's_cac_5', name: "Chuva de Flechas (Área)", manaCost: 210, type: 'attack', multiplier: 7.8, isAoE: true, reqLvl: 40, range: 6, aoeRadius: 3 });
                if (level >= 50) skills.push({ id: 's_cac_6', name: "Execução", manaCost: 260, type: 'attack', multiplier: 16.0, element: 'sagrado', reqLvl: 50, range: 7 });
                if (level >= 60) skills.push({ id: 's_cac_7', name: "Marca da Caçada", manaCost: 310, type: 'attack', multiplier: 19.0, element: 'prata', reqLvl: 60, range: 8 });
                if (level >= 70) skills.push({ id: 's_cac_8', name: "Tempestade de Projéteis (Área)", manaCost: 360, type: 'attack', multiplier: 13.2, isAoE: true, reqLvl: 70, range: 7, aoeRadius: 3 });
                if (level >= 80) skills.push({ id: 's_cac_9', name: "Caçada Implacável", manaCost: 410, type: 'attack', multiplier: 25.0, element: 'prata', reqLvl: 80, range: 6 });
                if (level >= 90) skills.push({ id: 's_cac_10', name: "Extermínio Sobrenatural", manaCost: 460, type: 'attack', multiplier: 28.0, element: 'sagrado', reqLvl: 90, range: 8 });
                if (level >= 100) skills.push({ id: 's_cac_11', name: "Última Caçada", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'sagrado', reqLvl: 100, range: 8, aoeRadius: 4 });
                break;

            case 'Exorcista':
                skills.push({ id: 's_exo_1', name: "Cura Sagrada", manaCost: 30, type: 'heal', healAmount: 175 + getTotalAttr('int') * 2, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_exo_2', name: "Punição Divina", manaCost: 60, type: 'attack', multiplier: 4.0, element: 'luz sagrada', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_exo_3', name: "Aura Restauradora", manaCost: 90, type: 'heal', healAmount: 550 + getTotalAttr('int') * 4, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_exo_4', name: "Expulsão Demoníaca", manaCost: 160, type: 'attack', multiplier: 10.0, element: 'sagrado', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_exo_5', name: "Milagre Divino", manaCost: 170, type: 'heal', healAmount: 1050 + getTotalAttr('int') * 6, reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_exo_6', name: "Julgamento Celestial (Área)", manaCost: 260, type: 'attack', multiplier: 9.6, isAoE: true, element: 'luz sagrada', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_exo_7', name: "Lança do Arcanjo", manaCost: 310, type: 'attack', multiplier: 19.0, element: 'sagrado', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_exo_8', name: "Graça Suprema", manaCost: 290, type: 'heal', healAmount: 1800 + getTotalAttr('int') * 9, reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_exo_9', name: "Purificação Total (Área)", manaCost: 410, type: 'attack', multiplier: 15.0, isAoE: true, element: 'luz sagrada', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_exo_10', name: "Intervenção Divina", manaCost: 370, type: 'heal', healAmount: 2300 + getTotalAttr('int') * 11, reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_exo_11', name: "Apoteose Celestial", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'sagrado', reqLvl: 100 });
                break;

            case 'Alquimista':
                skills.push({ id: 's_alq_1', name: "Bomba Ácida", manaCost: 35, type: 'attack', multiplier: 2.5, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_alq_2', name: "Fogo Alquímico (Área)", manaCost: 60, type: 'attack', multiplier: 2.4, isAoE: true, element: 'fogo', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_alq_3', name: "Transmutação Explosiva", manaCost: 110, type: 'attack', multiplier: 7.0, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_alq_4', name: "Névoa Corrosiva (Área)", manaCost: 160, type: 'attack', multiplier: 6.0, isAoE: true, element: 'ácido', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_alq_5', name: "Estilhaços Químicos", manaCost: 210, type: 'attack', multiplier: 13.0, element: 'explosão', reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_alq_6', name: "Reação em Cadeia (Área)", manaCost: 260, type: 'attack', multiplier: 9.6, isAoE: true, element: 'alquimia', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_alq_7', name: "Granada de Napalm", manaCost: 310, type: 'attack', multiplier: 19.0, element: 'fogo', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_alq_8', name: "Praga Química (Área)", manaCost: 360, type: 'attack', multiplier: 13.2, isAoE: true, element: 'veneno', reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_alq_9', name: "Catalisador Supremo", manaCost: 410, type: 'attack', multiplier: 25.0, element: 'alquimia', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_alq_10', name: "Fissão Alquímica", manaCost: 460, type: 'attack', multiplier: 16.8, isAoE: true, element: 'explosão', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_alq_11', name: "Bomba do Juízo Final", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'explosão', reqLvl: 100 });
                break;

            case 'Bruxo':
                skills.push({ id: 's_bru_1', name: "Dreno de Vida", manaCost: 35, type: 'drain', multiplier: 2.5, reqLvl: 5, range: 4 });
                if (level >= 10) skills.push({ id: 's_bru_2', name: "Maldição Sombria", manaCost: 60, type: 'attack', multiplier: 4.0, element: 'trevas', reqLvl: 10, range: 5 });
                if (level >= 20) skills.push({ id: 's_bru_3', name: "Festim de Almas", manaCost: 110, type: 'drain', multiplier: 7.0, reqLvl: 20, range: 4 });
                if (level >= 30) skills.push({ id: 's_bru_4', name: "Praga Eterna (Área)", manaCost: 160, type: 'attack', multiplier: 6.0, isAoE: true, element: 'trevas', reqLvl: 30, range: 5, aoeRadius: 2 });
                if (level >= 40) skills.push({ id: 's_bru_5', name: "Invocar Espectros", manaCost: 210, type: 'attack', multiplier: 13.0, element: 'espiritual', reqLvl: 40, range: 4 });
                if (level >= 50) skills.push({ id: 's_bru_6', name: "Apocalipse das Almas (Área)", manaCost: 260, type: 'drain', multiplier: 9.6, isAoE: true, element: 'trevas', reqLvl: 50, range: 4, aoeRadius: 3 });
                if (level >= 60) skills.push({ id: 's_bru_7', name: "Pacto Profano", manaCost: 310, type: 'drain', multiplier: 19.0, element: 'trevas', reqLvl: 60, range: 5 });
                if (level >= 70) skills.push({ id: 's_bru_8', name: "Legião das Sombras (Área)", manaCost: 360, type: 'attack', multiplier: 13.2, isAoE: true, element: 'espiritual', reqLvl: 70, range: 5, aoeRadius: 3 });
                if (level >= 80) skills.push({ id: 's_bru_9', name: "Arauto do Abismo", manaCost: 410, type: 'drain', multiplier: 25.0, element: 'trevas', reqLvl: 80, range: 5 });
                if (level >= 90) skills.push({ id: 's_bru_10', name: "Ritual do Vazio", manaCost: 460, type: 'drain', multiplier: 28.0, element: 'trevas', reqLvl: 90, range: 6 });
                if (level >= 100) skills.push({ id: 's_bru_11', name: "Devorador de Mundos", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'trevas', reqLvl: 100, range: 6, aoeRadius: 4 });
                break;

            case 'Mago':
                skills.push({ id: 's_mag_1', name: "Lança de Gelo", manaCost: 35, type: 'attack', multiplier: 2.5, element: 'gelo', reqLvl: 5, range: 6 });
                if (level >= 10) skills.push({ id: 's_mag_2', name: "Bola de Fogo (Área)", manaCost: 60, type: 'attack', multiplier: 2.4, isAoE: true, element: 'fogo', reqLvl: 10, range: 5, aoeRadius: 2 });
                if (level >= 20) skills.push({ id: 's_mag_3', name: "Tempestade Arcana (Área)", manaCost: 110, type: 'attack', multiplier: 4.2, isAoE: true, element: 'arcano', reqLvl: 20, range: 6, aoeRadius: 3 });
                if (level >= 30) skills.push({ id: 's_mag_4', name: "Raio Concentrado", manaCost: 160, type: 'attack', multiplier: 10.0, element: 'raio', reqLvl: 30, range: 7 });
                if (level >= 40) skills.push({ id: 's_mag_5', name: "Meteoro", manaCost: 210, type: 'attack', multiplier: 13.0, element: 'fogo', reqLvl: 40, range: 5, aoeRadius: 2 });
                if (level >= 50) skills.push({ id: 's_mag_6', name: "Cataclismo Arcano (Área)", manaCost: 260, type: 'attack', multiplier: 9.6, isAoE: true, element: 'arcano', reqLvl: 50, range: 6, aoeRadius: 3 });
                if (level >= 60) skills.push({ id: 's_mag_7', name: "Tempestade Elemental (Área)", manaCost: 310, type: 'attack', multiplier: 11.4, isAoE: true, element: 'elemental', reqLvl: 60, range: 6, aoeRadius: 3 });
                if (level >= 70) skills.push({ id: 's_mag_8', name: "Nova Arcana", manaCost: 360, type: 'attack', multiplier: 13.2, isAoE: true, element: 'arcano', reqLvl: 70, range: 7, aoeRadius: 3 });
                if (level >= 80) skills.push({ id: 's_mag_9', name: "Cometa Celeste", manaCost: 410, type: 'attack', multiplier: 25.0, element: 'fogo', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_mag_10', name: "Colapso Arcano", manaCost: 460, type: 'attack', multiplier: 16.8, isAoE: true, element: 'arcano', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_mag_11', name: "Big Bang Arcano", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'arcano', reqLvl: 100 });
                break;

            case 'Guerreiro':
                skills.push({ id: 's_war_1', name: "Golpe Forte", manaCost: 35, type: 'attack', multiplier: 2.5, reqLvl: 5, range: 1 });
                if (level >= 10) skills.push({ id: 's_war_2', name: "Corte Giratório (Área)", manaCost: 60, type: 'attack', multiplier: 2.4, isAoE: true, reqLvl: 10, range: 1, aoeRadius: 2 });
                if (level >= 20) skills.push({ id: 's_war_3', name: "Investida Brutal", manaCost: 110, type: 'attack', multiplier: 7.0, reqLvl: 20, range: 2 });
                if (level >= 30) skills.push({ id: 's_war_4', name: "Esmagar Crânios", manaCost: 160, type: 'attack', multiplier: 10.0, reqLvl: 30, range: 1 });
                if (level >= 40) skills.push({ id: 's_war_5', name: "Terremoto (Área)", manaCost: 210, type: 'attack', multiplier: 7.8, isAoE: true, reqLvl: 40, range: 1, aoeRadius: 3 });
                if (level >= 50) skills.push({ id: 's_war_6', name: "Golpe Colossal", manaCost: 260, type: 'attack', multiplier: 16.0, reqLvl: 50, range: 1 });
                if (level >= 60) skills.push({ id: 's_war_7', name: "Rompedor de Linhas", manaCost: 310, type: 'attack', multiplier: 11.4, isAoE: true, reqLvl: 60, range: 2, aoeRadius: 2 });
                if (level >= 70) skills.push({ id: 's_war_8', name: "Fúria Titânica", manaCost: 360, type: 'attack', multiplier: 22.0, reqLvl: 70, range: 1 });
                if (level >= 80) skills.push({ id: 's_war_9', name: "Executor dos Gigantes", manaCost: 410, type: 'attack', multiplier: 25.0, reqLvl: 80, range: 1 });
                if (level >= 90) skills.push({ id: 's_war_10', name: "Quebra-Montanhas", manaCost: 460, type: 'attack', multiplier: 16.8, isAoE: true, reqLvl: 90, range: 1, aoeRadius: 4 });
                if (level >= 100) skills.push({ id: 's_war_11', name: "Fim da Guerra", manaCost: 510, type: 'attack', multiplier: 31.0, reqLvl: 100, range: 1 });
                break;

            case 'Assassino':
                skills.push({ id: 's_ass_1', name: "Ataque Furtivo", manaCost: 35, type: 'attack', multiplier: 2.5, reqLvl: 5, range: 1 });
                if (level >= 10) skills.push({ id: 's_ass_2', name: "Lâmina Envenenada", manaCost: 60, type: 'attack', multiplier: 4.0, element: 'veneno', reqLvl: 10, range: 1 });
                if (level >= 20) skills.push({ id: 's_ass_3', name: "Corte nas Sombras", manaCost: 110, type: 'attack', multiplier: 7.0, element: 'trevas', reqLvl: 20, range: 2 });
                if (level >= 30) skills.push({ id: 's_ass_4', name: "Sangramento Letal", manaCost: 160, type: 'attack', multiplier: 10.0, element: 'sangramento', reqLvl: 30, range: 1 });
                if (level >= 40) skills.push({ id: 's_ass_5', name: "Dança das Adagas", manaCost: 210, type: 'attack', multiplier: 13.0, reqLvl: 40, range: 1 });
                if (level >= 50) skills.push({ id: 's_ass_6', name: "Assassinato", manaCost: 260, type: 'attack', multiplier: 16.0, reqLvl: 50, range: 1 });
                if (level >= 60) skills.push({ id: 's_ass_7', name: "Perfuração Mortal", manaCost: 310, type: 'attack', multiplier: 19.0, reqLvl: 60, range: 1 });
                if (level >= 70) skills.push({ id: 's_ass_8', name: "Execução Silenciosa", manaCost: 360, type: 'attack', multiplier: 22.0, reqLvl: 70, range: 1 });
                if (level >= 80) skills.push({ id: 's_ass_9', name: "Mestre das Sombras", manaCost: 410, type: 'attack', multiplier: 25.0, element: 'trevas', reqLvl: 80, range: 2 });
                if (level >= 90) skills.push({ id: 's_ass_10', name: "Golpe Fantasma", manaCost: 460, type: 'attack', multiplier: 28.0, reqLvl: 90, range: 2 });
                if (level >= 100) skills.push({ id: 's_ass_11', name: "Morte Instantânea", manaCost: 510, type: 'attack', multiplier: 31.0, reqLvl: 100, range: 1 });
                break;

            case 'Paladino':
                skills.push({ id: 's_pal_1', name: "Golpe Divino", manaCost: 35, type: 'attack', multiplier: 2.5, element: 'sagrado', reqLvl: 5, range: 1 });
                if (level >= 10) skills.push({ id: 's_pal_2', name: "Consagração (Área)", manaCost: 60, type: 'attack', multiplier: 2.4, isAoE: true, element: 'luz sagrada', reqLvl: 10, range: 1, aoeRadius: 2 });
                if (level >= 20) skills.push({ id: 's_pal_3', name: "Cura pelas Mãos", manaCost: 90, type: 'heal', healAmount: 550 + getTotalAttr('int') * 4, reqLvl: 20, range: 1 });
                if (level >= 30) skills.push({ id: 's_pal_4', name: "Escudo Celestial", manaCost: 160, type: 'attack', multiplier: 10.0, element: 'luz sagrada', reqLvl: 30, range: 2 });
                if (level >= 40) skills.push({ id: 's_pal_5', name: "Ira do Guardião (Área)", manaCost: 210, type: 'attack', multiplier: 7.8, isAoE: true, element: 'sagrado', reqLvl: 40, range: 1, aoeRadius: 3 });
                if (level >= 50) skills.push({ id: 's_pal_6', name: "Veredito Final", manaCost: 260, type: 'attack', multiplier: 16.0, element: 'sagrado', reqLvl: 50, range: 1 });
                if (level >= 60) skills.push({ id: 's_pal_7', name: "Luz Restauradora", manaCost: 250, type: 'heal', healAmount: 1550 + getTotalAttr('int') * 8, reqLvl: 60, range: 2 });
                if (level >= 70) skills.push({ id: 's_pal_8', name: "Martelo Sagrado", manaCost: 360, type: 'attack', multiplier: 22.0, element: 'sagrado', reqLvl: 70, range: 2 });
                if (level >= 80) skills.push({ id: 's_pal_9', name: "Purificação Divina (Área)", manaCost: 410, type: 'attack', multiplier: 15.0, isAoE: true, element: 'luz sagrada', reqLvl: 80, range: 1, aoeRadius: 3 });
                if (level >= 90) skills.push({ id: 's_pal_10', name: "Ascensão do Campeão", manaCost: 370, type: 'heal', healAmount: 2300 + getTotalAttr('int') * 11, reqLvl: 90, range: 1 });
                if (level >= 100) skills.push({ id: 's_pal_11', name: "Julgamento Supremo", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'sagrado', reqLvl: 100, range: 1, aoeRadius: 4 });
                break;

            case 'Necromante':
                skills.push({ id: 's_nec_1', name: "Toque Macabro", manaCost: 35, type: 'drain', multiplier: 2.5, element: 'trevas', reqLvl: 5, range: 4 });
                if (level >= 10) skills.push({ id: 's_nec_2', name: "Nuvem de Peste (Área)", manaCost: 60, type: 'attack', multiplier: 2.4, isAoE: true, element: 'veneno', reqLvl: 10, range: 5, aoeRadius: 2 });
                if (level >= 20) skills.push({ id: 's_nec_3', name: "Lança de Ossos", manaCost: 110, type: 'attack', multiplier: 7.0, reqLvl: 20, range: 6 });
                if (level >= 30) skills.push({ id: 's_nec_4', name: "Transfusão Sombria", manaCost: 160, type: 'drain', multiplier: 10.0, element: 'trevas', reqLvl: 30, range: 4 });
                if (level >= 40) skills.push({ id: 's_nec_5', name: "Explosão de Cadáveres (Área)", manaCost: 210, type: 'attack', multiplier: 7.8, isAoE: true, element: 'explosão', reqLvl: 40, range: 5, aoeRadius: 2 });
                if (level >= 50) skills.push({ id: 's_nec_6', name: "Exército dos Mortos", manaCost: 260, type: 'attack', multiplier: 16.0, element: 'espiritual', reqLvl: 50, range: 4 });
                if (level >= 60) skills.push({ id: 's_nec_7', name: "Roubo de Alma", manaCost: 310, type: 'drain', multiplier: 19.0, element: 'trevas', reqLvl: 60, range: 5 });
                if (level >= 70) skills.push({ id: 's_nec_8', name: "Peste Negra (Área)", manaCost: 360, type: 'attack', multiplier: 13.2, isAoE: true, element: 'veneno', reqLvl: 70, range: 5, aoeRadius: 3 });
                if (level >= 80) skills.push({ id: 's_nec_9', name: "Ceifador de Almas", manaCost: 410, type: 'drain', multiplier: 25.0, element: 'trevas', reqLvl: 80, range: 6 });
                if (level >= 90) skills.push({ id: 's_nec_10', name: "Apocalipse Necrótico", manaCost: 460, type: 'attack', multiplier: 16.8, isAoE: true, element: 'morte', reqLvl: 90, range: 6, aoeRadius: 3 });
                if (level >= 100) skills.push({ id: 's_nec_11', name: "Imperador dos Mortos", manaCost: 510, type: 'attack', multiplier: 18.6, isAoE: true, element: 'morte', reqLvl: 100, range: 6, aoeRadius: 4 });
                break;
        }
        return skills;
    }
};

window.SkillDatabase = SkillDatabase;
