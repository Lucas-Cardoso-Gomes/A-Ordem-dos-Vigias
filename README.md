# A Ordem dos Vigias (Aegis Nocturna)

A Ordem dos Vigias is a vanilla JavaScript browser-based RPG game featuring a turn-based combat system on a 2D grid, exploration, crafting, quests, and party management.

## Running the game

The application is completely front-end and has no backend or node module dependencies. To run the game locally, you can serve the directory using a simple static file server. For example:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080` in your web browser.

## Features
- **Exploration:** Navigate different regions and overcome encounters.
- **Combat Grid:** Engage in tactical turn-based combat on a grid with line-of-sight, ranges, attacks of opportunity, active terrains, and taunt mechanics.
- **Party System:** Manage up to 4 characters with their own classes ('Guerreiro', 'Caçador', 'Guardião', 'Mago', 'Clérigo'), stats, and equipment.
- **Crafting & Equipment:** Loot items to forge powerful gear or upgrade existing ones. Equip weapons, armors, and accessories per character slot.
- **Quests:** Take on various contracts like 'kill', 'gather', 'explore', and 'boss'.
- **Save State:** Save and load using LocalStorage, or export/import your game state string.

Enjoy exploring the world and conquering the dungeons!