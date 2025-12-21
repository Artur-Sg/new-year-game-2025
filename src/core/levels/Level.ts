import Phaser from 'phaser';

export type LevelHooks = {
  onScore: (score: number) => void;
  onComplete: () => void;
};

export type LevelContext = {
  scene: Phaser.Scene;
  player: Phaser.Types.Physics.Arcade.GameObjectWithBody;
  target: number;
  addScore: (amount: number) => number;
};

export interface Level {
  readonly id: number;
  start(): void;
  update(): void;
  resize(width: number, height: number): void;
  destroy(): void;
}
