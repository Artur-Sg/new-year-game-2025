import Phaser from 'phaser';
import { LEVEL_ONE_TARGET } from '../config/gameConfig';
import { PlayerSkin } from '../config/playerSkins';
import { getActiveSkin, setActiveSkin } from '../state/playerSkinStore';
import { SceneKeys } from '../constants/SceneKeys';
import { GameEvents } from '../constants/GameEvents';
import { EventBus } from '../events/EventBus';
import { Player } from '../entities/Player';
import { registerCatHeroAnimations } from '../characters/skins/catHeroAnimations';
import { registerXmascatAnimations } from '../characters/skins/xmascatAnimations';
import { Level } from '../levels/Level';
import { Level1 } from '../levels/Level1';
import { Level2 } from '../levels/Level2';
import { Level3 } from '../levels/Level3';
import { Level4 } from '../levels/Level4';
import { InputSystem } from '../systems/InputSystem';
import { GameState } from '../state/GameState';
import { BackdropEffect } from '../effects/BackdropEffect';
import { TrailEffect } from '../effects/TrailEffect';
import { getActiveLevelId, setActiveLevelId, unlockLevel } from '../state/levelStore';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private currentLevel?: Level;
  private currentLevelId = 1;
  private state = new GameState();
  private lastSecond = 0;
  private backdropEffect!: BackdropEffect;
  private giftsTarget = LEVEL_ONE_TARGET;
  private levelCompleted = false;
  private level = 1;
  private trailEffect!: TrailEffect;
  private playerSkin: PlayerSkin = getActiveSkin();
  private debugKeyHandler?: (event: KeyboardEvent) => void;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;

  constructor() {
    super(SceneKeys.GAME);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0f1d');
    this.levelCompleted = false;
    this.playerSkin = getActiveSkin();
    this.backdropEffect = new BackdropEffect(this);
    this.backdropEffect.create();
    registerCatHeroAnimations(this.anims);
    registerXmascatAnimations(this.anims);

    this.player = new Player(
      this,
      new Phaser.Math.Vector2(this.scale.width / 2, this.scale.height / 2),
      this.playerSkin
    );
    this.trailEffect = new TrailEffect(this);
    this.trailEffect.create(this.player.getCollider(), this.playerSkin);

    this.inputSystem = new InputSystem(this);

    this.state.start();
    EventBus.emit(GameEvents.READY);
    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });
    this.startLevel(getActiveLevelId());

    this.layout(this.scale.width, this.scale.height);
    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', this.resizeHandler);

    EventBus.on(GameEvents.LEVEL_NEXT, this.handleNextLevel, this);
    EventBus.on(GameEvents.GAME_OVER, this.handleGameOver, this);
    this.debugKeyHandler = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) {
        return;
      }

      const key = event.key;
      const code = event.code;
      const isKeyK = code === 'KeyK' || key === 'k' || key === 'K' || key === 'л' || key === 'Л';
      const isKey1 = code === 'Digit1' || code === 'Numpad1' || key === '1';
      const isKey2 = code === 'Digit2' || code === 'Numpad2' || key === '2';
      const isKey3 = code === 'Digit3' || code === 'Numpad3' || key === '3';
      const isKey4 = code === 'Digit4' || code === 'Numpad4' || key === '4';

      if (isKey1) {
        this.startLevel(1);
      } else if (isKey2) {
        this.startLevel(2);
      } else if (isKey3) {
        this.startLevel(3);
      } else if (isKey4) {
        this.startLevel(4);
      } else if (isKeyK) {
        const nextSkin = getActiveSkin() === 'cat-hero' ? 'xmascat' : 'cat-hero';
        setActiveSkin(nextSkin);
        this.playerSkin = nextSkin;
        this.cleanupBeforeRestart();
        this.scene.restart();
      }
    };
    this.input.keyboard?.on('keydown', this.debugKeyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.LEVEL_NEXT, this.handleNextLevel, this);
      EventBus.off(GameEvents.GAME_OVER, this.handleGameOver, this);
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
      }
      if (this.debugKeyHandler) {
        this.input.keyboard?.off('keydown', this.debugKeyHandler);
      }
    });
  }

  update(): void {
    const direction = this.inputSystem.getDirectionVector();
    this.player.setForcedAnimation(null);
    this.player.update(direction);
    this.trailEffect.update(direction);
    this.currentLevel?.update();

    const elapsed = this.state.updateTime();
    const seconds = Math.floor(elapsed / 1000);
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds;
      EventBus.emit(GameEvents.TIMER_UPDATED, this.state.getElapsedSeconds());
    }
  }

  private handleNextLevel(): void {
    this.startLevel(this.currentLevelId + 1);
  }

  private startLevel(id: number): void {
    setActiveLevelId(id);
    this.currentLevelId = id;
    this.level = id;
    this.levelCompleted = false;
    this.state.start();
    this.state.setLives(id === 4 ? 3 : 0);
    EventBus.emit(GameEvents.LIVES_UPDATED, { lives: this.state.getLives() });
    this.lastSecond = 0;
    EventBus.emit(GameEvents.TIMER_UPDATED, 0);
    this.player.resetPosition();
    this.player.setForcedAnimation(null);

    this.currentLevel?.destroy();

    const level = this.createLevel(id);
    this.currentLevel = level;
    level.start();

    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });
  }

  private createLevel(id: number): Level {
    const context = {
      scene: this,
      player: this.player.getCollider() as Phaser.Types.Physics.Arcade.GameObjectWithBody,
      target: this.giftsTarget,
      addScore: (amount: number) => this.state.addScore(amount),
      loseLife: () => this.state.loseLife(),
      getLives: () => this.state.getLives(),
    };

    const hooks = {
      onScore: (score: number) => {
        EventBus.emit(GameEvents.SCORE_UPDATED, { current: score, target: this.giftsTarget });
      },
      onComplete: () => {
        this.levelCompleted = true;
        const nextLevel = this.level + 1;
        if (nextLevel <= 4) {
          unlockLevel(nextLevel);
        }
        EventBus.emit(GameEvents.LEVEL_COMPLETED, { level: this.level });
      },
    };

    this.ensureGiftTexture();

    if (id === 1) {
      return new Level1(context, hooks);
    }

    if (id === 2) {
      return new Level2(context, hooks);
    }

    if (id === 3) {
      return new Level3(context, hooks);
    }

    return new Level4(context, hooks);
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

  private layout(width: number, height: number): void {
    if (!this.physics || !this.physics.world) {
      return;
    }
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

    this.backdropEffect.resize(width, height);

    this.currentLevel?.resize(width, height);
  }

  private cleanupBeforeRestart(): void {
    this.currentLevel?.destroy();
    this.currentLevel = undefined;
    this.trailEffect?.destroy();
    this.backdropEffect?.destroy();
  }

  private handleGameOver(): void {
    this.currentLevel?.destroy();
    this.currentLevel = undefined;
    this.physics.pause();
    this.scene.pause();
  }
}
