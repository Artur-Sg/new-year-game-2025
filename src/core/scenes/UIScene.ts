import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVEL_ONE_TARGET, getTextScale, toFont } from '../config/gameConfig';
import { GameEvents } from '../constants/GameEvents';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { getActiveLevelId, setActiveLevelId } from '../state/levelStore';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private lifeHearts: Phaser.GameObjects.Text[] = [];
  private starsText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Graphics;
  private bannerCopy!: Phaser.GameObjects.Text;
  private levelCompleteText!: Phaser.GameObjects.Text;
  private levelCompleteModal!: Phaser.GameObjects.Container;
  private modalPanel!: Phaser.GameObjects.Rectangle;
  private modalMessage!: Phaser.GameObjects.Text;
  private modalButton!: Phaser.GameObjects.Container;
  private modalButtonLabel!: Phaser.GameObjects.Text;
  private modalButtonBg!: Phaser.GameObjects.Graphics;
  private levelFinishImage?: Phaser.GameObjects.Image;
  private levelFinishTitle?: Phaser.GameObjects.Text;
  private levelFinishFooter?: Phaser.GameObjects.Text;
  private levelFinishMenuButton!: Phaser.GameObjects.Container;
  private levelFinishMenuLabel!: Phaser.GameObjects.Text;
  private levelFinishMenuBg!: Phaser.GameObjects.Graphics;
  private levelCompleteLevel = 1;
  private pauseModal!: Phaser.GameObjects.Container;
  private pausePanel!: Phaser.GameObjects.Graphics;
  private pauseTitle!: Phaser.GameObjects.Text;
  private pauseContinueButton!: Phaser.GameObjects.Container;
  private pauseContinueLabel!: Phaser.GameObjects.Text;
  private pauseContinueBg!: Phaser.GameObjects.Graphics;
  private pauseExitButton!: Phaser.GameObjects.Container;
  private pauseExitLabel!: Phaser.GameObjects.Text;
  private pauseExitBg!: Phaser.GameObjects.Graphics;
  private gameOverModal!: Phaser.GameObjects.Container;
  private gameOverMessage!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Graphics;
  private gameOverButton!: Phaser.GameObjects.Container;
  private gameOverButtonLabel!: Phaser.GameObjects.Text;
  private gameOverButtonBg!: Phaser.GameObjects.Graphics;
  private gameOverRetryButton!: Phaser.GameObjects.Container;
  private gameOverRetryLabel!: Phaser.GameObjects.Text;
  private gameOverRetryBg!: Phaser.GameObjects.Graphics;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private pickSound?: Phaser.Sound.BaseSound;
  private clickSound?: Phaser.Sound.BaseSound;
  private successSound?: Phaser.Sound.BaseSound;
  private noLuckSound?: Phaser.Sound.BaseSound;
  private lastScore = 0;
  private escHandler?: () => void;
  private pauseKey?: Phaser.Input.Keyboard.Key;
  private starsEnabled = false;
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

    this.lifeHearts = Array.from({ length: 3 }, (_, index) => {
      const heart = this.add.text(GAME_WIDTH / 2 + index * 20, 24, '♥', {
        color: '#ff4d6d',
        font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
      });
      heart.setOrigin(0.5, 0);
      heart.setVisible(false);
      return heart;
    });

    this.starsText = this.add.text(32, 24, '★ 0', {
      color: '#ffe066',
      font: toFont(this.fontSizes.hud, getTextScale(this.scale.width, this.scale.height)),
    });
    this.starsText.setOrigin(0, 0);
    this.starsText.setVisible(false);

    this.createCallToAction();
    this.createLevelCompleteText();
    this.createLevelCompleteModal();
    this.createPauseModal();
    this.createGameOverModal();
    this.setupAudio();
    this.layout(this.scale.width, this.scale.height);
    const initialLevel = getActiveLevelId();
    const initialLives = initialLevel === 4 || initialLevel === 6 || initialLevel === 7 ? 3 : 0;
    this.updateLives({ lives: initialLives });
    this.setStarsVisibility(initialLevel);

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

    this.escHandler = () => this.togglePauseModal();
    if (this.input.keyboard) {
      this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, true);
      this.pauseKey.on('down', this.escHandler);
    }

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
      if (this.escHandler) {
        if (this.pauseKey) {
          this.pauseKey.off('down', this.escHandler);
        }
      }
    });
  }

  private createCallToAction(): void {
    this.banner = this.add.graphics();

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
    this.clickSound = this.sound.add('sfx-button-click', { volume: 0.6 });
    this.successSound = this.sound.add('sfx-success', { volume: 1 });
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

    this.levelFinishImage = this.add.image(0, 0, 'level-finish-3');
    this.levelFinishImage.setVisible(false);
    this.levelFinishTitle = this.add.text(0, -120, 'Поздравляю! Уровень пройден!', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 440 },
      font: toFont(this.fontSizes.modalMessage, getTextScale(this.scale.width, this.scale.height)),
    });
    this.levelFinishTitle.setOrigin(0.5);
    this.levelFinishTitle.setStroke('#0b0d1a', 3);
    this.levelFinishTitle.setShadow(2, 2, '#0b0d1a', 4, false, true);
    this.levelFinishTitle.setVisible(false);
    this.levelFinishFooter = this.add.text(0, 0, '', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 480 },
      font: toFont(this.fontSizes.modalMessage, getTextScale(this.scale.width, this.scale.height)),
    });
    this.levelFinishFooter.setOrigin(0.5);
    this.levelFinishFooter.setStroke('#0b0d1a', 3);
    this.levelFinishFooter.setShadow(2, 2, '#0b0d1a', 4, false, true);
    this.levelFinishFooter.setVisible(false);

    const modalScale = getTextScale(this.scale.width, this.scale.height);
    this.modalButtonBg = this.add.graphics();
    this.modalButtonLabel = this.add.text(0, 0, 'Перейти на следующий', {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.modalButton, modalScale),
    });
    this.modalButtonLabel.setOrigin(0.5);
    this.modalButton = this.add.container(0, 48, [this.modalButtonBg, this.modalButtonLabel]);
    this.drawPauseButton(this.modalButtonBg, this.modalButtonLabel, 0xffe066);
    this.updatePauseButtonArea(this.modalButton, this.modalButtonLabel);
    const modalHit = this.ensureButtonHitArea(this.modalButton, this.modalButtonLabel);
    modalHit
      .on('pointerover', () => this.drawPauseButton(this.modalButtonBg, this.modalButtonLabel, 0xffd447))
      .on('pointerout', () => this.drawPauseButton(this.modalButtonBg, this.modalButtonLabel, 0xffe066))
      .on('pointerup', () => {
        this.clickSound?.play();
        this.levelCompleteModal.setVisible(false);
        this.levelCompleteText.setVisible(false);
        EventBus.emit(GameEvents.LEVEL_NEXT);
      });

    this.levelFinishMenuBg = this.add.graphics();
    this.levelFinishMenuLabel = this.add.text(0, 0, 'В меню', {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.modalButton, modalScale),
    });
    this.levelFinishMenuLabel.setOrigin(0.5);
    this.levelFinishMenuButton = this.add.container(0, 48, [
      this.levelFinishMenuBg,
      this.levelFinishMenuLabel,
    ]);
    this.drawPauseButton(this.levelFinishMenuBg, this.levelFinishMenuLabel, 0xffe066);
    this.updatePauseButtonArea(this.levelFinishMenuButton, this.levelFinishMenuLabel);
    const finishMenuHit = this.ensureButtonHitArea(this.levelFinishMenuButton, this.levelFinishMenuLabel);
    finishMenuHit
      .on('pointerover', () => this.drawPauseButton(this.levelFinishMenuBg, this.levelFinishMenuLabel, 0xffd447))
      .on('pointerout', () => this.drawPauseButton(this.levelFinishMenuBg, this.levelFinishMenuLabel, 0xffe066))
      .on('pointerup', () => {
        this.clickSound?.play();
        this.scene.stop(SceneKeys.GAME);
        this.scene.stop(SceneKeys.UI);
        this.scene.start(SceneKeys.MAIN_MENU);
      });
    this.levelFinishMenuButton.setVisible(false);

    this.levelCompleteModal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.modalPanel,
      this.modalMessage,
      this.levelFinishImage,
      this.levelFinishTitle,
      this.levelFinishFooter,
      this.modalButton,
      this.levelFinishMenuButton,
    ]);
    this.levelCompleteModal.setDepth(20);
    this.levelCompleteModal.setVisible(false);
  }

  private createGameOverModal(): void {
    this.gameOverPanel = this.add.graphics();

    this.gameOverMessage = this.add.text(0, -36, 'Снежки попали 3 раза.\nИгра окончена!', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 440 },
      font: toFont(this.fontSizes.modalMessage, getTextScale(this.scale.width, this.scale.height)),
    });
    this.gameOverMessage.setOrigin(0.5);

    const gameOverScale = getTextScale(this.scale.width, this.scale.height);
    this.gameOverRetryBg = this.add.graphics();
    this.gameOverRetryLabel = this.add.text(0, 0, 'Попробовать снова', {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.modalButton, gameOverScale),
    });
    this.gameOverRetryLabel.setOrigin(0.5);
    this.gameOverRetryButton = this.add.container(0, 48, [this.gameOverRetryBg, this.gameOverRetryLabel]);
    this.drawPauseButton(this.gameOverRetryBg, this.gameOverRetryLabel, 0xffe066);
    this.updatePauseButtonArea(this.gameOverRetryButton, this.gameOverRetryLabel);
    const gameOverRetryHit = this.ensureButtonHitArea(this.gameOverRetryButton, this.gameOverRetryLabel);
    gameOverRetryHit
      .on('pointerover', () => this.drawPauseButton(this.gameOverRetryBg, this.gameOverRetryLabel, 0xffd447))
      .on('pointerout', () => this.drawPauseButton(this.gameOverRetryBg, this.gameOverRetryLabel, 0xffe066))
      .on('pointerup', () => {
        this.clickSound?.play();
        setActiveLevelId(getActiveLevelId());
        this.scene.stop(SceneKeys.GAME);
        this.scene.start(SceneKeys.GAME);
        this.scene.restart();
      });

    this.gameOverButtonBg = this.add.graphics();
    this.gameOverButtonLabel = this.add.text(0, 0, 'В меню', {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.modalButton, gameOverScale),
    });
    this.gameOverButtonLabel.setOrigin(0.5);
    this.gameOverButton = this.add.container(0, 112, [this.gameOverButtonBg, this.gameOverButtonLabel]);
    this.drawPauseButton(this.gameOverButtonBg, this.gameOverButtonLabel, 0xffe066);
    this.updatePauseButtonArea(this.gameOverButton, this.gameOverButtonLabel);
    const gameOverHit = this.ensureButtonHitArea(this.gameOverButton, this.gameOverButtonLabel);
    gameOverHit
      .on('pointerover', () => this.drawPauseButton(this.gameOverButtonBg, this.gameOverButtonLabel, 0xffd447))
      .on('pointerout', () => this.drawPauseButton(this.gameOverButtonBg, this.gameOverButtonLabel, 0xffe066))
      .on('pointerup', () => {
        this.clickSound?.play();
        this.scene.stop(SceneKeys.GAME);
        this.scene.stop(SceneKeys.UI);
        this.scene.start(SceneKeys.MAIN_MENU);
      });

    this.gameOverModal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.gameOverPanel,
      this.gameOverMessage,
      this.gameOverRetryButton,
      this.gameOverButton,
    ]);
    this.gameOverModal.setDepth(30);
    this.gameOverModal.setVisible(false);
  }

  private createPauseModal(): void {
    this.pausePanel = this.add.graphics();

    this.pauseTitle = this.add.text(0, -48, 'Пауза', {
      color: '#ffffff',
      align: 'center',
      font: toFont(this.fontSizes.modalMessage, getTextScale(this.scale.width, this.scale.height)),
    });
    this.pauseTitle.setOrigin(0.5);

    const pauseScale = getTextScale(this.scale.width, this.scale.height);
    this.pauseContinueBg = this.add.graphics();
    this.pauseContinueLabel = this.add.text(0, 0, 'Продолжить', {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.modalButton, pauseScale),
    });
    this.pauseContinueLabel.setOrigin(0.5);
    this.pauseContinueButton = this.add.container(0, 16, [this.pauseContinueBg, this.pauseContinueLabel]);
    this.drawPauseButton(this.pauseContinueBg, this.pauseContinueLabel, 0xffe066);
    this.updatePauseButtonArea(this.pauseContinueButton, this.pauseContinueLabel);
    const pauseContinueHit = this.ensureButtonHitArea(this.pauseContinueButton, this.pauseContinueLabel);
    pauseContinueHit
      .on('pointerover', () => this.drawPauseButton(this.pauseContinueBg, this.pauseContinueLabel, 0xffd447))
      .on('pointerout', () => this.drawPauseButton(this.pauseContinueBg, this.pauseContinueLabel, 0xffe066))
      .on('pointerup', () => {
        this.clickSound?.play();
        this.resumeFromPause();
      });

    this.pauseExitBg = this.add.graphics();
    this.pauseExitLabel = this.add.text(0, 0, 'Выйти', {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.modalButton, pauseScale),
    });
    this.pauseExitLabel.setOrigin(0.5);
    this.pauseExitButton = this.add.container(0, 84, [this.pauseExitBg, this.pauseExitLabel]);
    this.drawPauseButton(this.pauseExitBg, this.pauseExitLabel, 0xffe066);
    this.updatePauseButtonArea(this.pauseExitButton, this.pauseExitLabel);
    const pauseExitHit = this.ensureButtonHitArea(this.pauseExitButton, this.pauseExitLabel);
    pauseExitHit
      .on('pointerover', () => this.drawPauseButton(this.pauseExitBg, this.pauseExitLabel, 0xffd447))
      .on('pointerout', () => this.drawPauseButton(this.pauseExitBg, this.pauseExitLabel, 0xffe066))
      .on('pointerup', () => {
        this.clickSound?.play();
        window.location.reload();
      });

    this.pauseModal = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2, [
      this.pausePanel,
      this.pauseTitle,
      this.pauseContinueButton,
      this.pauseExitButton,
    ]);
    this.pauseModal.setDepth(25);
    this.pauseModal.setVisible(false);
  }

  private layout(width: number, height: number): void {
    this.updateTypography(getTextScale(width, height));
    const hudTopY = 24;
    const hudRowWidth = Math.min(360, Math.max(220, width - 160));
    const hudLeft = width / 2 - hudRowWidth / 2;
    const hudRight = width / 2 + hudRowWidth / 2;
    const heartSpacing = 36;

    this.starsText.setPosition(hudLeft, hudTopY);
    this.lifeHearts.forEach((heart, index) => {
      heart.setPosition(hudRight - heartSpacing * (2 - index), hudTopY);
    });

    this.scoreText.setPosition(32, hudTopY);
    this.timerText.setPosition(width - 32, hudTopY);

    const bannerWidth = Math.min(520, Math.max(320, width - 80));
    const bannerHeight = 76;
    const bannerX = width / 2;
    const bannerY = height - 36;
    this.drawBanner(bannerX, bannerY, bannerWidth, bannerHeight);
    this.bannerCopy.setPosition(bannerX, bannerY);
    this.bannerCopy.setWordWrapWidth(bannerWidth - 40);

    this.levelCompleteText.setPosition(width / 2, height / 2);

    const modalWidth = Math.min(560, Math.max(300, width - 80));
    const modalHeight = Math.min(560, Math.max(300, height - 140));
    this.modalPanel.setSize(modalWidth, modalHeight);
    this.modalMessage.setWordWrapWidth(modalWidth - 80);
    this.updateLevelCompleteLayout(modalWidth, modalHeight);
    this.levelCompleteModal.setPosition(width / 2, height / 2);
    this.gameOverModal.setPosition(width / 2, height / 2);
    this.drawGameOverPanel(modalWidth, modalHeight);
    this.drawPausePanel(modalWidth, modalHeight);
    this.pauseModal.setPosition(width / 2, height / 2);

    this.updateLevelCompleteLayout(modalWidth, modalHeight);
  }

  private updateTypography(scale: number): void {
    this.scoreText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.timerText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.lifeHearts.forEach((heart) => heart.setStyle({ font: toFont(this.fontSizes.hud, scale) }));
    this.starsText.setStyle({ font: toFont(this.fontSizes.hud, scale) });
    this.bannerCopy.setStyle({ font: toFont(this.fontSizes.banner, scale) });
    this.levelCompleteText.setStyle({ font: toFont(this.fontSizes.levelComplete, scale) });
    this.modalMessage.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.levelFinishTitle?.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.levelFinishFooter?.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.modalButtonLabel.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.drawPauseButton(this.modalButtonBg, this.modalButtonLabel, 0xffe066);
    this.updatePauseButtonArea(this.modalButton, this.modalButtonLabel);
    this.levelFinishMenuLabel.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.drawPauseButton(this.levelFinishMenuBg, this.levelFinishMenuLabel, 0xffe066);
    this.updatePauseButtonArea(this.levelFinishMenuButton, this.levelFinishMenuLabel);
    this.pauseTitle.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.pauseContinueLabel.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.pauseExitLabel.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.drawPauseButton(this.pauseContinueBg, this.pauseContinueLabel, 0xffe066);
    this.drawPauseButton(this.pauseExitBg, this.pauseExitLabel, 0xffe066);
    this.updatePauseButtonArea(this.pauseContinueButton, this.pauseContinueLabel);
    this.updatePauseButtonArea(this.pauseExitButton, this.pauseExitLabel);
    this.gameOverMessage.setStyle({ font: toFont(this.fontSizes.modalMessage, scale) });
    this.gameOverButtonLabel.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.gameOverRetryLabel.setStyle({ font: toFont(this.fontSizes.modalButton, scale) });
    this.drawPauseButton(this.gameOverButtonBg, this.gameOverButtonLabel, 0xffe066);
    this.drawPauseButton(this.gameOverRetryBg, this.gameOverRetryLabel, 0xffe066);
    this.updatePauseButtonArea(this.gameOverButton, this.gameOverButtonLabel);
    this.updatePauseButtonArea(this.gameOverRetryButton, this.gameOverRetryLabel);
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
    const showHearts = payload.lives > 0;
    this.lifeHearts.forEach((heart, index) => {
      const active = index < payload.lives;
      heart.setVisible(showHearts);
      heart.setColor(active ? '#ff4d6d' : '#1a1f2d');
    });
  }

  private updateStars(payload: { stars: number }): void {
    this.starsText.setText(`★ ${payload.stars}`);
    this.starsText.setVisible(this.starsEnabled);
  }

  private updateLevelBanner(payload: { level: number }): void {
    const label = this.getBannerCopy(payload.level);
    this.bannerCopy.setText(label);
    this.lastScore = 0;
    this.setStarsVisibility(payload.level);
  }

  private setStarsVisibility(level: number): void {
    this.starsEnabled = level >= 5;
    this.starsText.setVisible(this.starsEnabled);
    if (this.starsEnabled) {
      this.starsText.setText('★ 0');
    }
  }

  private getBannerCopy(level: number): string {
    if (level === 1) {
      return `Собери ${LEVEL_ONE_TARGET} подарков, чтобы выиграть`;
    }
    if (level === 2) {
      return `Подарки уносит ветром!`;
    }
    if (level === 3) {
      return `Ветер усиливается!`;
    }
    if (level === 4) {
      return `Осторожно, снежки!`;
    }
    if (level === 5) {
      return 'Буран заморозил подарки! Используй звёздочки! (ПРОБЕЛ)';
    }
    if (level === 6) {
      return 'Лавина! Уклоняйся от снежков';
    }
    if (level === 7) {
      return 'Бонусный уровень: продержись как можно дольше!';
    }
    return 'Бонусный уровень: продержись как можно дольше!';
  }

  private showLevelComplete(payload: { level: number }): void {
    this.levelCompleteLevel = payload.level;
    this.levelCompleteText.setText(`Уровень ${payload.level} пройден!`);
    this.levelCompleteText.setVisible(true);
    this.successSound?.play();
    if (payload.level >= 1 && payload.level <= 6) {
      const showFinishImage =
        payload.level === 1 ||
        payload.level === 2 ||
        payload.level === 3 ||
        payload.level === 4 ||
        payload.level === 5 ||
        payload.level === 6;
      this.modalPanel.setVisible(!showFinishImage);
      this.modalMessage.setVisible(!showFinishImage);
      if (showFinishImage && this.levelFinishImage) {
        const finishKey = payload.level === 1
          ? 'level-finish-1'
          : payload.level === 2
            ? 'level-finish-2'
            : payload.level === 3
              ? 'level-finish-3'
              : payload.level === 4
                ? 'level-finish-4'
                : payload.level === 5
                  ? 'level-finish-5'
                  : 'level-finish-6';
        this.levelFinishImage.setTexture(finishKey);
      }
      this.levelFinishImage?.setVisible(showFinishImage);
      this.levelFinishTitle?.setVisible(showFinishImage);
      const showFooter = payload.level === 6;
      if (showFooter && this.levelFinishFooter) {
        this.levelFinishFooter.setText(
          'Ура! Вы помогли Деду Морозу и спасли подарки! С Новым Годом!'
        );
      }
      this.levelFinishFooter?.setVisible(showFooter);
      this.modalButton.setVisible(!showFooter);
      this.levelFinishMenuButton.setVisible(showFooter);
      this.setModalContent(payload.level);
      this.updateLevelCompleteLayout(this.modalPanel.width, this.modalPanel.height);
      this.levelCompleteModal.setVisible(true);
    }
  }

  private showGameOver(): void {
    this.levelCompleteModal.setVisible(false);
    this.levelCompleteText.setVisible(false);
    this.pauseModal.setVisible(false);
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
    this.modalButtonLabel.setText(nextLabel);
    this.drawPauseButton(this.modalButtonBg, this.modalButtonLabel, 0xffe066);
    this.updatePauseButtonArea(this.modalButton, this.modalButtonLabel);
  }

  private togglePauseModal(): void {
    if (this.levelCompleteModal.visible || this.gameOverModal.visible) {
      return;
    }

    if (this.pauseModal.visible) {
      this.resumeFromPause();
      return;
    }

    this.pauseModal.setVisible(true);
    this.pickSound?.play({ seek: 0.3 });
    const gameScene = this.scene.get(SceneKeys.GAME);
    if (gameScene.scene.isActive()) {
      gameScene.scene.pause();
    }
  }

  private resumeFromPause(): void {
    this.pauseModal.setVisible(false);
    const gameScene = this.scene.get(SceneKeys.GAME);
    if (gameScene.scene.isPaused()) {
      gameScene.scene.resume();
    }
  }

  private drawPausePanel(width: number, height: number): void {
    this.pausePanel.clear();
    this.pausePanel.fillStyle(0x0b0d1a, 0.95);
    this.pausePanel.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
    this.pausePanel.lineStyle(3, 0xffe066, 0.8);
    this.pausePanel.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  }

  private drawGameOverPanel(width: number, height: number): void {
    this.gameOverPanel.clear();
    this.gameOverPanel.fillStyle(0x0b0d1a, 0.95);
    this.gameOverPanel.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
    this.gameOverPanel.lineStyle(3, 0xff6b6b, 0.9);
    this.gameOverPanel.strokeRoundedRect(-width / 2, -height / 2, width, height, 18);
  }

  private drawPauseButton(
    background: Phaser.GameObjects.Graphics,
    label: Phaser.GameObjects.Text,
    color: number
  ): void {
    const paddingX = 18;
    const paddingY = 10;
    const width = label.width * label.scaleX + paddingX * 2;
    const height = label.height * label.scaleY + paddingY * 2;
    background.clear();
    background.fillStyle(color, 1);
    background.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
  }

  private updateLevelCompleteLayout(modalWidth: number, modalHeight: number): void {
    if (!this.levelFinishImage) {
      return;
    }
    if (
      this.levelCompleteLevel === 1 ||
      this.levelCompleteLevel === 2 ||
      this.levelCompleteLevel === 3 ||
      this.levelCompleteLevel === 4 ||
      this.levelCompleteLevel === 5 ||
      this.levelCompleteLevel === 6
    ) {
      const imageHeight = Math.max(120, modalHeight - 80);
      this.levelFinishImage.setDisplaySize(modalWidth, imageHeight);
      this.levelFinishImage.setPosition(0, -20);
      this.levelFinishTitle?.setPosition(0, -modalHeight / 2);
      this.levelFinishFooter?.setWordWrapWidth(Math.max(220, modalWidth - 60));
      this.levelFinishFooter?.setPosition(0, modalHeight / 2 - 16);
      this.modalButton.setPosition(0, modalHeight / 2 - 28);
      const menuButtonOffset = this.levelFinishMenuButton.height || 0;
      this.levelFinishMenuButton.setPosition(0, modalHeight / 2 + 36 + menuButtonOffset);
      return;
    }
    this.levelFinishImage.setDisplaySize(modalWidth, modalHeight);
    this.levelFinishImage.setPosition(0, 0);
    this.modalButton.setPosition(0, 48);
  }

  private drawBanner(x: number, y: number, width: number, height: number): void {
    this.banner.clear();
    this.banner.fillStyle(0x0f162a, 0.85);
    this.banner.fillRoundedRect(x - width / 2, y - height / 2, width, height, 16);
    this.banner.lineStyle(2, 0xffe066, 0.7);
    this.banner.strokeRoundedRect(x - width / 2, y - height / 2, width, height, 16);
  }

  private updatePauseButtonArea(button: Phaser.GameObjects.Container, label: Phaser.GameObjects.Text): void {
    const paddingX = 18;
    const paddingY = 10;
    const width = label.width * label.scaleX + paddingX * 2;
    const height = label.height * label.scaleY + paddingY * 2;
    button.setSize(width, height);
    this.ensureButtonHitArea(button, label, width, height);
  }

  private ensureButtonHitArea(
    button: Phaser.GameObjects.Container,
    label: Phaser.GameObjects.Text,
    width?: number,
    height?: number
  ): Phaser.GameObjects.Zone {
    const actualWidth = width ?? label.width * label.scaleX + 36;
    const actualHeight = height ?? label.height * label.scaleY + 20;
    let zone = button.getData('hitZone') as Phaser.GameObjects.Zone | undefined;
    if (!zone) {
      zone = this.add.zone(0, 0, actualWidth, actualHeight);
      zone.setOrigin(0.5);
      button.addAt(zone, 0);
      button.setData('hitZone', zone);
    }
    zone.setSize(actualWidth, actualHeight);
    zone.setInteractive({ useHandCursor: true });
    return zone;
  }
}
