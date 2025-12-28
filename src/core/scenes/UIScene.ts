import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVEL_ONE_TARGET, getTextScale, toFont } from '../config/gameConfig';
import { GameEvents } from '../constants/GameEvents';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { getActiveLevelId, setActiveLevelId } from '../state/levelStore';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private lifeHearts: Phaser.GameObjects.Text[] = [];
  private starsText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Rectangle;
  private bannerCopy!: Phaser.GameObjects.Text;
  private levelCompleteText!: Phaser.GameObjects.Text;
  private levelCompleteModal!: Phaser.GameObjects.Container;
  private modalPanel!: Phaser.GameObjects.Rectangle;
  private modalMessage!: Phaser.GameObjects.Text;
  private modalButton!: Phaser.GameObjects.Text;
  private gameOverModal!: Phaser.GameObjects.Container;
  private gameOverMessage!: Phaser.GameObjects.Text;
  private gameOverButton!: Phaser.GameObjects.Text;
  private gameOverRetryButton!: Phaser.GameObjects.Text;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private pickSound?: Phaser.Sound.BaseSound;
  private successSound?: Phaser.Sound.BaseSound;
  private noLuckSound?: Phaser.Sound.BaseSound;
  private lastScore = 0;
  private readonly fontSizes = {
    hud: 20,
    banner: 16,
    levelComplete: 28,
    modalMessage: 20,
    modalButton: 16,
  };

  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    this.scoreText = this.add.text(32, 24, `Подарки: 0/${LEVEL_ONE_TARGET}`, {
      color: '#ffe066',
      font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
    });

    this.timerText = this.add.text(GAME_WIDTH - 32, 24, 'Время: 0с', {
      color: '#ffffff',
      font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
    });
    this.timerText.setOrigin(1, 0);

    this.livesText = this.add.text(GAME_WIDTH / 2, 24, 'Жизни: 3', {
      color: '#ffffff',
      font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
    });
    this.livesText.setOrigin(0.5, 0);
    this.livesText.setVisible(false);

    this.lifeHearts = Array.from({ length: 3 }, (_, index) => {
      const heart = this.add.text(GAME_WIDTH / 2 + index * 20, 24, '♥', {
        color: '#ff4d6d',
        font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
      });
      heart.setOrigin(0.5, 0);
      heart.setVisible(false);
      return heart;
    });

    this.starsText = this.add.text(GAME_WIDTH / 2, 54, 'Звёзды: 0', {
      color: '#ffe066',
      font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
    });
    this.starsText.setOrigin(0.5, 0);
    this.starsText.setVisible(false);

    this.createCallToAction();
    this.createLevelCompleteText();
    this.createLevelCompleteModal();
    this.createGameOverModal();
    this.setupAudio();
    this.layout(this.scale.width, this.scale.height);

    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', this.resizeHandler);

    EventBus.on(GameEvents.SCORE_UPDATED, this.updateScore, this);
    EventBus.on(GameEvents.TIMER_UPDATED, this.updateTimer, this);
    EventBus.on(GameEvents.LEVEL_COMPLETED, this.showLevelComplete, this);
    EventBus.on(GameEvents.LEVEL_STARTED, this.updateLevelBanner, this);
    EventBus.on(GameEvents.LIVES_UPDATED, this.updateLives, this);
    EventBus.on(GameEvents.STARS_UPDATED, this.updateStars, this);
    EventBus.on(GameEvents.GAME_OVER, this.showGameOver, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.SCORE_UPDATED, this.updateScore, this);
      EventBus.off(GameEvents.TIMER_UPDATED, this.updateTimer, this);
      EventBus.off(GameEvents.LEVEL_COMPLETED, this.showLevelComplete, this);
      EventBus.off(GameEvents.LEVEL_STARTED, this.updateLevelBanner, this);
      EventBus.off(GameEvents.LIVES_UPDATED, this.updateLives, this);
      EventBus.off(GameEvents.STARS_UPDATED, this.updateStars, this);
      EventBus.off(GameEvents.GAME_OVER, this.showGameOver, this);
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
      }
    });
  }

  private createCallToAction(): void {
    this.banner = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 36, 520, 64, 0x0f162a, 0.85);
    this.banner.setStrokeStyle(2, 0xffe066, 0.7);

    this.bannerCopy = this.add.text(this.banner.x, this.banner.y, '', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 480 },
      font: toFont(this.fontSizes.banner, getTextScale(this.scale.width, this.scale.height)),
    });
    this.bannerCopy.setOrigin(0.5);
    this.updateLevelBanner({ level: getActiveLevelId() });
  }

  private setupAudio(): void {
    this.pickSound = this.sound.add('sfx-pick', { volume: 0.6 });
    this.successSound = this.sound.add('sfx-success', { volume: 0.8 });
    this.noLuckSound = this.sound.add('sfx-no-luck', { volume: 0.8 });
  }

  private createLevelCompleteText(): void {
    this.levelCompleteText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Уровень 1 пройден!', {
      color: '#ffffff',
      align: 'center',
      font: toFont(this.fontSizes.levelComplete, getTextScale(this.scale.width, this.scale.height)),
    });
    this.levelCompleteText.setOrigin(0.5);
    this.levelCompleteText.setVisible(false);
  }

  private createLevelCompleteModal(): void {
    this.modalPanel = this.add.rectangle(0, 0, 520, 220, 0x0b0d1a, 0.95);
    this.modalPanel.setStrokeStyle(3, 0xffe066, 0.8);

    this.modalMessage = this.add.text(0, -36, 'Поздравляем, уровень пройден!', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 440 },
      font: toFont(this.fontSizes.modalMessage, getTextScale(this.scale.width, this.scale.height)),
    });
    this.modalMessage.setOrigin(0.5);

    this.modalButton = this.add.text(0, 48, 'Перейти на следующий', {
      color: '#0d0f1d',
      backgroundColor: '#ffe066',
      padding: { x: 16, y: 10 },
      font: toFont(this.fontSizes.modalButton, getTextScale(this.scale.width, this.scale.height)),
    });
    this.modalButton.setOrigin(0.5);
    this.modalButton.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.modalButton.setStyle({ backgroundColor: '#ffd447' }))
      .on('pointerout', () => this.modalButton.setStyle({ backgroundColor: '#ffe066' }))
      .on('pointerup', () => {
        this.levelCompleteModal.setVisible(false);
        this.levelCompleteText.setVisible(false);
        EventBus.emit(GameEvents.LEVEL_NEXT);
      });

    this.levelCompleteModal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.modalPanel,
      this.modalMessage,
      this.modalButton,
    ]);
    this.levelCompleteModal.setDepth(20);
    this.levelCompleteModal.setVisible(false);
  }

  private createGameOverModal(): void {
    const panel = this.add.rectangle(0, 0, 520, 220, 0x0b0d1a, 0.95);
    panel.setStrokeStyle(3, 0xff6b6b, 0.9);

    this.gameOverMessage = this.add.text(0, -36, 'Снежки попали 3 раза.\nИгра окончена!', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 440 },
      font: toFont(this.fontSizes.modalMessage, getTextScale(this.scale.width, this.scale.height)),
    });
    this.gameOverMessage.setOrigin(0.5);

    this.gameOverRetryButton = this.add.text(0, 48, 'Попробовать снова', {
      color: '#0d0f1d',
      backgroundColor: '#ffe066',
      padding: { x: 16, y: 10 },
      font: toFont(this.fontSizes.modalButton, getTextScale(this.scale.width, this.scale.height)),
    });
    this.gameOverRetryButton.setOrigin(0.5);
    this.gameOverRetryButton.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.gameOverRetryButton.setStyle({ backgroundColor: '#ffd447' }))
      .on('pointerout', () => this.gameOverRetryButton.setStyle({ backgroundColor: '#ffe066' }))
      .on('pointerup', () => {
        setActiveLevelId(getActiveLevelId());
        this.scene.stop(SceneKeys.GAME);
        this.scene.start(SceneKeys.GAME);
        this.scene.restart();
      });

    this.gameOverButton = this.add.text(0, 112, 'В меню', {
      color: '#0d0f1d',
      backgroundColor: '#ffe066',
      padding: { x: 16, y: 10 },
      font: toFont(this.fontSizes.modalButton, getTextScale(this.scale.width, this.scale.height)),
    });
    this.gameOverButton.setOrigin(0.5);
    this.gameOverButton.setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.gameOverButton.setStyle({ backgroundColor: '#ffd447' }))
      .on('pointerout', () => this.gameOverButton.setStyle({ backgroundColor: '#ffe066' }))
      .on('pointerup', () => {
        this.scene.stop(SceneKeys.GAME);
        this.scene.stop(SceneKeys.UI);
        this.scene.start(SceneKeys.MAIN_MENU);
      });

    this.gameOverModal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      panel,
      this.gameOverMessage,
      this.gameOverRetryButton,
      this.gameOverButton,
    ]);
    this.gameOverModal.setDepth(30);
    this.gameOverModal.setVisible(false);
  }

  private layout(width: number, height: number): void {
    this.updateTypography(getTextScale(width, height));
    this.scoreText.setPosition(32, 24);
    this.timerText.setPosition(width - 32, 24);
    this.livesText.setPosition(width / 2, 24);
    this.lifeHearts.forEach((heart, index) => {
      heart.setPosition(width / 2 + (index - 1) * 22, 24);
    });
    this.starsText.setPosition(width / 2, 54);

    const bannerWidth = Math.min(520, Math.max(320, width - 80));
    this.banner.setPosition(width / 2, height - 36);
    this.banner.setSize(bannerWidth, 64);
    this.bannerCopy.setPosition(this.banner.x, this.banner.y);
    this.bannerCopy.setWordWrapWidth(bannerWidth - 40);

    this.levelCompleteText.setPosition(width / 2, height / 2);

    const modalWidth = Math.min(560, Math.max(300, width - 80));
    const modalHeight = Math.min(240, Math.max(180, height - 140));
    this.modalPanel.setSize(modalWidth, modalHeight);
    this.modalMessage.setWordWrapWidth(modalWidth - 80);
    this.levelCompleteModal.setPosition(width / 2, height / 2);
    this.gameOverModal.setPosition(width / 2, height / 2);
  }

  private updateTypography(scale: number): void {
    this.scoreText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.timerText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.livesText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.lifeHearts.forEach((heart) => heart.setStyle({ font: toFont(this.fontSizes.hud, scale) }));
    this.starsText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.bannerCopy.setStyle({ font: toFont(this.fontSizes.banner, scale) });
    this.levelCompleteText.setStyle({ font: toFont(this.fontSizes.levelComplete, scale) });
    this.modalMessage.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.modalButton.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.gameOverMessage.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.gameOverButton.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.gameOverRetryButton.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
  }

  private updateScore(payload: { current: number; target: number }): void {
    this.scoreText.setText(`Подарки: ${payload.current}/${payload.target}`);
    if (payload.current > this.lastScore) {
      this.pickSound?.play({ seek: 0.3 });
    }
    this.lastScore = payload.current;
  }

  private updateTimer(seconds: number): void {
    this.timerText.setText(`Время: ${seconds}с`);
  }

  private updateLives(payload: { lives: number }): void {
    this.livesText.setText(`Жизни: ${payload.lives}`);
    const showHearts = payload.lives > 0;
    this.livesText.setVisible(false);
    this.lifeHearts.forEach((heart, index) => {
      const active = index < payload.lives;
      heart.setVisible(showHearts);
      heart.setColor(active ? '#ff4d6d' : '#1a1f2d');
    });
  }

  private updateStars(payload: { stars: number }): void {
    this.starsText.setText(`Звёзды: ${payload.stars}`);
    this.starsText.setVisible(payload.stars > 0);
  }

  private updateLevelBanner(payload: { level: number }): void {
    const label = this.getBannerCopy(payload.level);
    this.bannerCopy.setText(label);
    this.lastScore = 0;
  }

  private getBannerCopy(level: number): string {
    if (level === 1) {
      return `Собери ${LEVEL_ONE_TARGET} подарков, чтобы пройти уровень 1.`;
    }
    if (level === 2) {
      return `Подарки уносит ветром. Собирай скорее!`;
    }
    if (level === 3) {
      return `Начинается буря! Подарки улетают во все стороны!`;
    }
    if (level === 4) {
      return `Осторожно, снежки! Уклоняйся от них и продолжай собирать подарки`;
    }
    if (level === 5) {
      return 'Буря заморозила подарки! Собирай звёздочки и размораживай ими подарки стреляя (клавиша ПРОБЕЛ)!';
    }
    if (level === 6) {
      return 'Осторожно, приближается лавина! Размораживай подарки и уклоняйся от снежков';
    }
    if (level === 7) {
      return 'Бонусный уровень: собирай подарки, звёзды и сердца как можно дольше!';
    }
    return 'Бонусный уровень: собирай подарки, звёзды и сердца как можно дольше!';
  }

  private showLevelComplete(payload: { level: number }): void {
    this.levelCompleteText.setText(`Уровень ${payload.level} пройден!`);
    this.levelCompleteText.setVisible(true);
    this.successSound?.play();
    if (payload.level >= 1 && payload.level <= 6) {
      this.setModalContent(payload.level);
      this.levelCompleteModal.setVisible(true);
    }
  }

  private showGameOver(): void {
    this.levelCompleteModal.setVisible(false);
    this.levelCompleteText.setVisible(false);
    this.gameOverModal.setVisible(true);
    this.noLuckSound?.play();
  }

  private setModalContent(level: number): void {
    const nextLabel = level === 1
      ? 'Перейти на следующий'
      : level === 2
        ? 'Перейти на третий'
        : level === 3
          ? 'Перейти на четвертый'
          : level === 4
            ? 'Перейти на пятый'
            : level === 5
              ? 'Перейти на шестой'
              : 'Перейти на бонусный';
    const message = level === 1
      ? 'Поздравляем, уровень пройден!'
      : level === 2
        ? 'Поздравляем, уровень 2 пройден!'
        : level === 3
          ? 'Поздравляем, уровень 3 пройден!'
          : level === 4
            ? 'Поздравляем, уровень 4 пройден!'
            : level === 5
              ? 'Поздравляем, уровень 5 пройден!'
              : 'Поздравляем, уровень 6 пройден!';

    this.modalMessage.setText(message);
    this.modalButton.setText(nextLabel);
    this.modalButton.setOrigin(0.5);
  }
}
