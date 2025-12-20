import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, LEVEL_ONE_TARGET } from '../config/gameConfig';
import { GameEvents } from '../constants/GameEvents';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Rectangle;
  private bannerCopy!: Phaser.GameObjects.Text;
  private levelCompleteText!: Phaser.GameObjects.Text;
  private levelCompleteModal!: Phaser.GameObjects.Container;
  private modalPanel!: Phaser.GameObjects.Rectangle;
  private modalMessage!: Phaser.GameObjects.Text;
  private modalButton!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    this.scoreText = this.add.text(32, 24, `Gifts: 0/${LEVEL_ONE_TARGET}`, {
      fontSize: '16px',
      color: '#ffe066',
      fontFamily: 'Press Start 2P, monospace',
    });

    this.timerText = this.add.text(GAME_WIDTH - 32, 24, 'Time: 0s', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Press Start 2P, monospace',
    });
    this.timerText.setOrigin(1, 0);

    this.createCallToAction();
    this.createLevelCompleteText();
    this.createLevelCompleteModal();
    this.layout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    });

    EventBus.on(GameEvents.SCORE_UPDATED, this.updateScore, this);
    EventBus.on(GameEvents.TIMER_UPDATED, this.updateTimer, this);
    EventBus.on(GameEvents.LEVEL_COMPLETED, this.showLevelComplete, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.SCORE_UPDATED, this.updateScore, this);
      EventBus.off(GameEvents.TIMER_UPDATED, this.updateTimer, this);
      EventBus.off(GameEvents.LEVEL_COMPLETED, this.showLevelComplete, this);
    });
  }

  private createCallToAction(): void {
    this.banner = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 36, 520, 64, 0x0f162a, 0.85);
    this.banner.setStrokeStyle(2, 0xffe066, 0.7);

    this.bannerCopy = this.add.text(this.banner.x, this.banner.y, `Collect ${LEVEL_ONE_TARGET} gifts to finish Level 1.`, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 480 },
      fontFamily: 'Press Start 2P, monospace',
    });
    this.bannerCopy.setOrigin(0.5);
  }

  private createLevelCompleteText(): void {
    this.levelCompleteText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Level 1 complete!', {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
      fontFamily: 'Press Start 2P, monospace',
    });
    this.levelCompleteText.setOrigin(0.5);
    this.levelCompleteText.setVisible(false);
  }

  private createLevelCompleteModal(): void {
    this.modalPanel = this.add.rectangle(0, 0, 520, 220, 0x0b0d1a, 0.95);
    this.modalPanel.setStrokeStyle(3, 0xffe066, 0.8);

    this.modalMessage = this.add.text(0, -36, 'Поздравляем, уровень завершен!', {
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 440 },
      fontFamily: 'Press Start 2P, monospace',
    });
    this.modalMessage.setOrigin(0.5);

    this.modalButton = this.add.text(0, 48, 'Перейти на следующий', {
      fontSize: '12px',
      color: '#0d0f1d',
      backgroundColor: '#ffe066',
      padding: { x: 16, y: 10 },
      fontFamily: 'Press Start 2P, monospace',
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

  private layout(width: number, height: number): void {
    this.scoreText.setPosition(32, 24);
    this.timerText.setPosition(width - 32, 24);

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
  }

  private updateScore(payload: { current: number; target: number }): void {
    this.scoreText.setText(`Gifts: ${payload.current}/${payload.target}`);
  }

  private updateTimer(seconds: number): void {
    this.timerText.setText(`Time: ${seconds}s`);
  }

  private showLevelComplete(payload: { level: number }): void {
    this.levelCompleteText.setText(`Level ${payload.level} complete!`);
    this.levelCompleteText.setVisible(true);
    if (payload.level === 1 || payload.level === 2) {
      this.setModalContent(payload.level);
      this.levelCompleteModal.setVisible(true);
    }
  }

  private setModalContent(level: number): void {
    const nextLabel = level === 1 ? 'Перейти на следующий' : 'Перейти на третий';
    const message = level === 1
      ? 'Поздравляем, уровень завершен!'
      : 'Поздравляем, уровень 2 завершен!';

    this.modalMessage.setText(message);
    this.modalButton.setText(nextLabel);
    this.modalButton.setOrigin(0.5);
  }
}
