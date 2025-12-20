# New Year Game 2025

A Phaser 3 starter for a New Year themed arcade mini-game with a decomposed architecture. Scenes, systems, and state are split into focused modules so you can iterate quickly on gameplay and visuals.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Project structure

- `src/core/config` – shared game configuration and sizing.
- `src/core/constants` – scene names and event keys.
- `src/core/events` – global event bus for decoupled communication.
- `src/core/entities` – gameplay entities like the player avatar.
- `src/core/scenes` – Boot, Preload, Main Menu, Game, and UI scenes.
- `src/core/systems` – reusable systems (input handling, collectible spawning).
- `src/core/state` – simple game state container for score/time tracking.

## Gameplay loop

1. Boot → Preload → Main Menu.
2. Starting the game launches the `GameScene` plus an overlay `UIScene`.
3. Move with arrow keys or WASD, collect glowing wishes, and watch the timer update in the HUD.
4. Extend by adding assets, new systems, and richer UI flows without changing the core wiring.
