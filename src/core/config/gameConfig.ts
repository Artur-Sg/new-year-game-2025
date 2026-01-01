import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const LEVEL_ONE_TARGET = 10;
export const UI_TEXT_SCALE = 1.7;
export const UI_FONT_FAMILY = '"TMVinograd", serif';
export const TOUCH_SHOOT_ZONE_RATIO = 0.62;

export function getTextScale(width: number, height: number): number {
  const scale = Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
  const clamped = Math.max(0.9, Math.min(1.4, scale));
  return clamped * UI_TEXT_SCALE;
}

export function toFont(basePx: number, scale: number): string {
  return `${Math.round(basePx * scale)}px ${UI_FONT_FAMILY}`;
}


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
    scene: [BootScene, PreloadScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}
