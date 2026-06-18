const fs = require('fs');
let code = fs.readFileSync('js/ui.js', 'utf-8');

// Add eqSlots keydown
code = code.replace(
    /this\.eqSlots\.forEach\(slot => \{\n\s*slot\.addEventListener\('click', \(e\) => \{\n\s*const slotId = e\.currentTarget\.getAttribute\('data-slot'\);\n\s*window\.gameInventory\.unequip\(slotId, this\.selectedPartyIndex\);\n\s*\}\);/g,
    `this.eqSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                const slotId = e.currentTarget.getAttribute('data-slot');
                window.gameInventory.unequip(slotId, this.selectedPartyIndex);
            });
            slot.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    slot.click();
                }
            });`
);

// Add inv-item tabindex and keydown
code = code.replace(
    /const div = document\.createElement\('div'\);\n\s*div\.className = \`inv-item rarity-\$\{item\.rarity\}\`;\n\s*div\.style\.position = 'relative';/g,
    `const div = document.createElement('div');
            div.className = \`inv-item rarity-\${item.rarity}\`;
            div.tabIndex = 0;
            div.setAttribute('role', 'button');
            div.style.position = 'relative';`
);

code = code.replace(
    /div\.addEventListener\('mouseenter', \(e\) => this\.showItemTooltip\(e, item\)\);/g,
    `div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    div.click();
                }
            });
            div.addEventListener('mouseenter', (e) => this.showItemTooltip(e, item));`
);


fs.writeFileSync('js/ui.js', code);
