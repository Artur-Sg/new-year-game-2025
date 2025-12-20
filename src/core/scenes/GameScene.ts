import Phaser from 'phaser';
import { LEVEL_ONE_TARGET } from '../config/gameConfig';
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
  private debugKeyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super(SceneKeys.GAME);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0f1d');
    this.levelCompleted = false;
    this.level = 1;
    this.spawnBackdrop();
    this.createCatAnimations();

    this.player = new Player(
      this,
      new Phaser.Math.Vector2(this.scale.width / 2, this.scale.height / 2)
    );

    this.inputSystem = new InputSystem(this);

    const bounds = new Phaser.Geom.Rectangle(
      64,
      64,
      this.scale.width - 128,
      this.scale.height - 128
    );
    this.collectibles = new CollectibleField(this, bounds);
    this.collectibles.spawn(this.giftsTarget);
    this.collectibles.bindToTarget(this.player.getCollider(), () => {
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
      emitZone: new Phaser.GameObjects.Particles.Zones.RandomZone(
        new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height)
      ),
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
      gift.body.setAllowGravity(false);
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
      new Phaser.GameObjects.Particles.Zones.RandomZone(
        new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height)
      )
    );

    this.backdropFrame.setPosition(width / 2, height / 2);
    this.backdropFrame.setSize(width - 24, height - 24);

    const playWidth = Math.max(120, width - 128);
    const playHeight = Math.max(120, height - 128);
    this.collectibles.setBounds(new Phaser.Geom.Rectangle(64, 64, playWidth, playHeight));
  }
}
