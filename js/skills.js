const SkillDatabase = {
    getSkillsForClass: function(playerClass, level, getTotalAttr) {
        let skills = [];

        switch (playerClass) {
            case 'Caçador':
                skills.push({ id: 's_cac_1', name: "Tiro Preciso", manaCost: 15, type: 'attack', multiplier: 1.8, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_cac_2', name: "Saraivada (Área)", manaCost: 35, type: 'attack', multiplier: 1.5, isAoE: true, reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_cac_3', name: "Flecha Perfurante", manaCost: 50, type: 'attack', multiplier: 3.5, element: 'estaca', reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_cac_4', name: "Bala de Prata", manaCost: 70, type: 'attack', multiplier: 5.0, element: 'prata', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_cac_5', name: "Chuva de Flechas (Área)", manaCost: 110, type: 'attack', multiplier: 3.8, isAoE: true, reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_cac_6', name: "Execução", manaCost: 140, type: 'attack', multiplier: 8.0, element: 'sagrado', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_cac_7', name: "Marca da Caçada", manaCost: 180, type: 'attack', multiplier: 10.0, element: 'prata', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_cac_8', name: "Tempestade de Projéteis (Área)", manaCost: 250, type: 'attack', multiplier: 7.0, isAoE: true, reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_cac_9', name: "Caçada Implacável", manaCost: 330, type: 'attack', multiplier: 12.0, element: 'prata', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_cac_10', name: "Extermínio Sobrenatural", manaCost: 450, type: 'attack', multiplier: 18.0, element: 'sagrado', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_cac_11', name: "Última Caçada", manaCost: 600, type: 'attack', multiplier: 25.0, isAoE: true, element: 'sagrado', reqLvl: 100 });
                break;

            case 'Exorcista':
                skills.push({ id: 's_exo_1', name: "Cura Sagrada", manaCost: 20, type: 'heal', healAmount: 50 + getTotalAttr('int') * 2, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_exo_2', name: "Punição Divina", manaCost: 35, type: 'attack', multiplier: 2.2, element: 'luz sagrada', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_exo_3', name: "Aura Restauradora", manaCost: 60, type: 'heal', healAmount: 150 + getTotalAttr('int') * 3, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_exo_4', name: "Expulsão Demoníaca", manaCost: 85, type: 'attack', multiplier: 5.0, element: 'sagrado', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_exo_5', name: "Milagre Divino", manaCost: 120, type: 'heal', healAmount: 350 + getTotalAttr('int') * 5, reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_exo_6', name: "Julgamento Celestial (Área)", manaCost: 180, type: 'attack', multiplier: 5.5, isAoE: true, element: 'luz sagrada', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_exo_7', name: "Lança do Arcanjo", manaCost: 220, type: 'attack', multiplier: 8.5, element: 'sagrado', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_exo_8', name: "Graça Suprema", manaCost: 280, type: 'heal', healAmount: 1000 + getTotalAttr('int') * 8, reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_exo_9', name: "Purificação Total (Área)", manaCost: 340, type: 'attack', multiplier: 10.0, isAoE: true, element: 'luz sagrada', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_exo_10', name: "Intervenção Divina", manaCost: 450, type: 'heal', healAmount: 2500 + getTotalAttr('int') * 10, reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_exo_11', name: "Apoteose Celestial", manaCost: 650, type: 'attack', multiplier: 24.0, isAoE: true, element: 'sagrado', reqLvl: 100 });
                break;

            case 'Alquimista':
                skills.push({ id: 's_alq_1', name: "Bomba Ácida", manaCost: 15, type: 'attack', multiplier: 1.5, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_alq_2', name: "Fogo Alquímico (Área)", manaCost: 35, type: 'attack', multiplier: 1.3, isAoE: true, element: 'fogo', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_alq_3', name: "Transmutação Explosiva", manaCost: 50, type: 'attack', multiplier: 3.5, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_alq_4', name: "Névoa Corrosiva (Área)", manaCost: 85, type: 'attack', multiplier: 3.0, isAoE: true, element: 'ácido', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_alq_5', name: "Estilhaços Químicos", manaCost: 100, type: 'attack', multiplier: 6.5, element: 'explosão', reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_alq_6', name: "Reação em Cadeia (Área)", manaCost: 170, type: 'attack', multiplier: 6.0, isAoE: true, element: 'alquimia', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_alq_7', name: "Granada de Napalm", manaCost: 220, type: 'attack', multiplier: 8.5, element: 'fogo', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_alq_8', name: "Praga Química (Área)", manaCost: 280, type: 'attack', multiplier: 8.0, isAoE: true, element: 'veneno', reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_alq_9', name: "Catalisador Supremo", manaCost: 350, type: 'attack', multiplier: 12.0, element: 'alquimia', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_alq_10', name: "Fissão Alquímica", manaCost: 450, type: 'attack', multiplier: 18.0, isAoE: true, element: 'explosão', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_alq_11', name: "Bomba do Juízo Final", manaCost: 650, type: 'attack', multiplier: 26.0, isAoE: true, element: 'explosão', reqLvl: 100 });
                break;

            case 'Bruxo':
                skills.push({ id: 's_bru_1', name: "Dreno de Vida", manaCost: 25, type: 'drain', multiplier: 1.6, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_bru_2', name: "Maldição Sombria", manaCost: 40, type: 'attack', multiplier: 2.5, element: 'trevas', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_bru_3', name: "Festim de Almas", manaCost: 70, type: 'drain', multiplier: 3.5, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_bru_4', name: "Praga Eterna (Área)", manaCost: 100, type: 'attack', multiplier: 3.2, isAoE: true, element: 'trevas', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_bru_5', name: "Invocar Espectros", manaCost: 120, type: 'attack', multiplier: 7.0, element: 'espiritual', reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_bru_6', name: "Apocalipse das Almas (Área)", manaCost: 220, type: 'drain', multiplier: 5.5, isAoE: true, element: 'trevas', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_bru_7', name: "Pacto Profano", manaCost: 260, type: 'drain', multiplier: 8.5, element: 'trevas', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_bru_8', name: "Legião das Sombras (Área)", manaCost: 320, type: 'attack', multiplier: 8.0, isAoE: true, element: 'espiritual', reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_bru_9', name: "Arauto do Abismo", manaCost: 380, type: 'drain', multiplier: 12.0, element: 'trevas', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_bru_10', name: "Ritual do Vazio", manaCost: 500, type: 'drain', multiplier: 16.0, element: 'trevas', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_bru_11', name: "Devorador de Mundos", manaCost: 700, type: 'attack', multiplier: 28.0, isAoE: true, element: 'trevas', reqLvl: 100 });
                break;

            case 'Mago':
                skills.push({ id: 's_mag_1', name: "Lança de Gelo", manaCost: 15, type: 'attack', multiplier: 1.8, element: 'gelo', reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_mag_2', name: "Bola de Fogo (Área)", manaCost: 35, type: 'attack', multiplier: 1.4, isAoE: true, element: 'fogo', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_mag_3', name: "Tempestade Arcana (Área)", manaCost: 75, type: 'attack', multiplier: 2.8, isAoE: true, element: 'arcano', reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_mag_4', name: "Raio Concentrado", manaCost: 90, type: 'attack', multiplier: 6.0, element: 'raio', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_mag_5', name: "Meteoro", manaCost: 140, type: 'attack', multiplier: 8.5, element: 'fogo', reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_mag_6', name: "Cataclismo Arcano (Área)", manaCost: 240, type: 'attack', multiplier: 7.0, isAoE: true, element: 'arcano', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_mag_7', name: "Tempestade Elemental (Área)", manaCost: 300, type: 'attack', multiplier: 8.5, isAoE: true, element: 'elemental', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_mag_8', name: "Nova Arcana", manaCost: 360, type: 'attack', multiplier: 10.0, isAoE: true, element: 'arcano', reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_mag_9', name: "Cometa Celeste", manaCost: 420, type: 'attack', multiplier: 14.0, element: 'fogo', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_mag_10', name: "Colapso Arcano", manaCost: 550, type: 'attack', multiplier: 18.0, isAoE: true, element: 'arcano', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_mag_11', name: "Big Bang Arcano", manaCost: 800, type: 'attack', multiplier: 30.0, isAoE: true, element: 'arcano', reqLvl: 100 });
                break;

            case 'Guerreiro':
                skills.push({ id: 's_war_1', name: "Golpe Forte", manaCost: 10, type: 'attack', multiplier: 2.0, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_war_2', name: "Corte Giratório (Área)", manaCost: 30, type: 'attack', multiplier: 1.8, isAoE: true, reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_war_3', name: "Investida Brutal", manaCost: 45, type: 'attack', multiplier: 4.0, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_war_4', name: "Esmagar Crânios", manaCost: 65, type: 'attack', multiplier: 5.5, reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_war_5', name: "Terremoto (Área)", manaCost: 110, type: 'attack', multiplier: 4.5, isAoE: true, reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_war_6', name: "Golpe Colossal", manaCost: 150, type: 'attack', multiplier: 9.0, reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_war_7', name: "Rompedor de Linhas", manaCost: 220, type: 'attack', multiplier: 11.0, isAoE: true, reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_war_8', name: "Fúria Titânica", manaCost: 300, type: 'attack', multiplier: 13.0, reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_war_9', name: "Executor dos Gigantes", manaCost: 380, type: 'attack', multiplier: 16.0, reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_war_10', name: "Quebra-Montanhas", manaCost: 500, type: 'attack', multiplier: 20.0, isAoE: true, reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_war_11', name: "Fim da Guerra", manaCost: 700, type: 'attack', multiplier: 28.0, reqLvl: 100 });
                break;

            case 'Assassino':
                skills.push({ id: 's_ass_1', name: "Ataque Furtivo", manaCost: 15, type: 'attack', multiplier: 2.5, reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_ass_2', name: "Lâmina Envenenada", manaCost: 25, type: 'attack', multiplier: 3.5, element: 'veneno', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_ass_3', name: "Corte nas Sombras", manaCost: 45, type: 'attack', multiplier: 5.0, element: 'trevas', reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_ass_4', name: "Sangramento Letal", manaCost: 70, type: 'attack', multiplier: 6.5, element: 'sangramento', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_ass_5', name: "Dança das Adagas", manaCost: 95, type: 'attack', multiplier: 8.5, reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_ass_6', name: "Assassinato", manaCost: 140, type: 'attack', multiplier: 13.0, reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_ass_7', name: "Perfuração Mortal", manaCost: 180, type: 'attack', multiplier: 15.0, reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_ass_8', name: "Execução Silenciosa", manaCost: 260, type: 'attack', multiplier: 18.0, reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_ass_9', name: "Mestre das Sombras", manaCost: 330, type: 'attack', multiplier: 21.0, element: 'trevas', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_ass_10', name: "Golpe Fantasma", manaCost: 450, type: 'attack', multiplier: 25.0, reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_ass_11', name: "Morte Instantânea", manaCost: 650, type: 'attack', multiplier: 35.0, reqLvl: 100 });
                break;

            case 'Paladino':
                skills.push({ id: 's_pal_1', name: "Golpe Divino", manaCost: 15, type: 'attack', multiplier: 1.8, element: 'sagrado', reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_pal_2', name: "Consagração (Área)", manaCost: 40, type: 'attack', multiplier: 1.6, isAoE: true, element: 'luz sagrada', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_pal_3', name: "Cura pelas Mãos", manaCost: 50, type: 'heal', healAmount: 120 + getTotalAttr('int') * 2, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_pal_4', name: "Escudo Celestial", manaCost: 80, type: 'attack', multiplier: 4.5, element: 'luz sagrada', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_pal_5', name: "Ira do Guardião (Área)", manaCost: 130, type: 'attack', multiplier: 4.8, isAoE: true, element: 'sagrado', reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_pal_6', name: "Veredito Final", manaCost: 160, type: 'attack', multiplier: 8.0, element: 'sagrado', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_pal_7', name: "Luz Restauradora", manaCost: 220, type: 'heal', healAmount: 700 + getTotalAttr('int') * 6, reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_pal_8', name: "Martelo Sagrado", manaCost: 300, type: 'attack', multiplier: 10.0, element: 'sagrado', reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_pal_9', name: "Purificação Divina (Área)", manaCost: 380, type: 'attack', multiplier: 12.0, isAoE: true, element: 'luz sagrada', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_pal_10', name: "Ascensão do Campeão", manaCost: 500, type: 'heal', healAmount: 2500 + getTotalAttr('int') * 10, reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_pal_11', name: "Julgamento Supremo", manaCost: 700, type: 'attack', multiplier: 25.0, isAoE: true, element: 'sagrado', reqLvl: 100 });
                break;

            case 'Necromante':
                skills.push({ id: 's_nec_1', name: "Toque Macabro", manaCost: 20, type: 'drain', multiplier: 1.8, element: 'trevas', reqLvl: 5 });
                if (level >= 10) skills.push({ id: 's_nec_2', name: "Nuvem de Peste (Área)", manaCost: 45, type: 'attack', multiplier: 1.8, isAoE: true, element: 'veneno', reqLvl: 10 });
                if (level >= 20) skills.push({ id: 's_nec_3', name: "Lança de Ossos", manaCost: 65, type: 'attack', multiplier: 4.0, reqLvl: 20 });
                if (level >= 30) skills.push({ id: 's_nec_4', name: "Transfusão Sombria", manaCost: 90, type: 'drain', multiplier: 4.5, element: 'trevas', reqLvl: 30 });
                if (level >= 40) skills.push({ id: 's_nec_5', name: "Explosão de Cadáveres (Área)", manaCost: 140, type: 'attack', multiplier: 5.0, isAoE: true, element: 'explosão', reqLvl: 40 });
                if (level >= 50) skills.push({ id: 's_nec_6', name: "Exército dos Mortos", manaCost: 200, type: 'attack', multiplier: 9.0, element: 'espiritual', reqLvl: 50 });
                if (level >= 60) skills.push({ id: 's_nec_7', name: "Roubo de Alma", manaCost: 260, type: 'drain', multiplier: 8.0, element: 'trevas', reqLvl: 60 });
                if (level >= 70) skills.push({ id: 's_nec_8', name: "Peste Negra (Área)", manaCost: 320, type: 'attack', multiplier: 8.5, isAoE: true, element: 'veneno', reqLvl: 70 });
                if (level >= 80) skills.push({ id: 's_nec_9', name: "Ceifador de Almas", manaCost: 400, type: 'drain', multiplier: 12.0, element: 'trevas', reqLvl: 80 });
                if (level >= 90) skills.push({ id: 's_nec_10', name: "Apocalipse Necrótico", manaCost: 520, type: 'attack', multiplier: 18.0, isAoE: true, element: 'morte', reqLvl: 90 });
                if (level >= 100) skills.push({ id: 's_nec_11', name: "Imperador dos Mortos", manaCost: 750, type: 'attack', multiplier: 28.0, isAoE: true, element: 'morte', reqLvl: 100 });
                break;
        }
        return skills;
    }
};

window.SkillDatabase = SkillDatabase;
