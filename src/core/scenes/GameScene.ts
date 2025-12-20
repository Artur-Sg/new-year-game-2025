import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
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

  constructor() {
    super(SceneKeys.GAME);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0f1d');
    this.spawnBackdrop();

    this.player = new Player(
      this,
      new Phaser.Math.Vector2(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    );

    this.inputSystem = new InputSystem(this);

    const bounds = new Phaser.Geom.Rectangle(64, 64, GAME_WIDTH - 128, GAME_HEIGHT - 128);
    this.collectibles = new CollectibleField(this, bounds);
    this.collectibles.spawn(10);
    this.collectibles.bindToTarget(this.player.getCollider(), () => {
      const newScore = this.state.addScore(10);
      EventBus.emit(GameEvents.SCORE_UPDATED, newScore);
    });

    this.state.start();
    EventBus.emit(GameEvents.READY);
    EventBus.emit(GameEvents.SCORE_UPDATED, this.state.getScore());

    this.layout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    });
  }

  update(): void {
    const direction = this.inputSystem.getDirectionVector();
    this.player.update(direction);

    const elapsed = this.state.updateTime();
    const seconds = Math.floor(elapsed / 1000);
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds;
      EventBus.emit(GameEvents.TIMER_UPDATED, this.state.getElapsedSeconds());
    }
  }

  private spawnBackdrop(): void {
    this.backdropZone = this.add.zone(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    const particles = this.add.particles(0xffe066);

    this.backdropEmitter = particles.createEmitter({
      x: this.backdropZone.x,
      y: this.backdropZone.y,
      quantity: 2,
      lifespan: { min: 1200, max: 2400 },
      speed: { min: 10, max: 40 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitZone: {
        source: new Phaser.Geom.Rectangle(
          -this.backdropZone.width / 2,
          -this.backdropZone.height / 2,
          this.backdropZone.width,
          this.backdropZone.height
        ),
      },
    });

    this.backdropFrame = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 24,
      GAME_HEIGHT - 24,
      0x0f162a,
      0.6
    );
    this.backdropFrame.setStrokeStyle(4, 0xffe066, 0.8);
  }

  private layout(width: number, height: number): void {
    this.physics.world.setBounds(32, 32, width - 64, height - 64);
    if (this.player) {
      const collider = this.player.getCollider();
      const bounds = this.physics.world.bounds;
      collider.setPosition(
        Phaser.Math.Clamp(collider.x, bounds.left + 16, bounds.right - 16),
        Phaser.Math.Clamp(collider.y, bounds.top + 16, bounds.bottom - 16)
      );
    }

    this.backdropZone.setPosition(width / 2, height / 2);
    this.backdropZone.setSize(width, height);
    this.backdropEmitter.setPosition(this.backdropZone.x, this.backdropZone.y);
    this.backdropEmitter.setEmitZone({
      source: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    });

    this.backdropFrame.setPosition(width / 2, height / 2);
    this.backdropFrame.setSize(width - 24, height - 24);

    this.collectibles.setBounds(new Phaser.Geom.Rectangle(64, 64, width - 128, height - 128));
  }
}
