import Phaser from 'phaser';
import { GameEvents } from '../constants/GameEvents';
import { EventBus } from '../events/EventBus';
import { getActiveSkin } from '../state/playerSkinStore';
import { Level, LevelContext, LevelHooks } from './Level';

export class Level4 implements Level {
  readonly id = 4;
  private gifts?: Phaser.Physics.Arcade.Group;
  private snowballs?: Phaser.Physics.Arcade.Group;
  private spawnGiftTimer?: Phaser.Time.TimerEvent;
  private spawnSnowballTimer?: Phaser.Time.TimerEvent;
  private completed = false;
  private lastHitAt = 0;
  private hitSound?: Phaser.Sound.BaseSound;
  private sadMeow1?: Phaser.Sound.BaseSound;
  private sadMeow2?: Phaser.Sound.BaseSound;

  private readonly config = {
    giftSpawnDelay: 620,
    giftSpeed: 220,
    snowballSpawnDelay: 520,
    snowballSpeed: 260,
    angleJitter: 0.35,
    hitCooldown: 450,
  };

  constructor(private context: LevelContext, private hooks: LevelHooks) {
  }

  start(): void {
    this.completed = false;
    this.lastHitAt = 0;
    this.cleanupGifts();
    this.cleanupSnowballs();
    this.hitSound = this.context.scene.sound.add('sfx-snowball-hit', { volume: 0.7 });
    this.sadMeow1 = this.context.scene.sound.add('sfx-sad-meow-1', { volume: 0.7 });
    this.sadMeow2 = this.context.scene.sound.add('sfx-sad-meow-2', { volume: 0.7 });

    this.ensureSnowballTexture();
    this.ensureGiftTexture();
    this.gifts = this.context.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.snowballs = this.context.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    this.context.scene.physics.add.overlap(this.context.player, this.gifts, (_player, gift) => {
      gift.destroy();
      const score = this.context.addScore(1);
      this.hooks.onScore(score);
      if (!this.completed && score >= this.context.target) {
        this.completed = true;
        this.cleanupGifts();
        this.cleanupSnowballs();
        this.hooks.onComplete();
      }
    });

    this.context.scene.physics.add.overlap(this.context.player, this.snowballs, (_player, snowball) => {
      this.handleHit(snowball as Phaser.Physics.Arcade.Image);
    });

    this.spawnGiftTimer = this.context.scene.time.addEvent({
      delay: this.config.giftSpawnDelay,
      loop: true,
      callback: this.spawnGift,
      callbackScope: this,
    });
    this.spawnSnowballTimer = this.context.scene.time.addEvent({
      delay: this.config.snowballSpawnDelay,
      loop: true,
      callback: this.spawnSnowball,
      callbackScope: this,
    });
    this.spawnGift();
    this.spawnSnowball();
  }

  update(): void {
    this.cullGifts();
    this.cullSnowballs();
  }

  resize(_width: number, _height: number): void {
    // No-op, bounds are read directly on spawn/cull.
  }

  destroy(): void {
    this.cleanupGifts();
    this.cleanupSnowballs();
  }

  private spawnGift(): void {
    if (!this.gifts) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    const x = bounds.right + 24;
    const y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);
    const giftKey = Phaser.Utils.Array.GetRandom(['gift-1', 'gift-2', 'gift-3', 'gift-4', 'gift-5', 'gift-6', 'gift-7']);
    const gift = this.gifts.create(x, y, giftKey) as Phaser.Physics.Arcade.Image;
    gift.setScale(0.13);
    gift.setDepth(11);
    gift.setActive(true);
    gift.setVisible(true);
    gift.setVelocity(-this.config.giftSpeed, 0);

    if (gift.body) {
      (gift.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    }
  }

  private spawnSnowball(): void {
    if (!this.snowballs) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    const x = bounds.right + 24;
    const y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);
    const snowball = this.snowballs.create(x, y, 'snowball') as Phaser.Physics.Arcade.Image;
    snowball.setDepth(11);
    snowball.setScale(0.1);
    snowball.setActive(true);
    snowball.setVisible(true);

    if (snowball.body) {
      const target = this.context.player;
      const angle = Phaser.Math.Angle.Between(x, y, target.x, target.y);
      const jittered = angle + Phaser.Math.FloatBetween(-this.config.angleJitter, this.config.angleJitter);
      const speed = this.config.snowballSpeed + Phaser.Math.Between(-40, 40);
      this.context.scene.physics.velocityFromRotation(jittered, speed, (snowball.body as Phaser.Physics.Arcade.Body).velocity);
      (snowball.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    }
  }

  private handleHit(snowball: Phaser.Physics.Arcade.Image): void {
    const now = this.context.scene.time.now;
    if (now - this.lastHitAt < this.config.hitCooldown) {
      return;
    }
    this.lastHitAt = now;
    snowball.destroy();
    const skin = getActiveSkin();
    this.context.scene.sound.play('sfx-snowball-hit', { volume: 0.7 });
    if (skin === 'xmascat') {
      this.context.scene.sound.play('sfx-sad-meow-2', { volume: 0.7 });
    } else {
      const meow = this.context.scene.sound.add('sfx-sad-meow-1', { volume: 0.7 });
      meow.play();
      this.context.scene.time.delayedCall(500, () => {
        meow.stop();
        meow.destroy();
      });
    }

    const livesLeft = this.context.loseLife();
    EventBus.emit(GameEvents.LIVES_UPDATED, { lives: livesLeft });
    if (livesLeft <= 0) {
      this.cleanupGifts();
      this.cleanupSnowballs();
      this.hooks.onScore(this.context.addScore(0));
      EventBus.emit(GameEvents.GAME_OVER);
      return;
    }

    this.context.scene.cameras.main.flash(120, 255, 220, 120);
  }

  private cullGifts(): void {
    if (!this.gifts) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    this.gifts.getChildren().forEach((child) => {
      const gift = child as Phaser.Physics.Arcade.Image;
      if (gift.x < bounds.left - 40) {
        gift.destroy();
      }
    });
  }

  private cullSnowballs(): void {
    if (!this.snowballs) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    this.snowballs.getChildren().forEach((child) => {
      const snowball = child as Phaser.Physics.Arcade.Image;
      if (
        snowball.x < bounds.left - 40 ||
        snowball.x > bounds.right + 40 ||
        snowball.y < bounds.top - 40 ||
        snowball.y > bounds.bottom + 40
      ) {
        snowball.destroy();
      }
    });
  }

  private cleanupGifts(): void {
    this.spawnGiftTimer?.remove(false);
    this.spawnGiftTimer = undefined;
    this.gifts?.clear(true, true);
    this.gifts = undefined;
  }

  private cleanupSnowballs(): void {
    this.spawnSnowballTimer?.remove(false);
    this.spawnSnowballTimer = undefined;
    this.snowballs?.clear(true, true);
    this.snowballs = undefined;
    this.hitSound?.destroy();
    this.hitSound = undefined;
    this.sadMeow1?.destroy();
    this.sadMeow1 = undefined;
    this.sadMeow2?.destroy();
    this.sadMeow2 = undefined;
  }

  private ensureGiftTexture(): void {
    if (this.context.scene.textures.exists('gift')) {
      return;
    }

    const graphics = this.context.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, 16, 16, 3);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRoundedRect(1, 1, 14, 14, 3);
    graphics.generateTexture('gift', 16, 16);
    graphics.destroy();
  }

  private ensureSnowballTexture(): void {
    if (this.context.scene.textures.exists('snowball')) {
      return;
    }

    const graphics = this.context.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.lineStyle(2, 0xb8e4ff, 0.9);
    graphics.strokeCircle(8, 8, 8);
    graphics.generateTexture('snowball', 16, 16);
    graphics.destroy();
  }
}
