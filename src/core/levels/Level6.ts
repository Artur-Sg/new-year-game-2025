import Phaser from 'phaser';
import { GameEvents } from '../constants/GameEvents';
import { EventBus } from '../events/EventBus';
import { getActiveSkin } from '../state/playerSkinStore';
import { Level, LevelContext, LevelHooks } from './Level';

type FrozenGift = Phaser.Physics.Arcade.Image & {
  getData(key: 'frozen'): boolean;
  getData(key: 'ice'): Phaser.GameObjects.Image | undefined;
};

export class Level6 implements Level {
  readonly id = 6;
  private gifts?: Phaser.Physics.Arcade.Group;
  private stars?: Phaser.Physics.Arcade.Group;
  private starShots?: Phaser.Physics.Arcade.Group;
  private snowballs?: Phaser.Physics.Arcade.Group;
  private iceOverlays?: Phaser.GameObjects.Group;
  private spawnGiftTimer?: Phaser.Time.TimerEvent;
  private spawnStarTimer?: Phaser.Time.TimerEvent;
  private spawnSnowballTimer?: Phaser.Time.TimerEvent;
  private shootKey?: Phaser.Input.Keyboard.Key;
  private completed = false;
  private lastHitAt = 0;
  private starAmmo = 0;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];
  private hitSound?: Phaser.Sound.BaseSound;
  private sadMeow1?: Phaser.Sound.BaseSound;
  private sadMeow2?: Phaser.Sound.BaseSound;
  private pickStarSound?: Phaser.Sound.BaseSound;
  private starShootSound?: Phaser.Sound.BaseSound;
  private iceBreakSound?: Phaser.Sound.BaseSound;

  private readonly config = {
    giftSpawnDelay: 1120,
    giftSpeed: 240,
    starSpawnDelay: 780,
    starSpeed: 200,
    starShotSpeed: 420,
    snowballSpawnDelay: 460,
    snowballBaseSpeed: 280,
    wind: {
      yMin: -220,
      yMax: 220,
      xJitter: 120,
      changeInterval: 240,
    },
    angleJitter: 0.55,
    hitCooldown: 380,
  };

  constructor(private context: LevelContext, private hooks: LevelHooks) {}

  start(): void {
    this.completed = false;
    this.lastHitAt = 0;
    this.starAmmo = 0;
    EventBus.emit(GameEvents.STARS_UPDATED, { stars: this.starAmmo });

    this.cleanupAll();
    this.ensureGiftTexture();
    this.ensureIceTexture();
    this.ensureStarTexture();
    this.ensureSnowballTexture();
    this.hitSound = this.context.scene.sound.add('sfx-snowball-hit', { volume: 0.7 });
    this.sadMeow1 = this.context.scene.sound.add('sfx-sad-meow-1', { volume: 0.7 });
    this.sadMeow2 = this.context.scene.sound.add('sfx-sad-meow-2', { volume: 0.7 });
    this.pickStarSound = this.context.scene.sound.add('sfx-pick-star', { volume: 0.7 });
    this.starShootSound = this.context.scene.sound.add('sfx-star-shoot', { volume: 0.7 });
    this.iceBreakSound = this.context.scene.sound.add('sfx-ice-break', { volume: 0.7 });

    this.gifts = this.context.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.stars = this.context.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.starShots = this.context.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.snowballs = this.context.scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.iceOverlays = this.context.scene.add.group();

    this.colliders.push(this.context.scene.physics.add.overlap(this.context.player, this.gifts, (_player, gift) => {
      const frozen = (gift as FrozenGift).getData('frozen');
      if (frozen) {
        return;
      }
      this.destroyFrozenGift(gift as FrozenGift);
      const score = this.context.addScore(1);
      this.hooks.onScore(score);
      if (!this.completed && score >= this.context.target) {
        this.completed = true;
        this.cleanupAll();
        this.hooks.onComplete();
      }
    }));

    this.colliders.push(this.context.scene.physics.add.overlap(this.context.player, this.stars, (_player, star) => {
      star.destroy();
      this.context.scene.sound.play('sfx-pick-star', { volume: 0.7 });
      this.starAmmo = Math.min(5, this.starAmmo + 1);
      EventBus.emit(GameEvents.STARS_UPDATED, { stars: this.starAmmo });
    }));

    this.colliders.push(this.context.scene.physics.add.overlap(this.context.player, this.snowballs, (_player, snowball) => {
      this.handleHit(snowball as Phaser.Physics.Arcade.Image);
    }));

    this.colliders.push(this.context.scene.physics.add.overlap(this.starShots, this.gifts, (shot, gift) => {
      const frozenGift = gift as FrozenGift;
      if (frozenGift.getData('frozen')) {
        this.context.scene.sound.play('sfx-ice-break', { volume: 0.7, seek: 0, duration: 0.3 });
        this.unfreezeGift(frozenGift);
      }
      shot.destroy();
    }));
    this.colliders.push(this.context.scene.physics.add.overlap(this.starShots, this.snowballs, (shot, snowball) => {
      snowball.destroy();
      this.context.scene.sound.play('sfx-ice-break', { volume: 0.7, seek: 0, duration: 0.3 });
      shot.destroy();
    }));

    this.shootKey = this.context.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    EventBus.on(GameEvents.SHOOT_REQUEST, this.handleShootRequest, this);

    this.spawnGiftTimer = this.context.scene.time.addEvent({
      delay: this.config.giftSpawnDelay,
      loop: true,
      callback: this.spawnGift,
      callbackScope: this,
    });
    this.spawnStarTimer = this.context.scene.time.addEvent({
      delay: this.config.starSpawnDelay,
      loop: true,
      callback: this.spawnStar,
      callbackScope: this,
    });
    this.spawnSnowballTimer = this.context.scene.time.addEvent({
      delay: this.config.snowballSpawnDelay,
      loop: true,
      callback: this.spawnSnowball,
      callbackScope: this,
    });
    this.spawnGift();
    this.spawnStar();
    this.spawnSnowball();
  }

  update(): void {
    this.handleShooting();
    this.updateGiftIce();
    this.applySnowballWind();
    this.cullGifts();
    this.cullStars();
    this.cullStarShots();
    this.cullSnowballs();
  }

  resize(_width: number, _height: number): void {
    // No-op, bounds are read directly on spawn/cull.
  }

  destroy(): void {
    this.cleanupAll();
  }

  private handleShooting(): void {
    if (!this.shootKey) {
      return;
    }
    if (!Phaser.Input.Keyboard.JustDown(this.shootKey)) {
      return;
    }
    this.tryShoot();
  }

  private handleShootRequest(): void {
    this.tryShoot();
  }

  private tryShoot(): void {
    if (this.starAmmo <= 0) {
      return;
    }
    this.spawnStarShot();
    this.starAmmo = Math.max(0, this.starAmmo - 1);
    EventBus.emit(GameEvents.STARS_UPDATED, { stars: this.starAmmo });
  }

  private spawnGift(): void {
    if (!this.gifts) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    const x = bounds.right + 24;
    const y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);
    const giftKey = Phaser.Utils.Array.GetRandom(['gift-1', 'gift-2', 'gift-3', 'gift-4', 'gift-5', 'gift-6', 'gift-7']);
    const gift = this.gifts.create(x, y, giftKey) as FrozenGift;
    gift.setOrigin(0.5, 0.5);
    gift.setScale(0.13);
    gift.setDepth(11);
    gift.setActive(true);
    gift.setVisible(true);
    gift.setVelocity(-this.config.giftSpeed, 0);
    gift.setData('frozen', true);

    const centerX = gift.x + (0.5 - gift.originX) * gift.displayWidth;
    const centerY = gift.y + (0.5 - gift.originY) * gift.displayHeight;
    const ice = this.context.scene.add.image(centerX, centerY, 'ice');
    ice.setDepth(11.5);
    ice.setAlpha(0.45);
    ice.setOrigin(0.5, 0.5);
    ice.setScale(2);
    this.iceOverlays?.add(ice);
    gift.setData('ice', ice);

    if (gift.body) {
      (gift.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    }
  }

  private spawnStar(): void {
    if (!this.stars) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    const x = bounds.right + 24;
    const y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);
    const star = this.stars.create(x, y, 'star') as Phaser.Physics.Arcade.Image;
    star.setDepth(11);
    star.setActive(true);
    star.setVisible(true);
    star.setVelocity(-this.config.starSpeed, 0);

    if (star.body) {
      (star.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    }
  }

  private spawnStarShot(): void {
    if (!this.starShots) {
      return;
    }

    const player = this.context.player;
    const x = player.x;
    const y = player.y;
    const shot = this.starShots.create(x, y, 'star') as Phaser.Physics.Arcade.Image;
    shot.setDepth(11);
    shot.setActive(true);
    shot.setVisible(true);
    this.context.scene.sound.play('sfx-star-shoot', { volume: 0.7 });

    if (shot.body) {
      (shot.body as Phaser.Physics.Arcade.Body).setVelocity(this.config.starShotSpeed, 0);
      (shot.body as Phaser.Physics.Arcade.Body).allowGravity = false;
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
      const speed = this.config.snowballBaseSpeed + Phaser.Math.Between(-60, 60);
      this.context.scene.physics.velocityFromRotation(jittered, speed, (snowball.body as Phaser.Physics.Arcade.Body).velocity);
      (snowball.body as Phaser.Physics.Arcade.Body).allowGravity = false;
      snowball.setData('windNextChange', this.context.scene.time.now + this.config.wind.changeInterval);
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
      this.context.scene.time.delayedCall(700, () => {
        meow.stop();
        meow.destroy();
      });
    }

    const livesLeft = this.context.loseLife();
    EventBus.emit(GameEvents.LIVES_UPDATED, { lives: livesLeft });
    if (livesLeft <= 0) {
      this.cleanupAll();
      this.hooks.onScore(this.context.addScore(0));
      EventBus.emit(GameEvents.GAME_OVER);
      return;
    }

    this.context.scene.cameras.main.flash(120, 255, 220, 120);
  }

  private updateGiftIce(): void {
    if (!this.gifts) {
      return;
    }
    this.gifts.getChildren().forEach((child) => {
      const gift = child as FrozenGift;
      const ice = gift.getData('ice');
      if (ice) {
        const centerX = gift.x + (0.5 - gift.originX) * gift.displayWidth;
        const centerY = gift.y + (0.5 - gift.originY) * gift.displayHeight;
        ice.setPosition(centerX, centerY);
      }
    });
  }

  private unfreezeGift(gift: FrozenGift): void {
    gift.setData('frozen', false);
    const ice = gift.getData('ice');
    if (ice) {
      ice.destroy();
      gift.setData('ice', undefined);
      this.iceOverlays?.remove(ice);
    }
  }

  private destroyFrozenGift(gift: FrozenGift): void {
    const ice = gift.getData('ice');
    if (ice) {
      ice.destroy();
      this.iceOverlays?.remove(ice);
    }
    gift.destroy();
  }

  private applySnowballWind(): void {
    if (!this.snowballs) {
      return;
    }

    const now = this.context.scene.time.now;
    this.snowballs.getChildren().forEach((child) => {
      const snowball = child as Phaser.Physics.Arcade.Image;
      if (!snowball.body) {
        return;
      }
      const nextChange = snowball.getData('windNextChange') as number | undefined;
      if (nextChange !== undefined && now < nextChange) {
        return;
      }

      const yVelocity = Phaser.Math.Between(this.config.wind.yMin, this.config.wind.yMax);
      const xVelocity = -(this.config.snowballBaseSpeed + Phaser.Math.Between(-this.config.wind.xJitter, this.config.wind.xJitter));
      (snowball.body as Phaser.Physics.Arcade.Body).setVelocity(xVelocity, yVelocity);
      snowball.setData('windNextChange', now + this.config.wind.changeInterval + Phaser.Math.Between(-80, 80));
    });
  }

  private cullGifts(): void {
    if (!this.gifts) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    this.gifts.getChildren().forEach((child) => {
      const gift = child as FrozenGift;
      if (gift.x < bounds.left - 40) {
        this.destroyFrozenGift(gift);
      }
    });
  }

  private cullStars(): void {
    if (!this.stars) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    this.stars.getChildren().forEach((child) => {
      const star = child as Phaser.Physics.Arcade.Image;
      if (star.x < bounds.left - 40) {
        star.destroy();
      }
    });
  }

  private cullStarShots(): void {
    if (!this.starShots) {
      return;
    }

    const bounds = this.context.scene.physics.world.bounds;
    this.starShots.getChildren().forEach((child) => {
      const shot = child as Phaser.Physics.Arcade.Image;
      if (
        shot.x < bounds.left - 40 ||
        shot.x > bounds.right + 40 ||
        shot.y < bounds.top - 40 ||
        shot.y > bounds.bottom + 40
      ) {
        shot.destroy();
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

  private cleanupAll(): void {
    this.colliders.forEach((collider) => collider.destroy());
    this.colliders = [];
    this.spawnGiftTimer?.remove(false);
    this.spawnGiftTimer = undefined;
    this.spawnStarTimer?.remove(false);
    this.spawnStarTimer = undefined;
    this.spawnSnowballTimer?.remove(false);
    this.spawnSnowballTimer = undefined;

    this.gifts?.getChildren().forEach((child) => {
      this.destroyFrozenGift(child as FrozenGift);
    });
    this.gifts?.clear(true, true);
    this.gifts = undefined;

    this.iceOverlays?.clear(true, true);
    this.iceOverlays = undefined;

    this.stars?.clear(true, true);
    this.stars = undefined;

    this.starShots?.clear(true, true);
    this.starShots = undefined;

    this.snowballs?.clear(true, true);
    this.snowballs = undefined;
    this.hitSound?.destroy();
    this.hitSound = undefined;
    this.sadMeow1?.destroy();
    this.sadMeow1 = undefined;
    this.sadMeow2?.destroy();
    this.sadMeow2 = undefined;
    this.pickStarSound?.destroy();
    this.pickStarSound = undefined;
    this.starShootSound?.destroy();
    this.starShootSound = undefined;
    this.iceBreakSound?.destroy();
    this.iceBreakSound = undefined;

    EventBus.off(GameEvents.SHOOT_REQUEST, this.handleShootRequest, this);

    if (this.shootKey) {
      this.context.scene.input.keyboard?.removeKey(this.shootKey);
      this.shootKey = undefined;
    }
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

  private ensureIceTexture(): void {
    if (this.context.scene.textures.exists('ice')) {
      return;
    }

    const graphics = this.context.scene.add.graphics();
    graphics.fillStyle(0x6ecbff, 0.45);
    graphics.fillCircle(22, 22, 22);
    graphics.lineStyle(2, 0xb8e4ff, 0.9);
    graphics.strokeCircle(22, 22, 22);
    graphics.generateTexture('ice', 44, 44);
    graphics.destroy();
  }

  private ensureStarTexture(): void {
    if (this.context.scene.textures.exists('star')) {
      return;
    }

    const graphics = this.context.scene.add.graphics();
    const points = this.createStarPoints(16, 16, 5, 6.4, 14);
    graphics.fillStyle(0xfff0a6, 1);
    graphics.fillPoints(points, true);
    graphics.lineStyle(1, 0xffd36a, 1);
    graphics.strokePoints(points, true);
    graphics.generateTexture('star', 32, 32);
    graphics.destroy();
  }

  private createStarPoints(
    cx: number,
    cy: number,
    pointsCount: number,
    innerRadius: number,
    outerRadius: number
  ): Phaser.Math.Vector2[] {
    const points: Phaser.Math.Vector2[] = [];
    const step = Math.PI / pointsCount;
    let angle = -Math.PI / 2;
    for (let i = 0; i < pointsCount * 2; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      points.push(new Phaser.Math.Vector2(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius
      ));
      angle += step;
    }
    return points;
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
