import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { UIScene } from '../scenes/UIScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const LEVEL_ONE_TARGET = 10;


export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'app',
    backgroundColor: '#0d0f1d',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    antialiasGL: false,
    scene: [BootScene, PreloadScene, MainMenuScene, GameScene, UIScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}
