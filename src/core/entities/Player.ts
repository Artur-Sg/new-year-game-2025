import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';

export class Player {
  private sprite: Phaser.GameObjects.Arc;
  private body: Phaser.Physics.Arcade.Body;
  private readonly speed = 240;

  constructor(private scene: Phaser.Scene, position: Phaser.Math.Vector2) {
    this.sprite = scene.add.circle(position.x, position.y, 14, 0xffe066, 0.95);
    this.sprite.setStrokeStyle(2, 0xffffff, 0.6);
    scene.physics.add.existing(this.sprite);

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(14);
    this.body.setCollideWorldBounds(true);
  }

  update(direction: Phaser.Math.Vector2): void {
    const velocity = direction.normalize().scale(this.speed);
    this.body.setVelocity(velocity.x, velocity.y);

    if (velocity.lengthSq() > 0) {
      const angle = Phaser.Math.RadToDeg(Math.atan2(velocity.y, velocity.x));
      this.sprite.setAngle(angle);
    }
  }

  getCollider(): Phaser.GameObjects.Arc {
    return this.sprite;
  }

  resetPosition(): void {
    this.body.stop();
    this.sprite.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }
}
