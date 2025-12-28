import Phaser from 'phaser';
import { Level, LevelContext, LevelHooks } from './Level';

type FlyingGiftsConfig = {
  id: number;
  spawnDelay: number;
  giftSpeed: number;
  wind?: {
    yMin: number;
    yMax: number;
    xJitter: number;
    changeInterval: number;
  };
};

export class FlyingGiftsLevel implements Level {
  readonly id: number;
  private gifts?: Phaser.Physics.Arcade.Group;
  private spawnTimer?: Phaser.Time.TimerEvent;
  private completed = false;
  private config: FlyingGiftsConfig;

  constructor(private context: LevelContext, private hooks: LevelHooks, config: FlyingGiftsConfig) {
    this.id = config.id;
    this.config = config;
  }

  start(): void {
    this.completed = false;
    this.cleanupGifts();
    this.gifts = this.context.scene.physics.add.group({
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
        this.hooks.onComplete();
      }
    });

    this.spawnTimer = this.context.scene.time.addEvent({
      delay: this.config.spawnDelay,
      loop: true,
      callback: this.spawnGift,
      callbackScope: this,
    });
    this.spawnGift();
  }

  update(): void {
    this.applyWind();
    this.cullGifts();
  }

  resize(_width: number, _height: number): void {
    // No-op, bounds are read directly on spawn/cull.
  }

  destroy(): void {
    this.cleanupGifts();
  }

  private spawnGift(): void {
    if (!this.gifts) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    const x = bounds.right + 24;
    const y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);
    const giftKey = this.pickGiftKey();
    const gift = this.gifts.create(x, y, giftKey) as Phaser.Physics.Arcade.Image;
    gift.setScale(0.13);
    gift.setDepth(11);
    gift.setActive(true);
    gift.setVisible(true);
    gift.setVelocity(-this.config.giftSpeed, 0);

    if (gift.body) {
      (gift.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    }

    if (this.config.wind) {
      this.applyWindToGift(gift, this.context.scene.time.now);
    }
  }

  private pickGiftKey(): string {
    return Phaser.Utils.Array.GetRandom(['gift-1', 'gift-2', 'gift-3', 'gift-4', 'gift-5', 'gift-6', 'gift-7']);
  }

  private applyWind(): void {
    if (!this.gifts || !this.config.wind) {
      return;
    }

    const now = this.context.scene.time.now;
    const bounds = this.context.scene.physics.world.bounds;

    this.gifts.getChildren().forEach((child) => {
      const gift = child as Phaser.Physics.Arcade.Image;
      this.applyWindToGift(gift, now);

      if (!gift.body) {
        return;
      }

      const body = gift.body as Phaser.Physics.Arcade.Body;
      const minY = bounds.top + 20;
      const maxY = bounds.bottom - 20;
      if (gift.y < minY) {
        gift.y = minY;
        body.velocity.y = Math.abs(body.velocity.y);
      } else if (gift.y > maxY) {
        gift.y = maxY;
        body.velocity.y = -Math.abs(body.velocity.y);
      }
    });
  }

  private applyWindToGift(gift: Phaser.Physics.Arcade.Image, now: number): void {
    const wind = this.config.wind;
    if (!wind || !gift.body) {
      return;
    }

    const nextChange = gift.getData('windNextChange') as number | undefined;
    if (nextChange !== undefined && now < nextChange) {
      return;
    }

    const body = gift.body as Phaser.Physics.Arcade.Body;
    const yVelocity = Phaser.Math.Between(wind.yMin, wind.yMax);
    const xVelocity = -(this.config.giftSpeed + Phaser.Math.Between(-wind.xJitter, wind.xJitter));
    body.setVelocity(xVelocity, yVelocity);

    const jitter = Phaser.Math.Between(-80, 80);
    gift.setData('windNextChange', now + wind.changeInterval + jitter);
  }

  private cullGifts(): void {
    if (!this.gifts) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    this.gifts.getChildren().forEach((gift) => {
      const rect = gift as Phaser.GameObjects.Rectangle;
      if (rect.x < bounds.left - 40) {
        rect.destroy();
      }
    });
  }

  private cleanupGifts(): void {
    this.spawnTimer?.remove(false);
    this.spawnTimer = undefined;
    this.gifts?.clear(true, true);
    this.gifts = undefined;
  }
}
