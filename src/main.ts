import Phaser from 'phaser';
import { createGameConfig } from './core/config/gameConfig';

const gameConfig = createGameConfig();
const game = new Phaser.Game(gameConfig);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy(true);
  });
}
