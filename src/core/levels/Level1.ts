import Phaser from 'phaser';
import { CollectibleField } from '../systems/CollectibleField';
import { Level, LevelContext, LevelHooks } from './Level';

export class Level1 implements Level {
  readonly id = 1;
  private collectibles: CollectibleField;
  private bounds: Phaser.Geom.Rectangle;
  private completed = false;

  constructor(private context: LevelContext, private hooks: LevelHooks) {
    const width = context.scene.scale.width;
    const height = context.scene.scale.height;
    this.bounds = new Phaser.Geom.Rectangle(64, 64, width - 128, height - 128);
    this.collectibles = new CollectibleField(context.scene, this.bounds);
  }

  start(): void {
    this.completed = false;
    this.collectibles.clear();
    this.collectibles.spawn(this.context.target);
    this.collectibles.bindToTarget(this.context.player, () => {
      const score = this.context.addScore(1);
      this.hooks.onScore(score);
      if (!this.completed && score >= this.context.target) {
        this.completed = true;
        this.collectibles.clear();
        this.hooks.onComplete();
      }
    });
  }

  update(): void {
    // Level 1 has no per-frame logic beyond collectibles.
  }

  resize(width: number, height: number): void {
    const playWidth = Math.max(120, width - 128);
    const playHeight = Math.max(120, height - 128);
    this.bounds.setTo(64, 64, playWidth, playHeight);
    this.collectibles.setBounds(this.bounds);
  }

  destroy(): void {
    this.collectibles.clear();
  }
}
