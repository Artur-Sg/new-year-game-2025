import Phaser from 'phaser';
import { LEVEL_ONE_TARGET } from '../config/gameConfig';
import { PlayerSkin } from '../config/playerSkins';
import { getActiveSkin, setActiveSkin } from '../state/playerSkinStore';
import { SceneKeys } from '../constants/SceneKeys';
import { GameEvents } from '../constants/GameEvents';
import { EventBus } from '../events/EventBus';
import { Player } from '../entities/Player';
import { CollectibleField } from '../systems/CollectibleField';
import { InputSystem } from '../systems/InputSystem';
import { GameState } from '../state/GameState';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private collectibles!: CollectibleField;
  private state = new GameState();
  private lastSecond = 0;
  private backdropZone!: Phaser.GameObjects.Zone;
  private backdropEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private backdropFrame!: Phaser.GameObjects.Rectangle;
  private giftsTarget = LEVEL_ONE_TARGET;
  private levelCompleted = false;
  private level = 1;
  private levelTwoGifts?: Phaser.Physics.Arcade.Group;
  private levelTwoSpawnTimer?: Phaser.Time.TimerEvent;
  private levelTwoGiftSpeed = 220;
  private rainbowTrails: Array<{
    emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    sideOffset: number;
  }> = [];
  private rainbowTrailActive = false;
  private rainbowDirection = new Phaser.Math.Vector2(1, 0);
  private rainbowJitter = new Phaser.Math.Vector2(0, 0);
  private rainbowJitterTarget = new Phaser.Math.Vector2(0, 0);
  private lastRainbowJitterAt = 0;
  private rainbowIsSnow = false;
  private lastSnowEmitAt = 0;
  private playerSkin: PlayerSkin = getActiveSkin();
  private debugKeyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super(SceneKeys.GAME);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0f1d');
    this.levelCompleted = false;
    this.level = 1;
    this.playerSkin = getActiveSkin();
    this.spawnBackdrop();
    this.createCatAnimations();
    this.createXmasCatAnimations();

    this.player = new Player(
      this,
      new Phaser.Math.Vector2(this.scale.width / 2, this.scale.height / 2),
      this.playerSkin
    );
    this.createRainbowTrail();

    this.inputSystem = new InputSystem(this);

    const bounds = new Phaser.Geom.Rectangle(
      64,
      64,
      this.scale.width - 128,
      this.scale.height - 128
    );
    this.collectibles = new CollectibleField(this, bounds);
    this.collectibles.spawn(this.giftsTarget);
    this.collectibles.bindToTarget(
      this.player.getCollider() as Phaser.Types.Physics.Arcade.GameObjectWithBody,
      () => {
      const newScore = this.state.addScore(1);
      EventBus.emit(GameEvents.SCORE_UPDATED, { current: newScore, target: this.giftsTarget });
      if (!this.levelCompleted && newScore >= this.giftsTarget) {
        this.levelCompleted = true;
        this.collectibles.clear();
        EventBus.emit(GameEvents.LEVEL_COMPLETED, { level: this.level });
      }
    });

    this.state.start();
    EventBus.emit(GameEvents.READY);
    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });

    this.layout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    });

    EventBus.on(GameEvents.LEVEL_NEXT, this.handleNextLevel, this);
    this.debugKeyHandler = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.shiftKey) {
        return;
      }

      if (event.code === 'Digit1') {
        this.startLevelOne();
      } else if (event.code === 'Digit2') {
        this.startLevelTwo();
      } else if (event.code === 'KeyK') {
        setActiveSkin(this.playerSkin === 'cat-hero' ? 'xmascat' : 'cat-hero');
        this.scene.restart();
      }
    };
    this.input.keyboard?.on('keydown', this.debugKeyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.LEVEL_NEXT, this.handleNextLevel, this);
      if (this.debugKeyHandler) {
        this.input.keyboard?.off('keydown', this.debugKeyHandler);
      }
    });
  }

  update(): void {
    const direction = this.inputSystem.getDirectionVector();
    if (this.level === 2) {
      this.cullLevelTwoGifts();
    }
    this.player.setForcedAnimation(null);
    this.player.update(direction);
    this.updateRainbowTrail(direction);

    const elapsed = this.state.updateTime();
    const seconds = Math.floor(elapsed / 1000);
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds;
      EventBus.emit(GameEvents.TIMER_UPDATED, this.state.getElapsedSeconds());
    }
  }

  private spawnBackdrop(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    this.backdropZone = this.add.zone(width / 2, height / 2, width, height);
    this.ensureSparkTexture();

    this.backdropEmitter = this.add.particles(this.backdropZone.x, this.backdropZone.y, 'spark', {
      quantity: 2,
      lifespan: { min: 1200, max: 2400 },
      speed: { min: 10, max: 40 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitZone: this.createRandomZone(width, height),
    });

    this.backdropFrame = this.add.rectangle(
      width / 2,
      height / 2,
      width - 24,
      height - 24,
      0x0f162a,
      0.6
    );
    this.backdropFrame.setStrokeStyle(4, 0xffe066, 0.8);
  }

  private handleNextLevel(): void {
    if (this.level === 1) {
      this.startLevelTwo();
    } else if (this.level === 2) {
      this.startLevelThree();
    }
  }

  private startLevelOne(): void {
    this.level = 1;
    this.levelCompleted = false;
    this.state.start();
    this.lastSecond = 0;
    EventBus.emit(GameEvents.TIMER_UPDATED, 0);

    this.collectibles.clear();
    this.collectibles.spawn(this.giftsTarget);
    this.levelTwoSpawnTimer?.remove(false);
    this.levelTwoGifts?.clear(true, true);

    this.player.resetPosition();
    this.player.setForcedAnimation(null);

    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });
  }

  private startLevelTwo(): void {
    this.level = 2;
    this.levelCompleted = false;
    this.levelTwoGiftSpeed = 220;
    this.state.start();
    this.lastSecond = 0;
    EventBus.emit(GameEvents.TIMER_UPDATED, 0);

    this.collectibles.clear();
    this.levelTwoGifts?.clear(true, true);
    this.levelTwoSpawnTimer?.remove(false);

    this.player.resetPosition();
    this.player.setForcedAnimation(null);

    this.levelTwoGifts = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.physics.add.overlap(this.player.getCollider(), this.levelTwoGifts, (_player, gift) => {
      gift.destroy();
      const newScore = this.state.addScore(1);
      EventBus.emit(GameEvents.SCORE_UPDATED, { current: newScore, target: this.giftsTarget });
      if (!this.levelCompleted && newScore >= this.giftsTarget) {
        this.levelCompleted = true;
        this.levelTwoSpawnTimer?.remove(false);
        this.levelTwoGifts?.clear(true, true);
        EventBus.emit(GameEvents.LEVEL_COMPLETED, { level: this.level });
      }
    });

    this.levelTwoSpawnTimer = this.time.addEvent({
      delay: 700,
      loop: true,
      callback: this.spawnLevelTwoGift,
      callbackScope: this,
    });
    this.spawnLevelTwoGift();

    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });
  }

  private startLevelThree(): void {
    this.level = 3;
    this.levelCompleted = false;
    this.levelTwoGiftSpeed = 280;
    this.state.start();
    this.lastSecond = 0;
    EventBus.emit(GameEvents.TIMER_UPDATED, 0);

    this.collectibles.clear();
    this.levelTwoSpawnTimer?.remove(false);
    this.levelTwoGifts?.clear(true, true);

    this.player.resetPosition();
    this.player.setForcedAnimation(null);

    this.levelTwoGifts = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.physics.add.overlap(this.player.getCollider(), this.levelTwoGifts, (_player, gift) => {
      gift.destroy();
      const newScore = this.state.addScore(1);
      EventBus.emit(GameEvents.SCORE_UPDATED, { current: newScore, target: this.giftsTarget });
      if (!this.levelCompleted && newScore >= this.giftsTarget) {
        this.levelCompleted = true;
        this.levelTwoSpawnTimer?.remove(false);
        this.levelTwoGifts?.clear(true, true);
        EventBus.emit(GameEvents.LEVEL_COMPLETED, { level: this.level });
      }
    });

    this.levelTwoSpawnTimer = this.time.addEvent({
      delay: 600,
      loop: true,
      callback: this.spawnLevelTwoGift,
      callbackScope: this,
    });
    this.spawnLevelTwoGift();

    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });
  }

  private spawnLevelTwoGift(): void {
    if (!this.levelTwoGifts) {
      return;
    }

    this.ensureGiftTexture();

    const bounds = this.physics.world.bounds;
    const x = bounds.right + 24;
    const y = Phaser.Math.Between(bounds.top + 40, bounds.bottom - 40);
    const color = Phaser.Utils.Array.GetRandom([0xff5b6c, 0x5bd1ff, 0x7cff75, 0xffd86c]);
    const gift = this.levelTwoGifts.create(x, y, 'gift') as Phaser.Physics.Arcade.Image;
    gift.setTint(color);
    gift.setScale(1);
    gift.setDepth(2);
    gift.setActive(true);
    gift.setVisible(true);
    gift.setVelocity(-this.levelTwoGiftSpeed, 0);

    if (gift.body) {
      (gift.body as Phaser.Physics.Arcade.Body).allowGravity = false;
    }
  }

  private cullLevelTwoGifts(): void {
    if (!this.levelTwoGifts) {
      return;
    }

    const bounds = this.physics.world.bounds;
    this.levelTwoGifts.getChildren().forEach((gift) => {
      const rect = gift as Phaser.GameObjects.Rectangle;
      if (rect.x < bounds.left - 40) {
        rect.destroy();
      }
    });
  }

  private ensureSparkTexture(): void {
    if (this.textures.exists('spark')) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 2, 2);
    graphics.generateTexture('spark', 2, 2);
    graphics.destroy();
  }

  private ensureGiftTexture(): void {
    if (this.textures.exists('gift')) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, 16, 16, 3);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRoundedRect(1, 1, 14, 14, 3);
    graphics.generateTexture('gift', 16, 16);
    graphics.destroy();
  }

  private ensureSnowStarTexture(): void {
    if (this.textures.exists('snow-star')) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 3);
    graphics.fillRect(3, 0, 2, 8);
    graphics.fillRect(0, 3, 8, 2);
    graphics.generateTexture('snow-star', 8, 8);
    graphics.destroy();
  }

  private ensureRainbowTexture(): void {
    if (this.textures.exists('rainbow-pixel')) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 12, 4);
    graphics.generateTexture('rainbow-pixel', 12, 4);
    graphics.destroy();
  }

  private createRandomZone(width: number, height: number): Phaser.GameObjects.Particles.Zones.RandomZone {
    return new Phaser.GameObjects.Particles.Zones.RandomZone({
      getRandomPoint: (point?: Phaser.Types.Math.Vector2Like) => {
        const target = point ?? { x: 0, y: 0 };
        target.x = Phaser.Math.Between(-width / 2, width / 2);
        target.y = Phaser.Math.Between(-height / 2, height / 2);
        return target;
      },
    });
  }

  private createRainbowTrail(): void {
    this.rainbowIsSnow = this.playerSkin === 'cat-hero';
    if (this.rainbowIsSnow) {
      this.ensureSnowStarTexture();
    } else {
      this.ensureRainbowTexture();
    }
    this.rainbowTrails.forEach((trail) => trail.emitter.destroy());
    this.rainbowTrails = [];

    const sprite = this.player.getCollider();
    const colors = this.rainbowIsSnow
      ? [0xffffff, 0xffffff, 0xffffff, 0xffffff]
      : [0xff3b3b, 0xff9f1a, 0xffe600, 0x3bff5b, 0x2fd1ff, 0x5f6bff, 0xb36bff];
    const stripeGap = this.rainbowIsSnow
      ? Math.max(3, sprite.displayHeight * 0.1)
      : Math.max(4, sprite.displayHeight * 0.08);
    const offsets = colors.map((_, index) => (index - (colors.length - 1) / 2) * stripeGap);
    const textureKey = this.rainbowIsSnow ? 'snow-star' : 'rainbow-pixel';

    this.rainbowTrails = colors.map((color, index) => {
      const emitter = this.add.particles(0, 0, textureKey, {
        lifespan: this.rainbowIsSnow ? { min: 900, max: 1500 } : { min: 900, max: 1400 },
        alpha: this.rainbowIsSnow
          ? {
              onEmit: (particle) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowAlpha?: number };
                p.snowAlpha = Phaser.Math.FloatBetween(0.35, 0.8);
                return p.snowAlpha;
              },
              onUpdate: (particle, _key, t, value) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowAlpha?: number };
                const base = p.snowAlpha ?? value;
                return base * (1 - t);
              },
            }
          : { start: 0.9, end: 0 },
        scaleX: this.rainbowIsSnow
          ? {
              onEmit: (particle) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                if (p.snowScale === undefined) {
                  p.snowScale = Phaser.Math.FloatBetween(0.4, 1.6);
                }
                return p.snowScale;
              },
              onUpdate: (particle, _key, t, value) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                const base = p.snowScale ?? value;
                return base * (1 - t);
              },
            }
          : undefined,
        scaleY: this.rainbowIsSnow
          ? {
              onEmit: (particle) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                if (p.snowScale === undefined) {
                  p.snowScale = Phaser.Math.FloatBetween(0.4, 1.6);
                }
                return p.snowScale;
              },
              onUpdate: (particle, _key, t, value) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                const base = p.snowScale ?? value;
                return base * (1 - t);
              },
            }
          : undefined,
        scale: this.rainbowIsSnow ? undefined : { start: 1, end: 0.2 },
        quantity: this.rainbowIsSnow ? 2 : 1,
        frequency: this.rainbowIsSnow ? 45 : 10,
        delay: this.rainbowIsSnow ? { min: 0, max: 220 } : 0,
        tint: color,
        blendMode: 'NORMAL',
        radial: false,
      });
      emitter.setDepth(1);
      emitter.tintFill = true;
      emitter.emitting = false;
      emitter.setVisible(false);
      return { emitter, sideOffset: offsets[index] };
    });
    this.rainbowTrailActive = false;
  }

  private updateRainbowTrail(direction: Phaser.Math.Vector2): void {
    if (this.rainbowTrails.length === 0) {
      return;
    }

    const moving = direction.lengthSq() > 0;
    if (this.rainbowTrailActive !== moving) {
      this.rainbowTrailActive = moving;
      this.rainbowTrails.forEach((trail) => {
        trail.emitter.emitting = moving && !this.rainbowIsSnow;
        trail.emitter.setVisible(moving);
      });
    }

    if (!moving) {
      return;
    }

    const nextDir = direction.clone().normalize();
    const dot = this.rainbowDirection.dot(nextDir);
    if (dot < -0.4) {
      this.rainbowDirection.copy(nextDir);
    } else {
      this.rainbowDirection.lerp(nextDir, 0.25);
      this.rainbowDirection.normalize();
    }

    const sprite = this.player.getCollider();
    const back = this.rainbowDirection.clone().scale(-sprite.displayWidth * 0.12);
    const side = new Phaser.Math.Vector2(-this.rainbowDirection.y, this.rainbowDirection.x);
    const baseSpeed = 140;
    const trailSpeed = this.rainbowDirection.clone().scale(-baseSpeed);
    if (!this.rainbowIsSnow) {
      const now = this.time.now;
      if (now - this.lastRainbowJitterAt > 120) {
        this.lastRainbowJitterAt = now;
        this.rainbowJitterTarget.set(
          Phaser.Math.Between(-2, 2),
          Phaser.Math.Between(-2, 2)
        );
      }
      this.rainbowJitter.lerp(this.rainbowJitterTarget, 0.1);
    } else {
      this.rainbowJitter.set(0, 0);
      this.rainbowJitterTarget.set(0, 0);
    }

    if (this.rainbowIsSnow) {
      const now = this.time.now;
      if (now - this.lastSnowEmitAt < 70) {
        return;
      }
      this.lastSnowEmitAt = now;
      this.rainbowTrails.forEach((trail) => {
        const startOffset = Phaser.Math.Between(
          Math.floor(-sprite.displayHeight * 0.25),
          Math.floor(sprite.displayHeight * 0.25)
        );
        const x = sprite.x + back.x + side.x * (trail.sideOffset + startOffset);
        const y = sprite.y + back.y + side.y * (trail.sideOffset + startOffset);
        trail.emitter.speedX = trailSpeed.x;
        trail.emitter.speedY = trailSpeed.y;
        trail.emitter.emitParticleAt(x, y, 1);
      });
      return;
    }

    this.rainbowTrails.forEach((trail) => {
      const x = sprite.x + back.x + side.x * trail.sideOffset + this.rainbowJitter.x;
      const y = sprite.y + back.y + side.y * trail.sideOffset + this.rainbowJitter.y;
      trail.emitter.setPosition(x, y);
      trail.emitter.speedX = trailSpeed.x;
      trail.emitter.speedY = trailSpeed.y;
    });
  }

  private createCatAnimations(): void {
    if (this.anims.exists('cat-idle')) {
      return;
    }

    const columns = 10;
    this.anims.create({
      key: 'cat-idle',
      frames: this.anims.generateFrameNumbers('cat-hero', { start: 0, end: 9 }),
      frameRate: 10,
      repeat: -1,
    });
    this.anims.create({
      key: 'cat-forward',
      frames: this.anims.generateFrameNumbers('cat-hero', { start: columns, end: columns + 1 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'cat-backward',
      frames: this.anims.generateFrameNumbers('cat-hero', { start: columns * 2, end: columns * 2 + 2 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'cat-down',
      frames: this.anims.generateFrameNumbers('cat-hero', { start: columns * 3, end: columns * 3 + 3 }),
      frameRate: 8,
      repeat: -1,
    });
    this.anims.create({
      key: 'cat-up',
      frames: this.anims.generateFrameNumbers('cat-hero', { start: columns * 4, end: columns * 4 + 2 }),
      frameRate: 8,
      repeat: -1,
    });
  }

  private createXmasCatAnimations(): void {
    if (this.anims.exists('xmascat-fly')) {
      return;
    }

    this.anims.create({
      key: 'xmascat-fly',
      frames: this.anims.generateFrameNumbers('xmascat', { start: 0, end: 11 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  private layout(width: number, height: number): void {
    const worldWidth = Math.max(200, width - 64);
    const worldHeight = Math.max(200, height - 64);
    this.physics.world.setBounds(32, 32, worldWidth, worldHeight);
    if (this.player) {
      const collider = this.player.getCollider();
      const bounds = this.physics.world.bounds;
      const body = collider.body as Phaser.Physics.Arcade.Body;
      const halfWidth = body.width / 2;
      const halfHeight = body.height / 2;
      collider.setPosition(
        Phaser.Math.Clamp(collider.x, bounds.left + halfWidth, bounds.right - halfWidth),
        Phaser.Math.Clamp(collider.y, bounds.top + halfHeight, bounds.bottom - halfHeight)
      );
    }

    this.backdropZone.setPosition(width / 2, height / 2);
    this.backdropZone.setSize(width, height);
    this.backdropEmitter.setPosition(this.backdropZone.x, this.backdropZone.y);
    this.backdropEmitter.setEmitZone(
      this.createRandomZone(width, height)
    );

    this.backdropFrame.setPosition(width / 2, height / 2);
    this.backdropFrame.setSize(width - 24, height - 24);

    const playWidth = Math.max(120, width - 128);
    const playHeight = Math.max(120, height - 128);
    this.collectibles.setBounds(new Phaser.Geom.Rectangle(64, 64, playWidth, playHeight));
  }
}
