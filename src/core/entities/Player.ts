import Phaser from 'phaser';
import { PlayerSkin } from '../config/playerSkins';

export class Player {
  private sprite: Phaser.Physics.Arcade.Sprite | Phaser.Physics.Arcade.Image;
  private body: Phaser.Physics.Arcade.Body;
  private readonly speed = 260;
  private forcedAnimation: string | null = null;
  private useAnimations = true;
  private skin: PlayerSkin;

  constructor(private scene: Phaser.Scene, position: Phaser.Math.Vector2, skin: PlayerSkin) {
    this.skin = skin;
    if (skin === 'xmascat') {
      this.sprite = scene.physics.add.sprite(position.x, position.y, 'xmascat', 0);
      this.sprite.setScale(0.35);
      this.useAnimations = true;
    } else {
      this.sprite = scene.physics.add.sprite(position.x, position.y, 'cat-hero', 0);
      this.sprite.setScale(1.5);
      this.useAnimations = true;
    }
    this.sprite.setDepth(5);

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (skin === 'xmascat') {
      this.body.setSize(this.sprite.displayWidth * 0.6, this.sprite.displayHeight * 0.6, true);
    } else {
      this.body.setSize(40, 28, true);
    }
    this.body.setCollideWorldBounds(true);
    this.body.setDamping(true);
    this.body.setDrag(0.85);
    this.body.setMaxVelocity(this.speed, this.speed);

    if (this.useAnimations && this.sprite instanceof Phaser.Physics.Arcade.Sprite) {
      if (this.skin === 'xmascat') {
        this.sprite.play('xmascat-fly');
      } else {
        this.sprite.play('cat-idle');
      }
    }
  }

  update(direction: Phaser.Math.Vector2): void {
    const velocity = direction.clone();
    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.speed);
    }
    this.body.setVelocity(velocity.x, velocity.y);

    this.updateAnimation(direction);
  }

  getCollider(): Phaser.GameObjects.GameObject {
    return this.sprite;
  }

  private updateAnimation(direction: Phaser.Math.Vector2): void {
    if (!this.useAnimations || !(this.sprite instanceof Phaser.Physics.Arcade.Sprite)) {
      return;
    }

    if (this.skin === 'xmascat') {
      this.sprite.play('xmascat-fly', true);
      return;
    }

    if (this.forcedAnimation) {
      this.sprite.play(this.forcedAnimation, true);
      return;
    }

    const absX = Math.abs(direction.x);
    const absY = Math.abs(direction.y);

    if (absX === 0 && absY === 0) {
      this.sprite.play('cat-idle', true);
      return;
    }

    if (absY >= absX) {
      if (direction.y < 0) {
        this.sprite.play('cat-up', true);
      } else {
        this.sprite.play('cat-down', true);
      }
      return;
    }

    if (direction.x > 0) {
      this.sprite.play('cat-forward', true);
    } else {
      this.sprite.play('cat-backward', true);
    }
  }

  resetPosition(): void {
    this.body.stop();
    this.sprite.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
  }

  setForcedAnimation(key: string | null): void {
    this.forcedAnimation = key;
  }

  isMoving(): boolean {
    return this.body.velocity.lengthSq() > 1;
  }
}
