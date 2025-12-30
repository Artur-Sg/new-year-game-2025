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
import { Level5 } from '../levels/Level5';
import { Level6 } from '../levels/Level6';
import { Level7 } from '../levels/Level7';
import { InputSystem } from '../systems/InputSystem';
import { GameState } from '../state/GameState';
import { BackdropEffect } from '../effects/BackdropEffect';
import { TrailEffect } from '../effects/TrailEffect';
import { ForegroundEffect } from '../effects/ForegroundEffect';
import { getActiveLevelId, setActiveLevelId, unlockLevel } from '../state/levelStore';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private inputSystem!: InputSystem;
  private currentLevel?: Level;
  private currentLevelId = 1;
  private state = new GameState();
  private lastSecond = 0;
  private backdropEffect!: BackdropEffect;
  private foregroundEffect!: ForegroundEffect;
  private giftsTarget = LEVEL_ONE_TARGET;
  private levelCompleted = false;
  private level = 1;
  private trailEffect!: TrailEffect;
  private playerSkin: PlayerSkin = getActiveSkin();
  private debugKeyHandler?: (event: KeyboardEvent) => void;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private levelFilter?: Phaser.GameObjects.Rectangle;
  private readonly levelFilterAlpha = 0.28;
  private filterPhase = 0;
  private levelMusic?: Phaser.Sound.BaseSound;
  private levelMusicKey?: string;

  constructor() {
    super(SceneKeys.GAME);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0f1d');
    this.sound.stopByKey('bgm-menu');
    this.levelCompleted = false;
    this.playerSkin = getActiveSkin();
    this.backdropEffect = new BackdropEffect(this);
    this.backdropEffect.create();
    this.levelFilter = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1e2c5b, this.levelFilterAlpha);
    this.levelFilter.setOrigin(0, 0);
    this.levelFilter.setDepth(1);
    this.foregroundEffect = new ForegroundEffect(this);
    this.foregroundEffect.create();
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
      const isKey5 = code === 'Digit5' || code === 'Numpad5' || key === '5';
      const isKey6 = code === 'Digit6' || code === 'Numpad6' || key === '6';
      const isKey7 = code === 'Digit7' || code === 'Numpad7' || key === '7';

      if (isKey1) {
        this.startLevel(1);
      } else if (isKey2) {
        this.startLevel(2);
      } else if (isKey3) {
        this.startLevel(3);
      } else if (isKey4) {
        this.startLevel(4);
      } else if (isKey5) {
        this.startLevel(5);
      } else if (isKey6) {
        this.startLevel(6);
      } else if (isKey7) {
        this.startLevel(7);
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
      this.currentLevel?.destroy();
      this.currentLevel = undefined;
      this.levelMusic?.stop();
      this.levelMusic?.destroy();
      this.levelMusic = undefined;
      this.levelMusicKey = undefined;
      this.trailEffect?.destroy();
      this.backdropEffect?.destroy();
      this.levelFilter?.destroy();
      this.foregroundEffect?.destroy();
    });
  }

  update(_time: number, delta: number): void {
    const direction = this.inputSystem.getDirectionVector();
    this.player.setForcedAnimation(null);
    this.player.update(direction);
    this.backdropEffect.update(delta, direction);
    this.foregroundEffect.update(delta);
    this.trailEffect.update(direction);
    this.currentLevel?.update();
    this.updateDynamicFilter(delta);

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
    this.playLevelMusic(id);
    this.state.start();
    this.state.setLives(id === 4 || id === 6 || id === 7 ? 3 : 0);
    EventBus.emit(GameEvents.LIVES_UPDATED, { lives: this.state.getLives() });
    EventBus.emit(GameEvents.STARS_UPDATED, { stars: 0 });
    EventBus.emit(GameEvents.LEVEL_STARTED, { level: id });
    this.updateLevelFilter(id);
    this.lastSecond = 0;
    EventBus.emit(GameEvents.TIMER_UPDATED, 0);
    this.player.resetPosition();
    this.player.setForcedAnimation(null);
    this.foregroundEffect.reset();

    this.currentLevel?.destroy();

    const level = this.createLevel(id);
    this.currentLevel = level;
    level.start();

    EventBus.emit(GameEvents.SCORE_UPDATED, { current: this.state.getScore(), target: this.giftsTarget });
  }

  private createLevel(id: number): Level {
    const context = {
      scene: this,
      player: this.player.getCollider() as Phaser.Types.Physics.Arcade.GameObjectWithBody & Phaser.GameObjects.Components.Transform,
      target: this.giftsTarget,
      addScore: (amount: number) => this.state.addScore(amount),
      loseLife: () => this.state.loseLife(),
      addLife: (amount: number, maxLives: number) => this.state.addLife(amount, maxLives),
      getLives: () => this.state.getLives(),
    };

    const hooks = {
      onScore: (score: number) => {
        EventBus.emit(GameEvents.SCORE_UPDATED, { current: score, target: this.giftsTarget });
      },
      onComplete: () => {
        this.levelCompleted = true;
        const nextLevel = this.level + 1;
        if (nextLevel <= 7) {
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

    if (id === 4) {
      return new Level4(context, hooks);
    }

    if (id === 5) {
      return new Level5(context, hooks);
    }

    if (id === 6) {
      return new Level6(context, hooks);
    }

    return new Level7(context, hooks);
  }

  private ensureGiftTexture(): void {
    // Keep legacy fallback for development when gift images are missing.
    if (this.textures.exists('gift-1')) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRoundedRect(0, 0, 16, 16, 3);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRoundedRect(1, 1, 14, 14, 3);
    graphics.generateTexture('gift-1', 16, 16);
    graphics.generateTexture('gift-2', 16, 16);
    graphics.generateTexture('gift-3', 16, 16);
    graphics.generateTexture('gift-4', 16, 16);
    graphics.generateTexture('gift-5', 16, 16);
    graphics.generateTexture('gift-6', 16, 16);
    graphics.generateTexture('gift-7', 16, 16);
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
    this.foregroundEffect.resize(width, height);
    this.levelFilter?.setSize(width, height);

    this.currentLevel?.resize(width, height);
  }

  private cleanupBeforeRestart(): void {
    this.currentLevel?.destroy();
    this.currentLevel = undefined;
    this.trailEffect?.destroy();
    this.backdropEffect?.destroy();
    this.levelFilter?.destroy();
    this.foregroundEffect?.destroy();
  }

  private handleGameOver(): void {
    this.currentLevel?.destroy();
    this.currentLevel = undefined;
    this.sound.stopByKey('sfx-sad-meow-1');
    this.sound.stopByKey('sfx-sad-meow-2');
    this.physics.pause();
    this.scene.pause();
  }

  private updateLevelFilter(levelId: number): void {
    if (!this.levelFilter) {
      return;
    }

    const colors = [
      0x7fd7ff,
      0x6bb7ff,
      0x38c27c,
      0x2f6bff,
      0x7b4bff,
      0x7b00ff,
    ];
    const color = colors[(levelId - 1) % colors.length];
    this.levelFilter.setFillStyle(color, this.levelFilterAlpha);
  }

  private updateDynamicFilter(delta: number): void {
    if (!this.levelFilter || this.currentLevelId !== 7) {
      return;
    }

    this.filterPhase = (this.filterPhase + delta * 0.00006) % 1;
    const color = Phaser.Display.Color.HSVToRGB(this.filterPhase, 0.35, 0.85);
    this.levelFilter.setFillStyle(color.color, this.levelFilterAlpha);
  }

  private playLevelMusic(levelId: number): void {
    const key = `bgm-${levelId}`;
    if (this.levelMusicKey === key && this.levelMusic?.isPlaying) {
      return;
    }
    this.levelMusic?.stop();
    this.levelMusic?.destroy();
    this.levelMusic = this.sound.add(key, { loop: true, volume: 0.22 });
    this.levelMusic.play();
    this.levelMusicKey = key;
  }
}
